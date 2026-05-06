---
name: Teams Production Hardening
description: Apply eight coordinated production patterns for Teams and M365 Copilot agents to handle reinstalls, resets, stale context, and diagnostics.
challenge: Teams and Microsoft 365 Copilot deployments can suffer from stale sessions, missing onboarding after reinstall, inconsistent context initialization, and unhelpful reset or error experiences.
status: recommended
tags: [Teams, Microsoft-Teams, M365-Copilot, production, OnInstallationUpdate, OnInactivity, OnSystemRedirect, OnError, diagnostics, suggested-prompts]
---

## Pattern

This pattern is a coordinated framework of eight production patterns for Copilot Studio agents deployed to Microsoft Teams and, where applicable, Microsoft 365 Copilot. The patterns are designed to work together: variables set by one pattern are read by others, reset behavior depends on context initialization, and the same diagnostics experience is reused in both reset and error flows.

> Treat this as an end-to-end framework, not a pick-and-mix checklist.

### Framework overview

```text
                  ┌──────────────────────────────────────────┐
                  │  User opens agent in Teams / M365 Copilot │
                  └──────────────────┬───────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
┌─────────▼─────────┐    ┌───────────▼────────────┐   ┌─────────▼──────────┐
│ 1. OnInstallation │    │ 4. SetContextVariables │   │ 8. Suggested       │
│    Update         │    │    (fires if blank)    │   │    prompts (config)│
│    → ConvStart    │    │    → Global.UserContext│   └────────────────────┘
└─────────┬─────────┘    └────────────────────────┘
          │                          ▲
          ▼                          │
   ConversationStart ─────────────> reads Global.UserContext

   ┌───────────────────────────────────────────────┐
   │ 2. OnInactivity (12h) ──► clear vars          │
   │                           set Global.Inactive │
   │                                               │
   │ 3. OnActivity (Inactive=true) ──► notify +    │
   │                                    "Start over"│
   └─────────────────────┬─────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │ 6. Start Over (Adaptive Card)     │
         │    Yes  ──► 5. Reset Conversation │
         │    No   ──► continue              │
         │    Diagnostics panel inline       │
         └───────────────┬───────────────────┘
                         ▼
         ┌───────────────────────────────────┐
         │ 5. Reset Conversation             │
         │    Clear scoped vars + history    │
         │    Redirect to ConversationStart  │
         └───────────────────────────────────┘

   ┌───────────────────────────────────────────────┐
   │ 7. OnError (Adaptive Card)                    │
   │    Error details + diagnostics + "Start over" │
   │    LogCustomTelemetryEvent                    │
   └───────────────────────────────────────────────┘
```

### Shared variables

| Variable | Set by | Read by | Purpose |
|---|---|---|---|
| `Global.InactiveConversation` | Pattern 2 (set true), Pattern 3 (reset false) | Pattern 3 | Signals that the next user message should render the session-expired card |
| `Global.UserContext` | Pattern 4 | Agent instructions, all topics | Structured user context such as Country and Language that survives resets and works in M365 Copilot |
| `Topic.Confirm` | Pattern 6 | Pattern 6 branches | Yes/No answer for the restart confirmation flow |

### The eight patterns

1. **Handle app reinstalls** — `OnInstallationUpdate` redirects reinstall events back to `ConversationStart` because reinstalling the Teams app does not fire the normal conversation-start flow.
2. **Clear stale context after inactivity** — `OnInactivity` clears variables and `ConversationHistory`, marks the conversation inactive, and cancels running dialogs.
3. **Notify the user after an inactivity reset** — an `OnActivity` message handler checks `Global.InactiveConversation`, resets it, and shows a Hero Card with a **Start over** button.
4. **Set global context variables cross-channel** — a low-priority `OnActivity` topic initializes `Global.UserContext` when blank so Teams and M365 Copilot behave consistently.
5. **Rebuild Reset Conversation** — override `OnSystemRedirect` to clear scoped variables plus `ConversationHistory`, then route back to `ConversationStart`.
6. **Rebuild Start Over with diagnostics** — replace the default prompt with an Adaptive Card question backed by a `YesNo` closed-list entity and an advanced diagnostics panel.
7. **Rebuild OnError with diagnostics and telemetry** — show actionable error details, reuse the same diagnostics panel from Start Over, log telemetry, and end with `CancelAllDialogs`.
8. **Configure suggested prompts at the agent level** — define 3 to 4 suggested prompts in agent settings so new users see guidance in both Teams and M365 Copilot.

