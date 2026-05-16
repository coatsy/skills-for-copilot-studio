---
user-invocable: false
name: int-patterns
description: "Pattern library for Copilot Studio agent design. Contains proven and recommended implementation patterns with YAML examples. Used by the Advisor agent to suggest patterns and by the Author agent to reference YAML structure during implementation. USE FOR: design guidance, pattern suggestions, review against best practices, troubleshooting known pitfalls, YAML reference during implementation. DO NOT USE FOR: general YAML schema reference (use int-reference), topic creation mechanics (use new-topic)."
context: fork
---

# Copilot Studio Pattern Library

**Only read the pattern file relevant to the current task** — do NOT read all files.

## How to use patterns

Patterns are **recommendations, not requirements**. How you present them depends on your role:

**If you are the Advisor agent:**
- Present each pattern as a suggestion — explain the challenge it solves and why it's relevant
- Use status-appropriate language:
  - `proven`: "This is a proven pattern used in production — consider it for…"
  - `recommended`: "A recommended approach that works well — consider it for…"
  - `experimental`: "This is an experimental approach, not yet fully validated — you may want to test thoroughly before adopting"
- Always say "you could consider…" or "a common approach is…", never "you must…"
- Let the user decide — do NOT auto-apply patterns without confirmation

**If you are the Author agent:**
- When implementing a pattern the user or Advisor has already chosen, read the relevant pattern file for the correct YAML structure
- Do NOT suggest patterns yourself — that is the Advisor's role
- Use the YAML examples as reference for the correct kinds, fields, and structure

## Pattern Index

### JIT Glossary → [jit-glossary.md](${CLAUDE_SKILL_DIR}/../../patterns/jit-glossary.md)

Loads customer-specific acronyms into a global variable on first message so the orchestrator can expand them before searching knowledge sources.

**Read this pattern when:**
- The user wants to add a glossary, acronym list, or terminology table
- Knowledge search quality is poor because the agent doesn't understand internal abbreviations
- The user asks about loading CSV/text data into a variable at conversation start

### JIT User Context → [jit-user-context.md](${CLAUDE_SKILL_DIR}/../../patterns/jit-user-context.md)

Loads the current user's M365 profile (country, department) into global variables for personalized answers.

**Read this pattern when:**
- The user wants country-aware, department-aware, or role-aware answers
- The agent needs to call the M365 Users connector
- The user asks about personalizing responses based on who is chatting

### Dynamic Topic Redirect → [dynamic-topic-redirect.md](${CLAUDE_SKILL_DIR}/../../patterns/dynamic-topic-redirect.md)

Uses a Switch expression inside a BeginDialog node to route to different topics based on a variable.

**Read this pattern when:**
- The user needs to route to one of several topics based on a variable
- The user wants to replace nested ConditionGroup nodes with a cleaner approach
- The user asks about dynamic topic redirects or Switch expressions

### Prevent Child Agent Responses → [prevent-child-agent-responses.md](${CLAUDE_SKILL_DIR}/../../patterns/prevent-child-agent-responses.md)

Stops child agents from messaging users directly by instructing them to use output variables.

**Read this pattern when:**
- The user wants a child agent to return data without messaging the user
- The user is confused about the completion setting on a child agent
- The parent agent needs to control all user-facing responses

### Date Context → [date-context.md](${CLAUDE_SKILL_DIR}/../../patterns/date-context.md)

Injects the current date into agent instructions using Power Fx for accurate date-relative responses.

**Read this pattern when:**
- Users ask date-relative questions ("What's next week?", "upcoming events")
- The agent handles schedules, calendars, deadlines, or time-sensitive content
- Date interpretation is causing confusion or hallucinations

### Orchestrator-Generated Variables → [orchestrator-variables.md](${CLAUDE_SKILL_DIR}/../../patterns/orchestrator-variables.md)

Uses AutomaticTaskInput to classify or extract structured data from the user's message at orchestration time — zero extra cost or latency.

**Read this pattern when:**
- The user needs to route knowledge searches by category
- The user wants to extract a classification without asking the user or using an AI Prompt
- Knowledge search quality suffers because all sources are searched indiscriminately

### Prevent Tool Call Leaks → [prevent-tool-call-leaks.md](${CLAUDE_SKILL_DIR}/../../patterns/prevent-tool-call-leaks.md)

Stops the orchestrator from leaking internal reasoning and tool call metadata to the end user.

**Read this pattern when:**
- Users report seeing raw JSON in agent responses
- The agent has connector actions that the orchestrator invokes indirectly
- Responses contain `explanation_of_tool_call` or similar internal metadata

### Channel-Aware Behavior → [channel-aware-behavior.md](${CLAUDE_SKILL_DIR}/../../patterns/channel-aware-behavior.md)

Detects the host channel from `System.Activity.ChannelId` and gates behavior per surface (Teams, M365 Copilot, web chat, Direct Line, voice).

