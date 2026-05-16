---
name: Channel-Aware Behavior
description: Detect the host channel (Teams, M365 Copilot, web chat, Direct Line, etc.) from System.Activity.ChannelId and gate behavior per surface.
challenge: Some agent capabilities (file upload UX, Adaptive Card variants, links to internal apps, voice prompts) work in one channel but not another. Without channel awareness, the agent offers broken affordances or generic responses regardless of where it's running.
status: experimental
tags: [channels, Teams, M365 Copilot, Direct Line, web chat, Activity, ChannelId, conditional, Power Fx]
---

## Pattern

Read `System.Activity.ChannelId` and stash it (plus any derived booleans you need, like `IsTeamsClient`) into global variables. Branch on those values to gate behavior per surface, change Adaptive Card variants, or shorten responses for embedded clients.

**Critical:** `ChannelId` can be a **compound value** of the form `base:subchannel` — e.g. `msteams:Copilot` when the agent is consumed inside Microsoft 365 Copilot in Teams, or `webchat:Sharepoint` when embedded in SharePoint. A naive equality check (`=Lower(ChannelId) = "msteams"`) misses these compound values. Always use `StartsWith` for the base channel and explicit equality (or `EndsWith(":copilot")`) for the sub-channel.

## When to Use

- A feature is unsupported on a specific channel (e.g. file upload prompts don't render the same in M365 Copilot vs. Teams vs. web chat)
- You need different Adaptive Card layouts per surface (Teams cards vs. generic web cards)
- You want to suppress a "join this Teams meeting" link when the user is already in Teams
- You want to detect M365 Copilot (embedded surface) and shorten responses, drop emojis, or change citation style
- The agent uses voice and you need different speech-output behavior on `directlinespeech` vs. text channels

## YAML Example

A diagnostic / gate topic that reads the channel and branches:

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    triggerQueries:
      - dump activity

  actions:
    - kind: SetVariable
      id: setPlatform
      variable: Global.ClientPlatform
      value: =System.Activity.ChannelId

    - kind: SetVariable
      id: setIsTeams
      variable: Global.IsTeamsClient
      value: =StartsWith(Lower(System.Activity.ChannelId), "msteams")

    - kind: SendActivity
      id: showState
      activity: "Channel: {Global.ClientPlatform} | IsTeams: {Global.IsTeamsClient}"

    - kind: ConditionGroup
      id: gate
      conditions:
        - id: blockOnTeams
          condition: =Global.IsTeamsClient
          actions:
            - kind: SendActivity
              id: blocked
              activity: BLOCKED branch reached. This action is not available in Teams.

            - kind: EndDialog
              id: endTeams

      elseActions:
        - kind: SendActivity
          id: allowed
          activity: ALLOWED branch reached. Continuing in non-Teams channel.
```

The single change from a naive implementation: `StartsWith(Lower(System.Activity.ChannelId), "msteams")` instead of `Lower(...) = "msteams"`. That one line is the difference between catching every Teams surface and silently breaking inside M365 Copilot in Teams.

**Optional — surface the channel to the orchestrator** (in `settings.mcs.yml`):

```yaml
instructions: |
  ## Surface Context
  The user is interacting via channel: {Global.ClientPlatform}
  When the channel starts with "msteams", prefer Teams-friendly Adaptive Cards over external hyperlinks.
```

For this to work, declare `ClientPlatform` as a global variable with `aIVisibility: UseInAIContext`.

## Known Channel IDs

| ChannelId (lowercased) | Surface |
|---|---|
| `msteams` | Microsoft Teams (standalone agent) |
| `msteams:copilot` | Agent consumed inside M365 Copilot in Teams |
| `m365extensions` | M365 Copilot extension surface |
| `webchat` | Embedded web chat widget |
| `webchat:sharepoint` | Agent consumed inside SharePoint |
| `directline` | Direct Line REST/WebSocket clients |
| `directlinespeech` | Voice / speech clients |
| `outlook` | Outlook channel |
| `omnichannel` | Dynamics 365 Omnichannel handoff |
| `slack`, `telegram`, `facebook`, `skype`, `sms`, `email`, `telephony` | Third-party / Azure Bot Service channels |

When in doubt, send `System.Activity.ChannelId` back to yourself via `SendActivity` during development to confirm the exact value the surface returns. The `dump activity` trigger above is exactly this debug affordance.

## Pitfalls

- **Compound channel IDs.** `ChannelId` may include a sub-channel separator (`:`). Always use `StartsWith` for base-channel checks, not `=`. The Microsoft Agents SDK docs explicitly list `msteams:Copilot` and `webchat:Sharepoint` as valid values.
- **Case sensitivity.** `ChannelId` casing isn't guaranteed across surfaces. Always `Lower()` before comparing.
- **Test pane is not a real channel.** The Copilot Studio test pane reports its own channel value, which won't match production. Validate channel behavior in the actual target channel before shipping.
- **`aIVisibility: UseInAIContext` is required** on the global variable if you want the orchestrator to reason about it in instructions. Without it, the variable exists but the orchestrator ignores it.
- **Inline vs. one-shot init.** The example above reads the channel inside the consuming topic. If many topics need to branch on channel, lift the detection into a one-shot `OnActivity` init topic (same shape as `jit-user-context`) so it isn't repeated.
- **Channel detection is not authorization.** Don't use channel as a security boundary — a determined caller can spoof activities via Direct Line. Gate sensitive operations on the authenticated user identity, not the channel.