### Pattern 6 details — Start Over with diagnostics

Replace the default Boolean question with an Adaptive Card question using a closed-list `YesNo` entity. The card should include:

- A confirmation header and explanation.
- `Yes` and `No` action buttons.
- A collapsed **Advanced options** panel with troubleshooting actions: `Clear state` (`/debug clearstate`), `Clear history` (`/debug clearhistory`), and `Conversation ID` (`/debug conversationid`).
- Environment details: `System.Bot.EnvironmentId`, `System.Bot.TenantId`.
- Agent details: `System.Bot.Name`, `System.Bot.Id`, `System.Bot.SchemaName`.
- User details: `System.User.Language`, `System.User.Id`.
- Conversation details: `System.Activity.ChannelId`, `System.Conversation.Id`, `Text(Now(), DateTimeFormat.UTC)`.

Branching logic:

- `Yes` → `BeginDialog` to the Reset Conversation topic.
- `No` → `SendActivity: "Ok. Let's carry on."` plus `RecognizeIntent` on the user's input to return to normal routing.

Setup steps:

1. Create a closed-list entity `YesNo` with items `Yes` and `No`.
2. Open the system **Start Over** topic.
3. Replace the Boolean question node with a `Question` node using `ClosedListEntityReference` to `<agent>.entity.YesNo`, storing the answer in `Topic.Confirm`.
4. Put the Adaptive Card structure above into that `Question.prompt`.
5. Add `ConditionGroup` branches for `Yes` and `No`.

### Pattern 7 details — OnError with diagnostics

Override the `OnError` system topic with an Adaptive Card that shows:

- Header: `⚠️ Something went wrong` plus a short apology.
- Error details for `System.Error.Message`, `System.Error.Code`, `System.Conversation.Id`, and `Text(Now(), DateTimeFormat.UTC)`.
- The same collapsed **Advanced options** diagnostics panel used in Pattern 6.
- Troubleshooting buttons: Start over, Clear state, Clear history, Conversation ID.

End the topic with `CancelAllDialogs` so the user returns to a clean state.

> This combines naturally with `rai-error-handling`: handle RAI subcodes first, then let all other errors fall through to the generic diagnostic card.

### Pattern 8 details — Suggested prompts

Configure suggested prompts at the **agent** level, not the topic level:

1. Open agent **Settings**.
2. Go to **Generative AI → Suggested prompts**.
3. Add 3 or 4 prompts aligned to the agent's core capabilities.
4. Save the changes at agent level.

In YAML, this shows up as the `conversationStarters` block in `agent.mcs.yml` or `settings.mcs.yml`.

### Validation checklist

- **Pattern 1** — Uninstall and reinstall the Teams app, then verify the Conversation Start greeting appears.
- **Pattern 4** — Open the agent in Microsoft 365 Copilot and verify `Global.UserContext` is populated before the first answer.
- **Pattern 2 + 3** — Let the conversation idle past `durationInSeconds`, send a message, and verify the session-expired Hero Card appears.
- **Pattern 6** — Trigger Start Over and verify the Adaptive Card includes confirmation plus Advanced options with the correct IDs.
- **Pattern 5** — Confirm `Yes` in Pattern 6 and verify history clears, Conversation Start reruns, and `Global.UserContext` is repopulated.
- **Pattern 7** — Force a runtime error and verify the error card shows the message, code, conversation ID, UTC timestamp, and that `OnErrorLog` appears in telemetry.
- **Pattern 8** — Start a new conversation and verify suggested prompts appear in both Teams and M365 Copilot.

## When to Use

