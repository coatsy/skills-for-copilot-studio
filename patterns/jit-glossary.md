---
name: JIT Glossary
description: Load customer-specific acronyms into a global variable on first message so the orchestrator can expand them before searching knowledge sources.
challenge: The agent doesn't understand internal acronyms and abbreviations, leading to poor knowledge search quality and confused answers.
status: proven
tags: [knowledge, glossary, acronyms, initialization, JIT, OnActivity]
---

## Pattern

A **JIT (Just-In-Time) glossary** loads a CSV of customer-specific acronyms into `Global.Glossary` the first time a user sends a message. The orchestrator then silently expands acronyms before searching knowledge sources — improving retrieval quality without the user having to explain internal jargon.

The glossary is stored as a knowledge source with `triggerCondition: false` (excluded from automatic searches) and explicitly retrieved via `SearchAndSummarizeContent` into a global variable. The agent instructions reference `{Global.Glossary}` so the orchestrator uses it as context.

```
CSV file in Dataverse
        ↓
Knowledge source (triggerCondition: =false)    ← never auto-searched
        ↓
OnActivity topic (type: Message)               ← fires on first user message
  condition: =IsBlank(Global.Glossary)         ← JIT: only runs if not loaded yet
        ↓
SearchAndSummarizeContent → Global.Glossary    ← loaded once per conversation
        ↓
Agent instructions reference {Global.Glossary} ← orchestrator uses it for context
```

**Why `OnActivity (type: Message)` and not `OnConversationStart`:** `OnConversationStart` does not fire in M365 Copilot or other channel-embedded surfaces. Using `type: Message` with an `IsBlank` guard ensures the glossary loads exactly once, only when there's a real user interaction.

## When to Use

- The customer uses internal acronyms not found in public knowledge
- Knowledge search quality is poor because the agent misinterprets user queries containing abbreviations
- The glossary content is stable enough for load-once-per-session (no per-message refresh needed)
- You do **not** want the glossary returned directly as an answer — it is context-only

## YAML Example

**Provisioning topic** (`conversation-init.topic.mcs.yml`):

```yaml
kind: AdaptiveDialog
modelDescription: null
beginDialog:
  kind: OnActivity
  id: main
  type: Message
  condition: =IsBlank(Global.Glossary)
  actions:
    - kind: SearchAndSummarizeContent
      id: searchGlossary_abc123
      autoSend: false
      variable: Topic.GlossaryResult
      userInput: ='*'
      responseCaptureType: FullResponse
      applyModelKnowledgeSetting: false
      knowledgeSources:
        kind: SearchSpecificKnowledgeSources
        knowledgeSources:
          - <AGENT-SCHEMA-NAME>.knowledge.glossary
    - kind: SetVariable
      id: setGlossary_def456
      variable: Global.Glossary
      value: =Topic.GlossaryResult
```

**Agent instructions** (in `settings.mcs.yml`):

```yaml
instructions: |
  ## Glossary
  {Global.Glossary}
  The above is the customer glossary (format: ACRONYM,Definition, one per line).
  Silently expand any acronym found in it before interpreting the user's message or searching knowledge sources.
  Do not mention the glossary to the user unless they explicitly ask for a list of acronyms.
```

## Pitfalls

- **Only one `{Global.Glossary}` reference in instructions.** Each reference injects the full variable value into the orchestrator prompt. If the glossary is large, multiple references multiply token consumption significantly.
- **Dataverse storage required today.** SharePoint knowledge sources use semantic search that cannot output full file content. The glossary file must be in Dataverse (directly uploaded or synced from SharePoint via UI).
- **CSV must be saved as `.txt`.** Copilot Studio treats `.csv` files differently — use `.txt` with CSV content so it's treated as a document.
- **Knowledge source reference must match the filename.** The `knowledgeSources` value must match the `.mcs.yml` filename (without the `.knowledge.mcs.yml` suffix).
