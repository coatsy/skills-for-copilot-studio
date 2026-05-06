---
name: Line Breaks in Messages
description: Use `<br /><br />` inside message and question nodes to render reliable paragraph spacing across channels.
challenge: Multi-line bot messages collapse into walls of text because most channels render plain YAML newlines as spaces.
status: proven
tags: [formatting, line-breaks, SendActivity, Question, paragraph-spacing, br-tag]
---

## Pattern

This pattern inserts HTML break tags directly into `SendActivity` and `Question` content so Copilot Studio messages render with visible paragraph spacing in Teams, web chat, and other channels. YAML newlines alone are usually not enough; most channels flatten them into spaces.

### How it works

- `<br />` creates a single line break.
- `<br /><br />` creates paragraph spacing.
- The YAML `|-` block scalar keeps the source readable and preserves the literal line layout in the file.
- Plain YAML newlines without `<br />` are rendered as a single space in most channels.

### Quick reference

| Syntax | Effect |
|---|---|
| `<br />` | Single line break |
| `<br /><br />` | Paragraph spacing (double break) |
| `|-` (YAML block scalar) | Preserves source newlines for multi-line `activity` / `prompt` |
| Plain YAML newline (without `<br />`) | Rendered as a space in most channels |

## When to Use

- The agent sends longer messages that benefit from visual separation, such as welcome text, instructions, or summaries.
- `Question` nodes need a preamble before the actual prompt.
- Users report that bot responses feel like walls of text.
- You want consistent paragraph spacing across Teams, web chat, and other channels.

## YAML Example

**Message node**:

```yaml
- kind: SendActivity
  id: sendActivity_QVhMj2
  activity: |-
    Hello! I'm a cool bot.
    <br /><br />
    I'm here to help you!
```

Renders as two visually separated paragraphs:

> Hello! I'm a cool bot.
>
> I'm here to help you!

**Question node with preamble**:

```yaml
- kind: Question
  id: question_example
  alwaysPrompt: true
  variable: init:Topic.UserChoice
  prompt: |-
    I need a few details to get started.
    <br /><br />
    Please select one of the options below to continue.
  entity:
    kind: ClosedListEntityReference
    entityId: yourAgentName.entity.YourEntity
```

**Multi-section message**:

```yaml
- kind: SendActivity
  id: sendActivity_multiSection
  activity: |-
    Welcome to the HR Support Bot!
    <br /><br />
    I can help you with:
    - Leave requests
    - Benefits enrollment
    - Payroll questions
    <br /><br />
    Just type your question or select an option below to get started.
```

## Pitfalls

- Always pair `<br /><br />` with `|-` so the YAML stays readable and the rendered output stays consistent.
- Do not rely on plain newlines alone; most channels will collapse them into spaces.
- Apply the same technique to both `SendActivity.activity` and `Question.prompt` so formatting stays consistent across the conversation.
- Test especially long formatted messages in your target channel to avoid overly tall chat bubbles.
