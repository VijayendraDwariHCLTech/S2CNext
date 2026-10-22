# Autonomous S2C Platform V5 — Audit Notes

Source artifact: https://claude.ai/artifact/7DDSHpJL1D1D12suxorUtN?sk=Hp229uX26_remumV3VDL8A

## Scope and access

- Opened the shared Claude artifact and entered the Admins demo profile.
- The embedded app is titled **Autonomous S2C Platform V5**.
- Direct frame navigation triggered Cloudflare verification, so inspection continued through the supported shared artifact view and source HTML capture.
- V5 source HTML capture: `/home/ubuntu/browser_html/claude_ai_7DDSHpJL1D1D12suxorUtN_1790574196687.html`.
- V5 source inventory: `/tmp/s2c-v5-inventory.json`.

## V5 navigation and source inventory

V5 has the familiar core navigation plus material additions:

- RFx Command Center
- Demand Intake
- Supplier Discovery
- RFx Creation and Publish
- Quick RFx Creation (AI)
- RFx Response Evaluation Analysis
- **Dynamic Resourcing Engine** (new)
- Negotiation Insights
- Award Recommendation & Contract Handover
- Q&A, Approval Dashboard, FAQ & Knowledge Center, RFP Workflow Status
- New Contract Rollout
- **Contracting Cockpit (C1–C8)** in source route/component model (not visible in the observed Admin sidebar, likely route/access visibility issue)
- NDA Rollout, Contract Renewal, Contract Amendment, Obligation Management, Contract Termination
- Supplier Scorecards & QBR, HITL Gates & Routing
- Administration: User Management, Roles & Permissions, Workflow Configuration, Agent Processing, Template Management, Audit Logs, Settings
- Table Explorer, Domain Map & Coverage

V5 source component functions include:

- `RequestsTableV5`, `RequestDetailV5`, `IntakeFormWizard`, `IntakeChatbot`
- `RfxOverviewV5`, `ContractingCockpit`, `ClmLifecycleFrame`
- `DiscoveryCockpit`, `ControlTower`, `ValueRealization`, `DynamicResourcing`
- `QuestionnaireBuilder`, `WeightConfigEditor`, `RfpCreation`, `RfpInvitationEmail`, `RfpVendorResponse`
- `QuestionnaireAnalysis`, `BenchmarkAnalysis`, `CommercialComparison`, `FinalEvaluationTemplate`, `EvaluationDashboard`
- `Negotiation`, `Award`, `WorkflowConfig`, `AutonomousRun`

## Observed V5 behavior by page

### Home / My Workspace

- Admin workspace includes queue cards for intake approvals, RFx draft review, bid exceptions, confirmation ranking, and negotiation envelopes.
- RFx pipeline shows more populated simulated RFx records than current app.
- Quick actions include Command Center, Approval Dashboard, Supplier Scorecards, Roles & Permissions, and RFx workflow tracking.

### Demand Intake

- Listing supports Grouped/Table layouts, Refresh, Export, filter visibility toggle, search, category, priority, business-unit, and value filters.
- Status tabs: All (13), In Process (3), Submitted (4), Returned (1), RFP Generated (5).
- Request rows include title, category, requester, business unit, value, priority, and dates.
- New Sourcing Request offers two paths: **Fill the form myself** and **Let AI guide me**.
- AI path has sections: Requestor Details from SAP, Business Need, Scope of Work, Specifications, Budget & Finance, Timeline, Supplier Info, Review & Submit; supports suggestion chips, Skip section, Change mode, and send control.
- Observed AI live call failure showed `Retry live AI`, which is a meaningful resilience behavior in the V5 prototype.
- Current project already has rich requirement summary, real database persistence, `IN_PROCESS`, and approval handoff; V5 adds the stronger list/detail UX and explicit manual-vs-AI intake selection.

### Supplier Discovery

- Two major modes: Ranked list & shortlist; Decision cockpit (A2 engine).
- Decision cockpit tabs observed: Ranking & radar, What-if scenarios, Disruption war-game, Negotiation portfolio, Executive recommendation.
- What-if scenarios include Balanced sourcing, Cost pressure, Resilience first, ESG mandate, Agent default, five weighting sliders, and scenario comparison table.
- Confirm Shortlist action present.
- Diversity required toggle present.

### RFx Creation and Publish

- Tabs: RFP Creation, Questionnaire, Invitation & Publish, Vendor Responses.
- RFP creation includes RFx links, draft preview, documents/attachments, intake summary link, pricing template, award memo, document removal, Add More Documents, draft records, and weight sliders.
- Questionnaire supports Save/Discard, Add Question, reorder up/down, delete, question title/description, priority, response type (TEXT/NUMERIC/YES_NO/CHOICE/FILE), and weights.
- Invitation & Publish supports read receipt, email opens, send-me-copy toggles, invitation draft editor, date, font/size, placeholder insertion, Save as Draft, Approve & Send Later, Approve & Send.
- Vendor Responses shows vendor rows with version, submission channel, timestamp, normalized confidence, and vendor response records.

### RFx Evaluation

- Tabs: 4A RFP Questionnaire Analysis, 4B Benchmark Analysis, 4C Commercial Comparison, 4D Final Evaluation, 4E Dashboard.
- Evaluation screen exposes linked `rfx_response_answers` and View evaluation record.
- Dashboard exposes `Go to Negotiation`.
- V5 adds a formal multi-stage evaluation model beyond the current simpler evaluation view.

