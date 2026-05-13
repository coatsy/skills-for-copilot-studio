---
name: Prevent Child Agent Responses
description: Stop child agents from messaging users directly by instructing them to use output variables instead of SendMessageTool.
challenge: Child agents (connected agents) send messages directly to the user, bypassing the parent agent's control over response formatting, filtering, and tone.
status: proven
tags: [child-agent, connected-agent, orchestration, multi-agent, output-variables, SendMessageTool]
---

## Pattern

When using child agents, the **parent agent** should control all communication with the user. By default, child agents can send messages directly to users via `SendMessageTool`. To prevent this, add explicit instructions to the child agent's system instructions that prohibit direct messaging and require output via variables.

**Common misconception:** The **completion setting** on a child agent does **not** control whether it sends messages to the user. It only determines what the parent should do after the child finishes (continue, end, or return). Setting completion behavior will not prevent direct responses.

## When to Use

- The parent agent needs to format, filter, or enrich the child's response before showing it
- Multiple child agents contribute partial answers that the parent combines
- You want a consistent tone/format across all responses, regardless of which child produced them
- The parent applies business logic to the child's output before presenting it

## YAML Example

**Child agent instructions** (in the child agent's `settings.mcs.yml`):

```yaml
instructions: |
  CRITICAL - DO NOT MESSAGE USERS
  - DO NOT respond directly to the user
  - DO NOT call SendMessageTool or send any messages
  - ONLY populate the output variables with your response
  - Let the parent orchestrator deliver the response to the user
```

**Parent agent flow** (calling the child and reading its output):

```yaml
actions:
  - kind: BeginDialog
    id: callChild_abc123
    dialog: <AGENT-SCHEMA-NAME>.agent.ChildAgent
    output:
      kind: VariableOutputBindings
      bindings:
        - kind: VariableOutputBinding
          variable: Topic.ChildResult
          property: AgentOutput
  - kind: SendActivity
    id: sendResult_def456
    activity: "{Topic.ChildResult}"
```

## Pitfalls

- **Instructions-based, not enforced by the platform.** The child agent's orchestrator respects its system instructions, but this is a behavioral guideline — not a hard technical block. Test to confirm the child complies.
- **Define output variables on the child agent.** The child needs output variables (e.g., `AgentOutput`) to carry its response back to the parent. Without them, the child has no way to return data.
- **The completion setting is unrelated.** Don't confuse the completion setting with message suppression — they solve different problems.
