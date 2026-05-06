---
name: Chain of Thought Logging
description: Send high-level "Thinking" messages during multi-step orchestration to improve observability and perceived responsiveness.
challenge: Multi-tool or multi-agent flows can leave users waiting in silence with no visibility into what the agent is doing.
status: recommended
tags: [chain-of-thought, CoT, AutomaticTaskInput, reasoning-trace, observability, thinking-messages]
---

## Pattern

This pattern creates a lightweight logging topic that turns orchestration progress into italicized `_Thinking: ..._` chat messages. It is useful for multi-step tool chains, MCP calls, child-agent orchestration, and reasoning-heavy models where users would otherwise experience 10 to 30 seconds of silence.

### How it works

The orchestrator reads an input variable's `description` to decide what data to supply, so the description doubles as an instruction. The logger topic accepts a CoT summary through `AutomaticTaskInput`, then immediately sends it as a user-visible trace message.

For non-reasoning models such as GPT-4.1 and GPT-5 Chat, this technique surfaces reasoning that would otherwise stay hidden. For reasoning models, the orchestrator narrates a safe high-level summary rather than exposing raw internal chain-of-thought.

> **Tested with:** GPT-4.1, GPT-5 Chat, GPT-5 Auto, GPT-5 Reasoning, Claude Sonnet, Claude Opus.

### Example user experience

```
User: "What's the latest status on Project Alpha?"
Agent: _Thinking: Looking up Project Alpha in the project tracker..._
Agent: _Thinking: Found 3 recent updates. Checking team assignments..._
Agent: _Thinking: Cross-referencing with the deadline calendar..._
Agent: Here's the latest on Project Alpha: <final answer>
```

### Instruction to add

In the Copilot Studio instructions editor, reference the topic via the `/` dropdown so the topic name resolves correctly:

```
After every tool, topic, or step you take (except when you are already
calling /Log Chain of Thoughts or other debug/logging topics), log your
intermediate reasoning by calling /Log Chain of Thoughts.
```

The recursion guard is best-effort because it relies on natural-language instructions, not a hard platform stop.

## When to Use

- Your agent uses multiple tools, MCP servers, or child agents that chain together.
- Users experience long waits during multi-step reasoning with no feedback.
- You need a debug or observability aid to see what the orchestrator is doing step by step.
- The agent uses reasoning models where extended thinking creates long silent pauses.

## YAML Example

**Log Chain of Thoughts topic** (create a topic named `Log Chain of Thoughts` and paste into the Code editor view):

```yaml
kind: AdaptiveDialog

inputs:
  - kind: AutomaticTaskInput
    propertyName: CoT
    description: High-level step summary for what you just did and why (no system prompts, secrets, PII, or raw chain-of-thought)
    shouldPromptUser: false

modelDescription: log chain of thoughts

beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent: {}
  actions:
    - kind: SendActivity
      id: sendActivity_9XILFq
      activity: "_Thinking: {Topic.CoT}_"

inputType:
  properties:
    CoT:
      displayName: CoT
      description: High-level step summary for what you just did and why (no system prompts, secrets, PII, or raw chain-of-thought)
      type: String

outputType: {}
```

## Pitfalls

- Do not use this for pure knowledge-search agents; a simple knowledge hold message is usually a better fit.
- Each log is an extra orchestrator call, so this increases Copilot credit consumption.
- Multiple `_Thinking: ..._` messages can make the conversation busier; validate the UX with stakeholders.
- Keep the `AutomaticTaskInput.description` strict so the orchestrator does not leak secrets, PII, system prompts, or raw chain-of-thought.
- If you notice loops, tighten the recursion guard wording or add additional defensive conditions around when the topic is called.
