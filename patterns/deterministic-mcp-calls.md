---
name: Deterministic MCP Calls
description: Improve MCP tool invocation reliability with instruction-based nudges or a dedicated child agent wrapper.
challenge: Business-critical requests can skip the required MCP tool because MCP actions are generative and cannot be invoked deterministically from topics today.
status: experimental
tags: [MCP, MCP-server, tool-invocation, generative-actions, child-agent, deterministic]
---

## Pattern

MCP tools are exposed to the orchestrator as generative actions, so the platform decides whether to call them. Today there are two important limitations: you cannot force an MCP tool with `/` syntax in instructions, and topics cannot call MCP tools directly. This pattern gives you two practical workarounds.

### Current platform limitations

- **No `/` syntax for MCP tools in instructions** — unlike topics and built-in actions, you cannot prefix an MCP tool name with `/` to force invocation.
- **No MCP tool nodes in topics** — topics can call connector actions and child agents, but MCP tools are only available to the orchestrator as generative actions.

### Option 1 — Name the tool in agent instructions

The lightest-weight option is to reference the MCP tool explicitly in the agent's instructions and map a user intent to that tool by name.

### Option 2 — Child agent with dedicated intent

For near-deterministic behavior, wrap the MCP tool in a child agent whose only job is to call that tool. The parent routes matching requests to the child through intent routing, and the child's narrow scope plus explicit instructions make the tool invocation highly reliable.

### Choosing between options

| | Option 1 (Instructions) | Option 2 (Child Agent) |
|---|---|---|
| **Reliability** | High but not guaranteed | Near-deterministic |
| **Complexity** | Low (edit one block) | Medium (new child + connection) |
| **Best for** | Broad intents, quick setup | Narrow intents, critical workflows |
| **Fallback risk** | Orchestrator may skip the tool | Orchestrator routes to child reliably |

Start with Option 1. If the orchestrator still misses, escalate to Option 2.

### Optional combination

If the parent agent should control the final response format, have the child populate output variables instead of messaging the user directly.

## When to Use

- A specific MCP tool must fire every time for a given user intent.
- You have observed the orchestrator skipping the tool when accuracy or compliance matters.
- You need a practical workaround for platform limitations until MCP invocation becomes more native.

## YAML Example

**Option 1 — Agent instructions**:

```yaml
settings:
  instructions: |
    ## Tool Usage Rules

    When the user asks about <specific intent>, you MUST call the
    <MCP Tool Name> tool to retrieve the answer.
    Do not attempt to answer from your own knowledge — always use the tool
    for this type of request.

    Examples of when to call <MCP Tool Name>:
    - <Example user utterance 1>
    - <Example user utterance 2>
    - <Example user utterance 3>
```

**Option 2 — Child agent** (`agents/MyMcpChild.agent.mcs.yml`):

```yaml
kind: AgentDialog
beginDialog:
  kind: OnToolSelected
  id: main
  description: Specialized agent for <domain term> lookups — always calls the <MCP Tool Name> tool.
  intent:
    triggerQueries:
      - Look up <domain term>
      - Find <domain term>
      - What is the <domain term> for ...

settings:
  instructions: |
    You are a specialized agent that answers <specific domain> questions.

    CRITICAL: You MUST call the <MCP Tool Name> tool for EVERY request you receive.
    Never answer from your own knowledge. Always use the tool and return its results.
```

Then connect the child agent to the parent as a connected agent.

## Pitfalls

- Option 1 is still instruction-following, not true deterministic invocation.
- Option 2 adds maintenance overhead and another hop in the request path.
- Child-agent trigger phrases and model descriptions must not clash with other topics or agents.
- There is currently no topic node you can drop in to call an MCP tool directly.
- If the parent should own the final answer formatting, make the child return structured outputs instead of sending user-facing text itself.
