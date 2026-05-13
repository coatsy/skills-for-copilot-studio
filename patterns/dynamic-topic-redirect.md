---
name: Dynamic Topic Redirect
description: Use a Switch expression inside a BeginDialog node to route to different topics based on a variable, replacing nested condition chains.
challenge: Complex if/then/else condition chains in the UI become deeply nested, hard to read, and difficult to maintain as the number of routing targets grows.
status: proven
tags: [routing, Switch, BeginDialog, Power Fx, topic-redirect, conditions]
---

## Pattern

Use a **`Switch()` Power Fx expression inside a `BeginDialog` node** to dynamically redirect to different topics based on a variable value. This replaces complex `ConditionGroup` chains with a single, compact YAML node.

The `BeginDialog` node's `dialog` property accepts a Power Fx expression that evaluates at runtime to a fully qualified topic schema name. The `Switch()` function maps variable values to topic names, with a default fallback for unmatched values.

## When to Use

- You need to route the user to one of several topics based on a variable value
- You want to avoid deeply nested `ConditionGroup` nodes that are hard to read and maintain
- The routing logic maps a single variable to multiple target topics (e.g., lesson selection, category routing, menu choices)

## YAML Example

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    triggerQueries:
      - Route to lesson
  actions:
    - kind: SetVariable
      id: setVariable_7bgfoP
      variable: Topic.MyVariable
      value: =RandBetween(0,4)
    - kind: BeginDialog
      id: redirect_A4lDAn
      dialog: |-
        =Switch(
            Topic.MyVariable,
            1, "cat_MyBot.topic.Lesson1",
            2, "cat_MyBot.topic.Lesson2",
            3, "cat_MyBot.topic.Lesson3",
            "cat_MyBot.topic.Fallback"
        )
```

**What this replaces:**

```
ConditionGroup (Topic.MyVariable = 1)  → BeginDialog: Lesson1
ConditionGroup (Topic.MyVariable = 2)  → BeginDialog: Lesson2
ConditionGroup (Topic.MyVariable = 3)  → BeginDialog: Lesson3
Else                                   → BeginDialog: Fallback
```

One `BeginDialog` + `Switch()` instead of 3+ nested condition nodes.

## Pitfalls

- **Fully qualified topic names required.** Each branch value must be the full schema name (e.g., `cat_MyBot.topic.Lesson1`). Read `settings.mcs.yml` to get the agent's schema name prefix.
- **Use `|-` block scalar** for the multi-line Power Fx expression to preserve formatting in YAML.
- **The last `Switch()` argument (without a match value) is the default case.** Always include a fallback to avoid silent failures when the variable has an unexpected value.
- **Not suitable for complex routing logic.** If routing depends on multiple variables or compound conditions, a `ConditionGroup` may still be clearer.
