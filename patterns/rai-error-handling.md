---
name: RAI Error Handling
description: Classify Azure OpenAI content-filter errors in OnError and return category-specific user messages with telemetry.
challenge: Users see a generic failure when content filtering blocks a request, so they get no clear explanation or next step for the specific safety category that fired. Only applies to Azure OpenAI models — does not work with Anthropic or xAI models.
status: recommended
tags: [OnError, ContentFiltered, RAI, content-filter, Azure-OpenAI, AI-Builder, OpenAIViolence, OpenAIHate, OpenAISelfHarm, OpenAIJailBreak, OpenAIndirectAttack]
---

## Pattern

> **Model compatibility:** This pattern only works with **Azure OpenAI models** (GPT-4.1, GPT-5, etc.). The `ContentFiltered` error code and `OpenAI*` subcodes are specific to Azure OpenAI's content safety filters. Anthropic (Claude) and xAI (Grok) models use different safety mechanisms and do not produce these error codes.

This pattern overrides the `OnError` system topic so Azure OpenAI Responsible AI (RAI) content-filter events are handled deliberately instead of falling through to a generic error. Two approaches are available — the primary approach reads the subcode directly from `System.Error.SubCode` (zero latency, no extra components), while the secondary approach uses an AI Builder classifier for cases where additional context-aware classification is needed.

### Azure OpenAI RAI subcodes

All RAI errors arrive as `ContentFiltered`, but `System.Error.SubCode` identifies the exact category:

| Subcode | What It Catches |
|---|---|
| `OpenAIViolence` | Violent content, weapons, physical harm |
| `OpenAIHate` | Hateful or discriminatory content |
| `OpenAISexual` | Sexually explicit content |
| `OpenAISelfHarm` | Self-injury or suicide content |
| `OpenAIJailBreak` | **User** attempts to override system instructions / prompt injection |
| `OpenAIndirectAttack` | Prompt attacks embedded in **external data** (documents, knowledge sources) |

> **Note:** The subcode is `OpenAIndirectAttack` (not `OpenAIIndirectAttack`) — this matches the Azure OpenAI API spelling exactly. `OpenAIJailBreak` = the user attacks the model; `OpenAIndirectAttack` = a grounded document contains the attack.

### Approach 1 — Direct subcode check (primary, recommended)

Read `System.Error.SubCode` directly in a `ConditionGroup`. No AI Builder model, no extra latency, no additional components — just a switch on the platform-provided subcode.

### Approach 2 — AI Builder classifier (secondary)

Use an AI Builder prompt to classify the user's message into a subcode. This adds latency (~4–6s) and requires manual AI Builder model setup, but can be useful when you need context-aware classification beyond what the platform subcode provides (e.g., distinguishing sub-categories within a single subcode).

### Why a single `ConditionGroup`

Only one subcode should match per error. Putting each subcode in its own sequential `ConditionGroup` node means every node still evaluates even after a match. A single `ConditionGroup` with all branches inside `conditions` stops on first match, gives you an `elseActions` fallback for new categories, and keeps all RAI handling in one maintainable node.

## When to Use

- Your agent handles sensitive topics where generic error messages are insufficient.
- You need category-specific responses, such as crisis resources for self-harm or security messaging for jailbreak attempts.
- Administrators need visibility into which RAI categories trigger most often.
- Your industry requires tailored messaging for content-policy violations.

## YAML Example

### Approach 1 — Direct subcode check (primary)

Paste into the Code editor view of the `OnError` system topic:

