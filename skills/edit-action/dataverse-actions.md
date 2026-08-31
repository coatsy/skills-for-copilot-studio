# Microsoft Dataverse Connector Actions - Reference

Read this file whenever editing a Microsoft Dataverse connector action, especially the **List rows** operation (`ListRecordsWithOrganization`). Dataverse list actions have dynamic row schemas, and the orchestrator needs exact logical names to build filters and select the correct returned fields.

## Prefer List Rows for Direct Retrieval

Use a Dataverse **List rows** connector action when the agent only needs to retrieve existing rows and report their stored values. Do not add a Power Automate flow solely to wrap the same read unless the request also needs transformation, multi-step business logic, side effects, or a stable custom response contract.

The connector action must still be created and authenticated in Copilot Studio. After it is saved, pull the generated action and preserve its opaque connection reference, operation ID, and dynamic output schema.

## List Rows Input Recommendations

| Parameter | Recommended input kind | Why |
|-----------|------------------------|-----|
| `organization` | `ManualTaskInput` | The Dataverse environment URL is fixed at design time. |
| `entityName` | `ManualTaskInput` | Use the table's entity set logical name, not its display label. |
| `"'$filter'"` | `AutomaticTaskInput` when based on the conversation; otherwise `ManualTaskInput` | Dynamic filters must use exact Dataverse column logical names and valid OData syntax. |

Example action header for a lookup by reference number:

```yaml
kind: TaskDialog
inputs:
  - kind: ManualTaskInput
    propertyName: organization
    value: https://contoso.crm.dynamics.com

  - kind: ManualTaskInput
    propertyName: entityName
    value: cr123_requests

  - kind: AutomaticTaskInput
    propertyName: "'$filter'"
    description: Build an OData filter using cr123_reference, for example cr123_reference eq 'REF-12345'.
    entity: StringPrebuiltEntity
    shouldPromptUser: true

modelDisplayName: Look up a request
modelDescription: "Use when a user asks for an existing request by reference number. Filter cr123_requests by cr123_reference. Return cr123_reference, cr123_requesteremail, and cr123_requeststatus. Treat cr123_requeststatus as the current status; do not use cr123_deliverypreference as status."

action:
  kind: InvokeConnectorTaskAction
  connectionReference: <preserve-the-pulled-connection-reference>
  connectionProperties:
    mode: Maker
  operationId: ListRecordsWithOrganization

outputMode: All
```

`Maker` uses the maker's shared connection. `Invoker` requires each user to authenticate. Confirm the intended security model instead of changing the pulled mode casually.

## Ground Dynamic Outputs in Logical Names

List rows returns a dynamic table schema. Similar display labels or legacy columns can cause the orchestrator to report the wrong value even when the correct row was retrieved.

1. Verify each required column's logical name in Dataverse metadata or the pulled `dynamicOutputSchema`.
2. Name the exact filter and return columns in `modelDescription` and relevant input descriptions.
3. Explicitly exclude a similarly named legacy column when confusing it would produce a plausible but incorrect answer.
4. Tell the orchestrator to report only values returned by the connector. Do not infer stages, next steps, or policy from fields that are not present.

Display names are presentation only. Filters and output guidance must use logical names such as `cr123_requeststatus`, not labels such as `Request Status`.

## Keep Read and Write Contracts Aligned

Changing a lookup action or cleaning existing rows does not change how future rows are created. If another connector action or Power Automate flow writes the table, inspect that write path separately and verify it populates the same logical column the lookup reports.

For status scenarios, check all three layers:

1. The create/update path writes the intended status column and value.
2. Existing rows contain the intended value after any data cleanup.
3. The List rows action reports that same column in `modelDescription` and at runtime.

Publishing an agent does not publish, activate, or repair an independent Power Automate cloud flow. Likewise, an active flow definition can change independently without another agent publish. Verify both resources when they participate in one user journey.

## Runtime Verification

Schema validation cannot prove that a dynamic filter or output field is correct. Test the action in Copilot Studio with a known row and verify all of the following:

1. The orchestrator selects the expected connector action.
2. The action trace shows the intended OData filter and exact logical column name.
3. The returned identifier and status match the source row in Dataverse.
4. A missing identifier produces a not-found response rather than a fabricated record.
5. If the table has similarly named fields, the response uses the field named in `modelDescription`.
6. If the scenario creates records, the writer maps future rows to the same logical field used by the lookup.

## Pitfalls

- Do not use a table display name for `entityName`; preserve the entity set name from the generated action.
- Do not reconstruct `connectionReference` or `dynamicOutputSchema`; preserve the portal-generated values.
- Do not reuse a dynamic output schema from another table; save and pull the action again after changing the selected table.
- Do not assume a successful connector call means the response used the correct returned column.
- Do not describe a field as status merely because its stored value looks status-like.
- Do not treat a published agent timestamp as proof that an independently managed connector connection or Power Automate flow is healthy; verify each runtime dependency separately.
