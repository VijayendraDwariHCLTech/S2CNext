# Autonomous S2C Operations — Clone Brief

This project is a **local, white-labelled clone** of the inspected Autonomous S2C Platform v3 artifact. It contains no dependency on the Claude artifact at runtime. The procurement data path now uses a real MySQL/TiDB database through server-side tRPC procedures.

## Included application behavior

The clone retains the role-profile sign-in journey, role-aware navigation, command center, S1–S12 workflow tracking, sourcing workspaces, approvals, supplier performance views, administration modules, Table Explorer, Domain Map, downloadable table data, seeded RFx workflows, and a resettable demo database. AI-labelled questionnaire and RFP drafting paths retain deterministic offline demo drafts, while the Demand Intake assistant uses the live agent integration described below.

## Schema contract

The current schema surface contains **59 tables and 544 columns**. This comprises the original **52-table / 467-column core** plus seven operational extensions: platform roles, role-module access, enterprise user master, intake approvals, approval workflows, workflow steps, and vendor master. This corrects stale “52 tables” labels from the inspected artifact.

| Category | Tables | Notes |
|---|---:|---|
| Base S2C schema | 52 | Intake, supplier, RFx, bids, evaluation, negotiation, award, contract, performance and governance domains |
| Identity and approval extensions | 4 | `platform_roles`, `role_module_access`, `enterprise_user_master`, `intake_approvals` |
| Vendor extension | 1 | `vendor_master` |
| Workflow extensions | 2 | `approval_workflows`, `workflow_steps` |
| **Live clone total** | **59** | **All tables are visible in Table Explorer** |

The authoritative contract is generated into `drizzle/s2cSchema.ts`, `drizzle/migrations/0001_s2c_governed_schema.sql`, `generated/s2c_schema_contract.json`, and `shared/s2cSchemaContract.ts`. Existing table names and columns are preserved. Option B constraints add primary keys, composite keys where required by the data model, indexes, explicit enum domains, compatible nullability, and selected foreign-key relationships. Legacy SAP-style date/user fields are widened only where the inspected demo seed contains values longer than the stale source width.

## Real database architecture

The browser no longer reads or writes the procurement dataset through browser storage. It loads all 59 tables through `s2c.snapshot`, displays live row metrics through `s2c.metrics`, persists table diffs through transactional `s2c.applyChanges`, and uses `s2c.resetDemo` to reload the deterministic demo seed. The server-side database service is in `server/s2cDatabase.ts`; the seeded rows are generated into `server/s2cDemoSeed.ts`. The verified database contains **59 tables and 4,524 rows**, including **512 suppliers**, **6 intake requests**, and **5 RFx events**.

## Foundry-backed Demand Intake assistant

The Demand Intake chat now routes through a server-side Foundry adapter in `server/foundry-agent.ts`. It validates the configured application credentials against the HCL Volt MX Foundry anonymous-login endpoint, then invokes the archive’s published AI-agent service using its verified form-data contract, polls `getConversation_ReturnLastAction`, preserves the conversation ID across chat turns, and returns a normalized reply through the existing `intake.chat` tRPC procedure. If the upstream agent returns a full HTML request-details document, the browser receives concise text rather than raw HTML, CSS, or page markup. The browser never receives the Foundry app key, secret, or any claims token.

The platform does **not** modify the UnO agent prompt or configuration. Instead, `server/intake-enrichment.ts` operates after the Foundry response: it sanitizes HTML, uses a separate server-side structured-output call to extract only fields allowed by the active intake section, normalizes dates and numeric values, validates intent, and fills deterministic safety-net values when enrichment is unavailable. Local suggestion generation guarantees that the first five Business Need suggestions include both product/goods and service paths, and applies the same rule to the built-in LLM fallback. This preserves UnO’s plain-message contract while making the S2C data contract richer and safer.

The archive-provided defaults are the Foundry auth host `100000306.auth.hclvoltmx.net`, service host `hclsw-solutions.hclvoltmx.net`, agent ID `9b5c3263-8a22-4df3-8db4-e75f804e2853`, invoke service `UnO_Solutions/Invoke_AIAgent`, and conversation service `UnO_Solutions/getConversation_ReturnLastAction`. Configure the server-only variables `FOUNDRY_APP_KEY` and `FOUNDRY_APP_SECRET` in the WebDev project environment. Optional overrides are `FOUNDRY_AUTH_HOST`, `FOUNDRY_SERVICE_HOST`, `FOUNDRY_AGENT_ID`, `FOUNDRY_INVOKE_URL`, `FOUNDRY_CONVERSATION_URL`, `FOUNDRY_POLL_ATTEMPTS`, `FOUNDRY_POLL_INTERVAL_MS`, and `FOUNDRY_USE_CLAIMS_TOKEN`. The final option remains disabled by default because the supplied agent hook successfully invokes the published services without a claims-token header; enable it only if a Foundry tenant specifically requires that header.

If Foundry credentials are absent or a Foundry call fails, the route falls back to the existing built-in LLM contract. If that service is also unavailable, the existing guided offline mode remains available; the UI does not pretend that an external agent answered.

## Deliberate white-labelling

The clone is branded as **Autonomous S2C Operations**. Direct references to the named administrator and selected vendor brands seen in the artifact have been replaced with generic equivalents. The UI data remains simulated demonstration data; it must not be treated as a production procurement source of truth.

## Known boundary

Profile sign-in remains a demo persona switch rather than production authentication; the database procedures are currently public to support this demo flow. No supplier messages, approval actions, or contracts are sent externally. The next production-hardening step is to bind each database mutation to Manus OAuth identity, platform role permissions, audit events, and server-side approval gates.
