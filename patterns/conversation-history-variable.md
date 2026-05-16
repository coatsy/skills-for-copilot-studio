---
name: Conversation History Variable
description: Capture a best-effort conversation transcript into a variable for escalation, logging, and downstream automation.
challenge: Agents often need the current conversation context for handoff or logging, but rebuilding the transcript turn by turn is cumbersome and fragile.
status: proven
tags: [conversation-history, transcript, AutomaticTaskInput, escalation, handoff, logging]
---

## Pattern

This pattern asks the orchestrator to reconstruct the current conversation and place it into a topic variable on demand. The result can be shown to the user, stored, summarized, attached to a ticket, emailed, or passed to a downstream connector, MCP tool, or child agent.

> **Important:** This is a **best-effort transcript** reconstructed from the orchestrator's context window, not a verbatim record. It is useful for summarization, escalation, and contextual handoffs, but not for compliance-grade audit logging.

### How it works

The topic declares an `AutomaticTaskInput` variable named `ConversationHistory` with `shouldPromptUser: false`. The orchestrator reads the variable's `description` field to understand what content and format to fill in. In this pattern, the description instructs the orchestrator to reconstruct the entire conversation and write it into the variable using a specific turn-by-turn format. The topic then uses the populated variable — for example, sending it in a message, storing it, or passing it to a connector.

### Variations

- **Store instead of send** — replace the `SendActivity` with a `SetVariable` that copies `Topic.ConversationHistory` into a topic or global variable for downstream use.
- **Customize the format** — edit the `description` string if you want a summary, only the last N turns, different speaker labels, or a more structured format.
- **Trigger automatically** — call the topic from a `RecognizeIntent` node with input text like `save conversation history` at escalation time, end-of-conversation, or before creating a ticket.

### Key implementation details

| Element | Purpose |
|---|---|
| `AutomaticTaskInput.description` | Instructs the orchestrator what content and format to place in the variable |
| `shouldPromptUser: false` | The orchestrator fills the value automatically instead of prompting the user |
| `modelDescription` | Helps the orchestrator identify when to call the topic |
| `<br /><br />` in the requested format | Produces readable line breaks between turns when rendered in chat |

## When to Use

- The user needs conversation context captured for escalation to a live agent.
- A downstream tool or connector requires conversation history as input.
- You want to log conversations to Dataverse, a ticketing system, or email.
- The agent needs to pass conversational context to another agent or automation.

## YAML Example

**Save Conversation History topic** (create a topic named `Save Conversation History` and paste into the Code editor view):

```yaml
kind: AdaptiveDialog
inputs:
  - kind: AutomaticTaskInput
    propertyName: ConversationHistory
    description: "Entire conversation history in the format \"User: question <br /><br /> Agent : response <br /><br /> User: Question <br /><br /> Agent: response\""
    shouldPromptUser: false

modelDescription: save the conversation history
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent: {}
  actions:
    - kind: SendActivity
      id: sendActivity_gDSbH3
      activity: "Here is your saved conversation history: {Topic.ConversationHistory}"

inputType:
  properties:
    ConversationHistory:
      displayName: ConversationHistory
      description: "Entire conversation history in the format \"User: question <br /><br /> Agent : response <br /><br /> User: Question <br /><br /> Agent: response\""
      type: String

outputType: {}
```

## Pitfalls

- This transcript is bounded by the orchestrator's context window, so very long conversations may be incomplete.
- Do not treat the output as a verbatim or compliance-grade audit record.
- Conversation transcripts may contain PII; capture them only with appropriate consent and retention controls.
- Often a summary is sufficient and safer than storing the full transcript.
- When passing conversation history to external tools, email, Dataverse, or MCP servers, treat it as sensitive data.
