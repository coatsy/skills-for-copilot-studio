---
name: Prevent Tool Call Leaks
description: Stop the orchestrator from leaking internal reasoning and tool call metadata (JSON with explanation_of_tool_call) to the end user.
challenge: The agent returns raw JSON with internal fields like "explanation_of_tool_call" and "new_instruction" to users instead of a clean final answer.
status: recommended
tags: [orchestrator, tool-calls, output-filtering, OnGeneratedResponse, instructions]
---

## Pattern

The generative orchestrator sometimes includes diagnostic metadata about tool invocations in its response — raw JSON with fields like `explanation_of_tool_call` and `new_instruction`. This internal reasoning should never reach the user.

Two approaches, in order of reliability:

**Approach 1 — Instructions-based (simpler, less reliable):**
Add output rules to the agent's system instructions that prohibit internal reasoning in responses. This works for some agents but is not guaranteed across all configurations.

**Approach 2 — Topic-based interception (more reliable):**
Create an `OnGeneratedResponse` topic that pattern-matches for the leaked metadata and suppresses the response by setting `System.ContinueResponse = false`.

## When to Use

- The agent has connector actions (SharePoint, Outlook, etc.) that the orchestrator invokes
- Users report seeing raw JSON in responses
- The orchestrator is calling tools based on context rather than explicit user requests (indirect invocation makes leaks more likely)

## YAML Example

**Approach 1 — Instructions** (in `settings.mcs.yml`):

```yaml
instructions: |
  ## Output rule
  Return only the final user-facing answer. Do not include internal reasoning,
  tool call explanations, or diagnostic JSON.
```

**Approach 2 — Response interception topic** (`suppress-tool-call-leaks.topic.mcs.yml`):

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnGeneratedResponse
  id: main
  actions:
    - kind: ConditionGroup
      id: conditionGroup_r9Qpg6
      conditions:
        - id: conditionItem_0mxghZ
          condition: |
            =IsMatch(Lower(System.Response.FormattedText), "explanation_of_tool_call")
          actions:
            - kind: SetVariable
              id: setVariable_vaDcla
              variable: System.ContinueResponse
              value: false

inputType: {}
outputType: {}
```

## Pitfalls

- **Approach 1 is not guaranteed.** Instructions-based suppression has been observed to work inconsistently across different agent configurations and orchestrator versions.
- **Approach 2 only catches known patterns.** The `IsMatch` condition checks for `explanation_of_tool_call` specifically. If the orchestrator produces other internal metadata formats, you may need to add additional conditions.
- **No platform-level fix yet.** This is a known orchestrator behavior, not a misconfiguration. Both approaches are workarounds until a platform fix is available.
- **`OnGeneratedResponse` is a YAML-only trigger.** It cannot be created through the Copilot Studio UI — it must be authored in YAML and pushed.
