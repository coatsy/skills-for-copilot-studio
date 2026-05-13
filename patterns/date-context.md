---
name: Date Context
description: Inject the current date into agent instructions using Power Fx so the orchestrator can accurately interpret relative timeframes.
challenge: The orchestrator has no awareness of the current date, causing misinterpretation of relative date references ("next week", "upcoming", "recent") and time-sensitive knowledge retrieval.
status: proven
tags: [date, time, Power Fx, instructions, orchestrator, scheduling]
---

## Pattern

Inject the current date directly into the agent instructions using Power Fx's `Today()` function with `DateTimeFormat.LongDate`. This gives the orchestrator explicit awareness of "today" so it can correctly interpret relative timeframes and filter time-sensitive content.

The expression `{Text(Today(),DateTimeFormat.LongDate)}` is evaluated once per conversation and produces an unambiguous date like `Thursday, March 13, 2026` — including the day of week for additional context.

**Why LongDate:** Short formats like `3/13/2026` are ambiguous across locales (March 13th vs 13th of March). LongDate eliminates this ambiguity and reduces model confusion.

## When to Use

- Users ask date-relative questions ("What's coming up next week?", "recent announcements", "upcoming deadlines")
- Knowledge sources contain time-sensitive content (calendars, policies with effective dates, event schedules)
- The agent handles scheduling, deadlines, or event-related queries
- Date interpretation is causing confusion or hallucinated dates

## YAML Example

**Agent instructions** (in `settings.mcs.yml`):

```yaml
instructions: |
  ## Current Context
  Date: {Text(Today(),DateTimeFormat.LongDate)}

  When users ask about dates, schedules, or time-sensitive information, use this date
  as your reference point. Interpret "next", "upcoming", "recent", and other relative
  terms based on this current date.

  ## Your Role
  [Rest of your agent instructions...]
```

**Combined with JIT User Context:**

```yaml
instructions: |
  ## Current Context
  Date: {Text(Today(),DateTimeFormat.LongDate)}
  User: {Global.UserDisplayName} from {Global.UserCountry}

  Provide localized, date-aware responses based on the user's location and current date.
```

## Pitfalls

- **Minimal token cost.** The date expression adds ~5-10 tokens per orchestrator call. The benefit of accurate date interpretation outweighs this cost.
- **Evaluated once per conversation,** not per message. This is sufficient for most use cases since conversations rarely span multiple days.
- **No timezone awareness.** `Today()` uses the server's timezone. If users span multiple timezones and precision matters, consider adding `Now()` with explicit timezone handling.
