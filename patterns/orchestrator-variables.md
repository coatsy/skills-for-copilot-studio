---
name: Orchestrator-Generated Variables
description: Use AutomaticTaskInput to have the orchestrator classify or extract structured data from the user's message at topic selection time — zero extra cost or latency.
challenge: Extracting structured data (categories, entities, flags) from user messages requires either asking the user explicitly or using an AI Prompt action that consumes additional credits and adds latency.
status: proven
tags: [orchestrator, classification, extraction, AutomaticTaskInput, knowledge-routing, variables]
---

## Pattern

Copilot Studio's generative orchestrator can populate topic input variables **at orchestration time**, before the topic body executes. Instead of collecting information from the user or running a separate AI Prompt, you define inputs that the orchestrator's LLM fills in by interpreting the conversation.

This reuses the same LLM call the orchestrator already makes to decide which topic to invoke — so classification/extraction is **free** (no additional credits) and **instant** (no extra round-trip).

The key fields:
- `kind: AutomaticTaskInput` — tells the orchestrator to fill this variable from the conversation
- `shouldPromptUser: false` — suppresses any user-facing question; the orchestrator resolves the value silently
- `description` — the extraction prompt. List exact allowed values so the orchestrator knows the vocabulary

The input must be declared in **both** `inputs` and `inputType.properties` — they must match.

## When to Use

- You need to classify queries into categories (HR, IT, Finance) for knowledge routing
- You want to extract a structured value (country, product name, priority) from the user's message without asking
- Knowledge search quality suffers because `UniversalSearchTool` applies the same strategy to every query
- You want to route to different knowledge sources based on query type or user context

**Not suitable for:** Complex multi-step reasoning, long document analysis, or transformations needing a full prompt — use an AI Prompt action for those.

## YAML Example

**Classification topic** (sets `Global.searchCategory` from the user's message):

```yaml
kind: AdaptiveDialog
inputs:
  - kind: AutomaticTaskInput
    propertyName: searchCategory
    description: |-
      Classify the user's query into one of these categories:
      HR, IT, Finance, Other
    shouldPromptUser: false

beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent: {}
  actions:
    - kind: SetVariable
      id: setVariable_abc123
      variable: Global.searchCategory
      value: =Topic.searchCategory

inputType:
  properties:
    searchCategory:
      displayName: searchCategory
      description: |-
        Classify the user's query into one of these categories:
        HR, IT, Finance, Other
      type: String

outputType: {}
```

**Knowledge routing topic** (`OnKnowledgeRequested` routes by category):

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnKnowledgeRequested
  id: main
  actions:
    - kind: ConditionGroup
      id: conditionGroup_route
      conditions:
        - id: condition_hr
          condition: =Global.searchCategory = "HR"
          actions:
            - kind: SearchAndSummarizeContent
              id: search_hr
              variable: System.SearchResults
              userInput: =System.SearchQuery
              knowledgeSources:
                kind: SearchSpecificKnowledgeSources
                knowledgeSources:
                  - <schemaName>.knowledge.hr-policies
        - id: condition_it
          condition: =Global.searchCategory = "IT"
          actions:
            - kind: SearchAndSummarizeContent
              id: search_it
              variable: System.SearchResults
              userInput: =System.SearchQuery
              knowledgeSources:
                kind: SearchSpecificKnowledgeSources
                knowledgeSources:
                  - <schemaName>.knowledge.it-documentation
      elseActions:
        - kind: SearchAndSummarizeContent
          id: search_fallback
          variable: System.SearchResults
          userInput: =System.SearchQuery
```

## Pitfalls

- **Write the description as a precise extraction instruction.** The orchestrator uses it as the prompt. Vague descriptions produce unreliable classifications.
- **Use enum-style descriptions.** List the exact allowed values (e.g., `"HR, IT, Finance, Other"`) so the orchestrator knows the vocabulary.
- **Keep the classification space small.** 3–6 categories work well. More than 10 degrades accuracy.
- **Always provide a fallback.** The orchestrator may not be confident. Define a default (e.g., `"Other"`) and handle it in `elseActions`.
- **`triggerCondition` cannot reference runtime variables.** Knowledge source filtering based on a runtime variable must be done inside an `OnKnowledgeRequested` topic using conditions and explicit `SearchAndSummarizeContent` nodes.
- **The variable is populated once at topic invocation.** It cannot be updated mid-topic by re-running orchestration.