**Read this pattern when:**
- A feature works on one channel but breaks on another (file upload, Adaptive Card variants, hyperlinks)
- The user asks to detect Teams vs. M365 Copilot vs. web vs. voice
- A naive `=Lower(ChannelId) = "msteams"` check is silently failing for `msteams:Copilot` or other compound channel IDs
### RAI Error Handling → [rai-error-handling.md](${CLAUDE_SKILL_DIR}/../../patterns/rai-error-handling.md)

Classifies Azure OpenAI content-filter errors by subcode in the OnError topic and returns category-specific user messages with telemetry. Azure OpenAI models only — does not work with Anthropic or xAI models.

**Read this pattern when:**
- The user needs industry-specific or empathetic error messages for RAI content-filter violations
- The user wants category-specific handling (e.g., crisis resources for self-harm, security messaging for jailbreak attempts)
- The user asks about `OnError`, `ContentFiltered`, Azure OpenAI content filters, or RAI subcodes

### Line Breaks in Messages → [line-breaks-in-messages.md](${CLAUDE_SKILL_DIR}/../../patterns/line-breaks-in-messages.md)

Uses `<br /><br />` inside message and question nodes to render reliable paragraph spacing across channels.

**Read this pattern when:**
- Users report that bot messages feel like walls of text
- Multi-part questions or welcome messages need visual separation
- The user asks about line breaks, `<br />`, or formatting in messages or questions

### Knowledge Hold Message → [knowledge-hold-message.md](${CLAUDE_SKILL_DIR}/../../patterns/knowledge-hold-message.md)

Sends a randomized hold message during knowledge search so users know the agent is working.

**Read this pattern when:**
- The agent has noticeable knowledge-search latency
- Users are abandoning conversations or resending questions during delays
- The user asks about `OnKnowledgeRequested`, typing indicators, or hold messages

### Deterministic MCP Calls → [deterministic-mcp-calls.md](${CLAUDE_SKILL_DIR}/../../patterns/deterministic-mcp-calls.md)

Workarounds to improve MCP tool invocation reliability using instruction-based nudges or a dedicated child agent wrapper.

**Read this pattern when:**
- An MCP tool must fire every time for a specific intent but the orchestrator skips it
- The user asks about forcing MCP tool invocation or `/` syntax with MCP tools
- The user needs deterministic tool calls for business-critical workflows

### Chain of Thought Logging → [chain-of-thought-logging.md](${CLAUDE_SKILL_DIR}/../../patterns/chain-of-thought-logging.md)

Sends high-level "Thinking" messages during multi-step orchestration to improve observability and perceived responsiveness.

**Read this pattern when:**
- The agent uses multiple tools, MCP servers, or child agents that chain together
- Users experience long silences during multi-step reasoning
- The user wants a debug or observability trace of orchestrator behavior
- The user asks about streaming, typing indicators, or progress messages for complex flows

### Conversation History Variable → [conversation-history-variable.md](${CLAUDE_SKILL_DIR}/../../patterns/conversation-history-variable.md)

Captures a best-effort conversation transcript into a variable for escalation, logging, and downstream automation.

**Read this pattern when:**
- The user needs to capture conversation context for live-agent escalation
- A downstream tool or connector requires conversation history as input
- The user wants to log conversations to Dataverse, a ticketing system, or email

### Teams Production Hardening → [teams-production-hardening.md](${CLAUDE_SKILL_DIR}/../../patterns/teams-production-hardening.md)

Eight coordinated production patterns for Teams and M365 Copilot agents covering reinstalls, stale context, resets, diagnostics, and suggested prompts.

**Read this pattern when:**
- The user is deploying or hardening a Copilot Studio agent on Microsoft Teams
- Users report stale context after returning to a long-running Teams conversation
- Context variables work on web chat but not in Microsoft 365 Copilot
- The user wants richer OnError or Start Over experiences with diagnostic info
- The user asks about `OnInstallationUpdate`, `OnInactivity`, `OnSystemRedirect`, suggested prompts, or Teams-specific behavior

## Combining patterns

Multiple patterns can be combined in a single agent. Common combinations:
- **JIT Glossary + JIT User Context** → merge into a single `conversation-init` OnActivity topic (template at `templates/topics/conversation-init.topic.mcs.yml`)
- **Date Context + JIT User Context** → both go in agent instructions; date is a Power Fx expression, user context is a global variable reference
- **Orchestrator Variables + JIT User Context** → classify by category AND personalize by country for precise knowledge routing
- **RAI Error Handling + Teams Production Hardening** → handle RAI subcodes first in OnError, then fall through to the generic diagnostic card from Pattern 7
- **Knowledge Hold Message + Chain of Thought Logging** → use hold messages for knowledge-heavy agents and CoT logging for multi-tool agents; both reduce perceived latency but solve different problems
- **Teams Production Hardening + JIT User Context** → Pattern 4 sets `Global.UserContext` cross-channel; replace hard-coded values with the JIT User Context connector call for real profile data
