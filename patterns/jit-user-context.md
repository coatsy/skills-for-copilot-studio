---
name: JIT User Context
description: Load the current user's M365 profile (country, department) into global variables on first message for personalized, location-aware answers.
challenge: The agent cannot personalize answers by country, department, or role without asking the user — leading to generic responses or unnecessary questions.
status: proven
tags: [personalization, M365, user-profile, country, department, initialization, JIT, OnActivity, connector]
---

## Pattern

Loads the current user's Microsoft 365 profile (country, department, display name, etc.) into global variables the first time each conversation receives a user message. The orchestrator uses these variables to personalize answers — for example, returning the WFH policy for the user's specific country without asking them to specify it.

```
OnActivity topic (type: Message)              ← fires on first user message
  condition: =IsBlank(Global.UserCountry)     ← JIT: only runs if not loaded yet
        ↓
InvokeConnectorAction                         ← calls M365 Users "Get my profile"
  connectionReference: shared_office365users
        ↓
SetVariable → Global.UserCountry              ← extracted from profile response
        ↓
Agent instructions reference {Global.UserCountry} ← orchestrator uses for routing
```

**Why `OnActivity (type: Message)`:** `OnConversationStart` does not fire in M365 Copilot or other channel-embedded surfaces. Deferring until the first message also avoids wasted connector calls for sessions that never produce a message.

## When to Use

- The agent needs to provide country-aware, department-aware, or role-aware answers
- Users frequently ask questions whose answers vary by location (WFH policy, holidays, local regulations)
- You want to avoid asking users for information already available in their M365 profile
- The agent has authentication configured (the M365 Users connector uses the signed-in user's identity)

## YAML Example

**Provisioning topic** (`conversation-init.topic.mcs.yml`):

```yaml
kind: AdaptiveDialog
modelDescription: null
beginDialog:
  kind: OnActivity
  id: main
  type: Message
  condition: =IsBlank(Global.UserCountry)
  actions:
    - kind: InvokeConnectorAction
      id: getProfile_abc123
      connectionReference: shared_office365users
      connectionProperties:
        mode: Invoker
      operationId: UserGet_V2
      output:
        kind: SingleVariableOutputBinding
        variable: init:Topic.M365Profile
    - kind: SetVariable
      id: setCountry_def456
      variable: Global.UserCountry
      value: =If(IsBlank(Topic.M365Profile.country), "Unknown", Topic.M365Profile.country)
```

**Global variable** (`UserCountry.mcs.yml`):

```yaml
name: UserCountry
aIVisibility: UseInAIContext
scope: Conversation
description: The user's country from their M365 profile, loaded JIT at conversation start.
schemaName: <agent-schemaName>.globalvariable.UserCountry
kind: GlobalVariableComponent
defaultValue: DEFAULT
```

**Agent instructions** (in `settings.mcs.yml`):

```yaml
instructions: |
  ## User Context
  The current user's country is {Global.UserCountry}.
  When the user asks a location-dependent question, use this country to search the correct
  knowledge sources. Do not ask the user for their country — it is already known.
  If the country is "Unknown", answer with the general policy and note it may vary by country.
```

## Pitfalls

- **M365 Users connector must be pre-configured.** The connection must be set up in Copilot Studio UI (Settings → Connections) before the YAML works.
- **Authentication required.** The connector uses the signed-in user's identity. If the agent doesn't have auth configured, the call will fail silently.
- **Azure AD fields may be empty.** Always use a fallback (`If(IsBlank(...), "Unknown", ...)`) — the `country` field is only populated if the org maintains it in Azure AD.
- **Use `aIVisibility: UseInAIContext`** on the global variable so the orchestrator can reason about it. Without this, the variable exists but the orchestrator ignores it.
- **Combinable with JIT Glossary.** If using both patterns, merge them into a single `OnActivity` topic rather than creating two separate ones.