### Negotiation Insights

- Linked table shortcuts: negotiation_cases, negotiation_rounds, negotiation_offers, negotiation_concessions.
- Modes: Rounds & offers, Strategy & tactics, Concessions, BATNA & benchmarks, Messages & actions.
- Case cards show supplier, outcome, rounds, current/target prices.
- Source interactions include Approve high-risk tactic (HITL), Approve envelope, Simulate supplier response, Open round, Use current offer, Use target, Finalise & record decision, Continue to Award.

### Award Recommendation & Contract Handover

- Shows recommended supplier, contract value, contract type, risk level, routing rule.
- Award recommendation card includes shortlisting, agent score, business/procurement/final approval state, and validated override note.
- Approval chain includes Business Owner, Finance Controller, Legal Counsel, and CPO with approval statuses.
- Contract handover card links contract intake and opens New Contract Rollout.

### Command Center / Control Tower / Value Realization

- Command Center has Executive view, Operational view, Control Tower, Value Realization.
- Operational view: RFx KPIs, status filters, table, pagination, search, time window, Export, New RFx.
- Control Tower observed spend leakage detected ($483K), live alerts, sourcing opportunities, contracts at high risk, invoice-level leakage categories, and ranked opportunities.
- Value Realization observed expected savings, realized savings to date, invoiced vs baseline, savings leakage, expected vs realized monthly chart, value chain (RFx → contract → invoice → payment → savings), and realization-by-award table.

### New Contract Rollout

- Contract selector and links to contract_intake_requests, contract_risk_assessment, contract_documents, contract_approvals.
- Stage progress: C1 Intake validated, C2 Risk assessed, C3 Draft generated, C4 Approvals, C5 Executed.
- Contract facts, risk assessment, approval chain, award facts handed off, contract documents, and Approve action.
- V5 describes four contract tables as core and C5–C9 as downstream CLM execution.

### NDA Rollout / CLM workflow navigator

- NDA Rollout observed with N1 Request/Intake, N2 Draft, N3 Supplier review, N4 Signature, N5 Filed.
- NDA register contains NDA-2026-014, NDA-2026-015, NDA-2026-011, supplier links, purpose, type, status, requested by/at, expiry date.
- Selected NDA panel supports Advance to N4 Signature / Proceed to Drafting.
- CLM screen navigator exposes 10 screen definitions: N1 NDA Intake, N2 NDA Draft, R1 Renewal Intake, R2 Renewal Assessment, T1 Termination Request, T2 Termination Impact, A1 Amendment Request, A2 Amendment Impact, O1 Obligation Extract, O2 Compliance Monitoring.
- AI Agents Registry button identifies a broader A1–A17 agent library.

### Renewal / Amendment / Obligation / Termination

- Source and CLM navigator confirm dedicated screen families and workflow steps for all four lifecycle areas.
- These are not represented as real tables in the current project’s 59-table governed S2C schema and should be treated as a schema-extension workstream, not a UI-only port.

## Important V5 interaction inventory

Source-level interaction labels include:

- Submit intake for approval; save draft; autonomous run; continue draft; Open RFx; approve/return; convert to RFx.
- Supplier Confirm Shortlist; scenario weighting and Reset; Executive recommendation.
- Questionnaire Save, Add Question, delete/reorder, Reset defaults.
- Invitation Save as Draft, Approve & Send Later, Approve & Send.
- Evaluation stage tabs and Go to Negotiation.
- Negotiation approve envelope, simulate supplier response, open round, use current/target, finalise decision, approve high-risk tactic.
- Award Generate award recommendation, approve as role, open New Contract Rollout.
- Workflow Config add/edit/toggle/duplicate/delete workflow, add step, save workflow.
- Autonomous Run Run next stage / Pause / Run to contract.

## Baseline current project

Current project: `/home/ubuntu/autonomous-s2c-platform-clone`
Baseline checkpoint: `81fe4fdc`.
Current governed database: 59 MySQL/TiDB tables plus app-owned `platform_settings`.
Current project already has real snapshot/query/mutation services, real table explorer, rich intake summary/approval handoff, Foundry/built-in/guided provider mode, and a subset of the core sourcing pages.

## Exact schema comparison

The V5 source schema contains **79 tables**. The current governed project contains **59 tables**. V5-only tables are:

`discovery_runs`, `invoices`, `market_signals`, `negotiation_actions`, `negotiation_batna_scenarios`, `negotiation_case_tactics`, `negotiation_cases`, `negotiation_concessions`, `negotiation_decisions`, `negotiation_market_benchmarks`, `negotiation_message_events`, `negotiation_offer_lines`, `negotiation_offers`, `negotiation_playbook_tactics`, `negotiation_rounds`, `negotiation_strategy_assessments`, `resourcing_recommendations`, `rfx_weight_categories`, `sap_user_master`, `sourcing_cycle_history`, and `supplier_diversity`.

The current project has `enterprise_user_master` where V5 uses `sap_user_master`; this is a compatibility decision to resolve explicitly, not an accidental rename.

This means V5 cannot be upgraded by copying screens alone. The minimum data-model work is a governed migration from 59 to 79 tables, with special care for the 13-table negotiation model, resourcing recommendations, market signals, invoice/value realization, supplier diversity, RFx weight categories, sourcing-cycle history, and SAP-style user master.