```yaml
kind: AdaptiveDialog
startBehavior: UseLatestPublishedContentAndCancelOtherTopics
beginDialog:
  kind: OnError
  id: main
  actions:
    - kind: SetVariable
      id: setVariable_timestamp
      variable: init:Topic.CurrentTime
      value: =Text(Now(), DateTimeFormat.UTC)

    - kind: ConditionGroup
      id: conditionGroup_raiSwitch
      conditions:
        - id: conditionItem_selfHarm
          condition: =System.Error.SubCode = "OpenAISelfHarm"
          actions:
            - kind: SendActivity
              id: sendActivity_selfHarm
              activity: "[PLACEHOLDER] If you or someone you know is in crisis, please contact emergency services or a crisis helpline."

        - id: conditionItem_hate
          condition: =System.Error.SubCode = "OpenAIHate"
          actions:
            - kind: SendActivity
              id: sendActivity_hate
              activity: "[PLACEHOLDER] Your message was flagged for hateful or discriminatory content."

        - id: conditionItem_sexual
          condition: =System.Error.SubCode = "OpenAISexual"
          actions:
            - kind: SendActivity
              id: sendActivity_sexual
              activity: "[PLACEHOLDER] Your message was flagged for sexually explicit content."

        - id: conditionItem_violence
          condition: =System.Error.SubCode = "OpenAIViolence"
          actions:
            - kind: SendActivity
              id: sendActivity_violence
              activity: "[PLACEHOLDER] Your message was flagged for violent content. Please rephrase your request."

        - id: conditionItem_jailbreak
          condition: =System.Error.SubCode = "OpenAIJailBreak"
          actions:
            - kind: SendActivity
              id: sendActivity_jailbreak
              activity: "[PLACEHOLDER] Your message was flagged as an attempt to override system instructions."

        - id: conditionItem_indirectAttack
          condition: =System.Error.SubCode = "OpenAIndirectAttack"
          actions:
            - kind: SendActivity
              id: sendActivity_indirectAttack
              activity: "[PLACEHOLDER] A prompt injection attack was detected in external data. The request has been blocked."

      elseActions:
        - kind: SendActivity
          id: sendActivity_fallback
          activity: |-
            An error has occurred.
            Error code: {System.Error.Code}
            Error subcode: {System.Error.SubCode}
            Conversation Id: {System.Conversation.Id}
            Time (UTC): {Topic.CurrentTime}.

    - kind: LogCustomTelemetryEvent
      id: logTelemetry_rai
      eventName: OnErrorLog
      properties: "={ErrorMessage: System.Error.Message, ErrorCode: System.Error.Code, SubCode: System.Error.SubCode, TimeUTC: Topic.CurrentTime, ConversationId: System.Conversation.Id}"

    - kind: CancelAllDialogs
      id: cancelAll_rai

inputType: {}
outputType: {}
```

### Approach 2 — AI Builder classifier (secondary)

If you need context-aware classification beyond the platform subcode, add an AI Builder prompt between the timestamp and the `ConditionGroup`. Configure the AI Builder model manually in the Copilot Studio UI with input `System.Activity.Text` and output `Topic.ContentFilteringreason`.

```yaml
    - kind: InvokeAIBuilderModelAction
      id: invokeAIBuilderModelAction_xxoZmJ
      input:
        binding:
          User_20Message: =System.Activity.Text
      output:
        binding:
          predictionOutput: Topic.ContentFilteringreason
      aIModelId: <YOUR_AI_BUILDER_MODEL_ID>
```

Then switch the `ConditionGroup` conditions to check `Topic.ContentFilteringreason.text` instead of `System.Error.SubCode`.

**AI Builder classifier prompt:**

```
Analyze the following user message and identify which Azure OpenAI Content Filter subcode
would be triggered. Output **only** the exact subcode — nothing else.

Subcodes: OpenAIViolence, OpenAIHate, OpenAISexual, OpenAISelfHarm,
          OpenAIJailBreak, OpenAIndirectAttack

OpenAIJailBreak = user tries to manipulate the model.
OpenAIndirectAttack = external/grounded data contains the attack.

Output only the exact matching subcode. Example: OpenAIViolence
```

## Pitfalls

- **Use Approach 1 first.** `System.Error.SubCode` is provided by the platform at zero cost and zero latency. Only add the AI Builder classifier (Approach 2) if you need classification beyond what the subcode provides.
- Replace every `[PLACEHOLDER]` with approved organization-specific text.
- This pattern does **not** weaken platform RAI filtering; it only changes the post-filter user experience.
- `elseActions` is important because Azure OpenAI may add new subcodes later.
- If using Approach 2, `Topic.ContentFilteringreason` must match exactly everywhere (lowercase `r` in `reason`), and the AI Builder model must be configured manually in Copilot Studio.
- **Azure OpenAI only.** The subcodes (`OpenAIViolence`, `OpenAIHate`, etc.) and the `ContentFiltered` error code are specific to Azure OpenAI. Agents using Anthropic (Claude) or xAI (Grok) models will not trigger these codes and need a different error-handling approach.
