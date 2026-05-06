---
name: Knowledge Hold Message
description: Send an immediate randomized hold message during knowledge search so users know the agent is working.
challenge: Knowledge retrieval can leave users staring at a silent screen, causing confusion, duplicate questions, and abandonment.
status: proven
tags: [OnKnowledgeRequested, hold-message, latency, knowledge-search, user-experience, Power-Fx]
---

## Pattern

Not all models and channels support native response streaming, which can significantly improve perceived latency for end users. For knowledge-heavy agents where streaming is unavailable, this pattern bridges the gap by sending an immediate hold message so users know the agent is actively working.

> **For multi-tool or multi-agent orchestration**, where latency comes from chained tool calls rather than knowledge search, see the [Chain of Thought Logging](chain-of-thought-logging.md) pattern instead. This pattern is designed specifically for agents with high-volume knowledge retrieval.

This pattern adds an `OnKnowledgeRequested` topic that sends a quick "please hold" message before the orchestrator finishes knowledge retrieval and summarization. A Power Fx `Table()` stores a bank of short messages, `Rand()` chooses one, and `SendActivity` delivers it immediately.

### How it works

1. A custom `OnKnowledgeRequested` topic fires automatically when the orchestrator decides to search knowledge.
2. A Power Fx `Table()` of hold messages is built inline, with no connector calls or external storage.
3. `Rand()` and `Index()` select one row.
4. `SendActivity` sends the chosen message.
5. The orchestrator continues with its normal knowledge search and summarization flow.

### Trade-off: two messages per response

This pattern intentionally adds an extra message before the knowledge answer. Users get a hold message plus the final answer, which improves perceived latency but can feel chatty if your stakeholders prefer a quieter bot.

### Variation

If you do not need randomization, you can replace the table and selection logic with one fixed hold message.

## When to Use

- Your agent relies heavily on knowledge search and users experience noticeable wait times.
- You want a more conversational, human-like experience during knowledge retrieval.
- Users are abandoning conversations or resending questions during search delays.
- The model or channel does not support streaming, so the user has no visual cue that work is happening.

## YAML Example

**Randomized hold message topic** (create a new topic and paste into the Code editor view):

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnKnowledgeRequested
  id: main
  actions:
    - kind: SetVariable
      id: setVariable_hM7xQ2
      variable: init:Topic.HoldMessages
      value: "=Table({Value: \"Let me dig into that for you...\"}, {Value: \"One moment while I look that up!\"}, {Value: \"Searching my knowledge base now...\"}, {Value: \"Give me just a sec to find that...\"}, {Value: \"On it! Let me check my sources...\"}, {Value: \"Hang tight, I'm pulling up the details...\"}, {Value: \"Great question! Let me research that...\"}, {Value: \"Looking into that right now...\"}, {Value: \"Let me find the best answer for you...\"}, {Value: \"Just a moment while I search for that information...\"}, {Value: \"I'm on the case! One moment please...\"}, {Value: \"Allow me to look that up for you...\"}, {Value: \"Checking my resources now...\"}, {Value: \"Let me see what I can find...\"}, {Value: \"Searching for the most relevant information...\"}, {Value: \"One sec while I hunt that down...\"}, {Value: \"Let me consult my knowledge sources...\"}, {Value: \"Working on finding that answer for you...\"}, {Value: \"Hold on while I track down those details...\"}, {Value: \"Researching that as we speak...\"}, {Value: \"Let me fetch that information for you...\"}, {Value: \"Give me a moment to pull that together...\"}, {Value: \"Scanning my knowledge base for you...\"}, {Value: \"I'll have that info in just a moment...\"}, {Value: \"Diving into the details now...\"}, {Value: \"Rummaging through my notes for you...\"}, {Value: \"Let me look into that for you right away...\"}, {Value: \"Checking on that now, one moment...\"}, {Value: \"Querying my sources for the best answer...\"}, {Value: \"Let me do a quick search on that...\"}, {Value: \"Pulling up the relevant info now...\"}, {Value: \"Bear with me while I find that...\"}, {Value: \"Sifting through the knowledge base...\"}, {Value: \"Let me round up the details for you...\"}, {Value: \"Looking that up right now, hang on...\"}, {Value: \"Just a sec, I want to give you a solid answer...\"}, {Value: \"Let me see what the docs say about that...\"}, {Value: \"Gathering the relevant information...\"}, {Value: \"Almost there, just searching for the best answer...\"}, {Value: \"On the hunt for that info now...\"})"

    - kind: SetVariable
      id: setVariable_rP4kN8
      variable: init:Topic.SelectedMessage
      value: =Index(Topic.HoldMessages, RoundDown(Rand() * CountRows(Topic.HoldMessages), 0) + 1).Value

    - kind: SendActivity
      id: sendActivity_wK9mT3
      activity: "{Topic.SelectedMessage}"
```

> **Note:** `OnKnowledgeRequested` fires automatically when the orchestrator needs to search. You do not add trigger phrases or a search node; the orchestrator performs the search after this topic completes.

**Static hold message variant**:

```yaml
- kind: SendActivity
  id: sendActivity_wK9mT3
  activity: "One moment while I search for that information..."
```

## Pitfalls

- This pattern adds an extra user-facing message per knowledge request; confirm that the UX trade-off is acceptable.
- Do **not** use an AI Builder prompt to generate the hold message, because that adds several seconds of real latency before the knowledge search even starts.
- Keep the hold message short; the goal is reassurance, not another full response.
- If you want channel-specific behavior, wrap `SendActivity` in a `ConditionGroup` that checks `System.Activity.ChannelId`.