- Your agent is deployed or will be deployed to Microsoft Teams, especially with long-lived conversations.
- You need consistent behavior across Teams and Microsoft 365 Copilot.
- Users report stale context, confusing resets, or generic errors with no path forward.
- Support teams need self-serve diagnostics such as environment, tenant, agent, and conversation identifiers.

## YAML Example

**Pattern 1 — Handle app reinstalls**:

```yaml
kind: AdaptiveDialog
startBehavior: UseLatestPublishedContentAndCancelOtherTopics
beginDialog:
  kind: OnActivity
  id: main
  type: InstallationUpdate
  actions:
    - kind: BeginDialog
      id: Bqmh4L
      dialog: cat_B2EAgent.topic.ConversationStart
```

**Pattern 2 — Clear stale context after inactivity**:

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnInactivity
  id: main
  condition: =System.Activity.ChannelId = "msteams"
  durationInSeconds: 43200
  actions:
    - kind: ClearAllVariables
      id: mXHosp
      variables: ConversationHistory
    - kind: ClearAllVariables
      id: Vsemgr
    - kind: SetVariable
      id: setVariable_6CUITr
      variable: Global.InactiveConversation
      value: true
    - kind: CancelAllDialogs
      id: webE3j
inputType: {}
outputType: {}
```

**Pattern 3 — Notify after inactivity-triggered reset**:

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnActivity
  id: main
  condition: =Global.InactiveConversation = true
  type: Message
  actions:
    - kind: SetVariable
      id: setVariable_G6aAbW
      variable: Global.InactiveConversation
      value: false
    - kind: SendActivity
      id: sendActivity_pgGjvA
      activity:
        attachments:
          - kind: HeroCardTemplate
            title: Session expired
            subtitle: New conversation started
            text: ℹ️ Your previous session ended due to inactivity. Your query is now treated as new. Restart anytime.
            buttons:
              - kind: MessageBack
                title: Start over
                text: Start over
inputType: {}
outputType: {}
```

**Pattern 4 — Set global context variables cross-channel**:

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnActivity
  id: main
  priority: -2
  condition: =IsBlank(Global.UserContext)
  type: Message
  actions:
    - kind: SetVariable
      id: setVariable_kRbCMi
      variable: Global.UserContext
      value: |-
        ={
            Country: "USA",
            Language: "English"
        }
inputType: {}
outputType: {}
```

**Pattern 5 — Rebuild Reset Conversation**:

```yaml
kind: AdaptiveDialog
startBehavior: UseLatestPublishedContentAndCancelOtherTopics
beginDialog:
  kind: OnSystemRedirect
  id: main
  actions:
    - kind: ClearAllVariables
      id: clearAllVariables_73bTFR
      variables: ConversationScopedVariables
    - kind: ClearAllVariables
      id: SLgE7u
      variables: ConversationHistory
    - kind: BeginDialog
      id: U14iCH
      dialog: cat_B2EAgent.topic.ConversationStart
    - kind: CancelAllDialogs
      id: cancelAllDialogs_12Gt21
```

**Pattern 7 — Telemetry logging node**:

```yaml
- kind: LogCustomTelemetryEvent
  id: 9KwEAn
  eventName: OnErrorLog
  properties: "={ErrorMessage: System.Error.Message, ErrorCode: System.Error.Code, TimeUTC: Text(Now(), DateTimeFormat.UTC), ConversationId: System.Conversation.Id}"
```

Patterns 6 and 8 are configuration and Adaptive Card authoring steps in the source material, not standalone YAML blocks.

## Pitfalls

- Apply the patterns in order; earlier patterns establish variables and reset semantics that later patterns assume.
- Replace every `cat_B2EAgent.topic.*` dialog reference with your own agent schema prefix from `settings.mcs.yml`.
- `startBehavior: UseLatestPublishedContentAndCancelOtherTopics` is important on Patterns 1, 5, and 7 so published content wins over stale in-flight dialogs.
- Pattern 2 is intentionally scoped to Teams via `System.Activity.ChannelId = "msteams"`; remove or adapt that condition if you want the behavior on other channels.
- Patterns 6 and 7 deliberately duplicate the same Advanced options diagnostics experience so users see a consistent troubleshooting surface.
