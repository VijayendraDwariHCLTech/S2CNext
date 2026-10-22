# Autonomous S2C Platform V5 — Featurewise Difference Analysis

**Source reviewed:** [Autonomous S2C Platform V5](https://claude.ai/artifact/7DDSHpJL1D1D12suxorUtN?sk=Hp229uX26_remumV3VDL8A)  
**Current project:** `/home/ubuntu/autonomous-s2c-platform-clone`  
**Baseline checkpoint before comparison:** `81fe4fdc`  
**Audit date:** 28 September 2026

## Executive conclusion

V5 is not merely a visual refresh. It introduces a broader operating model across **autonomous sourcing, negotiation, value realization, dynamic resourcing, SAP-style identity, and contract lifecycle management**. The most important discovery is the data-model gap: the V5 artifact defines **79 simulated tables**, while the current project has **59 governed MySQL/TiDB tables**. The current project is therefore stronger on persistence integrity, but V5 is richer in workflow depth and downstream operating scenarios.

The recommended upgrade approach is **database-first and contract-preserving**:

1. Extend the governed database from 59 to 79 tables without renaming existing current tables.
2. Add typed server services and tRPC procedures for the new V5 domains.
3. Add the missing workflow state transitions and HITL actions.
4. Port the V5 views incrementally, starting with Dynamic Resourcing, richer Negotiation, and Value Realization.
5. Replace current administrative placeholders with real data-backed screens.

> Do not copy V5’s browser-local seed or simulated persistence into the production project. Use its schema, workflows, field definitions, seeded examples, and UI behavior as the upgrade contract, while retaining the current project’s real MySQL/TiDB boundary.

## What was inspected

The V5 artifact was opened through the shared artifact URL and the Admins profile. The following areas were inspected live where available: Home, Demand Intake and its AI/manual entry paths, Supplier Discovery and What-if Scenarios, RFx Creation and Publish tabs, Questionnaire, Invitation & Publish, Vendor Responses, Evaluation tabs, Negotiation modes, Award handoff, Command Center views, Value Realization, New Contract Rollout, NDA/CLM navigator, Q&A, Approval Dashboard, FAQ & Knowledge Center, RFP Workflow Status, Quick RFx Creation, and source-level routes/components/handlers for screens not exposed in the observed Admin sidebar.

The V5 source was also parsed for navigation, component functions, button labels, access rules, and exact schema definitions. Detailed observation notes are in [V5 audit notes](./V5_AUDIT_NOTES.md), and the exact V5-only column definitions are in [V5-only schema](./V5_ONLY_SCHEMA.md).

## Featurewise difference table

| Feature area | V5 capability observed or defined | Current real-database project | Difference / upgrade implication | Priority |
|---|---|---|---|---|
| Platform foundation | V5 uses a rich simulated 79-table schema, browser seed/reset, role/access model, and demo workflows. | Current project uses real MySQL/TiDB, tRPC snapshot/mutation APIs, reset seed, and 59 governed tables. | Keep the current persistence boundary. Port V5’s additional schema and workflows into real APIs; never replace real DB calls with the V5 browser seed. | P0 |
| Home / My Workspace | Queue-oriented workspace with intake approvals, RFx draft reviews, bid exceptions, ranking confirmations, negotiation envelopes, and a broader RFx portfolio. | Current Home already has queue cards, RFx pipeline, approval links, and real DB state. | Current foundation is sound; V5 needs richer queue categories, deeper links, and larger portfolio seed/data coverage. | P1 |
| Demand Intake | Grouped/Table listing, five status tabs, search and four filters, manual form path, AI-guided path, section progress, suggestion chips, review/submit flow, and richer V5 request-detail experience. | Current project has real DB persistence, rich requirement summary, missing-field display, `IN_PROCESS`, approval handoff, Foundry/built-in/guided modes, and a Demand Intake listing. | Merge V5’s stronger list/detail interaction and explicit manual-vs-AI start screen into the existing real DB flow. Preserve current quota-safe fallback and normalized extraction. | P0 |
| Supplier Discovery | Ranked shortlist plus A2 Decision Cockpit; radar, what-if scenarios, disruption war-game, negotiation portfolio, executive recommendation; five weight sliders; diversity requirement; Confirm Shortlist. | Current Supplier Discovery has core shortlist/ranking flow and real database mutation path, but not the full cockpit/scenario surface. | Add scenario entities, resourcing/market inputs, scenario persistence, and HITL confirmation APIs before porting the cockpit. | P1 |
| RFx Creation & Publish | Four tabs: RFP Creation, Questionnaire, Invitation & Publish, Vendor Responses. Includes documents, draft versions, intake links, questionnaire reorder/delete, response types, weights, email controls, scheduling, and publish actions. | Current page has the core RFx creation/publish experience and real tables for requirements, questions, responses, documents, drafts, and weights. | V5 adds deeper authoring controls and a more complete vendor-response lifecycle. Existing table names should remain; extend APIs for versioning, publishing, email settings, and response confidence. | P0 |
| Quick RFx Creation (AI) | Two modes: Questionnaire from Prompt and Quick Bid RFP Document. Supports uploaded TXT/MD/CSV/JSON context, category chips, Generate Questions, and Generate RFP. | Current project exposes Quick RFx Creation and live/provider-routed AI infrastructure, but needs verification against V5’s two-mode UX and document-context handling. | Port the mode-specific fields and output persistence; route AI calls through the existing server-side provider policy, not browser-side Anthropic calls. | P1 |
| RFx Evaluation | 4A Questionnaire Analysis, 4B Benchmark Analysis, 4C Commercial Comparison, 4D Final Evaluation, 4E Dashboard, then Go to Negotiation. | Current Evaluation page exists with real database data and evaluation flow, but is less segmented than V5. | Add typed stage outputs, benchmark/commercial comparison records, final evaluation template, and explicit transition to negotiation. | P1 |
| Dynamic Resourcing Engine | Source route/component exists with `dynamic-resourcing`, `resourcing_recommendations`, market signals, and role-based approval access. | Current project has no Dynamic Resourcing navigation item or component. | Net-new feature. Add schema, decision logic, recommendation review, approval, and links from evaluation/supplier discovery. | P0 |
| Negotiation Insights | Five modes: Rounds & Offers, Strategy & Tactics, Concessions, BATNA & Benchmarks, Messages & Actions. Supports rounds, offer lines, tactics, market benchmarks, message events, simulated responses, HITL tactic approval, and finalisation. | Current project has Negotiation page and real `negotiation_insights` / `negotiation_finalization`, but not the V5 negotiation domain model. | This is the largest sourcing-domain gap. Add the V5 negotiation tables and transactional state machine before porting the richer UI. | P0 |
| Award Recommendation & Contract Handover | Recommendation includes supplier, price/value, risk, routing rule, agent score, override note, multi-role approval chain, and contract handoff. | Current project has award recommendation and real contract handoff/approval mutations. | Enhance role-specific approval evidence, recommendation rationale, override persistence, and handoff detail while retaining existing contract table names. | P1 |
| Q&A | Supplier Q&A workspace with questions, A8 draft answers, public/private classification, supplier simulation, Submit question, Approve & publish, and answered/awaiting stats. | Current Q&A component exists and is real DB-backed, but V5’s answer-drafting and publish controls need alignment. | Add explicit draft-answer lifecycle and publication visibility fields/actions if current table contract does not already capture them. | P1 |
| Approval Dashboard | Queue of human-in-the-loop items across intake validation, shortlist, RFx draft/publish, bid exceptions, evaluation, negotiation, award, contract risk/approval, scorecards, and QBR; My Queue/All; Open and Approve. | Current approval dashboard handles real approval records and the intake-to-approval handoff. | Expand queue aggregation to all V5 gates and connect each action to durable audit/status transitions. | P0 |
| RFP Workflow Status | S1–S12 visual lifecycle from intake through shortlist, publish, Q&A, normalized bids, evaluation, negotiation, award, and contract handoff; linked documents and findings. | Current workflow status page exists and reads real RFx state. | Align stage definitions and persisted activity history to V5’s S1–S12 model; add partial/active states and document findings. | P1 |
| Autonomous Run | Source component and handlers support Run next stage, Pause, Run to contract, and executive/operational views. | Current project does not expose an Autonomous Run page or navigation route. | Net-new orchestration feature. Implement only after workflow transitions and HITL gates are durable; read automation guidance before making it resident/background. | P1 |
| Command Center | Executive, Operational, Control Tower, and Value Realization views. Control Tower shows leakage, alerts, opportunities, contract risk, and spend categories. Value Realization follows RFx → contract → invoice → payment → savings. | Current Command Center exists and is real DB-backed, but does not have the full V5 Control Tower/Value Realization data model. | Add invoices, market signals, sourcing-cycle history, and realization calculations before presenting the V5 analytics. | P0 |
| Contracting Cockpit C1–C8 | Source route/component exists for a multi-stage contract cockpit with document extraction, risk/compliance analysis, draft preparation, clause library, risk assessment, EU regulatory playbook, and HITL approval. | Current project has New Contract Rollout and generic CLM register pages, but no Contracting Cockpit route/component. | Net-new CLM workstream. Requires new contract-document, clause, risk, regulatory, and approval data contracts; do not implement as static cards only. | P0 |
| New Contract Rollout | Contract intake, risk assessment, documents, approvals, award facts, and progression toward execution. | Current project has this page and real contract intake/risk/document/approval tables. | Strongest CLM overlap. Port V5 stage copy and evidence panels while preserving current real-table writes. | P1 |
| NDA / Renewal / Amendment / Obligation / Termination | V5 has a CLM navigator with 10 screens: N1/N2, R1/R2, T1/T2, A1/A2, O1/O2; NDA register and next-step controls; A1–A17 agent registry. | Current project uses a generic `ClmRegister` for these page types, but the current 59-table contract lacks dedicated V5 lifecycle tables. | Requires domain-specific tables and workflows. The generic page can be retained as a shell while each lifecycle family becomes a real feature increment. | P0 |
| Supplier Performance & QBR | Supplier scorecards, QBRs, improvement plans, governance actions, and approval gates. | Current project has Supplier Performance and Governance pages plus related scorecard/KPI/QBR tables. | Good database foundation; add V5’s richer scorecard/QBR controls, action plans, and HITL queue integration. | P1 |
| FAQ & Knowledge Center | Agent directory A1–A8 plus A9–A17 CLM/orchestration agents; personas and compliance references; search field. | Current project has FAQ/Knowledge Center page and agent-related tables but not the complete V5 directory experience. | Add searchable agent/persona cards and table-linked source references; keep content read-only until a knowledge-governance model is defined. | P2 |
| Administration | V5 has User Management, Roles & Permissions, Workflow Configuration, Agent Processing, Template Management, Audit Logs, Settings. | Current project has real Roles & Permissions, Workflow Configuration, and provider Settings. User Management, Agent Processing, Template Management, and Audit Logs are currently placeholder/Coming Soon pages. | Replace placeholders with real database-backed views, beginning with audit log and user/role administration. | P0 |
| Database Explorer / Domain Map | V5 Table Explorer supports table links and JSON/SQL exports; Domain Map shows coverage and relationships. | Current project has a real Table Explorer and Domain Map backed by the 59-table MySQL/TiDB snapshot. | Preserve current real explorer; extend it to 79 tables and add V5-only relationships/exports after migrations. | P1 |
| AI and agent policy | V5 source calls Claude capabilities directly in the artifact and displays Retry live AI when unavailable. | Current project routes Foundry, built-in LLM, and guided fallback through server-side policy with an admin toggle and quota-safe fallback. | Current architecture is safer and more production-appropriate. Port V5 prompt/UX behavior through the existing server boundary; do not add browser-side provider secrets. | P0 |

## Exact database reconciliation

### Table counts

| Contract | Table count | Persistence | Assessment |
|---|---:|---|---|
| V5 artifact | 79 | Browser-local simulated seed/reset | Richer domain model, not production persistence |
| Current project | 59 + `platform_settings` | MySQL/TiDB through server-side tRPC | Real persistence and transaction path |
| Target after V5 upgrade | 79+ | MySQL/TiDB through typed APIs | Preserve all current names and add V5-only tables |

### V5-only tables to add

| Domain | V5-only tables | Why they matter |
|---|---|---|
| Dynamic resourcing / market | `discovery_runs`, `market_signals`, `resourcing_recommendations`, `supplier_diversity` | Scenario analysis, market intelligence, diversity-aware recommendations, and approval evidence |
| Negotiation | `negotiation_actions`, `negotiation_batna_scenarios`, `negotiation_case_tactics`, `negotiation_cases`, `negotiation_concessions`, `negotiation_decisions`, `negotiation_market_benchmarks`, `negotiation_message_events`, `negotiation_offer_lines`, `negotiation_offers`, `negotiation_playbook_tactics`, `negotiation_rounds`, `negotiation_strategy_assessments` | V5’s round/offer/tactic/BATNA/message/finalisation model |
| Value realization | `invoices` | Connect awarded value to invoiced value and savings leakage |
| RFx authoring | `rfx_weight_categories` | Category-level weighting beyond current weight configuration |
| Identity / audit | `sap_user_master` | SAP-style identity and organizational context used by V5 personas and requestors |
| Lifecycle history | `sourcing_cycle_history` | Durable S1–S12 stage/activity history |

The current project has `enterprise_user_master`, while V5 defines `sap_user_master`. The safe compatibility decision is to **retain `enterprise_user_master`** and either add `sap_user_master` as a view/compatibility table or explicitly map it through a server adapter; do not silently rename the existing current table.

## Workflow comparison

| Lifecycle | V5 state/action model | Current state | Upgrade decision |
|---|---|---|---|
| Intake → RFx | Manual or AI intake → review → approval → RFx | Real AI intake, summary, `IN_PROCESS`, approval handoff, real DB | Retain current engine; add V5 list/detail UX and richer workflow evidence |
| RFx → shortlist | Supplier ranking → scenarios → diversity → shortlist confirmation | Core discovery/shortlist exists | Add scenario and diversity persistence |
| RFx → award | Questionnaire → benchmark → commercial → final evaluation → negotiation → award | Core pages and real tables exist, with thinner stage model | Add stage-specific records and role actions |
| Award → contract | Award approval → contract intake → risk → document → approval | Real contract handoff and contract tables exist | Add V5 evidence panels and full cockpit |
| Contract lifecycle | NDA, renewal, amendment, obligation, termination screen families | Generic CLM register shell | Add domain tables and state transitions |
| Human-in-loop | Central queue across all agent stoppages | Intake/approval chain exists | Expand queue aggregation and audit persistence |
| Autonomous execution | Run next / pause / run to contract | Not exposed | Implement after workflow transition APIs are stable |

## Key findings and risks

### 1. V5 is richer than the current schema, not just richer than the current UI

The 20-table net increase is concentrated in negotiation, value realization, dynamic resourcing, SAP identity, and lifecycle history. Porting the screen first would create attractive but non-authoritative UI. The upgrade must start with the schema and service contracts.

### 2. V5’s Admin role visibility has a source-level inconsistency

The V5 source defines `dynamic-resourcing`, `contracting-cockpit`, and `autonomous-run` routes/components, but the `ADMIN` module list observed in source does not include those three modules. As a result, the Admin profile’s observed sidebar did not show Dynamic Resourcing or Contracting Cockpit. This should be resolved as an explicit role/access decision in the current project rather than copied as an accidental omission.

### 3. Current real-data architecture should be the system of record

The current project already has server-owned MySQL/TiDB access, typed tRPC procedures, real snapshot reads, transactional mutations, reset seed behavior, and an admin provider toggle. V5’s `window.storage`/browser seed approach is useful for prototype behavior but must not become the persistence layer.

### 4. AI behavior needs the current project’s server boundary

V5’s artifact-side AI helper can fall back to direct Anthropic API calls. The current project’s Foundry-first adapter, built-in model route, deterministic quota fallback, HTML sanitization, requester-first classification, and balanced product/service suggestions are safer. The V5 UX can be ported without weakening that boundary.

## Recommended upgrade sequence

| Phase | Deliverable | Exit criteria |
|---|---|---|
| 0. Contract lock | Freeze current 59-table names/columns and document the `enterprise_user_master` ↔ `sap_user_master` compatibility approach. | No current table/column rename; migration review complete. |
| 1. Schema extension | Add the 21 V5-only tables listed above, generated from a single contract, with seed rows for V5 scenarios. | MySQL/TiDB migration applies; row counts and foreign keys verified; current smoke tests remain green. |
| 2. Service/API layer | Add typed query/mutation procedures for resourcing, negotiation, invoices/value realization, lifecycle history, and SAP identity compatibility. | All new mutations are server-side and auditable; no browser-local authoritative writes. |
| 3. Sourcing depth | Port Dynamic Resourcing, negotiation modes, richer evaluation, and V5 Control Tower/Value Realization. | Each screen reads/writes real tables and transitions through HITL gates. |
| 4. CLM depth | Port Contracting Cockpit C1–C8 and domain-specific NDA/renewal/amendment/obligation/termination workflows. | Lifecycle screens have real records, status transitions, documents, risk findings, and approvals. |
| 5. Administration | Implement User Management, Agent Processing, Template Management, and Audit Logs; fix module access policy. | No Coming Soon placeholders for required admin capabilities; every mutation has audit evidence. |
| 6. UX convergence | Align layout, cards, tabs, labels, status counts, request details, and navigation with V5 while preserving current database/API contracts. | Browser walkthrough covers every reachable page and key workflow without console errors. |

## Decision required before implementation

The next upgrade should not begin by copying all V5 screens at once. The high-value decision is whether to approve the **79-table target contract** and the compatibility approach for `sap_user_master` versus the current `enterprise_user_master`. Once that is agreed, implementation can proceed in the phases above, starting with schema generation and real seed data.
