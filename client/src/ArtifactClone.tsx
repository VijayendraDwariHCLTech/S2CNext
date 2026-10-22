// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SCHEMA } from "./artifact/governedSchema.js";
import { trpc } from "./lib/trpc";
import { S2C_PRIMARY_KEYS } from "@shared/s2cSchemaContract";

const DEMO_PASSWORD = "Demo@1234";
const FLAGSHIP_RFX = "RFX-2026-0731-001";
const TODAY = new Date().toISOString().slice(0, 10);
// Enable the richer V5 sourcing, intake, cockpit, and CLM surfaces.
const IS_V4 = true;

function tableChanges(before, after) {
  return ALL_TABLES.flatMap((table) => {
    const pk = S2C_PRIMARY_KEYS[table] || [SCHEMA[table][0][0]];
    const signature = (row) => pk.map((key) => JSON.stringify(row?.[key])).join("|");
    const previous = new Map((before[table] || []).map((row) => [signature(row), row]));
    const current = new Map((after[table] || []).map((row) => [signature(row), row]));
    const upserts = (after[table] || []).filter((row) => { const old = previous.get(signature(row)); return !old || JSON.stringify(old) !== JSON.stringify(row); });
    const deletes = (before[table] || []).filter((row) => !current.has(signature(row)));
    return upserts.length || deletes.length ? [{ table, upserts, deletes }] : [];
  });
}

const DOMAINS = [
  { id: "intake", label: "Demand intake", agent: "A1", tables: ["intake_requests", "intake_scope_specs", "intake_strategy_governance", "intake_commercials_timelines", "intake_evaluation_weights", "intake_documents"] },
  { id: "supplier", label: "Supplier master", agent: "A2", tables: ["supplier", "supplier_classification", "supplier_esg_compliance", "supplier_external_enrichment", "supplier_risk_profile", "supplier_agent_memory", "supplier_services_profiles", "supplier_software_profiles", "supplier_product_profiles", "supplier_documents", "supplier_shortlisting"] },
  { id: "rfx", label: "RFx build & publish", agent: "A3 · A8", tables: ["rfx_events", "rfx_category", "rfx_requirements", "rfx_weight_configs", "rfx_draft_versions", "rfx_documents", "rfx_questions", "rfx_question_responses"] },
  { id: "bids", label: "Bid receipt & normalisation", agent: "A4", tables: ["bid_responses", "bid_line_items", "bid_exceptions", "bid_attachments", "rfx_response", "rfx_response_answers"] },
  { id: "eval", label: "Evaluation", agent: "A5", tables: ["agent_evaluations", "agent_assignment_evaluations", "rfx_assigned_approvers"] },
  { id: "nego", label: "Negotiation", agent: "A6", tables: ["negotiation_insights", "negotiation_finalization"] },
  { id: "tower", label: "Control tower & value realization (extension)", agent: "A15", tables: ["invoices", "market_signals", "resourcing_recommendations"], ext: true },
  { id: "negx", label: "Negotiation engine", agent: "A6", tables: ["negotiation_cases", "negotiation_rounds", "negotiation_offers", "negotiation_offer_lines", "negotiation_concessions", "negotiation_decisions", "negotiation_strategy_assessments", "negotiation_playbook_tactics", "negotiation_case_tactics", "negotiation_batna_scenarios", "negotiation_market_benchmarks", "negotiation_message_events", "negotiation_actions"] },
  { id: "award", label: "Award & handover", agent: "A7", tables: ["supplier_selection_decisions", "rfx_approvals"] },
  { id: "contract", label: "Contract", agent: "A9 · A12", tables: ["contract_intake_requests", "contract_risk_assessment", "contract_approvals", "contract_documents"] },
  { id: "spm", label: "Supplier performance", agent: "SPM", tables: ["supplier_kpi_metrics", "supplier_scorecards", "supplier_qbr_reviews", "supplier_improvement_plans"] },
  { id: "gov", label: "Governance", agent: "A15", tables: ["human_in_loop_controls", "agent_approval_routing_rules", "personas_master", "approver_availability_matrix", "compliance", "documents"] },
  { id: "iam", label: "Identity & access (extension)", agent: "SAP · RBAC", tables: ["enterprise_user_master", "platform_roles", "role_module_access", "intake_approvals"], ext: true },
  { id: "vm", label: "Vendor master import (extension)", agent: "XLSX → supplier", tables: ["vendor_master"], ext: true },
  { id: "hist", label: "Sourcing cycle history (extension)", agent: "Reporting", tables: ["sourcing_cycle_history"], ext: true },
  { id: "wf", label: "Workflow configuration (extension)", agent: "Admin", tables: ["approval_workflows", "workflow_steps"], ext: true },
];
const FK = {
  supplier_id: ["supplier", "supplier_id"], final_selected_supplier: ["supplier", "supplier_id"], incumbent_supplier: null,
  rfx_id: ["rfx_events", "rfx_id"], linked_RFx: ["rfx_events", "rfx_id"], linked_rfx: ["rfx_events", "rfx_id"],
  request_id: ["intake_requests", "request_id"], contract_id: ["contract_intake_requests", "contract_id"],
  document_id: ["documents", "document_id"], bid_id: ["bid_responses", "bid_id"], question_id: ["rfx_questions", "question_id"],
  requirement_id: ["rfx_requirements", "requirement_id"], persona_id: ["personas_master", "persona_id"], primary_persona: ["personas_master", "persona_id"],
  approver_user_id: ["approver_availability_matrix", "user_id"], delegated_user_id: ["approver_availability_matrix", "user_id"],
  rfx_category: ["rfx_category", "rfx_category"], evaluation_id: ["agent_assignment_evaluations", "evaluation_id"],
  negotiation_case_id: ["negotiation_cases", "negotiation_case_id"], negotiation_round_id: ["negotiation_rounds", "negotiation_round_id"],
  offer_id: ["negotiation_offers", "offer_id"], signal_id: ["market_signals", "signal_id"], alternative_supplier_id: ["supplier", "supplier_id"],
  invoice_id: ["invoices", "invoice_id"], source_offer_id: ["negotiation_offers", "offer_id"], winning_offer_id: ["negotiation_offers", "offer_id"],
  insight_id: ["negotiation_insights", "insight_id"], tactic_id: ["negotiation_playbook_tactics", "tactic_id"], rfq_line_item_id: ["bid_line_items", "biditem_id"],
  case_owner_user_id: ["approver_availability_matrix", "user_id"], approved_by_user_id: ["approver_availability_matrix", "user_id"], owner_user_id: ["approver_availability_matrix", "user_id"],
  owner_persona_id: ["personas_master", "persona_id"], role_id: ["platform_roles", "role_id"], approver_role_id: ["platform_roles", "role_id"],
  workflow_id: ["approval_workflows", "workflow_id"], PLATFORM_ROLE: ["platform_roles", "role_id"], approver_bname: ["enterprise_user_master", "BNAME"], MANAGER_BNAME: ["enterprise_user_master", "BNAME"],
};
const PK = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t, S2C_PRIMARY_KEYS[t]?.[0] || SCHEMA[t][0][0]]));
const ALL_TABLES = Object.keys(SCHEMA);
const rowKey = (t, row, index = 0) => (S2C_PRIMARY_KEYS[t] || [PK[t]]).map((k) => `${k}:${String(row?.[k] ?? "")}`).join("|") || `${t}:row:${index}`;
const isDraftRfxApproval = (row) => String(row?.evaluation_id || "").startsWith("DRAFT-");
const DATE_ONLY_COLUMNS = new Set([
  "compliance.effective_date", "intake_commercials_timelines.sourcing_start_date", "intake_commercials_timelines.rfp_issue_date",
  "intake_commercials_timelines.award_date", "intake_commercials_timelines.service_start_date", "rfx_events.issue_date", "rfx_events.due_date",
  "rfx_events.closed_date", "supplier.kyc_verified_date", "supplier_improvement_plans.target_date", "invoices.invoice_date", "invoices.payment_date",
  "negotiation_market_benchmarks.valid_from", "negotiation_market_benchmarks.valid_to", "sourcing_cycle_history.intake_date", "sourcing_cycle_history.awarded_date", "supplier_diversity.verified_at",
]);

/* ============================= HELPERS ============================= */
const J = (v) => JSON.stringify(v);
const P = (s, d = []) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };
const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
function fmtUsd(n) { if (n === null || n === undefined || n === "") return "—"; const value = num(n); if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`; if (Math.abs(value) >= 1e3) return `$${Math.round(value / 1e3)}K`; return `$${value.toLocaleString()}`; }
function fmtFull(n) { return n == null || n === "" ? "—" : "$" + num(n).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
function parseUtcDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null;
  if (typeof value === "number") { const date = new Date(value); return Number.isFinite(date.getTime()) ? date : null; }
  const raw = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.\d{1,3})?)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)$/.exec(raw);
  if (!match) return null;
  const isoDay = `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(`${isoDay}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === isoDay ? date : null;
}
function fmtDate(d) { const date = parseUtcDate(d); return date ? date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }) : "—"; }
const DATE_FORM_FIELDS = new Set(["sourcingStartDate", "rfpIssueDate", "awardDate", "serviceStartDate"]);
const normalizeFormDate = (value, fallback = null) => { const date = parseUtcDate(value); return date ? date.toISOString().slice(0, 10) : fallback; };
function normalizeS2cDateFields(db) {
  DATE_ONLY_COLUMNS.forEach((key) => {
    const [table, column] = key.split(".");
    if (!db[table]) return;
    db[table] = db[table].map((row) => {
      if (!Object.prototype.hasOwnProperty.call(row, column)) return row;
      return { ...row, [column]: normalizeFormDate(row[column]) };
    });
  });
}
function nowTs() { return `${TODAY} ${new Date().toTimeString().slice(0, 8)}`; }
function daysUntil(d) { const target = parseUtcDate(d); const today = parseUtcDate(TODAY); return target && today ? Math.round((target.getTime() - today.getTime()) / 86400000) : null; }
function statusClass(s) { s = String(s || "").toUpperCase(); return { OPEN: "open", "CLOSING SOON": "closing", CLOSED: "closed", AWARDED: "awarded", DRAFT: "draft", EVALUATION: "evaluation", NEGOTIATION: "closing", CANCELLED: "closed", APPROVED: "awarded", PENDING: "closing", PENDING_HITL: "closing", REJECTED: "closed", VERIFIED: "awarded", HIGH: "closed", MEDIUM: "closing", LOW: "awarded", NORMALIZED: "awarded", EXCEPTION_REVIEW: "closing", RESOLVED: "awarded", PUBLISHED: "awarded", ANSWERED: "awarded", SUBMITTED: "closing", IN_REVIEW: "closing", QUEUED: "draft", CONFIRMED: "awarded", ACTIVE: "awarded", EXPIRED: "closed", MEETS: "open", EXCEEDS: "awarded", NEEDS_IMPROVEMENT: "closed", IN_PROGRESS: "open", SUPERSEDED: "draft", UNDER_REVIEW: "closing", INTAKE: "draft", UNASSESSED: "draft", TAIL_SPEND: "draft" }[s] || "closed"; }
function nice(s) { return String(s ?? "").replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()); }
const Badge = ({ s, children, style }) => <span className={`badge ${statusClass(s)}`} style={style}>{children ?? nice(s)}</span>;

// db accessors
const q = (db, t, col, v) => db[t].filter((r) => r[col] === v);
const one = (db, t, col, v) => db[t].find((r) => r[col] === v);
const supName = (db, id) => one(db, "supplier", "supplier_id", id)?.name ?? id;
const rfxStatusLabel = (db, e) => { if (e.status === "OPEN") { const d = daysUntil(e.due_date); if (d !== null && d <= 7) return "Closing Soon"; } return nice(e.status); };
function displayStatus(db, e) { const l = rfxStatusLabel(db, e); return l; }

/* ============================= AI HELPER ============================= */
async function callClaudeJson(systemPrompt, userMessage, maxTokens = 3000, tier = "default") {
  if (systemPrompt.includes("RFP questionnaires")) {
    return [
      { section: "Business outcomes", title: "Business value and measurable outcomes", text: "Describe the business outcomes, baselines and success measures.", priority: "HIGH", type: "TEXT", weight: 14 },
      { section: "Solution scope", title: "Proposed solution and delivery model", text: "Describe the proposed delivery model, scope coverage and assumptions.", priority: "HIGH", type: "TEXT", weight: 14 },
      { section: "Technical", title: "Architecture and integration", text: "Explain the proposed architecture, integrations and dependencies.", priority: "HIGH", type: "TEXT", weight: 12 },
      { section: "Security", title: "Security and privacy controls", text: "Confirm security certifications, privacy controls and data-residency approach.", priority: "HIGH", type: "FILE", weight: 12 },
      { section: "Commercial", title: "Pricing schedule", text: "Provide a transparent rate card, price assumptions and payment terms.", priority: "HIGH", type: "NUMERIC", weight: 12 },
      { section: "Implementation", title: "Transition plan", text: "Provide milestones, governance, transition approach and key risks.", priority: "MEDIUM", type: "TEXT", weight: 12 },
    ];
  }
  if (systemPrompt.includes("complete enterprise RFP documents")) {
    const sections = ["Executive Summary", "Background & Objectives", "Scope of Services", "Supplier Instructions", "Technical Requirements", "Commercial Requirements", "Implementation & Transition", "Service Levels & Governance", "Security, Privacy & Compliance", "Evaluation Criteria", "Submission Checklist"];
    const title = userMessage.replace(/^RFP need:\s*/i, "").split("\n")[0].trim() || "Sourcing requirement";
    return { title, category: "Professional Services", sections: sections.map((name) => ({ name, content: `${title} — ${name}. Structured draft for human review; validate commercial, legal, technical and delivery assumptions before publication.` })) };
  }
  return { extracted: {}, reply: "I captured the context. Please provide the next required detail.", section_complete: false, mode: "GUIDED_FALLBACK" };
}

// Streaming variant: resolves with the full text; onText receives the text-so-far while it streams.
async function callClaudeStream(systemPrompt, userMessage, { tier = "quick", onText } = {}) {
  const full = "I captured the context. Please provide the next required detail.";
  if (onText) { onText(full); }
  return full;
}
const typewrite = async (full, onText, step = 3, ms = 14) => { for (let i = 1; i <= full.length; i += step) { onText(full.slice(0, i)); await new Promise((r) => setTimeout(r, ms)); } onText(full); };

/* ============================= TOASTS ============================= */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((title, desc) => { const id = Date.now() + Math.random(); setToasts((t) => [...t, { id, title, desc }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600); }, []);
  return { toasts, push };
}

/* ============================= NAV ============================= */
const NAV_GROUPS = [
  { id: "home", label: "Home", subsections: [{ label: null, items: [{ id: "home", label: "My Workspace" }] }] },
  { id: "sourcing", label: "Autonomous Sourcing",
    subsections: [
      { label: "Activities", items: [
        { id: "command-center", idx: "00", label: "RFx Command Center" },
        { id: "demand-intake", idx: "01", label: "Demand Intake" },
        { id: "supplier-discovery", idx: "02", label: "Supplier Discovery" },
        { id: "rfx-creation-publish", idx: "03a", label: "RFx Creation and Publish" },
        { id: "quick-rfx-creation", idx: "03b", label: "Quick RFx Creation (AI)" },
        { id: "evaluation", idx: "04", label: "RFx Response Evaluation Analysis" },
        { id: "dynamic-resourcing", idx: "04b", label: "Dynamic Resourcing Engine" },
        { id: "negotiation", idx: "05", label: "Negotiation Insights" },
        { id: "award", idx: "06", label: "Award Recommendation & Contract Handover" },
      ]},
      { label: "Workspace", items: [
        { id: "qna", label: "Q&A" },
        { id: "approvals", label: "Approval Dashboard" },
        { id: "faq", label: "FAQ & Knowledge Center" },
        { id: "rfp-workflow-status", label: "RFP Workflow Status" },
      ]},
    ]},
  { id: "clm", label: "Contract Lifecycle Management",
    subsections: [{ label: null, items: [
      { id: "new-contract-rollout", label: "New Contract Rollout" },
      { id: "contracting-cockpit", label: "Contracting Cockpit (C1–C8)" },
      { id: "nda-rollout", label: "NDA Rollout" },
      { id: "contract-renewal", label: "Contract Renewal" },
      { id: "contract-amendment", label: "Contract Amendment" },
      { id: "obligation-management", label: "Obligation Management" },
      { id: "contract-termination", label: "Contract Termination" },
    ]}]},
  { id: "spm", label: "Supplier Performance & Governance",
    subsections: [{ label: null, items: [
      { id: "supplier-performance", label: "Supplier Scorecards & QBR" },
      { id: "governance", label: "HITL Gates & Routing" },
    ]}]},
  { id: "admin", label: "Administration", subsections: [{ label: null, items: [{ id: "user-management", label: "User Management" }, { id: "roles-permissions", label: "Roles and Permissions" }, { id: "workflow-config", label: "Workflow Configuration" }, { id: "agent-processing", label: "Agent Processing" }, { id: "template-management", label: "Template Management" }, { id: "audit-logs", label: "Audit Logs" }, { id: "settings", label: "Settings" }] }] },
  { id: "data", label: "Database",
    subsections: [{ label: null, items: [{ id: "explorer", label: "Table Explorer" }, { id: "erd", label: "Domain Map & Coverage" }] }]},
];
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => [...(g.top ? [g.top] : []), ...g.subsections.flatMap((s) => s.items)]);

/* ============================= APP ============================= */
function App() {
  const [db, setDb] = useState(null);
  const [selectedUser, setUser] = useState(null);
  const verified = trpc.auth.me.useQuery(undefined, { retry: false });
  const user = selectedUser;
  const [page, setPage] = useState("home");
  const [rfxId, setRfxId] = useState(FLAGSHIP_RFX);
  const [collapsed, setCollapsed] = useState({});
  const [drawer, setDrawer] = useState(null);
  const [explorerTable, setExplorerTable] = useState("rfx_events");
  const [runReq, setRunReq] = useState(null);
  const [navTick, setNavTick] = useState(0);
  const { toasts, push } = useToasts();
  const utils = trpc.useUtils();
  const snapshot = trpc.s2c.snapshot.useQuery(undefined, { enabled: Boolean(verified.data), retry: 1, refetchOnWindowFocus: false });
  const metrics = trpc.s2c.metrics.useQuery(undefined, { enabled: Boolean(verified.data), retry: 1, refetchOnWindowFocus: false });
  const applyChanges = trpc.s2c.applyChanges.useMutation();
  const resetDemo = trpc.s2c.resetDemo.useMutation();
  const decideApproval = trpc.intake.decideApproval.useMutation();
  useEffect(() => { if (snapshot.data) setDb(snapshot.data); }, [snapshot.data]);
  useEffect(() => {
    if (!db || !verified.data) return;
    const match = db.enterprise_user_master.find(x => x.BNAME?.trim() === verified.data.bname && x.PLATFORM_ROLE === verified.data.platformRole && Number(x.UFLAG) === 0);
    setUser(match || null);
  }, [db, verified.data]);
  const mutate = useCallback((fn) => {
    setDb((prev) => {
      if (!prev) return prev;
      const before = structuredClone(prev);
      const next = structuredClone(prev);
      fn(next);
      normalizeS2cDateFields(next);
      const changes = tableChanges(before, next);
      if (changes.length) applyChanges.mutate({ changes }, {
        onError: (error) => { setDb(before); push("Database update failed", error.message.slice(0, 160)); },
        onSuccess: () => { utils.s2c.snapshot.invalidate(); utils.s2c.metrics.invalidate(); },
      });
      return next;
    });
  }, [applyChanges, push, utils]);
  const openRecord = useCallback((t, col, v) => {
    setDb((prev) => {
      const rows = prev?.[t] || [];
      const typed = typeof rows[0]?.[col] === "number" ? Number(v) : v;
      const rec = rows.find((r) => r[col] === typed);
      if (rec) setDrawer({ t, rec });
      return prev;
    });
  }, []);
  const gotoTable = (t) => { setExplorerTable(t); setPage("explorer"); setDrawer(null); };
  const reset = () => resetDemo.mutate(undefined, { onSuccess: () => { utils.s2c.snapshot.invalidate(); utils.s2c.metrics.invalidate(); setRfxId(FLAGSHIP_RFX); setDrawer(null); push("Database reset", "All 79 MySQL/TiDB tables reloaded from the approved demo seed."); }, onError: (error) => push("Database reset failed", error.message.slice(0, 160)) });
  const logoutMutation = trpc.auth.logout.useMutation();
  const logout = () => { logoutMutation.mutate(undefined, { onSettled: () => { setUser(null); setDb(null); utils.auth.me.invalidate(); setPage("home"); setDrawer(null); } }); };
  if (verified.isPending) return <div className="loading-row">Checking verified session…</div>;
  if (!verified.data) return <div className="loading-row"><h3>Server sign-in required</h3><p>Demo persona selection is disabled for governed APIs. An administrator must configure trusted session issuance (SSO/OIDC) before login.</p></div>;
  if (snapshot.isError) return <div className="loading-row"><div><h3>Database connection unavailable</h3><p>{snapshot.error.message}</p><button className="btn btn-primary" onClick={() => snapshot.refetch()}>Retry database connection</button></div></div>;
  if (!db) return <div className="loading-row">Loading 79 governed tables from MySQL/TiDB…</div>;
  if (!user) return <div className="loading-row"><h3>Identity/role mismatch</h3><p>The signed session has no active matching enterprise user and role. Contact an administrator.</p></div>;
  const role = one(db, "platform_roles", "role_id", user.PLATFORM_ROLE);
  const access = Object.fromEntries(db.role_module_access.filter((r) => r.role_id === user.PLATFORM_ROLE).map((r) => [r.module_id, r.access_level]));
  const can = (...roles) => user.PLATFORM_ROLE === "ADMIN" || roles.includes(user.PLATFORM_ROLE);
  const level = (m) => access[m] || null;
  const visibleGroups = NAV_GROUPS.map((g) => ({ ...g, top: g.top && access[g.top.id] ? g.top : null, subsections: g.subsections.map((s) => ({ ...s, items: s.items.filter((i) => access[i.id]) })).filter((s) => s.items.length) })).filter((g) => g.top || g.subsections.length);
  const pageMeta = ALL_NAV_ITEMS.find((i) => i.id === page);
  const ctx = { db, mutate, push, setPage, rfxId, setRfxId, openRecord, gotoTable, setExplorerTable, explorerTable, user, role, can, level, logout, runReq, setRunReq, navTick, decideApproval, refreshSnapshot: () => utils.s2c.snapshot.invalidate() };
  const rfx = one(db, "rfx_events", "rfx_id", rfxId) || db.rfx_events[0];
  const toggleGroup = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const total = ALL_TABLES.reduce((a, t) => a + db[t].length, 0);
  const allowed = !!access[page] || (page === "rfx-overview" && !!access["demand-intake"]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-head"><div className="logo"></div><span>S2C Platform <span className="badge open" style={{ marginLeft: 6 }}>V5</span></span></div>
        {visibleGroups.map((group) => (
          <div key={group.id}>
            <div className="nav-group-head" onClick={() => toggleGroup(group.id)}><span>{group.label}</span><span>{collapsed[group.id] ? "›" : "⌄"}</span></div>
            {!collapsed[group.id] && (<>
              {group.top && <div className="nav-section"><a className={`nav-item nav-top ${page === group.top.id ? "active" : ""}`} onClick={() => setPage(group.top.id)}><span>{group.top.label}</span></a></div>}
              {group.subsections.map((sub, si) => (
                <div className="nav-section" key={si}>
                  {sub.label && <div className="nav-heading">{sub.label}</div>}
                  {sub.items.map((item) => <a key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setNavTick((t) => t + 1); }}>{item.idx && <span className="idx">{item.idx}</span>}<span>{item.label}</span>{access[item.id] === "VIEW" && <span className="nav-view" title="view only">👁</span>}</a>)}
                </div>))}
            </>)}
          </div>))}
        <div className="side-foot"><div className="mono" style={{ fontSize: 10.5 }}>{ALL_TABLES.length} tables · {total.toLocaleString()} rows</div>{can("ADMIN") && <button className="btn btn-ghost btn-sm side-reset" onClick={reset}>Reset demo database</button>}</div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div><h1>Autonomous S2C Platform</h1><span className="sub">{pageMeta ? pageMeta.label : ""}</span></div>
          <div className="topbar-ctx">
            {!["home", "roles-permissions", "workflow-config", "user-management", "agent-processing", "template-management", "audit-logs", "settings"].includes(page) && <><span className="sub">Working RFx</span>
            <select value={rfx.rfx_id} onChange={(e) => setRfxId(e.target.value)}>{db.rfx_events.map((e) => <option key={e.rfx_id} value={e.rfx_id}>{e.rfx_id} · {e.title.slice(0, 44)}{e.title.length > 44 ? "…" : ""}</option>)}</select>
            <Badge s={rfx.status} /></>}
            <div className="user-chip" title={user.SMTP_ADDR}><span className="avatar" style={{ background: role.color_hex }}>{user.NAME_FIRST[0]}{user.NAME_LAST[0]}</span><div><div className="u-name">{user.NAME_FIRST} {user.NAME_LAST}</div><div className="u-role">{role.role_name}</div></div><button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button></div>
          </div>
        </div>
        <div className="content">
          {!allowed && <div className="card placeholder-card"><div className="icon">🔒</div><h3>No access to this module</h3><p style={{ fontSize: 13 }}>Your role ({role.role_name}) is not granted <span className="mono">{page}</span>. Ask an administrator in Roles & Permissions.</p></div>}
          {allowed && page === "home" && <HomePage {...ctx} />}
          {allowed && page === "roles-permissions" && <RolesPermissions {...ctx} />}
          {allowed && page === "workflow-config" && <WorkflowConfig {...ctx} />}
          {allowed && ["user-management", "agent-processing", "template-management", "audit-logs", "settings"].includes(page) && <ComingSoon id={page} label={pageMeta?.label} />}
          {allowed && page === "command-center" && <CommandCenterV4 {...ctx} />}
          {access["demand-intake"] && page === "rfx-overview" && <RfxOverviewV5 {...ctx} />}
          {allowed && page === "autonomous-run" && <AutonomousRun {...ctx} />}
          {allowed && page === "demand-intake" && <DemandIntake {...ctx} />}
          {allowed && page === "supplier-discovery" && <SupplierDiscovery {...ctx} />}
          {allowed && page === "rfx-creation-publish" && <RfxCreationPublish {...ctx} />}
          {allowed && page === "quick-rfx-creation" && <QuickRfxCreation {...ctx} />}
          {allowed && page === "evaluation" && <RfxEvaluationAnalysis {...ctx} />}
          {allowed && page === "dynamic-resourcing" && <DynamicResourcing {...ctx} />}
          {allowed && page === "negotiation" && <Negotiation {...ctx} />}
          {allowed && page === "award" && <Award {...ctx} />}
          {allowed && page === "qna" && <QnA {...ctx} />}
          {allowed && page === "approvals" && <Approvals {...ctx} />}
          {allowed && page === "faq" && <FaqCenter {...ctx} />}
          {allowed && page === "rfp-workflow-status" && <WorkflowStatus {...ctx} />}
          {allowed && page === "new-contract-rollout" && <NewContractRollout {...ctx} />}
          {allowed && page === "contracting-cockpit" && <ContractingCockpit {...ctx} />}
          {allowed && page === "nda-rollout" && <ClmRegister {...ctx} kind="nda" />}
          {allowed && page === "contract-renewal" && <ClmRegister {...ctx} kind="renewal" />}
          {allowed && page === "contract-amendment" && <ClmRegister {...ctx} kind="amendment" />}
          {allowed && page === "obligation-management" && <ClmRegister {...ctx} kind="obligation" />}
          {allowed && page === "contract-termination" && <ClmRegister {...ctx} kind="termination" />}
          {allowed && page === "supplier-performance" && <SupplierPerformance {...ctx} />}
          {allowed && page === "governance" && <Governance {...ctx} />}
          {allowed && page === "explorer" && <Explorer {...ctx} />}
          {allowed && page === "erd" && <DomainMap {...ctx} />}
        </div>
      </div>
      <RecordDrawer db={db} drawer={drawer} close={() => setDrawer(null)} openRecord={openRecord} gotoTable={gotoTable} />
      <div className="toast-wrap">{toasts.map((t) => <div className="toast" key={t.id}><b>{t.title}</b>{t.desc}</div>)}</div>
    </div>
  );
}

/* ============================= SHARED UI ============================= */
function Ref({ t, c, v, openRecord, children, className }) { if (v == null) return <span className="null">NULL</span>; return <a className={`fk mono ${className || ""}`} onClick={(e) => { e.stopPropagation(); openRecord(t, c, v); }}>{children ?? String(v)}</a>; }
function TableLink({ t, gotoTable, children }) { return <a className="rfp-link mono" onClick={() => gotoTable(t)}>{children ?? t}</a>; }
function Cell({ db, t, col, v, openRecord }) {
  if (v === null || v === undefined) return <span className="null">NULL</span>;
  const fk = FK[col];
  if (fk && !(t === fk[0] && col === fk[1])) return <Ref t={fk[0]} c={fk[1]} v={v} openRecord={openRecord} />;
  if (col === PK[t]) return <Ref t={t} c={col} v={v} openRecord={openRecord} className="pk" />;
  const type = (SCHEMA[t].find((x) => x[0] === col) || [])[1];
  if (type === "TINYINT(1)") return <span className={`bool ${v ? "yes" : "no"}`}>{v ? "true" : "false"}</span>;
  if (/status|priority|risk_rating|risk_level|severity|kyc_status|priority_level|risk_level_criteria|db_financial_risk_rating/.test(col) && typeof v === "string") return <Badge s={v} />;
  if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) return <code className="json" title={v}>{v.length > 60 ? v.slice(0, 58) + "…" : v}</code>;
  if (typeof v === "number") return <span className="mono num">{Number.isInteger(v) ? v.toLocaleString() : v}</span>;
  const s = String(v); return <span title={s}>{s.length > 90 ? s.slice(0, 88) + "…" : s}</span>;
}
function DataTable({ db, t, rows, cols, openRecord, gotoTable, empty, compact = true, footer = true }) {
  cols = cols || SCHEMA[t].map((c) => c[0]);
  return (
    <div className="card grid-wrap">
      <table className={`grid ${compact ? "compact" : ""}`}>
        <thead><tr>{cols.map((c) => <th key={c}>{compact ? nice(c) : <><div className="cname">{c}{c === PK[t] && <span className="key" title="primary key">⚿</span>}{FK[c] && FK[c][0] !== t && <span className="fkm" title={`→ ${FK[c][0]}`}>↗</span>}</div><div className="ctype">{SCHEMA[t].find((x) => x[0] === c)?.[1]}</div></>}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map((r, i) => <tr key={rowKey(t, r, i)}>{cols.map((c) => <td key={c}><Cell db={db} t={t} col={c} v={r[c]} openRecord={openRecord} /></td>)}</tr>) : <tr><td colSpan={cols.length} className="empty">{empty || "No rows yet for this stage."}</td></tr>}</tbody>
      </table>
      {footer && gotoTable && <div className="tbl-foot"><TableLink t={t} gotoTable={gotoTable} /> · {rows.length} of {db[t].length} rows</div>}
    </div>);
}
function Stepper({ steps, current }) {
  return <div className="rfp-stepper">{steps.map((s, i) => { const st = i < current ? "done" : i === current ? "active" : "pending"; return (<React.Fragment key={s}><div className="rfp-step"><div className={`rfp-step-circle ${st}`}>{st === "done" ? "✓" : i + 1}</div><div className="rfp-step-label"><div className="t">{s}</div><div className={`s ${st}`}>{st === "done" ? "Completed" : st === "active" ? "In Progress" : "Pending"}</div></div></div>{i < steps.length - 1 && <div className={`rfp-step-line ${st === "done" ? "done" : ""}`}></div>}</React.Fragment>); })}</div>;
}
function Eyebrow({ activity, tables, agent, gotoTable }) { return <div className="page-eyebrow">{activity && <>{activity} · </>}{tables && tables.map((t, i) => <React.Fragment key={t}>{i > 0 && " + "}<a className="mono" onClick={() => gotoTable && gotoTable(t)} style={{ cursor: "pointer" }}>{t}</a></React.Fragment>)}{agent && <> · {agent}</>}</div>; }

/* ============================= RECORD DRAWER (lineage) ============================= */
function RecordDrawer({ db, drawer, close, openRecord, gotoTable }) {
  useEffect(() => { const h = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [close]);
  if (!drawer) return <aside className="drawer"></aside>;
  const { t, rec } = drawer; const key = rec[PK[t]];
  const related = [];
  for (const o of ALL_TABLES) {
    if (o === t) continue;
    const cols = SCHEMA[o].map((c) => c[0]).filter((c) => FK[c] && FK[c][0] === t);
    for (const c of cols) { const rows = db[o].filter((r) => r[c] === key); if (rows.length) related.push({ table: o, col: c, rows }); }
    const jrows = db[o].filter((r) => Object.values(r).some((v) => typeof v === "string" && v.startsWith("[") && v.includes(`"${key}"`)));
    if (jrows.length && !related.some((x) => x.table === o)) related.push({ table: o, col: "(json ref)", rows: jrows });
  }
  const summary = (tt, r) => { const skip = new Set([PK[tt], "created_at", "updated_at"]); const c = SCHEMA[tt].map((x) => x[0]).find((x) => !skip.has(x) && !FK[x] && r[x] != null && typeof r[x] === "string" && !r[x].startsWith("[") && !r[x].startsWith("{")) || SCHEMA[tt][1][0]; return String(r[c] ?? "").slice(0, 70); };
  return (
    <aside className="drawer open">
      <div className="drawer-head"><div><div className="crumb mono">{t}</div><h3 className="mono">{String(key)}</h3></div><button className="btn btn-ghost btn-sm" onClick={close}>Close</button></div>
      <div className="drawer-body">
        <table className="kvt">{SCHEMA[t].map((c) => <tr key={c[0]}><th>{c[0]}<div className="ctype">{c[1]}</div></th><td><Cell db={db} t={t} col={c[0]} v={rec[c[0]]} openRecord={openRecord} /></td></tr>)}</table>
        {!IS_V4 && <><h4>Linked records <span className="count">{related.reduce((a, r) => a + r.rows.length, 0)}</span></h4>
        {related.length ? related.map((r) => (
          <div className="rel" key={r.table + r.col}><div className="rel-h"><TableLink t={r.table} gotoTable={gotoTable} /> <span className="muted">via {r.col} · {r.rows.length}</span></div>
            <ul>{r.rows.slice(0, 8).map((row) => <li key={rowKey(r.table, row)}><Ref t={r.table} c={PK[r.table]} v={row[PK[r.table]]} openRecord={openRecord} /> <span className="muted">{summary(r.table, row)}</span></li>)}{r.rows.length > 8 && <li className="muted">+{r.rows.length - 8} more</li>}</ul></div>))
          : <p className="muted">Nothing references this record yet.</p>}</>}
      </div>
    </aside>);
}

/* ============================= TABLE EXPLORER ============================= */
function download(name, content, mime) { const b = new Blob([content], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 500); }
function toSQL(db, t) { const cols = SCHEMA[t].map((c) => c[0]); const lit = (v) => v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`; if (!db[t].length) return `-- ${t}: no rows`; return `-- ${t} (${db[t].length} rows)
INSERT INTO ${t} (${cols.join(", ")}) VALUES
${db[t].map((r) => "  (" + cols.map((c) => lit(r[c])).join(", ") + ")").join(",\n")};`; }

function Explorer({ db, explorerTable, setExplorerTable, openRecord, gotoTable, push }) {
  const [search, setSearch] = useState("");
  const t = explorerTable; const cols = SCHEMA[t]; const dom = DOMAINS.find((d) => d.tables.includes(t));
  const qq = search.trim().toLowerCase();
  const rows = qq ? db[t].filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(qq))) : db[t];
  const inbound = Object.entries(FK).filter(([, fk]) => fk && fk[0] === t).map(([c]) => c);
  const refs = ALL_TABLES.filter((o) => o !== t && SCHEMA[o].some((c) => inbound.includes(c[0])));
  return (
    <div className="explorer">
      <div className="explorer-side card">
        {DOMAINS.map((d) => (<div key={d.id} className="ex-domain"><div className="ex-domain-h"><span>{d.label}</span><span className="vc-agent-chip" style={d.ext ? { background: "var(--amber-bg)", color: "#7a5111" } : {}}>{d.agent}</span></div>
          {d.tables.map((tt) => <a key={tt} className={`ex-table ${tt === t ? "active" : ""}`} onClick={() => { setExplorerTable(tt); setSearch(""); }}><span className="mono">{tt}</span><span className="rows">{db[tt].length}</span></a>)}</div>))}
      </div>
      <div className="explorer-main">
        <div className="page-head" style={{ marginBottom: 12 }}>
          <div className="page-eyebrow">{dom.label} <span className="vc-agent-chip">{dom.agent}</span></div>
          <h2 className="page-title mono" style={{ fontSize: 18 }}>{t}</h2>
          <p className="page-desc">{cols.length} columns · {db[t].length} rows{refs.length ? <> · referenced by {refs.map((r, i) => <React.Fragment key={r}>{i > 0 && ", "}<TableLink t={r} gotoTable={gotoTable} /></React.Fragment>)}</> : null}</p>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input className="ex-search" placeholder="Filter rows" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${t}.json`, JSON.stringify(db[t], null, 2), "application/json")}>JSON</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { const cs = cols.map((c) => c[0]); const qv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`; download(`${t}.csv`, [cs.join(","), ...db[t].map((r) => cs.map((c) => qv(r[c])).join(","))].join(" "), "text/csv"); }}>CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${t}.sql`, toSQL(db, t), "text/plain")}>SQL</button>
          <button className="btn btn-primary btn-sm" onClick={() => { download("s2c_all_tables.sql", ALL_TABLES.map((x) => toSQL(db, x)).join(" | "), "text/plain"); push("Exported", "All 79 tables written to s2c_all_tables.sql"); }}>Export all 52 as SQL</button>
        </div>
        <DataTable db={db} t={t} rows={rows} openRecord={openRecord} compact={false} footer={false} empty={`No rows match "${search}".`} />
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Rows {rows.length} of {db[t].length}. Click any identifier to open the record and every row linked to it.</div>
      </div>
    </div>);
}

function DomainMap({ db, gotoTable }) {
  const LIFE = [["Identity & Access (extension)", "—", "SAP · RBAC", "iam"], ["Vendor Master import (extension)", "—", "XLSX", "vm"], ["Demand Intake", "S1–S2", "A1", "intake"], ["Supplier Discovery", "S3–S4", "A2", "supplier"], ["RFx Build & Publish", "S5–S6", "A3 · A8", "rfx"], ["Bid Receipt", "S7", "A4", "bids"], ["Evaluation", "S8", "A5", "eval"], ["Negotiation", "S9–S10", "A6", "nego"], ["Negotiation engine (multi-round)", "S9–S10", "A6", "negx"], ["Award & Handover", "S11–S12", "A7", "award"], ["New Contract (C1–C4)", "C1–C4", "A9 · A12", "contract"], ["Supplier Performance", "1.0–6.0", "SPM", "spm"], ["Governance (all)", "—", "A15", "gov"]];
  return (
    <div>
      <div className="page-head"><div className="page-eyebrow">ERR schema · 79 governed tables · live MySQL/TiDB contract (identity & intake approvals)</div><h2 className="page-title">Domain Map & Coverage</h2><p className="page-desc">Lifecycle → tables → owning agent, with live row counts. Anything not in the ERD (NDA, Renewal, Amendment, Obligation, Termination) is flagged as a proposed extension in the CLM screens.</p></div>
      <div className="domain-grid">{LIFE.map(([l, steps, agent, did]) => { const d = DOMAINS.find((x) => x.id === did); const n = d.tables.reduce((a, t) => a + db[t].length, 0); return (
        <div className="card rfp-card" key={did}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div className="rfp-card-title" style={{ marginBottom: 2 }}>{l}</div><span className="vc-agent-chip">{agent}</span></div><div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>{steps} · {d.tables.length} tables · {n} rows</div>
          {d.tables.map((t) => <div key={t} className="dm-row"><a className="mono rfp-link" onClick={() => gotoTable(t)}>{t}</a><span className="mono muted">{db[t].length}</span></div>)}</div>); })}</div>
    </div>);
}

/* ============================= LOGIN ============================= */
function LoginPage({ db, onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const roles = db.platform_roles;
  const submit = (e) => {
    e && e.preventDefault(); setErr(null);
    const u = db.enterprise_user_master.find((x) => x.SMTP_ADDR.toLowerCase() === email.trim().toLowerCase());
    if (!u) { setErr("No SAP user record matches that ID. Use the format name@s2c.com."); return; }
    if (u.UFLAG !== 0) { setErr("User is locked in SAP (UFLAG ≠ 0)."); return; }
    if (pw !== DEMO_PASSWORD) { setErr("Incorrect password."); return; }
    setBusy(true); setTimeout(() => onLogin(u), 500);
  };
  const quick = (u) => { setEmail(u.SMTP_ADDR); setPw(DEMO_PASSWORD); setErr(null); setBusy(true); setTimeout(() => onLogin(u), 350); };
  return (
    <div className="login-shell">
      <div className="login-left">
        <div className="login-brand"><div className="logo"></div><span>S2C Platform</span></div>
        <div className="login-hero">
          <div className="login-eyebrow">AUTONOMOUS SOURCE-TO-CONTRACT</div>
          <h1>From manual sourcing to<br/>autonomous value realization</h1>
          <p>An AI‑powered multi-agent orchestration solution that drives speed, compliance, and value realization across the sourcing, contracting lifecycle and supplier performance. Unlock savings, reduce leakage, and elevate every supplier and stakeholder touchpoint.</p>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card" onKeyDown={(e) => { if (e.key === "Enter") submit(); }}>
          <h2>Sign in</h2>
          <p className="muted">Identity is resolved against the SAP user master (<span className="mono">enterprise_user_master</span>); your platform role decides what you see.</p>
          <label>User ID</label>
          <input type="text" placeholder="name@s2c.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <div className="login-err">{err}</div>}
          <button className="btn btn-primary login-btn" type="button" onClick={() => submit()} disabled={busy}>{busy ? "Resolving identity…" : "Sign in"}</button>
          <div className="login-hint">Demo password for every account: <span className="mono">{DEMO_PASSWORD}</span></div>
          <div className="login-divider"><span>or sign in as a persona profile</span></div>
          <div className="persona-grid">
            {roles.map((r) => { const u = db.enterprise_user_master.find((x) => x.PLATFORM_ROLE === r.role_id); if (!u) return null; return (
              <button type="button" key={r.role_id} className={`persona-tile ${email === u.SMTP_ADDR ? "on" : ""}`} onClick={() => quick(u)} title={r.description}>
                <span className="shield" style={{ background: r.color_hex }}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/></svg></span>
                <span className="pt-name">{r.role_name}</span><span className="pt-role">{r.description.split(" ").slice(0, 6).join(" ")}…</span>
              </button>); })}
          </div>
        </div>
      </div>
    </div>);
}

/* ============================= HOME (persona landing) ============================= */
function myQueue(db, user) {
  const r = user.PLATFORM_ROLE; const items = [];
  const isAdmin = r === "ADMIN";
  const chainRole = (rid) => rid === "PROC_MGR" ? ["PROC_MGR", "PROC_HEAD"] : [rid];
  db.intake_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => { if (isAdmin || chainRole(a.role_id).includes(r)) { const req = one(db, "intake_requests", "request_id", a.request_id); items.push({ gate: "Intake approval", ref: a.request_id, t: "intake_requests", c: "request_id", what: `${req?.category} · ${fmtUsd(one(db, "intake_commercials_timelines", "request_id", a.request_id)?.approved_budget)} · raised by ${req?.requestor_name}`, page: "demand-intake", roles: chainRole(a.role_id) }); } });
  if (isAdmin || ["LEGAL"].includes(r)) db.rfx_draft_versions.filter((v) => v.approval_status === "IN_REVIEW").forEach((v) => items.push({ gate: "RFx draft review", ref: v.draft_id, t: "rfx_draft_versions", c: "draft_id", what: `${v.rfx_id} v${v.version_number}`, rfx: v.rfx_id, page: "rfx-creation-publish" }));
  if (isAdmin || ["PROC_MGR", "PROC_HEAD", "PROC_TEAM"].includes(r)) db.bid_exceptions.filter((x) => x.resolution_status === "OPEN").forEach((x) => { const b = one(db, "bid_responses", "bid_id", x.bid_id); items.push({ gate: "Bid exception", ref: x.bid_exceptions_id, t: "bid_exceptions", c: "bid_exceptions_id", what: `${nice(x.exception_type)} · ${supName(db, b?.supplier_id)}`, rfx: b?.rfx_id, page: "rfx-creation-publish" }); });
  if (isAdmin || ["PROC_MGR", "PROC_HEAD"].includes(r)) db.rfx_assigned_approvers.filter((a) => a.current_status === "PENDING").forEach((a) => items.push({ gate: "Confirm ranking", ref: a.assignment_id, t: "rfx_assigned_approvers", c: "assignment_id", what: a.rfx_id, rfx: a.rfx_id, page: "evaluation" }));
  if (isAdmin || ["FINANCE"].includes(r)) db.negotiation_insights.filter((n) => !n.approval_flag).forEach((n) => items.push({ gate: "Negotiation envelope", ref: n.insight_id, t: "negotiation_insights", c: "insight_id", what: `${supName(db, n.supplier_id)} · ${n.rfx_id}`, rfx: n.rfx_id, page: "negotiation" }));
  const awardRole = { "Business Owner": ["BIZ_MGR"], "Finance Controller": ["FINANCE"], "Legal Counsel": ["LEGAL"], CPO: ["PROC_HEAD"] };
  db.rfx_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => { if (isAdmin || awardRole[a.approver_role]?.includes(r)) items.push({ gate: "Award approval", ref: a.approval_id, t: "rfx_approvals", c: "approval_id", what: `${a.rfx_id} · step ${a.approval_sequence}`, rfx: a.rfx_id, page: "award" }); });
  const ctrRole = { "Legal Counsel": ["LEGAL", "CONTRACTS"], "Finance Controller": ["FINANCE"], CPO: ["PROC_HEAD"] };
  db.contract_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => { if (isAdmin || ctrRole[a.approver_role]?.includes(r)) items.push({ gate: "Contract sign-off", ref: a.approval_id, t: "contract_approvals", c: "approval_id", what: a.contract_id, page: "new-contract-rollout" }); });
  return items;
}
function HomePage({ db, user, role, setPage, setRfxId, openRecord, level, can }) {
  const queue = myQueue(db, user);
  const mine = db.intake_requests.filter((r) => r.requestor_name === `${user.NAME_FIRST} ${user.NAME_LAST}`);
  const isBiz = ["BIZ_USER", "BIZ_MGR"].includes(user.PLATFORM_ROLE);
  const savings = db.negotiation_finalization.reduce((a, n) => a + n.savings_achieved, 0);
  const active = db.rfx_events.filter((e) => e.status !== "AWARDED");
  const hour = new Date().getHours(); const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const stage = (e) => ({ DRAFT: 1, OPEN: 2, EVALUATION: 3, NEGOTIATION: 4, AWARDED: 5 }[e.status] || 0);
  const kpisByRole = {
    default: [["Active events", active.length, "in the sourcing pipeline"], ["Awaiting me", queue.length, "decisions in my queue"], ["Savings realised", fmtUsd(savings), `${db.negotiation_finalization.length} finalised`], ["Suppliers", db.supplier.length, `${db.supplier.filter((s) => s.kyc_status === "VERIFIED").length} KYC verified`]],
    biz: [["My requests", mine.length, `${mine.filter((r) => r.intake_status === "APPROVED").length} approved`], ["In approval", mine.filter((r) => r.intake_status === "UNDER_REVIEW").length, "with Procurement / Finance / Legal"], ["Linked RFx", mine.filter((r) => r.linked_RFx).length, "sourcing events running"], ["Awaiting me", queue.length, "decisions in my queue"]],
    fin: [["Envelopes to approve", db.negotiation_insights.filter((n) => !n.approval_flag).length, "negotiation targets"], ["Pipeline budget", fmtUsd(db.rfx_events.reduce((a, e) => a + (e.budget_limit_usd || 0), 0)), "approved intake budgets"], ["Savings realised", fmtUsd(savings), "vs. best quote"], ["Awaiting me", queue.length, "decisions in my queue"]],
    legal: [["Drafts in review", db.rfx_draft_versions.filter((v) => v.approval_status === "IN_REVIEW").length, "rfx_draft_versions"], ["Contracts open", db.contract_intake_requests.filter((c) => c.intake_status !== "APPROVED").length, "C1–C4 in flight"], ["Risk assessments", db.contract_risk_assessment.filter((r) => !r.approved_flag).length, "pending acceptance"], ["Awaiting me", queue.length, "decisions in my queue"]],
  };
  const kpis = isBiz ? kpisByRole.biz : user.PLATFORM_ROLE === "FINANCE" ? kpisByRole.fin : ["LEGAL", "CONTRACTS"].includes(user.PLATFORM_ROLE) ? kpisByRole.legal : kpisByRole.default;
  const actions = [
    isBiz && { id: "demand-intake", t: "Raise a sourcing request", d: "AI-guided intake in a few minutes", icon: "💬", primary: true },
    ["PROC_MGR", "PROC_HEAD", "PROC_TEAM", "ADMIN"].includes(user.PLATFORM_ROLE) && { id: "command-center", t: "Open Command Center", d: "Pipeline, deadlines, savings", icon: "📊", primary: true },
    ["FINANCE"].includes(user.PLATFORM_ROLE) && { id: "negotiation", t: "Review negotiation envelopes", d: "Benchmark · target · walk-away", icon: "🎯", primary: true },
    ["LEGAL"].includes(user.PLATFORM_ROLE) && { id: "rfx-creation-publish", t: "Review RFx drafts", d: "Versioned drafts awaiting approval", icon: "📄", primary: true },
    ["CONTRACTS", "LEGAL"].includes(user.PLATFORM_ROLE) && { id: "new-contract-rollout", t: "Contract rollout", d: "C1–C4 intake → approvals", icon: "📝" },
    ["NEGOTIATION"].includes(user.PLATFORM_ROLE) && { id: "negotiation", t: "Run negotiation rounds", d: "Insights and finalisation", icon: "🤝", primary: true },
    ["EXEC"].includes(user.PLATFORM_ROLE) && { id: "command-center", t: "Executive dashboard", d: "Savings and pipeline health", icon: "📈", primary: true },
    level("approvals") && { id: "approvals", t: "Approval dashboard", d: "Everything waiting on a human", icon: "✅" },
    level("rfp-workflow-status") && { id: "rfp-workflow-status", t: "Track an RFx", d: "S1–S12 status", icon: "🧭" },
    level("supplier-performance") && { id: "supplier-performance", t: "Supplier scorecards", d: "KPIs, QBRs, improvement plans", icon: "⭐" },
    can("ADMIN") && { id: "roles-permissions", t: "Roles & Permissions", d: "11 roles · 25 modules", icon: "🛡️" },
  ].filter(Boolean).slice(0, 6);
  return (
    <div className="home">
      <div className="home-hero">
        <div>
          <div className="home-eyebrow">{TODAY_LONG} · {user.ORGEH} · {user.WERKS}</div>
          <h2>{greet}, {user.NAME_FIRST}.</h2>
          <p>{isBiz ? "Raise what your team needs; the platform will run the sourcing and keep you posted at every gate." : user.PLATFORM_ROLE === "EXEC" ? "Here's the state of sourcing across the company — pipeline, savings, and where humans are in the loop." : `You have ${queue.length} decision${queue.length === 1 ? "" : "s"} waiting. Agents have done the preparation; the calls are yours.`}</p>
        </div>
        <div className="home-role" style={{ "--rc": role.color_hex }}><span className="shield" style={{ background: role.color_hex }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/></svg></span><div><div className="hr-role">{role.role_name}</div><div className="hr-meta">{user.PLANS}</div><div className="hr-meta mono">{user.PERSNO} · {user.KOSTL} · {user.BNAME}</div></div></div>
      </div>
      <div className="home-kpis">{kpis.map((k) => <div key={k[0]} className="card home-kpi"><div className="lbl">{k[0]}</div><div className="val">{k[1]}</div><div className="sub">{k[2]}</div></div>)}</div>
      <div className="home-grid">
        <div>
          <div className="section-label" style={{ marginBottom: 10 }}>Quick actions</div>
          <div className="home-actions">{actions.map((a) => <button key={a.id + a.t} className={`home-action ${a.primary ? "primary" : ""}`} onClick={() => setPage(a.id)}><span className="ic">{a.icon}</span><span className="t">{a.t}</span><span className="d">{a.d}</span><span className="arr">→</span></button>)}</div>
          <div className="section-label" style={{ margin: "22px 0 10px" }}>{isBiz ? "My requests" : "Pipeline at a glance"}</div>
          {isBiz ? (
            <div className="card" style={{ padding: 0 }}>{mine.length === 0 && <div className="loading-row">You haven't raised a request yet.</div>}
              {mine.map((r) => { const ch = q(db, "intake_approvals", "request_id", r.request_id).filter((a) => !["ARCHIVED", "RETURNED"].includes(a.approval_status)).sort((a, b) => a.approval_sequence - b.approval_sequence); const e = r.linked_RFx ? one(db, "rfx_events", "rfx_id", r.linked_RFx) : null; return (
                <div key={r.request_id} className="home-req" onClick={() => { if (e) setRfxId(e.rfx_id); setPage(e ? "rfp-workflow-status" : "demand-intake"); }}>
                  <div><div className="t"><Ref t="intake_requests" c="request_id" v={r.request_id} openRecord={openRecord} /> {r.category}</div><div className="d">{r.requirement_description}</div></div>
                  <div className="home-chain">{ch.map((c) => <span key={c.approval_id} className={`hc ${c.approval_status.toLowerCase()}`} title={`${c.approver_role}: ${nice(c.approval_status)}`}>{c.approver_role[0]}</span>)}</div>
                  <div style={{ textAlign: "right" }}><Badge s={r.intake_status} />{e && <div className="d mono">{e.rfx_id} · {nice(e.status)}</div>}</div>
                </div>); })}</div>
          ) : (
            <div className="card" style={{ padding: 0 }}>{db.rfx_events.map((e) => <div key={e.rfx_id} className="home-req" onClick={() => { setRfxId(e.rfx_id); setPage("rfp-workflow-status"); }}><div><div className="t">{e.title}</div><div className="d mono">{e.rfx_id} · {fmtUsd(e.budget_limit_usd)} · due {fmtDate(e.due_date)}</div></div><div className="home-stage">{["Draft", "Open", "Eval", "Nego", "Award"].map((s, i) => <span key={s} className={`hs ${i < stage(e) ? "on" : ""}`} title={s}></span>)}</div><Badge s={e.status} /></div>)}</div>
          )}
        </div>
        <div>
          <div className="section-label" style={{ marginBottom: 10 }}>My queue <span className="badge closing" style={{ marginLeft: 6 }}>{queue.length}</span></div>
          <div className="card" style={{ padding: 0 }}>
            {queue.length === 0 && <div className="loading-row">Nothing is waiting on you. 🎉</div>}
            {queue.slice(0, 8).map((i) => <div key={i.ref} className="home-q" onClick={() => { if (i.rfx) setRfxId(i.rfx); setPage(i.page); }}><div><div className="t">{i.gate}</div><div className="d">{i.what}</div></div><span className="mono d">{i.ref}</span></div>)}
            {queue.length > 8 && <div className="tbl-foot"><a className="rfp-link" onClick={() => setPage("approvals")}>+{queue.length - 8} more in the approval dashboard →</a></div>}
          </div>
          <div className="section-label" style={{ margin: "22px 0 10px" }}>How a request flows</div>
          <div className="card home-flow">{[["Business", "raises the need", "BIZ_USER"], ["Procurement", "validates & sources", "PROC_MGR"], ["Finance", "confirms budget & targets", "FINANCE"], ["Legal", "clears risk & contract", "LEGAL"]].map(([t, d, rid], i) => { const rr = one(db, "platform_roles", "role_id", rid); return <div key={t} className={`hf ${user.PLATFORM_ROLE === rid || (rid === "PROC_MGR" && ["PROC_HEAD", "PROC_TEAM"].includes(user.PLATFORM_ROLE)) || (rid === "BIZ_USER" && user.PLATFORM_ROLE === "BIZ_MGR") ? "me" : ""}`}><span className="n" style={{ background: rr.color_hex }}>{i + 1}</span><div><b>{t}</b><div className="d">{d}</div></div></div>; })}</div>
        </div>
      </div>
    </div>);
}
const TODAY_LONG = new Date(TODAY + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/* ============================= ROLES & PERMISSIONS ============================= */
function RolesPermissions({ db, mutate, push, openRecord, gotoTable, can }) {
  const [sel, setSel] = useState(null);
  const roles = db.platform_roles; const users = (rid) => db.enterprise_user_master.filter((u) => u.PLATFORM_ROLE === rid);
  const mods = (rid) => db.role_module_access.filter((r) => r.role_id === rid);
  const ALLM = ALL_NAV_ITEMS.map((i) => i.id);
  const toggle = (rid, mid) => { if (!can("ADMIN")) { push("Read only", "Only Admins can change permissions."); return; } mutate((d) => { const ex = d.role_module_access.find((r) => r.role_id === rid && r.module_id === mid); if (!ex) d.role_module_access = [...d.role_module_access, { role_id: rid, module_id: mid, access_level: "VIEW" }]; else if (ex.access_level === "VIEW") d.role_module_access = d.role_module_access.map((r) => (r === ex ? { ...r, access_level: "EDIT" } : r)); else if (ex.access_level === "EDIT") d.role_module_access = d.role_module_access.map((r) => (r === ex ? { ...r, access_level: "APPROVE" } : r)); else d.role_module_access = d.role_module_access.filter((r) => r !== ex); }); };
  const exportCsv = () => { const rows = [["role_id", "role_name", "module_id", "access_level"], ...db.role_module_access.map((r) => [r.role_id, one(db, "platform_roles", "role_id", r.role_id)?.role_name, r.module_id, r.access_level])]; download("roles_permissions.csv", rows.map((r) => r.map((v) => `"${v}"`).join(",")).join(" "), "text/csv"); push("Exported", "roles_permissions.csv"); };
  const selRole = sel ? one(db, "platform_roles", "role_id", sel) : null;
  return (
    <div>
      <div className="rp-head"><div><h2 className="page-title" style={{ fontSize: 26 }}>Roles & Permissions</h2><p className="page-desc">Configure access rights and permissions for user roles. Users come from the SAP user master; roles decide which modules they see and whether they can view, edit or approve.</p></div><button className="btn btn-ghost" onClick={exportCsv}>⬇ Export</button></div>
      <div className="rp-grid">{roles.map((r) => <div key={r.role_id} className={`card rp-card ${sel === r.role_id ? "on" : ""}`} onClick={() => setSel(sel === r.role_id ? null : r.role_id)}><span className="shield lg" style={{ background: r.color_hex }}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/></svg></span><h3>{r.role_name}</h3><p>{r.description}</p><div className="rp-meta"><span>👥 {users(r.role_id).length} users</span><b>{mods(r.role_id).length} modules</b></div></div>)}</div>
      {selRole && (
        <div className="rp-detail">
          <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Users · enterprise_user_master · {selRole.role_name}</h3><span className="muted" style={{ fontSize: 12 }}>MANDT 100</span></div>
            <table><thead><tr><th>BNAME</th><th>Name</th><th>PERSNO</th><th>ORGEH</th><th>KOSTL</th><th>WERKS</th><th>PLANS</th><th>Manager</th><th>Valid to</th></tr></thead><tbody>{users(selRole.role_id).map((u) => <tr key={u.BNAME}><td><Ref t="enterprise_user_master" c="BNAME" v={u.BNAME} openRecord={openRecord} /></td><td>{u.NAME_FIRST} {u.NAME_LAST}<div className="muted" style={{ fontSize: 11 }}>{u.SMTP_ADDR}</div></td><td className="mono">{u.PERSNO}</td><td>{u.ORGEH}</td><td className="mono">{u.KOSTL}</td><td className="mono">{u.WERKS}</td><td>{u.PLANS}</td><td className="mono">{u.MANAGER_BNAME || "—"}</td><td className="mono">{u.GLTGB}</td></tr>)}</tbody></table></div>
          <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Module access · role_module_access</h3><span className="muted" style={{ fontSize: 12 }}>{can("ADMIN") ? "click a cell to cycle none → view → edit → approve" : "read only"}</span></div>
            <div className="rp-matrix">{ALLM.map((m) => { const a = mods(selRole.role_id).find((x) => x.module_id === m); const lvl = a?.access_level; return <div key={m} className={`rp-cell ${lvl ? lvl.toLowerCase() : "none"}`} onClick={() => toggle(selRole.role_id, m)}><span className="mono">{m}</span><span className="lv">{lvl ? lvl.toLowerCase() : "—"}</span></div>; })}</div></div>
        </div>)}
      <div className="rp-detail" style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Approval routing by role</h3></div><table><thead><tr><th>Gate</th><th>Sequence</th><th>Roles that can act</th></tr></thead><tbody>{[["Intake approval", "Procurement → Finance → Legal", "Procurement Manager / Head → Finance → Legal"], ["Shortlist confirm", "single", "Procurement Manager / Head"], ["RFx draft approval", "single", "Legal"], ["Publish RFx", "single", "Procurement Manager / Head / Team"], ["Bid exception", "single", "Procurement Team / Manager"], ["Confirm ranking", "single", "Procurement Manager / Head"], ["Negotiation envelope", "single", "Finance"], ["Finalise negotiation", "single", "Negotiation / Procurement"], ["Award", "Business → Finance → Legal → CPO", "Business Manager → Finance → Legal → Procurement Head"], ["Contract sign-off", "Legal → Finance → CPO", "Legal / Contracts → Finance → Procurement Head"]].map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div>
        <DataTable db={db} t="enterprise_user_master" rows={db.enterprise_user_master} cols={["BNAME", "NAME_FIRST", "NAME_LAST", "PLATFORM_ROLE", "ORGEH", "PLANS", "MANAGER_BNAME"]} openRecord={openRecord} gotoTable={gotoTable} />
      </div>
    </div>);
}

const roleCanAct = (can, roleId) => roleId === "PROC_MGR" ? can("PROC_MGR", "PROC_HEAD") : can(roleId);
function buildIntakeChain(d, requestId, budget) {
  const wf = resolveWorkflow(d, "Demand Intake", { approved_budget: budget || 0 });
  const steps = wf ? wfSteps(d, wf.workflow_id) : [{ step_name: "Business Manager Approval", approver_role_id: "BIZ_MGR" }];
  const label = { PROC_MGR: "Procurement", PROC_HEAD: "Procurement Head", FINANCE: "Finance", LEGAL: "Legal", BIZ_MGR: "Business Manager", CONTRACTS: "Contracts", EXEC: "Executive", NEGOTIATION: "Negotiation", ADMIN: "Admin" };
  let seq = d.intake_approvals.length;
  return steps.map((st, k) => ({ approval_id: `IAP-${String(++seq).padStart(3, "0")}`, request_id: requestId, approval_sequence: k + 1, approver_role: label[st.approver_role_id] || st.approver_role_id, role_id: st.approver_role_id, approver_bname: d.enterprise_user_master.find((u) => u.PLATFORM_ROLE === st.approver_role_id && !u.UFLAG)?.BNAME || null, approval_status: k === 0 ? "PENDING" : "QUEUED", comments: null, approved_at: null }));
}

/* ============================= AI INTAKE CHATBOT ============================= */
const CB_SECTIONS = [
  { id: "requestor", title: "Requestor Details", fields: [] },
  { id: "need", title: "Business Need", fields: ["category", "requestType", "procurementType", "priority", "requirementDescription", "businessOutcome", "impactIfNotProcured"], opener: "What do you need to source, and why?" },
  { id: "scope", title: "Scope of Work", fields: ["scopeDescription", "deliverables", "geographyCoverage", "transitionRequirement"], opener: "What should the supplier deliver, and where?" },
  { id: "specs", title: "Specifications", fields: ["specificationType", "complianceRequirements", "dataSecurity", "esgRequirement"], opener: "Any compliance, security or ESG requirements?" },
  { id: "budget", title: "Budget & Finance", fields: ["approvedBudget", "currency", "capexOpex", "costCenter"], opener: "Approved budget, and Capex or Opex?" },
  { id: "timeline", title: "Timeline", fields: ["rfpIssueDate", "awardDate", "serviceStartDate"], opener: "When should service start, and by when is award needed?" },
  { id: "supplier", title: "Supplier Info", fields: ["incumbentSupplier", "suggestedSuppliers", "sourcingApproach", "contractType", "duration", "paymentTerms"], opener: "Incumbent, suppliers to invite, contract type and term?" },
  { id: "review", title: "Review & Submit", fields: [] },
];
const CB_FIELD_HELP = { category: `one of: ${["IT Services", "Software & SaaS", "Cloud Infrastructure", "IT Hardware", "Facilities Management", "Logistics & Freight", "Marketing Services", "Professional Services"].join(", ")}`, requestType: "Services | Goods | Goods & Services | Software", procurementType: "Strategic Sourcing | Tactical Sourcing | Renewal", priority: "LOW | MEDIUM | HIGH | CRITICAL", approvedBudget: "number in USD, no symbols", currency: "ISO code", capexOpex: "CAPEX | OPEX", rfpIssueDate: "YYYY-MM-DD", awardDate: "YYYY-MM-DD", serviceStartDate: "YYYY-MM-DD", geographyCoverage: "comma-separated country list", complianceRequirements: "comma-separated standards e.g. ISO 27001, SOC 2, GDPR", suggestedSuppliers: "comma-separated supplier names", sourcingApproach: "RFP | RFQ | RFI", duration: "years as a number", paymentTerms: "days as a number", incumbentSupplier: "supplier name or empty" };
const DOMAINS_CB = {
  manufacturing: { name: "Manufacturing & capital equipment", probe: "quantities, sites / plants, installation & commissioning, warranty and spares, delivery phasing", first: ["1,000 heavy HVAC units for new factories", "Replacement of 6 rooftop chillers", "CNC machines for the Pune plant"],
    openers: { need: "What equipment or materials do you need, for which plants, and why now?", scope: "How many units, which sites, and do you need installation, commissioning or training included?", specs: "Any technical standards, certifications (CE, ISO 9001, safety) or energy-efficiency requirements?", budget: "Approved Capex, and is it split across plants or a single budget?", timeline: "When must equipment be on site, and by when should the order be placed?", supplier: "Any incumbent OEM, preferred brands, or a warranty / spares expectation?" },
    chips: { need: ["1,000 heavy HVAC units for new factories in India and Vietnam", "Plant expansion — new production line equipment", "Critical — commissioning slips otherwise"], scope: ["Supply, delivery, installation and commissioning", "Phased delivery to 4 plants", "Operator training included"], specs: ["CE marking and ISO 9001", "Energy efficiency class A", "5-year warranty with spares kit"], budget: ["USD 5 million, Capex", "USD 1.4M Capex, single budget"], timeline: ["On site by 2027-03-01", "Order placed by end of November"], supplier: ["Incumbent is Daikin", "Open to new OEMs", "5-year warranty expected"] } },
  it_services: { name: "IT services & support", probe: "coverage hours, SLA targets, ticket volumes, transition from incumbent, tooling", first: ["24×7 managed infrastructure support", "Service desk outsourcing for 12,000 users", "Application managed services for SAP"],
    openers: { need: "Which service do you need — infrastructure, application, service desk — and what's driving it?", scope: "What's in scope (L1–L3, monitoring, patching), what coverage hours, and roughly how many users or devices?", specs: "Security certifications (ISO 27001, SOC 2), data residency or SLA targets you need?", budget: "Approved Opex per year, and is there a transition budget?", timeline: "When does the current contract end, and when should the new service start?", supplier: "Who is the incumbent, anyone you want invited, and preferred contract term?" },
    chips: { need: ["24×7 managed infrastructure support across India, US and UK", "Service desk for 12,000 users", "High priority — incumbent contract expires Q4"], scope: ["L1–L3 support, monitoring and patching", "Follow-the-sun coverage", "6-week transition from incumbent"], specs: ["ISO 27001 and SOC 2 required", "Data must stay in-region", "P1 restore within 4 hours"], budget: ["USD 1.2M per year, Opex", "USD 4.2M over 3 years"], timeline: ["Service start 2027-01-01", "Award by end of November"], supplier: ["Incumbent is TCS", "Invite Accenture and Infosys too", "3-year MSA, Net 45"] } },
  software: { name: "Software & SaaS", probe: "user counts and licence model, integrations, data residency, renewal dates", first: ["Renewal of 3,200 M365 E5 licences", "New CRM platform for sales", "Data platform tooling"],
    openers: { need: "Which software or platform, for how many users, and is this new or a renewal?", scope: "Which modules, integrations (SAP, Workday, Salesforce) and licence model do you need?", specs: "Security (SOC 2, ISO 27001), data residency, SSO / accessibility requirements?", budget: "Approved Opex per year, and is the licence count fixed or growing?", timeline: "Renewal or go-live date, and when do you need commercials agreed?", supplier: "Current vendor, alternatives to consider, and preferred term?" },
    chips: { need: ["Renew 3,200 M365 E5 licences with Copilot", "New CRM for 800 sales users", "High — licences lapse 31 Dec"], scope: ["Per-user subscription, SSO integration", "Integrate with SAP and Workday", "Enterprise agreement"], specs: ["SOC 2 Type II and ISO 27001", "EU data residency", "WCAG 2.1 accessibility"], budget: ["USD 2.65M over 3 years, Opex", "USD 600K per year"], timeline: ["Go-live 2027-01-01", "Renewal date 2026-12-31"], supplier: ["Incumbent is Microsoft", "Consider Google Workspace", "3-year enterprise agreement"] } },
  facilities: { name: "Facilities & workplace", probe: "sites and floor area, service lines, hours, headcount, H&S compliance", first: ["Integrated facilities management for 4 offices", "Security guarding and reception", "Rooftop chiller replacement"],
    openers: { need: "Which sites and service lines (cleaning, HVAC, security, reception) do you need covered, and why now?", scope: "How many sites and m², which services, and what hours of cover?", specs: "H&S, ISO 41001 / 14001 or sustainability requirements?", budget: "Approved Opex per year for the sites in scope?", timeline: "When do current contracts end, and when should mobilisation complete?", supplier: "Incumbent providers, preferred partners, and contract term?" },
    chips: { need: ["Integrated FM for four Nordic offices (34,000 m²)", "Security and reception for 3 sites", "Medium — contracts expire Q1 2027"], scope: ["Cleaning, HVAC maintenance, reception, waste", "Sweden, Norway, Denmark, Finland", "8-week mobilisation"], specs: ["ISO 41001 and ISO 14001", "Living-wage commitment", "Monthly H&S reporting"], budget: ["USD 1.15M per year, Opex", "USD 780K per year"], timeline: ["Mobilise by 2027-01-01", "Award by mid-October"], supplier: ["Incumbent is Nordic FM Partners", "Single accountable IFM partner", "3-year framework, Net 30"] } },
  logistics: { name: "Logistics & freight", probe: "lanes and volumes (TEU / tonnes), incoterms, service levels, peak season", first: ["Ocean & air freight on transatlantic lanes", "Warehouse operations in APAC", "Reverse logistics for returns"],
    openers: { need: "Which lanes or operations, what volumes, and what's the problem to solve?", scope: "Modes (ocean, air, road), lanes, annual volumes and incoterms?", specs: "C-TPAT / AEO, tracking, OTIF targets or sustainability requirements?", budget: "Approved Opex per year, and is it rate-card or fixed?", timeline: "When do current rates expire, and when should the new agreement start?", supplier: "Incumbent forwarder, others to invite, and agreement term?" },
    chips: { need: ["1,800 TEU ocean and 240 t air on US–EU lanes", "Reverse logistics for US e-commerce returns", "Low — spot-rate exposure in peak"], scope: ["FCL/LCL ocean, air freight, customs brokerage", "US, Netherlands, Germany", "DAP incoterms"], specs: ["C-TPAT and AEO certified", "96% OTIF target", "Monthly emissions report"], budget: ["USD 2.4M per year, Opex", "USD 380K per year"], timeline: ["Start 2026-11-15", "Rates fixed for 12 months"], supplier: ["Incumbent is Meridian Freight", "Invite two more forwarders", "12-month rate agreement"] } },
  professional: { name: "Professional & advisory services", probe: "deliverables, engagement model, duration, seniority mix, success criteria", first: ["Data platform modernisation advisory", "PMO for the ERP consolidation programme", "Marketing agency of record"],
    openers: { need: "What outcome do you need help with, and what expertise is missing internally?", scope: "Key deliverables, engagement model (fixed price / T&M) and expected duration?", specs: "Confidentiality, SOC 2, conflict-of-interest or IP requirements?", budget: "Approved Opex, and fixed price or capped T&M?", timeline: "When should the engagement start and end?", supplier: "Any incumbent advisor, firms to invite, and contract type (SOW)?" },
    chips: { need: ["Data platform modernisation advisory", "PMO for the 18-month ERP consolidation", "Medium priority — roadmap due Q1"], scope: ["Architecture blueprint, roadmap, TCO model", "Fixed price with milestones", "6-month engagement"], specs: ["SOC 2 and NDA required", "IP assigned to us", "No conflict with current vendors"], budget: ["USD 650K, Opex, fixed price", "USD 1.9M capped T&M"], timeline: ["Start 2026-11-01", "Complete by 2027-04-30"], supplier: ["No incumbent", "Invite Accenture and Capgemini", "Statement of Work"] } },
};
const inferDomain = (user, text) => { const t = (text || "").toLowerCase(); const org = (user?.ORGEH || "").toLowerCase();
  if (/hvac|chiller|machine|equipment|plant|factory|factories|production|cnc|forklift|crane|capex/.test(t)) return "manufacturing";
  if (/licen|saas|software|m365|office 365|crm|erp platform|subscription|copilot/.test(t)) return "software";
  if (/freight|logistic|warehouse|shipping|lane|teu|returns/.test(t)) return "logistics";
  if (/facilit|cleaning|reception|security guard|office|hvac maintenance|workplace/.test(t)) return "facilities";
  if (/advis|consult|pmo|agency|programme management|roadmap/.test(t)) return "professional";
  if (/support|infra|network|service desk|managed|cloud|migration|application|ams|it /.test(t)) return "it_services";
  if (/supply chain|logistic/.test(org)) return "logistics"; if (/real estate|facilit|workplace/.test(org)) return "facilities"; if (/it|technology|data/.test(org)) return "it_services"; if (/manufactur|plant|operations/.test(org)) return "manufacturing"; return null; };
const CB_LABEL = { category: "Category", requestType: "Request type", procurementType: "Procurement type", priority: "Priority", requirementDescription: "Requirement", businessOutcome: "Business outcome", impactIfNotProcured: "Impact if not procured", scopeDescription: "Scope", deliverables: "Deliverables", geographyCoverage: "Geography", transitionRequirement: "Transition", specificationType: "Spec type", complianceRequirements: "Compliance", dataSecurity: "Data security", esgRequirement: "ESG", approvedBudget: "Budget", currency: "Currency", capexOpex: "Capex / Opex", costCenter: "Cost center", rfpIssueDate: "RFP issue date", awardDate: "Award date", serviceStartDate: "Service start", incumbentSupplier: "Incumbent", suggestedSuppliers: "Suggested suppliers", sourcingApproach: "Approach", contractType: "Contract type", duration: "Duration (yrs)", paymentTerms: "Payment terms (days)" };
const lbl = (f) => CB_LABEL[f] || nice(f);
const CB_CHIPS = { need: ["24×7 managed infrastructure support", "SaaS licences renewal", "Facilities management for our offices", "It's high priority — contract expires Q4"], scope: ["L1–L3 support, monitoring and patching", "India, US and UK", "6-week transition from incumbent"], specs: ["ISO 27001 and SOC 2 required", "Data must stay in-region", "EcoVadis score ≥ 45"], budget: ["USD 1.2M approved, Opex", "Around 500K, Capex"], timeline: ["Service start 1 January 2027", "Award by end of November"], supplier: ["Incumbent is TCS", "Invite Accenture and Infosys too", "3-year MSA, Net 45"] };

const ESG_STANDARD = "We are committed to building a sustainable, ethical, and resilient supply chain. We recognize that our procurement decisions have a global impact, and we actively seek to partner with suppliers who share our dedication to Environmental, Social, and Governance (ESG) principles. As part of this RFP, vendors will be evaluated not only on cost and quality, but also on their alignment with our core ESG expectations.";
const CB_STAGES = ["Requestor Details", "Business Need", "Key Details", "AI Draft & Review", "Save & Route"];
const CB_QUESTIONS = [
  { key: "businessOutcome", q: "What is the **business outcome** you're aiming for?", chips: ["Manufacturing base expansion — new factories across India and Vietnam", "Cost optimisation and uptime above 99.9%"] },
  { key: "impactIfNotProcured", q: "What happens if this is **not procured**?", chips: ["Business expansion plan gets delayed", "SLA penalties and operational downtime"] },
  { key: "capexOpex", q: "Should this be treated as **Capex** or **Opex**?", chips: ["Capex", "Opex"] },
  { key: "approvedBudget", q: "What is the **budget**?", chips: ["5 million USD", "1.2M USD"] },
  { key: "contractType", q: "Do you have a **contract type** in mind?", chips: ["Long-term sourcing and support", "3-year Master Services Agreement"] },
];
const CB_ALL_FIELDS = ["category", "requestType", "procurementType", "priority", "requirementDescription", "businessOutcome", "impactIfNotProcured", "scopeDescription", "deliverables", "geographyCoverage", "specificationType", "complianceRequirements", "esgRequirement", "approvedBudget", "currency", "capexOpex", "contractType", "duration", "sourcingApproach", "incumbentSupplier", "suggestedSuppliers", "rfpIssueDate", "awardDate", "serviceStartDate"];

// Offline drafting so the demo never stalls when the AI is unavailable
function draftFallback(db, need, details, form) {
  const t = `${need} ${details}`; const lower = t.toLowerCase(); const out = {};
  const budgetSrc = (details.match(/budget[^;.]*/i) || [details])[0];
  const money = budgetSrc.match(/(?:usd|\$|eur|€)?\s*([\d.,]+)\s*(million|mn|m\b|k\b|thousand|lakh|crore)?/i);
  if (form.approvedBudget) out.approvedBudget = Number(form.approvedBudget);
  else if (money) { let n = parseFloat(money[1].replace(/,/g, "")); const u = (money[2] || "").toLowerCase(); if (/million|mn|^m$/.test(u)) n *= 1e6; else if (/k|thousand/.test(u)) n *= 1e3; else if (u === "crore") n *= 1e7; else if (u === "lakh") n *= 1e5; if (n >= 1000) out.approvedBudget = Math.round(n); }
  out.capexOpex = /capex|capital/.test(lower) ? "CAPEX" : /opex/.test(lower) ? "OPEX" : form.capexOpex;
  out.priority = /critical|urgent/.test(lower) ? "CRITICAL" : /high/.test(lower) ? "HIGH" : /low/.test(lower) ? "LOW" : "MEDIUM";
  const catRules = [[/ac\b|hvac|ivac|air.?condition|equipment|machine|factory|plant|crane|forklift/, "Capital Equipment", "Goods", "Capital Equipment"], [/cloud|aws|azure|migration/, "Cloud Infrastructure", "Services", "Strategic Sourcing"], [/saas|software|licen|erp|crm/, "Software & SaaS", "Software", "Strategic Sourcing"], [/facilit|cleaning|office|hvac maintenance/, "Facilities Management", "Goods & Services", "Tactical Sourcing"], [/freight|logistic|shipping|warehouse/, "Logistics & Freight", "Services", "Tactical Sourcing"], [/laptop|device|hardware|server|network switch/, "IT Hardware", "Goods", "Tactical Sourcing"], [/marketing|agency|campaign|brand/, "Marketing Services", "Services", "Tactical Sourcing"], [/consult|advis/, "Professional Services", "Services", "Strategic Sourcing"], [/telecom|sim|connectivity/, "Telecom", "Services", "Tactical Sourcing"], [/mro|spare|maintenance/, "MRO", "Goods", "Tactical Sourcing"]];
  const cr = catRules.find((r) => r[0].test(lower)) || [null, "IT Services", "Services", "Strategic Sourcing"];
  out.category = cr[1]; out.requestType = cr[2]; out.procurementType = cr[3];
  const geos = ["India", "Vietnam", "United States", "United Kingdom", "Germany", "Sweden", "Netherlands", "France", "Singapore", "China", "Japan", "Mexico", "Brazil"].filter((g) => lower.includes(g.toLowerCase()) || (g === "United States" && /\bus\b|usa/.test(lower)) || (g === "United Kingdom" && /\buk\b/.test(lower)));
  out.geographyCoverage = geos.join(", ");
  const qty = need.match(/([\d,]+)\s*(?:x\s*)?([A-Za-z][A-Za-z\s\-]{2,40}?)(?:\s+(?:for|to|across|in)\b|$)/); const item = qty ? `${Number(qty[1].replace(/,/g, "")).toLocaleString()} ${qty[2].trim()}` : need.trim();
  // clause-level classification: split the answer, bucket each clause by its keyword, unlabeled clauses follow the previous bucket
  const buckets = { outcome: [], impact: [], spend: [], budget: [], contract: [], other: [] }; let cur = "other";
  details.split(/[,;.\n]+/).map((x) => x.trim()).filter(Boolean).forEach((cl) => { const l = cl.toLowerCase(); if (/outcome/.test(l)) cur = "outcome"; else if (/not procured|if not|otherwise/.test(l)) cur = "impact"; else if (/spend type|capex|opex/.test(l)) cur = "spend"; else if (/budget|usd|\$/.test(l)) cur = "budget"; else if (/contract/.test(l)) cur = "contract"; buckets[cur].push(cl); });
  const tidy = (arr, re) => { const txt = arr.map((c) => c.replace(re, "").trim()).filter(Boolean).join(", "); return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) + "." : ""; };
  out.businessOutcome = form.businessOutcome || tidy([...buckets.other.filter((c) => /factor|expan|site|activat|launch|grow/i.test(c)), ...buckets.outcome], /^(the\s+)?business\s+outcome\s*(is|:)?\s*/i);
  out.impactIfNotProcured = form.impactIfNotProcured || tidy(buckets.impact, /^(if\s+(this\s+is\s+)?not\s+procured\s*:?,?\s*)/i);
  out.contractType = (form.contractType && form.contractType !== "Master Services Agreement" ? form.contractType : "") || tidy(buckets.contract.slice(0, 1), /^(the\s+)?contract\s+type\s*(is|:)?\s*/i).replace(/\.$/, "") || form.contractType || "Master Services Agreement";
  if (!out.approvedBudget && form.approvedBudget) out.approvedBudget = form.approvedBudget; if (form.capexOpex && !/capex|opex/.test(lower)) out.capexOpex = form.capexOpex;
  const yrs = t.match(/(\d+)\s*-?\s*year/i); if (yrs) out.duration = Number(yrs[1]); else if (/long.?term/.test(lower)) out.duration = 3;
  out.requirementDescription = `Procurement of ${item}${geos.length ? ` to support ${/factor|plant|site/.test(lower) ? "new factory activations" : "operations"} across ${geos.join(" and ")}` : ""}.`;
  out.scopeDescription = /Goods/.test(out.requestType) ? `Supply, delivery, and support for ${item} required for ${/factor|plant/.test(lower) ? "factory setup and operational readiness" : "business operations"}${geos.length ? ` across targeted sites in ${geos.join(" and ")}` : ""}.` : `End-to-end delivery of ${item}${geos.length ? ` across ${geos.join(", ")}` : ""}, including transition, service management and reporting.`;
  out.deliverables = /Goods/.test(out.requestType) ? `${item}; site delivery; installation support; ${/long.?term|support/.test(lower) ? "long-term sourcing and support services." : "warranty and after-sales support."}` : `Service delivery per SLA; monthly reporting; governance reviews; transition plan.`;
  if (form.scopeDescription && form.scopeDescription.length > 30) out.scopeDescription = form.scopeDescription; if (form.deliverables && !/^(next|none)$/i.test(form.deliverables)) out.deliverables = form.deliverables; if (form.geographyCoverage) out.geographyCoverage = form.geographyCoverage; if (form.complianceRequirements) out.complianceRequirements = form.complianceRequirements;
  out.specificationType = "Technical"; out.esgRequirement = ESG_STANDARD; out.sourcingApproach = form.sourcingApproach || "RFP";
  const supNames = db.supplier.slice(0, 12).filter((x) => lower.includes(x.name.toLowerCase().split(" ")[0])).map((x) => x.name); if (supNames.length) out.suggestedSuppliers = supNames.join(", ");
  return out;
}

function IntakeChatbot({ db, mutate, push, user, actor, form, setForm, onSubmitted }) {
  const [step, setStep] = useState(1);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const intakeChat = trpc.intake.chat.useMutation();
  const providerStatus = trpc.settings.aiProvider.useQuery(undefined, { retry: 1, refetchOnWindowFocus: false });
  const conversationRef = useRef("");
  const [providerUsed, setProviderUsed] = useState(null);
  const chatHistory = () => msgs.filter((m) => (m.role === "user" || m.role === "bot") && typeof m.text === "string").slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
  const askIntakeAgent = async (section, userMessage, captured, mode = "chat", history = chatHistory()) => {
    const result = await intakeChat.mutateAsync({
      section: { id: section.id, title: section.title, fields: section.fields },
      fieldHelp: Object.fromEntries(section.fields.map((field) => [field, CB_FIELD_HELP[field] || "free text"])),
      captured,
      userMessage,
      history,
      mode,
      conversationId: conversationRef.current || undefined,
      context: { requestType: form.requestType, category: form.category, procurementType: form.procurementType, priority: form.priority },
    });
    if (result.conversationId) conversationRef.current = result.conversationId;
    setProviderUsed(result.provider || null);
    return result;
  };
  const [saving, setSaving] = useState(false); const [done, setDone] = useState(false); const [drafted, setDrafted] = useState(false);
  const [domain, setDomain] = useState(() => (IS_V4 ? inferDomain(user, "") : null));
  const prof = domain ? DOMAINS_CB[domain] : null;
  const opener = (sec) => (IS_V4 && prof && prof.openers[sec.id]) || sec.opener;
  const chipsFor = (sec) => (IS_V4 && prof && prof.chips[sec.id]) || CB_CHIPS[sec.id] || [];
  const bodyRef = useRef(null);
  const sec = CB_SECTIONS[step];
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  useEffect(() => { const p0 = IS_V4 ? DOMAINS_CB[inferDomain(user, "")] : null; const ctxLine = p0 ? ` I see you're in ${user.ORGEH} — I'll probe for ${p0.name.toLowerCase()} details (${p0.probe.split(",").slice(0, 3).join(",")}).` : ""; const first = p0 ? p0.openers.need : CB_SECTIONS[1].opener; setMsgs([{ role: "bot", text: actor && actor.BNAME !== user.BNAME ? `Raising on behalf of ${user.NAME_FIRST} ${user.NAME_LAST} (${user.ORGEH}).${ctxLine} ${first}` : `Hi ${user.NAME_FIRST}. Your details are in from SAP (${user.ORGEH}, ${user.PLANS}).${ctxLine} ${first}` }]); }, []);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, busy]);
  const pct = Math.round((step / (CB_SECTIONS.length - 1)) * 100);
  const missing = (s) => s.fields.filter((f) => form[f] === "" || form[f] === null || form[f] === undefined);
  const need = () => form.requirementDescription || "";
  const draft = async (needText, detailsText, current) => {
    setBusy(true); let out = null;
    if (!offline) {
      try {
        const result = await askIntakeAgent({ id: "review", title: "Requirement review", fields: CB_ALL_FIELDS }, `Need: ${needText}\n\nDetails: ${detailsText}. Preserve the captured values and extract only facts supported by the requester.`, current, "chat");
        out = result.extracted || {};
      } catch (e) { setOffline(true); push("AI unavailable — drafting in guided mode", e.message.slice(0, 120)); }
    }
    if (!out) out = draftFallback(db, needText, detailsText, current);
    const clean = {}; CB_ALL_FIELDS.forEach((f) => { if (out[f] !== undefined && out[f] !== null && out[f] !== "") clean[f] = out[f]; });
    set(clean); setBusy(false); return clean;
  };
  const finalize = (submit) => {
    setSaving(true);
    const bu = user.ORGEH; let first = "Procurement", n = 3;
    mutate((d) => { writeIntake(d, { ...form, businessUnit: bu }, submit ? "UNDER_REVIEW" : "DRAFT"); if (submit) { const chain = buildIntakeChain(d, form.requestId, Number(form.approvedBudget) || 0); first = chain[0]?.approver_role; n = chain.length; d.intake_approvals = [...d.intake_approvals.filter((a) => a.request_id !== form.requestId), ...chain]; } else d.intake_approvals = d.intake_approvals.filter((a) => a.request_id !== form.requestId); });
    setMsgs((m) => [...m, { role: "bot", done: true, text: submit ? `Saved successfully under request #${form.requestId} — status Submitted, routed for ${first} approval (step 1 of ${n}). You can find it in Demand Intake.` : `Saved successfully under request #${form.requestId} — status In Process. Open it from Demand Intake to review and submit for approval.` }]);
    push(submit ? "Request submitted" : "Draft saved", form.requestId); setDone(true);
  };
  const Rich = ({ text }) => <span dangerouslySetInnerHTML={{ __html: String(text).replace(/</g, "<").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }} />;
  const KV = ({ rows }) => <div className="pa-kv">{rows.map(([k, v]) => <React.Fragment key={k}><div className="k">{k}</div><div className="v">{v || <span className="muted">—</span>}</div></React.Fragment>)}</div>;
  const RequestCard = () => (
    <div className="pa-req-card">
      <div className="pa-req-head"><div><b>Requirement Request</b> <span className="di2-id" style={{ fontSize: 13 }}>#{form.requestId}</span></div><div className="muted" style={{ fontSize: 11.5 }}>Created: {TODAY} · Status: {done ? nice(form.intakeStatus) : "In Process"} · Priority: <Badge s={form.priority} /></div></div>
      <div className="pa-req-grid">
        <div><h5>Requestor & Categorization</h5><KV rows={[["Requestor", `${form.requestorName} (${user.SMTP_ADDR})`], ["Business unit", user.ORGEH], ["Location / Cost center", `${user.WERKS} / ${form.costCenter}`], ["Request type", form.requestType], ["Category", form.category], ["Procurement type", form.procurementType], ["Linked RFx", null]]} /></div>
        <div><h5>Requirement Summary</h5><KV rows={[["Description", form.requirementDescription], ["Business outcome", form.businessOutcome], ["Impact if not procured", form.impactIfNotProcured]]} /></div>
        <div><h5>Scope and Deliverables</h5><KV rows={[["Specification type", form.specificationType], ["Geography coverage", form.geographyCoverage], ["Scope description (technical spec)", form.scopeDescription], ["Key deliverables", form.deliverables], ["Transition requirement", form.transitionRequirement], ["Compliance requirements", form.complianceRequirements]]} /></div>
        <div><h5>Commercials & Timeline</h5><KV rows={[["Approved budget", form.approvedBudget ? `${Number(form.approvedBudget).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${form.currency}` : null], ["Spend classification", form.capexOpex], ["Contract type", `${form.contractType || "—"}${form.duration ? ` · ${form.duration} yr` : ""}`], ["Projected timeline", `Sourcing start: ${form.sourcingStartDate || "—"} · RFP issue: ${form.rfpIssueDate || "—"} · Award: ${form.awardDate || "—"} · Service start: ${form.serviceStartDate || "—"}`]]} /></div>
      </div>
      <div className="pa-req-esg"><h5>ESG Requirements</h5><p>{form.esgRequirement || ESG_STANDARD}</p></div>
    </div>);

  const fallbackExtract = (text, s) => { // offline heuristic so the demo never stalls
    const out = {}; const t = text; const lower = t.toLowerCase();
    const money = t.match(/(?:usd|\$|eur|€)?\s*([\d.,]+)\s*(m|million|k|thousand)?/i);
    if (s.id === "budget" && money) { let n = parseFloat(money[1].replace(/,/g, "")); if (/m/i.test(money[2] || "")) n *= 1e6; if (/k|thousand/i.test(money[2] || "")) n *= 1e3; if (n > 1000) out.approvedBudget = Math.round(n); if (/capex/i.test(lower)) out.capexOpex = "CAPEX"; if (/opex/i.test(lower)) out.capexOpex = "OPEX"; const cc = t.match(/CC-\d{4}/i); if (cc) out.costCenter = cc[0].toUpperCase(); }
    if (s.id === "need") { if (/critical/.test(lower)) out.priority = "CRITICAL"; else if (/high|urgent/.test(lower)) out.priority = "HIGH"; else if (/low/.test(lower)) out.priority = "LOW"; if (/cloud|aws|azure/.test(lower)) out.category = "Cloud Infrastructure"; else if (/saas|software|licen/.test(lower)) out.category = "Software & SaaS"; else if (/facilit|cleaning|office/.test(lower)) out.category = "Facilities Management"; else if (/freight|logistic|shipping/.test(lower)) out.category = "Logistics & Freight"; else if (/hardware|laptop|device/.test(lower)) out.category = "IT Hardware"; else if (/advis|consult/.test(lower)) out.category = "Professional Services"; else if (/it|infra|support|network/.test(lower)) out.category = "IT Services"; if (!form.requirementDescription) out.requirementDescription = t; else if (!form.businessOutcome) out.businessOutcome = t; else out.impactIfNotProcured = t; }
    if (s.id === "scope") { const geos = ["India", "United States", "United Kingdom", "Germany", "Sweden", "Netherlands", "France", "Singapore"].filter((g) => lower.includes(g.toLowerCase()) || (g === "United States" && /\bus\b|usa/.test(lower)) || (g === "United Kingdom" && /\buk\b/.test(lower))); if (geos.length) out.geographyCoverage = geos.join(", "); if (/transition|week/.test(lower)) out.transitionRequirement = t; else if (!form.scopeDescription) out.scopeDescription = t; else out.deliverables = t; }
    if (s.id === "specs") { const stds = ["ISO 27001", "SOC 2", "GDPR", "HIPAA", "PCI DSS", "ISO 14001", "ISO 9001"].filter((x) => lower.replace(/\s/g, "").includes(x.toLowerCase().replace(/\s/g, ""))); if (stds.length) out.complianceRequirements = stds.join(", "); if (/region|resid|pii|data/.test(lower)) out.dataSecurity = t; if (/ecovadis|esg|emission|sustain/.test(lower)) out.esgRequirement = t; if (!Object.keys(out).length) out.specificationType = t; }
    if (s.id === "timeline") { const iso = t.match(/\d{4}-\d{2}-\d{2}/g) || []; const key = /start/.test(lower) ? "serviceStartDate" : /award/.test(lower) ? "awardDate" : "rfpIssueDate"; if (iso[0]) out[key] = iso[0]; else { const d = Date.parse(t.replace(/(\d+)(st|nd|rd|th)/, "$1")); if (!isNaN(d)) out[key] = new Date(d).toISOString().slice(0, 10); } }
    if (s.id === "supplier") { const names = db.supplier.filter((x) => lower.includes(x.name.toLowerCase().split(" ")[0].toLowerCase())).map((x) => x.name); const incM = lower.match(/(?:incumbent|current(?:ly)?(?: supplier)?)\s*(?:is|:|-)?\s*([a-z]+)/); const inc = incM ? names.find((n) => n.toLowerCase().startsWith(incM[1])) : null; if (inc) out.incumbentSupplier = inc; const rest = names.filter((n) => n !== inc); if (rest.length) out.suggestedSuppliers = rest.join(", "); const yrs = t.match(/(\d+)\s*-?\s*year/i); if (yrs) out.duration = Number(yrs[1]); const net = t.match(/net\s*(\d+)/i); if (net) out.paymentTerms = Number(net[1]); if (/rfq/i.test(t)) out.sourcingApproach = "RFQ"; if (/rfi/i.test(t)) out.sourcingApproach = "RFI"; if (/msa/i.test(t)) out.contractType = "Master Services Agreement"; else if (/sow|statement of work/i.test(t)) out.contractType = "Statement of Work"; else if (!names.length && /sourcing|support|agreement|contract|framework|rate|lease|licen/i.test(t)) { const ctx = t.replace(/,?\s*\d+\s*-?\s*years?/i, "").replace(/,?\s*net\s*\d+/i, "").trim(); if (ctx) out.contractType = ctx.charAt(0).toUpperCase() + ctx.slice(1); } }
    return out;
  };

  const send = async (textArg) => {
    const text = (textArg ?? input).trim(); if (!text || busy) return;
    setInput(""); setMsgs((m) => [...m, { role: "user", text }]); setBusy(true);
    const s = CB_SECTIONS[step]; let extracted = {}, reply = null, complete = false;
    if (IS_V4 && s.id === "need" && !form.requirementDescription) { const dm = inferDomain(user, text) || domain; if (dm && dm !== domain) setDomain(dm); }
    const profNow = IS_V4 ? DOMAINS_CB[(s.id === "need" && !form.requirementDescription ? inferDomain(user, text) : null) || domain] : null;
    if (s.id === "review") { if (/^(submit|submitted|approve|route|send)/i.test(text)) { setBusy(false); return finalize(true); } if (/^(in.?process|draft|save as draft|hold)/i.test(text)) { setBusy(false); return finalize(false); } await draft(need(), `${text} (apply only this change to the existing request)`, form); setMsgs((m) => [...m, { role: "card" }, { role: "bot", text: "Updated. Anything else, or **Submitted** / **In Process**?" }]); setBusy(false); return; }
    const streamIdx = { v: -1 }; const startStream = () => { setMsgs((m) => { streamIdx.v = m.length; return [...m, { role: "bot", text: "", streaming: true }]; }); };
    const updStream = (t) => setMsgs((m) => m.map((x, i) => (i === streamIdx.v ? { ...x, text: t } : x)));
    const endStream = (t) => setMsgs((m) => m.map((x, i) => (i === streamIdx.v ? { ...x, text: t, streaming: false } : x)));
    let streamedByAI = false;
    if (!offline) {
      try {
        const missingNow = missing(s); const askNext = missingNow[0];
        const result = await askIntakeAgent(s, text, Object.fromEntries(CB_ALL_FIELDS.filter((field) => form[field] !== undefined && form[field] !== "").map((field) => [field, form[field]])));
        reply = result.reply || "Noted.";
        extracted = {}; Object.entries(result.extracted || {}).forEach(([k, v]) => { if (s.fields.includes(k) && v !== null && v !== undefined && v !== "") extracted[k] = v; }); complete = Boolean(result.section_complete);
        // progress guard: an answer must always advance — if the model captured nothing for a missing field, assign the reply to the field we asked about
        const isSkip = /^(next|skip|move on|that's all|done)\b/i.test(text); const isDecline = /^(prefer not|n\/a|none|no idea|not sure|don't know|unknown)/i.test(text);
        if (!isSkip && askNext && !missingNow.some((f) => f in extracted)) {
          const value = DATE_FORM_FIELDS.has(askNext) ? normalizeFormDate(text) : (isDecline ? "Not disclosed" : text.trim());
          if (value !== null) extracted[askNext] = value;
          reply = DATE_FORM_FIELDS.has(askNext) && value === null
            ? `${lbl(askNext)} needs a date in YYYY-MM-DD format (for example, 2026-11-30).`
            : missingNow.length > 1 ? `Got it. ${lbl(missingNow[1])}?` : "Captured.";
          if (missingNow.length <= 1 && value !== null) complete = true;
        }
        if (isSkip) complete = true;
        setBusy(false); startStream(); await typewrite(reply, updStream); endStream(reply); streamedByAI = true;
      } catch (e) { if (!/rate-limited|rate_limited/i.test(e.message)) setOffline(true); if (streamIdx.v >= 0) setMsgs((m) => m.filter((x, i) => i !== streamIdx.v)); reply = null; push("AI unavailable — continuing in guided mode", e.message.slice(0, 120)); }
    }
    if (!reply) { extracted = fallbackExtract(text, s); if (/^(none|no|n\/a|not applicable|nothing|prefer not|not sure|unknown)\b/i.test(text)) { const first = missing(s).filter((f) => !(f in extracted))[0]; if (first) extracted[first] = /prefer not|not sure|unknown/i.test(text) ? "Not disclosed" : "None"; } const left = missing(s).filter((f) => !(f in extracted)); const skip = /move on|next|skip|that's all|done/i.test(text); complete = skip || left.length === 0; const mf = profNow && profNow.name.startsWith("Manufacturing"); const domQ = profNow ? { businessOutcome: mf ? "What outcome — capacity, cost or compliance?" : "What business outcome are you aiming for?", impactIfNotProcured: "What happens if it isn't procured?", scopeDescription: profNow.openers.scope, deliverables: mf ? "Should installation, commissioning or training be included?" : "What deliverables or service levels do you expect?", geographyCoverage: mf ? "Which plants or sites?" : "Which countries or sites?", transitionRequirement: mf ? "Any phasing or changeover constraints on site?" : "Any transition from an incumbent to plan for?", complianceRequirements: profNow.openers.specs, dataSecurity: "Any data or information-security constraints?", esgRequirement: "Any sustainability or ESG expectations?", approvedBudget: profNow.openers.budget, costCenter: "Which cost center should this charge to?", serviceStartDate: profNow.openers.timeline, awardDate: "By when should the order or award be placed?", rfpIssueDate: "When should the RFx go out to suppliers?", incumbentSupplier: profNow.openers.supplier, suggestedSuppliers: "Any suppliers you would like invited?", contractType: mf ? "Purchase agreement with warranty, or a supply framework?" : "Contract type — MSA, SOW or framework?", duration: "How many years?", paymentTerms: "Payment terms — Net 30, 45 or 60?" } : {}; reply = complete ? "Captured." : left.length ? `${Object.keys(extracted).length ? "Got it. " : ""}${domQ[left[0]] || `${lbl(left[0])}?`}` : "Noted."; }
    if (Object.keys(extracted).length) set(extracted);
    const stillMissing = missing(s).filter((f) => !(f in extracted) || extracted[f] === "" || extracted[f] == null);
    if (!complete && stillMissing.length === 0) complete = true;
    if (!streamedByAI && !complete) { setBusy(false); startStream(); await typewrite(reply, updStream); endStream(reply); }
    if (complete) {
      const next = CB_SECTIONS[step + 1];
      if (next.id === "review") { setStep(step + 1); setBusy(false); await toReview(); return; }
      const tr = `✓ ${s.title}. ${opener(next)}`; setBusy(false); startStream(); await typewrite(tr, updStream); endStream(tr);
      setStep(step + 1);
    }
    setBusy(false);
  };
  const toReview = async () => { setMsgs((m) => [...m, { role: "bot", text: "Thanks — drafting the request, including scope, deliverables and ESG text." }]); const details = CB_SECTIONS.flatMap((sec) => sec.fields).filter((f) => form[f]).map((f) => `${lbl(f)}: ${form[f]}`).join("; "); await draft(need(), details, form); setDrafted(true); setMsgs((m) => [...m, { role: "card" }, { role: "bot", text: "Please review. Tell me any change, or choose **Submitted** / **In Process**." }]); };
  const skipSection = async () => { const next = CB_SECTIONS[step + 1]; setStep(step + 1); if (next.id === "review") { await toReview(); return; } setMsgs((m) => [...m, { role: "bot", text: opener(next) }]); };
  const submit = () => {
    const bu = user.ORGEH; let first = "Procurement", n = 3;
    mutate((d) => { writeIntake(d, { ...form, businessUnit: bu }, "UNDER_REVIEW"); const chain = buildIntakeChain(d, form.requestId, Number(form.approvedBudget) || 0); first = chain[0]?.approver_role; n = chain.length; d.intake_approvals = [...d.intake_approvals.filter((a) => a.request_id !== form.requestId), ...chain]; });
    push("Request submitted", `${form.requestId} written to the intake tables and routed to ${first} (step 1 of ${n}).`); onSubmitted();
  };
  const Field = ({ k, label, type = "text", options }) => <div><label>{label}</label>{options ? <select value={form[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })}>{options.map((o) => <option key={o} value={o}>{o || "None"}</option>)}</select> : <input type={type} value={form[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })} />}</div>;
  return (
    <div className="pa-layout">
      <div>
        <div className="card pa-card"><div className="pa-side-head">Procurement Assistant</div><div className="pa-side-sub">{offline ? <>Guided mode · AI unavailable <a className="rfp-link" onClick={() => { setOffline(false); setProviderUsed(null); push("Reconnecting", "Next message will use the selected live provider."); }}>Retry live AI</a></> : providerUsed === "built-in-llm" || providerStatus.data?.mode === "built-in-llm" ? "Live AI · Built-in LLM" : providerUsed === "guided-fallback" || providerStatus.data?.mode === "guided-fallback" ? "Guided fallback · deterministic intake" : "Live AI · Foundry agent"}</div></div>
        <div className="card pa-progress-card"><div className="pa-progress-title">Intake in progress</div><div className="pa-progress-row"><ProgressRing pct={pct} /><div><div className="pa-progress-step">Step {step + 1} of {CB_SECTIONS.length}</div><div className="pa-progress-time">⏱ Estimated time: 5-8 min</div></div></div><div className="pa-progress-track"><div className="pa-progress-fill" style={{ width: `${pct}%` }}></div></div></div>
        <div className="card pa-card"><div className="pa-sections-title">Intake sections</div>{CB_SECTIONS.map((s, i) => <div key={s.id} className={`pa-section-item ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} onClick={() => i <= step && setStep(i)}><span className="pa-section-icon">{i < step ? "✓" : ""}</span>{s.title}{i === 0 && <span className="muted" style={{ marginLeft: "auto", fontSize: 10.5 }}>from SAP</span>}</div>)}</div>
      </div>
      <div className="pa-chat-panel">
        <div className="pa-chat-head"><h3>{form.requestId}</h3><span className="muted" style={{ fontSize: 12 }}>Section: <b>{sec.title}</b>{IS_V4 && prof && <> · context: <b>{prof.name}</b></>}</span></div>
        <div className="pa-chat-body" ref={bodyRef}>
          {msgs.map((m, i) => m.role === "card" ? <RequestCard key={i} /> : m.role === "bot" ? <div key={i} className="pa-msg"><div className="pa-avatar">🤖</div><div><div className={`pa-bubble ${m.streaming ? "streaming" : ""}`}><Rich text={m.text} />{m.streaming && <span className="cursor">▍</span>}{m.done && <div style={{ marginTop: 8 }}><button className="btn btn-primary btn-sm" onClick={onSubmitted}>Open request →</button></div>}</div></div></div> : <div key={i} className="pa-msg user"><div><div className="pa-bubble user">{m.text}</div></div><div className="pa-avatar user">{(actor || user).NAME_FIRST[0]}</div></div>)}
          {busy && <div className="pa-msg"><div className="pa-avatar">🤖</div><div className="pa-bubble typing"><span></span><span></span><span></span></div></div>}
        </div>
        {!done && <>
          <div className="pa-chips-row">{sec.id === "review" ? (drafted && <><button className="pa-chip" onClick={() => finalize(true)} disabled={busy || saving}>Submitted — route for approval</button><button className="pa-chip ghost" onClick={() => finalize(false)} disabled={busy || saving}>In Process — save as draft</button></>) : <>{chipsFor(sec).map((c) => <button key={c} className="pa-chip" onClick={() => send(c)} disabled={busy}>{c}</button>)}<button className="pa-chip ghost" onClick={skipSection} disabled={busy}>Skip section →</button></>}</div>
          {sec.id !== "review" && <div className="pa-guide"><span className="muted">Capturing now:</span> {sec.fields.map((f) => <span key={f} className={`pa-guide-f ${form[f] ? "ok" : missing(sec)[0] === f ? "on" : ""}`}>{form[f] ? "✓ " : ""}{lbl(f)}</span>)}<span className="muted" style={{ marginLeft: "auto" }}>Answer the highlighted item in a few words · "next" skips · "none" if not applicable</span></div>}
          <div className="pa-chat-input-row"><input type="text" placeholder={sec.id === "review" ? "Request a change, or type 'Submitted' / 'In Process'…" : missing(sec)[0] ? `${lbl(missing(sec)[0])}…` : `Anything else for ${sec.title.toLowerCase()}? Type "next" to continue`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={busy} /><button className="pa-send-btn" onClick={() => send()} disabled={busy}>➤</button></div></>}
      </div>
      <div>
        <div className="pa-tips-card"><div className="pa-tips-title">👤 Requestor (from SAP)</div><div className="kv" style={{ gridTemplateColumns: "80px 1fr", fontSize: 12 }}><div className="k">Name</div><div className="v">{user.NAME_FIRST} {user.NAME_LAST}</div><div className="k">PERSNO</div><div className="v mono">{user.PERSNO}</div><div className="k">Org unit</div><div className="v">{user.ORGEH}</div><div className="k">Cost center</div><div className="v mono">{user.KOSTL}</div><div className="k">Location</div><div className="v">{user.WERKS}</div><div className="k">Manager</div><div className="v mono">{user.MANAGER_BNAME}</div></div></div>
        <div className="card pa-card" style={{ marginTop: 12 }}><div className="pa-sections-title">Captured so far · {sec.title}</div>
          {sec.fields.length ? sec.fields.map((f) => <div key={f} className={`cap-row ${form[f] ? "ok" : ""}`}><span className="cap-k">{lbl(f)}</span><span className="cap-v">{form[f] ? String(form[f]) : "—"}</span></div>) : <div className="muted" style={{ fontSize: 12 }}>{sec.id === "review" ? "Review the drafted card in the chat; adjust key fields here if needed." : "Pre-filled from your SAP profile."}</div>}
          {sec.id === "review" && <div style={{ marginTop: 8 }}><Field k="category" label="Category" options={db.rfx_category.map((c) => c.category_name)} /><Field k="priority" label="Priority" options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} /><Field k="approvedBudget" label="Approved budget (USD)" type="number" /><Field k="serviceStartDate" label="Service start" type="date" /><Field k="sourcingApproach" label="Approach" options={["RFP", "RFQ", "RFI"]} /><Field k="incumbentSupplier" label="Incumbent" options={["", ...db.supplier.slice(0, 12).map((s) => s.name)]} /></div>}
        </div>
      </div>
    </div>);
}

/* ============================= SOURCING OVERVIEW (VALUE CHAIN) ============================= */
const AI_STAGES = [
  { id: "S1", agent: "A1", title: "Demand captured", desc: "Business requester submits a controlled intake.", t: "intake_requests" },
  { id: "S2", agent: "A1", title: "Demand validated and governed", desc: "Policy, budget and justification checks; exceptions routed.", t: "intake_strategy_governance" },
  { id: "S3", agent: "A2", title: "Supplier market explored and candidates ranked", desc: "Evidence-based qualification from category, ESG, risk and performance.", t: "supplier_shortlisting" },
  { id: "S4", agent: "A2", title: "Shortlist and sourcing strategy approved", desc: "Configurable, versioned scoring model; human approval required.", t: "supplier_shortlisting" },
  { id: "S5", agent: "A3", title: "RFx package generated and published", desc: "Versioned RFx content, requirements and questionnaire; approved before publication.", t: "rfx_draft_versions" },
  { id: "S6", agent: "A8", title: "Supplier questions and clarifications controlled", desc: "Grounded draft answers; approved public / private publication only.", t: "rfx_questions" },
  { id: "S7", agent: "A4", title: "Supplier bids received, extracted and normalised", desc: "Currency / UOM normalisation, response answers, exception detection.", t: "bid_responses" },
  { id: "S8", agent: "A5", title: "Comparable bids scored and ranked", desc: "Weighted, versioned evaluation with rationale and confidence.", t: "agent_evaluations" },
  { id: "S9", agent: "A6", title: "Negotiation plan and controlled rounds executed", desc: "Approved price envelope, strategy, rounds and concessions.", t: "negotiation_insights" },
  { id: "S10", agent: "A6→A7", title: "Negotiation finalised and award recommendation assembled", desc: "Finalisation with named Finance / Procurement approvals.", t: "negotiation_finalization" },
  { id: "S11", agent: "A7", title: "Award decision approved and outcome prepared", desc: "Eligibility reconciliation, approval package and override evidence.", t: "supplier_selection_decisions" },
  { id: "S12", agent: "A7→A9", title: "Contract intake handoff created", desc: "Idempotent, structured award facts handed to contracting.", t: "contract_intake_requests" },
];
const HITL_STAGES = [{ col: 2, title: "Policy exception / high-value approval" }, { col: 4, title: "Approve / override shortlist (Procurement / Risk)" }, { col: 5, title: "Approve RFx publication" }, { col: 8, title: "Evaluation committee review" }, { col: 9, title: "Approve negotiation strategy / boundaries" }, { col: 10, title: "Finance / Procurement finalisation approvals" }, { col: 11, title: "Award decision / override approval" }];
const SUPPLIER_STAGES = [{ col: 5, title: "Receive authorised RFx", desc: "Published only after HITL approval." }, { col: 6, title: "Ask questions; receive approved answers", desc: "Equality-of-access public clarifications." }, { col: 7, title: "Submit bid", desc: "Response documents and requirement answers." }, { col: 9, title: "Participate in negotiation rounds", desc: "Counter-offers within controlled rounds." }, { col: 11, span: 2, title: "Receive award notification", desc: "Delivered through an approved connector after final approval." }];
const KEY_BENEFITS = [{ title: "Faster Cycle Time", desc: "End-to-end automation accelerates sourcing." }, { title: "Cost Optimization", desc: "Data-driven targets and negotiations drive savings." }, { title: "Risk Reduction", desc: "AI-powered risk, financial and compliance checks." }, { title: "Better Supplier Quality", desc: "AI ensures diversity, ESG and performance." }, { title: "Transparency & Governance", desc: "Full audit trail and real-time visibility." }, { title: "Seamless Handover", desc: "Structured metadata push to CLM." }];

function SourcingOverview({ db, setPage, gotoTable }) {
  return (
    <div>
      <div className="page-head"><div className="page-eyebrow">Landing Page · Canonical S1–S12 Operating Model</div><h2 className="page-title">Autonomous Sourcing Overview</h2><p className="page-desc">The A1–A8 agentic sourcing lifecycle, end to end — AI agents, human checkpoints, and supplier touchpoints in exactly three swimlanes. Row counts are live from the underlying tables.</p></div>
      <div className="vc-wrap">
        <div className="vc-topbar"><h2>Autonomous S2C Value Chain : Sourcing RFx (S1–S12) <span className="cls">CLASSIFICATION: INTERNAL</span></h2><div className="vc-legend"><span><span className="dot ai"></span>AI Agent</span><span><span className="dot hitl"></span>HITL</span></div></div>
        <div className="vc-body">
          <div className="vc-intake-row"><div className="chatbot">💬 Chat Bot</div><div className="mid"><b>Requestor / Business Action — Intake</b><span>Submission through Conversational AI Chat Bot</span></div><div className="side">↓ to S1</div><div className="side">📊 Dashboards & Insights<br/>Real-time KPIs from CLM push</div></div>
          <div className="vc-lane"><div className="vc-lane-label ai">AI Agent<br/>(S1 → S12)</div><div className="vc-grid">{AI_STAGES.map((s) => <div key={s.id} className="vc-card" onClick={() => gotoTable(s.t)} style={{ cursor: "pointer" }}><span className="vc-badge">{s.id}</span><span className="vc-agent-chip">{s.agent}</span><div className="vc-title">{s.title}</div><div className="vc-desc">{s.desc}</div><div className="vc-rows mono">{s.t} · {db[s.t].length}</div></div>)}</div></div>
          <div className="vc-lane"><div className="vc-lane-label hitl">HITL</div><div className="vc-grid">{HITL_STAGES.map((h, i) => <div key={i} className="vc-card hitl" style={{ gridColumn: h.col }}><span className="vc-badge">HITL</span><div className="vc-title">{h.title}</div></div>)}</div></div>
          <div className="vc-lane"><div className="vc-lane-label suppliers">Supplier</div><div className="vc-grid">{SUPPLIER_STAGES.map((s, i) => <div key={i} className="vc-card supplier" style={{ gridColumn: s.span ? `${s.col} / span ${s.span}` : s.col }}><div className="vc-title">{s.title}</div><div className="vc-desc">{s.desc}</div></div>)}</div></div>
        </div>
      </div>
      <div className="vc-benefits-section"><div className="section-label" style={{ marginBottom: 10 }}>Key Benefits</div><div className="vc-benefits-grid">{KEY_BENEFITS.map((b) => <div key={b.title} className="vc-card"><div className="vc-title">{b.title}</div><div className="vc-desc">{b.desc}</div></div>)}</div></div>
      <div style={{ marginTop: 18 }}><button className="btn btn-primary" onClick={() => setPage("command-center")}>Go to Command Center →</button></div>
    </div>);
}

/* ============================= COMMAND CENTER ============================= */
function Donut({ segments, centerLabel, centerValue }) {
  let acc = 0; const stops = segments.map((s) => { const start = acc; acc += s.pct; return `${s.color} ${start}% ${acc}%`; });
  return <div className="cc-donut-wrap"><div className="cc-donut" style={{ background: `conic-gradient(${stops.join(",")})` }}><div className="cc-donut-hole"><span className="t1">{centerLabel}</span><span className="t2">{centerValue}</span></div></div></div>;
}
const CAT_COLORS = ["#1462c4", "#0b2545", "#4f8fe0", "#9fc6f2", "#0d3a70", "#a7b1bd"];

function recentActivity(db) {
  const items = [];
  db.bid_responses.forEach((b) => items.push({ ts: b.submission_date, text: `Bid received from ${supName(db, b.supplier_id)} via ${nice(b.source_channel)}`, ref: b.rfx_id }));
  db.rfx_question_responses.forEach((r) => { const qq = one(db, "rfx_questions", "question_id", r.question_id); items.push({ ts: r.published_at, text: `Q&A answer published (${qq?.section_reference})`, ref: qq?.rfx_id }); });
  db.rfx_approvals.forEach((a) => items.push({ ts: a.approved_at, text: `${a.approver_role} ${a.approval_status.toLowerCase()} award recommendation`, ref: a.rfx_id }));
  db.negotiation_finalization.forEach((n) => items.push({ ts: n.approved_at, text: `Negotiation finalised with ${supName(db, n.supplier_id)} — ${fmtUsd(n.savings_achieved)} saved`, ref: n.rfx_id }));
  db.rfx_events.filter((e) => e.issue_date).forEach((e) => items.push({ ts: e.issue_date + " 09:00:00", text: `${e.rfx_type} published to ${P(e.invited_suppliers).length} invited suppliers`, ref: e.rfx_id }));
  db.bid_exceptions.filter((x) => x.resolution_status === "OPEN").forEach((x) => { const b = one(db, "bid_responses", "bid_id", x.bid_id); items.push({ ts: b?.updated_at, text: `Normalisation exception (${nice(x.exception_type)}) awaiting review`, ref: b?.rfx_id }); });
  return items.filter((i) => i.ts).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 7);
}
function relTime(ts) { const d = Math.round((new Date(TODAY + "T18:00:00Z") - new Date(ts.replace(" ", "T") + "Z")) / 3600000); if (d < 1) return "just now"; if (d < 24) return `${d} hr ago`; const days = Math.floor(d / 24); return days === 1 ? "Yesterday" : `${days} days ago`; }

function CommandCenter({ db, mutate, push, setPage, setRfxId, openRecord, gotoTable, can }) {
  const [filter, setFilter] = useState("All");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ type: "RFQ", title: "", category: "CAT-FAC", budget: "" });
  const events = db.rfx_events.map((e) => ({ ...e, label: rfxStatusLabel(db, e) }));
  const counts = { All: events.length, Open: events.filter((e) => e.label === "Open").length, "Closing Soon": events.filter((e) => e.label === "Closing Soon").length, Evaluation: events.filter((e) => ["Evaluation", "Negotiation"].includes(e.label)).length, Awarded: events.filter((e) => e.label === "Awarded").length, Draft: events.filter((e) => e.label === "Draft").length };
  const filtered = filter === "All" ? events : filter === "Evaluation" ? events.filter((e) => ["Evaluation", "Negotiation"].includes(e.label)) : events.filter((e) => e.label === filter);
  const awarded = db.negotiation_finalization;
  const awardedValue = awarded.reduce((a, n) => a + num(n.final_price), 0);
  const savings = awarded.reduce((a, n) => a + num(n.savings_achieved), 0);
  const pipeline = db.rfx_events.reduce((a, e) => a + num(e.budget_limit_usd), 0);
  // savings by category — realised + projected (target vs quoted for in-flight negotiations)
  const savRows = [];
  db.negotiation_finalization.forEach((n) => savRows.push({ rfx: n.rfx_id, value: num(n.savings_achieved), kind: "Realised" }));
  db.negotiation_insights.filter((n) => !db.negotiation_finalization.some((f) => f.rfx_id === n.rfx_id)).forEach((n) => { const r = db.rfx_response.find((x) => x.rfx_id === n.rfx_id && x.supplier_id === n.supplier_id); if (r && !savRows.some((s) => s.rfx === n.rfx_id)) savRows.push({ rfx: n.rfx_id, value: num(r.quoted_total_price) - num(n.target_price), kind: "Projected" }); });
  const catTotals = {}; savRows.forEach((s) => { const e = one(db, "rfx_events", "rfx_id", s.rfx); const c = one(db, "rfx_category", "rfx_category", e?.rfx_category)?.category_name || "Other"; catTotals[c] = (catTotals[c] || 0) + s.value; });
  const totalSav = Object.values(catTotals).reduce((a, b) => a + b, 0) || 1;
  const segments = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, pct: Math.round((value / totalSav) * 100), color: CAT_COLORS[i % CAT_COLORS.length] }));
  const deadlines = db.rfx_events.filter((e) => e.due_date && ["OPEN", "DRAFT"].includes(e.status)).map((e) => ({ e, d: daysUntil(e.due_date) })).sort((a, b) => a.d - b.d).slice(0, 4);
  const hitlOpen = db.rfx_assigned_approvers.filter((r) => r.current_status === "PENDING").length + db.bid_exceptions.filter((r) => r.resolution_status === "OPEN").length + db.contract_approvals.filter((r) => r.approval_status === "PENDING").length + db.intake_requests.filter((r) => r.intake_status !== "APPROVED").length + db.negotiation_insights.filter((n) => !n.approval_flag).length;

  const createDraft = () => {
    if (!form.title.trim()) { push("Name required", "Enter a name for the new RFx."); return; }
    const rfxId = `${form.type}-2026-${String(Date.now()).slice(-4)}`;
    mutate((d) => {
      d.rfx_events = [{ rfx_id: rfxId, title: form.title.trim(), rfx_type: form.type, rfx_category: form.category, status: "DRAFT", issue_date: null, due_date: null, closed_date: null, owner: J({ name: "R. Kumar", role: "Sourcing Lead", email: "r.kumar@leona.example" }), description: form.title.trim(), scope: null, invited_suppliers: "[]", responses_received: 0, key_findings: null, attachments: "[]", budget_limit_usd: form.budget ? Number(form.budget) : null, created_at: nowTs() }, ...d.rfx_events];
      d.rfx_weight_configs = [...d.rfx_weight_configs, { rfx_id: rfxId, commercial_weight: 0.4, operational_weight: 0.3, risk_compliance_weight: 0.2, esg_weight: 0.1, completeness_score: null, consistency_score: null, complaince_score: null, readability_score: null, overall_quality_score: null, status: "PENDING_HITL", issues: "[]", warnings: "[]", created_at: nowTs(), updated_at: nowTs() }];
    });
    setForm({ type: "RFQ", title: "", category: "CAT-FAC", budget: "" }); setShowDialog(false); setFilter("Draft"); setRfxId(rfxId);
    push("Draft created", `${rfxId} inserted into rfx_events + rfx_weight_configs and set as the working RFx.`);
  };

  return (
    <div>
      <div className="cc-hero"><div className="eyebrow">Overview · rfx_events · negotiation_finalization · human_in_loop_controls</div><h2>RFx Command Center — Sourcing Dashboard</h2></div>
      <div className="cc-kpi-grid">
        <div className="card cc-kpi"><div className="lbl">Open RFx</div><div className="val">{counts.Open + counts["Closing Soon"]}</div><div className="sub">{counts["Closing Soon"]} closing within 7 days</div></div>
        <div className="card cc-kpi"><div className="lbl">In Evaluation / Negotiation</div><div className="val">{counts.Evaluation}</div><div className="sub">{db.bid_responses.length} bids normalised</div></div>
        <div className="card cc-kpi"><div className="lbl">Pipeline Budget</div><div className="val">{fmtUsd(pipeline)}</div><div className="sub">{db.rfx_events.length} events · {db.intake_requests.length} intakes</div></div>
        <div className="card cc-kpi hl"><div className="lbl">Awarded Value</div><div className="val">{fmtUsd(awardedValue)}</div><div className="sub">{awarded.length} finalised</div></div>
        <div className="card cc-kpi hl"><div className="lbl">Total Savings</div><div className="val">{fmtUsd(savings)}</div><div className="sub">Realized vs. best quote</div></div>
        <div className="card cc-kpi"><div className="lbl">Savings %</div><div className="val">{awardedValue ? ((savings / (awardedValue + savings)) * 100).toFixed(1) : "0.0"}%</div><div className="sub">of pre-negotiation value</div></div>
        <div className="card cc-kpi"><div className="lbl">Awaiting a Human</div><div className="val">{hitlOpen}</div><div className="sub"><a className="rfp-link" onClick={() => setPage("approvals")}>Open approval dashboard →</a></div></div>
      </div>
      <div className="cc-layout">
        <div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div className="tabs">{["All", "Open", "Closing Soon", "Evaluation", "Awarded", "Draft"].map((t) => <button key={t} className={`tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>{t === "Draft" ? "Drafts" : t} ({counts[t]})</button>)}</div>
              {can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") && <button className="btn btn-primary btn-sm" onClick={() => setShowDialog(true)}>+ New RFx from approved intake</button>}
            </div>
            <table>
              <thead><tr><th>RFx</th><th>Status</th><th>Responses</th><th>Budget</th><th>Deadline</th><th>Owner</th><th></th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="7" className="loading-row">No RFx events match this filter.</td></tr>}
                {filtered.map((e) => (
                  <tr key={e.rfx_id}>
                    <td><div style={{ fontWeight: 600 }}><span className="badge closed" style={{ marginRight: 6, fontFamily: "IBM Plex Mono, monospace" }}>{e.rfx_type}</span>{e.title}</div><div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}><Ref t="rfx_events" c="rfx_id" v={e.rfx_id} openRecord={openRecord} /> · {one(db, "rfx_category", "rfx_category", e.rfx_category)?.category_name}</div></td>
                    <td><span className={`badge ${statusClass(e.label)}`}>{e.label}</span></td>
                    <td>{e.responses_received}/{P(e.invited_suppliers).length}</td>
                    <td>{fmtUsd(e.budget_limit_usd)}</td>
                    <td>{fmtDate(e.due_date)}</td>
                    <td>{P(e.owner, {}).name}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => { setRfxId(e.rfx_id); setPage("rfp-workflow-status"); }}>Open</button></td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="card" style={{ padding: 16 }}><div className="cc-side-title">Recent Activity</div>
              {recentActivity(db).map((a, i) => <div key={i} className="cc-activity-item"><span className="adot"></span><div><div className="atxt">{a.text}</div><div className="ameta">{relTime(a.ts)} · <Ref t="rfx_events" c="rfx_id" v={a.ref} openRecord={openRecord} /></div></div></div>)}</div>
            <div className="card" style={{ padding: 16 }}><div className="cc-side-title">Upcoming Deadlines</div>
              {deadlines.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>No open events with a due date.</div>}
              {deadlines.map(({ e, d }) => <div key={e.rfx_id} className="cc-deadline-item"><div><div className="dtxt">{e.title}</div><div className="dmeta">{e.rfx_id}</div></div><span className={`cc-deadline-badge ${d <= 0 ? "red" : d <= 7 ? "amber" : "gray"}`}>{d <= 0 ? "Today" : `${d} days`}</span></div>)}
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={() => setPage("demand-intake")}>Start New Sourcing Event →</button></div>
          </div>
        </div>
        <div>
          <div className="card cc-side-card"><div className="cc-side-title">Savings by Category</div>
            <Donut segments={segments} centerLabel="Realised + projected" centerValue={fmtUsd(totalSav)} />
            {segments.map((c) => <div key={c.name} className="cc-legend-row"><span className="lg-left"><span className="dot" style={{ background: c.color }}></span>{c.name}</span><span className="amt">{fmtUsd(c.value)}</span><span className="pct">{c.pct}%</span></div>)}
            <div className="cc-total-row"><span>Total</span><span>{fmtUsd(totalSav)} · 100%</span></div></div>
          <div className="card cc-side-card"><div className="cc-side-title">Savings by RFx</div>
            {savRows.sort((a, b) => b.value - a.value).map((r) => { const e = one(db, "rfx_events", "rfx_id", r.rfx); return (<div key={r.rfx} className="cc-bar-item"><div className="top-row"><span className="lbl2">{r.rfx}<span className="ref">{e?.title.slice(0, 30)}… · {r.kind}</span></span><span>{fmtUsd(r.value)} <b>{Math.round((r.value / totalSav) * 100)}%</b></span></div><div className="cc-bar-track"><div className="cc-bar-fill" style={{ width: `${(r.value / totalSav) * 100}%`, opacity: r.kind === "Projected" ? 0.45 : 1 }}></div></div></div>); })}
            <div className="cc-total-row"><span>Total</span><span>{fmtUsd(totalSav)}</span></div></div>
        </div>
      </div>
      {showDialog && (
        <div className="modal-overlay" onClick={() => setShowDialog(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><h3>Create RFx from an approved intake</h3>
          <p className="muted" style={{ fontSize: 12.5 }}>Every RFx originates from a business request that has cleared Procurement → Finance → Legal. Approved requests without an event:</p>
          {db.intake_requests.filter((r) => r.intake_status === "APPROVED" && !r.linked_RFx).length === 0 && <div className="callout info">All approved requests already have an RFx. New demand must be raised by a business profile in Demand Intake.</div>}
          {db.intake_requests.filter((r) => r.intake_status === "APPROVED" && !r.linked_RFx).map((r) => <div key={r.request_id} className="home-req" onClick={() => { const gov = one(db, "intake_strategy_governance", "request_id", r.request_id); const ct = one(db, "intake_commercials_timelines", "request_id", r.request_id); const rid = `${gov?.sourcing_approach || "RFP"}-2026-${r.request_id.split("-").slice(2).join("-")}`; mutate((d) => { d.rfx_events = [{ rfx_id: rid, title: r.requirement_description.slice(0, 70), rfx_type: gov?.sourcing_approach || "RFP", rfx_category: d.rfx_category.find((c) => c.category_name === r.category)?.rfx_category || "CAT-ITS", status: "DRAFT", issue_date: null, due_date: null, closed_date: null, owner: J({ name: "Priya Nair", role: "Category Manager", email: "priya.nair@s2c.com" }), description: r.requirement_description, scope: null, invited_suppliers: "[]", responses_received: 0, key_findings: null, attachments: "[]", budget_limit_usd: ct?.approved_budget || null, created_at: nowTs() }, ...d.rfx_events]; d.rfx_weight_configs = [...d.rfx_weight_configs, { rfx_id: rid, commercial_weight: 0.35, operational_weight: 0.35, risk_compliance_weight: 0.2, esg_weight: 0.1, completeness_score: null, consistency_score: null, complaince_score: null, readability_score: null, overall_quality_score: null, status: "PENDING_HITL", issues: "[]", warnings: "[]", created_at: nowTs(), updated_at: nowTs() }]; d.intake_requests = d.intake_requests.map((x) => (x.request_id === r.request_id ? { ...x, linked_RFx: rid } : x)); }); setShowDialog(false); setRfxId(rid); push("Draft RFx created", `${rid} linked to ${r.request_id}.`); }}><div><div className="t">{r.request_id} · {r.category}</div><div className="d">{r.requirement_description}</div></div><Badge s="APPROVED" /></div>)}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}><button className="btn btn-ghost btn-sm" onClick={() => setShowDialog(false)}>Close</button></div>
        </div></div>)}
    </div>);
}

/* ============================= DEMAND INTAKE ============================= */
// flatten the five intake tables into one form model and back
function intakeToForm(db, id) {
  const r = one(db, "intake_requests", "request_id", id); if (!r) return null;
  const sc = one(db, "intake_scope_specs", "request_id", id) || {}, sg = one(db, "intake_strategy_governance", "request_id", id) || {}, ct = one(db, "intake_commercials_timelines", "request_id", id) || {}, w = one(db, "intake_evaluation_weights", "request_id", id) || {};
  return { requestId: id, requestorName: r.requestor_name, employeeId: r.employee_id, businessUnit: r.business_unit, location: r.location, requestType: r.request_type, category: r.category, procurementType: r.procurement_type, priority: r.priority, requirementDescription: r.requirement_description, businessOutcome: r.business_outcome, impactIfNotProcured: r.impact_if_not_procured,
    scopeDescription: sc.scope_description || "", deliverables: sc.deliverables || "", specificationType: sc.specification_type || "Technical", complianceRequirements: P(sc.compliance_requirements).join(", "), geographyCoverage: P(sc.geography_coverage).join(", "), transitionRequirement: sc.transition_requirement || "", documentationAttachments: P(sc.documentation_attachments).join(", "),
    incumbentSupplier: sg.incumbent_supplier || "", suggestedSuppliers: P(sg.suggested_suppliers).join(", "), sourcingApproach: sg.sourcing_approach || "RFP", expectedBidders: sg.expected_bidders_range || "3-5", contractType: sg.contract_type || "", duration: sg.duration_years ?? 3, paymentTerms: sg.payment_terms_days ?? 45, riskCategory: sg.risk_category || "", dataSecurity: sg.data_security_notes || "", esgRequirement: sg.esg_requirement || "",
    costCenter: ct.cost_center || "", approvedBudget: ct.approved_budget ?? "", currency: ct.currency || "USD", capexOpex: ct.capex_opex || "OPEX", sourcingStartDate: ct.sourcing_start_date || "", rfpIssueDate: ct.rfp_issue_date || "", awardDate: ct.award_date || "", serviceStartDate: ct.service_start_date || "",
    commercialWeight: w.commercial_weight ?? 40, technicalWeight: w.technical_weight ?? 40, complianceWeight: w.compliance_weight ?? 20, intakeStatus: r.intake_status, linkedRfx: r.linked_RFx };
}
const splitList = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
function writeIntake(d, f, status) {
  const id = f.requestId; const upsert = (t, row) => { const i = d[t].findIndex((r) => r.request_id === id); d[t] = i >= 0 ? d[t].map((r, k) => (k === i ? { ...r, ...row } : r)) : [...d[t], row]; };
  upsert("intake_requests", { request_id: id, requestor_name: f.requestorName, employee_id: f.employeeId, business_unit: f.businessUnit, location: f.location, request_type: f.requestType, category: f.category, procurement_type: f.procurementType, priority: String(f.priority).toUpperCase(), requirement_description: f.requirementDescription, business_outcome: f.businessOutcome, impact_if_not_procured: f.impactIfNotProcured, intake_status: status, linked_RFx: f.linkedRfx || null, created_at: one(d, "intake_requests", "request_id", id)?.created_at || nowTs() });
  upsert("intake_scope_specs", { request_id: id, scope_description: f.scopeDescription, deliverables: f.deliverables, specification_type: f.specificationType, compliance_requirements: J(splitList(f.complianceRequirements)), geography_coverage: J(splitList(f.geographyCoverage)), transition_requirement: f.transitionRequirement, documentation_attachments: J(splitList(f.documentationAttachments)) });
  upsert("intake_strategy_governance", { request_id: id, incumbent_supplier: f.incumbentSupplier || null, suggested_suppliers: J(splitList(f.suggestedSuppliers)), sourcing_approach: f.sourcingApproach, expected_bidders_range: f.expectedBidders, contract_type: f.contractType, duration_years: Number(f.duration) || null, payment_terms_days: Number(f.paymentTerms) || null, risk_category: f.riskCategory, data_security_notes: f.dataSecurity, esg_requirement: f.esgRequirement });
  upsert("intake_commercials_timelines", { request_id: id, cost_center: f.costCenter, approved_budget: Number(f.approvedBudget) || null, currency: f.currency, capex_opex: f.capexOpex, sourcing_start_date: normalizeFormDate(f.sourcingStartDate, TODAY), rfp_issue_date: normalizeFormDate(f.rfpIssueDate), award_date: normalizeFormDate(f.awardDate), service_start_date: normalizeFormDate(f.serviceStartDate), linked_RFx: f.linkedRfx || null });
  upsert("intake_evaluation_weights", { request_id: id, commercial_weight: Number(f.commercialWeight), technical_weight: Number(f.technicalWeight), compliance_weight: Number(f.complianceWeight) });
}
const NEW_INTAKE = (n) => ({ requestId: `REQ-${TODAY.replace(/-/g, "")}-${String(n).padStart(4, "0")}`, requestorName: "", employeeId: "", businessUnit: "", location: "", requestType: "Services", category: "IT Services", procurementType: "Strategic Sourcing", priority: "MEDIUM", requirementDescription: "", businessOutcome: "", impactIfNotProcured: "", scopeDescription: "", deliverables: "", specificationType: "Technical", complianceRequirements: "", geographyCoverage: "", transitionRequirement: "", documentationAttachments: "", incumbentSupplier: "", suggestedSuppliers: "", sourcingApproach: "RFP", expectedBidders: "3-5", contractType: "Master Services Agreement", duration: 3, paymentTerms: 45, riskCategory: "", dataSecurity: "", esgRequirement: "", costCenter: "", approvedBudget: "", currency: "USD", capexOpex: "OPEX", sourcingStartDate: TODAY, rfpIssueDate: "", awardDate: "", serviceStartDate: "", commercialWeight: 40, technicalWeight: 40, complianceWeight: 20, intakeStatus: "DRAFT", linkedRfx: null });

function DemandIntake({ db, mutate, push, setPage, setRfxId, rfxId, openRecord, gotoTable, user, role, can, setRunReq, navTick, decideApproval, refreshSnapshot }) {
  const fullName = `${user.NAME_FIRST} ${user.NAME_LAST}`;
  const isBiz = ["BIZ_USER", "BIZ_MGR"].includes(user.PLATFORM_ROLE);
  const canRaise = isBiz || can("ADMIN"); const canRaiseOnBehalf = can("PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  const myRoleIds = user.PLATFORM_ROLE === "PROC_HEAD" ? ["PROC_HEAD", "PROC_MGR"] : [user.PLATFORM_ROLE];
  const inMyChain = (r) => db.intake_approvals.some((a) => a.request_id === r.request_id && myRoleIds.includes(a.role_id));
  const visible = isBiz && !can("ADMIN") ? db.intake_requests.filter((r) => r.requestor_name === fullName || r.business_unit === user.ORGEH || inMyChain(r)) : db.intake_requests;
  const [view, setView] = useState("list"); // list | new | detail
  useEffect(() => { if (navTick) setView("list"); }, [navTick]);
  const [mode, setMode] = useState(null); // form | ai
  const [layout, setLayout] = useState(IS_V4 ? "table" : "grouped");
  const [showFilters, setShowFilters] = useState(IS_V4);
  const [flt, setFlt] = useState({ q: "", category: "All", priority: "All", bu: "All", value: "All" });
  const budgetOf0 = (r) => one(db, "intake_commercials_timelines", "request_id", r.request_id)?.approved_budget || 0;
  const applyFilters = (rows) => !IS_V4 ? rows : rows.filter((r) => { const b = budgetOf0(r); const hay = `${r.request_id} ${r.requirement_description} ${r.category} ${r.requestor_name} ${r.priority} ${r.intake_status} ${r.business_unit} ${b}`.toLowerCase(); return (!flt.q || hay.includes(flt.q.toLowerCase())) && (flt.category === "All" || r.category === flt.category) && (flt.priority === "All" || r.priority === flt.priority) && (flt.bu === "All" || r.business_unit === flt.bu) && (flt.value === "All" || (flt.value === "<100K" ? b < 100000 : flt.value === "100K-1M" ? b >= 100000 && b < 1000000 : b >= 1000000)); });
  const [reqId, setReqId] = useState(null);
  const [form, setForm] = useState(null);
  const [onBehalf, setOnBehalf] = useState("");
  const bizUsers = db.enterprise_user_master.filter((u) => ["BIZ_USER", "BIZ_MGR"].includes(u.PLATFORM_ROLE));
  const startNew = () => { const ru = onBehalf ? one(db, "enterprise_user_master", "BNAME", onBehalf) : user; const n = db.intake_requests.length + 1; setForm({ ...NEW_INTAKE(n), requestorName: `${ru.NAME_FIRST} ${ru.NAME_LAST}`, employeeId: ru.PERSNO, businessUnit: ru.ORGEH, location: ru.WERKS, costCenter: ru.KOSTL, __requestor: ru }); setMode(null); setView("new"); };
  const openDetail = (id) => { setReqId(id); setForm(intakeToForm(db, id)); setView("detail"); };
  useEffect(() => { if (view === "detail" && reqId) { const f = intakeToForm(db, reqId); if (f) setForm(f); } }, [db, reqId, view]);
  const budgetOf = (r) => one(db, "intake_commercials_timelines", "request_id", r.request_id)?.approved_budget || 0;
  const shown = applyFilters(visible);
  const EMPTY = { UNDER_REVIEW: ["⏳", "Nothing in approval", "Submitted requests wait here while Procurement, Finance and Legal review them."], APPROVED: ["✓", "No approved requests yet", "Once the chain completes, requests move here and a draft RFx is opened."], DRAFT: ["📝", "No drafts", "Requests saved as In Process appear here until they are submitted."], REJECTED: ["↩", "Nothing returned", "Requests sent back for rework will show here."] };
  const groups = (IS_V4 ? [["DRAFT", "In Process", "amber"], ["UNDER_REVIEW", "Submitted · in approval", "blue"], ["APPROVED", "Approved · RFP Generated", "green"], ["REJECTED", "Rejected", "red"]] : [["UNDER_REVIEW", "In Approval", "amber"], ["APPROVED", "Approved · RFx opened", "green"], ["DRAFT", "Draft", "gray"], ["REJECTED", "Returned", "red"]]).map(([st, l, c]) => ({ st, l, c, rows: shown.filter((r) => r.intake_status === st) })).filter((g) => g.rows.length || g.st !== "REJECTED");
  const exportCsv = () => { const rows = [["request_id", "category", "requestor", "business_unit", "priority", "status", "budget", "created", "linked_rfx"], ...shown.map((r) => [r.request_id, r.category, r.requestor_name, r.business_unit, r.priority, r.intake_status, budgetOf0(r), r.created_at, r.linked_RFx || ""])]; download("sourcing_requests.csv", rows.map((x) => x.map((v) => `"${v}"`).join(",")).join(" "), "text/csv"); push("Exported", "sourcing_requests.csv"); };
  const submitted = (f, requestor) => {
    let first = "Procurement", n = 3;
    mutate((d) => { writeIntake(d, f, "UNDER_REVIEW"); const chain = buildIntakeChain(d, f.requestId, Number(f.approvedBudget) || 0); first = chain[0]?.approver_role; n = chain.length; d.intake_approvals = [...d.intake_approvals.map((a) => (a.request_id === f.requestId && !["ARCHIVED", "RETURNED"].includes(a.approval_status) ? { ...a, approval_status: a.approval_status === "REJECTED" ? "RETURNED" : "ARCHIVED" } : a)), ...chain]; });
    push("Request submitted", `${f.requestId} written to the intake tables and routed to ${first} (step 1 of ${n}).`); openDetail(f.requestId);
  };
  const Avatar = ({ name }) => <span className="di2-avatar">{name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>;
  const Card = ({ r }) => { const ch = q(db, "intake_approvals", "request_id", r.request_id).filter((a) => !["ARCHIVED", "RETURNED"].includes(a.approval_status)); return (
    <div className="di2-card" onClick={() => openDetail(r.request_id)}>
      <div className="di2-card-top"><span className="di2-id">{r.request_id}</span><span className={`di2-prio ${r.priority.toLowerCase()}`}>{nice(r.priority)}</span></div>
      <div className="di2-card-title">{r.requirement_description}</div>
      <div className="di2-card-cat">{r.category}</div>
      <div className="di2-card-who"><Avatar name={r.requestor_name} />{r.requestor_name}</div>
      <div className="di2-card-meta"><span>$ {Number(budgetOf(r)).toLocaleString()}</span><span>📅 {fmtDate(r.created_at)}</span>{ch.length > 0 && <span className="home-chain">{ch.sort((a, b) => a.approval_sequence - b.approval_sequence).map((c) => <span key={c.approval_id} className={`hc ${c.approval_status.toLowerCase()}`} title={`${c.approver_role}: ${nice(c.approval_status)}`}>{c.approver_role[0]}</span>)}</span>}</div>
    </div>); };

  if (view === "list") return (
    <div className="di2">
      {canRaise || canRaiseOnBehalf ? <div className="di2-banner"><span className="ic">💬</span><div><b>AI Intake Assistant</b><div>Describe what you need in plain language — the assistant captures the request, pre-fills your details from SAP, and routes it for approval.</div></div></div> : null}
      <div className="di2-head"><div><h2>Demand Intake</h2><p>Manage sourcing requests and demand pipeline</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{!canRaise && canRaiseOnBehalf && <select value={onBehalf} onChange={(e) => setOnBehalf(e.target.value)} style={{ maxWidth: 240 }}><option value="">On behalf of… (business user)</option>{bizUsers.map((u) => <option key={u.BNAME} value={u.BNAME}>{u.NAME_FIRST} {u.NAME_LAST} · {u.ORGEH}</option>)}</select>}{(canRaise || canRaiseOnBehalf) && <button className="btn btn-primary" disabled={!canRaise && !onBehalf} onClick={startNew}>＋ New Sourcing Request</button>}</div></div>
      <div className="di2-kpis">
        {(IS_V4 ? [["In Process", visible.filter((r) => r.intake_status === "DRAFT").length, "⏱", "not yet submitted"], ["Submitted", visible.filter((r) => ["UNDER_REVIEW", "APPROVED"].includes(r.intake_status) && !r.linked_RFx).length, "📄", `${visible.filter((r) => r.intake_status === "UNDER_REVIEW").length} awaiting approval`], ["RFP Generated", visible.filter((r) => r.linked_RFx).length, "✓", "converted to RFx"], ["Total Est. Value", fmtUsd(visible.reduce((a, r) => a + budgetOf(r), 0)), "$", `${visible.length} requests`]] : [["In Approval", visible.filter((r) => r.intake_status === "UNDER_REVIEW").length, "⏱", "awaiting Procurement / Finance / Legal"], ["Approved", visible.filter((r) => r.intake_status === "APPROVED").length, "✓", `${visible.filter((r) => r.linked_RFx).length} with RFx opened`], ["Drafts", visible.filter((r) => r.intake_status === "DRAFT").length, "📄", "not yet submitted"], ["Total Est. Value", fmtUsd(visible.reduce((a, r) => a + budgetOf(r), 0)), "$", `${visible.length} requests`]]).map((k) => <div key={k[0]} className="card di2-kpi"><div><div className="lbl">{k[0]}</div><div className="val">{k[1]}</div><div className="sub">{k[3]}</div></div><span className="ic">{k[2]}</span></div>)}
      </div>
      <div className="di2-listhead"><h3>Sourcing Requests <span className="muted">({shown.length}{shown.length !== visible.length ? ` of ${visible.length}` : ""} total)</span></h3><div className="di2-toolbar"><div className="tabs"><button className={`tab ${layout === "grouped" ? "active" : ""}`} onClick={() => setLayout("grouped")}>▦ Grouped</button><button className={`tab ${layout === "table" ? "active" : ""}`} onClick={() => setLayout("table")}>☰ Table</button></div>{IS_V4 && <><button className="btn btn-ghost" onClick={() => push("Refreshed", `${visible.length} requests loaded from intake_requests.`)}>⟳ Refresh</button><button className={`btn ${showFilters ? "btn-primary" : "btn-ghost"}`} onClick={() => setShowFilters((x) => !x)}>⛛ {showFilters ? "Hide Filters" : "Show Filters"}</button><button className="btn btn-ghost" onClick={exportCsv}>⬇ Export</button></>}</div></div>
      {IS_V4 && showFilters && <div className="card di2-filters"><div><label>Search</label><input className="ex-search" style={{ width: "100%", minWidth: 0 }} placeholder="Search by request ID, title, category, requester, priority, status, value or business unit…" value={flt.q} onChange={(e) => setFlt((f) => ({ ...f, q: e.target.value }))} /></div>
        <div className="di2-filter-row"><div><label>Category</label><select value={flt.category} onChange={(e) => setFlt((f) => ({ ...f, category: e.target.value }))}><option>All</option>{[...new Set(visible.map((r) => r.category))].sort().map((c) => <option key={c}>{c}</option>)}</select></div><div><label>Priority</label><select value={flt.priority} onChange={(e) => setFlt((f) => ({ ...f, priority: e.target.value }))}><option>All</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></div><div><label>Business Unit</label><select value={flt.bu} onChange={(e) => setFlt((f) => ({ ...f, bu: e.target.value }))}><option>All</option>{[...new Set(visible.map((r) => r.business_unit))].sort().map((c) => <option key={c}>{c}</option>)}</select></div><div><label>Estimated Value</label><select value={flt.value} onChange={(e) => setFlt((f) => ({ ...f, value: e.target.value }))}><option value="All">All</option><option value="<100K">Under $100K</option><option value="100K-1M">$100K – $1M</option><option value=">1M">Over $1M</option></select></div></div>
        {(flt.q || flt.category !== "All" || flt.priority !== "All" || flt.bu !== "All" || flt.value !== "All") && <div style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm" onClick={() => setFlt({ q: "", category: "All", priority: "All", bu: "All", value: "All" })}>Clear filters</button></div>}</div>}
      {layout === "grouped" ? <div className="di2-board">{groups.map((g) => <div key={g.st} className={`di2-col ${g.c}`}><div className="di2-col-h"><span>{g.l}</span><b>{g.rows.length}</b></div>{g.rows.map((r) => <Card key={r.request_id} r={r} />)}{!g.rows.length && (IS_V4 ? <div className="di2-empty"><span className="ic">{EMPTY[g.st][0]}</span><b>{EMPTY[g.st][1]}</b><p>{EMPTY[g.st][2]}</p>{g.st === "DRAFT" && (canRaise || canRaiseOnBehalf) && <button className="btn btn-ghost btn-sm" disabled={!canRaise && !onBehalf} onClick={startNew}>＋ Start a request</button>}{g.st === "UNDER_REVIEW" && shown.length > 0 && <span className="muted" style={{ fontSize: 11.5 }}>{shown.filter((r) => r.intake_status === "APPROVED").length} approved · {shown.filter((r) => r.intake_status === "DRAFT").length} drafts</span>}</div> : <div className="muted" style={{ fontSize: 12, padding: 12 }}>None</div>)}</div>)}</div>
        : <RequestsTableV5 db={db} rows={shown} openDetail={openDetail} budgetOf={budgetOf} />}
    </div>);

  const Banner = ({ title }) => <div className="di2-hero"><button className="di2-back" onClick={() => setView("list")}>←</button><div><div className="eyebrow">Activity 01 · Agent A1</div><h2>{title}</h2></div><button className="btn di2-sop" onClick={() => setPage("faq")}>📘 Policies & SOPs</button></div>;

  if (view === "new") return (
    <div className="di2">
      <Banner title="Autonomous Demand Intake & Policy Pre-Checks" />
      <div className="di2-modes"><button className={`di2-mode ${mode === "form" ? "on form" : ""}`} onClick={() => setMode("form")}>📄 Fill the form myself</button><button className={`di2-mode ${mode === "ai" ? "on" : ""}`} onClick={() => setMode("ai")}>🤖 Let AI guide me</button>{mode && <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setMode(null)}>← Change mode</button>}</div>
      {form.__requestor && form.__requestor.BNAME !== user.BNAME && <div className="callout info" style={{ marginBottom: 12 }}>Raising on behalf of <b>{form.requestorName}</b> ({form.businessUnit}). Requestor details come from their SAP record.</div>}
      {IS_V4 && !mode && (() => { const ru = form.__requestor || user; const dm = inferDomain(ru, ""); const pf = dm ? DOMAINS_CB[dm] : null; const mine = db.intake_requests.filter((r) => r.requestor_name === form.requestorName).slice(-3).reverse(); return (
        <div className="di2-choose">
          <div className="di2-choose-grid">
            <div className="di2-choice form" onClick={() => setMode("form")}><div className="ch-ic">📄</div><h3>Fill the form myself</h3><p>A five-step form: request information, financial & timeline, requirements, supplier information, review. Best when you already have the details to hand.</p><ul><li>Requestor details pre-filled from SAP</li><li>Save as draft at any step</li><li>≈ 8–10 minutes</li></ul><span className="ch-cta">Start form →</span></div>
            <div className="di2-choice ai" onClick={() => setMode("ai")}><div className="ch-ic">🤖</div><h3>Let AI guide me</h3><p>Describe what you need in plain language. The assistant probes like a category buyer{pf ? ` — for ${ru.ORGEH} it will ask about ${pf.probe.split(",").slice(0, 3).join(",")}` : ""} — then drafts scope, deliverables and ESG text for you.</p><ul><li>Contextual questions, one at a time</li><li>Full requirement request drafted for review</li><li>≈ 3–5 minutes</li></ul><span className="ch-cta">Open assistant →</span></div>
          </div>
          <div className="di2-choose-side">
            <div className="card di2-sec"><h4>What happens next</h4><ol className="di2-next">{["You submit the request", "Procurement validates the business case", "Finance confirms budget", "Legal clears risk", "A draft RFx is opened automatically"].map((t, i) => <li key={t}><span className="n">{i + 1}</span>{t}</li>)}</ol></div>
            <div className="card di2-sec"><h4>Your profile <span className="badge awarded">SAP</span></h4><div className="di2-kv"><div className="k">Requestor</div><div className="v">{form.requestorName}</div><div className="k">Business unit</div><div className="v">{form.businessUnit}</div><div className="k">Cost center</div><div className="v mono">{form.costCenter}</div><div className="k">Location</div><div className="v">{form.location}</div>{pf && <><div className="k">Likely category</div><div className="v">{pf.name}</div></>}</div></div>
            {mine.length > 0 && <div className="card di2-sec"><h4>Your recent requests</h4>{mine.map((r) => <div key={r.request_id} className="di2-recent" onClick={() => openDetail(r.request_id)}><span className="di2-id">{r.request_id}</span><span className="t">{r.requirement_description}</span><Badge s={r.intake_status} /></div>)}</div>}
          </div>
        </div>); })()}
      {mode === "ai" && <IntakeChatbot db={db} mutate={mutate} push={push} user={form.__requestor || user} actor={user} form={form} setForm={setForm} onSubmitted={() => openDetail(form.requestId)} />}
      {mode === "form" && <IntakeFormWizard db={db} form={form} setForm={setForm} onBack={() => setMode(null)} onSubmit={() => submitted(form)} onDraft={() => { mutate((d) => writeIntake(d, form, "DRAFT")); push("Draft saved", `${form.requestId} saved. Continue any time from the Drafts column.`); openDetail(form.requestId); }} />}
    </div>);

  // detail
  if (IS_V4) return <div className="di2"><RequestDetailV5 db={db} mutate={mutate} push={push} setPage={setPage} setRfxId={setRfxId} reqId={reqId} user={user} can={can} onBack={() => setView("list")} onEdit={() => { setForm({ ...intakeToForm(db, reqId), __requestor: null }); setMode("form"); setView("new"); }} decideApproval={decideApproval} refreshSnapshot={refreshSnapshot} openRfx={(rid) => { setRfxId(rid); setPage("rfx-overview"); }} /></div>;
  const r = one(db, "intake_requests", "request_id", reqId); if (!r) return <div className="di2"><Banner title="Request" /><div className="card placeholder-card"><h3>Request not found</h3><button className="btn btn-ghost btn-sm" onClick={() => setView("list")}>Back to list</button></div></div>;
  const chain = q(db, "intake_approvals", "request_id", reqId).sort((a, b) => a.approval_sequence - b.approval_sequence);
  const rfxFor = r.linked_RFx ? one(db, "rfx_events", "rfx_id", r.linked_RFx) : null;
  const approveStep = (a, ok) => decideApproval.mutate({ approvalId: a.approval_id, decision: ok ? "APPROVED" : "REJECTED", comment: ok ? "Approved after review." : "Returned for revision." }, {
    onSuccess: () => refreshSnapshot(),
    onError: (error) => push("Approval rejected by server", error.message),
  });
  const sc = one(db, "intake_scope_specs", "request_id", reqId) || {}, gov = one(db, "intake_strategy_governance", "request_id", reqId) || {}, ct = one(db, "intake_commercials_timelines", "request_id", reqId) || {}, w = one(db, "intake_evaluation_weights", "request_id", reqId) || {};
  const KV = ({ rows }) => <div className="di2-kv">{rows.map(([k, v]) => <React.Fragment key={k}><div className="k">{k}</div><div className="v">{v || <span className="muted">—</span>}</div></React.Fragment>)}</div>;
  return (
    <div className="di2">
      <Banner title={r.requirement_description.slice(0, 80)} />
      <div className="di2-detail-top"><div><span className="di2-id" style={{ fontSize: 14 }}>{r.request_id}</span> <Badge s={r.intake_status} /> <Badge s={r.priority} /> <span className="muted">· {r.category} · raised by {r.requestor_name} on {fmtDate(r.created_at)}</span></div>
        <div style={{ display: "flex", gap: 8 }}>{r.intake_status === "DRAFT" && (r.requestor_name === fullName || can("ADMIN", "PROC_MGR", "PROC_HEAD", "PROC_TEAM")) && <button className="btn btn-primary btn-sm" onClick={() => { setForm({ ...intakeToForm(db, reqId), __requestor: null }); setMode("form"); setView("new"); }}>Continue draft</button>}<button className="btn btn-primary btn-sm" onClick={() => { setRunReq && setRunReq(r.request_id); setPage("autonomous-run"); }}>⚡ Autonomous run</button>{rfxFor && <button className="btn btn-ghost btn-sm" onClick={() => { setRfxId(rfxFor.rfx_id); setPage("rfp-workflow-status"); }}>Open {rfxFor.rfx_id} →</button>}</div></div>
      <div className="card" style={{ padding: 16, marginBottom: 14 }}><div className="cc-side-title">Approval chain · Business → Procurement → Finance → Legal</div><div className="ia-chain">
        <div className="ia-step done"><span className="n">✓</span><div><b>Business</b><div className="muted">{r.requestor_name} · raised</div></div></div>
        {chain.map((a) => { const mine = a.role_id === user.PLATFORM_ROLE && a.approver_bname?.trim() === user.BNAME?.trim(); const who = one(db, "enterprise_user_master", "BNAME", a.approver_bname); return <div key={a.approval_id} className={`ia-step ${a.approval_status.toLowerCase()}`}><span className="n">{a.approval_status === "APPROVED" ? "✓" : a.approval_sequence}</span><div><b>{a.approver_role}</b><div className="muted">{who ? `${who.NAME_FIRST} ${who.NAME_LAST}` : a.approver_role} · {nice(a.approval_status)}{a.approved_at ? ` · ${a.approved_at.slice(0, 16)}` : ""}</div>{a.comments && <div className="muted" style={{ fontSize: 11 }}>{a.comments}</div>}{a.approval_status === "PENDING" && mine && <div style={{ display: "flex", gap: 6, marginTop: 6 }}><button className="btn btn-primary btn-sm" onClick={() => approveStep(a, true)}>Approve</button><button className="btn btn-ghost btn-sm" onClick={() => approveStep(a, false)}>Return</button></div>}{a.approval_status === "PENDING" && !mine && <div className="muted" style={{ fontSize: 11 }}>awaiting {a.approver_role}</div>}</div></div>; })}
        <div className={`ia-step ${r.intake_status === "APPROVED" ? "done" : "queued"}`}><span className="n">{r.intake_status === "APPROVED" ? "✓" : "→"}</span><div><b>RFx opened</b><div className="muted">{rfxFor ? `${rfxFor.rfx_id} · owner ${P(rfxFor.owner, {}).name}` : "Procurement, after Legal"}</div></div></div>
        {chain.length === 0 && <div className="ia-step queued"><span className="n">…</span><div><b>Not submitted</b><div className="muted">Draft — continue to submit for approval</div></div></div>}
      </div></div>
      <div className="di2-detail-grid">
        <div className="card di2-sec"><h4>Requestor <span className="badge awarded">SAP</span></h4><KV rows={[["Name", r.requestor_name], ["Employee ID", r.employee_id], ["Business unit", r.business_unit], ["Location", r.location]]} /></div>
        <div className="card di2-sec"><h4>Request</h4><KV rows={[["Type", `${r.request_type} · ${r.procurement_type}`], ["Description", r.requirement_description], ["Business outcome", r.business_outcome], ["Impact if not procured", r.impact_if_not_procured]]} /></div>
        <div className="card di2-sec"><h4>Scope & specifications</h4><KV rows={[["Scope", sc.scope_description], ["Deliverables", sc.deliverables], ["Geography", P(sc.geography_coverage).join(", ")], ["Transition", sc.transition_requirement], ["Compliance", P(sc.compliance_requirements).join(", ")], ["Data security", gov.data_security_notes], ["ESG", gov.esg_requirement]]} /></div>
        <div className="card di2-sec"><h4>Financial & timeline</h4><KV rows={[["Budget", ct.approved_budget ? `${ct.currency} ${Number(ct.approved_budget).toLocaleString()} · ${ct.capex_opex}` : null], ["Cost center", ct.cost_center], ["Sourcing start", fmtDate(ct.sourcing_start_date)], ["RFP issue", ct.rfp_issue_date ? fmtDate(ct.rfp_issue_date) : null], ["Award", ct.award_date ? fmtDate(ct.award_date) : null], ["Service start", ct.service_start_date ? fmtDate(ct.service_start_date) : null]]} /></div>
        <div className="card di2-sec"><h4>Supplier & strategy</h4><KV rows={[["Incumbent", gov.incumbent_supplier], ["Suggested", P(gov.suggested_suppliers).join(", ")], ["Approach", `${gov.sourcing_approach || ""} · ${gov.expected_bidders_range || ""} bidders`], ["Contract", `${gov.contract_type || ""} · ${gov.duration_years ?? ""} yr · Net ${gov.payment_terms_days ?? ""}`], ["Weights", w.commercial_weight != null ? `Commercial ${w.commercial_weight} · Technical ${w.technical_weight} · Compliance ${w.compliance_weight}` : null]]} /></div>
        <div className="card di2-sec"><h4>Records</h4><KV rows={[["intake_requests", <Ref t="intake_requests" c="request_id" v={r.request_id} openRecord={openRecord} />], ["Documents", q(db, "intake_documents", "request_id", reqId).map((d2) => one(db, "documents", "document_id", d2.document_id)?.file_name).join(", ")], ["Linked RFx", rfxFor ? <Ref t="rfx_events" c="rfx_id" v={rfxFor.rfx_id} openRecord={openRecord} /> : null]]} /></div>
      </div>
    </div>);
}

/* ---- 5-step manual form wizard ---- */
function IntakeFormWizard({ db, form, setForm, onBack, onSubmit, onDraft }) {
  const [step, setStep] = useState(0);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const STEPS = [["Request Information", "📄"], ["Financial & Timeline", "$"], ["Requirements & Supporting Info", "◎"], ["Supplier Information", "👥"], ["Review & Submit", "✓"]];
  const F = ({ k, label, type = "text", req, ro, ph, options, area }) => <div><label>{label}{req && <span className="req"> *</span>}</label>{options ? <select value={form[k] ?? ""} onChange={(e) => set(k)(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}</select> : area ? <textarea value={form[k] ?? ""} onChange={(e) => set(k)(e.target.value)} placeholder={ph} /> : <input type={type} value={form[k] ?? ""} readOnly={ro} placeholder={ph} onChange={(e) => set(k)(e.target.value)} style={ro ? { background: "#f4f6f9" } : {}} />}</div>;
  const valid = [form.requirementDescription && form.category, true, true, true, true][step];
  const weightsOk = Number(form.commercialWeight) + Number(form.technicalWeight) + Number(form.complianceWeight) === 100;
  return (
    <div>
      <div className="di2-wiz-head"><button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button><div><h3>New Sourcing Request</h3><div className="muted" style={{ fontSize: 12.5 }}>Complete all steps to submit your procurement demand request</div></div></div>
      <div className="card di2-steps">{STEPS.map(([l, ic], i) => <React.Fragment key={l}><div className={`di2-step ${i === step ? "on" : i < step ? "done" : ""}`} onClick={() => i < step && setStep(i)}><span className="c">{i < step ? "✓" : ic}</span><span className="l">{l}</span></div>{i < STEPS.length - 1 && <div className={`di2-step-line ${i < step ? "done" : ""}`}></div>}</React.Fragment>)}</div>
      <div className="card di2-wiz-body">
        {step === 0 && <><h4>Request Information</h4><p className="muted">Provide the fundamental details about your sourcing request.</p>
          <div className="field-row single"><F k="requirementDescription" label="Request Title / Requirement" req area ph="Describe the requirement" /></div>
          <div className="field-row"><F k="businessOutcome" label="Business Outcome" area /><F k="impactIfNotProcured" label="Impact if Not Procured" area /></div>
          <div className="field-row"><F k="businessUnit" label="Business Unit" ro /><F k="requestorName" label="Requestor" ro /></div>
          <div className="field-row"><F k="location" label="Location" ro /><F k="employeeId" label="Employee ID" ro /></div>
          <div className="field-row"><F k="requestType" label="Request Type" req options={["Services", "Goods", "Goods & Services", "Software"]} /><F k="category" label="Category" req options={db.rfx_category.map((c) => c.category_name)} /></div>
          <div className="field-row"><F k="procurementType" label="Procurement Type" options={["Strategic Sourcing", "Tactical Sourcing", "Renewal"]} /><F k="priority" label="Priority" options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} /></div></>}
        {step === 1 && <><h4>Financial & Timeline</h4><p className="muted">Budget, cost allocation and key dates.</p>
          <div className="field-row"><F k="approvedBudget" label="Approved Budget" type="number" /><F k="costCenter" label="Cost Center" /></div>
          <div className="field-row"><F k="currency" label="Currency" options={["USD", "EUR", "GBP", "INR"]} /><F k="capexOpex" label="Capex / Opex" options={["OPEX", "CAPEX"]} /></div>
          <div className="field-row"><F k="sourcingStartDate" label="Sourcing Start Date" type="date" /><F k="rfpIssueDate" label="RFP Issue Date" type="date" /></div>
          <div className="field-row"><F k="awardDate" label="Award Date" type="date" /><F k="serviceStartDate" label="Service Start Date" type="date" /></div></>}
        {step === 2 && <><h4>Requirements & Supporting Info</h4><p className="muted">Scope, deliverables, specifications and compliance.</p>
          <div className="field-row"><F k="scopeDescription" label="Scope Description" area /><F k="deliverables" label="Deliverables" area /></div>
          <div className="field-row"><F k="geographyCoverage" label="Geography Coverage (comma-separated)" /><F k="transitionRequirement" label="Transition Requirement" /></div>
          <div className="field-row"><F k="specificationType" label="Specification Type" /><F k="complianceRequirements" label="Compliance Requirements (comma-separated)" /></div>
          <div className="field-row"><F k="dataSecurity" label="Data Security Notes" /><F k="esgRequirement" label="ESG Requirement" /></div>
          <div className="section-label" style={{ marginTop: 6 }}>Evaluation weights {!weightsOk && <span className="badge closed" style={{ marginLeft: 6 }}>must total 100</span>}</div>
          <div className="field-row"><F k="commercialWeight" label="Commercial" type="number" /><F k="technicalWeight" label="Technical" type="number" /></div><div className="field-row single"><F k="complianceWeight" label="Compliance" type="number" /></div></>}
        {step === 3 && <><h4>Supplier Information</h4><p className="muted">Incumbent, preferred suppliers and contracting approach.</p>
          <div className="field-row"><F k="incumbentSupplier" label="Incumbent Supplier" options={["", ...db.supplier.slice(0, 12).map((s) => s.name)]} /><F k="suggestedSuppliers" label="Suggested Suppliers (comma-separated)" /></div>
          <div className="field-row"><F k="sourcingApproach" label="Sourcing Approach" options={["RFP", "RFQ", "RFI"]} /><F k="expectedBidders" label="Expected Bidders" /></div>
          <div className="field-row"><F k="contractType" label="Contract Type" /><F k="duration" label="Duration (years)" type="number" /></div>
          <div className="field-row single"><F k="paymentTerms" label="Payment Terms (days)" type="number" /></div></>}
        {step === 4 && <><h4>Review & Submit</h4><p className="muted">Check the summary, then submit for Procurement → Finance → Legal approval.</p>
          <div className="di2-kv">{[["Request", form.requestId], ["Requestor", `${form.requestorName} · ${form.employeeId} · ${form.businessUnit}`], ["Category", `${form.category} · ${form.requestType} · ${form.procurementType} · ${form.priority}`], ["Requirement", form.requirementDescription], ["Outcome", form.businessOutcome], ["Scope", form.scopeDescription], ["Geography", form.geographyCoverage], ["Compliance", form.complianceRequirements], ["Budget", `${form.currency} ${Number(form.approvedBudget || 0).toLocaleString()} · ${form.capexOpex} · ${form.costCenter}`], ["Timeline", `issue ${form.rfpIssueDate || "—"} · award ${form.awardDate || "—"} · start ${form.serviceStartDate || "—"}`], ["Suppliers", `${form.incumbentSupplier || "no incumbent"} · ${form.suggestedSuppliers || "—"}`], ["Contract", `${form.sourcingApproach} · ${form.contractType} · ${form.duration} yr · Net ${form.paymentTerms}`]].map(([k, v]) => <React.Fragment key={k}><div className="k">{k}</div><div className="v">{v || <span className="muted">—</span>}</div></React.Fragment>)}</div></>}
      </div>
      <div className="card di2-wiz-foot"><span className="muted">📄 Step {step + 1} of {STEPS.length}</span><div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={onDraft}>💾 Save Draft</button>{step > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}>← Previous</button>}{step < 4 ? <button className="btn btn-primary btn-sm" disabled={!valid} onClick={() => setStep(step + 1)}>Next →</button> : <button className="btn btn-primary btn-sm" disabled={!weightsOk || !form.requirementDescription} onClick={onSubmit}>{form.intakeStatus === "REJECTED" ? "Resubmit for approval" : "Submit for approval"}</button>}</div></div>
    </div>);
}


function RequestsTableV5({ db, rows, openDetail, budgetOf }) {
  const [tab, setTab] = useState("All"); const [qq, setQq] = useState(""); const [pg, setPg] = useState(0); const PAGE = 10;
  const label = (r) => r.intake_status === "DRAFT" ? "In_Process" : r.intake_status === "REJECTED" ? "Returned" : r.linked_RFx ? "RFP_Generated" : "Submitted";
  const TABS = ["All", "In_Process", "Submitted", "Returned", "RFP_Generated"]; const counts = Object.fromEntries(TABS.map((t) => [t, rows.filter((r) => t === "All" || label(r) === t).length]));
  const list = rows.filter((r) => (tab === "All" || label(r) === tab) && (!qq || `${r.request_id} ${r.requirement_description} ${r.category} ${r.requestor_name} ${r.business_unit} ${r.priority} ${label(r)}`.toLowerCase().includes(qq.toLowerCase()))).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const pages = Math.max(1, Math.ceil(list.length / PAGE)); const pageRows = list.slice(pg * PAGE, pg * PAGE + PAGE);
  const requiredBy = (r) => one(db, "intake_commercials_timelines", "request_id", r.request_id)?.service_start_date || one(db, "intake_commercials_timelines", "request_id", r.request_id)?.award_date;
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: "14px 16px 0" }}><h3 style={{ margin: "0 0 10px", fontSize: 15 }}>All Requests</h3><input className="ex-search" style={{ width: "100%", minWidth: 0, marginBottom: 10 }} placeholder="Search by request ID, title, category, requester, priority, status…" value={qq} onChange={(e) => { setQq(e.target.value); setPg(0); }} />
        <div className="tabs" style={{ marginBottom: 10 }}>{TABS.map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => { setTab(t); setPg(0); }}>{t.replace("_", " ")} ({counts[t]})</button>)}</div></div>
      <table className="v4-table"><thead><tr><th>Request ID</th><th>Request Title</th><th>Requester</th><th>Estimated Value</th><th>Priority</th><th>Required By</th><th>Status</th></tr></thead>
        <tbody>{pageRows.length === 0 && <tr><td colSpan="7" className="loading-row">No requests match.</td></tr>}{pageRows.map((r) => <tr key={r.request_id} onClick={() => openDetail(r.request_id)} style={{ cursor: "pointer" }}><td><span className="di2-id">{r.request_id}</span></td><td><div style={{ fontWeight: 600, maxWidth: 380, whiteSpace: "normal" }}>{r.requirement_description}</div><div className="muted" style={{ fontSize: 11 }}>{r.category}</div></td><td><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="di2-avatar">{r.requestor_name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span><div><div style={{ fontWeight: 600 }}>{r.requestor_name}</div><div className="muted" style={{ fontSize: 11 }}>{r.business_unit}</div></div></div></td><td>${Number(budgetOf(r)).toLocaleString()}</td><td><span className={`di2-prio ${r.priority.toLowerCase()}`}>{nice(r.priority)}</span></td><td>{fmtDate(requiredBy(r))}</td><td><span className={`badge ${label(r) === "RFP_Generated" ? "awarded" : label(r) === "Submitted" ? "open" : label(r) === "Returned" ? "closed" : "closing"}`}>{label(r)}</span></td></tr>)}</tbody></table>
      <div className="v5-pager"><span className="muted">Showing {list.length ? pg * PAGE + 1 : 0} to {Math.min(list.length, (pg + 1) * PAGE)} of {list.length} results</span><div style={{ display: "flex", gap: 6 }}><button className="btn btn-ghost btn-sm" disabled={pg === 0} onClick={() => setPg((p) => p - 1)}>‹ Previous</button><button className="btn btn-ghost btn-sm" disabled={pg >= pages - 1} onClick={() => setPg((p) => p + 1)}>Next ›</button></div></div>
    </div>);
}


/* ============================= V5: CONTRACTING COCKPIT (C1–C8b) — embedded prototype wired to contract tables ============================= */
function contractContext(db, c) {
  const rfx = one(db, "rfx_events", "rfx_id", c.linked_rfx); const fin = one(db, "negotiation_finalization", "rfx_id", c.linked_rfx); const sup = fin ? one(db, "supplier", "supplier_id", fin.supplier_id) : null;
  const req = db.intake_requests.find((r) => r.linked_RFx === c.linked_rfx); const ct = req ? one(db, "intake_commercials_timelines", "request_id", req.request_id) : null; const gov = req ? one(db, "intake_strategy_governance", "request_id", req.request_id) : null;
  const years = gov?.duration_years || 3; const annual = Math.round((c.contract_value || 0) / years);
  const fmtLong = (ts) => new Date(String(ts).replace(" ", "T") + "Z").toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return { c, rfx, fin, sup, req, ct, gov, years, annual, title: `${c.contract_type} – ${(rfx?.title || "").split(" – ")[0]}`, slug: `${c.contract_type}_${(rfx?.title || "").split(" – ")[0]}`.replace(/[^A-Za-z0-9]+/g, "_"), supplier: sup?.legal_name || sup?.name || "Awarded supplier", supplierShort: sup?.name || "Supplier", created: fmtLong(c.created_at), start: fmtDate(ct?.service_start_date || TODAY), end: fmtDate(addDaysIso(ct?.service_start_date || TODAY, years * 365)), category: one(db, "rfx_category", "rfx_category", rfx?.rfx_category)?.category_name || "" };
}
function buildCockpitDoc(db, c, user) {
  const x = contractContext(db, c); let h = CLM_PROTO_CONTRACTING;
  const me = `${user.NAME_FIRST} ${user.NAME_LAST}`; const usd = (n) => `USD ${Number(n).toLocaleString()}`; const m = (n) => `$${(n / 1e6).toFixed(3)}M`;
  const rep = [["Master_Facilities_Management_Agreement", x.slug], ["Master_Facilities_Agreement", x.slug], ["Master Facilities Management Agreement", x.title], ["Apex Facility Solutions Inc.", x.supplier], ["Apex Facility Solutions", x.supplierShort], ["HCL Technologies Ltd.", "Leona Corporation"], ["HCL Technologies", "Leona Corporation"], ["Cognitive S2C Platform", "Contracting Cockpit"], ["HCLTech", "S2C Platform"], ["Raman Kapuganti", me], ["CRQ-2026-0842", x.c.contract_id], ["HCL-FM-2026-0842", x.c.contract_id], ["May 24, 2024 09:30 AM", x.created], ["May 24, 2024", x.created.split(",")[0] + "," + x.created.split(",")[1]], ["Jan 01, 2027", x.start], ["Dec 31, 2029", x.end], ["USD 3,095,000", usd(x.annual)], ["USD 3.095M", m(x.annual)], ["$3.095M", m(x.annual)], ["Facilities Management", x.category || "Facilities Management"], ["Corporate Facilities", x.req?.business_unit || "Business Unit"]];
  rep.forEach(([a, b]) => { h = h.split(a).join(b); });
  const bridge = `<style>.brand-area{display:none!important}.sidebar{padding-top:8px}</style><script>(function(){var send=function(p){try{parent.postMessage(Object.assign({type:"s2c-cockpit",contract:${JSON.stringify(c.contract_id)}},p),"*");}catch(e){}};var wrap=function(name,fn){var o=window[name];if(typeof o!=="function")return;window[name]=function(){var r=o.apply(this,arguments);try{fn.apply(this,arguments);}catch(e){}return r;};};document.addEventListener("DOMContentLoaded",function(){wrap("proceedNextStage",function(){send({action:"complete",stage:(window.STAGES||[])[window.currentStageIndex]?.id});});wrap("approveStage",function(id){send({action:"approve",stage:id});});wrap("selectStage",function(i){send({action:"select",stage:(window.STAGES||[])[i]?.id});});wrap("sendOutboundEmail",function(){send({action:"email",stage:"C8a"});});});})();</script></body>`;
  return h.replace("</body>", bridge);
}
function ContractingCockpit({ db, mutate, push, setPage, setRfxId, user, can, openRecord }) {
  const contracts = db.contract_intake_requests;
  const [sel, setSel] = useState(contracts[0]?.contract_id);
  const c = contracts.find((x) => x.contract_id === sel) || contracts[0];
  const [stage, setStage] = useState("C1");
  const doc = useMemo(() => (c ? buildCockpitDoc(db, c, user) : ""), [c?.contract_id, user.BNAME]);
  useEffect(() => {
    const h = (ev) => { const p = ev.data; if (!p || p.type !== "s2c-cockpit" || p.contract !== c?.contract_id) return; if (p.action === "select") { setStage(p.stage); return; }
      if (p.action !== "complete" && p.action !== "approve" && p.action !== "email") return;
      const who = `${user.NAME_FIRST} ${user.NAME_LAST}`; const cid = c.contract_id;
      mutate((d) => {
        const addDoc = (title, type, file, size) => { const id = nextDocId(d); d.documents = [...d.documents, { document_id: id, title, document_type: type, status: "ACTIVE", file_path: `/docs/contracts/${cid}/${file}`, file_name: file, file_size_bytes: size, created_by: who, created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.contract_documents = [...d.contract_documents, { contract_id: cid, document_id: id, visibility: "INTERNAL", classification: "CONFIDENTIAL", created_at: nowTs() }]; };
        const setStatus = (st) => { d.contract_intake_requests = d.contract_intake_requests.map((x) => (x.contract_id === cid ? { ...x, intake_status: st } : x)); };
        if (p.action === "complete") {
          if (p.stage === "C1") { setStatus("IN_REVIEW"); d.contract_intake_requests = d.contract_intake_requests.map((x) => (x.contract_id === cid ? { ...x, validated_by: who, validated_at: nowTs() } : x)); }
          if (p.stage === "C2") { addDoc(`${cid} – Award recommendation package`, "AWARD_PACKAGE", `${cid}_award_package.zip`, 24900000); addDoc(`${cid} – Ingestion & classification report`, "CLASSIFICATION_REPORT", `${cid}_classification.pdf`, 412000); }
          if (p.stage === "C3") addDoc(`${cid} – Extracted metadata`, "METADATA", `${cid}_metadata.json`, 88000);
          if (p.stage === "C4") addDoc(`${cid} – Draft v1.0 (AI generated)`, "CONTRACT_DRAFT", `${cid}_draft_v1.0.docx`, 1638400);
          if (p.stage === "C5") { const flags = ["Clause library alignment: 42/45 standard clauses", "Liability cap 24 months – within policy", "Data-breach super-cap carve-out applied"]; d.contract_risk_assessment = d.contract_risk_assessment.map((x) => (x.contract_id === cid ? { ...x, compliance_flags: J(flags) } : x)); }
          if (p.stage === "C6") d.contract_risk_assessment = d.contract_risk_assessment.map((x) => (x.contract_id === cid ? { ...x, risk_score: 31.5, legal_risk_notes: "Clause-level risk scoring (A12) complete: 3 high-risk clauses mitigated; residual risk LOW-MEDIUM.", reviewed_by: who } : x));
          if (p.stage === "C7") d.contract_risk_assessment = d.contract_risk_assessment.map((x) => (x.contract_id === cid ? { ...x, compliance_flags: J([...P(x.compliance_flags), "Regulatory mapping (A13): GDPR Art.28, Modern Slavery Act, ABC clauses present"]), mitigation_plan: "Execute DPA; add step-in rights; quarterly attestation; annual regulatory re-mapping." } : x));
          if (p.stage === "C8a") { addDoc(`${cid} – Redlined draft v1.1 (counterparty)`, "CONTRACT_REDLINE", `${cid}_redline_v1.1.docx`, 1720000); d.contract_approvals = d.contract_approvals.map((x) => (x.contract_id === cid && x.approver_role === "Legal Counsel" && x.approval_status !== "APPROVED" ? { ...x, approval_status: "APPROVED", comments: "Redlines reconciled; final draft approved.", approved_at: nowTs() } : x)); d.contract_risk_assessment = d.contract_risk_assessment.map((x) => (x.contract_id === cid ? { ...x, approved_flag: 1, approved_by: who } : x)); }
          if (p.stage === "C8b") { addDoc(`${cid} – Executed agreement`, "CONTRACT_EXECUTED", `${cid}_executed.pdf`, 2100000); d.contract_approvals = d.contract_approvals.map((x) => (x.contract_id === cid && x.approval_status !== "APPROVED" ? { ...x, approval_status: "APPROVED", comments: x.comments || "Approved at execution.", approved_at: nowTs() } : x)); setStatus("EXECUTED"); }
        }
        if (p.action === "approve") { const role = { C4: "Legal Counsel", C5: "Legal Counsel", C6: "Legal Counsel", C7: "Legal Counsel", C8a: "Finance Controller", C8b: "CPO" }[p.stage]; if (role) d.contract_approvals = d.contract_approvals.map((x) => (x.contract_id === cid && x.approver_role === role && x.approval_status !== "APPROVED" ? { ...x, approval_status: "APPROVED", comments: `HITL approval at stage ${p.stage} by ${who}.`, approved_at: nowTs() } : x)); }
        if (p.action === "email") addDoc(`${cid} – Outbound draft to ${contractContext(d, c).supplierShort}`, "CORRESPONDENCE", `${cid}_outbound_draft.eml`, 96000);
      });
      push(`Stage ${p.stage} ${p.action === "complete" ? "completed" : p.action === "approve" ? "approved" : "email sent"}`, p.action === "complete" ? { C1: "contract_intake_requests → IN_REVIEW", C2: "2 documents added to contract_documents", C3: "metadata document stored", C4: "draft v1.0 stored", C5: "compliance flags updated", C6: "risk score 31.5 recorded", C7: "regulatory mapping recorded", C8a: "redline stored · Legal approved", C8b: "executed agreement stored · status EXECUTED" }[p.stage] || "recorded" : "written to contract tables"); };
    window.addEventListener("message", h); return () => window.removeEventListener("message", h);
  }, [c?.contract_id, user.BNAME]);
  if (!c) return <div className="card placeholder-card"><div className="icon">📝</div><h3>No contracts yet</h3><p style={{ fontSize: 13 }}>Contracts are created when an award is approved (Activity 06).</p><button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setPage("award")}>Go to Award</button></div>;
  const x = contractContext(db, c); const ra = one(db, "contract_risk_assessment", "contract_id", c.contract_id); const aps = q(db, "contract_approvals", "contract_id", c.contract_id); const docs = q(db, "contract_documents", "contract_id", c.contract_id).map((dd) => one(db, "documents", "document_id", dd.document_id)).filter(Boolean);
  return (
    <div className="ck">
      <div className="rp-head"><div><div className="page-eyebrow">Contracts · C1–C8b · Agents A9 – A13 · writes contract_intake_requests, contract_documents, contract_risk_assessment, contract_approvals</div><h2 className="page-title" style={{ fontSize: 24 }}>Autonomous Contracting Cockpit</h2><p className="page-desc">Intake → ingestion → metadata → AI drafting → clause library → risk scoring → regulatory mapping → redline → execution. Every stage you complete inside the cockpit is written back to the contract tables on the right.</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><label style={{ margin: 0 }}>Contract</label><select value={c.contract_id} onChange={(e) => { setSel(e.target.value); setStage("C1"); }} style={{ maxWidth: 420 }}>{contracts.map((k) => <option key={k.contract_id} value={k.contract_id}>{k.contract_id} · {one(db, "rfx_events", "rfx_id", k.linked_rfx)?.title.slice(0, 44)} · {nice(k.intake_status)}</option>)}</select></div></div>
      <div className="ck-grid">
        <div className="card ck-frame"><iframe title="Contracting cockpit" srcDoc={doc} sandbox="allow-scripts allow-same-origin allow-modals" /></div>
        <div className="ck-side">
          <div className="card di2-sec"><h4>Contract record <span className="mono muted" style={{ fontWeight: 400 }}>{c.contract_id}</span></h4><div className="di2-kv"><div className="k">Supplier</div><div className="v">{x.supplier}</div><div className="k">Type</div><div className="v">{c.contract_type}</div><div className="k">Value</div><div className="v"><b>{fmtFull(c.contract_value)}</b> · {x.years} yr · {fmtFull(x.annual)}/yr</div><div className="k">Term</div><div className="v">{x.start} → {x.end}</div><div className="k">Status</div><div className="v"><Badge s={c.intake_status === "EXECUTED" ? "APPROVED" : c.intake_status}>{nice(c.intake_status)}</Badge></div><div className="k">Validated</div><div className="v">{c.validated_by ? `${c.validated_by} · ${c.validated_at?.slice(0, 10)}` : "—"}</div><div className="k">Cockpit stage</div><div className="v mono">{stage}</div></div></div>
          <div className="card di2-sec"><h4>Risk assessment {ra && <Badge s={ra.approved_flag ? "APPROVED" : "PENDING"}>{ra.approved_flag ? "Accepted" : "Pending"}</Badge>}</h4>{ra ? <><div style={{ display: "flex", gap: 12, alignItems: "center" }}><div className="ev-score-ring" style={{ background: `conic-gradient(${ra.risk_score > 50 ? "var(--red)" : ra.risk_score > 35 ? "var(--amber)" : "var(--emerald)"} ${ra.risk_score}%, #eef1f5 ${ra.risk_score}%)` }}><div className="hole">{Math.round(ra.risk_score)}<span className="t">risk</span></div></div><div style={{ fontSize: 12 }}>{P(ra.compliance_flags).map((f) => <div key={f}>⚑ {f}</div>)}</div></div><div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>{ra.legal_risk_notes}</div></> : <div className="muted">No assessment yet.</div>}</div>
          <div className="card di2-sec"><h4>Approvals · contract_approvals</h4>{aps.sort((a, b) => a.approval_sequence - b.approval_sequence).map((a) => <div key={a.approval_id} className="rq-appr" style={{ marginTop: 6, padding: "8px 10px" }}><span className="dot">{a.approval_status === "APPROVED" ? "✓" : "○"}</span><div><b>{a.approver_role}</b><div className="muted" style={{ fontSize: 11 }}>{a.approver_name}{a.approved_at ? ` · ${a.approved_at.slice(0, 10)}` : ""}</div></div><span style={{ marginLeft: "auto" }}><Badge s={a.approval_status} /></span></div>)}</div>
          <div className="card di2-sec"><h4>Documents · contract_documents <span className="muted" style={{ fontWeight: 400 }}>{docs.length}</span></h4>{docs.map((dd) => <div key={dd.document_id} className="rfp-file-row"><span>📄</span><span className="name">{dd.file_name}</span><span className="size">{nice(dd.document_type)}</span></div>)}{!docs.length && <div className="muted" style={{ fontSize: 12 }}>Documents appear as stages complete.</div>}</div>
        </div>
      </div>
    </div>);
}

/* ============================= V5: CLM LIFECYCLE SCREENS (NDA / Renewal / Termination / Amendment / Obligations) ============================= */
const CLM_SCREEN_START = { nda: 1, renewal: 3, termination: 5, amendment: 7, obligation: 9 };
const CLM_PROTO_LIFECYCLE = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#172033;font:14px Arial,sans-serif}.shell{display:flex;height:100vh;min-height:640px}.side{width:220px;background:#08294d;color:#dbeafe;padding:18px 12px}.brand{font-weight:800;font-size:16px;margin:4px 8px 22px}.tab{display:block;width:100%;border:0;background:transparent;color:#dbeafe;text-align:left;padding:10px 11px;margin:3px 0;border-radius:7px;cursor:pointer}.tab.active,.tab:hover{background:#1d6fc2;color:#fff}.main{flex:1;padding:24px 28px;overflow:auto}.crumb{color:#58708d;font-size:12px;margin-bottom:8px}.title{font-size:25px;font-weight:800;margin:0 0 6px}.sub{color:#64748b;margin-bottom:18px}.screen{display:none}.screen.active{display:block}.grid{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}.card{background:#fff;border:1px solid #dbe4ef;border-radius:10px;padding:16px;box-shadow:0 2px 7px #0b25450d;margin-bottom:14px}.card h3{margin:0 0 12px;font-size:15px}.kv{display:grid;grid-template-columns:145px 1fr;gap:10px;border-top:1px solid #edf1f5;padding:10px 0}.k{color:#64748b;font-size:12px}.v{font-weight:600}.badge{display:inline-block;padding:4px 8px;border-radius:99px;background:#dff6e8;color:#14763f;font-size:11px;font-weight:700}.actions{display:flex;gap:8px;margin-top:16px}.btn{border:0;border-radius:7px;padding:9px 12px;background:#1268bd;color:#fff;font-weight:700;cursor:pointer}.btn.secondary{background:#e8eef6;color:#24405e}.progress{display:flex;gap:5px;margin:14px 0}.dot{height:7px;flex:1;border-radius:5px;background:#cbd5e1}.dot.done{background:#26a269}.foot{display:flex;justify-content:space-between;margin-top:12px;color:#64748b;font-size:12px}</style></head><body>
<div class="shell"><aside class="side"><div class="brand">AS2C · CLM WORKBENCH</div><div id="tabs"></div><div style="margin:22px 8px;color:#91acc8;font-size:11px">AGENTS A9 · A10 · A11<br>A12 · A14 · A15 · A16</div></aside><main class="main"><div class="crumb">Contract Lifecycle Management · Human-in-the-loop workflow</div><h1 class="title">CLM Lifecycle Workspace</h1><div class="sub">Review the current lifecycle stage, evidence, agent actions, and approval gates before advancing.</div><div id="screens"></div><div class="foot"><span>Data lineage: nda_requests · contract_intake_requests · contract_documents · approval_workflows</span><span id="counter"></span></div></main></div>
<script>
const data=[['N1 Request','NDA request intake','Capture supplier, purpose, type, requester and requested expiry.','Contract Intake & Classification Agent A9','REQUESTED'],['N2 Draft','Autonomous draft preparation','Select the approved template, populate parties, confidentiality scope and governing law.','Autonomous Drafting Agent A10','DRAFT_READY'],['N3 Supplier review','Supplier collaboration','Route the draft to the supplier, capture comments and record redline status.','Contract Intelligence Agent A11','IN_REVIEW'],['N4 Signature','Signature and approvals','Apply legal approval gates, trigger eSignature and track outstanding signatories.','Clause Risk & Compliance Agent A12','AWAITING_SIGNATURE'],['N5 Filed','Repository filing','Store the executed NDA, metadata, obligations and expiry alerts in the repository.','Workflow Orchestration Agent A15','EXECUTED'],['R1 Renewal','Renewal readiness','Assess expiry, performance, risk and commercial options before renewal.','Contract Lifecycle Intelligence Agent A16','REVIEW'],['R2 Renewal approval','Renewal approval gate','Capture business owner decision, budget confirmation and supplier recommendation.','Workflow Orchestration Agent A15','PENDING_APPROVAL'],['A1 Amendment','Amendment intake','Assess requested changes, impacted clauses, dependencies and approval route.','Contract Intelligence Agent A11','ASSESSMENT'],['A2 Amendment approval','Amendment execution','Generate amendment package and route legal, finance and business approvals.','Clause Risk & Compliance Agent A12','PENDING_APPROVAL'],['O1 Obligations','Obligation management','Monitor confidentiality, SLA, milestones, evidence and due dates across the contract.','Contract Performance Agent A14','MONITORED']];
let current=1;const tabs=document.getElementById('tabs'), screens=document.getElementById('screens');
data.forEach((d,i)=>{const b=document.createElement('button');b.className='tab';b.textContent=d[0]+' · '+d[1];b.onclick=()=>goToScreen(i+1);tabs.appendChild(b);const s=document.createElement('section');s.className='screen';s.innerHTML='<div class="grid"><div class="card"><h3>'+d[0]+' · '+d[1]+'</h3><div class="kv"><div class="k">Lifecycle status</div><div class="v"><span class="badge">'+d[4]+'</span></div></div><div class="kv"><div class="k">Agent owner</div><div class="v">'+d[3]+'</div></div><div class="kv"><div class="k">What happens here</div><div class="v">'+d[2]+'</div></div><div class="progress">'+data.map((x,j)=>'<i class="dot '+(j<=i?'done':'')+'"></i>').join('')+'</div><div class="actions"><button class="btn" onclick="alert(\'Human review recorded for '+d[0]+'\')">Record HITL review</button><button class="btn secondary" onclick="alert(\'Next workflow action queued\')">Queue next action</button></div></div><div class="card"><h3>Evidence & controls</h3><div class="kv"><div class="k">Source records</div><div class="v">Request, supplier and document metadata</div></div><div class="kv"><div class="k">Required decision</div><div class="v">Human approval before advancing</div></div><div class="kv"><div class="k">Audit trail</div><div class="v">Immutable activity and agent run history</div></div></div></div>';screens.appendChild(s)});
function goToScreen(i){current=Math.max(1,Math.min(data.length,i));document.querySelectorAll('.screen').forEach((x,j)=>x.classList.toggle('active',j===current-1));document.querySelectorAll('.tab').forEach((x,j)=>x.classList.toggle('active',j===current-1));document.getElementById('counter').textContent='Screen '+current+' / '+data.length}goToScreen(1);
</script></body></html>`;
function ClmLifecycleFrame({ kind, db }) {
  const start = CLM_SCREEN_START[kind] || 1;
  const doc = useMemo(() => { let h = CLM_PROTO_LIFECYCLE; const sup = db.supplier.find((s) => s.name === "Accenture")?.legal_name; if (sup) h = h.split("Cloud Systems Inc.").join(sup); return h.replace("</body>", `<script>setTimeout(function(){try{goToScreen(${start});}catch(e){}},80);</script></body>`); }, [kind]);
  return <div className="card ck-frame lc"><iframe title="CLM workflow screens" srcDoc={doc} sandbox="allow-scripts allow-same-origin" /></div>;
}


/* ============================= V5: SUPPLIER DISCOVERY ENGINE (ported from A6 notebook) ============================= */
const DISC_SCENARIOS = { "Balanced sourcing": { performance: .25, capability: .20, financial: .20, risk: .25, esg: .10 }, "Cost pressure": { performance: .20, capability: .15, financial: .40, risk: .15, esg: .10 }, "Resilience first": { performance: .20, capability: .15, financial: .10, risk: .45, esg: .10 }, "ESG mandate": { performance: .15, capability: .15, financial: .10, risk: .20, esg: .40 }, "Agent default": { performance: .30, capability: .22, financial: .18, risk: .12, esg: .16 } };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null); const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
function discoverSuppliers(db, rfx, intake, opts = {}) {
  const geo = intake ? P(one(db, "intake_scope_specs", "request_id", intake.request_id)?.geography_coverage) : []; const gov = intake ? one(db, "intake_strategy_governance", "request_id", intake.request_id) : null;
  const vm = Object.fromEntries(db.vendor_master.map((v) => [v.supplier_id, v])); const cat = rfx.rfx_category; const catAlt = { "CAT-SW": "CAT-ITS", "CAT-CLOUD": "CAT-ITS", "CAT-HW": "CAT-ITS" }[cat];
  const inCat = (sid) => { const v = vm[sid]; return v && (v.rfx_category === cat || v.rfx_category === catAlt); };
  const kpiBy = {}; db.supplier_kpi_metrics.forEach((k) => { (kpiBy[k.supplier_id] = kpiBy[k.supplier_id] || []).push(k.calculated_score); });
  const screened = db.supplier.filter((x) => opts.allCats || inCat(x.supplier_id));
  const rows = screened.map((x) => {
    const v = vm[x.supplier_id]; const en = one(db, "supplier_external_enrichment", "supplier_id", x.supplier_id); const rp = one(db, "supplier_risk_profile", "supplier_id", x.supplier_id); const esgc = one(db, "supplier_esg_compliance", "supplier_id", x.supplier_id); const svc = one(db, "supplier_services_profiles", "supplier_id", x.supplier_id); const prod = one(db, "supplier_product_profiles", "supplier_id", x.supplier_id); const div = one(db, "supplier_diversity", "supplier_id", x.supplier_id) || {}; const kp = kpiBy[x.supplier_id] || [];
    const qualified = x.status === "ACTIVE" && x.kyc_status === "VERIFIED" && (x.esg_score ?? 0) >= 40 && !(esgc?.sanctions_flag);
    const performance = kp.length ? +mean(kp.map((x) => num(x, 60))).toFixed(1) : v?.composite_score != null ? +(num(v.composite_score, 60) * 0.95).toFixed(1) : 60;
    const capability = svc ? +Math.min(100, 50 + num(svc.client_csat_score, 0) * 9 + Math.min(10, num(svc.bench_strength_count, 0) / 400)).toFixed(1) : prod ? +Math.min(100, num(prod.on_time_delivery_pct, 65) - num(prod.defect_rate_pct, 0) * 4).toFixed(1) : num(v?.compliance_score, 65);
    const financial = en ? +((num(en.db_credit_score, 55) + num(v?.financial_score ?? en.db_credit_score, 55)) / 2).toFixed(1) : num(v?.financial_score, 55);
    const risk = rp ? +(100 - (num(rp.interos_geopolitical_risk, 20) + num(rp.resilinc_disruption_risk ?? rp.interos_supply_chain_risk, 20)) / 2).toFixed(1) : num(v?.risk_score, 55);
    const esg = +(((esgc?.ecovadis_overall_score ?? x.esg_score ?? 60) + (x.esg_score ?? 60)) / 2).toFixed(1);
    const dims = { performance, capability, financial, risk, esg };
    const w = opts.weights || DISC_SCENARIOS["Agent default"]; const composite = +Object.entries(w).reduce((a, [k, wt]) => a + dims[k] * wt, 0).toFixed(2);
    let penalty = 0; if (x.risk_rating === "HIGH") penalty += 20; else if (x.risk_rating === "MEDIUM") penalty += 10; if (esgc?.sanctions_flag) penalty += 15; if ((esgc?.regulatory_violations || 0) > 0) penalty += 10; if (x.kyc_status !== "VERIFIED") penalty += 8;
    const divCount = ["minority_owned", "women_owned", "veteran_owned", "small_business"].filter((k) => div[k]).length; const diversity = divCount * 25; const esgBonus = div.sustainability_certified ? 5 : 0;
    const avail = prod?.current_capacity_available_pct ?? (svc ? Math.min(90, svc.bench_strength_count / 40) : 40); const scal = avail > 60 ? "HIGH" : avail > 35 ? "MEDIUM" : "LOW"; const capacity = +Math.min(100, avail * 0.5 + (scal === "HIGH" ? 25 : scal === "MEDIUM" ? 15 : 5) + (avail > 50 ? 10 : 5)).toFixed(1);
    const geoMatch = geo.length ? geo.some((g) => (x.country || "").toLowerCase() === g.toLowerCase() || (g === "United States" && x.country === "United States") || (g === "United Kingdom" && x.country === "UK")) : false;
    const consistency = +(100 - (kp.length > 1 ? sd(kp) : 8)).toFixed(1);
    const shock = opts.shocks?.[x.supplier_id] || 0;
    const adjusted = +Math.max(0, composite - penalty * 0.25 + (geoMatch ? 3 : 0) + esgBonus * 0.5 + capacity * 0.04 - shock).toFixed(2);
    const missing = [en, rp, esgc, kp.length ? 1 : null].filter((z) => !z).length; const fresh = x.kyc_verified_date && dayDiff(x.kyc_verified_date, TODAY) <= 180; const confidence = Math.max(0, Math.min(100, 100 - missing * 12 + (fresh ? 5 : 0) - (v?.source_file === "seed" ? 0 : 3)));
    const incumbent = gov?.incumbent_supplier === x.name; const existing = incumbent || kp.length > 0 || db.negotiation_finalization.some((f) => f.supplier_id === x.supplier_id) || !!one(db, "supplier_classification", "supplier_id", x.supplier_id)?.preferred_supplier_flag;
    const riskFlag = x.risk_rating === "HIGH" || esgc?.sanctions_flag ? "RED" : x.risk_rating === "MEDIUM" ? "AMBER" : x.risk_rating === "UNASSESSED" ? "GREY" : "GREEN";
    return { s: x, v, dims, composite, penalty, adjusted, diversity, divCount, div, esgBonus, capacity, avail, scal, geoMatch, consistency, confidence, confLevel: confidence >= 80 ? "HIGH" : confidence >= 60 ? "MEDIUM" : "LOW", incumbent, existing, qualified, riskFlag, shock, name: x.name, country: x.country, region: x.region, kyc: x.kyc_status, spend: x.annual_spend_usd };
  });
  const ranked = rows.filter((r) => r.qualified && (!opts.diversityRequired || r.divCount > 0)).sort((a, b) => b.adjusted - a.adjusted).map((r, i) => ({ ...r, rank: i + 1 }));
  const byComposite = [...ranked].sort((a, b) => b.composite - a.composite); byComposite.forEach((r, i) => { r.compositeRank = i + 1; }); ranked.forEach((r) => { r.movement = r.compositeRank - r.rank; });
  return { screened: rows, ranked, disqualified: rows.filter((r) => !r.qualified), geo };
}
function Radar({ dims, size = 150, color = "var(--primary)" }) { const keys = ["performance", "capability", "financial", "risk", "esg"]; const c = size / 2, R = size / 2 - 22; const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)]; }; const poly = keys.map((k, i) => pt(i, dims[k]).join(",")).join(" "); return <svg width={size} height={size} className="radar">{[25, 50, 75, 100].map((g) => <polygon key={g} points={keys.map((_, i) => pt(i, g).join(",")).join(" ")} fill="none" stroke="#e1e6ee" />)}{keys.map((k, i) => { const [x, y] = pt(i, 100); const [lx, ly] = pt(i, 122); return <g key={k}><line x1={c} y1={c} x2={x} y2={y} stroke="#e1e6ee" /><text x={lx} y={ly} fontSize="9" textAnchor="middle" fill="#66707f">{k[0].toUpperCase() + k.slice(1)}</text></g>; })}<polygon points={poly} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />{keys.map((k, i) => { const [x, y] = pt(i, dims[k]); return <circle key={k} cx={x} cy={y} r="3" fill={color} />; })}</svg>; }
function Hist({ values, color, bins = 12, h = 90 }) { if (!values.length) return null; const lo = Math.floor(Math.min(...values) / 5) * 5, hi = Math.ceil(Math.max(...values) / 5) * 5; const step = Math.max(1, (hi - lo) / bins); const counts = Array.from({ length: bins }, (_, i) => values.filter((v) => v >= lo + i * step && (i === bins - 1 ? v <= hi : v < lo + (i + 1) * step)).length); const mx = Math.max(...counts, 1); const m = mean(values); return <div><div className="bars" style={{ height: h }}>{counts.map((c2, i) => <div key={i} className="bar-col" title={`${(lo + i * step).toFixed(0)}–${(lo + (i + 1) * step).toFixed(0)}: ${c2}`}><div className="bar" style={{ height: `${(c2 / mx) * 100}%`, background: color }}></div></div>)}</div><div className="muted" style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}><span>{lo}</span><span>mean {m.toFixed(1)}</span><span>{hi}</span></div></div>; }
function Scatter({ rows, x, y, color, size = 260, xl, yl, highlight }) { const W = size * 1.5, H = size; const px = (v) => 30 + ((v - 40) / 60) * (W - 40), py = (v) => H - 24 - ((v - 40) / 60) * (H - 40); const mx = mean(rows.map(x)), my = mean(rows.map(y)); return <svg width={W} height={H} className="scatter"><line x1={px(mx)} y1={10} x2={px(mx)} y2={H - 24} stroke="#c9d4e3" strokeDasharray="4 3" /><line x1={30} y1={py(my)} x2={W - 10} y2={py(my)} stroke="#c9d4e3" strokeDasharray="4 3" />{rows.map((r) => <circle key={r.s.supplier_id} cx={px(Math.max(40, x(r)))} cy={py(Math.max(40, y(r)))} r={highlight?.includes(r.s.supplier_id) ? 7 : 4} fill={color(r)} fillOpacity={highlight?.includes(r.s.supplier_id) ? 0.95 : 0.55} stroke={highlight?.includes(r.s.supplier_id) ? "#0b2545" : "none"}><title>{`${r.name} · ${xl} ${x(r).toFixed(1)} · ${yl} ${y(r).toFixed(1)}`}</title></circle>)}<text x={W - 10} y={H - 8} fontSize="10" textAnchor="end" fill="#66707f">{xl} →</text><text x={8} y={12} fontSize="10" fill="#66707f">{yl} ↑</text></svg>; }


function DiscoveryCockpit({ db, mutate, push, rfx, intake, selected, setSelected, locked, user, can }) {
  const [scenario, setScenario] = useState("Agent default"); const [custom, setCustom] = useState(null); const [divReq, setDivReq] = useState(!!(intake && /divers/i.test(one(db, "intake_strategy_governance", "request_id", intake.request_id)?.esg_requirement || "")));
  const [shocks, setShocks] = useState({}); const [tab, setTab] = useState("overview");
  const weights = custom || DISC_SCENARIOS[scenario];
  const res = useMemo(() => discoverSuppliers(db, rfx, intake, { weights, diversityRequired: divReq, shocks }), [db, rfx.rfx_id, JSON.stringify(weights), divReq, JSON.stringify(shocks)]);
  const base = useMemo(() => discoverSuppliers(db, rfx, intake, { weights, diversityRequired: divReq }), [db, rfx.rfx_id, JSON.stringify(weights), divReq]);
  const top = res.ranked.slice(0, 10); const top6 = res.ranked.slice(0, 6);
  const runs = q(db, "discovery_runs", "rfx_id", rfx.rfx_id);
  const kpis = [["Suppliers screened", res.screened.length, "vendor master universe"], ["Qualified", res.ranked.length, `${res.screened.length ? Math.round((res.ranked.length / res.screened.length) * 100) : 0}% qualification rate`], ["Recommended", top.length, "risk-adjusted shortlist"], ["Portfolio score", top.length ? mean(top.map((r) => r.adjusted)).toFixed(1) : "—", "avg shortlist score"], ["Decision confidence", top.length ? `${mean(top.map((r) => r.confidence)).toFixed(0)}%` : "—", "completeness & freshness"], ["Green-risk share", top.length ? `${Math.round((top.filter((r) => r.riskFlag === "GREEN").length / top.length) * 100)}%` : "—", "portfolio resilience"], ["Available capacity", top.length ? `${mean(top.map((r) => r.avail)).toFixed(0)}%` : "—", "mean headroom"], ["ESG score", top.length ? mean(top.map((r) => r.dims.esg)).toFixed(1) : "—", "avg shortlist ESG"]];
  const scenTable = Object.entries(DISC_SCENARIOS).map(([n, w]) => { const r = discoverSuppliers(db, rfx, intake, { weights: w, diversityRequired: divReq }).ranked.slice(0, 10); const bal = new Set(discoverSuppliers(db, rfx, intake, { weights: DISC_SCENARIOS["Balanced sourcing"], diversityRequired: divReq }).ranked.slice(0, 10).map((x) => x.s.supplier_id)); return { n, top: r[0]?.name, avg: r.length ? mean(r.map((x) => x.adjusted)).toFixed(1) : "—", green: r.length ? Math.round((r.filter((x) => x.riskFlag === "GREEN").length / r.length) * 100) : 0, esg: r.length ? mean(r.map((x) => x.dims.esg)).toFixed(1) : "—", fin: r.length ? mean(r.map((x) => x.dims.financial)).toFixed(1) : "—", cap: r.length ? mean(r.map((x) => x.avail)).toFixed(0) : "—", overlap: r.filter((x) => bal.has(x.s.supplier_id)).length, ids: r.map((x) => x.s.supplier_id) }; });
  const stability = res.ranked.slice(0, 12).map((r) => ({ name: r.name, ranks: Object.values(DISC_SCENARIOS).map((w) => { const rr = discoverSuppliers(db, rfx, intake, { weights: w, diversityRequired: divReq }).ranked.findIndex((x) => x.s.supplier_id === r.s.supplier_id); return rr < 0 ? null : rr + 1; }) }));
  const portfolio = res.ranked.map((r) => { const impact = 0.45 * r.dims.financial + 0.35 * r.dims.performance + 0.2 * Math.min(100, (r.spend / 20000000) * 100); const supplyRisk = 100 - r.dims.risk; return { ...r, impact, supplyRisk }; }); const ic = mean(portfolio.map((p) => p.impact)) || 50, rc = mean(portfolio.map((p) => p.supplyRisk)) || 50;
  const seg = (p) => (p.impact >= ic && p.supplyRisk >= rc ? "Strategic" : p.impact >= ic ? "Leverage" : p.supplyRisk >= rc ? "Bottleneck" : "Routine"); const ACT = { Strategic: "Executive partnership + dual-source contingency", Leverage: "Competitive bidding + volume bundling", Bottleneck: "Secure supply + develop alternates", Routine: "Automate buying + simplify governance" }; const SEGC = { Strategic: "#8b5cf6", Leverage: "#16a34a", Bottleneck: "#f59e0b", Routine: "#94a3b8" };
  const best = top[0], resilient = [...top].sort((a, b) => b.dims.risk - a.dims.risk)[0], esgL = [...top].sort((a, b) => b.dims.esg - a.dims.esg)[0];
  const shockTargets = base.ranked.slice(0, 5); const beforeMap = Object.fromEntries(base.ranked.map((r) => [r.s.supplier_id, r.rank])); const replacements = res.ranked.slice(0, 10).filter((r) => !base.ranked.slice(0, 10).some((b) => b.s.supplier_id === r.s.supplier_id));
  const applyShortlist = () => { const ids = top.slice(0, 5).map((r) => r.s.supplier_id); setSelected(ids); mutate((d) => { d.discovery_runs = [...(d.discovery_runs || []), { run_id: `DR-${String((d.discovery_runs || []).length + 1).padStart(3, "0")}`, rfx_id: rfx.rfx_id, scenario: custom ? "Custom" : scenario, weights_json: J(weights), screened: res.screened.length, qualified: res.ranked.length, recommended: 5, portfolio_score: +mean(top.slice(0, 5).map((r) => r.adjusted)).toFixed(2), confidence: +mean(top.slice(0, 5).map((r) => r.confidence)).toFixed(2), run_by: `${user.NAME_FIRST} ${user.NAME_LAST}`, created_at: nowTs() }]; }); push("Top 5 selected", `Scenario "${custom ? "Custom" : scenario}" applied — confirm the shortlist below to write supplier_shortlisting.`); };
  const FLAGC = { GREEN: "#16a34a", AMBER: "#f59e0b", RED: "#ef4444", GREY: "#94a3b8" };
  return (
    <div className="dc">
      <div className="dc-head"><div><b>Supplier Discovery Decision Cockpit</b><div className="muted" style={{ fontSize: 12 }}>{one(db, "rfx_category", "rfx_category", rfx.rfx_category)?.category_name} · {res.geo.join(", ") || "any geography"} · {fmtUsd(rfx.budget_limit_usd)} · Agent A2 · scenario <b>{custom ? "Custom" : scenario}</b></div></div>
        <div className="dc-controls"><label className="rvem-checkbox-row" style={{ margin: 0 }}><input type="checkbox" checked={divReq} onChange={() => setDivReq((x) => !x)} />Diversity required</label>{!locked && <button className="btn btn-primary btn-sm" onClick={applyShortlist}>Use top 5 as shortlist</button>}</div></div>
      <div className="dc-kpis">{kpis.map((k) => <div key={k[0]} className="dc-kpi"><div className="lbl">{k[0]}</div><div className="val">{k[1]}</div><div className="sub">{k[2]}</div></div>)}</div>
      <div className="ea-subtabs">{[["overview", "Ranking & radar"], ["scenarios", "What-if scenarios"], ["wargame", "Disruption war-game"], ["portfolio", "Negotiation portfolio"], ["recommend", "Executive recommendation"]].map(([id, l]) => <button key={id} className={`ea-subtab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{l}</button>)}</div>
      {tab === "overview" && <div className="dc-grid">
        <div className="card di2-sec"><h4>Risk-adjusted shortlist <span className="muted" style={{ fontWeight: 400 }}>top 10 · Performance {Math.round(weights.performance * 100)} · Capability {Math.round(weights.capability * 100)} · Financial {Math.round(weights.financial * 100)} · Risk {Math.round(weights.risk * 100)} · ESG {Math.round(weights.esg * 100)}</span></h4>
          <table className="dc-table"><thead><tr><th>#</th><th>Supplier</th><th>Perf</th><th>Cap</th><th>Fin</th><th>Risk</th><th>ESG</th><th>Composite</th><th>Penalty</th><th>Adjusted</th><th>Δ rank</th><th>Conf.</th><th>Flags</th><th></th></tr></thead><tbody>{top.map((r) => <tr key={r.s.supplier_id} className={selected.includes(r.s.supplier_id) ? "sel" : ""}><td>{r.rank}</td><td><b>{r.name}</b><div className="muted" style={{ fontSize: 10.5 }}>{r.country}{r.incumbent ? " · incumbent" : r.existing ? " · existing" : " · external"}{r.geoMatch ? " · geo match" : ""}</div></td><td>{r.dims.performance}</td><td>{r.dims.capability}</td><td>{r.dims.financial}</td><td>{r.dims.risk}</td><td>{r.dims.esg}</td><td>{r.composite}</td><td style={{ color: r.penalty ? "var(--red)" : "var(--muted)" }}>{r.penalty ? `−${(r.penalty * 0.25).toFixed(1)}` : "—"}</td><td><b>{r.adjusted}</b></td><td style={{ color: r.movement > 0 ? "var(--emerald)" : r.movement < 0 ? "var(--red)" : "var(--muted)" }}>{r.movement > 0 ? `+${r.movement}` : r.movement}</td><td><span className={`badge ${r.confLevel === "HIGH" ? "awarded" : r.confLevel === "MEDIUM" ? "closing" : "closed"}`}>{r.confidence}%</span></td><td><span className="dc-flag" style={{ background: FLAGC[r.riskFlag] }} title={`risk ${r.riskFlag}`}></span>{r.divCount > 0 && <span className="tag" title="diversity">D{r.divCount}</span>}{r.div.sustainability_certified ? <span className="tag" title="sustainability certified">S</span> : null}{r.avail < 20 && <span className="tag bad" title="capacity headroom < 20%">cap</span>}</td><td>{!locked && <button className="btn btn-ghost btn-sm" onClick={() => setSelected((sel) => sel.includes(r.s.supplier_id) ? sel.filter((x) => x !== r.s.supplier_id) : sel.length >= 6 ? sel : [...sel, r.s.supplier_id])}>{selected.includes(r.s.supplier_id) ? "✓" : "+"}</button>}</td></tr>)}</tbody></table>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Composite = Σ dimension × weight · Penalty = (HIGH risk −20, MEDIUM −10, sanctions −15, violations −10, KYC pending −8) × 0.25 · Adjusted adds geo-match +3, sustainability +2.5, capacity × 0.04 · {res.disqualified.length} disqualified (inactive, KYC, ESG &lt; 40 or sanctions)</div></div>
        <div>
          <div className="card di2-sec"><h4>Top 6 — dimension radar</h4><div className="dc-radars">{top6.map((r) => <div key={r.s.supplier_id} className="dc-radar"><Radar dims={r.dims} /><div><b>#{r.rank} {r.name}</b><div className="muted" style={{ fontSize: 11 }}>{r.adjusted} · {r.riskFlag}</div></div></div>)}</div></div>
          <div className="card di2-sec" style={{ marginTop: 12 }}><h4>Score distribution — before / after risk adjustment</h4><div className="dc-two"><div><div className="muted" style={{ fontSize: 11.5 }}>Composite</div><Hist values={res.ranked.map((r) => r.composite)} color="#0ea5e9" /></div><div><div className="muted" style={{ fontSize: 11.5 }}>Risk-adjusted</div><Hist values={res.ranked.map((r) => r.adjusted)} color="#f59e0b" /></div></div></div>
          <div className="card di2-sec" style={{ marginTop: 12 }}><h4>Portfolio map — performance vs resilience</h4><Scatter rows={res.ranked} x={(r) => r.dims.performance} y={(r) => r.dims.risk} color={(r) => FLAGC[r.riskFlag]} xl="performance" yl="resilience" highlight={top.map((r) => r.s.supplier_id)} /><div className="v4-legend">{Object.entries(FLAGC).map(([k, c]) => <span key={k}><i style={{ background: c }}></i>{k.toLowerCase()} risk</span>)}<span className="muted">large = shortlisted</span></div></div>
        </div>
      </div>}
      {tab === "scenarios" && <div className="dc-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card di2-sec"><h4>Weight scenarios</h4><div className="pa-chip-group">{Object.keys(DISC_SCENARIOS).map((n) => <button key={n} className={`pa-chip ${!custom && scenario === n ? "selected" : ""}`} onClick={() => { setScenario(n); setCustom(null); }}>{n}</button>)}<button className={`pa-chip ${custom ? "selected" : ""}`} onClick={() => setCustom({ ...weights })}>Custom</button></div>
          {["performance", "capability", "financial", "risk", "esg"].map((k) => <div key={k} className="w-row"><span>{k[0].toUpperCase() + k.slice(1)}</span><input type="range" min="0" max="0.6" step="0.05" value={weights[k]} disabled={!custom} onChange={(e) => setCustom((c) => ({ ...c, [k]: Number(e.target.value) }))} /><b className="mono">{Math.round(weights[k] * 100)}%</b></div>)}
          <div className={`muted`} style={{ fontSize: 11.5 }}>Total {Math.round(Object.values(weights).reduce((a, b) => a + b, 0) * 100)}% {custom && Math.round(Object.values(weights).reduce((a, b) => a + b, 0) * 100) !== 100 ? "— normalised in ranking" : ""}</div>
          <h4 style={{ marginTop: 14 }}>How priorities change the portfolio</h4><table className="dc-table"><thead><tr><th>Scenario</th><th>Top supplier</th><th>Avg top-10</th><th>Green</th><th>ESG</th><th>Financial</th><th>Capacity</th><th>Overlap w/ balanced</th></tr></thead><tbody>{scenTable.map((r) => <tr key={r.n} className={r.n === scenario && !custom ? "sel" : ""} onClick={() => { setScenario(r.n); setCustom(null); }} style={{ cursor: "pointer" }}><td><b>{r.n}</b></td><td>{r.top}</td><td>{r.avg}</td><td>{r.green}%</td><td>{r.esg}</td><td>{r.fin}</td><td>{r.cap}%</td><td>{r.overlap}/10</td></tr>)}</tbody></table></div>
        <div className="card di2-sec"><h4>Rank stability across scenarios</h4><div className="dc-stab"><div className="dc-stab-h"><span></span>{Object.keys(DISC_SCENARIOS).map((n) => <span key={n}>{n.split(" ")[0]}</span>)}</div>{stability.map((r) => <div key={r.name} className="dc-stab-row"><span className="n">{r.name}</span>{r.ranks.map((rk, i) => <span key={i} className={`rk ${rk == null ? "" : rk <= 3 ? "top" : rk <= 10 ? "mid" : "low"}`}>{rk ?? "—"}</span>)}</div>)}</div><div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>Suppliers that stay in the top 3 under every weighting are robust picks; those that swing are sensitive to priorities.</div></div>
      </div>}
      {tab === "wargame" && <div className="dc-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card di2-sec"><h4>Shock the shortlist</h4><p className="muted" style={{ fontSize: 12.5 }}>Simulate new intelligence on the current top 5 and watch the agent re-rank and promote replacements.</p>{shockTargets.map((r) => <div key={r.s.supplier_id} className="dc-shock"><b>#{r.rank} {r.name}</b><select value={shocks[r.s.supplier_id] || 0} onChange={(e) => setShocks((sh) => ({ ...sh, [r.s.supplier_id]: Number(e.target.value) }))}><option value={0}>No shock</option><option value={20}>Geopolitical alert (−20)</option><option value={30}>Financial distress (−30)</option><option value={45}>Severe operational disruption (−45)</option><option value={60}>Sanctions listing (−60)</option></select></div>)}<button className="btn btn-ghost btn-sm" onClick={() => setShocks({})}>Reset</button></div>
        <div className="card di2-sec"><h4>Impact</h4><table className="dc-table"><thead><tr><th>Supplier</th><th>Before</th><th>After</th><th>Δ</th><th>Score</th><th>Reason</th></tr></thead><tbody>{base.ranked.slice(0, 10).map((b) => { const a = res.ranked.find((x) => x.s.supplier_id === b.s.supplier_id); return <tr key={b.s.supplier_id}><td><b>{b.name}</b></td><td>{b.rank}</td><td>{a ? a.rank : "—"}</td><td style={{ color: a && a.rank < b.rank ? "var(--emerald)" : a && a.rank > b.rank ? "var(--red)" : "var(--muted)" }}>{a ? (b.rank - a.rank > 0 ? `+${b.rank - a.rank}` : b.rank - a.rank) : "—"}</td><td>{a?.adjusted}</td><td className="muted">{shocks[b.s.supplier_id] ? ["", "Geopolitical alert", "Geopolitical alert", "Financial distress", "Severe operational disruption", "Severe operational disruption", "Sanctions listing"][Math.round(shocks[b.s.supplier_id] / 10)] || "Shocked" : "Eligible"}</td></tr>; })}</tbody></table>
          {replacements.length > 0 && <><h4 style={{ marginTop: 12 }}>Newly promoted replacements</h4>{replacements.map((r) => <div key={r.s.supplier_id} className="rfp-insight-item"><span className="ic">↑</span><b>#{r.rank} {r.name}</b> · {r.country} · {r.adjusted} · {r.riskFlag} · capacity {r.avail}%</div>)}</>}{Object.values(shocks).some(Boolean) && replacements.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No new entrants — shortlist absorbed the shock.</div>}</div>
      </div>}
      {tab === "portfolio" && <div className="dc-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card di2-sec"><h4>Supplier negotiation portfolio</h4><Scatter rows={portfolio} x={(r) => r.supplyRisk} y={(r) => r.impact} color={(r) => SEGC[seg(r)]} xl="supply risk" yl="business impact" highlight={top.map((r) => r.s.supplier_id)} /><div className="v4-legend">{Object.entries(SEGC).map(([k, c]) => <span key={k}><i style={{ background: c }}></i>{k}</span>)}</div></div>
        <div className="card di2-sec"><h4>Recommended negotiation approach (shortlist)</h4><table className="dc-table"><thead><tr><th>Supplier</th><th>Segment</th><th>Impact</th><th>Supply risk</th><th>Recommended action</th></tr></thead><tbody>{portfolio.filter((p) => top.some((t) => t.s.supplier_id === p.s.supplier_id)).sort((a, b) => b.impact - a.impact).map((p) => <tr key={p.s.supplier_id}><td><b>{p.name}</b></td><td><span className="badge" style={{ background: SEGC[seg(p)] + "22", color: SEGC[seg(p)] }}>{seg(p)}</span></td><td>{p.impact.toFixed(1)}</td><td>{p.supplyRisk.toFixed(1)}</td><td className="muted">{ACT[seg(p)]}</td></tr>)}</tbody></table></div>
      </div>}
      {tab === "recommend" && best && <div className="card di2-sec dc-reco"><h4>Executive recommendation</h4><p>The agent screened <b>{res.screened.length} suppliers</b>, qualified <b>{res.ranked.length}</b>, and recommends <b>{Math.min(5, top.length)}</b> for <b>{one(db, "rfx_category", "rfx_category", rfx.rfx_category)?.category_name}</b>{res.geo.length ? <> in <b>{res.geo.join(", ")}</b></> : null} under the <b>{custom ? "Custom" : scenario}</b> weighting.</p><ul><li><b>Primary recommendation:</b> {best.name} — score <b>{best.adjusted}</b>, {best.confLevel.toLowerCase()} confidence{best.incumbent ? " (incumbent)" : best.existing ? " (existing relationship)" : " (new supplier)"}.</li><li><b>Resilience leader:</b> {resilient.name} — resilience <b>{resilient.dims.risk}</b>.</li><li><b>ESG leader:</b> {esgL.name} — ESG <b>{esgL.dims.esg}</b>.</li>{top.some((r) => r.riskFlag === "AMBER") && <li><b>Gate behind mitigation:</b> {top.filter((r) => r.riskFlag === "AMBER").map((r) => r.name).join(", ")} (amber risk).</li>}{divReq && <li><b>Diversity:</b> {top.filter((r) => r.divCount > 0).length} of {top.length} recommended suppliers carry a diversity classification.</li>}</ul><p>Move green-risk leaders into the RFx, keep a geographically or operationally distinct backup ({top.find((r) => r.country !== best.country)?.name || "n\/a"}), and re-run the war-game when new intelligence arrives.</p>{runs.length > 0 && <div className="muted" style={{ fontSize: 11.5 }}>Persisted runs for this RFx: {runs.map((r) => `${r.run_id} (${r.scenario}, ${r.portfolio_score})`).join(" · ")} · <span className="mono">discovery_runs</span></div>}</div>}
    </div>);
}


/* ============================= V5: PROCUREMENT CONTROL TOWER + VALUE REALIZATION (Command Center tabs) ============================= */
function ControlTower({ db, setPage, setRfxId, push, mutate }) {
  const inv = (db.invoices || []).map((i) => ({ ...i, invoiced_amount: num(i.invoiced_amount), contracted_amount: num(i.contracted_amount), baseline_amount: num(i.baseline_amount), on_contract: i.on_contract === true || Number(i.on_contract) === 1 })); const leaks = inv.filter((i) => i.leakage_type);
  const leakBy = {}; leaks.forEach((i) => { const k = i.leakage_type; leakBy[k] = leakBy[k] || { n: 0, v: 0 }; leakBy[k].n++; leakBy[k].v += i.leakage_type === "PRICE_VARIANCE" ? i.invoiced_amount - i.contracted_amount : i.invoiced_amount; });
  const totalLeak = Object.values(leakBy).reduce((a, x) => a + x.v, 0); const spend = inv.reduce((a, i) => a + i.invoiced_amount, 0);
  const LEAK_LABEL = { OFF_CONTRACT: "Off-contract (maverick) spend", PRICE_VARIANCE: "Invoice above contracted price", EXPIRED_CONTRACT: "Spend on expired contract", DUPLICATE: "Duplicate invoice" };
  // sourcing opportunities
  const catSpend = {}; inv.forEach((i) => { catSpend[i.category] = catSpend[i.category] || { spend: 0, off: 0, sup: new Set() }; catSpend[i.category].spend += i.invoiced_amount; if (!i.on_contract) catSpend[i.category].off += i.invoiced_amount; catSpend[i.category].sup.add(i.supplier_id); });
  const opps = [];
  Object.entries(catSpend).forEach(([c, v]) => { if (v.off > 0) opps.push({ type: "Consolidate off-contract spend", cat: c, value: v.off, why: `${fmtUsd(v.off)} spent outside any agreement across ${v.sup.size} suppliers`, page: "demand-intake" }); });
  (db.sourcing_cycle_history || []).filter((h) => { const threeYearRenewal = addDaysIso(h.awarded_date, 365 * 3); const oneYearReview = addDaysIso(h.awarded_date, 365); const threeYearDays = dayDiff(TODAY, threeYearRenewal); const oneYearDays = dayDiff(TODAY, oneYearReview); return (threeYearDays !== null && threeYearDays <= 120) || (oneYearDays !== null && oneYearDays <= 120 && oneYearDays >= 0); }).forEach((h) => opps.push({ type: "Renewal window opening", cat: h.category, value: h.awarded_value_usd / 3, why: `${h.title} — annual review due; ${h.savings_usd ? `${((h.savings_usd / (h.awarded_value_usd + h.savings_usd)) * 100).toFixed(0)}% saved last time` : "no baseline"}`, page: "contract-renewal" }));
  db.market_signals.filter((sg) => sg.signal_type === "COMMODITY_PRICE" && sg.change_pct < 0).forEach((sg) => opps.push({ type: "Market price dropped", cat: sg.category, value: Math.abs(sg.change_pct) * 20000, why: `${sg.metric} ${sg.change_pct}% — re-tender or renegotiate now`, page: "dynamic-resourcing" }));
  const tail = db.supplier.filter((x) => x.status === "TAIL_SPEND"); if (tail.length) opps.push({ type: "Tail-spend rationalisation", cat: "All", value: tail.reduce((a, x) => a + x.annual_spend_usd, 0), why: `${tail.length} vendors under $100K with no assessment — consolidate via catalogue or P-card`, page: "supplier-discovery" });
  opps.sort((a, b) => b.value - a.value);
  // contract risk heatmap
  const contracts = [...db.contract_intake_requests.map((c) => { const f = db.negotiation_finalization.find((x) => x.rfx_id === c.linked_rfx); return { id: c.contract_id, title: db.rfx_events.find((e) => e.rfx_id === c.linked_rfx)?.title || c.contract_id, supplier: f?.supplier_id, value: num(c.contract_value), start: TODAY, ra: db.contract_risk_assessment.find((r) => r.contract_id === c.contract_id) }; }), ...db.sourcing_cycle_history.slice(0, 8).map((h, i) => ({ id: `CTR-H-${String(i + 1).padStart(3, "0")}`, title: h.title, supplier: db.supplier.find((x) => x.name === h.supplier_name)?.supplier_id, value: num(h.awarded_value_usd), start: h.awarded_date, ra: null }))];
  const dims = ["Expiry", "Performance", "Financial", "ESG", "Price variance", "Concentration"];
  const heat = contracts.map((c) => { const sup = db.supplier.find((x) => x.supplier_id === c.supplier); const sc = db.supplier_scorecards.filter((x) => x.supplier_id === c.supplier).slice(-1)[0]; const en = db.supplier_external_enrichment.find((x) => x.supplier_id === c.supplier); const esg = db.supplier_esg_compliance.find((x) => x.supplier_id === c.supplier); const civ = inv.filter((i) => i.contract_id === c.id); const varPct = civ.length ? (civ.reduce((a, i) => a + num(i.invoiced_amount), 0) / Math.max(1, civ.reduce((a, i) => a + num(i.contracted_amount), 0)) - 1) * 100 : 0; const expiryDate = addDaysIso(c.start, 365 * 3); const daysToExpiry = dayDiff(TODAY, expiryDate); const share = c.value / Math.max(1, contracts.filter((x) => x.supplier === c.supplier).reduce((a, x) => a + num(x.value), 0) + 1); const conc = contracts.filter((x) => x.supplier === c.supplier).reduce((a, x) => a + num(x.value), 0) / Math.max(1, contracts.reduce((a, x) => a + num(x.value), 0));
    const v = { Expiry: daysToExpiry === null ? 2 : daysToExpiry < 120 ? 3 : daysToExpiry < 365 ? 2 : 1, Performance: sc ? (sc.performance_status === "NEEDS_IMPROVEMENT" ? 3 : sc.performance_status === "MEETS" ? 2 : 1) : 2, Financial: en ? (en.db_credit_score < 65 ? 3 : en.db_credit_score < 80 ? 2 : 1) : 2, ESG: esg ? (esg.regulatory_violations > 0 || esg.ecovadis_overall_score < 60 ? 3 : esg.ecovadis_overall_score < 75 ? 2 : 1) : (sup?.esg_score < 70 ? 3 : 2), "Price variance": varPct > 5 ? 3 : varPct > 2 ? 2 : 1, Concentration: conc > 0.25 ? 3 : conc > 0.12 ? 2 : 1 }; return { ...c, v, total: Object.values(v).reduce((a, b) => a + b, 0), supName: sup?.name || "—" }; }).sort((a, b) => b.total - a.total);
  const HC = { 1: "#dcfce7", 2: "#fef3c7", 3: "#fee2e2" }; const HT = { 1: "#166534", 2: "#92400e", 3: "#991b1b" };
  const raise = (o) => { push("Opportunity captured", `${o.type} · ${o.cat} → ${o.page === "demand-intake" ? "raise a request in Demand Intake" : o.page === "dynamic-resourcing" ? "see Dynamic Resourcing Engine" : "open " + o.page}`); setPage(o.page); };
  return (
    <div className="ct">
      <div className="v5-kpis" style={{ marginBottom: 14 }}>
        <div className="card v4-kpi"><div className="v4-kpi-top"><span className="v4-kpi-ic" style={{ background: "#fee2e2", color: "#ef4444" }}>⚠</span></div><div className="lbl">Spend leakage detected</div><div className="val">{fmtUsd(totalLeak)}</div><div className="v5-trend down">↘ {((totalLeak / spend) * 100).toFixed(1)}% of {fmtUsd(spend)} invoiced</div></div>
        <div className="card v4-kpi"><div className="v4-kpi-top"><span className="v4-kpi-ic" style={{ background: "#e8f1fb", color: "#1462c4" }}>🔔</span></div><div className="lbl">Live alerts</div><div className="val">{leaks.length + db.market_signals.filter((x) => x.status === "OPEN").length}</div><div className="v5-trend">{leaks.length} leakage · {db.market_signals.filter((x) => x.status === "OPEN").length} market / supplier signals</div></div>
        <div className="card v4-kpi"><div className="v4-kpi-top"><span className="v4-kpi-ic" style={{ background: "#dcfce7", color: "#16a34a" }}>💡</span></div><div className="lbl">Sourcing opportunities</div><div className="val">{opps.length}</div><div className="v5-trend">{fmtUsd(opps.reduce((a, o) => a + o.value, 0))} addressable</div></div>
        <div className="card v4-kpi"><div className="v4-kpi-top"><span className="v4-kpi-ic" style={{ background: "#f1ebfd", color: "#7c3aed" }}>🗺</span></div><div className="lbl">Contracts at high risk</div><div className="val">{heat.filter((h) => h.total >= 11 || Object.values(h.v).filter((x) => x === 3).length >= 2).length}</div><div className="v5-trend down">of {heat.length} contracts monitored · {heat.filter((h) => h.total >= 9).length} on watch</div></div>
      </div>
      <div className="v4-grid-exec" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card v4-card"><div className="v4-card-h"><b>Spend leakage alerts</b><span className="muted">real time · invoices vs contracts</span></div>
          {Object.entries(leakBy).sort((a, b) => b[1].v - a[1].v).map(([k, v]) => <div key={k} className="ct-leak"><div><b>{LEAK_LABEL[k] || nice(k)}</b><div className="muted" style={{ fontSize: 11.5 }}>{v.n} invoice{v.n > 1 ? "s" : ""}</div></div><div className="ct-bar"><i style={{ width: `${(v.v / Math.max(...Object.values(leakBy).map((x) => x.v))) * 100}%` }}></i></div><b style={{ color: "var(--red)" }}>{fmtUsd(v.v)}</b></div>)}
          <table className="v4-table" style={{ marginTop: 10 }}><thead><tr><th>Invoice</th><th>Supplier</th><th>Category</th><th>Type</th><th>Amount</th><th>Cost center</th></tr></thead><tbody>{leaks.sort((a, b) => (a.invoice_date < b.invoice_date ? 1 : -1)).slice(0, 8).map((i) => <tr key={i.invoice_id}><td className="mono">{i.invoice_id}</td><td>{supName(db, i.supplier_id)}</td><td>{i.category}</td><td><span className="badge closed">{nice(i.leakage_type)}</span></td><td>{fmtUsd(i.leakage_type === "PRICE_VARIANCE" ? i.invoiced_amount - i.contracted_amount : i.invoiced_amount)}</td><td className="mono">{i.cost_center}</td></tr>)}</tbody></table></div>
        <div className="card v4-card"><div className="v4-card-h"><b>Sourcing opportunities</b><span className="muted">ranked by addressable value</span></div>{opps.slice(0, 7).map((o, i) => <div key={i} className="ct-opp" onClick={() => raise(o)}><div><b>{o.type}</b> <span className="badge open">{o.cat}</span><div className="muted" style={{ fontSize: 12 }}>{o.why}</div></div><div style={{ textAlign: "right" }}><b style={{ color: "var(--emerald)" }}>{fmtUsd(o.value)}</b><div className="muted" style={{ fontSize: 11 }}>act →</div></div></div>)}</div>
        <div className="card v4-card wide"><div className="v4-card-h"><b>Contract risk heatmap</b><span className="muted">1 low · 2 watch · 3 high — sorted by total</span></div>
          <div style={{ overflowX: "auto" }}><table className="v4-table ct-heat"><thead><tr><th>Contract</th><th>Supplier</th><th>Value</th>{dims.map((dd) => <th key={dd}>{dd}</th>)}<th>Total</th></tr></thead><tbody>{heat.map((h) => <tr key={h.id}><td><b>{h.title.slice(0, 40)}</b><div className="mono muted" style={{ fontSize: 10.5 }}>{h.id}</div></td><td>{h.supName}</td><td>{fmtUsd(h.value)}</td>{dims.map((dd) => <td key={dd}><span className="ct-cell" style={{ background: HC[h.v[dd]], color: HT[h.v[dd]] }}>{h.v[dd]}</span></td>)}<td><b>{h.total}</b></td></tr>)}</tbody></table></div></div>
      </div>
    </div>);
}
function ValueRealization({ db, setPage, setRfxId }) {
  const inv = db.invoices.filter((i) => i.rfx_id);
  const byRfx = {}; inv.forEach((i) => { const k = i.rfx_id; byRfx[k] = byRfx[k] || { rfx: k, contract: i.contract_id, supplier: i.supplier_id, cat: i.category, base: 0, contracted: 0, invoiced: 0, paid: 0, n: 0 }; const b = byRfx[k]; b.base += i.baseline_amount; b.contracted += i.contracted_amount; b.invoiced += i.invoiced_amount; b.paid += i.paid_amount; b.n++; });
  const rows = Object.values(byRfx).map((b) => { const hist = db.sourcing_cycle_history.find((h) => h.rfx_id === b.rfx); const fin = db.negotiation_finalization.find((f) => f.rfx_id === b.rfx); const expectedTotal = hist ? hist.savings_usd : fin ? fin.savings_achieved : 0; const contractTotal = hist ? hist.awarded_value_usd : fin ? fin.final_price : 0; const expectedToDate = expectedTotal * (b.contracted / Math.max(1, contractTotal)); const realized = b.base - b.invoiced; const leakage = Math.max(0, b.invoiced - b.contracted); return { ...b, title: hist?.title || db.rfx_events.find((e) => e.rfx_id === b.rfx)?.title || b.rfx, expectedTotal, expectedToDate, realized, leakage, pct: expectedToDate ? (realized / expectedToDate) * 100 : 0, live: !!fin }; }).sort((a, b) => b.expectedToDate - a.expectedToDate);
  const T = rows.reduce((a, r) => ({ base: a.base + r.base, inv: a.inv + r.invoiced, paid: a.paid + r.paid, exp: a.exp + r.expectedToDate, real: a.real + r.realized, leak: a.leak + r.leakage, expTot: a.expTot + r.expectedTotal }), { base: 0, inv: 0, paid: 0, exp: 0, real: 0, leak: 0, expTot: 0 });
  const months = [...new Set(inv.map((i) => i.period))].sort(); const trend = months.map((m) => { const mi = inv.filter((i) => i.period === m); return { k: fmtMonth(m + "-01"), exp: mi.reduce((a, i) => a + (i.baseline_amount - i.contracted_amount), 0), real: mi.reduce((a, i) => a + (i.baseline_amount - i.invoiced_amount), 0) }; });
  const maxT = Math.max(...trend.map((t) => Math.max(t.exp, t.real)), 1);
  return (
    <div className="vr2">
      <div className="v5-kpis" style={{ marginBottom: 14 }}>
        <div className="card v4-kpi"><div className="lbl">Expected savings (contracted)</div><div className="val">{fmtUsd(T.expTot)}</div><div className="v5-trend">{rows.length} awards tracked · {fmtUsd(T.exp)} due to date</div></div>
        <div className="card v4-kpi hl"><div className="lbl">Realized savings to date</div><div className="val">{fmtUsd(T.real)}</div><div className="v5-trend">{T.exp ? ((T.real / T.exp) * 100).toFixed(0) : 0}% of expected to date</div></div>
        <div className="card v4-kpi"><div className="lbl">Invoiced vs baseline</div><div className="val">{fmtUsd(T.inv)}</div><div className="v5-trend">baseline {fmtUsd(T.base)} · paid {fmtUsd(T.paid)}</div></div>
        <div className="card v4-kpi"><div className="lbl">Savings leakage</div><div className="val" style={{ color: "var(--red)" }}>{fmtUsd(T.leak)}</div><div className="v5-trend down">↘ invoiced above contracted price</div></div>
      </div>
      <div className="v4-grid-exec" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <div className="card v4-card"><div className="v4-card-h"><b>Expected vs realized savings by month</b><span className="muted">baseline − contracted vs baseline − invoiced</span></div><div className="vr-chart">{trend.map((t) => <div key={t.k} className="vr-col"><div className="vr-bars"><i className="e" style={{ height: `${(t.exp / maxT) * 100}%` }} title={`expected ${fmtUsd(t.exp)}`}></i><i className="r" style={{ height: `${(Math.max(0, t.real) / maxT) * 100}%` }} title={`realized ${fmtUsd(t.real)}`}></i></div><span>{t.k}</span></div>)}</div><div className="v4-legend"><span><i style={{ background: "#9fc6f2" }}></i>expected</span><span><i style={{ background: "#16a34a" }}></i>realized</span></div></div>
        <div className="card v4-card"><div className="v4-card-h"><b>Value chain</b><span className="muted">RFx → contract → invoice → payment → savings</span></div><div className="vr-chain">{[["RFx awarded", rows.length, fmtUsd(rows.reduce((a, r) => a + (db.sourcing_cycle_history.find((h) => h.rfx_id === r.rfx)?.awarded_value_usd || db.negotiation_finalization.find((f) => f.rfx_id === r.rfx)?.final_price || 0), 0))], ["Contracts active", new Set(inv.map((i) => i.contract_id)).size, "monthly invoicing"], ["Invoices received", inv.length, fmtUsd(T.inv)], ["Payments made", inv.filter((i) => i.status === "PAID").length, fmtUsd(T.paid)], ["Savings realized", `${T.exp ? ((T.real / T.exp) * 100).toFixed(0) : 0}%`, fmtUsd(T.real)]].map(([l, n, sub], i) => <div key={l} className="vr-step"><span className="n">{i + 1}</span><div><b>{l}</b><div className="muted" style={{ fontSize: 11.5 }}>{sub}</div></div><b style={{ marginLeft: "auto" }}>{n}</b></div>)}</div></div>
        <div className="card v4-card wide"><div className="v4-card-h"><b>Realization by award</b><span className="muted">expected to date vs realized</span></div><table className="v4-table"><thead><tr><th>RFx / award</th><th>Supplier</th><th>Invoices</th><th>Baseline</th><th>Contracted</th><th>Invoiced</th><th>Expected to date</th><th>Realized</th><th>Realization</th><th>Leakage</th></tr></thead><tbody>{rows.map((r) => <tr key={r.rfx} style={{ cursor: r.live ? "pointer" : "default" }} onClick={() => { if (r.live) { setRfxId(r.rfx); setPage("award"); } }}><td><b>{r.title.slice(0, 44)}</b><div className="mono muted" style={{ fontSize: 10.5 }}>{r.rfx} · {r.cat}</div></td><td>{supName(db, r.supplier)}</td><td>{r.n}</td><td>{fmtUsd(r.base)}</td><td>{fmtUsd(r.contracted)}</td><td>{fmtUsd(r.invoiced)}</td><td>{fmtUsd(r.expectedToDate)}</td><td style={{ color: r.realized >= 0 ? "var(--emerald)" : "var(--red)", fontWeight: 700 }}>{fmtUsd(r.realized)}</td><td><div className="v4-tat-track" style={{ width: 90, display: "inline-block", verticalAlign: "middle" }}><div className={`v4-tat-fill ${r.pct < 80 ? "bad" : ""}`} style={{ width: `${Math.min(100, Math.max(0, r.pct))}%` }}></div></div> <span className="mono">{r.pct.toFixed(0)}%</span></td><td style={{ color: r.leakage ? "var(--red)" : "var(--muted)" }}>{r.leakage ? fmtUsd(r.leakage) : "—"}</td></tr>)}</tbody></table></div>
      </div>
    </div>);
}

/* ============================= V5: DYNAMIC RESOURCING ENGINE (04b) ============================= */
function DynamicResourcing({ db, mutate, push, setPage, setRfxId, user, can, openRecord }) {
  const [sel, setSel] = useState(null);
  const signals = db.market_signals; const recs = db.resourcing_recommendations;
  const TYPE = { COMMODITY_PRICE: ["📈", "Commodity price change", "#1462c4"], PRICE_SPIKE: ["📈", "Commodity price change", "#1462c4"], ESG_VIOLATION: ["🌱", "ESG violation", "#16a34a"], SUPPLIER_RISK: ["🛡️", "Supplier risk change", "#16a34a"], SUPPLIER_UNDERPERFORMANCE: ["📉", "Supplier underperformance", "#f59e0b"], DEMAND_SHIFT: ["📊", "Demand shift", "#7c3aed"] };
  const ACT = { RE_RUN_RFX: ["Re-run RFx", "🔁"], RENEGOTIATE: ["Renegotiate", "🤝"], SWITCH_SUPPLIER: ["Switch supplier", "🔀"], ADD_BACKUP: ["Add backup supplier", "🛡️"] };
  const rec = recs.find((r) => r.rec_id === sel) || recs.find((r) => r.status === "PENDING") || recs[0]; const sig = rec ? signals.find((x) => x.signal_id === rec.signal_id) : null;
  const decide = (r, ok) => {
    mutate((d) => { d.resourcing_recommendations = d.resourcing_recommendations.map((x) => (x.rec_id === r.rec_id ? { ...x, status: ok ? "APPROVED" : "DISMISSED", decided_by: `${user.NAME_FIRST} ${user.NAME_LAST}`, decided_at: nowTs() } : x)); d.market_signals = d.market_signals.map((x) => (x.signal_id === r.signal_id ? { ...x, status: ok ? "ACTIONED" : "DISMISSED" } : x));
      if (!ok) return;
      if (r.action === "RE_RUN_RFX") { const src = r.rfx_id ? d.rfx_events.find((e) => e.rfx_id === r.rfx_id) : null; const cat = src ? src.rfx_category : d.rfx_category.find((c) => c.category_name === sig?.category)?.rfx_category || "CAT-CAPEX"; const rid = `RFX-${TODAY.replace(/-/g, "")}-R${String(d.rfx_events.length + 1).padStart(3, "0")}`; d.rfx_events = [{ rfx_id: rid, title: `${src ? src.title : (sig?.category || "Category") + " re-tender"} (re-run · ${TYPE[sig?.signal_type]?.[1] || "market signal"})`, rfx_type: src?.rfx_type || "RFQ", rfx_category: cat, status: "DRAFT", issue_date: null, due_date: addDaysIso(TODAY, 21), closed_date: null, owner: J({ name: `${user.NAME_FIRST} ${user.NAME_LAST}`, role: "Sourcing Lead", email: user.SMTP_ADDR }), description: `${r.rationale} Triggered by ${r.signal_id} (${sig?.metric}, ${sig?.change_pct}%).`, scope: src?.scope || null, invited_suppliers: src ? src.invited_suppliers : "[]", responses_received: 0, key_findings: `Dynamic Resourcing Engine: ${r.rec_id}`, attachments: "[]", budget_limit_usd: src ? Math.round(src.budget_limit_usd * (1 + (sig?.change_pct || 0) / 100)) : null, created_at: nowTs() }, ...d.rfx_events]; d.rfx_weight_configs = [...d.rfx_weight_configs, { rfx_id: rid, commercial_weight: 0.5, operational_weight: 0.25, risk_compliance_weight: 0.2, esg_weight: 0.05, completeness_score: null, consistency_score: null, complaince_score: null, readability_score: null, overall_quality_score: null, status: "PENDING_HITL", issues: "[]", warnings: J([`Indexed pricing clause recommended (${sig?.metric})`]), created_at: nowTs(), updated_at: nowTs() }]; d.resourcing_recommendations = d.resourcing_recommendations.map((x) => (x.rec_id === r.rec_id ? { ...x, rfx_id: rid } : x)); }
      if (r.action === "RENEGOTIATE" && r.rfx_id) { const cases = d.negotiation_cases.filter((c) => c.rfx_id === r.rfx_id && c.supplier_id === r.supplier_id); const c = cases[0]; if (c) { const rid2 = `NR-${String(d.negotiation_rounds.length + 1).padStart(3, "0")}`; const n = d.negotiation_rounds.filter((x) => x.negotiation_case_id === c.negotiation_case_id).length + 1; const responseDue = addDaysIso(TODAY, 7) || TODAY; const actionDue = addDaysIso(TODAY, 5) || TODAY; d.negotiation_rounds = [...d.negotiation_rounds, { negotiation_round_id: rid2, negotiation_case_id: c.negotiation_case_id, round_number: n, round_type: "RENEGOTIATION", round_status: "AWAITING_SUPPLIER", strategy_label: `Triggered by ${TYPE[sig?.signal_type]?.[1]}: ${sig?.metric}`, next_step_code: "AWAIT_SUPPLIER_RESPONSE", opened_at: nowTs(), response_due_at: responseDue + " 17:00:00", closed_at: null, created_by: "Dynamic Resourcing Engine", approved_by: `${user.NAME_FIRST} ${user.NAME_LAST}`, created_at: nowTs(), updated_at: nowTs() }]; d.negotiation_cases = d.negotiation_cases.map((x) => (x.negotiation_case_id === c.negotiation_case_id ? { ...x, case_status: "IN_ROUND", updated_at: nowTs() } : x)); d.negotiation_actions = [...d.negotiation_actions, { action_id: `NA-${String(d.negotiation_actions.length + 1).padStart(3, "0")}`, negotiation_case_id: c.negotiation_case_id, negotiation_round_id: rid2, action_type: "INTERNAL_REVIEW", action_title: "Invoke service credits & reopen SLA schedule", action_detail: r.rationale, owner_type: "HUMAN", owner_user_id: "USR-101", owner_persona_id: "P-CATMGR", action_status: "OPEN", priority: "HIGH", due_at: actionDue + " 17:00:00", completed_at: null, source_recommendation_id: r.rec_id, created_at: nowTs(), updated_at: nowTs() }]; } }
      if (r.action === "SWITCH_SUPPLIER") { d.supplier_shortlisting = d.supplier_shortlisting.map((x) => (x.supplier_id === r.supplier_id && d.rfx_events.find((e) => e.rfx_id === x.rfx_id)?.status === "DRAFT" ? { ...x, shortlist_flag: 0, manual_override_flag: 1, override_reason: `Removed by Dynamic Resourcing Engine (${r.rec_id}: ${TYPE[sig?.signal_type]?.[1]})` } : x)); d.supplier_classification = d.supplier_classification.map((x) => (x.supplier_id === r.supplier_id ? { ...x, preferred_supplier_flag: 0, risk_flag: 1, classification_approved_by: `${user.NAME_FIRST} ${user.NAME_LAST}`, classification_date: nowTs() } : x)); d.supplier = d.supplier.map((x) => (x.supplier_id === r.supplier_id ? { ...x, status: "UNDER_REVIEW", risk_rating: "HIGH" } : x)); if (r.supplier_id === "SUP-012" || r.supplier_id === "SUP-009") d.supplier_improvement_plans = [...d.supplier_improvement_plans, { plan_id: `SIP-${String(d.supplier_improvement_plans.length + 1).padStart(3, "0")}`, supplier_id: r.supplier_id, issue_identified: sig?.metric, corrective_action: "Provide remediation evidence; independent audit within 60 days.", target_date: addDaysIso(TODAY, 60), status: "OPEN", owner: "Grace Oduya", reviewed_by: `${user.NAME_FIRST} ${user.NAME_LAST}` }]; }
    });
    push(ok ? `${ACT[r.action][0]} approved` : "Recommendation dismissed", ok ? { RE_RUN_RFX: "A draft RFx was created with indexed pricing guidance.", RENEGOTIATE: "A renegotiation round was opened on the live case with a HITL action.", SWITCH_SUPPLIER: "Supplier suspended from open shortlists; alternate promoted; improvement plan opened." }[r.action] : "Signal marked dismissed.");
  };
  const impact = recs.filter((r) => r.status !== "DISMISSED").reduce((a, r) => a + num(r.est_impact_usd), 0);
  return (
    <div className="dre">
      <div className="page-head"><div className="page-eyebrow">Activity 04b · Agent A2 / A6 · market_signals · resourcing_recommendations</div><h2 className="page-title">Dynamic Resourcing Engine</h2><p className="page-desc">Triggered by commodity price changes, ESG violations and supplier underperformance. The engine re-evaluates awarded and in-flight events and recommends re-running the RFx, renegotiating, or switching supplier — each recommendation is a HITL decision.</p></div>
      <div className="v5-kpis" style={{ marginBottom: 14 }}>
        {Object.entries(TYPE).map(([k, [ic, l, c]]) => <div key={k} className="card v4-kpi"><div className="v4-kpi-top"><span className="v4-kpi-ic" style={{ background: c + "22", color: c }}>{ic}</span></div><div className="lbl">{l}</div><div className="val">{signals.filter((x) => x.signal_type === k && x.status === "OPEN").length}</div><div className="v5-trend">{signals.filter((x) => x.signal_type === k).length} signals · {recs.filter((r) => signals.find((x) => x.signal_id === r.signal_id)?.signal_type === k && r.status === "PENDING").length} pending</div></div>)}
        <div className="card v4-kpi hl"><div className="lbl">Estimated impact</div><div className="val">{fmtUsd(impact)}</div><div className="v5-trend">across {recs.filter((r) => r.status !== "DISMISSED").length} recommendations</div></div>
      </div>
      <div className="dre-grid">
        <div className="card v4-card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Signals & recommendations</h3><span className="muted" style={{ fontSize: 12 }}>{recs.filter((r) => r.status === "PENDING").length} awaiting decision</span></div>
          {recs.map((r) => { const sg = signals.find((x) => x.signal_id === r.signal_id); const [ic, l, c] = TYPE[sg?.signal_type] || ["•", sg?.signal_type, "#94a3b8"]; return <div key={r.rec_id} className={`dre-item ${rec?.rec_id === r.rec_id ? "on" : ""} ${r.status.toLowerCase()}`} onClick={() => setSel(r.rec_id)}><span className="ic" style={{ background: c + "22", color: c }}>{ic}</span><div><div><b>{sg?.metric}</b> <span className={`badge ${sg?.severity === "HIGH" ? "closed" : "closing"}`}>{sg?.severity}</span></div><div className="muted" style={{ fontSize: 11.5 }}>{l} · {sg?.category}{sg?.supplier_id ? ` · ${supName(db, sg.supplier_id)}` : ""} · {sg?.change_pct > 0 ? "+" : ""}{sg?.change_pct}% · {sg?.detected_at?.slice(0, 10)}</div><div style={{ fontSize: 12, marginTop: 4 }}>{ACT[r.action][1]} <b>{ACT[r.action][0]}</b>{r.est_impact_usd ? <span className="muted"> · est. {fmtUsd(r.est_impact_usd)}</span> : null}</div></div><span style={{ marginLeft: "auto" }}><Badge s={r.status === "APPROVED" ? "APPROVED" : r.status === "DISMISSED" ? "REJECTED" : "PENDING"}>{nice(r.status)}</Badge></span></div>; })}</div>
        {rec && sig && <div>
          <div className="card v4-card"><div className="v4-card-h"><b>{ACT[rec.action][1]} {ACT[rec.action][0]}</b><span className="mono muted">{rec.rec_id} ← {sig.signal_id}</span></div>
            <div className="di2-kv" style={{ gridTemplateColumns: "140px 1fr" }}><div className="k">Trigger</div><div className="v">{TYPE[sig.signal_type][1]} — {sig.metric} <b>{sig.change_pct > 0 ? "+" : ""}{sig.change_pct}%</b> ({sig.source})</div><div className="k">Scope</div><div className="v">{sig.category}{sig.supplier_id ? ` · ${supName(db, sig.supplier_id)}` : ""}{sig.contract_id ? ` · ${sig.contract_id}` : ""}{rec.rfx_id ? <> · <a className="rfp-link mono" onClick={() => { setRfxId(rec.rfx_id); setPage("rfp-workflow-status"); }}>{rec.rfx_id}</a></> : ""}</div><div className="k">Recommendation</div><div className="v">{rec.rationale}</div><div className="k">Estimated impact</div><div className="v"><b>{rec.est_impact_usd ? fmtUsd(rec.est_impact_usd) : "risk avoidance"}</b> · confidence {rec.confidence}%</div>{rec.alternative_supplier_id && <><div className="k">Suggested alternate</div><div className="v"><b>{supName(db, rec.alternative_supplier_id)}</b> — {(() => { const a = db.supplier.find((x) => x.supplier_id === rec.alternative_supplier_id); return a ? `${a.country} · ESG ${a.esg_score} · ${nice(a.risk_rating)} risk · KYC ${nice(a.kyc_status)}` : ""; })()}</div></>}<div className="k">Decision</div><div className="v">{rec.status === "PENDING" ? (can("PROC_MGR", "PROC_HEAD", "NEGOTIATION") ? <span style={{ display: "flex", gap: 8 }}><button className="btn btn-primary btn-sm" onClick={() => decide(rec, true)}>Approve & execute</button><button className="btn btn-ghost btn-sm" onClick={() => decide(rec, false)}>Dismiss</button></span> : <span className="badge closing">Awaiting Category Manager</span>) : <span>{nice(rec.status)} by {rec.decided_by} · {rec.decided_at?.slice(0, 16)}</span>}</div></div></div>
          <div className="card v4-card" style={{ marginTop: 12 }}><div className="v4-card-h"><b>What the engine will do</b></div>{{ RE_RUN_RFX: ["Clone the affected RFx as a new DRAFT with budget re-indexed to the signal", "Add an indexed-pricing / price-hold warning to the weight config", "Route the draft to Procurement for questionnaire refresh and publish"], RENEGOTIATE: ["Open a new round on the live negotiation case", "Create a HITL action to invoke service credits and reopen the SLA schedule", "Keep the runner-up case as a live lever"], SWITCH_SUPPLIER: ["Remove the supplier from open (draft) shortlists with an override reason", "Set supplier to Under Review / high risk and clear the preferred flag", "Open an improvement plan requiring remediation evidence; promote the alternate"] }[rec.action].map((t, i) => <div key={i} className="rfp-insight-item"><span className="ic">{i + 1}</span>{t}</div>)}</div>
          {rec.action === "SWITCH_SUPPLIER" && rec.supplier_id && <div className="card v4-card" style={{ marginTop: 12 }}><div className="v4-card-h"><b>Supplier vs alternate</b></div><table className="v4-table"><thead><tr><th></th><th>{supName(db, rec.supplier_id)}</th><th>{supName(db, rec.alternative_supplier_id)}</th></tr></thead><tbody>{["esg_score", "risk_rating", "kyc_status", "country", "annual_spend_usd"].map((k) => { const a = db.supplier.find((x) => x.supplier_id === rec.supplier_id) || {}; const b = db.supplier.find((x) => x.supplier_id === rec.alternative_supplier_id) || {}; return <tr key={k}><td>{nice(k)}</td><td>{k === "annual_spend_usd" ? fmtUsd(a[k]) : String(a[k])}</td><td>{k === "annual_spend_usd" ? fmtUsd(b[k]) : String(b[k])}</td></tr>; })}</tbody></table></div>}
        </div>}
      </div>
    </div>);
}

/* ============================= V5: REQUIREMENT REQUEST PAGE (Submit → Approve → Convert to RFx) ============================= */
function RequestDetailV5({ db, mutate, push, decideApproval, refreshSnapshot, setPage, setRfxId, reqId, user, can, onBack, onEdit, openRfx }) {
  const r = one(db, "intake_requests", "request_id", reqId); if (!r) return null;
  const sc = one(db, "intake_scope_specs", "request_id", reqId) || {}, gov = one(db, "intake_strategy_governance", "request_id", reqId) || {}, ct = one(db, "intake_commercials_timelines", "request_id", reqId) || {}, w = one(db, "intake_evaluation_weights", "request_id", reqId) || {};
  const allRows = q(db, "intake_approvals", "request_id", reqId);
  const history = allRows.filter((a) => a.approval_status === "ARCHIVED" || a.approval_status === "RETURNED").sort((a, b) => (a.approved_at || "") < (b.approved_at || "") ? -1 : 1);
  const chain = allRows.filter((a) => !["ARCHIVED", "RETURNED"].includes(a.approval_status)).sort((a, b) => a.approval_sequence - b.approval_sequence);
  const [comment, setComment] = useState("");
  const approvedN = chain.filter((a) => a.approval_status === "APPROVED").length; const allApproved = chain.length > 0 && approvedN === chain.length; const pending = chain.find((a) => a.approval_status === "PENDING");
  const rfxFor = r.linked_RFx ? one(db, "rfx_events", "rfx_id", r.linked_RFx) : null;
  const sapUser = db.enterprise_user_master.find((u) => `${u.NAME_FIRST} ${u.NAME_LAST}` === r.requestor_name);
  const [confirm, setConfirm] = useState(null); // "submit" | "approve" | "reject" | "convert" | {converted}
  const statusLabel = r.intake_status === "DRAFT" ? "In_Process" : r.intake_status === "REJECTED" ? "Returned" : rfxFor ? "RFP_Generated" : "Submitted";
  const submit = () => { mutate((d) => { d.intake_requests = d.intake_requests.map((x) => (x.request_id === reqId ? { ...x, intake_status: "UNDER_REVIEW" } : x)); d.intake_approvals = [...d.intake_approvals.map((a) => (a.request_id === reqId && !["ARCHIVED", "RETURNED"].includes(a.approval_status) ? { ...a, approval_status: a.approval_status === "APPROVED" ? "ARCHIVED" : a.approval_status === "REJECTED" ? "RETURNED" : "ARCHIVED", comments: a.comments || (comment ? `Resubmitted: ${comment}` : null) } : a)), ...buildIntakeChain(d, reqId, ct.approved_budget).map((a, k) => (k === 0 && comment ? { ...a, comments: `Requester note on ${history.length ? "resubmission" : "submission"}: ${comment}` } : a))]; }); setConfirm(null); setComment(""); push(history.length || r.intake_status === "REJECTED" ? "Resubmitted for approval" : "Submitted for approval", `${reqId} routed to ${buildIntakeChain(db, reqId, ct.approved_budget)[0]?.approver_role}.`); };
  const approve = (ok) => {
    if (!pending) return;
    const note = comment.trim() || (ok ? "Approved after review." : "Returned for revision.");
    decideApproval.mutate({ approvalId: pending.approval_id, decision: ok ? "APPROVED" : "REJECTED", comment: note }, {
      onSuccess: () => { refreshSnapshot(); setConfirm(ok ? "approved-ok" : "returned-ok"); setComment(""); },
      onError: (error) => { setConfirm(null); push("Approval rejected by server", error.message); },
    });
  };
  const convert = () => {
    const stamp = TODAY.replace(/-/g, ""); let rid, draftId;
    mutate((d) => { const n = d.rfx_events.filter((e) => e.rfx_id.startsWith(`RFX-${stamp}`)).length + 1; rid = `RFX-${stamp}-${String(5289 + n).padStart(4, "0")}`; draftId = `DRAFT-${stamp}-${String(4306 + n).padStart(4, "0")}`; const cat = d.rfx_category.find((c) => c.category_name === r.category)?.rfx_category || "CAT-PRO"; const type = gov.sourcing_approach || "RFP";
      d.rfx_events = [{ rfx_id: rid, title: r.requirement_description.replace(/\.$/, "").slice(0, 120), rfx_type: type, rfx_category: cat, status: "DRAFT", issue_date: null, due_date: ct.rfp_issue_date ? addDaysIso(ct.rfp_issue_date, 30) : addDaysIso(TODAY, 30), closed_date: null, owner: J({ name: "Unassigned", role: "Primary owner", email: null }), description: r.requirement_description, scope: sc.scope_description || null, invited_suppliers: "[]", responses_received: 0, key_findings: null, attachments: "[]", budget_limit_usd: ct.approved_budget || null, created_at: nowTs() }, ...d.rfx_events];
      d.rfx_weight_configs = [...d.rfx_weight_configs, { rfx_id: rid, commercial_weight: (w.commercial_weight || 40) / 100, operational_weight: (w.technical_weight || 40) / 100, risk_compliance_weight: Math.max(0, (w.compliance_weight || 20) - 10) / 100, esg_weight: 0.1, completeness_score: 94.5, consistency_score: 92, complaince_score: 98, readability_score: 90, overall_quality_score: 93.6, status: "PENDING_HITL", issues: "[]", warnings: "[]", created_at: nowTs(), updated_at: nowTs() }];
      const content = `# ${r.requirement_description}

## Requestor
${r.requestor_name} · ${r.business_unit} · ${r.location}

## Requirement summary
${r.requirement_description}

Business outcome: ${r.business_outcome || "—"}
Impact if not procured: ${r.impact_if_not_procured || "—"}

## Scope and deliverables
${sc.scope_description || "—"}

Key deliverables: ${sc.deliverables || "—"}

## Commercials
Approved budget ${ct.currency || "USD"} ${Number(ct.approved_budget || 0).toLocaleString()} · ${ct.capex_opex || ""} · cost center ${ct.cost_center || "—"}

## Strategy
${type} · ${gov.contract_type || ""} · ${gov.duration_years || 1} year(s) · Net ${gov.payment_terms_days || 30}

## Evaluation weights
Commercial ${w.commercial_weight}% · Technical ${w.technical_weight}% · Compliance ${w.compliance_weight}%

_${draftId} generated from ${reqId} on ${TODAY}. Pending Procurement Manager review._`;
      d.rfx_draft_versions = [...d.rfx_draft_versions, { draft_id: draftId, rfx_id: rid, version_number: 1, template_id: type === "RFQ" ? "TPL-RFQ-STD-02" : "TPL-RFP-SVC-04", draft_content: content, created_by: r.requestor_name, reviewed_by: "Pending Legal Review", approval_status: "IN_REVIEW", approved_by: null, approved_at: null }];
      const steps = (() => { const wf = resolveWorkflow(d, "RFx Creation", { budget_limit_usd: ct.approved_budget || 0 }); return wf ? wfSteps(d, wf.workflow_id) : [{ step_name: "Procurement Manager Review", approver_role_id: "PROC_MGR" }]; })();
      steps.forEach((st, k) => { const u = d.enterprise_user_master.find((x) => x.PLATFORM_ROLE === st.approver_role_id); const uid = d.approver_availability_matrix.find((x) => x.persona_id === ({ PROC_MGR: "P-CATMGR", PROC_HEAD: "P-CPO", FINANCE: "P-FIN", LEGAL: "P-LEGAL", EXEC: "P-CPO" }[st.approver_role_id] || "P-CATMGR"))?.user_id || "USR-101"; d.rfx_assigned_approvers = [...d.rfx_assigned_approvers, { assignment_id: `ASG-${String(d.rfx_assigned_approvers.length + 1).padStart(3, "0")}`, rfx_id: rid, approver_user_id: uid, evaluation_id: `DRAFT-${rid}-${String(k + 1).padStart(2, "0")}`, approval_sequence: k + 1, current_status: k === 0 ? "PENDING" : "QUEUED", assigned_at: nowTs(), actioned_at: null, comments: `${st.step_name} · ${u ? u.NAME_FIRST + " " + u.NAME_LAST : ""}` }]; });
      d.intake_requests = d.intake_requests.map((x) => (x.request_id === reqId ? { ...x, linked_RFx: rid } : x)); d.intake_commercials_timelines = d.intake_commercials_timelines.map((x) => (x.request_id === reqId ? { ...x, linked_RFx: rid } : x));
    });
    setConfirm({ converted: true, rid, draftId }); push("Converted to RFx", `${rid} created as Draft; procurement team notified.`);
  };
  const notProvided = [["Linked RFx", r.linked_RFx], ["Geography Coverage", P(sc.geography_coverage).length], ["Transition Requirement", sc.transition_requirement], ["Compliance Requirements", P(sc.compliance_requirements).length], ["Documentation Attachments", P(sc.documentation_attachments).length], ["Sourcing Start Date", ct.sourcing_start_date], ["RFP Issue Date", ct.rfp_issue_date], ["Award Date", ct.award_date], ["Service Start Date", ct.service_start_date], ["Incumbent Supplier", gov.incumbent_supplier], ["Suggested Suppliers", P(gov.suggested_suppliers).length], ["Risk Category", gov.risk_category], ["Data Security Notes", gov.data_security_notes], ["Expected Bidders Range", gov.expected_bidders_range]].filter((x) => !x[1]).map((x) => x[0]);
  const F = ({ l, v, cls }) => <div className="rq-f"><div className="k">{l}</div><div className={`v ${cls || ""}`}>{v || <span className="muted">—</span>}</div></div>;
  const canApprove = pending && pending.role_id === user.PLATFORM_ROLE && pending.approver_bname?.trim() === user.BNAME?.trim();
  const isOwner = r.requestor_name === `${user.NAME_FIRST} ${user.NAME_LAST}` || can("ADMIN", "PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  return (
    <div className="rq">
      <div className="rq-head"><button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button><div><h2>Requirement Request <span className="muted" style={{ fontWeight: 500 }}>#{reqId}</span></h2><div className="rq-meta">Created: {fmtDate(r.created_at)} <span className={`badge ${statusLabel === "Returned" ? "closed" : "open"}`}>Status: {statusLabel}</span>{allApproved && <span className="badge awarded">Approved</span>}{pending && r.intake_status === "UNDER_REVIEW" && <span className="badge closing">Pending approval ({approvedN}/{chain.length})</span>}<span className="badge closing" style={{ background: "#fff3cd", color: "#7a5111" }}>Priority: {nice(r.priority)}</span></div></div>
        <div className="rq-actions">{isOwner && r.intake_status !== "APPROVED" && !rfxFor && <button className="btn btn-ghost" onClick={onEdit}>✎ Edit</button>}
          {r.intake_status === "DRAFT" && isOwner && <button className="btn btn-primary" onClick={() => setConfirm("submit")}>✈ Submit for Approval</button>}
          {r.intake_status === "REJECTED" && isOwner && <button className="btn btn-primary" onClick={() => setConfirm("submit")}>✈ Resubmit for Approval</button>}
          {pending && r.intake_status === "UNDER_REVIEW" && <><button className="btn btn-ghost" disabled={!canApprove} onClick={() => setConfirm("reject")}>↩ Return</button><button className="btn" style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a" }} disabled={!canApprove} onClick={() => setConfirm("approve")}>✓ Approve ({pending.approver_role.replace(" ", "_")})</button></>}
          {r.intake_status !== "DRAFT" && r.intake_status !== "REJECTED" && !rfxFor && <button className="btn btn-primary" disabled={!allApproved || !(isOwner || can("BIZ_MGR"))} onClick={() => setConfirm("convert")}>→ Convert to RFx</button>}
          {rfxFor && <button className="btn btn-primary" onClick={() => openRfx(rfxFor.rfx_id)}>Open RFx {rfxFor.rfx_id} →</button>}</div></div>
      {pending && r.intake_status === "UNDER_REVIEW" && <div className="rq-wait">Waiting for approval — {pending.approver_role} Approval ({approvedN} of {chain.length} steps approved).</div>}
      {r.intake_status === "REJECTED" && (() => { const ret = chain.find((a) => a.approval_status === "REJECTED"); const who = ret ? one(db, "enterprise_user_master", "BNAME", ret.approver_bname) : null; return <div className="rq-returned"><b>↩ Returned by {ret?.approver_role}{who ? ` (${who.NAME_FIRST} ${who.NAME_LAST})` : ""}{ret?.approved_at ? ` on ${fmtDate(ret.approved_at)}` : ""}</b><div>{ret?.comments?.replace(/^Returned to requester( — )?/, "") || "No comments provided."}</div><div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{isOwner ? "Edit the request to address the comments, then resubmit for approval." : "The requester has been asked to edit and resubmit."}</div></div>; })()}
      <div className="card rq-card"><h3>Requestor & Categorization</h3><div className="rq-grid7"><F l="Requestor" v={<>{r.requestor_name}<div className="muted" style={{ fontSize: 11.5 }}>({sapUser?.SMTP_ADDR || `${r.requestor_name.toLowerCase().replace(" ", ".")}@s2c.com`})</div></>} /><F l="Business Unit" v={r.business_unit} /><F l="Location / Cost Center" v={`${r.location} / ${ct.cost_center || "—"}`} /><F l="Request Type" v={r.request_type} /><F l="Category" v={r.category} /><F l="Procurement Type" v={r.procurement_type} /><F l="Linked RFx" v={rfxFor ? <a className="rfp-link mono" onClick={() => openRfx(rfxFor.rfx_id)}>{rfxFor.rfx_id}</a> : null} /></div></div>
      <div className="rq-two">
        <div>
          <div className="card rq-card"><h3>Requirement Summary</h3><F l="Description" v={r.requirement_description} /><F l="Business Outcome" v={r.business_outcome} /><F l="Impact if Not Procured" v={r.impact_if_not_procured} cls="red" /></div>
          <div className="card rq-card"><h3>Scope and Deliverables</h3><F l="Specification Type" v={sc.specification_type} /><F l="Scope Description" v={sc.scope_description} /><F l="Key Deliverables" v={sc.deliverables} />{P(sc.geography_coverage).length > 0 && <F l="Geography Coverage" v={P(sc.geography_coverage).join(", ")} />}</div>
        </div>
        <div>
          <div className="card rq-card"><h3>Commercials & Timeline</h3><F l="Approved Budget" v={ct.approved_budget ? `$${Number(ct.approved_budget).toLocaleString()} ${ct.currency || "USD"}` : null} cls="green" /><F l="Cost Center" v={ct.cost_center} /><F l="Spend Classification" v={ct.capex_opex ? nice(ct.capex_opex) : null} />{ct.service_start_date && <F l="Service Start" v={fmtDate(ct.service_start_date)} />}</div>
          <div className="card rq-card"><h3>Strategy & Governance</h3><div className="rq-grid2"><F l="Approach" v={gov.sourcing_approach} /><F l="Duration" v={gov.duration_years ? `${gov.duration_years} Year(s)` : null} /></div><F l="Payment Terms" v={gov.payment_terms_days ? `Net ${gov.payment_terms_days} days` : null} />{gov.contract_type && <F l="Contract Type" v={gov.contract_type} />}</div>
          <div className="card rq-card"><h3>Evaluation Weights</h3>{[["Commercial", w.commercial_weight, "#1462c4"], ["Technical", w.technical_weight, "#0ea5e9"], ["Compliance", w.compliance_weight, "#8b5cf6"]].map(([l, v, c]) => <div key={l} className="rq-w"><div className="rq-w-h"><span>{l}</span><span>{v}%</span></div><div className="rq-w-t"><i style={{ width: `${v}%`, background: c }}></i></div></div>)}</div>
        </div>
      </div>
      {(chain.length > 0 || history.length > 0) && <div className="card rq-card"><h3>Approval trail</h3>
        {chain.map((a) => { const who = one(db, "enterprise_user_master", "BNAME", a.approver_bname); return <div key={a.approval_id} className={`rq-appr ${a.approval_status.toLowerCase()}`}><span className="dot">{a.approval_status === "APPROVED" ? "✓" : a.approval_status === "REJECTED" ? "↩" : "○"}</span><div><b>Step {a.approval_sequence} · {a.approver_role}</b><div className="muted" style={{ fontSize: 11.5 }}>{who ? `${who.NAME_FIRST} ${who.NAME_LAST}` : "—"}{a.approved_at ? ` · ${a.approved_at.slice(0, 16)}` : ""}</div>{a.comments && <div style={{ fontSize: 12.5, marginTop: 3 }}>{a.comments}</div>}</div><span style={{ marginLeft: "auto" }}><Badge s={a.approval_status === "REJECTED" ? "REJECTED" : a.approval_status}>{a.approval_status === "REJECTED" ? "Returned" : nice(a.approval_status)}</Badge></span></div>; })}
        {history.length > 0 && <details className="rq-hist"><summary>Previous review cycles ({history.length})</summary>{history.map((a) => { const who = one(db, "enterprise_user_master", "BNAME", a.approver_bname); return <div key={a.approval_id} className="rq-hist-row"><span className="mono muted">{a.approved_at?.slice(0, 16) || "—"}</span><b>{a.approver_role}</b><span className="muted">{who ? `${who.NAME_FIRST} ${who.NAME_LAST}` : ""}</span><span>{a.comments || (a.approval_status === "ARCHIVED" ? "Not reached" : "")}</span><Badge s={a.approval_status === "RETURNED" ? "REJECTED" : "DRAFT"}>{a.approval_status === "RETURNED" ? "Returned" : "Superseded"}</Badge></div>; })}</details>}</div>}
      {notProvided.length > 0 && <div className="rq-np"><div className="k">Fields not provided</div><div>{notProvided.map((x) => <span key={x} className="rq-np-chip">{x}</span>)}</div></div>}
      <div className="rq-note">Please take a moment to review this information. Let me know if you need to make any changes before we finalize the status.</div>
      {confirm && <div className="modal-overlay" onClick={() => setConfirm(null)}><div className="modal rq-modal" onClick={(e) => e.stopPropagation()}>
        {confirm === "submit" && <><h3>{r.intake_status === "REJECTED" ? "Resubmit this request for approval?" : "Submit this request for approval?"}</h3><p className="muted">It will route through the active Demand Intake workflow{(() => { const wf = resolveWorkflow(db, "Demand Intake", { approved_budget: ct.approved_budget || 0 }); return wf ? ` — ${wf.workflow_name}: ${wfSteps(db, wf.workflow_id).map((x) => x.step_name).join(" → ")}` : ""; })()}.</p><label>Note to approver (optional)</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={r.intake_status === "REJECTED" ? "What changed since the request was returned…" : "Anything the approver should know…"} /><div className="rq-modal-b"><button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-primary" onClick={submit}>OK</button></div></>}
        {confirm === "approve" && <><h3>Approve this step ({pending?.approver_role.replace(" ", "_")})?</h3><label>Comments (optional)</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment for the record…" /><div className="rq-modal-b"><button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-primary" onClick={() => approve(true)}>OK</button></div></>}
        {confirm === "reject" && <><h3>Return this request to the requester?</h3><p className="muted">The work item moves back to the requester, who can edit and resubmit. Your comments are recorded on the approval step.</p><label>Comments <span className="req">*</span></label><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Explain what needs to change before it can be approved…" /><div className="rq-modal-b"><button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-primary" style={{ background: "var(--red)", borderColor: "var(--red)" }} disabled={!comment.trim()} onClick={() => approve(false)}>↩ Return with comments</button></div></>}
        {confirm === "returned-ok" && <><h3>Request returned.</h3><p className="muted">The requester has been notified and can resubmit after editing.</p><div className="rq-modal-b"><button className="btn btn-primary" onClick={() => setConfirm(null)}>OK</button></div></>}
        {confirm === "approved-ok" && <><h3>Step approved.</h3><div className="rq-modal-b"><button className="btn btn-primary" onClick={() => setConfirm(null)}>OK</button></div></>}
        {confirm === "convert" && <><h3>Convert request {reqId} to an RFx?</h3><ul className="rq-modal-list"><li>All of the request's details are copied into a new RFx, with its own RFx ID.</li><li>The procurement team is notified that a new requirement has been submitted for processing.</li><li>Business users cannot edit the RFx afterwards.</li></ul><div className="rq-modal-b"><button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-primary" onClick={convert}>→ Convert to RFx</button></div></>}
        {confirm.converted && <><h3><span style={{ color: "var(--emerald)" }}>✓</span> Converted to RFx</h3><p>RFx ID: <b className="mono">{confirm.rid}</b></p><p className="muted">The procurement team has been notified. The RFx stays a Draft, and its approval is pending their review.</p><p className="muted">Draft ID: <span className="mono">{confirm.draftId}</span></p><div className="rq-modal-b"><button className="btn btn-primary" onClick={() => { setConfirm(null); openRfx(confirm.rid); }}>→ Open RFx</button></div></>}
      </div></div>}
    </div>);
}

/* ============================= V5: RFx OVERVIEW (opened from Convert to RFx) ============================= */
function RfxOverviewV5({ db, mutate, push, setPage, rfxId, setRfxId, user, can, openRecord }) {
  const e = one(db, "rfx_events", "rfx_id", rfxId); if (!e) return null;
  const req = db.intake_requests.find((r) => r.linked_RFx === rfxId); const ct = req ? one(db, "intake_commercials_timelines", "request_id", req.request_id) : null;
  const drafts = q(db, "rfx_draft_versions", "rfx_id", rfxId); const latest = drafts.slice(-1)[0];
  const appr = q(db, "rfx_assigned_approvers", "rfx_id", rfxId).filter(isDraftRfxApproval).sort((a, b) => a.approval_sequence - b.approval_sequence);
  const pending = appr.find((a) => a.current_status === "PENDING"); const allOk = appr.length > 0 && appr.every((a) => a.current_status === "APPROVED");
  const [tab, setTab] = useState("overview");
  const owner = P(e.owner, {}); const days = daysUntil(e.due_date);
  const stepRole = (a) => (a.comments || "").split(" · ")[0]; const roleIdFor = (a) => ({ "Procurement Manager Review": "PROC_MGR", "Legal Review": "LEGAL", "Legal Review (If Required)": "LEGAL", "Finance Review": "FINANCE", "Executive Approval": "EXEC", "Procurement Head Review": "PROC_HEAD" }[stepRole(a)] || "PROC_MGR");
  const approveStep = (a) => { mutate((d) => { d.rfx_assigned_approvers = d.rfx_assigned_approvers.map((x) => (x.assignment_id === a.assignment_id ? { ...x, current_status: "APPROVED", actioned_at: nowTs() } : x)); const nxt = d.rfx_assigned_approvers.filter((x) => x.rfx_id === rfxId && isDraftRfxApproval(x) && x.current_status === "QUEUED").sort((p, q2) => p.approval_sequence - q2.approval_sequence)[0]; if (nxt) d.rfx_assigned_approvers = d.rfx_assigned_approvers.map((x) => (x.assignment_id === nxt.assignment_id ? { ...x, current_status: "PENDING" } : x)); else { d.rfx_draft_versions = d.rfx_draft_versions.map((v) => (v.rfx_id === rfxId ? { ...v, approval_status: "APPROVED", approved_by: `${user.NAME_FIRST} ${user.NAME_LAST}`, approved_at: nowTs(), reviewed_by: `${user.NAME_FIRST} ${user.NAME_LAST}` } : v)); d.rfx_weight_configs = d.rfx_weight_configs.map((x) => (x.rfx_id === rfxId ? { ...x, status: "APPROVED", updated_at: nowTs() } : x)); d.rfx_events = d.rfx_events.map((x) => (x.rfx_id === rfxId ? { ...x, owner: J({ name: `${user.NAME_FIRST} ${user.NAME_LAST}`, role: "Primary owner", email: user.SMTP_ADDR }) } : x)); } }); push("RFx approved", `${stepRole(a)} complete.`); };
  const history = [{ t: e.created_at, s: "Draft created", d: `Converted from ${req?.request_id || "request"} · ${latest?.draft_id || ""}` }, ...appr.filter((a) => a.actioned_at).map((a) => ({ t: a.actioned_at, s: `${stepRole(a)} approved`, d: a.comments?.split(" · ")[1] || "" })), ...(e.issue_date ? [{ t: e.issue_date + " 09:00:00", s: "Published", d: `${P(e.invited_suppliers).length} suppliers invited` }] : [])];
  const insights = [`Category ${one(db, "rfx_category", "rfx_category", e.rfx_category)?.category_name}: ${db.supplier.filter((s) => (db.vendor_master.find((v) => v.supplier_id === s.supplier_id) || {}).rfx_category === e.rfx_category).length} qualified suppliers in the vendor master.`, `Expected savings 10–16% based on ${db.sourcing_cycle_history.filter((h) => h.category === one(db, "rfx_category", "rfx_category", e.rfx_category)?.category_name).length || "comparable"} historical awards in this category.`, `Recommended approach: ${e.rfx_type} with ${e.budget_limit_usd > 1000000 ? "a two-stage evaluation" : "a single-stage weighted evaluation"}; target ${days ?? 30} days to close.`];
  return (
    <div className="rq">
      <div className="rq-head"><button className="btn btn-ghost btn-sm" onClick={() => setPage("demand-intake")}>← Back</button><div><h2 style={{ fontSize: 20 }}>{e.title}</h2><div className="rq-meta"><span className="mono muted">{rfxId}</span><span className="badge draft">{nice(e.status)}</span>{!allOk && e.status === "DRAFT" && <span className="badge closing">Approval Pending Approval</span>}{allOk && <span className="badge awarded">Approved</span>}</div></div><div className="rq-actions">{can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") && <button className="btn btn-ghost" onClick={() => { setRfxId(rfxId); setPage("rfx-creation-publish"); }}>✎ Edit</button>}</div></div>
      <div className="rq-owner card"><div className="av">{owner.name === "Unassigned" ? "U" : owner.name.split(" ").map((x) => x[0]).join("")}</div><div><div className="k">RFx Owner</div><b style={{ color: owner.name === "Unassigned" ? "var(--primary)" : "inherit" }}>{owner.name}</b><div className="muted" style={{ fontSize: 11.5 }}>{owner.role} · Created {fmtDate(e.created_at)}</div></div><div style={{ marginLeft: "auto", textAlign: "right" }}><div className="k">Last Updated</div><b>{fmtDate(latest?.approved_at || e.created_at)}</b></div></div>
      <div className="rq-kpis">{[["👥", "Invited Suppliers", P(e.invited_suppliers).length || "None", "#1462c4"], ["📥", "Responses Received", e.responses_received || "Pending", "#16a34a"], ["💲", "Expected Savings", "10–16%", "#8b5cf6"], ["🕐", "Days Until Close", days ?? "—", "#f97316"]].map((k) => <div key={k[1]} className="card rq-kpi"><span className="ic" style={{ background: k[3] + "22", color: k[3] }}>{k[0]}</span><div><div className="k">{k[1]}</div><b>{k[2]}</b></div></div>)}</div>
      <div className="ea-subtabs">{[["overview", "Overview"], ["history", "Status History"], ["ai", "AI Insights & Recommendations"], ["doc", "RFP Document"]].map(([id, l]) => <button key={id} className={`ea-subtab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{l}</button>)}</div>
      {tab === "overview" && <>
        <div className="card rq-card"><h3>ⓘ Basic Information</h3><div className="rq-grid2"><div className="rq-f"><div className="k">RFx Number</div><div className="v mono">{rfxId}</div></div><div className="rq-f"><div className="k">Title</div><div className="v">{e.title}</div></div><div className="rq-f"><div className="k">Type</div><div className="v">{e.rfx_type}</div></div><div className="rq-f"><div className="k">Category</div><div className="v">{one(db, "rfx_category", "rfx_category", e.rfx_category)?.category_name}</div></div></div><div className="rq-f"><div className="k">Description</div><div className="v">{e.description}</div></div></div>
        <div className="card rq-card"><h3>💲 Financial Information</h3><div className="rq-grid2"><div className="rq-f"><div className="k">Estimated Budget</div><div className="v green">{fmtFull(e.budget_limit_usd)}</div></div><div className="rq-f"><div className="k">Currency</div><div className="v">{ct?.currency || "USD"}</div></div></div></div>
        <div className="card rq-card"><h3>📅 Timeline</h3><div className="rq-grid2"><div className="rq-f"><div className="k">Created Date</div><div className="v">{fmtDate(e.created_at)}</div></div><div className="rq-f"><div className="k">Publish Date</div><div className="v">{e.issue_date ? fmtDate(e.issue_date) : "Not yet published"}</div></div><div className="rq-f"><div className="k">Response Deadline</div><div className="v">{fmtDate(e.due_date)}</div></div><div className="rq-f"><div className="k">Award Date</div><div className="v">{ct?.award_date ? fmtDate(ct.award_date) : "Not yet awarded"}</div></div></div></div>
        <div className="card rq-card"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0 }}>👤 Approval Status</h3>{!allOk ? <span className="badge closing">⏱ Pending Approvals</span> : <span className="badge awarded">All approved</span>}</div>
          {appr.map((a) => { const rid = roleIdFor(a); const mine = can("ADMIN") || (rid === "PROC_MGR" ? can("PROC_MGR", "PROC_HEAD") : can(rid)); return <div key={a.assignment_id} className={`rq-appr ${a.current_status.toLowerCase()}`}><span className="dot">{a.current_status === "APPROVED" ? "✓" : "○"}</span><div><b>{stepRole(a).replace(/ Review| Approval/, "").replace(" ", "_")}</b> <span className="badge closed" style={{ background: "#eef1f6", color: "var(--muted)" }}>Step {a.approval_sequence}</span><div className="muted" style={{ fontSize: 11.5 }}>{stepRole(a)} · {a.comments?.split(" · ")[1] || one(db, "approver_availability_matrix", "user_id", a.approver_user_id)?.user_email}</div></div><span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>{a.current_status === "PENDING" && mine && <button className="btn btn-primary btn-sm" onClick={() => approveStep(a)}>Approve</button>}<Badge s={a.current_status} /></span></div>; })}
          {appr.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>No approval steps recorded.</div>}</div>
        {allOk && <div className="callout success" style={{ marginTop: 10 }}>Draft approved. Procurement can now run supplier discovery, complete the questionnaire and publish from the activities menu.<div style={{ marginTop: 8, display: "flex", gap: 8 }}><button className="btn btn-primary btn-sm" onClick={() => { setRfxId(rfxId); setPage("supplier-discovery"); }}>Supplier Discovery →</button><button className="btn btn-ghost btn-sm" onClick={() => { setRfxId(rfxId); setPage("rfx-creation-publish"); }}>RFx Creation & Publish →</button></div></div>}
      </>}
      {tab === "history" && <div className="card rq-card"><h3>Status History</h3><ol className="chain">{history.map((h, i) => <li key={i}><div className="who">{h.s}</div><div className="muted">{h.d} · {h.t?.slice(0, 16)}</div></li>)}</ol></div>}
      {tab === "ai" && <div className="card rq-card"><h3>AI Insights & Recommendations</h3>{insights.map((t, i) => <div key={i} className="rfp-insight-item"><span className="ic">✦</span>{t}</div>)}</div>}
      {tab === "doc" && <div className="card rq-card"><h3>RFP Document · {latest?.draft_id} <Badge s={latest?.approval_status} /></h3><pre className="doc">{latest?.draft_content}</pre></div>}
    </div>);
}

function ProgressRing({ pct }) { return <div className="pa-ring" style={{ background: `conic-gradient(var(--primary) ${pct}%, #eef1f5 ${pct}%)` }}><div className="hole">{pct}%</div></div>; }

/* ============================= SUPPLIER DISCOVERY ============================= */
const addDaysIso = (value, n) => { const date = parseUtcDate(value); const days = Number(n); if (!date || !Number.isFinite(days)) return null; date.setUTCDate(date.getUTCDate() + Math.trunc(days)); return date.toISOString().slice(0, 10); };

function SupplierDiscovery({ db, mutate, push, setPage, rfxId, openRecord, gotoTable, can, user }) {
  const [sdTab, setSdTab] = useState("cockpit");
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const intake = db.intake_requests.find((r) => r.linked_RFx === rfxId);
  const gov = intake ? one(db, "intake_strategy_governance", "request_id", intake.request_id) : null;
  const shortlist = q(db, "supplier_shortlisting", "rfx_id", rfxId);
  const [search, setSearch] = useState(""); const [allCats, setAllCats] = useState(false);
  const [fRegion, setFRegion] = useState("All"); const [fRisk, setFRisk] = useState("All"); const [fKyc, setFKyc] = useState("All"); const [fRel, setFRel] = useState("All");
  const vmBy = Object.fromEntries(db.vendor_master.map((v) => [v.supplier_id, v]));
  const engineMap = useMemo(() => (IS_V4 ? Object.fromEntries(discoverSuppliers(db, rfx, intake, {}).screened.map((r) => [r.s.supplier_id, r])) : {}), [db, rfxId]);
  const catName = one(db, "rfx_category", "rfx_category", rfx.rfx_category)?.category_name;
  // candidates: vendors whose master-data category matches the RFx category (plus anyone already shortlisted); scored the way A2 would
  const pool = db.supplier.filter((s) => { const v = vmBy[s.supplier_id]; const inCat = allCats || !v || v.rfx_category === rfx.rfx_category || (rfx.rfx_category === "CAT-SW" || rfx.rfx_category === "CAT-CLOUD" || rfx.rfx_category === "CAT-HW") && v.rfx_category === "CAT-ITS"; const hit = !search || (s.name + " " + s.country + " " + (v?.city || "") + " " + (v?.vendor_profile || "")).toLowerCase().includes(search.toLowerCase()); return (inCat || shortlist.some((x) => x.supplier_id === s.supplier_id)) && hit; });
  const rankedAll = pool.map((s) => { const sh = shortlist.find((x) => x.supplier_id === s.supplier_id); const v = vmBy[s.supplier_id]; const en = one(db, "supplier_external_enrichment", "supplier_id", s.supplier_id) || {}; const rp = one(db, "supplier_risk_profile", "supplier_id", s.supplier_id) || {}; const cl = one(db, "supplier_classification", "supplier_id", s.supplier_id) || {}; const svc = one(db, "supplier_services_profiles", "supplier_id", s.supplier_id); const capability = v?.compliance_score ?? (svc ? Math.round(60 + svc.client_csat_score * 8 + Math.min(10, svc.bench_strength_count / 500)) : 70); const assessed = s.esg_score != null; const engineRow = IS_V4 ? engineMap[s.supplier_id] : null; const composite = sh ? sh.agent_score : engineRow ? engineRow.adjusted : v?.composite_score ?? (assessed ? +(0.3 * (en.db_credit_score || 60) + 0.25 * s.esg_score + 0.25 * (100 - (rp.interos_geopolitical_risk || 30)) + 0.2 * capability).toFixed(2) : 0); return { ...s, v, sh, credit: en.db_credit_score, geoRisk: rp.interos_geopolitical_risk, capability, composite, assessed, strategic: !!cl.strategic_flag, preferred: !!cl.preferred_supplier_flag, incumbent: gov?.incumbent_supplier === s.name }; }).sort((a, b) => b.composite - a.composite);
  const existingIds = new Set([...db.supplier_scorecards.map((x) => x.supplier_id), ...db.negotiation_finalization.map((x) => x.supplier_id), ...db.supplier_classification.filter((x) => x.preferred_supplier_flag).map((x) => x.supplier_id), ...db.supplier.slice(0, 12).map((x) => x.supplier_id)]);
  const rankedF = rankedAll.filter((x) => (fRegion === "All" || x.region === fRegion) && (fRisk === "All" || x.risk_rating === fRisk) && (fKyc === "All" || (fKyc === "VERIFIED" ? x.kyc_status === "VERIFIED" : x.kyc_status !== "VERIFIED")) && (fRel === "All" || (fRel === "INC" ? (existingIds.has(x.supplier_id) || x.incumbent) : !(existingIds.has(x.supplier_id) || x.incumbent))));
  const why = (x) => [x.incumbent ? "incumbent — no transition risk" : null, x.preferred ? "preferred supplier" : null, x.kyc_status === "VERIFIED" ? "KYC verified" : "KYC pending", x.esg_score >= 80 ? `ESG ${x.esg_score}` : null, x.credit >= 80 ? "strong credit" : null, x.geoRisk != null && x.geoRisk < 20 ? "low geo risk" : null].filter(Boolean).slice(0, 3).join(" · ");
  const recInc = rankedF.filter((x) => x.assessed && (existingIds.has(x.supplier_id) || x.incumbent)).slice(0, 4).map((x) => ({ ...x, why: why(x) }));
  const recExt = rankedF.filter((x) => x.assessed && !(existingIds.has(x.supplier_id) || x.incumbent)).slice(0, 4).map((x) => ({ ...x, why: why(x) }));
  const ranked = rankedF.slice(0, 30);
  const [selected, setSelected] = useState(shortlist.filter((s) => s.shortlist_flag).map((s) => s.supplier_id));
  useEffect(() => setSelected(q(db, "supplier_shortlisting", "rfx_id", rfxId).filter((s) => s.shortlist_flag).map((s) => s.supplier_id)), [rfxId]);
  const AUTOMATED_CHECKS = [["Master data scan", "supplier"], ["Performance history", "supplier_scorecards"], ["Pre-qualification / KYC", "supplier_classification"], ["External intelligence feed", "supplier_external_enrichment"]];
  const [checkOpen, setCheckOpen] = useState(null);
  const assessed = db.supplier.filter((x) => x.esg_score != null).length;
  const CHECK_DETAIL = {
    "Master data scan": { icon: "🗂", summary: `${db.supplier.length} suppliers scanned across the vendor master; ${assessed} carry a full assessment and ${db.supplier.length - assessed} are tail-spend vendors without scores.`, rows: [["Suppliers in scope", db.supplier.length], ["Matching this category", rankedAll.length], ["Active status", db.supplier.filter((x) => x.status === "ACTIVE").length], ["Duplicates merged", 0]] },
    "Performance history": { icon: "📈", summary: `Quarterly scorecards and QBR outcomes reviewed for suppliers with a delivery history; ${db.supplier_scorecards.filter((x) => x.evaluation_period === "2026-Q2").length} suppliers have a current scorecard.`, rows: [["Scorecards (Q2 2026)", db.supplier_scorecards.filter((x) => x.evaluation_period === "2026-Q2").length], ["Exceeding target", db.supplier_scorecards.filter((x) => x.performance_status === "EXCEEDS").length], ["Improvement plans open", db.supplier_improvement_plans.filter((x) => x.status !== "CLOSED").length], ["Average score", db.supplier_scorecards.length ? (db.supplier_scorecards.reduce((a, x) => a + x.overall_score, 0) / db.supplier_scorecards.length).toFixed(1) : "—"]] },
    "Pre-qualification / KYC": { icon: "🛡", summary: `KYC status, sanctions screening and classification flags checked for every candidate; vendors with pending KYC are shown but flagged.`, rows: [["KYC verified", db.supplier.filter((x) => x.kyc_status === "VERIFIED").length], ["KYC pending", db.supplier.filter((x) => x.kyc_status !== "VERIFIED").length], ["Sanctions hits", db.supplier_esg_compliance.filter((x) => x.sanctions_flag).length], ["Preferred suppliers", db.supplier_classification.filter((x) => x.preferred_supplier_flag).length]] },
    "External intelligence feed": { icon: "🌐", summary: `Credit ratings, financial health, geopolitical and supply-chain risk pulled from external providers and blended into the composite score.`, rows: [["Credit ratings available", db.supplier_external_enrichment.length], ["Investment-grade (A / BBB)", db.supplier_external_enrichment.filter((x) => ["A", "BBB"].includes(x.db_financial_risk_rating)).length], ["High geopolitical risk (> 30)", db.supplier_risk_profile.filter((x) => x.interos_geopolitical_risk > 30).length], ["Feeds refreshed", "today"]] },
  };
  const locked = !["DRAFT", "OPEN"].includes(rfx.status) || !can("PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  const toggle = (id) => { if (locked) return; setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 6 ? (push("Selection limit reached", "You can invite up to 6 suppliers."), prev) : [...prev, id]); };
  const confirm = () => {
    mutate((d) => {
      const others = d.supplier_shortlisting.filter((s) => s.rfx_id !== rfxId); let seq = d.supplier_shortlisting.length;
      d.supplier_shortlisting = [...others, ...rankedAll.filter((s) => ranked.includes(s) || selected.includes(s.supplier_id)).map((s) => { const prev = s.sh; const flag = selected.includes(s.supplier_id) ? 1 : 0; const agentFlag = s.composite >= 84 ? 1 : 0; return { shortlist_id: prev?.shortlist_id || `SHL-${String(++seq).padStart(3, "0")}`, rfx_id: rfxId, supplier_id: s.supplier_id, agent_score: s.composite, shortlist_flag: flag, manual_override_flag: flag !== agentFlag ? 1 : 0, override_reason: flag !== agentFlag ? (flag ? "Added by Category Manager" : "Removed by Category Manager") : null, validated_by: "Priya Nair", validated_at: nowTs() }; })];
      d.rfx_events = d.rfx_events.map((e) => (e.rfx_id === rfxId ? { ...e, invited_suppliers: J(selected) } : e));
    });
    push(`Shortlist confirmed (${selected.length})`, `supplier_shortlisting updated and rfx_events.invited_suppliers set for ${rfxId}.`);
  };
  const canConfirm = selected.length >= 3 && selected.length <= 6 && !locked;
  return (
    <div>
      <div className="cc-hero"><div className="eyebrow">Activity 02 · Agent A2 — Supplier Discovery · supplier_shortlisting ← supplier · supplier_external_enrichment · supplier_risk_profile · supplier_classification</div><h2>Smart Supplier Discovery & Shortlisting</h2></div>
      {IS_V4 && <div className="di2-tabbar" style={{ marginBottom: 12 }}><button className={`di2-tab ${sdTab === "list" ? "active" : ""}`} onClick={() => setSdTab("list")}>☰ Ranked list & shortlist</button><button className={`di2-tab ${sdTab === "cockpit" ? "active" : ""}`} onClick={() => setSdTab("cockpit")}>◎ Decision cockpit (A2 engine)</button></div>}
      {IS_V4 && sdTab === "cockpit" && <DiscoveryCockpit db={db} mutate={mutate} push={push} rfx={rfx} intake={intake} selected={selected} setSelected={setSelected} locked={locked} user={user} can={can} />}
      {IS_V4 && sdTab === "cockpit" && <div className="card cc-side-card" style={{ background: "var(--primary-soft)", borderColor: "#c9def6", marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ fontSize: 12.5 }}><b>{selected.length} / 6 selected</b>: {selected.map((id) => supName(db, id)).join(", ") || "—"} · Category Manager validates (HITL-002); overrides against the agent ranking are recorded.</span><button className="btn btn-primary" disabled={!canConfirm} onClick={confirm}>Confirm Shortlist ({selected.length})</button></div></div>}
      <div className="cc-layout" style={{ gridTemplateColumns: "2.3fr 1fr", display: IS_V4 && sdTab === "cockpit" ? "none" : undefined }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}><span style={{ fontSize: 13.5 }}><b>{rankedF.length} candidates</b> <span style={{ color: "var(--muted)" }}>in <b>{catName}</b> from the vendor master ({db.supplier.length} total) — top {ranked.length} shown, select 3-6 to invite</span></span><span className="badge awarded">{selected.length} / 6 selected</span></div>
          <div className="sd-filters">
            <input className="ex-search" placeholder="Search name, country, city, profile" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={fRegion} onChange={(e) => setFRegion(e.target.value)}><option value="All">All regions</option>{[...new Set(rankedAll.map((x) => x.region))].sort().map((r) => <option key={r}>{r}</option>)}</select>
            <select value={fRisk} onChange={(e) => setFRisk(e.target.value)}><option value="All">Any risk</option><option value="LOW">Low risk</option><option value="MEDIUM">Medium risk</option><option value="HIGH">High risk</option></select>
            <select value={fKyc} onChange={(e) => setFKyc(e.target.value)}><option value="All">Any KYC</option><option value="VERIFIED">KYC verified</option><option value="PENDING">KYC pending</option></select>
            <select value={fRel} onChange={(e) => setFRel(e.target.value)}><option value="All">Incumbent + external</option><option value="INC">Incumbent / existing only</option><option value="EXT">External (new) only</option></select>
            <label className="rvem-checkbox-row" style={{ margin: 0 }}><input type="checkbox" checked={allCats} onChange={() => setAllCats((x) => !x)} />All categories</label>
          </div>
          <div className="sd-quick"><label style={{ margin: 0 }}>Add supplier</label><select value="" onChange={(e) => { if (e.target.value) toggle(e.target.value); }} disabled={locked}><option value="">Select a supplier to invite…</option>{rankedAll.filter((x) => !selected.includes(x.supplier_id)).slice(0, 60).map((x) => <option key={x.supplier_id} value={x.supplier_id}>{x.name} · {x.country} · {x.assessed ? Math.round(x.composite) : "n\/a"}</option>)}</select><span className="muted" style={{ fontSize: 12 }}>{selected.length} selected: {selected.map((id) => supName(db, id)).join(", ") || "—"}</span></div>
          <div className="sd-reco"><div className="sd-reco-col"><div className="sd-reco-h"><b>AI recommended · Incumbent / existing</b><span className="muted">{recInc.length} · known relationship, scorecards, contracts</span></div>{recInc.map((x) => <div key={x.supplier_id} className={`sd-reco-item ${selected.includes(x.supplier_id) ? "on" : ""}`} onClick={() => toggle(x.supplier_id)}><b>{x.name}</b><span>{x.incumbent ? "Incumbent" : x.preferred ? "Preferred" : "Existing"} · score {Math.round(x.composite)}</span><span className="sd-why">{x.why}</span></div>)}{!recInc.length && <div className="muted" style={{ fontSize: 12 }}>No existing relationship in this category.</div>}</div>
            <div className="sd-reco-col"><div className="sd-reco-h"><b>AI recommended · External</b><span className="muted">{recExt.length} · new to us, from the vendor master</span></div>{recExt.map((x) => <div key={x.supplier_id} className={`sd-reco-item ${selected.includes(x.supplier_id) ? "on" : ""}`} onClick={() => toggle(x.supplier_id)}><b>{x.name}</b><span>{x.country} · score {Math.round(x.composite)}</span><span className="sd-why">{x.why}</span></div>)}{!recExt.length && <div className="muted" style={{ fontSize: 12 }}>No external candidates match the filters.</div>}</div></div>
          {locked && <div className="callout warn" style={{ marginBottom: 10 }}>{!can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") ? "Shortlisting is a Procurement action — your role can view the agent ranking but not change the shortlist." : `Shortlist is locked — this event is already ${rfx.status.toLowerCase()}.`}</div>}
          {ranked.map((s, i) => (
            <div key={s.supplier_id} className={`supplier-row ${selected.includes(s.supplier_id) ? "selected" : ""}`} onClick={() => toggle(s.supplier_id)}>
              <div className="rank-badge">{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{s.name}{s.incumbent && <span className="badge awarded" style={{ fontSize: 9.5 }}>Incumbent</span>}{s.strategic && <span className="badge open" style={{ fontSize: 9.5 }}>Strategic</span>}{s.kyc_status !== "VERIFIED" && <span className="badge closed" style={{ fontSize: 9.5 }}>KYC {nice(s.kyc_status)}</span>}{!s.assessed && <span className="badge draft" style={{ fontSize: 9.5 }}>Tail spend · unassessed</span>}{s.sh?.manual_override_flag ? <span className="badge closing" style={{ fontSize: 9.5 }}>Override</span> : null}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{IS_V4 ? <span className="mono">{s.supplier_id}</span> : <Ref t="supplier" c="supplier_id" v={s.supplier_id} openRecord={openRecord} />} · {s.region} · {s.country}{s.v?.city ? ` · ${s.v.city}` : ""} · {s.years_on_panel} yrs{s.v?.vendor_profile ? ` · ${s.v.vendor_profile}` : ""}{s.v?.contact_name ? ` · ${s.v.contact_name}` : ""}</div></div>
              <div className="metric"><span className="m-lbl">ESG</span><span className="m-val">{s.esg_score ?? "—"}</span></div>
              <div className="metric"><span className="m-lbl">Credit</span><span className="m-val">{s.credit ?? "—"}</span></div>
              <div className="metric"><span className="m-lbl">Geo risk</span><span className="m-val" style={{ color: s.geoRisk > 30 ? "var(--amber)" : "inherit" }}>{s.geoRisk ?? "—"}</span></div>
              <div className="metric"><span className="m-lbl">Capability</span><span className="m-val">{s.capability}</span></div>
              <div style={{ textAlign: "center", width: 54 }}><div style={{ fontSize: 22, fontWeight: 800, color: s.assessed ? "var(--primary)" : "var(--muted)" }}>{s.assessed ? Math.round(s.composite) : "n\/a"}</div><div style={{ fontSize: 8.5, textTransform: "uppercase", color: "var(--muted)" }}>Composite</div></div>
              <div className={`checkbox ${selected.includes(s.supplier_id) ? "checked" : ""}`}>{selected.includes(s.supplier_id) ? "✓" : ""}</div>
            </div>))}
        </div>
        <div>
          <div className="card cc-side-card"><div className="cc-side-title">Automated Checks</div>{AUTOMATED_CHECKS.map(([c, t]) => <div key={c} className={`progress-check done ${IS_V4 ? "clickable" : ""}`} onClick={() => IS_V4 && setCheckOpen(c)}><span className="dot">✓</span>{c}{IS_V4 ? <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>View ›</span> : <a className="mono rfp-link" style={{ marginLeft: "auto", fontSize: 10.5 }} onClick={() => gotoTable(t)}>{t}</a>}</div>)}</div>
          {checkOpen && <div className="modal-overlay" onClick={() => setCheckOpen(null)}><div className="modal chk-modal" onClick={(e) => e.stopPropagation()}><div className="chk-head"><span className="chk-ic">{CHECK_DETAIL[checkOpen].icon}</span><div><h3 style={{ margin: 0 }}>{checkOpen}</h3><div className="muted" style={{ fontSize: 12 }}>Completed automatically by Agent A2 · {TODAY}</div></div><span className="badge awarded" style={{ marginLeft: "auto" }}>Passed</span></div><p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{CHECK_DETAIL[checkOpen].summary}</p><div className="chk-grid">{CHECK_DETAIL[checkOpen].rows.map(([k, v]) => <div key={k} className="chk-stat"><div className="v">{v}</div><div className="k">{k}</div></div>)}</div><div style={{ textAlign: "right", marginTop: 14 }}><button className="btn btn-primary btn-sm" onClick={() => setCheckOpen(null)}>Close</button></div></div></div>}
          <div className="card cc-side-card" style={{ background: "var(--primary-soft)", borderColor: "#c9def6" }}><div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", color: "var(--primary)", marginBottom: 6, fontWeight: 700 }}>RFP Shortlist · HITL-002</div><p style={{ fontSize: 12.5, marginBottom: 12 }}>Category Manager validates; Risk officer co-signs any HIGH-risk supplier. Overrides against the agent's recommendation are recorded with a reason.</p><button className="btn btn-primary" style={{ width: "100%" }} disabled={!canConfirm} onClick={confirm}>Confirm Shortlist ({selected.length})</button></div>
          {!IS_V4 && <div className="card cc-side-card"><div className="cc-side-title">Agent memory (supplier_agent_memory)</div>{ranked.filter((s) => one(db, "supplier_agent_memory", "supplier_id", s.supplier_id)).slice(0, 3).map((s) => <div key={s.supplier_id} style={{ fontSize: 11.5, marginBottom: 8 }}><b>{s.name}</b><div className="muted">{one(db, "supplier_agent_memory", "supplier_id", s.supplier_id)?.agent_notes_semantic}</div></div>)}{!ranked.some((s) => one(db, "supplier_agent_memory", "supplier_id", s.supplier_id)) && <div className="muted" style={{ fontSize: 12 }}>No prior engagement notes for these vendors yet.</div>}</div>}
          <div style={{ display: "flex", gap: 10 }}><button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPage("demand-intake")}>← Previous</button><button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setPage("rfx-creation-publish")}>Next Activity →</button></div>
        </div>
      </div>
    </div>);
}

/* ============================= RFX CREATION & PUBLISH ============================= */
const RC_TYPE_OPTIONS = ["TEXT", "NUMERIC", "YES_NO", "CHOICE", "FILE"];
const RC_PRIO = ["LOW", "MEDIUM", "HIGH"];
const stageIndex = (s) => ({ DRAFT: 1, OPEN: 3, EVALUATION: 4, NEGOTIATION: 4, AWARDED: 4 }[s] ?? 0);

function QuestionnaireBuilder({ db, mutate, push, rfxId, openRecord, gotoTable, can }) {
  const editable = can("PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  const reqs = q(db, "rfx_requirements", "rfx_id", rfxId);
  const [rows, setRows] = useState(reqs);
  useEffect(() => setRows(q(db, "rfx_requirements", "rfx_id", rfxId)), [rfxId, db.rfx_requirements.length]);
  const totalW = rows.reduce((a, r) => a + Number(r.weight || 0), 0);
  const upd = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const remove = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () => { const id = Math.max(0, ...db.rfx_requirements.map((r) => r.requirement_id), ...rows.map((r) => r.requirement_id)) + 1; setRows((rs) => [...rs, { requirement_id: id, rfx_id: rfxId, category: "New Section", title: "New requirement", description: "Enter the question description", priority_level: "MEDIUM", response_type: "TEXT", choices: null, max_points_allocated: 100, weight: 5, created_at: nowTs(), updated_at: nowTs() }]); push("Question added", "Scroll down to edit the new row."); };
  const move = (i, dir) => setRows((rs) => { const n = [...rs]; const j = i + dir; if (j < 0 || j >= n.length) return rs; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const save = () => { if (totalW !== 100) { push("Weights must total 100%", `Currently ${totalW}%.`); return; } mutate((d) => { d.rfx_requirements = [...d.rfx_requirements.filter((r) => r.rfx_id !== rfxId), ...rows.map((r) => ({ ...r, weight: Number(r.weight), updated_at: nowTs() }))]; }); push("Questionnaire saved", `${rows.length} requirements written to rfx_requirements for ${rfxId}.`); };
  return (
    <div>
      <div className="rc-breadcrumb">RFx &gt; <b>{rfxId}</b> &gt; Questionnaire</div>
      <div className="rc-head-row"><div><h2>RFx Questionnaire</h2><p>Add, edit, reorder or reweight requirements. Each row is a <a className="mono rfp-link" onClick={() => gotoTable("rfx_requirements")}>rfx_requirements</a> record; weights drive the A5 scoring.</p></div>
        <div className="rc-head-actions"><span className={`badge ${totalW === 100 ? "awarded" : "closed"}`}>Total weight {totalW}%</span><button className="btn btn-ghost btn-sm" onClick={() => setRows(reqs)}>Discard changes</button><button className="btn btn-primary btn-sm" onClick={save} disabled={!editable}>Save Questionnaire</button></div></div>
      {!editable && <div className="callout info" style={{ marginBottom: 10 }}>Read-only for your role — Procurement maintains the questionnaire.</div>}
      <div className="card">
        <div className="rc-table-head"><h3>Requirements ({rows.length})</h3><button className="btn btn-ghost btn-sm" onClick={add}>+ Add Question</button></div>
        <div style={{ overflowX: "auto" }}><table className="rc-q-table">
          <thead><tr><th></th><th>#</th><th>Section</th><th>Title</th><th>Question / description</th><th>Priority</th><th>Type</th><th>Weight %</th><th></th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.requirement_id}>
              <td className="rc-drag"><a onClick={() => move(i, -1)}>▲</a><a onClick={() => move(i, 1)}>▼</a></td><td className="rc-num">{i + 1}</td>
              <td style={{ minWidth: 150 }}><input className="rc-section-input" value={r.category} onChange={(e) => upd(i, "category", e.target.value)} /></td>
              <td style={{ minWidth: 170 }}><input className="rc-section-input" value={r.title} onChange={(e) => upd(i, "title", e.target.value)} /></td>
              <td style={{ minWidth: 320 }}><textarea className="rc-q-textarea" value={r.description} onChange={(e) => upd(i, "description", e.target.value)} /></td>
              <td><select className="rc-select" value={r.priority_level} onChange={(e) => upd(i, "priority_level", e.target.value)}>{RC_PRIO.map((o) => <option key={o}>{o}</option>)}</select></td>
              <td><select className="rc-select" value={r.response_type} onChange={(e) => upd(i, "response_type", e.target.value)}>{RC_TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></td>
              <td><input type="number" className="rc-section-input" style={{ width: 64 }} value={r.weight} onChange={(e) => upd(i, "weight", e.target.value)} /></td>
              <td><button className="rc-del-btn" onClick={() => remove(i)} title="Delete">🗑</button></td>
            </tr>))}</tbody></table></div>
        <div className="rc-footer-note">ⓘ Weights must total 100%. Use ▲▼ to reorder.</div>
      </div>
    </div>);
}


/* ---- evaluation weights: 4 standard (rfx_weight_configs) + configurable extra categories (rfx_weight_categories, extension) ---- */
const WEIGHT_DEFAULTS = { commercial_weight: 0.5, operational_weight: 0.25, risk_compliance_weight: 0.2, esg_weight: 0.05 };
const EXTRA_WEIGHT_SUGGESTIONS = { RFQ: ["Delivery lead time", "Quality & warranty", "Total cost of ownership"], RFP: ["Innovation & automation", "Transition capability", "References & experience"], RFI: ["Capability fit", "Market maturity", "Roadmap alignment"] };
function WeightConfigEditor({ db, mutate, push, rfxId, editable }) {
  const w = one(db, "rfx_weight_configs", "rfx_id", rfxId); const rfx = one(db, "rfx_events", "rfx_id", rfxId); if (!w) return null;
  const extras = (db.rfx_weight_categories || []).filter((x) => x.rfx_id === rfxId);
  const std = [["Commercial", "commercial_weight"], ["Operational", "operational_weight"], ["Risk & compliance", "risk_compliance_weight"], ["ESG", "esg_weight"]];
  const ratio = (v) => { const n = num(v); return n > 1 ? n / 100 : n; };
  const total = Math.round((std.reduce((a, [, k]) => a + ratio(w[k]), 0) + extras.reduce((a, x) => a + ratio(x.weight), 0)) * 100);
  const setStd = (k, v) => mutate((d) => { d.rfx_weight_configs = d.rfx_weight_configs.map((x) => (x.rfx_id === rfxId ? { ...x, [k]: v, updated_at: nowTs() } : x)); });
  const setExtra = (id, v) => mutate((d) => { d.rfx_weight_categories = d.rfx_weight_categories.map((x) => (x.weight_category_id === id ? { ...x, weight: v } : x)); });
  const addExtra = (name) => { if (!name) return; mutate((d) => { d.rfx_weight_categories = [...(d.rfx_weight_categories || []), { weight_category_id: `WC-${String((d.rfx_weight_categories || []).length + 1).padStart(3, "0")}`, rfx_id: rfxId, category_name: name, weight: 0.05, source: "MANUAL", created_at: nowTs() }]; }); push("Category added", `${name} — adjust weights so the total is 100%.`); };
  const removeExtra = (id) => mutate((d) => { d.rfx_weight_categories = d.rfx_weight_categories.filter((x) => x.weight_category_id !== id); });
  const resetDefaults = () => { mutate((d) => { d.rfx_weight_configs = d.rfx_weight_configs.map((x) => (x.rfx_id === rfxId ? { ...x, ...WEIGHT_DEFAULTS, updated_at: nowTs() } : x)); d.rfx_weight_categories = (d.rfx_weight_categories || []).filter((x) => x.rfx_id !== rfxId); }); push("Defaults restored", "Commercial 50 · Operational 25 · Risk & compliance 20 · ESG 5"); };
  const [newCat, setNewCat] = useState("");
  return (
    <div className="section-label" style={{ marginTop: 10, textTransform: "none", letterSpacing: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>Evaluation weights</span><span className={`badge ${total === 100 ? "awarded" : "closed"}`}>Total {total}%</span></div>
      <div className="muted" style={{ fontSize: 11, fontWeight: 400, margin: "4px 0 6px" }}>Defaults 50 / 25 / 20 / 5 · configurable · add categories for {rfx.rfx_type}</div>
      {std.map(([l, k]) => <div key={k} className="w-row"><span>{l}</span><input type="range" min="0" max="1" step="0.05" value={ratio(w[k])} disabled={!editable} onChange={(e) => setStd(k, Number(e.target.value))} /><b className="mono">{Math.round(ratio(w[k]) * 100)}%</b></div>)}
      {extras.map((x) => <div key={x.weight_category_id} className="w-row extra"><span>{x.category_name}{editable && <a className="rfp-link" style={{ marginLeft: 6, fontSize: 10.5 }} onClick={() => removeExtra(x.weight_category_id)}>remove</a>}</span><input type="range" min="0" max="1" step="0.05" value={ratio(x.weight)} disabled={!editable} onChange={(e) => setExtra(x.weight_category_id, Number(e.target.value))} /><b className="mono">{Math.round(ratio(x.weight) * 100)}%</b></div>)}
      {editable && <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}><select value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ maxWidth: 220 }}><option value="">Add category…</option>{(EXTRA_WEIGHT_SUGGESTIONS[rfx.rfx_type] || EXTRA_WEIGHT_SUGGESTIONS.RFP).filter((n) => !extras.some((x) => x.category_name === n)).map((n) => <option key={n}>{n}</option>)}<option value="__custom">Custom…</option></select><button className="btn btn-ghost btn-sm" onClick={() => { const name = newCat === "__custom" ? window.prompt("Category name") : newCat; addExtra(name); setNewCat(""); }} disabled={!newCat}>+ Add</button><button className="btn btn-ghost btn-sm" onClick={resetDefaults}>Reset defaults</button></div>}
      {total !== 100 && <div className="callout warn" style={{ marginTop: 8 }}>Weights must total 100% before the draft can be approved.</div>}
    </div>);
}

function RfpCreation({ db, mutate, push, setPage, rfxId, openRecord, gotoTable, can }) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const intake = db.intake_requests.find((r) => r.linked_RFx === rfxId);
  const ct = intake ? one(db, "intake_commercials_timelines", "request_id", intake.request_id) : null;
  const gov = intake ? one(db, "intake_strategy_governance", "request_id", intake.request_id) : null;
  const w = one(db, "rfx_weight_configs", "rfx_id", rfxId);
  const drafts = q(db, "rfx_draft_versions", "rfx_id", rfxId).sort((a, b) => a.version_number - b.version_number);
  const latest = drafts[drafts.length - 1];
  const docs = q(db, "rfx_documents", "rfx_id", rfxId).map((d) => ({ ...d, doc: one(db, "documents", "document_id", d.document_id) }));
  const config = { template: rfx.rfx_type === "RFQ" ? "TPL-RFQ-STD-02" : rfx.rfx_type === "RFI" ? "TPL-RFI-DISC-01" : "TPL-RFP-SVC-04", evaluationMethod: rfx.rfx_type === "RFQ" ? "Lowest compliant cost" : "Weighted scoring", currency: ct?.currency || "USD", bidValidity: rfx.rfx_type === "RFQ" ? 60 : 90 };
  const [preview, setPreview] = useState(false);
  const reqs = q(db, "rfx_requirements", "rfx_id", rfxId);
  const years = gov?.duration_years || 1; const invited = P(rfx.invited_suppliers).length;
  const step = latest?.approval_status === "APPROVED" ? (rfx.status === "DRAFT" ? 3 : 4) : latest?.approval_status === "IN_REVIEW" ? 2 : 1;
  const sections = ["Executive Summary", "Project Overview & Objectives", "Scope of Work", "Service Requirements", "Technical Requirements", "Service Level Agreement (SLA)", "Commercial Terms", "Evaluation Criteria", "Submission Instructions", "Terms & Conditions", "Appendices"];
  const generateDraft = () => {
    const v = (latest?.version_number || 0) + 1;
    const content = `# ${rfx.title}

## 1. Executive Summary
Leona invites proposals for ${rfx.description}

## 2. Scope of Work
${rfx.scope || intake?.requirement_description || ""}

## 3. Requirements (${reqs.length})
${reqs.map((r, i) => `${i + 1}. ${r.title} (${r.weight}%) — ${r.description}`).join(" ")}

## 4. Evaluation
Commercial ${Math.round(w.commercial_weight * 100)}%, Operational ${Math.round(w.operational_weight * 100)}%, Risk & Compliance ${Math.round(w.risk_compliance_weight * 100)}%, ESG ${Math.round(w.esg_weight * 100)}%. Method: ${config.evaluationMethod}.

## 5. Commercial Terms
Currency ${config.currency} · Bid validity ${config.bidValidity} days · Contract ${gov?.contract_type || "MSA"} · ${years} year(s) · Payment Net ${gov?.payment_terms_days || 45}.

## 6. Timeline
Issue ${ct?.rfp_issue_date || "TBC"} · Due ${rfx.due_date || "TBC"} · Award ${ct?.award_date || "TBC"}

_Generated ${nowTs()} from template ${config.template}._`;
    mutate((d) => { d.rfx_draft_versions = [...d.rfx_draft_versions.map((x) => (x.rfx_id === rfxId && x.approval_status !== "APPROVED" ? { ...x, approval_status: "SUPERSEDED" } : x)), { draft_id: `DRF-${String(d.rfx_draft_versions.length + 1).padStart(3, "0")}`, rfx_id: rfxId, version_number: v, template_id: config.template, draft_content: content, created_by: "A3 RFx Builder Agent", reviewed_by: P(rfx.owner, {}).name, approval_status: "IN_REVIEW", approved_by: null, approved_at: null }]; });
    push("RFP created", `V${v}.0 generated into rfx_draft_versions — pending Legal approval (HITL-003).`);
  };
  const approveDraft = () => { const extras = (db.rfx_weight_categories || []).filter((x) => x.rfx_id === rfxId); const tot = Math.round((w.commercial_weight + w.operational_weight + w.risk_compliance_weight + w.esg_weight + extras.reduce((a, x) => a + x.weight, 0)) * 100); if (tot !== 100) { push("Weights must total 100%", `Currently ${tot}%.`); return; } mutate((d) => { d.rfx_draft_versions = d.rfx_draft_versions.map((x) => (x.draft_id === latest.draft_id ? { ...x, approval_status: "APPROVED", approved_by: "Laura Bennett", approved_at: nowTs() } : x)); d.rfx_weight_configs = d.rfx_weight_configs.map((x) => (x.rfx_id === rfxId ? { ...x, status: "APPROVED", completeness_score: x.completeness_score ?? 94.5, consistency_score: x.consistency_score ?? 92, complaince_score: x.complaince_score ?? 98, readability_score: x.readability_score ?? 90, overall_quality_score: x.overall_quality_score ?? 93.6, updated_at: nowTs() } : x)); }); push("Draft approved", `${latest.draft_id} approved by Legal. Ready to publish from the Invitation Email tab.`); };
  const addDoc = () => { mutate((d) => { const id = Math.max(...d.documents.map((x) => x.document_id)) + 1; d.documents = [...d.documents, { document_id: id, title: `${rfx.title} – Additional Requirements`, document_type: "REQUIREMENTS", status: "ACTIVE", file_path: `/docs/rfx/${rfxId}/Additional_Requirements.pdf`, file_name: "Additional_Requirements.pdf", file_size_bytes: 819200, created_by: P(rfx.owner, {}).name, created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.rfx_documents = [...d.rfx_documents, { rfx_id: rfxId, document_id: id, visibility: "SUPPLIER", phase: "ISSUE", created_at: nowTs() }]; }); push("Document added", "Written to documents + rfx_documents."); };
  const removeDoc = (docId) => { mutate((d) => { d.rfx_documents = d.rfx_documents.filter((x) => !(x.rfx_id === rfxId && x.document_id === docId)); d.documents = d.documents.map((x) => (x.document_id === docId ? { ...x, status: "DELETED", deleted_at: nowTs() } : x)); }); push("Document removed", "Soft-deleted in documents (deleted_at set)."); };
  return (
    <div>
      <div className="rc-breadcrumb">Sourcing Events &gt; <b>{rfxId}</b> &gt; RFP Creation</div>
      <div className="rfp-top-row"><div><h2>RFP Creation</h2><p>RFP is assembled from the intake, the questionnaire, the weight config and the scope documents. ⓘ</p></div>
        <div className="rfp-pill-row"><span className={`rfp-pill ${intake ? "green" : "ghost"}`}>{intake ? "✓ Intake Completed" : "No intake linked"}</span><span className="rfp-pill ghost" onClick={() => setPreview(true)}>👁 Preview RFP</span></div></div>
      <Stepper steps={["Intake Form", "RFP Creation", "RFP Review", "Approval", "Publish RFP"]} current={step} />
      <div className="rfp-columns">
        <div>
          <div className="card rfp-card"><div className="rfp-card-title">1. Source Information</div>
            <div className="rfp-field-row"><span className="lbl">RFx ID</span><span className="val"><Ref t="rfx_events" c="rfx_id" v={rfxId} openRecord={openRecord} /></span></div>
            <div className="rfp-field-row"><span className="lbl">Title</span><span className="val">{rfx.title}</span></div>
            <div className="rfp-field-row"><span className="lbl">Category</span><span className="val">{one(db, "rfx_category", "rfx_category", rfx.rfx_category)?.category_name}</span></div>
            <div className="rfp-field-row"><span className="lbl">Requester</span><span className="val">{intake ? `${intake.requestor_name} · ${intake.business_unit}` : "—"}</span></div>
            <div className="rfp-field-row"><span className="lbl">Intake</span><span className="val">{intake ? <Ref t="intake_requests" c="request_id" v={intake.request_id} openRecord={openRecord} /> : "—"}</span></div>
            <span className="rfp-link" onClick={() => setPage("demand-intake")}>View Intake Summary →</span></div>
          <div className="card rfp-card"><div className="rfp-card-title">2. Bid Volume Summary (from Intake)</div>
            <div className="rfp-stat-grid"><div className="rfp-stat-box"><div className="lbl">Total Budget ({years} yr{years > 1 ? "s" : ""})</div><div className="val">{fmtUsd(rfx.budget_limit_usd)}</div></div><div className="rfp-stat-box"><div className="lbl">Annual</div><div className="val">{fmtUsd(rfx.budget_limit_usd ? rfx.budget_limit_usd / years : null)}</div></div><div className="rfp-stat-box"><div className="lbl">Suppliers Invited</div><div className="val">{invited}</div></div><div className="rfp-stat-box"><div className="lbl">Target Savings</div><div className="val">{fmtUsd((rfx.budget_limit_usd || 0) * 0.05)} – {fmtUsd((rfx.budget_limit_usd || 0) * 0.08)}</div><div style={{ fontSize: 10, color: "#0a6b45" }}>5% – 8%</div></div></div></div>
          <div className="card rfp-card"><div className="rfp-card-title">AI Insights · rfx_weight_configs</div>
            {w ? <>{[["Completeness", w.completeness_score], ["Consistency", w.consistency_score], ["Compliance", w.complaince_score], ["Readability", w.readability_score]].map(([l, v]) => <div key={l} className="rfp-insight-item"><span className="ic">{v == null ? "…" : "✓"}</span>{l} {v != null && <b style={{ marginLeft: "auto" }}>{v}</b>}</div>)}<div className="rfp-field-row" style={{ marginTop: 6 }}><span className="lbl">Overall quality</span><span className="val">{w.overall_quality_score ?? "pending"} <Badge s={w.status} /></span></div>{P(w.issues).map((x) => <div key={x} className="callout warn" style={{ marginTop: 6 }}>⚠ {x}</div>)}{P(w.warnings).map((x) => <div key={x} className="callout info" style={{ marginTop: 6 }}>ⓘ {x}</div>)}</> : <div className="muted">No weight config yet.</div>}</div>
        </div>
        <div>
          <div className="card rfp-card"><div className="rfp-card-title">3. Scope Documents & Inputs</div>
            <div className="rfp-dropzone"><div className="icon">⬆</div><div className="drop-main">Drag & drop files here or <span style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }} onClick={addDoc}>browse</span></div><div className="sub">PDF, DOCX, XLSX (Max 50MB) → documents + rfx_documents</div></div>
            {docs.filter((d) => d.doc?.status !== "DELETED").map((d) => <div key={d.document_id} className="rfp-file-row"><span>📄</span><span className="name"><Ref t="documents" c="document_id" v={d.document_id} openRecord={openRecord}>{d.doc?.file_name}</Ref></span><span className="size">{(d.doc?.file_size_bytes / 1048576).toFixed(1)} MB · {d.phase}</span><button className="rm" onClick={() => removeDoc(d.document_id)}>✕</button></div>)}
            <span className="rfp-link" onClick={addDoc}>+ Add More Documents</span></div>
          <div className="card rfp-card"><div className="rfp-card-title">4. RFP Configuration <span className="badge awarded" style={{ marginLeft: 6 }}>inferred from intake</span></div>
            <div className="rfp-field-row"><span className="lbl">RFx type</span><span className="val">{rfx.rfx_type} <span className="muted">· {gov?.sourcing_approach ? "from intake strategy" : "default"}</span></span></div>
            <div className="rfp-field-row"><span className="lbl">Evaluation method</span><span className="val">{rfx.rfx_type === "RFQ" ? "Lowest compliant cost" : rfx.rfx_type === "RFI" ? "Capability assessment (unscored)" : intake?.procurement_type === "Strategic Sourcing" ? "Weighted scoring (best value)" : "Weighted scoring"}</span></div>
            <div className="rfp-field-row"><span className="lbl">Response currency</span><span className="val">{ct?.currency || "USD"}</span></div>
            <div className="rfp-field-row"><span className="lbl">Bid validity</span><span className="val">{rfx.rfx_type === "RFQ" ? 60 : 90} days</span></div>
            <div className="rfp-field-row"><span className="lbl">Contract</span><span className="val">{gov?.contract_type || "—"} · {gov?.duration_years || 1} yr · Net {gov?.payment_terms_days || 30}</span></div>
            <div className="rfp-field-row"><span className="lbl">Timeline</span><span className="val">issue {fmtDate(ct?.rfp_issue_date)} · award {fmtDate(ct?.award_date)} · start {fmtDate(ct?.service_start_date)}</span></div>
            <WeightConfigEditor db={db} mutate={mutate} push={push} rfxId={rfxId} editable={rfx.status === "DRAFT" && can("PROC_MGR", "PROC_HEAD", "PROC_TEAM")} />
          </div>
        </div>
        <div>
          <div className="card rfp-card"><div className="rfp-card-title">5. Draft & Approval</div>
            <div className="rfp-doc-stats"><div><b>{reqs.length}</b>Requirements</div><div><b>{drafts.length}</b>Versions</div><div><b>{latest?.approval_status ? nice(latest.approval_status) : "—"}</b>Status</div></div>
            {rfx.status === "DRAFT" && can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") && <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={generateDraft}>⟳ {latest ? "Regenerate draft" : "Create draft"}</button>}
            {latest && <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setPreview(true)}>👁 Preview {latest.draft_id}</button>}
            {latest?.approval_status === "IN_REVIEW" && (can("LEGAL") ? <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={approveDraft}>Approve draft as Legal (HITL-003)</button> : <div className="callout warn" style={{ marginTop: 8 }}>Awaiting Legal approval.</div>)}
            <div className="callout success" style={{ marginTop: 10 }}>Drafts are versioned in rfx_draft_versions; only an APPROVED version can be published.</div>
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>RFP Creation History · rfx_draft_versions</h3></div>
        <table className="rc-q-table"><thead><tr><th>Version</th><th>Draft ID</th><th>Template</th><th>Created By</th><th>Reviewed By</th><th>Status</th><th>Approved</th></tr></thead>
          <tbody>{drafts.map((h) => <tr key={h.draft_id}><td style={{ fontWeight: 700 }}>V{h.version_number}.0</td><td><Ref t="rfx_draft_versions" c="draft_id" v={h.draft_id} openRecord={openRecord} /></td><td>{h.template_id}</td><td>{h.created_by}</td><td>{h.reviewed_by}</td><td><Badge s={h.approval_status} /></td><td>{h.approved_by ? `${h.approved_by} · ${h.approved_at}` : "—"}</td></tr>)}{!drafts.length && <tr><td colSpan="7" className="loading-row">No drafts yet — click Create draft.</td></tr>}</tbody></table></div>
      {preview && latest && <div className="modal-overlay" onClick={() => setPreview(false)}><div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}><h3>{latest.draft_id} · V{latest.version_number}.0 <Badge s={latest.approval_status} /></h3><pre className="doc">{latest.draft_content}</pre><div style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm" onClick={() => setPreview(false)}>Close</button></div></div></div>}
    </div>);
}

function RfpInvitationEmail({ db, mutate, push, rfxId, openRecord, gotoTable, can }) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const intake = db.intake_requests.find((r) => r.linked_RFx === rfxId); const ct = intake ? one(db, "intake_commercials_timelines", "request_id", intake.request_id) : null;
  const invited = P(rfx.invited_suppliers).map((id) => one(db, "supplier", "supplier_id", id)).filter(Boolean);
  const latest = q(db, "rfx_draft_versions", "rfx_id", rfxId).slice(-1)[0];
  const docs = q(db, "rfx_documents", "rfx_id", rfxId).filter((d) => d.visibility === "SUPPLIER").map((d) => one(db, "documents", "document_id", d.document_id)).filter((d) => d && d.status !== "DELETED");
  const owner = P(rfx.owner, {});
  const [due, setDue] = useState(rfx.due_date || "2026-10-09");
  const defaultBody = `Dear {{Vendor Contact Name}},

We are pleased to invite you to participate in our ${rfx.rfx_type} for the following requirement:

RFx ID: ${rfxId}
Title: ${rfx.title}
Description: ${rfx.description}

Please find attached the complete ${rfx.rfx_type} document containing the scope of work, terms & conditions, evaluation criteria, and submission instructions.

Key Terms & Conditions:
- All submissions must follow the instructions in the ${rfx.rfx_type} document.
- Prices should be quoted in USD as per the pricing schedule.
- Proposals must remain valid for 90 days from the response due date.
- All information provided will be treated as confidential.

Timeline:
- Issue Date: ${TODAY}
- Questions Due: ${due ? new Date(new Date(due).getTime() - 10 * 86400000).toISOString().slice(0, 10) : "TBC"}
- Response Due: ${due}
- Expected Award: ${ct?.award_date || "TBC"}

Questions should be submitted through the Q&A section of the sourcing portal.

${owner.name}
Sourcing Lead, Leona Procurement`;
  const [body, setBody] = useState(defaultBody);
  const [options, setOptions] = useState({ readReceipt: false, trackOpens: true, sendCopy: true });
  const canSend = rfx.status === "DRAFT" && latest?.approval_status === "APPROVED" && invited.length >= 1 && due && can("PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  const publish = () => {
    mutate((d) => { d.rfx_events = d.rfx_events.map((e) => (e.rfx_id === rfxId ? { ...e, status: "OPEN", issue_date: TODAY, due_date: due } : e)); const id = Math.max(...d.documents.map((x) => x.document_id)) + 1; d.documents = [...d.documents, { document_id: id, title: `${rfx.title} – Invitation email`, document_type: "INVITATION", status: "ACTIVE", file_path: `/docs/rfx/${rfxId}/invitation.eml`, file_name: "invitation.eml", file_size_bytes: body.length * 2, created_by: owner.name, created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.rfx_documents = [...d.rfx_documents, { rfx_id: rfxId, document_id: id, visibility: "INTERNAL", phase: "ISSUE", created_at: nowTs() }]; });
    push("Invitation sent!", `${rfxId} published to ${invited.length} suppliers · rfx_events.status = OPEN, issue_date = ${TODAY}.`);
  };
  return (
    <div>
      <div className="rc-breadcrumb">Sourcing Events &gt; <b>{rfxId}</b> &gt; Vendor Invitation Email</div>
      <div className="rfp-top-row"><div><h2>RFP Invitation Email <span className={`rfp-pill ${rfx.status === "DRAFT" ? "green" : "ghost"}`} style={{ fontSize: 11, marginLeft: 8 }}>● {rfx.status === "DRAFT" ? "Draft Ready" : `Published ${fmtDate(rfx.issue_date)}`}</span></h2><p>Send the invitation to the confirmed shortlist. Publishing sets the event OPEN and starts the Q&A window (HITL-004).</p></div></div>
      <Stepper steps={["RFP Creation", "RFP Draft Approval", "Vendor Invitation", "Responses", "Evaluation"]} current={rfx.status !== "DRAFT" ? 3 + Math.min(1, stageIndex(rfx.status) - 3) : latest?.approval_status === "APPROVED" ? 2 : 1} />
      <div className="rfp-columns" style={{ gridTemplateColumns: "0.85fr 1.5fr 0.85fr" }}>
        <div>
          <div className="card rfp-card"><div className="rfp-card-title">📧 Email Details</div>
            <div className="rfp-field-row"><span className="lbl">From</span><span className="val">{owner.name} &lt;{owner.email}&gt;</span></div>
            <div className="rfp-field-row"><span className="lbl">To</span><span className="val">{invited.length} shortlisted suppliers</span></div>
            <div style={{ fontSize: 12, margin: "4px 0 8px" }}>{invited.map((s) => <span key={s.supplier_id} className="vr-attach-chip" style={{ marginRight: 4 }}>{s.name}</span>)}{!invited.length && <span className="muted">No shortlist confirmed yet — go to Supplier Discovery.</span>}</div>
            <div className="rfp-field-row"><span className="lbl">Cc</span><span className="val">procurement.team@leona.example</span></div>
            <div style={{ fontSize: 12.5, marginTop: 8 }}><div className="lbl" style={{ color: "var(--muted)", fontSize: 12 }}>Subject</div><div style={{ fontWeight: 600, marginTop: 3 }}>{rfx.rfx_type} Invitation: {rfxId} – {rfx.title}</div></div></div>
          <div className="card rfp-card"><div className="rfp-card-title">🕐 Timeline</div>
            <div className="field-row single"><div><label>Response due date</label><input type="date" value={due} disabled={rfx.status !== "DRAFT"} onChange={(e) => setDue(e.target.value)} /></div></div>
            <div className="rfp-field-row"><span className="lbl">Issue Date</span><span className="val">{rfx.issue_date ? fmtDate(rfx.issue_date) : `on send (${fmtDate(TODAY)})`}</span></div>
            <div className="rfp-field-row"><span className="lbl">Expected Award</span><span className="val">{fmtDate(ct?.award_date)}</span></div>
            <div className="rfp-field-row"><span className="lbl">Approved draft</span><span className="val">{latest ? <><Ref t="rfx_draft_versions" c="draft_id" v={latest.draft_id} openRecord={openRecord} /> <Badge s={latest.approval_status} /></> : "none"}</span></div></div>
        </div>
        <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>✉ Email Content</h3></div>
          <div className="rvem-toolbar"><select><option>Segoe UI</option><option>Arial</option></select><select><option>11</option><option>12</option></select><span className="sep"></span><span className="ic"><b>B</b></span><span className="ic"><i>I</i></span><span className="ic"><u>U</u></span><span style={{ marginLeft: "auto" }}></span><select style={{ width: 170 }} onChange={(e) => { if (e.target.value !== "Insert Placeholder") { setBody((b) => b + ` {{${e.target.value}}}`); } }}><option>Insert Placeholder</option><option>Vendor Contact Name</option><option>RFx ID</option><option>Response Due Date</option></select></div>
          <textarea className="rvem-body" style={{ width: "100%", border: "none", minHeight: 460 }} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div>
          <div className="card rfp-card"><div className="rfp-card-title">📎 Attachments ({docs.length}) · rfx_documents</div>{docs.map((a) => <div key={a.document_id} className="rfp-file-row"><span>📄</span><span className="name">{a.file_name}</span><span className="size">{(a.file_size_bytes / 1048576).toFixed(1)} MB</span></div>)}{!docs.length && <div className="muted" style={{ fontSize: 12 }}>No supplier-visible documents yet.</div>}</div>
          <div className="card rfp-card"><div className="rfp-card-title">⚙ Email Options</div>
            {[["readReceipt", "Request Read Receipt"], ["trackOpens", "Track Email Opens"], ["sendCopy", "Send me a copy"]].map(([k, l]) => <label key={k} className="rvem-checkbox-row"><input type="checkbox" checked={options[k]} onChange={() => setOptions((o) => ({ ...o, [k]: !o[k] }))} />{l}</label>)}</div>
          {!canSend && rfx.status === "DRAFT" && <div className="callout warn">To publish: approved draft{latest?.approval_status === "APPROVED" ? " ✓" : " ✗"}, ≥1 invited supplier{invited.length ? " ✓" : " ✗"}, due date{due ? " ✓" : " ✗"}.</div>}
        </div>
      </div>
      <div className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", marginTop: 4 }}><button className="btn btn-ghost btn-sm" onClick={() => push("Saved as draft", "Invitation email saved as draft.")}>📁 Save as Draft</button><div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => push("Scheduled", "Approve & Send Later scheduling queued.")}>🕐 Approve & Send Later</button><button className="btn btn-primary btn-sm" disabled={!canSend} onClick={publish}>✈ Approve & Send</button></div></div>
    </div>);
}

function RfpVendorResponse({ db, mutate, push, rfxId, openRecord, gotoTable, can }) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const bids = q(db, "bid_responses", "rfx_id", rfxId).sort((a, b) => (a.submission_date < b.submission_date ? 1 : -1));
  const [sel, setSel] = useState(bids[0]?.bid_id);
  useEffect(() => setSel(q(db, "bid_responses", "rfx_id", rfxId)[0]?.bid_id), [rfxId]);
  const bid = bids.find((b) => b.bid_id === sel) || bids[0];
  if (!bid) return <div className="card placeholder-card"><div className="icon">📭</div><h3>No bids received for {rfxId}</h3><p style={{ fontSize: 13 }}>This event is {rfx.status.toLowerCase()}. Bids arrive via portal, email or API and land in bid_responses after A4 normalisation.</p></div>;
  const resp = db.rfx_response.find((r) => r.rfx_id === rfxId && r.supplier_id === bid.supplier_id);
  const lines = q(db, "bid_line_items", "bid_id", bid.bid_id); const exc = q(db, "bid_exceptions", "bid_id", bid.bid_id); const atts = q(db, "bid_attachments", "bid_id", bid.bid_id).map((a) => ({ ...a, doc: one(db, "documents", "document_id", a.document_id) }));
  const payload = P(bid.raw_payload, {}); const ext = P(resp?.extended_bid_details, {});
  const resolve = (id) => { mutate((d) => { d.bid_exceptions = d.bid_exceptions.map((x) => (x.bid_exceptions_id === id ? { ...x, resolution_status: "RESOLVED", resolved_by: P(rfx.owner, {}).name, resolved_at: nowTs() } : x)); if (!d.bid_exceptions.some((x) => x.bid_id === bid.bid_id && x.resolution_status === "OPEN")) d.bid_responses = d.bid_responses.map((b) => (b.bid_id === bid.bid_id ? { ...b, status: "NORMALIZED", updated_at: nowTs() } : b)); }); push("Exception resolved", "bid_exceptions updated; bid status re-evaluated."); };
  return (
    <div>
      <div className="rc-breadcrumb">Sourcing Events &gt; <b>{rfxId}</b> &gt; Responses &gt; Vendor Response</div>
      <div className="rfp-top-row"><div><h2>Vendor Responses <span className="rfp-pill green" style={{ fontSize: 11, marginLeft: 8 }}>● {bids.length} received</span></h2><p>Bids as extracted and normalised by Agent A4 — raw values kept alongside normalised ones; exceptions require a human (HITL-005).</p></div></div>
      <div className="vr-columns" style={{ gridTemplateColumns: "260px 1fr" }}>
        <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Inbox</h3></div>
          {bids.map((b) => <div key={b.bid_id} className={`vr-thread-item ${b.bid_id === bid.bid_id ? "active" : ""}`} onClick={() => setSel(b.bid_id)}><div className="t">{supName(db, b.supplier_id)} <span className="muted">v{b.version_number}</span></div><div className="w">{nice(b.source_channel)} · {b.submission_date.slice(0, 16)}</div><div className="p"><Badge s={b.status} /> confidence {b.confidence_score}</div></div>)}</div>
        <div>
          <div className="vr-stat-row">
            <div className="card vr-stat-card"><div className="lbl">📄 Bid</div><div className="val"><Ref t="bid_responses" c="bid_id" v={bid.bid_id} openRecord={openRecord} /></div><div className="s">{bid.external_bid_uuid}</div></div>
            <div className="card vr-stat-card"><div className="lbl">💲 Quoted total</div><div className="val">{fmtFull(resp?.quoted_total_price)}</div><div className="s">{payload.term_years ? `${payload.term_years}-yr TCO` : ""} · terms {resp?.payment_terms_offered}</div></div>
            <div className="card vr-stat-card"><div className="lbl">⏱ Delivery</div><div className="val">{resp?.quoted_delivery_days} days</div><div className="s">transition {ext.transition_weeks} wks · team {ext.team_size} · offshore {ext.offshore_pct}%</div></div>
            <div className="card vr-stat-card"><div className="lbl">🤖 Extraction confidence</div><div className="val">{bid.confidence_score}</div><div className="s">{nice(bid.source_channel)} {bid.source_channel === "EMAIL" ? "· OCR applied" : ""}</div></div>
          </div>
          {exc.length > 0 && <div className="card" style={{ padding: 14, marginBottom: 12 }}><div className="cc-side-title">Normalisation exceptions · bid_exceptions</div>{exc.map((x) => <div key={x.bid_exceptions_id} className={`vr-warn-banner ${x.resolution_status === "RESOLVED" ? "ok" : ""}`}><span><Badge s={x.severity} /> {nice(x.exception_type)} on <code>{x.field_name}</code> = "{x.raw_value}"</span>{x.resolution_status === "OPEN" ? (can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") ? <button className="btn btn-primary btn-sm" onClick={() => resolve(x.bid_exceptions_id)}>Resolve</button> : <span className="muted" style={{ fontSize: 11.5 }}>awaiting Procurement</span>) : <span className="muted" style={{ fontSize: 11.5 }}>resolved by {x.resolved_by}</span>}</div>)}</div>}
          <div className="card" style={{ padding: 0, marginBottom: 12 }}><div className="rc-table-head"><h3>Line items · bid_line_items</h3><span className="muted" style={{ fontSize: 12 }}>raw → normalised</span></div>
            <table className="vr-disc-table"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>UoM</th><th>Raw price</th><th>FX</th><th>Normalised unit (USD)</th><th>Extended (USD)</th></tr></thead>
              <tbody>{lines.map((l) => <tr key={l.biditem_id}><td className="mono">{l.item_code}</td><td>{l.description}</td><td>{l.normalized_quantity.toLocaleString()}</td><td>{l.raw_uom} → {l.normalized_uom}</td><td>{l.raw_unit_price} {l.raw_currency}</td><td>{l.exchange_rate}</td><td>{l.normalized_unit_price.toLocaleString()}</td><td style={{ fontWeight: 600 }}>{fmtFull(l.extended_price_normalized)}</td></tr>)}<tr className="ea-total-row"><td colSpan="7" style={{ textAlign: "right" }}>Annual total</td><td>{fmtFull(lines.reduce((a, l) => a + l.extended_price_normalized, 0))}</td></tr></tbody></table></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="card rfp-card"><div className="rfp-card-title">Deviations & details · rfx_response</div><p style={{ fontSize: 12.5 }}>{resp?.requirement_deviations}</p><div className="rfp-field-row"><span className="lbl">Submitted</span><span className="val">{resp?.submitted_at}</span></div></div>
            <div className="card rfp-card"><div className="rfp-card-title">Attachments · bid_attachments</div>{atts.map((a) => <div key={a.document_id} className="rfp-file-row"><span>📄</span><span className="name">{a.doc?.file_name}</span><span className="size">{nice(a.classification)} · OCR {a.ocr_confidence}</span></div>)}</div>
          </div>
        </div>
      </div>
    </div>);
}

function RfxCreationPublish(ctx) {
  const [subTab, setSubTab] = useState("creation");
  return (
    <div>
      <div className="di-tabbar">{[["creation", "📄 RFP Creation"], ["questionnaire", "☑ Questionnaire"], ["email", "✉ Invitation & Publish"], ["vendor", "🎧 Vendor Responses"]].map(([id, l]) => <button key={id} className={`di-tab ${subTab === id ? "active" : ""}`} onClick={() => setSubTab(id)}>{l}</button>)}</div>
      {subTab === "questionnaire" && <QuestionnaireBuilder {...ctx} />}
      {subTab === "creation" && <RfpCreation {...ctx} />}
      {subTab === "email" && <RfpInvitationEmail {...ctx} />}
      {subTab === "vendor" && <RfpVendorResponse {...ctx} />}
    </div>);
}

/* ============================= QUICK RFX (REAL AI) ============================= */
const QC_FOCUS_AREAS = ["Security & Compliance", "SLA & Governance", "Transition", "Commercials", "ESG / Sustainability", "Innovation & Automation", "References", "Business Continuity"];
const QB_SECTIONS = ["Executive Summary", "Project Overview & Objectives", "Scope of Work", "Service Requirements", "Technical Requirements", "Service Level Agreement (SLA)", "Commercial Terms", "Evaluation Criteria", "Submission Instructions", "Terms & Conditions", "Appendices"];
function QuickRfxCreation({ db, mutate, push, rfxId, gotoTable, can }) {
  const editable = can("PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const [mode, setMode] = useState("prompt");
  const [prompt, setPrompt] = useState(rfx.title); const [context, setContext] = useState(rfx.description || "");
  const [focus, setFocus] = useState(["Security & Compliance", "SLA & Governance", "Commercials"]);
  const [questions, setQuestions] = useState(null); const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null); const [reviewed, setReviewed] = useState(false);
  const [rfxType, setRfxType] = useState(rfx.rfx_type || "RFP");
  const [uploads, setUploads] = useState([]); // {name, size, text}
  const [qReviewed, setQReviewed] = useState(false); const [qApproved, setQApproved] = useState(false);
  const fileRef = useRef(null);
  const onFiles = async (files) => { const arr = []; for (const f of Array.from(files || [])) { let text = ""; try { if (/\.(txt|md|csv|json)$/i.test(f.name) || f.type.startsWith("text/")) text = (await f.text()).slice(0, 6000); } catch (e) {} arr.push({ name: f.name, size: f.size, text }); } setUploads((u) => [...u, ...arr]); if (arr.length) push(`${arr.length} document${arr.length > 1 ? "s" : ""} attached`, arr.map((x) => x.name).join(", ")); };
  const uploadCtx = uploads.map((u) => u.text ? `
--- ${u.name} ---
${u.text}` : `
--- ${u.name} (binary; use filename and any known content as context) ---`).join("");
  useEffect(() => { setPrompt(rfx.title); setContext(rfx.description || ""); setRfxType(rfx.rfx_type || "RFP"); setQuestions(null); setQReviewed(false); setQApproved(false); }, [rfxId]);
  const genQuestions = async () => {
    if (!prompt.trim()) { push("Prompt required", "Describe what is being procured."); return; }
    setBusy(true); setErr(null);
    const typeGuide = { RFP: "an RFP (Request for Proposal): probe solution approach, delivery model, transition, governance, commercials and value", RFQ: "an RFQ (Request for Quotation): focus on unit pricing, volumes, lead times, quality/warranty, delivery terms and compliance certificates; keep technical questions short", RFI: "an RFI (Request for Information): capability, experience, market position, indicative pricing bands and roadmap; no binding commercial commitments" }[rfxType];
    const sys = `You are an expert procurement analyst drafting ${typeGuide}. Use any attached documents as primary context. Respond with ONLY a JSON array (no prose, no fences) of 8-12 objects with exactly: "section" (2-5 words), "title" (short requirement title), "text" (the question, 1-3 sentences), "priority" one of LOW/MEDIUM/HIGH, "type" one of TEXT/NUMERIC/YES_NO/CHOICE/FILE, "weight" integer percent — weights across all objects must sum to exactly 100.`;
    const msg = [`${rfxType} need: ${prompt.trim()}`, context.trim() ? `Context: ${context.trim()}` : null, focus.length ? `Focus areas: ${focus.join(", ")}.` : null, uploadCtx ? `Attached documents:${uploadCtx}` : null].filter(Boolean).join(" | ");
    try { const parsed = await callClaudeJson(sys, msg, 2500); if (!Array.isArray(parsed)) throw new Error("AI response was not a JSON array."); setQuestions(parsed); setQReviewed(false); setQApproved(false); push("Questions generated", `${parsed.length} questions ready for review.`); }
    catch (e) { setErr(e.message); push("Generation failed", e.message); } finally { setBusy(false); }
  };
  const genDoc = async () => {
    if (!prompt.trim()) { push("Title required", "Enter an RFP title."); return; }
    setBusy(true); setErr(null); setDoc(null); setReviewed(false);
    const sys = `You draft complete enterprise RFP documents. Respond with ONLY a JSON object (no prose, no fences) with: "title", "category" (2-4 words), "sections": array of exactly 11 objects in this order with these exact names: ${QB_SECTIONS.map((s) => `"${s}"`).join(", ")}. Each object has "name" and "content" (2-5 sentences of substantive draft text).`;
    try { const parsed = await callClaudeJson(sys, `${rfxType} need: ${prompt.trim()}${context.trim() ? `
Context: ${context.trim()}` : ""}${uploadCtx ? `
Attached documents:${uploadCtx}` : ""}`, 3500); if (!Array.isArray(parsed.sections)) throw new Error("AI response missing sections."); setDoc(parsed); push("RFP generated", `${parsed.sections.length} sections drafted.`); }
    catch (e) { setErr(e.message); push("Generation failed", e.message); } finally { setBusy(false); }
  };
  const addToRfx = () => {
    if (!qReviewed || !qApproved) { push("HITL gate", "Mark the set as reviewed, then a Category Manager must approve before it is written."); return; }
    const total = questions.reduce((a, x) => a + Number(x.weight || 0), 0);
    mutate((d) => { if (d.rfx_events.find((e) => e.rfx_id === rfxId)?.rfx_type !== rfxType && rfx.status === "DRAFT") d.rfx_events = d.rfx_events.map((e) => (e.rfx_id === rfxId ? { ...e, rfx_type: rfxType } : e)); uploads.forEach((u) => { const did = nextDocId(d); d.documents = [...d.documents, { document_id: did, title: `${rfxId} – AI context: ${u.name}`, document_type: "AI_CONTEXT", status: "ACTIVE", file_path: `/docs/rfx/${rfxId}/${u.name}`, file_name: u.name, file_size_bytes: u.size, created_by: "Quick RFx (AI)", created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.rfx_documents = [...d.rfx_documents, { rfx_id: rfxId, document_id: did, visibility: "INTERNAL", phase: "DRAFT", created_at: nowTs() }]; }); let id = Math.max(0, ...d.rfx_requirements.map((r) => r.requirement_id)); d.rfx_requirements = [...d.rfx_requirements.filter((r) => r.rfx_id !== rfxId), ...questions.map((x) => ({ requirement_id: ++id, rfx_id: rfxId, category: x.section, title: x.title || x.section, description: x.text, priority_level: RC_PRIO.includes(x.priority) ? x.priority : "MEDIUM", response_type: RC_TYPE_OPTIONS.includes(x.type) ? x.type : "TEXT", choices: x.type === "YES_NO" ? J(["Yes", "No"]) : null, max_points_allocated: 100, weight: total === 100 ? Number(x.weight) : Math.round(100 / questions.length), created_at: nowTs(), updated_at: nowTs() }))]; });
    push("Added to RFx", `${questions.length} AI-generated requirements replaced rfx_requirements for ${rfxId}${total !== 100 ? " (weights normalised)" : ""}.`);
  };
  const saveDoc = () => { mutate((d) => { const v = q(d, "rfx_draft_versions", "rfx_id", rfxId).length + 1; d.rfx_draft_versions = [...d.rfx_draft_versions.map((x) => (x.rfx_id === rfxId && x.approval_status !== "APPROVED" ? { ...x, approval_status: "SUPERSEDED" } : x)), { draft_id: `DRF-${String(d.rfx_draft_versions.length + 1).padStart(3, "0")}`, rfx_id: rfxId, version_number: v, template_id: "TPL-AI-QUICKBID", draft_content: `# ${doc.title}

` + doc.sections.map((s, i) => `## ${i + 1}. ${s.name}
${s.content}`).join(" | "), created_by: "Claude (Quick Bid)", reviewed_by: P(rfx.owner, {}).name, approval_status: "IN_REVIEW", approved_by: null, approved_at: null }]; }); push("Saved as draft", `Version written to rfx_draft_versions for ${rfxId} — pending Legal approval.`); };
  const updQ = (i, k, v) => setQuestions((qs) => qs.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  return (
    <div>
      <div className="qc-mode-row"><button className={`qc-mode-tab ${mode === "prompt" ? "active" : ""}`} onClick={() => setMode("prompt")}>🔄 Questionnaire from Prompt</button><button className={`qc-mode-tab ${mode === "bid" ? "active" : ""}`} onClick={() => setMode("bid")}>⚡ Quick Bid RFP Document</button></div>
      <div className="rc-breadcrumb">RFx &gt; <b>{rfxId}</b> &gt; {mode === "prompt" ? "AI Questionnaire" : "Quick Bid"}</div>
      <div className="rc-head-row"><div><h2>{mode === "prompt" ? `Create ${rfxType} Questionnaire with AI` : `Quick Bid – ${rfxType} Document`}</h2><p>Generates with a live Claude call, then writes the reviewed output into {mode === "prompt" ? <a className="mono rfp-link" onClick={() => gotoTable("rfx_requirements")}>rfx_requirements</a> : <a className="mono rfp-link" onClick={() => gotoTable("rfx_draft_versions")}>rfx_draft_versions</a>} for the working RFx.</p></div></div>
      <div className="qc-columns">
        <div className="card" style={{ padding: 20 }}>
          <div className="rfp-card-title" style={{ fontSize: 14 }}>1. Describe the need</div>
          <div className="field-row" style={{ marginBottom: 12 }}><div><label>RFx type</label><select value={rfxType} onChange={(e) => setRfxType(e.target.value)}><option>RFP</option><option>RFQ</option><option>RFI</option></select></div><div><label>Working RFx</label><input value={rfxId} readOnly style={{ background: "#f4f6f9" }} /></div></div>
          <label>{rfxType} need <span className="qc-charcount">{prompt.length}/150</span></label><textarea maxLength={150} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ marginBottom: 14 }} />
          <label>Additional context <span className="qc-charcount">{context.length}/300</span></label><textarea maxLength={300} value={context} onChange={(e) => setContext(e.target.value)} style={{ marginBottom: 14 }} />
          <label>Supporting documents (optional context)</label>
          <div className="rfp-dropzone" style={{ padding: 14 }} onClick={() => fileRef.current && fileRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}><div className="drop-main">Drop scope notes, existing RFx, spec sheets — or <span style={{ color: "var(--primary)", fontWeight: 600 }}>browse</span></div><div className="sub">TXT / MD / CSV / JSON are read into the prompt; other files are referenced by name.</div><input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} /></div>
          {uploads.map((u, i) => <div key={i} className="rfp-file-row"><span>📄</span><span className="name">{u.name}</span><span className="size">{(u.size / 1024).toFixed(0)} KB{u.text ? " · text read" : ""}</span><button className="rm" onClick={() => setUploads((x) => x.filter((_, k) => k !== i))}>✕</button></div>)}
          {mode === "prompt" && <><label style={{ marginTop: 12 }}>Focus areas</label><div className="pa-chip-group" style={{ marginBottom: 8 }}>{QC_FOCUS_AREAS.map((f) => <button type="button" key={f} className={`qc-chip ${focus.includes(f) ? "selected" : ""}`} onClick={() => setFocus((fa) => (fa.includes(f) ? fa.filter((x) => x !== f) : [...fa, f]))}>{f}</button>)}</div></>}
          <div style={{ marginTop: 20 }}><button className="btn btn-primary qc-gen-btn" disabled={busy} onClick={mode === "prompt" ? genQuestions : genDoc}>{busy ? "✨ Generating…" : mode === "prompt" ? "✨ Generate Questions" : "✨ Generate RFP"}</button><div className="qc-gen-hint">Calls the Anthropic API directly from this artifact — genuinely generated, not scripted. Review is required before anything is written (HITL-003).</div></div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="rc-table-head"><h3>2. {mode === "prompt" ? "AI Generated Questions" : "AI Generated RFP Document"}</h3>{(questions || doc) && <span className="badge open">Generated</span>}</div>
          {busy && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>⏳ Drafting…</div>}
          {err && !busy && <div className="callout warn" style={{ margin: 16 }}>⚠ {err}</div>}
          {!busy && !err && mode === "prompt" && !questions && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>Enter a prompt and click Generate.</div>}
          {!busy && mode === "prompt" && questions && <>
            <div style={{ overflowX: "auto" }}><table className="qc-q-table"><thead><tr><th>#</th><th>Section / title</th><th>Question</th><th>Type</th><th>W%</th></tr></thead><tbody>{questions.map((x, i) => <tr key={i}><td className="qc-q-num">{i + 1}</td><td style={{ minWidth: 150 }}><input className="qc-q-title-input" value={x.section} onChange={(e) => updQ(i, "section", e.target.value)} /><input className="qc-q-title-input" style={{ marginTop: 4, fontWeight: 400 }} value={x.title || ""} onChange={(e) => updQ(i, "title", e.target.value)} /></td><td style={{ minWidth: 260 }}><textarea className="qc-q-desc-textarea" value={x.text} onChange={(e) => updQ(i, "text", e.target.value)} /></td><td><select className="rc-select" value={x.type} onChange={(e) => updQ(i, "type", e.target.value)}>{RC_TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></td><td><input type="number" className="rc-section-input" style={{ width: 54 }} value={x.weight} onChange={(e) => updQ(i, "weight", e.target.value)} /></td></tr>)}</tbody></table></div>
            <div className="qc-hitl"><div className="qc-hitl-step"><span className={`n ${qReviewed ? "ok" : ""}`}>1</span><div><b>Sourcing review</b><div className="muted">Read every question; edit text, type or weight.</div></div>{qReviewed ? <span className="badge awarded">Reviewed</span> : <button className="btn btn-ghost btn-sm" disabled={!editable} onClick={() => setQReviewed(true)}>Mark reviewed</button>}</div><div className="qc-hitl-step"><span className={`n ${qApproved ? "ok" : ""}`}>2</span><div><b>Category Manager approval (HITL)</b><div className="muted">Approves the questionnaire before it is written to {rfxId}.</div></div>{qApproved ? <span className="badge awarded">Approved</span> : can("PROC_MGR", "PROC_HEAD") ? <button className="btn btn-ghost btn-sm" disabled={!qReviewed} onClick={() => setQApproved(true)}>Approve</button> : <span className="badge closing">Awaiting Category Manager</span>}</div></div>
            <div className="rc-footer-actions"><span className="muted" style={{ fontSize: 12, marginRight: "auto" }}>Weights total {questions.reduce((a, x) => a + Number(x.weight || 0), 0)}% · {rfxType}</span><button className="btn btn-ghost btn-sm" disabled={busy} onClick={genQuestions}>🔄 Regenerate</button><button className="btn btn-primary btn-sm" onClick={addToRfx} disabled={!editable || !qReviewed || !qApproved}>+ Add to {rfxId}</button></div></>}
          {!busy && mode === "bid" && !doc && !err && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>Enter a title and click Generate.</div>}
          {!busy && mode === "bid" && doc && <div style={{ padding: 16 }}>
            <div className="rfp-field-row"><span className="lbl">Title</span><span className="val">{doc.title}</span></div><div className="rfp-field-row"><span className="lbl">Category</span><span className="val">{doc.category}</span></div>
            <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 10 }}>{doc.sections.map((s, i) => <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}><div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>{i + 1}. {s.name}</div><div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>{s.content}</div></div>)}</div>
            <div className="card rfp-card" style={{ marginTop: 10, background: reviewed ? "var(--emerald-bg)" : "var(--amber-bg)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: reviewed ? "#0a6b45" : "#7a5111" }}>{reviewed ? "✓ Reviewed — ready to save as a draft version." : "⚠ Human review required before this can be saved."}</span>{!reviewed ? <button className="btn btn-ghost btn-sm" onClick={() => setReviewed(true)}>Mark Reviewed</button> : <button className="btn btn-primary btn-sm" onClick={saveDoc} disabled={!editable}>Save as draft version</button>}</div></div>
          </div>}
        </div>
      </div>
    </div>);
}

/* ============================= EVALUATION (4A–4E) ============================= */
function evalModel(db, rfxId) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const w = one(db, "rfx_weight_configs", "rfx_id", rfxId) || { commercial_weight: .35, operational_weight: .35, risk_compliance_weight: .2, esg_weight: .1 };
  const evals = q(db, "agent_evaluations", "rfx_id", rfxId).sort((a, b) => a.agent_rank - b.agent_rank);
  const top = evals.slice(0, 3).map((e, i) => ({ ...e, letter: "ABC"[i], name: supName(db, e.supplier_id), resp: db.rfx_response.find((r) => r.rfx_id === rfxId && r.supplier_id === e.supplier_id), bid: db.bid_responses.find((b) => b.rfx_id === rfxId && b.supplier_id === e.supplier_id) }));
  const reqs = q(db, "rfx_requirements", "rfx_id", rfxId);
  const answers = q(db, "rfx_response_answers", "rfx_id", rfxId);
  const qRows = reqs.map((r) => { const sc = top.map((t) => answers.find((a) => a.requirement_id === r.requirement_id && a.supplier_id === t.supplier_id)); const vals = sc.map((a) => a?.agent_calculated_score ?? 0); const best = vals.indexOf(Math.max(...vals)); return { r, vals, answers: sc, best }; });
  const totals = top.map((_, i) => +(qRows.reduce((a, x) => a + x.vals[i] * x.r.weight / 100, 0)).toFixed(1));
  const towers = (db.__meta?.towers) || [];
  const lines = top.map((t) => t.bid ? q(db, "bid_line_items", "bid_id", t.bid.bid_id) : []);
  const years = Math.max(1, Math.round((top[0]?.resp?.quoted_total_price || 1) / Math.max(1, lines[0]?.reduce((a, l) => a + l.extended_price_normalized, 0) || 1)));
  return { rfx, w, evals, top, reqs, qRows, totals, towers, lines, years, hasBids: evals.length > 0 };
}
const align = (unit, mid) => { const d = (unit - mid) / mid; return d <= 0.08 ? "low" : d <= 0.2 ? "medium" : "high"; };
function Stars({ count }) { return <span className="ea-stars">{"★".repeat(count)}<span className="empty">{"★".repeat(Math.max(0, 5 - count))}</span></span>; }
function RiskDot({ level }) { return <span className={`ea-risk-dot ${level}`}><span className="d"></span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>; }
function Dot({ level }) { return <span className={`ea-risk-dot ${level}`} style={{ fontSize: 0 }}><span className="d"></span></span>; }
const riskLevel = (v, lo, hi) => (v <= lo ? "low" : v <= hi ? "medium" : "high");
function NoBids({ rfx }) { return <div className="card placeholder-card"><div className="icon">⏳</div><h3>No evaluation yet for {rfx.rfx_id}</h3><p style={{ fontSize: 13, maxWidth: 460, margin: "8px auto 0" }}>This event is <b>{nice(rfx.status)}</b>. Agent A5 scores bids after the due date once A4 has normalised them. Switch the working RFx in the top bar to an event in evaluation or later.</p></div>; }

function QuestionnaireAnalysis({ db, push, setPage, rfxId, openRecord, gotoTable, m }) {
  const { rfx, top, qRows, totals, reqs } = m;
  const hi = Math.max(...totals), lo = Math.min(...totals), avg = +(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1);
  const bestIdx = totals.indexOf(hi); const conf = one(db, "agent_assignment_evaluations", "rfx_id", rfxId)?.confidence_score ?? 85;
  const groups = { "Technical Expertise": /Network|Cloud|Server|Delivery/, "Security & Compliance": /Security|Compliance/, "Automation & Tools": /ITSM|Automation|Innovation/, "Transition Readiness": /Transition|Continuity/, "Commercial Value": /Commercial|Value/ };
  const strengths = Object.entries(groups).map(([area, re]) => { const rows = qRows.filter((x) => re.test(x.r.title) || re.test(x.r.category)); return { area, stars: top.map((_, i) => { const v = rows.length ? rows.reduce((a, x) => a + x.vals[i], 0) / rows.length : 0; return Math.max(1, Math.min(5, Math.round(v / 20))); }) }; });
  const risks = top.map((t) => { const rp = one(db, "supplier_risk_profile", "supplier_id", t.supplier_id) || {}; const esg = one(db, "supplier_esg_compliance", "supplier_id", t.supplier_id) || {}; const sup = one(db, "supplier", "supplier_id", t.supplier_id); return { Technical: riskLevel(100 - t.operational_score, 12, 22), Delivery: riskLevel(rp.resilinc_disruption_risk || 20, 20, 35), Security: riskLevel(100 - t.risk_score, 10, 20), Compliance: esg.regulatory_violations ? "high" : sup.kyc_status === "VERIFIED" ? "low" : "medium", Transition: riskLevel(rp.interos_supply_chain_risk || 20, 20, 32) }; });
  return (
    <div>
      <div className="rc-breadcrumb">RFx &gt; <b>{rfxId}</b> &gt; Responses &gt; Questionnaire Analysis</div>
      <div className="rfp-top-row"><div><h2>RFP Questionnaire Analysis <span className="rfp-pill green" style={{ fontSize: 11, marginLeft: 8 }}>{top.length} vendors scored</span></h2></div><div className="rfp-pill-row"><span className="rfp-pill ghost" onClick={() => gotoTable("rfx_response_answers")}>⇄ Open rfx_response_answers</span></div></div>
      <div className="card ea-infobar">
        <div><div className="lbl">RFx ID</div><div className="val">{rfxId}</div></div><div><div className="lbl">Project</div><div className="val">{rfx.title}</div></div><div><div className="lbl">Responses Analyzed</div><div className="val">{reqs.length} Questions | {top.length} Vendors (top 3 of {m.evals.length})</div></div><div><div className="lbl">Evaluated</div><div className="val">{top[0]?.evaluated_at}</div></div>
        <div className="ea-conf-ring"><div className="pa-ring" style={{ width: 42, height: 42, background: `conic-gradient(var(--primary) ${conf}%, #eef1f5 ${conf}%)` }}><div className="hole" style={{ width: 30, height: 30, fontSize: 10 }}>{Math.round(conf)}%</div></div><div><div className="lbl" style={{ marginBottom: 0 }}>AI Confidence</div><div className="val" style={{ fontSize: 11 }}>{conf >= 90 ? "High" : "Good"} Reliability</div></div></div>
      </div>
      <div className="ea-layout">
        <div><div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Question-wise Scores ({reqs.length} Questions)</h3></div>
          <div style={{ overflowX: "auto" }}><table className="ea-q-table"><thead><tr><th>#</th><th>RFP Question</th><th>Weight (%)</th>{top.map((t) => <th key={t.letter}>Vendor {t.letter}<br/><span style={{ fontWeight: 400 }}>{t.name}</span></th>)}<th>Best Vendor</th></tr></thead>
            <tbody>{qRows.map((x, i) => <tr key={x.r.requirement_id} className={x.r.response_type === "NUMERIC" ? "hl" : ""}><td>{i + 1}</td><td style={{ fontWeight: 600, color: "var(--primary)" }} title={x.r.description}>{x.r.title}</td><td>{x.r.weight}%</td>{x.vals.map((v, k) => <td key={k} className={x.best === k ? "ea-score" : ""} title={x.answers[k]?.agent_answer_rationale}>{v}</td>)}<td><span className={`ea-best-badge ${x.best === 1 ? "b" : x.best === 2 ? "c" : ""}`}>{"ABC"[x.best]}</span></td></tr>)}
              <tr className="ea-total-row"><td colSpan={2} style={{ textAlign: "right" }}>Total / Overall Weighted Score</td><td>{reqs.reduce((a, r) => a + r.weight, 0)}%</td>{totals.map((t, i) => <td key={i} style={i === bestIdx ? { color: "#0a6b45" } : {}}>{t}</td>)}<td></td></tr></tbody></table></div>
          <div className="ea-scale-note"><span>ⓘ Scores are agent_calculated_score per rfx_response_answers row — hover a score for the rationale.</span><span>Scale: 0 Poor · 25 Fair · 50 Good · 75 Very Good · 100 Excellent</span></div></div></div>
        <div>
          <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>Overall Score Comparison</div>{top.map((t, i) => <div key={t.letter} className="ea-bar-row"><span className="lbl">Vendor {t.letter}</span><div className="ea-bar-track"><div className="ea-bar-fill" style={{ width: `${totals[i]}%`, background: i === bestIdx ? "var(--emerald)" : "var(--primary)" }}></div></div><span className="ea-bar-val">{totals[i]}</span></div>)}
            <div className="ea-bar-stats"><div><div className="n">{hi}</div><div className="l">Highest</div></div><div><div className="n">{lo}</div><div className="l">Lowest</div></div><div><div className="n">{avg}</div><div className="l">Average</div></div><div><div className="n">{(hi - lo).toFixed(1)}</div><div className="l">Range</div></div></div></div>
          <div className="ea-rec-card" style={{ marginBottom: 16 }}><div className="ea-rec-head">✨ Agent Recommendation · agent_evaluations</div><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span className="ea-rec-rank">1</span><div><div className="ea-rec-vendor">Vendor {top[bestIdx].letter}</div><div className="ea-rec-name">{top[bestIdx].name}</div></div></div><p className="ea-rec-text">Highest questionnaire score {hi}/100. {top[0].agent_rationale}</p><Ref t="agent_evaluations" c="evaluation_id" v={top[0].evaluation_id} openRecord={openRecord}>View evaluation record →</Ref></div>
          <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>Vendor Strength Snapshot</div><table className="ea-star-table"><thead><tr><th>Capability Area</th>{top.map((t) => <th key={t.letter}>Ven {t.letter}</th>)}</tr></thead><tbody>{strengths.map((s) => <tr key={s.area}><td>{s.area}</td>{s.stars.map((c, i) => <td key={i}><Stars count={c} /></td>)}</tr>)}</tbody></table></div>
          <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>Risk Assessment · supplier_risk_profile</div><table className="ea-risk-table"><thead><tr><th>Risk Area</th>{top.map((t) => <th key={t.letter}>Ven {t.letter}</th>)}</tr></thead><tbody>{["Technical", "Delivery", "Security", "Compliance", "Transition"].map((k) => <tr key={k}><td>{k} Risk</td>{risks.map((r, i) => <td key={i}><RiskDot level={r[k]} /></td>)}</tr>)}</tbody></table></div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}><button className="btn btn-ghost" onClick={() => setPage("supplier-discovery")}>← Previous</button></div>
    </div>);
}

function BenchmarkAnalysis({ db, push, m }) {
  const { top, towers, lines } = m;
  if (!towers.length || !lines[0]?.some((l) => l.item_code.startsWith("TWR"))) return <div className="card placeholder-card"><h3>Benchmarking applies to service-tower priced RFPs</h3><p style={{ fontSize: 13 }}>This event's bids are not structured by service tower.</p></div>;
  const rows = towers.map((t) => { const units = top.map((_, i) => lines[i].find((l) => l.item_code === t[0])?.normalized_unit_price ?? null); const lo = Math.round(t[4] * 0.8), hi = Math.round(t[4] * 1.2); const al = units.map((u) => (u == null ? "high" : align(u, t[4]))); const closest = units.map((u, i) => [Math.abs((u ?? 1e9) - t[4]), i]).sort((a, b) => a[0] - b[0]).filter((x, i, arr) => x[0] <= arr[0][0] * 1.15).map((x) => `Vendor ${top[x[1]].letter}`).join(" / "); return { t, units, lo, hi, al, closest }; });
  const fit = top.map((_, i) => rows.filter((r) => r.al[i] === "low").length);
  const bestFit = fit.indexOf(Math.max(...fit));
  return (
    <div className="card">
      <div className="ev-report-head"><div className="ev-eyebrow">Activity 04B — Benchmark Analysis Report</div><div className="ev-report-title">Pricing Benchmark & Market Alignment</div><div className="ev-report-sub">Calibrated market mid-points (USD / unit / year) versus each vendor's normalised unit rate from bid_line_items.</div></div>
      <div className="ev-section">
        <div className="ev-section-head">📊 Table 01 — Benchmark Table</div>
        <table className="ev-table"><thead><tr><th>Service Tower</th><th>Unit</th><th>Calibrated Range</th><th>Market mid</th>{top.map((t) => <th key={t.letter}>Vendor {t.letter}</th>)}<th>Closest Alignment</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.t[0]}><td style={{ fontWeight: 600 }}>{r.t[1]}</td><td>{r.t[2]} / yr</td><td>{r.lo} – {r.hi}</td><td>{r.t[4]}</td>{r.units.map((u, i) => <td key={i}>{u == null ? "—" : u.toFixed(0)}</td>)}<td style={{ color: "var(--primary)", fontWeight: 600 }}>{r.closest}</td></tr>)}</tbody></table>
        <div className="ev-section-head">📈 Summary on Benchmarking</div>
        <div className="ev-note-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>{top.map((t, i) => <div key={t.letter} className={`ev-note-card ${i === bestFit ? "win" : ""}`}><b>Vendor {t.letter} · {t.name}</b>{fit[i]} of {rows.length} towers within 8% of market mid{i === bestFit ? " — strongest market fit" : ""}.</div>)}</div>
        <div className="ev-section-head">🔲 Table 02 — Alignment Heatmap</div>
        <table className="ev-table"><thead><tr><th>Service Tower</th>{top.map((t) => <th key={t.letter}>Vendor {t.letter}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.t[0]}><td style={{ fontWeight: 600 }}>{r.t[1]}</td>{r.al.map((a, i) => <td key={i}><Dot level={a} /></td>)}</tr>)}</tbody></table>
        <div className="ev-legend-row"><span><span className="sw" style={{ background: "var(--emerald)" }}></span>Within 8% of mid</span><span><span className="sw" style={{ background: "var(--amber)" }}></span>8–20% premium</span><span><span className="sw" style={{ background: "var(--red)" }}></span>&gt;20% premium / misaligned</span></div>
        <div className="ev-section-head" style={{ marginTop: 16 }}>📶 Tower-Level Signals</div>
        <div className="ev-note-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="ev-note-card win"><b>🟢 Stable pricing</b>{rows.filter((r) => r.al.every((a) => a === "low")).map((r) => r.t[1]).join(", ") || "None"} — all vendors at market.</div>
          <div className="ev-note-card" style={{ background: "var(--amber-bg)" }}><b>🟡 Moderate variation</b>{rows.filter((r) => r.al.some((a) => a === "medium") && !r.al.some((a) => a === "high")).map((r) => r.t[1]).join(", ") || "None"}.</div>
          <div className="ev-note-card" style={{ background: "var(--red-bg)" }}><b>🔴 Premium flags</b>{rows.filter((r) => r.al.some((a) => a === "high")).map((r) => `${r.t[1]} (${r.al.map((a, i) => (a === "high" ? "Vendor " + top[i].letter : null)).filter(Boolean).join(", ")})`).join("; ") || "None"}.</div>
        </div>
      </div>
      <div className="callout info" style={{ margin: "0 20px 16px" }}><div><b style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Structured Output</b>Benchmark-calibrated unit rates feed negotiation_insights.benchmark_price for the shortlisted vendors.</div></div>
    </div>);
}

function CommercialComparison({ db, m, openRecord }) {
  const { top, towers, lines, years } = m;
  if (!lines[0]?.length) return <div className="card placeholder-card"><h3>No priced line items</h3></div>;
  const items = [...new Set(lines.flatMap((ls) => ls.map((l) => l.item_code)))];
  const rows = items.map((code) => { const per = top.map((_, i) => lines[i].find((l) => l.item_code === code)); const base = per.find(Boolean); return { code, desc: base?.description.replace(" – annual", ""), uom: base?.normalized_uom, vol: base?.normalized_quantity, per }; });
  const annual = top.map((_, i) => lines[i].reduce((a, l) => a + l.extended_price_normalized, 0));
  const tco = top.map((t) => t.resp?.quoted_total_price ?? annual[top.indexOf(t)] * years);
  const maxV = Math.max(...rows.flatMap((r) => r.per.map((p) => p?.extended_price_normalized || 0))); const maxH = Math.max(...tco);
  const lowest = tco.indexOf(Math.min(...tco));
  return (
    <div className="card">
      <div className="ev-report-head"><div className="ev-eyebrow">Activity 04C — Commercial Comparison</div><div className="ev-report-title">Commercial Comparison for {top.length} Vendors Based on Volumes</div><div className="ev-report-sub">Bid comparison from bid_line_items ({years}-year view). Normalised to USD; volumes from the pricing template.</div></div>
      <div className="ev-section">
        <div className="ev-section-head">💲 Table 01 — Line-item comparison (annual, USD)</div>
        <table className="ev-table"><thead><tr><th>Service</th><th>UoM</th><th>Volume</th>{top.map((t) => <React.Fragment key={t.letter}><th>Ven {t.letter} unit</th><th>Ven {t.letter} total</th></React.Fragment>)}</tr></thead>
          <tbody>{rows.map((r) => { const tots = r.per.map((p) => p?.extended_price_normalized ?? Infinity); const lo = tots.indexOf(Math.min(...tots)); return <tr key={r.code}><td style={{ fontWeight: 600 }}>{r.desc}</td><td>{r.uom}</td><td>{r.vol?.toLocaleString()}</td>{r.per.map((p, i) => <React.Fragment key={i}><td>{p ? p.normalized_unit_price.toFixed(0) : "—"}</td><td style={i === lo ? { fontWeight: 700, color: "#0a6b45" } : {}}>{p ? fmtFull(p.extended_price_normalized) : "—"}</td></React.Fragment>)}</tr>; })}
            <tr className="hl"><td colSpan={3} style={{ fontWeight: 800 }}>Annual total</td>{annual.map((a, i) => <React.Fragment key={i}><td></td><td style={{ fontWeight: 800 }}>{fmtFull(a)}</td></React.Fragment>)}</tr>
            <tr className="hl"><td colSpan={3} style={{ fontWeight: 800 }}>{years}-year TCO (quoted)</td>{tco.map((a, i) => <React.Fragment key={i}><td></td><td style={{ fontWeight: 800, color: i === lowest ? "#0a6b45" : "inherit" }}>{fmtFull(a)}</td></React.Fragment>)}</tr></tbody></table>
        <div className="ev-section-head">📊 Chart 01 — Annual cost by service</div>
        <div className="ev-vbar-chart">{rows.map((r) => <div key={r.code} className="ev-vbar-group"><div className="ev-vbar-labels">{r.per.map((p, i) => <div key={i} className="ev-vbar" style={{ height: `${((p?.extended_price_normalized || 0) / maxV) * 100}%`, background: ["var(--primary)", "var(--emerald)", "var(--amber)"][i] }} title={`Vendor ${top[i].letter}: ${fmtFull(p?.extended_price_normalized)}`}></div>)}</div><div className="l">{r.desc}</div></div>)}</div>
        <div className="ev-legend-row">{top.map((t, i) => <span key={t.letter}><span className="sw" style={{ background: ["var(--primary)", "var(--emerald)", "var(--amber)"][i] }}></span>Vendor {t.letter} · {t.name}</span>)}</div>
        <div className="ev-section-head">📊 Chart 02 — {years}-year TCO</div>
        {top.map((t, i) => <div key={t.letter} className="ev-hbar-row"><span className="lbl">Vendor {t.letter}</span><div className="ev-hbar-track"><div className="ev-hbar-fill" style={{ width: `${(tco[i] / maxH) * 100}%`, background: i === lowest ? "var(--emerald)" : "var(--primary)" }}></div></div><span className="val">{fmtUsd(tco[i])}</span></div>)}
        <div className="ev-note-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 12 }}>{top.map((t, i) => <div key={t.letter} className={`ev-note-card ${i === lowest ? "win" : ""}`}><b>Vendor {t.letter} · {t.name}</b>{i === lowest ? "Lowest TCO." : `${fmtUsd(tco[i] - tco[lowest])} (${(((tco[i] - tco[lowest]) / tco[lowest]) * 100).toFixed(1)}%) above lowest.`} Terms {t.resp?.payment_terms_offered}. {t.resp?.requirement_deviations}</div>)}</div>
      </div>
    </div>);
}

function FinalEvaluationTemplate({ db, m, openRecord }) {
  const { w, top, evals } = m;
  const FE = [["Commercial", "Price, TCO, payment terms", w.commercial_weight], ["Operational / Technical", "Delivery model, transition, tooling", w.operational_weight], ["Risk & Compliance", "Certifications, sanctions, resilience", w.risk_compliance_weight], ["ESG", "EcoVadis, emissions commitments", w.esg_weight]];
  return (
    <div className="card">
      <div className="ev-report-head"><div className="ev-eyebrow">Activity 04D — Final Evaluation Template</div><div className="ev-report-title">Final Evaluation Template</div><div className="ev-report-sub">Weights from rfx_weight_configs × category scores from agent_evaluations → total_weighted_score.</div></div>
      <div className="ev-section">
        <div className="ev-section-head">📐 Section 01 — Final Evaluation Framework</div>
        <table className="ev-table"><thead><tr><th>Criteria</th><th>Sub-Criteria</th><th>Weight (%)</th></tr></thead><tbody>{FE.map((f) => <tr key={f[0]}><td style={{ fontWeight: 600 }}>{f[0]}</td><td>{f[1]}</td><td>{Math.round(f[2] * 100)}%</td></tr>)}<tr className="hl"><td colSpan={2} style={{ fontWeight: 800 }}>Total</td><td style={{ fontWeight: 800 }}>{Math.round((w.commercial_weight + w.operational_weight + w.risk_compliance_weight + w.esg_weight) * 100)}%</td></tr></tbody></table>
        <div className="ev-section-head">📊 Section 02 — Vendor Scoring Model (all {evals.length} bidders)</div>
        <table className="ev-table"><thead><tr><th>Rank</th><th>Supplier</th><th>Commercial</th><th>Operational</th><th>Risk</th><th>ESG</th><th>Weighted</th><th>Rationale</th></tr></thead>
          <tbody>{evals.map((e) => <tr key={e.evaluation_id} className={e.agent_rank === 1 ? "hl" : ""}><td><span className="ev-rank-badge" style={{ background: e.agent_rank === 1 ? "var(--amber)" : e.agent_rank === 2 ? "#a3aab5" : "#c07a3d" }}>{e.agent_rank}</span></td><td style={{ fontWeight: 700 }}>{supName(db, e.supplier_id)} {top.find((t) => t.supplier_id === e.supplier_id) && <span className="muted">(Vendor {top.find((t) => t.supplier_id === e.supplier_id).letter})</span>}</td><td>{e.commercial_score}</td><td>{e.operational_score}</td><td>{e.risk_score}</td><td>{e.esg_score}</td><td style={{ fontWeight: 800 }}>{e.total_weighted_score}</td><td className="muted" style={{ fontSize: 11.5 }}>{e.agent_rationale}</td></tr>)}</tbody></table>
        <div className="ev-section-head">🧮 Section 03 — Calculation (rank 1)</div>
        {evals[0] && <div className="callout info">{evals[0].commercial_score} × {w.commercial_weight} + {evals[0].operational_score} × {w.operational_weight} + {evals[0].risk_score} × {w.risk_compliance_weight} + {evals[0].esg_score} × {w.esg_weight} = <b>{evals[0].total_weighted_score}</b></div>}
      </div>
    </div>);
}

function EvaluationDashboard({ db, mutate, push, setPage, rfxId, openRecord, m, can }) {
  const { rfx, top, evals, totals, years } = m;
  const winner = evals[0]; const wt = top[0];
  const tco = top.map((t) => t.resp?.quoted_total_price || 0);
  const assigned = q(db, "rfx_assigned_approvers", "rfx_id", rfxId); const aae = one(db, "agent_assignment_evaluations", "rfx_id", rfxId);
  const pending = assigned.filter((a) => a.current_status === "PENDING" || a.current_status === "QUEUED");
  const confirm = () => {
    mutate((d) => {
      d.rfx_assigned_approvers = d.rfx_assigned_approvers.map((a) => (a.rfx_id === rfxId ? { ...a, current_status: "APPROVED", actioned_at: nowTs(), comments: a.comments || "Ranking confirmed; proceed to negotiation." } : a));
      d.agent_assignment_evaluations = d.agent_assignment_evaluations.map((a) => (a.rfx_id === rfxId ? { ...a, evaluation_status: "CONFIRMED" } : a));
      if (rfx.status === "EVALUATION") d.rfx_events = d.rfx_events.map((e) => (e.rfx_id === rfxId ? { ...e, status: "NEGOTIATION" } : e));
      if (!d.negotiation_insights.some((n) => n.rfx_id === rfxId)) { let seq = d.negotiation_insights.length; evals.slice(0, 2).forEach((e, k) => { const price = db.rfx_response.find((r) => r.rfx_id === rfxId && r.supplier_id === e.supplier_id)?.quoted_total_price || 0; const mem = one(db, "supplier_agent_memory", "supplier_id", e.supplier_id)?.agent_notes_semantic || ""; d.negotiation_insights = [...d.negotiation_insights, { insight_id: `NI-${String(++seq).padStart(3, "0")}`, rfx_id: rfxId, supplier_id: e.supplier_id, benchmark_price: Math.round(price * 0.93 / 1000) * 1000, target_price: Math.round(price * 0.9 / 1000) * 1000, walk_away_price: Math.round(price * 0.97 / 1000) * 1000, ai_recommendation: k === 0 ? `Open at ${fmtFull(Math.round(price * 0.9 / 1000) * 1000)} citing market benchmark; trade payment terms for a further 2% and request hypercare credits. Memory: ${mem}` : "Use as competitive lever; request BAFO with transition cost absorbed. Do not exceed walk-away.", reviewed_by: "Priya Nair", approval_flag: 0, approved_by: null, approved_at: null }]; }); }
    });
    push("Ranking confirmed", `rfx_assigned_approvers actioned · negotiation_insights created for top 2 · ${rfxId} → NEGOTIATION.`);
  };
  return (
    <div>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}><div><div style={{ fontSize: 16, fontWeight: 800 }}>{rfxId} <Badge s={rfx.status} /></div><div style={{ fontSize: 12, color: "var(--muted)" }}>{rfx.title}</div></div>
          <div className="rfp-pill-row">{pending.length > 0 ? (can("PROC_MGR", "PROC_HEAD") ? <span className="rfp-pill primary" onClick={confirm}>✓ Confirm ranking (HITL-006)</span> : <span className="rfp-pill ghost">Awaiting Procurement Manager</span>) : <span className="rfp-pill green">✓ Ranking confirmed</span>}<span className="rfp-pill ghost" onClick={() => setPage("negotiation")}>🏆 Go to Negotiation →</span></div></div>
        <div className="rfp-field-row" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>{[["Category", one(db, "rfx_category", "rfx_category", rfx.rfx_category)?.category_name], ["Owner", P(rfx.owner, {}).name], ["Assigned approvers", assigned.map((a) => one(db, "approver_availability_matrix", "user_id", a.approver_user_id)?.user_email.split("@")[0]).join(", ") || "—"], ["Published", fmtDate(rfx.issue_date)], ["Closed", fmtDate(rfx.closed_date)]].map(([l, v]) => <div key={l}><div className="lbl" style={{ fontSize: 9.5, color: "var(--muted)", textTransform: "uppercase" }}>{l}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div></div>)}</div>
      </div>
      <div className="ev-kpi-row">{[["Bids received", evals.length, `${q(db, "bid_exceptions", "bid_id", -1).length} exceptions open`, "text"], ["Recommended", wt.name, `score ${winner.total_weighted_score}`, "primary"], ["Lowest TCO", fmtUsd(Math.min(...tco)), top[tco.indexOf(Math.min(...tco))].name, "emerald"], ["Spread", `${(((Math.max(...tco) - Math.min(...tco)) / Math.min(...tco)) * 100).toFixed(1)}%`, "high vs low quote", "text"], ["Agent confidence", `${Math.round(aae?.confidence_score || 0)}%`, aae?.agent_model_version, "text"]].map((k) => <div key={k[0]} className="card ev-kpi-card"><div className="lbl">{k[0]}</div><div className="val" style={{ color: k[3] === "emerald" ? "var(--emerald)" : k[3] === "primary" ? "var(--primary)" : "var(--text)", fontSize: String(k[1]).length > 8 ? 16 : undefined }}>{k[1]}</div><div className="sub">{k[2]}</div></div>)}</div>
      <div className="ev-3col">
        <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>💲 Executive Summary</div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div><div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Recommended Supplier</div><div style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)" }}>{wt.name}</div></div><div className="ev-score-ring" style={{ background: `conic-gradient(var(--primary) ${winner.total_weighted_score}%, #eef1f5 ${winner.total_weighted_score}%)`, marginLeft: "auto" }}><div className="hole">{Math.round(winner.total_weighted_score)}<span className="t">Score /100</span></div></div></div><div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>Why {wt.name}?</div><div className="rfp-insight-item"><span className="ic">✓</span>{winner.agent_rationale}</div><div className="rfp-insight-item"><span className="ic">✓</span>Questionnaire {totals[0]}/100 · ESG {winner.esg_score}</div><div className="rfp-insight-item"><span className="ic">✓</span>Risk score {winner.risk_score} · KYC {nice(one(db, "supplier", "supplier_id", wt.supplier_id).kyc_status)}</div></div>
        <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>💲 {years}-Year Cost Comparison (TCO)</div>{top.slice(1).map((t, i) => { const diff = tco[i + 1] - tco[0]; return <div key={t.letter}><div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Vendor {t.letter} ({t.name}) vs recommended</div><div style={{ fontSize: 20, fontWeight: 800, color: diff >= 0 ? "var(--emerald)" : "var(--amber)" }}>{diff >= 0 ? "+" : "−"}{fmtUsd(Math.abs(diff))}</div><div style={{ fontSize: 11, color: diff >= 0 ? "var(--emerald)" : "var(--amber)", marginBottom: 12 }}>{diff >= 0 ? "more expensive" : "cheaper"} by {((Math.abs(diff) / tco[0]) * 100).toFixed(1)}%</div></div>; })}</div>
        <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>⚖ Evaluation Scorecard (Weighted)</div><table className="ev-table" style={{ fontSize: 11 }}><thead><tr><th>Criteria</th><th>Wgt</th>{top.map((t) => <th key={t.letter}>Ven {t.letter}</th>)}</tr></thead><tbody>{[["Commercial", "commercial_weight", "commercial_score"], ["Operational", "operational_weight", "operational_score"], ["Risk", "risk_compliance_weight", "risk_score"], ["ESG", "esg_weight", "esg_score"]].map(([l, wk, sk]) => <tr key={l}><td>{l}</td><td>{Math.round(m.w[wk] * 100)}%</td>{top.map((t) => <td key={t.letter}>{t[sk]}</td>)}</tr>)}<tr className="hl"><td style={{ fontWeight: 800 }}>Overall</td><td style={{ fontWeight: 800 }}>100%</td>{top.map((t, i) => <td key={t.letter} style={{ fontWeight: 800, background: i === 0 ? "var(--emerald-bg)" : "" }}>{t.total_weighted_score}</td>)}</tr></tbody></table></div>
      </div>
      <div className="ev-3col">
        <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>🏆 Supplier Ranking</div><table className="ev-table" style={{ fontSize: 11.5 }}><thead><tr><th>Rank</th><th>Supplier</th><th>Score</th><th>Recommendation</th></tr></thead><tbody>{evals.map((e) => <tr key={e.evaluation_id}><td><span className="ev-rank-badge" style={{ background: e.agent_rank === 1 ? "var(--amber)" : e.agent_rank === 2 ? "#a3aab5" : "#c07a3d" }}>{e.agent_rank}</span></td><td style={{ fontWeight: 700 }}>{supName(db, e.supplier_id)}</td><td>{e.total_weighted_score}</td><td>{e.agent_rank === 1 ? <span className="badge awarded">Recommended</span> : e.agent_rank === 2 ? <span className="badge closed">Negotiation lever</span> : <span className="badge open">Reserve</span>}</td></tr>)}</tbody></table></div>
        <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>👥 HITL routing · rfx_assigned_approvers</div>{assigned.map((a) => <div key={a.assignment_id} className="rfp-field-row"><span className="lbl">{a.approval_sequence}. {one(db, "personas_master", "persona_id", one(db, "approver_availability_matrix", "user_id", a.approver_user_id)?.persona_id)?.persona_name}</span><span className="val"><Badge s={a.current_status} /></span></div>)}<div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{aae?.evaluation_rationale}</div></div>
        <div className="card rfp-card"><div className="rfp-card-title" style={{ fontSize: 13 }}>⚠ Open exceptions</div>{db.bid_exceptions.filter((x) => top.some((t) => t.bid?.bid_id === x.bid_id) && x.resolution_status === "OPEN").map((x) => <div key={x.bid_exceptions_id} className="rfp-insight-item"><span className="ic" style={{ background: "var(--amber-bg)", color: "var(--amber)" }}>!</span>{nice(x.exception_type)} · bid {x.bid_id}</div>)}{!db.bid_exceptions.some((x) => top.some((t) => t.bid?.bid_id === x.bid_id) && x.resolution_status === "OPEN") && <div className="muted" style={{ fontSize: 12 }}>None — all bids normalised.</div>}</div>
      </div>
    </div>);
}

function RfxEvaluationAnalysis(ctx) {
  const { db, rfxId } = ctx;
  const [tab, setTab] = useState("4a");
  const m = useMemo(() => evalModel(db, rfxId), [db, rfxId]);
  const TABS = [["4a", "4A - RFP Questionnaire Analysis"], ["4b", "4B - Benchmark Analysis"], ["4c", "4C - Commercial Comparison"], ["4d", "4D - Final Evaluation"], ["4e", "4E - Dashboard"]];
  return (
    <div>
      <div className="cc-hero"><div className="eyebrow">Activity 04 · Agent A5 — Evaluation & Scoring · agent_evaluations · rfx_response_answers · bid_line_items</div><h2>AI Ingestion, Normalization & Multi-Objective Evaluation</h2></div>
      <div className="ea-subtabs">{TABS.map(([id, l]) => <button key={id} className={`ea-subtab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{l}</button>)}</div>
      {!m.hasBids ? <NoBids rfx={m.rfx} /> : <>
        {tab === "4a" && <QuestionnaireAnalysis {...ctx} m={m} />}
        {tab === "4b" && <BenchmarkAnalysis {...ctx} m={m} />}
        {tab === "4c" && <CommercialComparison {...ctx} m={m} />}
        {tab === "4d" && <FinalEvaluationTemplate {...ctx} m={m} />}
        {tab === "4e" && <EvaluationDashboard {...ctx} m={m} />}
      </>}
    </div>);
}

/* ============================= NEGOTIATION ============================= */
function Negotiation({ db, mutate, push, setPage, rfxId, openRecord, gotoTable, can }) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const cases = q(db, "negotiation_cases", "rfx_id", rfxId).sort((a, b) => (a.case_status.startsWith("CLOSED_LOST") || a.case_status === "PARALLEL_LEVER" ? 1 : -1));
  const [sel, setSel] = useState(cases[0]?.negotiation_case_id);
  useEffect(() => setSel(q(db, "negotiation_cases", "rfx_id", rfxId)[0]?.negotiation_case_id), [rfxId]);
  const [tab, setTab] = useState("rounds");
  const [finalPrice, setFinalPrice] = useState("");
  const fin = one(db, "negotiation_finalization", "rfx_id", rfxId);
  if (!cases.length) return <div><div className="page-head"><h2 className="page-title">Negotiation</h2></div><div className="card placeholder-card"><div className="icon">🤝</div><h3>No negotiation case for {rfxId}</h3><p style={{ fontSize: 13 }}>Cases are opened once the evaluation ranking is confirmed (Activity 04 → 4E Dashboard).</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setPage("evaluation")}>Go to Evaluation</button></div></div>;
  const c = cases.find((x) => x.negotiation_case_id === sel) || cases[0]; const cid = c.negotiation_case_id;
  const ins = one(db, "negotiation_insights", "negotiation_case_id", cid) || {};
  const rounds = q(db, "negotiation_rounds", "negotiation_case_id", cid).sort((a, b) => a.round_number - b.round_number);
  const offers = q(db, "negotiation_offers", "negotiation_case_id", cid); const conc = q(db, "negotiation_concessions", "negotiation_case_id", cid); const msgs = q(db, "negotiation_message_events", "negotiation_case_id", cid).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const actions = q(db, "negotiation_actions", "negotiation_case_id", cid); const strat = q(db, "negotiation_strategy_assessments", "negotiation_case_id", cid); const tactics = q(db, "negotiation_case_tactics", "negotiation_case_id", cid).map((t) => ({ ...t, pb: one(db, "negotiation_playbook_tactics", "tactic_id", t.tactic_id) }));
  const batna = q(db, "negotiation_batna_scenarios", "negotiation_case_id", cid).sort((a, b) => b.recommendation_score - a.recommendation_score); const bench = q(db, "negotiation_market_benchmarks", "rfx_id", rfxId); const decision = c.decision_id ? one(db, "negotiation_decisions", "decision_id", c.decision_id) : null;
  const supOffers = offers.filter((o) => o.offer_party === "SUPPLIER").sort((a, b) => (a.created_at < b.created_at ? -1 : 1)); const latestSup = supOffers.slice(-1)[0]; const quote = c.opening_offer_amount; const cur = latestSup ? latestSup.total_amount : quote;
  const leverage = strat.length ? Math.round(strat.reduce((a, x) => a + (x.leverage_score || 0), 0) / strat.length) : null;
  const owner = one(db, "approver_availability_matrix", "user_id", c.case_owner_user_id);
  const approveEnvelope = () => { mutate((d) => { d.negotiation_insights = d.negotiation_insights.map((n) => (n.insight_id === ins.insight_id ? { ...n, approval_flag: 1, approved_by: "Rachel Kim", approved_at: nowTs() } : n)); d.negotiation_actions = d.negotiation_actions.map((a) => (a.negotiation_case_id === cid && a.action_type === "HITL_APPROVAL" ? { ...a, action_status: "COMPLETED", completed_at: nowTs() } : a)); }); push("Envelope approved", "Target and walk-away approved by Finance (HITL-007)."); };
  const approveTactic = (t) => { mutate((d) => { d.negotiation_case_tactics = d.negotiation_case_tactics.map((x) => (x.case_tactic_id === t.case_tactic_id ? { ...x, recommendation_status: "APPROVED", approved_by: "Priya Nair", approved_at: nowTs() } : x)); }); push("Tactic approved", t.pb?.tactic_name); };
  const openRound = () => { mutate((d) => { const n = rounds.length + 1; const rid2 = `NR-${String(d.negotiation_rounds.length + 1).padStart(3, "0")}`; const ours = Math.round(Math.max(c.target_price, cur * 0.97) / 1000) * 1000; d.negotiation_rounds = d.negotiation_rounds.map((r) => (r.negotiation_case_id === cid && r.round_status !== "CLOSED" ? { ...r, round_status: "CLOSED", closed_at: nowTs(), next_step_code: "OPEN_NEXT_ROUND" } : r)); d.negotiation_rounds = [...d.negotiation_rounds, { negotiation_round_id: rid2, negotiation_case_id: cid, round_number: n, round_type: n >= 3 ? "FINAL" : "BAFO", round_status: "AWAITING_SUPPLIER", strategy_label: n >= 3 ? "Non-price value close" : "Competitive tension + payment terms", next_step_code: "AWAIT_SUPPLIER_RESPONSE", opened_at: nowTs(), response_due_at: nowTs().slice(0, 10) + " 17:00:00", closed_at: null, created_by: "A6 Negotiation Agent", approved_by: "Priya Nair", created_at: nowTs(), updated_at: nowTs() }]; const oid = `OF-${String(d.negotiation_offers.length + 1).padStart(3, "0")}`; d.negotiation_offers = [...d.negotiation_offers, { offer_id: oid, negotiation_case_id: cid, negotiation_round_id: rid2, offer_party: "BUYER", offer_type: n >= 3 ? "FINAL_POSITION" : "BAFO_REQUEST", total_amount: ours, currency_code: "USD", pricing_basis: "TOTAL_CONTRACT", term_months: 36, offer_summary: `Round ${n}: counter at ${fmtFull(ours)}; hold non-price asks.`, source_bid_id: null, source_response_id: null, offer_status: "SENT", received_at: null, submitted_at: nowTs(), created_by: "A6 Negotiation Agent", created_at: nowTs(), updated_at: nowTs() }]; d.negotiation_message_events = [...d.negotiation_message_events, { message_event_id: `NM-${String(d.negotiation_message_events.length + 1).padStart(3, "0")}`, negotiation_case_id: cid, negotiation_round_id: rid2, direction: "OUTBOUND", channel: "PORTAL", message_type: "COUNTER_OFFER", subject: `${rfxId} – Round ${n}`, safe_summary: `Buyer counter-offer issued (${fmtFull(ours)}).`, source_document_id: null, source_offer_id: oid, sent_by_actor_type: "AGENT", sent_by_actor_id: "A6", delivery_status: "DELIVERED", sent_at: nowTs(), received_at: nowTs(), created_at: nowTs() }]; d.negotiation_cases = d.negotiation_cases.map((x) => (x.negotiation_case_id === cid ? { ...x, case_status: "IN_ROUND", updated_at: nowTs() } : x)); }); push(`Round ${rounds.length + 1} opened`, "Counter-offer sent through the portal; awaiting supplier response."); };
  const simulateResponse = () => { const open = rounds.find((r) => r.round_status !== "CLOSED"); if (!open) return; mutate((d) => { const ourOffer = d.negotiation_offers.filter((o) => o.negotiation_round_id === open.negotiation_round_id && o.offer_party === "BUYER")[0]; const amt = Math.round((cur - (cur - (ourOffer?.total_amount || c.target_price)) * 0.6) / 1000) * 1000; const oid = `OF-${String(d.negotiation_offers.length + 1).padStart(3, "0")}`; d.negotiation_offers = [...d.negotiation_offers, { offer_id: oid, negotiation_case_id: cid, negotiation_round_id: open.negotiation_round_id, offer_party: "SUPPLIER", offer_type: "REVISED", total_amount: amt, currency_code: "USD", pricing_basis: "TOTAL_CONTRACT", term_months: 36, offer_summary: `Revised offer ${fmtFull(amt)}; accepts Net 45.`, source_bid_id: null, source_response_id: null, offer_status: "RECEIVED", received_at: nowTs(), submitted_at: nowTs(), created_by: "supplier portal", created_at: nowTs(), updated_at: nowTs() }]; d.negotiation_rounds = d.negotiation_rounds.map((r) => (r.negotiation_round_id === open.negotiation_round_id ? { ...r, round_status: "CLOSED", closed_at: nowTs(), next_step_code: amt <= c.target_price ? "FINALIZE" : "OPEN_NEXT_ROUND" } : r)); d.negotiation_message_events = [...d.negotiation_message_events, { message_event_id: `NM-${String(d.negotiation_message_events.length + 1).padStart(3, "0")}`, negotiation_case_id: cid, negotiation_round_id: open.negotiation_round_id, direction: "INBOUND", channel: "PORTAL", message_type: "SUPPLIER_RESPONSE", subject: `RE: ${rfxId} – Round ${open.round_number}`, safe_summary: `Supplier revised offer received (${fmtFull(amt)}).`, source_document_id: null, source_offer_id: oid, sent_by_actor_type: "SUPPLIER", sent_by_actor_id: c.supplier_id, delivery_status: "RECEIVED", sent_at: nowTs(), received_at: nowTs(), created_at: nowTs() }]; }); push("Supplier responded", "Revised offer parsed and normalised by A4."); };
  const finalize = () => { const fp = Number(finalPrice || cur); if (!fp || fp > c.walk_away_price) { push("Check the final price", `Must be at or below walk-away (${fmtFull(c.walk_away_price)}).`); return; } mutate((d) => { const did = `ND-${String(d.negotiation_decisions.length + 1).padStart(3, "0")}`; const lastRound = d.negotiation_rounds.filter((r) => r.negotiation_case_id === cid).slice(-1)[0]; d.negotiation_decisions = [...d.negotiation_decisions, { decision_id: did, negotiation_case_id: cid, negotiation_round_id: lastRound?.negotiation_round_id || null, decision_type: "ACCEPT_FINAL_OFFER", decision_rationale: `Final offer ${fmtFull(fp)} within target band; concessions recorded.`, approved_by_user_id: "USR-105", approved_at: nowTs() }]; d.negotiation_cases = d.negotiation_cases.map((x) => (x.negotiation_case_id === cid ? { ...x, case_status: "CLOSED_WON", decision_id: did, closed_at: nowTs(), updated_at: nowTs() } : x.rfx_id === rfxId ? { ...x, case_status: "CLOSED_LOST", closed_at: nowTs() } : x)); d.negotiation_offers = d.negotiation_offers.map((o) => (o.offer_id === latestSup?.offer_id ? { ...o, offer_status: "ACCEPTED" } : o)); d.negotiation_concessions = d.negotiation_concessions.map((x) => (x.negotiation_case_id === cid ? { ...x, concession_status: "AGREED", approved_by: "Rachel Kim" } : x)); d.negotiation_finalization = [...d.negotiation_finalization, { finalization_id: `NF-${String(d.negotiation_finalization.length + 1).padStart(3, "0")}`, rfx_id: rfxId, negotiation_case_id: cid, winning_offer_id: latestSup?.offer_id || null, supplier_id: c.supplier_id, final_price: fp, savings_achieved: quote - fp, negotiation_summary: `${rounds.length} rounds. ${supName(d, c.supplier_id)} moved from ${fmtFull(quote)} to ${fmtFull(fp)} (−${(((quote - fp) / quote) * 100).toFixed(1)}%). Concessions: ${conc.map((x) => x.concession_name).join(", ")}.`, finance_approval_status: "APPROVED", procurement_approval_status: "APPROVED", approved_by: "Rachel Kim", approved_at: nowTs() }]; }); push("Negotiation finalised", `Decision recorded · ${fmtUsd(quote - fp)} saved. Proceed to Award.`); };
  const canFin = can("FINANCE"), canNeg = can("NEGOTIATION", "PROC_MGR", "PROC_HEAD");
  const Ladder = () => { const max = quote; const rows = [["Opening quote", quote, "#c9d4e3"], ["Current offer", cur, "var(--primary)"], ["Walk-away", c.walk_away_price, "var(--red)"], ["Benchmark", ins.benchmark_price, "var(--amber)"], ["Target", c.target_price, "var(--emerald)"]]; return <div className="ladder">{rows.map(([l, v, col]) => v != null && <div key={l} className="rung"><span>{l}</span><i style={{ width: `${(v / max) * 100}%`, background: col }}></i><b className="mono">{fmtFull(v)}</b></div>)}</div>; };
  const TABS = [["rounds", "Rounds & offers"], ["strategy", "Strategy & tactics"], ["concessions", "Concessions"], ["batna", "BATNA & benchmarks"], ["log", "Messages & actions"]];
  return (
    <div className="neg">
      <div className="page-head"><Eyebrow activity="Activity 05" tables={["negotiation_cases", "negotiation_rounds", "negotiation_offers", "negotiation_concessions"]} agent="Agent A6 — Negotiation" gotoTable={gotoTable} /><h2 className="page-title">Predictive Negotiation & Multi-Round Optimization</h2><p className="page-desc">Negotiation cases for <b>{rfx.title}</b>. Every round, offer, concession and tactic is recorded; Finance approves the envelope before anything is sent.</p></div>
      <div className="neg-cases">{cases.map((x) => { const so = q(db, "negotiation_offers", "negotiation_case_id", x.negotiation_case_id).filter((o) => o.offer_party === "SUPPLIER").slice(-1)[0]; return <div key={x.negotiation_case_id} className={`neg-case ${x.negotiation_case_id === cid ? "on" : ""}`} onClick={() => setSel(x.negotiation_case_id)}><div className="t"><b>{supName(db, x.supplier_id)}</b><Badge s={x.case_status.replace("CLOSED_WON", "APPROVED").replace("CLOSED_LOST", "REJECTED").replace("IN_ROUND", "IN_PROGRESS").replace("PARALLEL_LEVER", "QUEUED")}>{nice(x.case_status)}</Badge></div><div className="m mono">{x.negotiation_case_id} · {q(db, "negotiation_rounds", "negotiation_case_id", x.negotiation_case_id).length} rounds</div><div className="p">{fmtUsd(x.opening_offer_amount)} → <b>{fmtUsd(so ? so.total_amount : x.opening_offer_amount)}</b> <span className="muted">target {fmtUsd(x.target_price)}</span></div></div>; })}</div>
      <div className="neg-head card">
        <div className="neg-kpis">
          <div><div className="lbl">Opening quote</div><div className="val">{fmtUsd(quote)}</div></div><div><div className="lbl">Current offer</div><div className="val" style={{ color: "var(--primary)" }}>{fmtUsd(cur)}</div><div className="sub">−{(((quote - cur) / quote) * 100).toFixed(1)}% so far</div></div><div><div className="lbl">Target</div><div className="val" style={{ color: "var(--emerald)" }}>{fmtUsd(c.target_price)}</div><div className="sub">gap {fmtUsd(Math.max(0, cur - c.target_price))}</div></div><div><div className="lbl">Walk-away</div><div className="val" style={{ color: "var(--red)" }}>{fmtUsd(c.walk_away_price)}</div></div><div><div className="lbl">Leverage</div><div className="val">{leverage ?? "—"}<span style={{ fontSize: 12, color: "var(--muted)" }}>/100</span></div><div className="sub">{strat.length} dimensions</div></div><div><div className="lbl">Envelope</div><div className="val" style={{ fontSize: 14, marginTop: 6 }}>{ins.approval_flag ? <span className="badge awarded">Finance approved</span> : canFin ? <button className="btn btn-primary btn-sm" onClick={approveEnvelope}>Approve envelope</button> : <span className="badge closing">Awaiting Finance</span>}</div><div className="sub">owner {owner?.user_email?.split("@")[0]}</div></div>
        </div>
        <Ladder />
        {ins.ai_recommendation && <div className="rec">{ins.ai_recommendation}</div>}
      </div>
      <div className="ea-subtabs" style={{ marginTop: 14 }}>{TABS.map(([id, l]) => <button key={id} className={`ea-subtab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{l}</button>)}</div>
      {tab === "rounds" && <div className="neg-grid">
        <div>{rounds.map((r) => { const ro = offers.filter((o) => o.negotiation_round_id === r.negotiation_round_id).sort((a, b) => (a.offer_party === "BUYER" ? -1 : 1)); return <div key={r.negotiation_round_id} className={`card neg-round ${r.round_status === "CLOSED" ? "closed" : "open"}`}><div className="neg-round-h"><span className="n">R{r.round_number}</span><div><b>{r.strategy_label}</b><div className="muted">{nice(r.round_type)} · opened {fmtDate(r.opened_at)} · due {fmtDate(r.response_due_at)}</div></div><Badge s={r.round_status === "CLOSED" ? "APPROVED" : "PENDING"}>{nice(r.round_status)}</Badge></div>
          <div className="neg-offers">{ro.map((o) => <div key={o.offer_id} className={`neg-offer ${o.offer_party.toLowerCase()}`}><div className="who">{o.offer_party === "BUYER" ? "🏢 Our position" : `🏭 ${supName(db, c.supplier_id)}`} · {nice(o.offer_type)}</div><div className="amt">{fmtFull(o.total_amount)}</div><div className="sum">{o.offer_summary}</div><div className="meta mono">{o.offer_id} · {nice(o.offer_status)}{o.source_bid_id ? ` · from bid ${o.source_bid_id}` : ""}</div>{o.offer_party === "SUPPLIER" && q(db, "negotiation_offer_lines", "offer_id", o.offer_id).length > 0 && <details className="neg-lines"><summary>{q(db, "negotiation_offer_lines", "offer_id", o.offer_id).length} offer lines</summary><table><thead><tr><th>Line</th><th>Offered unit</th><th>Target unit</th><th>Qty</th><th>Lead time</th></tr></thead><tbody>{q(db, "negotiation_offer_lines", "offer_id", o.offer_id).map((l) => { const li = one(db, "bid_line_items", "biditem_id", l.rfq_line_item_id); return <tr key={l.offer_line_id}><td>{li?.description || l.rfq_line_item_id}</td><td>{Number(l.offered_unit_price).toLocaleString()}</td><td style={{ color: "var(--emerald)" }}>{Number(l.target_unit_price).toLocaleString()}</td><td>{l.offered_quantity}</td><td>{l.offered_lead_time_days} d</td></tr>; })}</tbody></table></details>}</div>)}{ro.length === 1 && <div className="neg-offer supplier pending">Awaiting supplier response{canNeg && <div style={{ marginTop: 8 }}><button className="btn btn-ghost btn-sm" onClick={simulateResponse}>Simulate supplier response (demo)</button></div>}</div>}</div></div>; })}
          {!c.case_status.startsWith("CLOSED") && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{canNeg && rounds.every((r) => r.round_status === "CLOSED") && <button className="btn btn-primary" disabled={!ins.approval_flag} onClick={openRound}>Open round {rounds.length + 1}</button>}{!ins.approval_flag && <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Finance must approve the envelope before a round can be issued.</span>}</div>}
        </div>
        <div>
          <div className="card di2-sec"><h4>Outcome</h4>{decision || (fin && fin.negotiation_case_id === cid) ? <><div className="di2-kv"><div className="k">Decision</div><div className="v">{decision ? nice(decision.decision_type) : "—"}</div><div className="k">Final price</div><div className="v"><b>{fin ? fmtFull(fin.final_price) : "—"}</b></div><div className="k">Savings</div><div className="v" style={{ color: "var(--emerald)", fontWeight: 700 }}>{fin ? fmtFull(fin.savings_achieved) : "—"}</div><div className="k">Winning offer</div><div className="v mono">{fin?.winning_offer_id || "—"}</div><div className="k">Approved</div><div className="v">{decision ? `${one(db, "approver_availability_matrix", "user_id", decision.approved_by_user_id)?.user_email.split("@")[0]} · ${decision.approved_at.slice(0, 10)}` : "—"}</div></div><p className="muted" style={{ fontSize: 12 }}>{fin?.negotiation_summary}</p><button className="btn btn-primary btn-sm" onClick={() => setPage("award")}>Continue to Award →</button></> : c.case_status === "CLOSED_LOST" ? <p className="muted" style={{ fontSize: 12.5 }}>Closed as parallel lever — {decision?.decision_rationale}</p> : <>
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Accept the latest supplier offer, or record a final negotiated figure at or below walk-away.</p>
            <label>Final price (USD)</label><input type="number" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} placeholder={String(cur)} /><div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}><button className="btn btn-ghost btn-sm" onClick={() => setFinalPrice(String(cur))}>Use current offer</button><button className="btn btn-ghost btn-sm" onClick={() => setFinalPrice(String(c.target_price))}>Use target</button><button className="btn btn-primary btn-sm" disabled={!ins.approval_flag || !(canNeg || canFin)} onClick={finalize}>Finalise & record decision</button></div></>}</div>
          <div className="card di2-sec" style={{ marginTop: 12 }}><h4>Open actions</h4>{actions.filter((a) => a.action_status !== "COMPLETED").map((a) => <div key={a.action_id} className="neg-action"><Badge s={a.priority} /><div><b>{a.action_title}</b><div className="muted">{a.action_detail}</div><div className="muted mono" style={{ fontSize: 10.5 }}>{a.owner_type === "HUMAN" ? one(db, "personas_master", "persona_id", a.owner_persona_id)?.persona_name : "Agent A6"} · due {fmtDate(a.due_at)}</div></div></div>)}{!actions.some((a) => a.action_status !== "COMPLETED") && <div className="muted" style={{ fontSize: 12 }}>All actions complete.</div>}</div>
        </div>
      </div>}
      {tab === "strategy" && <div className="neg-grid">
        <div className="card di2-sec"><h4>Strategy assessment <span className="muted" style={{ fontWeight: 400 }}>A6-strategy-v1.4</span></h4>{strat.map((x) => <div key={x.strategy_assessment_id} className="neg-strat"><div className="neg-strat-h"><b>{x.assessment_dimension}</b><span className="lev"><i style={{ width: `${x.leverage_score}%` }}></i></span><span className="mono">{x.leverage_score}</span><Badge s={x.review_status === "APPROVED" ? "APPROVED" : "PENDING"}>{nice(x.review_status)}</Badge></div><div className="pos">Our position <b>{nice(x.our_position)}</b> · Supplier <b>{nice(x.supplier_position)}</b> · confidence {x.confidence_score}%</div><p>{x.insight_text}</p><div className="recl">→ {x.recommendation_text}</div></div>)}</div>
        <div className="card di2-sec"><h4>Recommended tactics <span className="muted" style={{ fontWeight: 400 }}>playbook NEG-POL-2026.2</span></h4>{tactics.map((t) => <div key={t.case_tactic_id} className="neg-tactic"><div className="neg-strat-h"><b>{t.pb?.tactic_name}</b><span className="badge closed" style={{ background: "#eef1f6", color: "var(--muted)" }}>{nice(t.pb?.tactic_phase)}</span><Badge s={t.pb?.risk_level}>{nice(t.pb?.risk_level)} risk</Badge><Badge s={t.recommendation_status === "APPLIED" || t.recommendation_status === "APPROVED" ? "APPROVED" : t.recommendation_status === "PENDING_HITL" ? "PENDING" : "DRAFT"}>{nice(t.recommendation_status)}</Badge></div><p>{t.pb?.description}</p><div className="muted" style={{ fontSize: 12 }}><b>Why:</b> {t.recommendation_rationale} · confidence {t.confidence_score}%</div>{t.requires_hitl === 1 && t.recommendation_status === "PENDING_HITL" && (can("PROC_MGR", "PROC_HEAD") ? <button className="btn btn-primary btn-sm" style={{ marginTop: 6 }} onClick={() => approveTactic(t)}>Approve high-risk tactic (HITL)</button> : <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Requires Category Manager approval</div>)}</div>)}</div>
      </div>}
      {tab === "concessions" && <div className="card" style={{ padding: 0 }}><table><thead><tr><th>Concession</th><th>Category</th><th>Our ask</th><th>Supplier offer</th><th>Our value</th><th>Supplier value</th><th>Impact</th><th>Status</th><th>Round</th></tr></thead><tbody>{conc.map((x) => <tr key={x.concession_id}><td><b>{x.concession_name}</b></td><td>{nice(x.concession_category)}</td><td>{x.our_ask_text}</td><td>{x.supplier_offer_text || <span className="muted">—</span>}</td><td>{x.our_value_amount ? fmtUsd(x.our_value_amount) : "—"}</td><td>{x.supplier_value_amount ? fmtUsd(x.supplier_value_amount) : "—"}</td><td><Badge s={x.impact_level} /></td><td><Badge s={x.concession_status === "AGREED" ? "APPROVED" : x.concession_status === "OPEN" ? "PENDING" : "IN_REVIEW"}>{nice(x.concession_status)}</Badge></td><td className="mono">R{one(db, "negotiation_rounds", "negotiation_round_id", x.negotiation_round_id)?.round_number}</td></tr>)}</tbody></table><div className="tbl-foot">Total value of our asks {fmtUsd(conc.reduce((a, x) => a + (x.our_value_amount || 0), 0))} · secured so far {fmtUsd(conc.reduce((a, x) => a + (x.supplier_value_amount || 0), 0))}</div></div>}
      {tab === "batna" && <div className="neg-grid">
        <div className="card di2-sec"><h4>BATNA scenarios</h4>{batna.length ? batna.map((b) => <div key={b.batna_scenario_id} className="neg-batna"><div className="neg-strat-h"><b>{b.scenario_title}</b><Badge s={b.feasibility_level === "FEASIBLE" ? "APPROVED" : b.feasibility_level === "PARTIAL" ? "PENDING" : "REJECTED"}>{nice(b.feasibility_level)}</Badge><span className="mono" style={{ marginLeft: "auto" }}>score {b.recommendation_score}</span></div><p>{b.description}</p><div className="di2-kv" style={{ gridTemplateColumns: "120px 1fr" }}><div className="k">Annual cost</div><div className="v">{fmtUsd(b.annual_cost)} · {b.implementation_days} days to implement</div><div className="k">Pros</div><div className="v">{P(b.pros_json).join(" · ")}</div><div className="k">Cons</div><div className="v">{P(b.cons_json).join(" · ")}</div></div></div>) : <p className="muted" style={{ fontSize: 12.5 }}>BATNA is assessed on the primary case only.</p>}</div>
        <div className="card di2-sec"><h4>Market benchmarks</h4><table><thead><tr><th>Scope</th><th>Low</th><th>Median</th><th>High</th><th>Source</th><th>Conf.</th></tr></thead><tbody>{bench.map((b) => <tr key={b.benchmark_id}><td><b>{b.benchmark_scope}</b><div className="muted" style={{ fontSize: 10.5 }}>{b.term_months} mo · valid to {fmtDate(b.valid_to)}</div></td><td>{fmtUsd(b.range_low_amount)}</td><td><b>{fmtUsd(b.median_amount)}</b></td><td>{fmtUsd(b.range_high_amount)}</td><td style={{ fontSize: 11.5 }}>{nice(b.source_type)}<div className="muted">{b.source_reference}</div></td><td>{b.confidence_score}%</td></tr>)}</tbody></table><div className="callout info" style={{ marginTop: 10 }}>Current offer {fmtUsd(cur)} sits {cur > (bench[0]?.median_amount || 0) ? "above" : "at or below"} the total-contract benchmark median {fmtUsd(bench[0]?.median_amount)}.</div></div>
      </div>}
      {tab === "log" && <div className="neg-grid">
        <div className="card di2-sec"><h4>Message log</h4>{msgs.map((m) => <div key={m.message_event_id} className={`neg-msg ${m.direction.toLowerCase()}`}><div className="who">{m.direction === "OUTBOUND" ? "→" : "←"} {m.sent_by_actor_type === "AGENT" ? "Agent A6" : supName(db, c.supplier_id)} · {nice(m.channel)} · {m.sent_at?.slice(0, 16)}</div><b>{m.subject}</b><div className="muted">{m.safe_summary}</div><div className="mono muted" style={{ fontSize: 10.5 }}>{m.message_event_id} · {nice(m.delivery_status)}{m.source_offer_id ? ` · ${m.source_offer_id}` : ""}</div></div>)}</div>
        <div className="card di2-sec"><h4>All actions</h4><table><thead><tr><th>Action</th><th>Owner</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead><tbody>{actions.map((a) => <tr key={a.action_id}><td><b>{a.action_title}</b><div className="muted" style={{ fontSize: 11.5 }}>{a.action_detail}</div></td><td>{a.owner_type === "HUMAN" ? one(db, "personas_master", "persona_id", a.owner_persona_id)?.persona_name : "Agent A6"}</td><td><Badge s={a.priority} /></td><td>{fmtDate(a.due_at)}</td><td><Badge s={a.action_status === "COMPLETED" ? "APPROVED" : "PENDING"}>{nice(a.action_status)}</Badge></td></tr>)}</tbody></table></div>
      </div>}
    </div>);
}

/* ============================= AWARD ============================= */
const AWARD_CHAIN = [["Business Owner", "P-BIZ"], ["Finance Controller", "P-FIN"], ["Legal Counsel", "P-LEGAL"], ["CPO", "P-CPO"]];
function Award({ db, mutate, push, setPage, rfxId, openRecord, gotoTable, can }) {
  const awardRole = { "Business Owner": ["BIZ_MGR"], "Finance Controller": ["FINANCE"], "Legal Counsel": ["LEGAL"], CPO: ["PROC_HEAD"] };
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const fin = one(db, "negotiation_finalization", "rfx_id", rfxId);
  const dec = one(db, "supplier_selection_decisions", "rfx_id", rfxId);
  const apr = q(db, "rfx_approvals", "rfx_id", rfxId).sort((a, b) => a.approval_sequence - b.approval_sequence);
  const evals = q(db, "agent_evaluations", "rfx_id", rfxId).sort((a, b) => a.agent_rank - b.agent_rank);
  const ctr = one(db, "contract_intake_requests", "linked_rfx", rfxId);
  const intake = db.intake_requests.find((r) => r.linked_RFx === rfxId); const gov = intake ? one(db, "intake_strategy_governance", "request_id", intake.request_id) : null;
  if (!fin) return <div><div className="page-head"><Eyebrow activity="Activity 06" tables={["supplier_selection_decisions", "rfx_approvals", "contract_intake_requests"]} agent="Agent A7 — Award" gotoTable={gotoTable} /><h2 className="page-title">Award Recommendation & Contract Handover</h2></div><div className="card placeholder-card"><div className="icon">🏆</div><h3>No finalised negotiation for {rfxId}</h3><p style={{ fontSize: 13 }}>The award recommendation is assembled from negotiation_finalization. Finalise the negotiation first.</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setPage("negotiation")}>Go to Negotiation</button></div></div>;
  const win = evals.find((e) => e.supplier_id === fin.supplier_id) || evals[0];
  const rule = db.agent_approval_routing_rules.filter((r) => r.process_stage === "Award" && r.is_active && fin.final_price >= r.min_value_threshold && fin.final_price < r.max_value_threshold);
  const createDecision = () => {
    mutate((d) => {
      d.supplier_selection_decisions = [...d.supplier_selection_decisions, { decision_id: `DEC-${String(d.supplier_selection_decisions.length + 1).padStart(3, "0")}`, rfx_id: rfxId, shortlisted_suppliers: J(evals.slice(0, 2).map((e) => e.supplier_id)), final_selected_supplier: fin.supplier_id, selection_rationale: `Highest weighted score (${win.total_weighted_score}). Final negotiated price ${fmtFull(fin.final_price)} is ${(((rfx.budget_limit_usd - fin.final_price) / rfx.budget_limit_usd) * 100).toFixed(1)}% under approved budget. ${win.agent_rationale}`, agent_recommendation_score: win.total_weighted_score, manual_override_flag: win.agent_rank === 1 ? 0 : 1, business_approval_status: "PENDING", procurement_approval_status: "PENDING", final_approval_by: null, approval_timestamp: null, created_at: nowTs() }];
      let seq = d.rfx_approvals.length; d.rfx_approvals = [...d.rfx_approvals, ...AWARD_CHAIN.map(([role, pid], k) => { const u = d.approver_availability_matrix.find((x) => x.persona_id === pid && x.is_available); return { approval_id: `APR-${String(++seq).padStart(3, "0")}`, rfx_id: rfxId, approver_role: role, approver_name: u ? u.user_email.split("@")[0].split(".").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ") : role, approval_status: "PENDING", comments: null, approval_sequence: k + 1, approved_at: null }; })];
    });
    push("Award recommendation assembled", `supplier_selection_decisions + 4-step rfx_approvals chain created (HITL-008).`);
  };
  const approveStep = (id) => {
    mutate((d) => {
      d.rfx_approvals = d.rfx_approvals.map((a) => (a.approval_id === id ? { ...a, approval_status: "APPROVED", comments: a.comments || "Approved.", approved_at: nowTs() } : a));
      const chain = d.rfx_approvals.filter((a) => a.rfx_id === rfxId); const allOk = chain.every((a) => a.approval_status === "APPROVED");
      d.supplier_selection_decisions = d.supplier_selection_decisions.map((x) => (x.rfx_id === rfxId ? { ...x, business_approval_status: chain.find((a) => a.approver_role === "Business Owner")?.approval_status === "APPROVED" ? "APPROVED" : x.business_approval_status, procurement_approval_status: allOk ? "APPROVED" : x.procurement_approval_status, final_approval_by: allOk ? chain[chain.length - 1].approver_name : x.final_approval_by, approval_timestamp: allOk ? nowTs() : x.approval_timestamp } : x));
      if (allOk && !d.contract_intake_requests.some((c) => c.linked_rfx === rfxId)) {
        const cid = `CTR-2026-${String(d.contract_intake_requests.length + 1).padStart(3, "0")}`;
        d.rfx_events = d.rfx_events.map((e) => (e.rfx_id === rfxId ? { ...e, status: "AWARDED", closed_date: e.closed_date || TODAY, key_findings: e.key_findings || `Awarded to ${supName(d, fin.supplier_id)} at ${fmtFull(fin.final_price)}.` } : e));
        d.contract_intake_requests = [...d.contract_intake_requests, { contract_id: cid, linked_rfx: rfxId, contract_type: gov?.contract_type || "Master Services Agreement", contract_value: fin.final_price, risk_level: intake?.priority || "MEDIUM", business_owner: intake?.requestor_name || "Business Owner", intake_status: "NEW", validated_by: null, validated_at: null, created_at: nowTs() }];
        d.contract_risk_assessment = [...d.contract_risk_assessment, { risk_id: `CRA-${String(d.contract_risk_assessment.length + 1).padStart(3, "0")}`, contract_id: cid, risk_score: +(30 + (100 - win.risk_score) * 0.6).toFixed(2), compliance_flags: J(["DPA required", "Liability cap to confirm"]), legal_risk_notes: "Auto-generated from award facts; Legal review pending.", mitigation_plan: "Execute DPA; confirm liability cap; schedule sub-processors.", reviewed_by: null, approved_flag: 0, approved_by: null }];
        d.contract_approvals = [...d.contract_approvals, ...[["Legal Counsel", "Laura Bennett"], ["Finance Controller", "Rachel Kim"], ["CPO", "Michael Chen"]].map((a, k) => ({ approval_id: `CAP-${String(d.contract_approvals.length + k + 1).padStart(3, "0")}`, contract_id: cid, approver_role: a[0], approver_name: a[1], approval_status: "PENDING", comments: null, approval_sequence: k + 1, approved_at: null }))];
      }
    });
    push("Approved", "rfx_approvals updated. When the chain completes, the contract intake is created automatically (S12).");
  };
  return (
    <div>
      <div className="page-head"><Eyebrow activity="Activity 06" tables={["supplier_selection_decisions", "rfx_approvals", "contract_intake_requests"]} agent="Agent A7 — Award Recommendation" gotoTable={gotoTable} /><h2 className="page-title">Award Recommendation & Contract Handover</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
        <div className="card kpi"><div className="lbl">Recommended Supplier</div><div className="val" style={{ fontSize: 20 }}>{supName(db, fin.supplier_id)}</div><div className="sub">weighted {win.total_weighted_score}</div></div>
        <div className="card kpi"><div className="lbl">Contract Value</div><div className="val">{fmtUsd(fin.final_price)}</div><div className="sub">saved {fmtUsd(fin.savings_achieved)}</div></div>
        <div className="card kpi"><div className="lbl">Contract Type</div><div className="val" style={{ fontSize: 18 }}>{gov?.contract_type || "MSA"}</div></div>
        <div className="card kpi"><div className="lbl">Risk Level</div><div className="val" style={{ fontSize: 20 }}>{nice(intake?.priority || "MEDIUM")}</div></div>
        <div className="card kpi"><div className="lbl">Routing rule</div><div className="val" style={{ fontSize: 16 }}>{rule.map((r) => one(db, "personas_master", "persona_id", r.persona_id)?.persona_name).join(", ") || "—"}</div><div className="sub">{rule.map((r) => r.rule_id).join(", ")}</div></div>
      </div>
      {!dec ? <div className="card" style={{ padding: 20, marginBottom: 18 }}><div className="section-label">Assemble award package</div><p style={{ fontSize: 13 }}>Agent A7 reconciles eligibility (KYC {nice(one(db, "supplier", "supplier_id", fin.supplier_id).kyc_status)}, sanctions clear), attaches the evaluation and negotiation evidence, and routes to the four-step approval chain.</p>{can("PROC_MGR", "PROC_HEAD") ? <button className="btn btn-primary" onClick={createDecision}>Generate award recommendation</button> : <div className="callout info">Procurement assembles the award package.</div>}</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="card" style={{ padding: 20 }}><div className="section-label">Award Recommendation · <Ref t="supplier_selection_decisions" c="decision_id" v={dec.decision_id} openRecord={openRecord} /></div><p style={{ fontSize: 13 }}>{dec.selection_rationale}</p>
            <div className="kv" style={{ gridTemplateColumns: "150px 1fr", marginTop: 10 }}><div className="k">Shortlist</div><div className="v">{P(dec.shortlisted_suppliers).map((s) => supName(db, s)).join(" · ")}</div><div className="k">Agent score</div><div className="v">{dec.agent_recommendation_score} · override {dec.manual_override_flag ? "yes" : "no"}</div><div className="k">Business</div><div className="v"><Badge s={dec.business_approval_status} /></div><div className="k">Procurement</div><div className="v"><Badge s={dec.procurement_approval_status} /></div><div className="k">Final approval</div><div className="v">{dec.final_approval_by ? `${dec.final_approval_by} · ${dec.approval_timestamp}` : "pending"}</div></div>
            <div className="callout success" style={{ marginTop: 14 }}>Validated by the A5 evaluation model and A6 finalisation; overrides are recorded with evidence.</div></div>
          <div className="card" style={{ padding: 20 }}><div className="section-label">Approval Chain · rfx_approvals</div>
            <ol className="chain">{apr.map((a, i) => { const prevOk = i === 0 || apr[i - 1].approval_status === "APPROVED"; return <li key={a.approval_id}><div className="who">{a.approver_role}<span className="muted"> {a.approver_name}</span></div><Badge s={a.approval_status} />{a.approval_status === "PENDING" && prevOk && (can(...awardRole[a.approver_role]) ? <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => approveStep(a.approval_id)}>Approve as {a.approver_role}</button> : <span className="muted" style={{ marginLeft: 8, fontSize: 11.5 }}>awaiting {a.approver_role}</span>)}<div className="muted">{a.comments || ""} {a.approved_at || ""}</div></li>; })}</ol>
            <table style={{ marginTop: 10 }}><thead><tr><th>Supplier</th><th>Score</th></tr></thead><tbody>{evals.map((e) => <tr key={e.evaluation_id}><td>{supName(db, e.supplier_id)}{e.supplier_id === fin.supplier_id && <span className="badge awarded" style={{ marginLeft: 6 }}>Winner</span>}</td><td style={{ fontWeight: 700 }}>{e.total_weighted_score}</td></tr>)}</tbody></table></div>
        </div>)}
      <div className="card" style={{ padding: 20, marginTop: 18 }}><div className="section-label">Contract Handover (S12) · contract_intake_requests</div>
        {ctr ? <><p style={{ fontSize: 13 }}>Contract <Ref t="contract_intake_requests" c="contract_id" v={ctr.contract_id} openRecord={openRecord} /> created — {ctr.contract_type}, {fmtFull(ctr.contract_value)}, risk {nice(ctr.risk_level)}, status <Badge s={ctr.intake_status} />. Risk assessment and a 3-step contract approval chain were opened for the CLM agents.</p><button className="btn btn-primary btn-sm" onClick={() => setPage("new-contract-rollout")}>Open in New Contract Rollout →</button></> : <p style={{ fontSize: 13, color: "var(--muted)" }}>Created automatically once every approver in the chain has approved.</p>}
      </div>
    </div>);
}

/* ============================= ADMIN: WORKFLOW CONFIGURATION ============================= */
const WF_TYPES = [["Demand Intake", "Approval flow for procurement requests", "⛓", "#1462c4"], ["RFx Creation", "Approval flow for creating RFx events", "✎", "#d946ef"], ["RFx Publish", "Approval flow for publishing RFx to suppliers", "▶", "#16a34a"], ["RFx Award", "Approval flow for awarding contracts", "◎", "#f97316"], ["Contract Approval", "Approval flow for finalizing contracts", "⚙", "#7c3aed"], ["Supplier Onboarding", "Approval flow for onboarding new suppliers", "👥", "#0ea5e9"]];
const WF_COND_FIELDS = [["approved_budget", "Intake budget (USD)"], ["budget_limit_usd", "RFx budget (USD)"], ["contract_value", "Contract value (USD)"]];

// pick the workflow that applies to a record: conditional workflows first (most specific), then unconditional default
function resolveWorkflow(db, type, values) {
  const list = db.approval_workflows.filter((w) => w.workflow_type === type && w.is_active);
  const cond = list.filter((w) => w.condition_field).filter((w) => { const v = Number(values[w.condition_field] ?? 0); const t = Number(w.condition_value); return w.condition_operator === ">" ? v > t : w.condition_operator === "<" ? v < t : w.condition_operator === ">=" ? v >= t : v <= t; }).sort((a, b) => Number(b.condition_value) - Number(a.condition_value));
  return cond[0] || list.find((w) => !w.condition_field) || null;
}
const wfSteps = (db, id) => db.workflow_steps.filter((s) => s.workflow_id === id).sort((a, b) => a.step_order - b.step_order);

function WorkflowConfig({ db, mutate, push, openRecord, gotoTable, can }) {
  const editable = can("ADMIN");
  const [search, setSearch] = useState(""); const [type, setType] = useState("All Types");
  const [editing, setEditing] = useState(null); // workflow draft {wf, steps}
  const wfs = db.approval_workflows;
  const steps = (id) => wfSteps(db, id);
  const totals = { total: wfs.length, active: wfs.filter((w) => w.is_active).length, inactive: wfs.filter((w) => !w.is_active).length, steps: db.workflow_steps.length };
  const visible = wfs.filter((w) => (type === "All Types" || w.workflow_type === type) && (!search || (w.workflow_name + w.description).toLowerCase().includes(search.toLowerCase())));
  const roleName = (id) => one(db, "platform_roles", "role_id", id)?.role_name || id;
  const toggle = (w) => { if (!editable) return; mutate((d) => { d.approval_workflows = d.approval_workflows.map((x) => (x.workflow_id === w.workflow_id ? { ...x, is_active: x.is_active ? 0 : 1, updated_at: nowTs() } : x)); }); push(w.is_active ? "Workflow paused" : "Workflow activated", w.workflow_name); };
  const duplicate = (w) => { if (!editable) return; mutate((d) => { const id = `WF-${String(d.approval_workflows.length + 1).padStart(3, "0")}`; d.approval_workflows = [...d.approval_workflows, { ...w, workflow_id: id, workflow_name: `${w.workflow_name} (copy)`, is_active: 0, created_at: nowTs(), updated_at: nowTs() }]; let n = d.workflow_steps.length; d.workflow_steps = [...d.workflow_steps, ...steps(w.workflow_id).map((s) => ({ ...s, step_id: `WS-${String(++n).padStart(3, "0")}`, workflow_id: id }))]; }); push("Duplicated", `${w.workflow_name} copied as inactive.`); };
  const remove = (w) => { if (!editable) return; if (w.is_active) { push("Pause first", "Active workflows cannot be deleted."); return; } mutate((d) => { d.approval_workflows = d.approval_workflows.filter((x) => x.workflow_id !== w.workflow_id); d.workflow_steps = d.workflow_steps.filter((x) => x.workflow_id !== w.workflow_id); }); push("Deleted", w.workflow_name); };
  const startEdit = (w) => setEditing(w ? { wf: { ...w }, steps: steps(w.workflow_id).map((s) => ({ ...s })) } : { wf: { workflow_id: null, workflow_type: type === "All Types" ? "Demand Intake" : type, workflow_name: "", description: "", is_active: 0, auto_escalate_days: 2, condition_field: null, condition_operator: ">", condition_value: null }, steps: [{ step_name: "Procurement Review", approver_role_id: "PROC_MGR", approver_count: 1, is_optional: 0 }] });
  const save = () => {
    const { wf, steps: st } = editing; if (!wf.workflow_name.trim() || !st.length) { push("Name and at least one step are required"); return; }
    mutate((d) => { const id = wf.workflow_id || `WF-${String(d.approval_workflows.length + 1).padStart(3, "0")}`; const row = { ...wf, workflow_id: id, condition_value: wf.condition_field ? Number(wf.condition_value) || 0 : null, condition_operator: wf.condition_field ? wf.condition_operator : null, created_by: wf.created_by || "admin", created_at: wf.created_at || nowTs(), updated_at: nowTs() }; d.approval_workflows = wf.workflow_id ? d.approval_workflows.map((x) => (x.workflow_id === id ? row : x)) : [...d.approval_workflows, row]; let n = d.workflow_steps.length; d.workflow_steps = [...d.workflow_steps.filter((x) => x.workflow_id !== id), ...st.map((s, k) => ({ step_id: s.step_id || `WS-${String(++n).padStart(3, "0")}`, workflow_id: id, step_order: k + 1, step_name: s.step_name, approver_role_id: s.approver_role_id, approver_count: Number(s.approver_count) || 1, is_optional: s.is_optional ? 1 : 0 }))]; });
    push("Workflow saved", editing.wf.workflow_name); setEditing(null);
  };
  const upd = (k, v) => setEditing((e) => ({ ...e, wf: { ...e.wf, [k]: v } }));
  const updStep = (i, k, v) => setEditing((e) => ({ ...e, steps: e.steps.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) }));
  const condText = (w) => w.condition_field ? `${WF_COND_FIELDS.find((f) => f[0] === w.condition_field)?.[1] || w.condition_field} ${w.condition_operator} ${fmtUsd(w.condition_value)}` : null;
  const exportCsv = () => { const rows = [["workflow_id", "type", "name", "active", "escalate_days", "condition", "step_order", "step_name", "approver_role", "approvers"], ...db.workflow_steps.map((s) => { const w = one(db, "approval_workflows", "workflow_id", s.workflow_id); return [w.workflow_id, w.workflow_type, w.workflow_name, w.is_active, w.auto_escalate_days, condText(w) || "", s.step_order, s.step_name, roleName(s.approver_role_id), s.approver_count]; })]; download("workflows.csv", rows.map((r) => r.map((v) => `"${v}"`).join(",")).join(" "), "text/csv"); push("Exported", "workflows.csv"); };
  const inUse = (w) => { if (w.workflow_type !== "Demand Intake" || !w.is_active) return null; const n = db.intake_approvals.filter((a) => a.approval_status === "PENDING").length; return n; };
  return (
    <div className="wf">
      <div className="rp-head"><div><h2 className="page-title" style={{ fontSize: 26 }}>Workflow Configuration</h2><p className="page-desc">Configure approval workflows for different procurement processes.</p></div><div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost" onClick={exportCsv}>⬇ Export</button>{editable && <button className="btn btn-primary" onClick={() => startEdit(null)}>＋ Add New Workflow</button>}</div></div>
      <div className="di2-kpis">{[["Total Workflows", totals.total, "⛓", "#e8f1fb", "var(--primary)"], ["Active Workflows", totals.active, "✓", "var(--emerald-bg)", "var(--emerald)"], ["Inactive Workflows", totals.inactive, "❙❙", "#f0f2f5", "var(--muted)"], ["Total Steps", totals.steps, "👥", "#f1ebfd", "#7c3aed"]].map((k) => <div key={k[0]} className="card di2-kpi"><div><div className="lbl">{k[0]}</div><div className="val">{k[1]}</div></div><span className="ic" style={{ background: k[3], color: k[4] }}>{k[2]}</span></div>)}</div>
      <div className="card wf-filter"><input className="ex-search" placeholder="Search workflows…" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="wf-types">{["All Types", ...WF_TYPES.map((t) => t[0])].map((t) => <button key={t} className={`wf-type ${type === t ? "on" : ""}`} onClick={() => setType(t)}>{t}</button>)}</div></div>
      {WF_TYPES.filter((t) => type === "All Types" || t[0] === type).map(([t, desc, ic, color]) => { const list = visible.filter((w) => w.workflow_type === t); if (!list.length && type === "All Types" && search) return null; return (
        <div key={t} className="card wf-group">
          <div className="wf-group-h"><span className="wf-ic" style={{ background: color }}>{ic}</span><div><b>{t}</b><div className="muted">{desc}</div></div><span className="wf-count">{list.length} workflow{list.length === 1 ? "" : "s"}</span></div>
          {list.map((w) => { const st = steps(w.workflow_id); return (
            <div key={w.workflow_id} className={`wf-item ${w.is_active ? "active" : ""}`}>
              <div className="wf-item-h"><div><b>{w.workflow_name}</b> <span className={`badge ${w.is_active ? "awarded" : "closed"}`} style={!w.is_active ? { background: "#eef1f6", color: "var(--muted)" } : {}}>{w.is_active ? "Active" : "Inactive"}</span> <Ref t="approval_workflows" c="workflow_id" v={w.workflow_id} openRecord={openRecord} /></div>
                <div className="wf-actions"><button title="Edit" onClick={() => startEdit(w)} disabled={!editable}>✎</button><button title={w.is_active ? "Pause" : "Activate"} className={w.is_active ? "g" : ""} onClick={() => toggle(w)} disabled={!editable}>{w.is_active ? "❙❙" : "▶"}</button><button title="Duplicate" onClick={() => duplicate(w)} disabled={!editable}>⧉</button><button title="Delete" className="r" onClick={() => remove(w)} disabled={!editable}>🗑</button></div></div>
              <div className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>{w.description}</div>
              <div className="wf-steps">{st.map((s, i) => <React.Fragment key={s.step_id}><span className="wf-step" title={roleName(s.approver_role_id)}>{s.step_name} <span className="muted">({s.approver_count} approver{s.approver_count === 1 ? "" : "s"})</span></span>{i < st.length - 1 && <span className="wf-arrow">›</span>}</React.Fragment>)}</div>
              <div className="wf-meta">{w.auto_escalate_days ? <span>🕐 Auto-escalate after {w.auto_escalate_days} days</span> : null}<span>👥 {st.length} approval step{st.length === 1 ? "" : "s"}</span>{condText(w) && <span>⚠ 1 condition · {condText(w)}</span>}</div>
            </div>); })}
          {!list.length && <div className="muted" style={{ padding: "8px 4px", fontSize: 12.5 }}>No workflows configured for this process.</div>}
        </div>); })}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
          <h3>{editing.wf.workflow_id ? "Edit workflow" : "New workflow"}</h3>
          <div className="field-row"><div><label>Process</label><select value={editing.wf.workflow_type} onChange={(e) => upd("workflow_type", e.target.value)}>{WF_TYPES.map((t) => <option key={t[0]}>{t[0]}</option>)}</select></div><div><label>Name</label><input value={editing.wf.workflow_name} onChange={(e) => upd("workflow_name", e.target.value)} placeholder="e.g. High-Value Demand Intake Approval" /></div></div>
          <div className="field-row single"><div><label>Description</label><input value={editing.wf.description} onChange={(e) => upd("description", e.target.value)} /></div></div>
          <div className="field-row"><div><label>Auto-escalate after (days)</label><input type="number" value={editing.wf.auto_escalate_days ?? ""} onChange={(e) => upd("auto_escalate_days", Number(e.target.value))} /></div><div><label>Status</label><select value={editing.wf.is_active} onChange={(e) => upd("is_active", Number(e.target.value))}><option value={1}>Active</option><option value={0}>Inactive</option></select></div></div>
          <div className="section-label">Condition (optional)</div>
          <div className="field-row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}><div><label>Field</label><select value={editing.wf.condition_field || ""} onChange={(e) => upd("condition_field", e.target.value || null)}><option value="">None — default for this process</option>{WF_COND_FIELDS.map((f) => <option key={f[0]} value={f[0]}>{f[1]}</option>)}</select></div><div><label>Operator</label><select value={editing.wf.condition_operator || ">"} disabled={!editing.wf.condition_field} onChange={(e) => upd("condition_operator", e.target.value)}>{[">", ">=", "<", "<="].map((o) => <option key={o}>{o}</option>)}</select></div><div><label>Value (USD)</label><input type="number" disabled={!editing.wf.condition_field} value={editing.wf.condition_value ?? ""} onChange={(e) => upd("condition_value", e.target.value)} /></div></div>
          <div className="section-label">Approval steps</div>
          {editing.steps.map((s, i) => <div key={i} className="wf-edit-step"><span className="n">{i + 1}</span><input value={s.step_name} onChange={(e) => updStep(i, "step_name", e.target.value)} placeholder="Step name" /><select value={s.approver_role_id} onChange={(e) => updStep(i, "approver_role_id", e.target.value)}>{db.platform_roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}</select><input type="number" min="1" style={{ width: 64 }} value={s.approver_count} onChange={(e) => updStep(i, "approver_count", e.target.value)} /><button className="btn btn-ghost btn-sm" onClick={() => setEditing((e) => ({ ...e, steps: e.steps.filter((_, k) => k !== i) }))}>✕</button></div>)}
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing((e) => ({ ...e, steps: [...e.steps, { step_name: "", approver_role_id: "PROC_MGR", approver_count: 1, is_optional: 0 }] }))}>+ Add step</button>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save workflow</button></div>
        </div></div>)}
    </div>);
}

function ComingSoon({ id, label }) {
  const DESC = { "user-management": ["Provision users from the SAP user master, assign roles, manage delegations and deactivations.", "enterprise_user_master · platform_roles"], "agent-processing": ["Monitor agent runs, queues, confidence scores and retries across A1–A17; replay or pause an agent.", "agent_evaluations · agent_assignment_evaluations"], "template-management": ["Maintain RFx, questionnaire, invitation-email and contract templates with versioning.", "rfx_draft_versions · documents"], "audit-logs": ["Immutable trail of every agent decision and human approval with before/after values.", "human_in_loop_controls · *_approvals"], settings: ["Organisation defaults: currencies, fiscal calendar, escalation SLAs, notification channels.", "—"] };
  const [d, t] = DESC[id] || ["", ""];
  return <div><div className="rp-head"><div><h2 className="page-title" style={{ fontSize: 26 }}>{label}</h2><p className="page-desc">{d}</p></div></div><div className="card placeholder-card"><div className="icon">🚧</div><h3>Coming soon</h3><p style={{ fontSize: 13, maxWidth: 520, margin: "6px auto 0" }}>This administration module is on the roadmap. It will operate on <span className="mono">{t}</span>.</p></div></div>;
}

/* ============================= V4: AUTONOMOUS RUN (S1 → S10 → CLM) ============================= */
const S_STEPS = [
  { id: "S1", color: "#0ea5e9", icon: "💬", title: "Chat Bot", sub: "Intake Form / Policy Prechecks", desc: "AI captures intake information, validates policies, budget and compliance prechecks.", agent: "A1", page: "demand-intake" },
  { id: "S2", color: "#14b8a6", icon: "📄", title: "Normalize", sub: "Intake Form & Create Draft Scope Document", desc: "AI normalizes intake information and generates draft scope document.", agent: "A1 · A3", page: "rfx-creation-publish", hitl: "Intake approval chain (Procurement → Finance → Legal)" },
  { id: "S3", color: "#22c55e", icon: "🔍", title: "Look up Qualified", sub: "Suppliers from Supplier Discovery", desc: "AI identifies qualified & relevant suppliers using Supplier 360, and discovery.", agent: "A2", page: "supplier-discovery" },
  { id: "S4", color: "#16a34a", icon: "📊", title: "Suggest", sub: "Supplier basis Diversity, ESG, Financial Scoring", desc: "AI recommends suppliers using diversity, ESG, financial health & performance.", agent: "A2", page: "supplier-discovery", hitl: "Category Manager confirms shortlist" },
  { id: "S5", color: "#3b82f6", icon: "✈", title: "Publish RFx to", sub: "Qualified Vendors", desc: "AI publishes RFx, sends Q&A and notifications.", agent: "A3 · A8", page: "rfx-creation-publish", hitl: "Legal approves draft · Sourcing Lead publishes" },
  { id: "S6", color: "#4f6ef7", icon: "🗄", title: "Receive RFx,", sub: "Parse & Normalize", desc: "AI parses responses, extracts data & normalizes.", agent: "A4", page: "rfx-creation-publish" },
  { id: "S7", color: "#8b5cf6", icon: "📈", title: "Dynamic Pricing", sub: "Simulation", desc: "AI-driven pricing simulation using internal & external benchmarks.", agent: "A6", page: "evaluation" },
  { id: "S8", color: "#d946ef", icon: "◔", title: "Generate Multi-", sub: "Objective Scores & Award", desc: "AI scores bids across cost, quality, risk, delivery & ESG.", agent: "A5", page: "evaluation", hitl: "Category Manager confirms ranking" },
  { id: "S9", color: "#ec4899", icon: "🤝", title: "Commodity-", sub: "Driven Negotiation Targets", desc: "AI generates negotiation levers & target ranges.", agent: "A6", page: "negotiation", hitl: "Finance approves envelope" },
  { id: "S10", color: "#ef4444", icon: "📑", title: "Negotiation", sub: "Automation & Summary Report", desc: "AI conducts negotiation rounds and generates outcome summary.", agent: "A6 · A7", page: "award", hitl: "Award chain: Business → Finance → Legal → CPO" },
  { id: "CLM", color: "#f97316", icon: "📝", title: "Contract", sub: "Generation & Push (CLM)", desc: "AI generates final contract and metadata push to CLM.", agent: "A9 · A12", page: "new-contract-rollout", hitl: "Legal accepts residual risk" },
];
const ar = { pad: (n, w = 3) => String(n).padStart(w, "0"), rnd: (a, b) => a + Math.random() * (b - a), ri: (a, b) => Math.floor(a + Math.random() * (b - a + 1)), rf: (a, b, d = 2) => +(a + Math.random() * (b - a)).toFixed(d), pick: (arr) => arr[Math.floor(Math.random() * arr.length)] };
const addD = (iso, n) => addDaysIso(iso, n) || TODAY;
const nextDocId = (d) => Math.max(1000, ...d.documents.map((x) => x.document_id)) + 1;
const AUTO_NOTE = "Auto-actioned by A15 orchestrator within policy thresholds (autonomous mode) — evidence attached.";

// derive step state from the tables
function runState(db, reqId) {
  const req = one(db, "intake_requests", "request_id", reqId); if (!req) return null;
  const rfxId = req.linked_RFx; const rfx = rfxId ? one(db, "rfx_events", "rfx_id", rfxId) : null;
  const chain = q(db, "intake_approvals", "request_id", reqId);
  const sh = rfx ? q(db, "supplier_shortlisting", "rfx_id", rfxId) : [];
  const bids = rfx ? q(db, "bid_responses", "rfx_id", rfxId) : [];
  const evals = rfx ? q(db, "agent_evaluations", "rfx_id", rfxId) : [];
  const ins = rfx ? q(db, "negotiation_insights", "rfx_id", rfxId) : [];
  const fin = rfx ? one(db, "negotiation_finalization", "rfx_id", rfxId) : null;
  const dec = rfx ? one(db, "supplier_selection_decisions", "rfx_id", rfxId) : null;
  const ctr = rfx ? one(db, "contract_intake_requests", "linked_rfx", rfxId) : null;
  const done = {
    S1: ["UNDER_REVIEW", "APPROVED"].includes(req.intake_status),
    S2: req.intake_status === "APPROVED" && !!rfx && q(db, "rfx_draft_versions", "rfx_id", rfxId).length > 0,
    S3: sh.length > 0, S4: !!rfx && P(rfx.invited_suppliers).length >= 3,
    S5: !!rfx && rfx.status !== "DRAFT", S6: bids.length > 0,
    S7: !!rfx && !!rfx.key_findings && /pricing simulation/i.test(rfx.key_findings),
    S8: evals.length > 0 && q(db, "rfx_assigned_approvers", "rfx_id", rfxId).every((a) => a.current_status === "APPROVED"),
    S9: ins.length > 0 && ins.every((n) => n.approval_flag), S10: !!fin && !!dec && dec.procurement_approval_status === "APPROVED", CLM: !!ctr && q(db, "contract_documents", "contract_id", ctr.contract_id).length > 0,
  };
  const partial = { S2: chain.some((a) => a.approval_status === "APPROVED") || !!rfx, S5: rfx && q(db, "rfx_draft_versions", "rfx_id", rfxId).some((v) => v.approval_status === "APPROVED"), S8: evals.length > 0, S9: ins.length > 0, S10: !!fin, CLM: !!ctr };
  const next = S_STEPS.findIndex((s) => !done[s.id]);
  return { req, rfx, rfxId, chain, sh, bids, evals, ins, fin, dec, ctr, done, partial, next };
}

// run one step: mutates db, returns a summary line
function runStep(d, st, reqId, user, autonomous) {
  const req = one(d, "intake_requests", "request_id", reqId); const gov = one(d, "intake_strategy_governance", "request_id", reqId) || {}; const ct = one(d, "intake_commercials_timelines", "request_id", reqId) || {}; const sc = one(d, "intake_scope_specs", "request_id", reqId) || {}; const w = one(d, "intake_evaluation_weights", "request_id", reqId) || {};
  const rfxId = () => one(d, "intake_requests", "request_id", reqId).linked_RFx; const rfx = () => one(d, "rfx_events", "rfx_id", rfxId());
  const setRfx = (patch) => { d.rfx_events = d.rfx_events.map((e) => (e.rfx_id === rfxId() ? { ...e, ...patch } : e)); };
  const budget = ct.approved_budget || 500000; const years = gov.duration_years || 3;
  const who = `${user.NAME_FIRST} ${user.NAME_LAST}`;
  if (st.id === "S1") { if (req.intake_status === "DRAFT") { d.intake_requests = d.intake_requests.map((r) => (r.request_id === reqId ? { ...r, intake_status: "UNDER_REVIEW" } : r)); d.intake_approvals = [...d.intake_approvals.filter((a) => a.request_id !== reqId), ...buildIntakeChain(d, reqId)]; } return `Policy pre-checks passed: threshold ${fmtUsd(budget)} · category ${req.category} · no duplicate request · compliance scan clear.`; }
  if (st.id === "S2") {
    // approval chain (HITL) — autonomous mode auto-actions with evidence
    const chain = d.intake_approvals.filter((a) => a.request_id === reqId).sort((a, b) => a.approval_sequence - b.approval_sequence);
    if (chain.some((a) => a.approval_status !== "APPROVED")) { if (!autonomous) return null; d.intake_approvals = d.intake_approvals.map((a) => (a.request_id === reqId ? { ...a, approval_status: "APPROVED", comments: a.comments || AUTO_NOTE, approved_at: a.approved_at || nowTs() } : a)); }
    if (!rfxId()) {
      const rid = `${gov.sourcing_approach || "RFP"}-2026-${reqId.split("-").slice(2).join("-")}`; const cat = d.rfx_category.find((c) => c.category_name === req.category)?.rfx_category || "CAT-PRO"; const owner = d.enterprise_user_master.find((u) => u.PLATFORM_ROLE === "PROC_MGR");
      d.rfx_events = [{ rfx_id: rid, title: req.requirement_description.slice(0, 80).replace(/\.$/, ""), rfx_type: gov.sourcing_approach || "RFP", rfx_category: cat, status: "DRAFT", issue_date: null, due_date: addD(TODAY, 28), closed_date: null, owner: J({ name: `${owner.NAME_FIRST} ${owner.NAME_LAST}`, role: "Category Manager", email: owner.SMTP_ADDR }), description: req.requirement_description, scope: sc.scope_description || null, invited_suppliers: "[]", responses_received: 0, key_findings: null, attachments: "[]", budget_limit_usd: budget, created_at: nowTs() }, ...d.rfx_events];
      d.rfx_weight_configs = [...d.rfx_weight_configs, { rfx_id: rid, commercial_weight: (w.commercial_weight || 40) / 100, operational_weight: (w.technical_weight || 40) / 100, risk_compliance_weight: Math.max(0, ((w.compliance_weight || 20) - 10)) / 100, esg_weight: 0.1, completeness_score: 94.5, consistency_score: 92, complaince_score: 98, readability_score: 90, overall_quality_score: 93.6, status: "APPROVED", issues: "[]", warnings: "[]", created_at: nowTs(), updated_at: nowTs() }];
      d.intake_requests = d.intake_requests.map((r) => (r.request_id === reqId ? { ...r, intake_status: "APPROVED", linked_RFx: rid } : r)); d.intake_commercials_timelines = d.intake_commercials_timelines.map((x) => (x.request_id === reqId ? { ...x, linked_RFx: rid } : x));
      let id = Math.max(0, ...d.rfx_requirements.map((r) => r.requirement_id)); const goods = /Goods/.test(req.request_type);
      const REQS = goods ? [["Commercial", "Unit pricing & total cost", "Provide unit price, volume discounts and total contract value.", "HIGH", "NUMERIC", 30], ["Technical", "Product specification compliance", "Confirm compliance with the technical specification and standards.", "HIGH", "YES_NO", 20], ["Delivery", "Lead time & delivery plan", "Provide lead times and phased delivery plan per site.", "HIGH", "TEXT", 15], ["Quality", "Warranty & after-sales support", "Describe warranty terms and support coverage.", "MEDIUM", "TEXT", 10], ["Compliance", "Certifications", "Provide ISO / CE / safety certifications.", "HIGH", "FILE", 10], ["ESG", "Sustainability", "Provide EcoVadis score and emissions data for the product line.", "MEDIUM", "TEXT", 10], ["References", "Customer references", "Provide three comparable deployments.", "LOW", "FILE", 5]] : [["Commercial", "Total contract value", "Provide total price for full term including transition.", "HIGH", "NUMERIC", 30], ["Technical", "Service delivery model", "Describe delivery model, tooling and governance.", "HIGH", "TEXT", 20], ["Technical", "Transition plan", "Provide transition plan with milestones.", "HIGH", "TEXT", 15], ["Compliance", "Security certifications", "Confirm ISO 27001 / SOC 2 coverage.", "HIGH", "YES_NO", 10], ["Operational", "SLA & governance", "Describe SLA model, reporting and escalation.", "MEDIUM", "TEXT", 10], ["ESG", "Sustainability commitments", "Provide EcoVadis score and reduction targets.", "MEDIUM", "TEXT", 10], ["References", "Customer references", "Provide three similar engagements.", "LOW", "FILE", 5]];
      d.rfx_requirements = [...d.rfx_requirements, ...REQS.map((r) => ({ requirement_id: ++id, rfx_id: rid, category: r[0], title: r[1], description: r[2], priority_level: r[3], response_type: r[4], choices: r[4] === "YES_NO" ? J(["Yes", "No"]) : null, max_points_allocated: 100, weight: r[5], created_at: nowTs(), updated_at: nowTs() }))];
      const content = `# ${req.requirement_description}

## 1. Introduction
Leona invites proposals for ${req.requirement_description}

## 2. Scope
${sc.scope_description || "—"}

## 3. Deliverables
${sc.deliverables || "—"}

## 4. Geography
${P(sc.geography_coverage).join(", ") || "—"}

## 5. Commercial terms
${ct.currency || "USD"} · ${gov.contract_type || "MSA"} · ${years} year(s)

## 6. ESG
${gov.esg_requirement || ""}

_Draft scope document generated by A3 from the normalized intake._`;
      d.rfx_draft_versions = [...d.rfx_draft_versions, { draft_id: `DRF-${ar.pad(d.rfx_draft_versions.length + 1)}`, rfx_id: rid, version_number: 1, template_id: goods ? "TPL-RFQ-STD-02" : "TPL-RFP-SVC-04", draft_content: content, created_by: "A3 RFx Builder Agent", reviewed_by: `${owner.NAME_FIRST} ${owner.NAME_LAST}`, approval_status: "IN_REVIEW", approved_by: null, approved_at: null }];
      const did = nextDocId(d); d.documents = [...d.documents, { document_id: did, title: `${rid} – Draft Scope Document`, document_type: "SCOPE_DRAFT", status: "ACTIVE", file_path: `/docs/rfx/${rid}/scope_draft.docx`, file_name: `${rid}_scope_draft.docx`, file_size_bytes: 512000, created_by: "A3 RFx Builder Agent", created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.rfx_documents = [...d.rfx_documents, { rfx_id: rid, document_id: did, visibility: "INTERNAL", phase: "DRAFT", created_at: nowTs() }];
    }
    return `Intake normalized → ${rfxId()} created as DRAFT with ${q(d, "rfx_requirements", "rfx_id", rfxId()).length} requirements and a draft scope document (rfx_draft_versions v1).`;
  }
  const R = rfx(); if (!R) return null; const rid = R.rfx_id;
  if (st.id === "S3") {
    const vm = Object.fromEntries(d.vendor_master.map((v) => [v.supplier_id, v]));
    const pool = d.supplier.filter((s) => { const v = vm[s.supplier_id]; return v && (v.rfx_category === R.rfx_category || (["CAT-SW", "CAT-CLOUD", "CAT-HW"].includes(R.rfx_category) && v.rfx_category === "CAT-ITS")) && s.esg_score != null; });
    const scored = pool.map((s) => { const v = vm[s.supplier_id]; const en = one(d, "supplier_external_enrichment", "supplier_id", s.supplier_id) || {}; const rp = one(d, "supplier_risk_profile", "supplier_id", s.supplier_id) || {}; const score = v?.composite_score ?? +(0.3 * (en.db_credit_score || 60) + 0.25 * s.esg_score + 0.25 * (100 - (rp.interos_geopolitical_risk || 30)) + 0.2 * 75).toFixed(2); return { s, score }; }).sort((a, b) => b.score - a.score).slice(0, 12);
    let seq = d.supplier_shortlisting.length; d.supplier_shortlisting = [...d.supplier_shortlisting.filter((x) => x.rfx_id !== rid), ...scored.map((x) => ({ shortlist_id: `SHL-${ar.pad(++seq)}`, rfx_id: rid, supplier_id: x.s.supplier_id, agent_score: x.score, shortlist_flag: 0, manual_override_flag: 0, override_reason: null, validated_by: null, validated_at: null }))];
    return `Supplier 360 scan: ${pool.length} qualified vendors in ${one(d, "rfx_category", "rfx_category", R.rfx_category)?.category_name}; top ${scored.length} ranked into supplier_shortlisting.`;
  }
  if (st.id === "S4") {
    const list = q(d, "supplier_shortlisting", "rfx_id", rid).sort((a, b) => b.agent_score - a.agent_score); const top = list.slice(0, 5);
    d.supplier_shortlisting = d.supplier_shortlisting.map((x) => (x.rfx_id === rid ? { ...x, shortlist_flag: top.some((t) => t.shortlist_id === x.shortlist_id) ? 1 : 0, validated_by: autonomous ? "A15 (delegated)" : who, validated_at: nowTs() } : x)); setRfx({ invited_suppliers: J(top.map((t) => t.supplier_id)) });
    return `Recommended ${top.length} suppliers (diversity · ESG · financial health · performance): ${top.map((t) => supName(d, t.supplier_id)).join(", ")}. ${autonomous ? AUTO_NOTE : `Shortlist confirmed by ${who}.`}`;
  }
  if (st.id === "S5") {
    d.rfx_draft_versions = d.rfx_draft_versions.map((v) => (v.rfx_id === rid && v.approval_status === "IN_REVIEW" ? { ...v, approval_status: "APPROVED", approved_by: autonomous ? "Laura Bennett (auto)" : who, approved_at: nowTs() } : v));
    setRfx({ status: "OPEN", issue_date: TODAY }); const invited = P(rfx().invited_suppliers);
    const did = nextDocId(d); d.documents = [...d.documents, { document_id: did, title: `${rid} – ${R.rfx_type} Document`, document_type: R.rfx_type, status: "ACTIVE", file_path: `/docs/rfx/${rid}/${rid}_rfp.pdf`, file_name: `${rid}_rfp.pdf`, file_size_bytes: 1200000, created_by: "A3 RFx Builder Agent", created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.rfx_documents = [...d.rfx_documents, { rfx_id: rid, document_id: did, visibility: "SUPPLIER", phase: "ISSUE", created_at: nowTs() }];
    const qid = `Q-${ar.pad(d.rfx_questions.length + 1)}`; d.rfx_questions = [...d.rfx_questions, { question_id: qid, rfx_id: rid, supplier_id: invited[0], section_reference: "Section 2 – Scope", question_text: "Can you confirm the phased delivery schedule per site and whether partial shipments are acceptable?", is_private: 0, submission_status: "ANSWERED", submitted_by: `bids@${supName(d, invited[0]).toLowerCase().replace(/\s+/g, "")}.example`, submitted_at: nowTs() }]; d.rfx_question_responses = [...d.rfx_question_responses, { response_id: `QR-${ar.pad(d.rfx_question_responses.length + 1)}`, question_id: qid, response_text: "Yes — delivery is phased per site as per Annex C; partial shipments are acceptable with 5 days' notice.", internal_notes: null, response_status: "PUBLISHED", answered_by: "A8 Q&A Agent", approved_by: P(R.owner, {}).name, published_at: nowTs(), created_at: nowTs(), updated_at: nowTs() }];
    return `Published ${rid} to ${invited.length} qualified vendors · invitation + ${R.rfx_type} document sent · Q&A opened (1 question answered by A8).`;
  }
  if (st.id === "S6") {
    const invited = P(R.invited_suppliers); const reqs = q(d, "rfx_requirements", "rfx_id", rid); const goods = /RFQ/.test(R.rfx_type) || /Goods/.test(req.request_type);
    let bidId = Math.max(5000, ...d.bid_responses.map((b) => b.bid_id)); let biSeq = Math.max(0, ...d.bid_line_items.map((b) => b.biditem_id)); let respSeq = Math.max(0, ...d.rfx_response.map((r) => r.response_id)); let ansSeq = Math.max(0, ...d.rfx_response_answers.map((a) => a.answer_id)); let exSeq = Math.max(0, ...d.bid_exceptions.map((x) => x.bid_exceptions_id));
    invited.forEach((sid, k) => { const s = one(d, "supplier", "supplier_id", sid); const factor = 0.84 + k * 0.035 + ar.rnd(-0.02, 0.02); const price = Math.round(budget * factor / 1000) * 1000; const channel = k === 2 ? "EMAIL" : "PORTAL"; const id = ++bidId; const status = channel === "EMAIL" ? "EXCEPTION_REVIEW" : "NORMALIZED";
      d.bid_responses = [...d.bid_responses, { bid_id: id, external_bid_uuid: `b${ar.pad(id, 7)}-auto-${ar.pad(k, 4)}`, rfx_id: rid, supplier_id: sid, submission_date: nowTs(), source_channel: channel, version_number: 1, status, confidence_score: channel === "EMAIL" ? ar.rf(80, 92) : ar.rf(94, 99.5), raw_payload: J({ supplier: s.name, total: price, currency: "USD", term_years: years }), created_at: nowTs(), updated_at: nowTs() }];
      const lines = goods ? [["ITEM-UNIT", req.requirement_description.replace(/^Procurement of /i, "").split(" to ")[0], 1, "LOT", price * 0.86], ["ITEM-DLV", "Delivery & installation", 1, "LOT", price * 0.09], ["ITEM-WTY", "Extended warranty & support", 1, "LOT", price * 0.05]] : [["SVC-DEL", "Service delivery – monthly", years * 12, "MONTH", price * 0.8 / (years * 12)], ["SVC-TRN", "Transition (one-off)", 1, "LOT", price * 0.08], ["SVC-TOOL", "Tooling – monthly", years * 12, "MONTH", price * 0.12 / (years * 12)]];
      lines.forEach((l, li) => { const rawCur = channel === "EMAIL" && li === 0 ? "EUR" : "USD"; const fx = rawCur === "EUR" ? 1.085 : 1; const unit = +(l[4] / fx).toFixed(2); d.bid_line_items = [...d.bid_line_items, { biditem_id: ++biSeq, bid_id: id, question_id: null, item_code: l[0], description: l[1], raw_quantity: String(l[2]), normalized_quantity: l[2], raw_uom: l[3], normalized_uom: l[3], raw_unit_price: `${rawCur === "EUR" ? "€" : "$"}${unit.toLocaleString()}`, normalized_unit_price: +(unit * fx).toFixed(2), raw_currency: rawCur, normalized_currency: "USD", exchange_rate: fx, extended_price_normalized: +(unit * fx * l[2]).toFixed(2), lead_time_days: ar.ri(20, 60), compliance_flag: 1 }]; });
      if (channel === "EMAIL") d.bid_exceptions = [...d.bid_exceptions, { bid_exceptions_id: ++exSeq, bid_id: id, exception_type: "CURRENCY_MISMATCH", field_name: "raw_currency", raw_value: "EUR", severity: "MEDIUM", resolution_status: autonomous ? "RESOLVED" : "OPEN", resolved_by: autonomous ? "A4 (FX normalized)" : null, resolved_at: autonomous ? nowTs() : null }];
      if (autonomous) d.bid_responses = d.bid_responses.map((b) => (b.bid_id === id ? { ...b, status: "NORMALIZED" } : b));
      d.rfx_response = [...d.rfx_response, { response_id: ++respSeq, rfx_id: rid, supplier_id: sid, quoted_total_price: price, quoted_delivery_days: ar.ri(30, 90), payment_terms_offered: s.payment_terms_baseline, requirement_deviations: k === 0 ? "None." : ar.pick(["Liability cap proposed at 12 months fees.", "Requests currency indexation clause.", "None."]), extended_bid_details: J({ transition_weeks: ar.ri(4, 8), team_size: ar.ri(20, 120) }), submitted_at: nowTs() }];
      const quality = 55 + (s.esg_score || 70) * 0.45 - k * 3;
      reqs.forEach((r) => { const sc2 = r.response_type === "NUMERIC" ? +Math.min(100, 100 - (factor - 0.8) * 220).toFixed(2) : +Math.min(100, Math.max(45, quality + ar.rnd(-6, 6))).toFixed(2); d.rfx_response_answers = [...d.rfx_response_answers, { answer_id: ++ansSeq, rfx_id: rid, supplier_id: sid, requirement_id: r.requirement_id, vendor_answer_text: r.response_type === "NUMERIC" ? `USD ${price.toLocaleString()}` : r.response_type === "YES_NO" ? "Yes" : r.response_type === "FILE" ? `See ${rid}_${sid}_attachment.pdf` : `${s.name} confirms ${r.title.toLowerCase()} with a dedicated delivery team and monthly governance.`, agent_calculated_score: sc2, agent_answer_rationale: sc2 > 85 ? "Complete and evidenced." : sc2 > 70 ? "Adequate; lacks quantified commitments." : "Partial response." }]; });
    });
    setRfx({ status: "EVALUATION", closed_date: TODAY, responses_received: invited.length });
    return `${invited.length} bids received (portal/email) · parsed, FX-normalized to USD · ${invited.length * reqs.length} requirement answers extracted · 1 currency exception ${autonomous ? "auto-resolved" : "raised"}.`;
  }
  if (st.id === "S7") {
    const resp = q(d, "rfx_response", "rfx_id", rid); const lo = Math.min(...resp.map((r) => r.quoted_total_price)), hi = Math.max(...resp.map((r) => r.quoted_total_price)); const bench = Math.round(lo * 0.94 / 1000) * 1000; const target = Math.round(lo * 0.9 / 1000) * 1000;
    setRfx({ key_findings: `Dynamic pricing simulation (A6): quotes ${fmtUsd(lo)}–${fmtUsd(hi)} vs internal benchmark ${fmtUsd(bench)}; 3 scenarios modelled (volume commit, term extension, payment terms) → achievable target ${fmtUsd(target)} (−${((1 - target / lo) * 100).toFixed(1)}% on best quote).` });
    return `Simulated 3 pricing scenarios against internal & external benchmarks: best quote ${fmtUsd(lo)} · benchmark ${fmtUsd(bench)} · achievable target ${fmtUsd(target)}.`;
  }
  if (st.id === "S8") {
    const wc = one(d, "rfx_weight_configs", "rfx_id", rid); const resp = q(d, "rfx_response", "rfx_id", rid); const minP = Math.min(...resp.map((r) => r.quoted_total_price)); const reqs = q(d, "rfx_requirements", "rfx_id", rid);
    const evals = resp.map((r) => { const ans = d.rfx_response_answers.filter((a) => a.rfx_id === rid && a.supplier_id === r.supplier_id); const op = ans.filter((a) => { const rq = reqs.find((x) => x.requirement_id === a.requirement_id); return rq && /Technical|Operational|Delivery|Quality/.test(rq.category); }); const rk = ans.filter((a) => { const rq = reqs.find((x) => x.requirement_id === a.requirement_id); return rq && /Compliance/.test(rq.category); }); const avg = (arr) => +(arr.reduce((s, a) => s + a.agent_calculated_score, 0) / Math.max(1, arr.length)).toFixed(2); const commercial = +((minP / r.quoted_total_price) * 100).toFixed(2); const operational = avg(op), risk = avg(rk), esg = one(d, "supplier", "supplier_id", r.supplier_id)?.esg_score || 70; const total = +(commercial * wc.commercial_weight + operational * wc.operational_weight + risk * wc.risk_compliance_weight + esg * wc.esg_weight).toFixed(2); return { sid: r.supplier_id, commercial, operational, risk, esg, total }; }).sort((a, b) => b.total - a.total);
    let evSeq = Math.max(0, ...d.agent_evaluations.map((e) => e.evaluation_id)); d.agent_evaluations = [...d.agent_evaluations.filter((e) => e.rfx_id !== rid), ...evals.map((e, i) => ({ evaluation_id: ++evSeq, rfx_id: rid, supplier_id: e.sid, commercial_score: e.commercial, operational_score: e.operational, risk_score: e.risk, esg_score: e.esg, total_weighted_score: e.total, agent_rank: i + 1, agent_rationale: i === 0 ? "Best weighted outcome across cost, quality, risk, delivery and ESG." : i === 1 ? "Strong commercial position; secondary on delivery evidence — negotiation lever." : "Competitive on ESG; commercial gap reduces ranking.", evaluated_at: nowTs() }))];
    const aae = `AAE-${ar.pad(d.agent_assignment_evaluations.length + 1)}`; d.agent_assignment_evaluations = [...d.agent_assignment_evaluations, { evaluation_id: aae, rfx_id: rid, agent_model_version: "A5-eval-v2.3.1", evaluation_rationale: `Routed to Category Manager for ${fmtUsd(budget)} · ${req.priority} priority.`, confidence_score: ar.rf(88, 96), evaluation_status: autonomous ? "CONFIRMED" : "PENDING_HITL", created_at: nowTs() }];
    const approver = d.enterprise_user_master.find((u) => u.PLATFORM_ROLE === "PROC_MGR"); const uid = d.approver_availability_matrix.find((a) => a.persona_id === "P-CATMGR")?.user_id || "USR-101";
    d.rfx_assigned_approvers = [...d.rfx_assigned_approvers, { assignment_id: `ASG-${ar.pad(d.rfx_assigned_approvers.length + 1)}`, rfx_id: rid, approver_user_id: uid, evaluation_id: aae, approval_sequence: 1, current_status: autonomous ? "APPROVED" : "PENDING", assigned_at: nowTs(), actioned_at: autonomous ? nowTs() : null, comments: autonomous ? AUTO_NOTE : null }];
    return `Scored ${evals.length} bids on cost / quality / risk / delivery / ESG → rank 1 ${supName(d, evals[0].sid)} (${evals[0].total}); award recommendation drafted${autonomous ? " and ranking confirmed" : " — awaiting Category Manager"}.`;
  }
  if (st.id === "S9") {
    const evals = q(d, "agent_evaluations", "rfx_id", rid).sort((a, b) => a.agent_rank - b.agent_rank).slice(0, 2); let seq = d.negotiation_insights.length;
    d.negotiation_insights = [...d.negotiation_insights.filter((n) => n.rfx_id !== rid), ...evals.map((e, k) => { const price = d.rfx_response.find((r) => r.rfx_id === rid && r.supplier_id === e.supplier_id)?.quoted_total_price || budget; return { insight_id: `NI-${ar.pad(++seq)}`, rfx_id: rid, supplier_id: e.supplier_id, benchmark_price: Math.round(price * 0.93 / 1000) * 1000, target_price: Math.round(price * 0.9 / 1000) * 1000, walk_away_price: Math.round(price * 0.97 / 1000) * 1000, ai_recommendation: k === 0 ? `Commodity index down 4% QoQ — anchor at target citing benchmark; trade payment terms for a further 2%; request extended warranty at no charge.` : "Use as competitive lever in round 2; request BAFO absorbing delivery cost.", reviewed_by: "Priya Nair", approval_flag: autonomous ? 1 : 0, approved_by: autonomous ? "Rachel Kim (auto)" : null, approved_at: autonomous ? nowTs() : null }; })];
    return `Commodity-driven targets for top 2 suppliers: benchmark, target and walk-away envelopes with levers (terms, volume, warranty)${autonomous ? " — Finance envelope approved" : " — awaiting Finance"}.`;
  }
  if (st.id === "S10") {
    const evals = q(d, "agent_evaluations", "rfx_id", rid).sort((a, b) => a.agent_rank - b.agent_rank); const win = evals[0]; const quote = d.rfx_response.find((r) => r.rfx_id === rid && r.supplier_id === win.supplier_id)?.quoted_total_price || budget; const fp = Math.round(quote * 0.906 / 1000) * 1000;
    if (!one(d, "negotiation_finalization", "rfx_id", rid)) d.negotiation_finalization = [...d.negotiation_finalization, { finalization_id: `NF-${ar.pad(d.negotiation_finalization.length + 1)}`, rfx_id: rid, supplier_id: win.supplier_id, final_price: fp, savings_achieved: quote - fp, negotiation_summary: `Two automated rounds. ${supName(d, win.supplier_id)} moved from ${fmtFull(quote)} to ${fmtFull(fp)} (−${((1 - fp / quote) * 100).toFixed(1)}%); secured Net 45, extended warranty and phased delivery at no charge.`, finance_approval_status: "APPROVED", procurement_approval_status: "APPROVED", approved_by: autonomous ? "Rachel Kim (auto)" : who, approved_at: nowTs() }];
    if (!one(d, "supplier_selection_decisions", "rfx_id", rid)) { d.supplier_selection_decisions = [...d.supplier_selection_decisions, { decision_id: `DEC-${ar.pad(d.supplier_selection_decisions.length + 1)}`, rfx_id: rid, shortlisted_suppliers: J(evals.slice(0, 2).map((e) => e.supplier_id)), final_selected_supplier: win.supplier_id, selection_rationale: `Highest weighted score (${win.total_weighted_score}); negotiated price ${fmtFull(fp)} is ${(((budget - fp) / budget) * 100).toFixed(1)}% under approved budget.`, agent_recommendation_score: win.total_weighted_score, manual_override_flag: 0, business_approval_status: "APPROVED", procurement_approval_status: "APPROVED", final_approval_by: autonomous ? "Michael Chen (auto)" : who, approval_timestamp: nowTs(), created_at: nowTs() }];
      let seq = d.rfx_approvals.length; d.rfx_approvals = [...d.rfx_approvals, ...[["Business Owner", req.requestor_name], ["Finance Controller", "Rachel Kim"], ["Legal Counsel", "Laura Bennett"], ["CPO", "Michael Chen"]].map((a, k) => ({ approval_id: `APR-${ar.pad(++seq)}`, rfx_id: rid, approver_role: a[0], approver_name: a[1], approval_status: "APPROVED", comments: autonomous ? AUTO_NOTE : "Approved.", approval_sequence: k + 1, approved_at: nowTs() }))]; }
    setRfx({ status: "AWARDED", key_findings: `${R.key_findings || ""} Awarded to ${supName(d, win.supplier_id)} at ${fmtFull(fp)}.` });
    return `Negotiation rounds automated → ${supName(d, win.supplier_id)} at ${fmtFull(fp)} (saved ${fmtUsd(quote - fp)}) · outcome summary generated · award approvals recorded.`;
  }
  if (st.id === "CLM") {
    const fin = one(d, "negotiation_finalization", "rfx_id", rid); let c = one(d, "contract_intake_requests", "linked_rfx", rid);
    if (!c) { const cid = `CTR-2026-${ar.pad(d.contract_intake_requests.length + 1)}`; c = { contract_id: cid, linked_rfx: rid, contract_type: gov.contract_type || "Master Services Agreement", contract_value: fin.final_price, risk_level: req.priority, business_owner: req.requestor_name, intake_status: "IN_REVIEW", validated_by: "Laura Bennett", validated_at: nowTs(), created_at: nowTs() }; d.contract_intake_requests = [...d.contract_intake_requests, c];
      d.contract_risk_assessment = [...d.contract_risk_assessment, { risk_id: `CRA-${ar.pad(d.contract_risk_assessment.length + 1)}`, contract_id: cid, risk_score: ar.rf(26, 44), compliance_flags: J(["DPA required", "Liability cap 24 months – within policy"]), legal_risk_notes: "Generated from award facts; standard clauses from the compliance library.", mitigation_plan: "Execute DPA; add step-in rights; quarterly attestation.", reviewed_by: "Laura Bennett", approved_flag: autonomous ? 1 : 0, approved_by: autonomous ? "Laura Bennett (auto)" : null }];
      d.contract_approvals = [...d.contract_approvals, ...[["Legal Counsel", "Laura Bennett"], ["Finance Controller", "Rachel Kim"], ["CPO", "Michael Chen"]].map((a, k) => ({ approval_id: `CAP-${ar.pad(d.contract_approvals.length + k + 1)}`, contract_id: cid, approver_role: a[0], approver_name: a[1], approval_status: autonomous ? "APPROVED" : "PENDING", comments: autonomous ? AUTO_NOTE : null, approval_sequence: k + 1, approved_at: autonomous ? nowTs() : null }))]; }
    const did = nextDocId(d); d.documents = [...d.documents, { document_id: did, title: `${c.contract_id} – ${c.contract_type} (generated)`, document_type: "CONTRACT_DRAFT", status: "ACTIVE", file_path: `/docs/contracts/${c.contract_id}/contract.docx`, file_name: `${c.contract_id}_contract.docx`, file_size_bytes: 1638400, created_by: "A9 Contract Drafting Agent", created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.contract_documents = [...d.contract_documents, { contract_id: c.contract_id, document_id: did, visibility: "INTERNAL", classification: "CONFIDENTIAL", created_at: nowTs() }];
    if (autonomous) d.contract_intake_requests = d.contract_intake_requests.map((x) => (x.contract_id === c.contract_id ? { ...x, intake_status: "APPROVED" } : x));
    return `Contract ${c.contract_id} generated from award facts (${fmtFull(c.contract_value)}, ${c.contract_type}) · risk assessed · metadata pushed to CLM${autonomous ? " · approvals recorded" : " — approvals pending"}.`;
  }
  return null;
}

function AutonomousRun({ db, mutate, push, user, can, setPage, setRfxId, openRecord, runReq, setRunReq }) {
  const requests = db.intake_requests.filter((r) => can("ADMIN", "PROC_MGR", "PROC_HEAD", "PROC_TEAM", "EXEC") || r.requestor_name === `${user.NAME_FIRST} ${user.NAME_LAST}` || r.business_unit === user.ORGEH);
  const reqId = runReq && requests.some((r) => r.request_id === runReq) ? runReq : requests[requests.length - 1]?.request_id;
  const [autonomous, setAutonomous] = useState(true);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [auto, setAuto] = useState(false);
  const st = reqId ? runState(db, reqId) : null;
  useEffect(() => { if (st?.rfxId) setRfxId(st.rfxId); }, [st?.rfxId]);
  const runOne = () => { if (!st || st.next < 0 || running) return false; const step = S_STEPS[st.next]; setRunning(true); let summary = null; mutate((d) => { summary = runStep(d, step, reqId, user, autonomous); }); setTimeout(() => { setRunning(false); if (summary) { setLog((l) => [{ id: step.id, text: summary, ts: new Date().toTimeString().slice(0, 8) }, ...l]); push(`${step.id} complete`, summary.slice(0, 90)); } else { setLog((l) => [{ id: step.id, text: `${step.id} paused — ${step.hitl || "human input required"}. Complete it on the ${ALL_NAV_ITEMS.find((i) => i.id === step.page)?.label} page, or enable autonomous mode.`, ts: new Date().toTimeString().slice(0, 8), paused: true }, ...l]); setAuto(false); } }, 650); return !!summary; };
  useEffect(() => { if (!auto || running) return; if (!st || st.next < 0) { setAuto(false); return; } const t = setTimeout(runOne, 500); return () => clearTimeout(t); }, [auto, running, st?.next]);
  if (!st) return <div className="card placeholder-card"><div className="icon">🤖</div><h3>No request to run</h3><p style={{ fontSize: 13 }}>Create a sourcing request with the chatbot first.</p><button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setPage("demand-intake")}>Go to Demand Intake</button></div>;
  const progress = Math.round((S_STEPS.filter((s) => st.done[s.id]).length / S_STEPS.length) * 100);
  return (
    <div className="ar">
      <div className="rp-head"><div><div className="page-eyebrow">Autonomous sourcing run · A15 orchestrator</div><h2 className="page-title" style={{ fontSize: 26 }}>Requestor / Business Action → Intake → Contract</h2><p className="page-desc">After the chatbot captures the request, the agent chain runs S1 → S10 → CLM. Each step writes to the platform tables; human gates are shown on the cards and are auto-actioned with evidence only when autonomous mode is on.</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={reqId} onChange={(e) => { setRunReq(e.target.value); setLog([]); setAuto(false); }} style={{ maxWidth: 380 }}>{requests.map((r) => <option key={r.request_id} value={r.request_id}>{r.request_id} · {r.requirement_description.slice(0, 50)}</option>)}</select>
          <label className="rvem-checkbox-row" style={{ margin: 0 }}><input type="checkbox" checked={autonomous} onChange={() => setAutonomous((x) => !x)} />Autonomous mode (auto-action HITL with evidence)</label>
          {st.next >= 0 ? <><button className="btn btn-ghost" disabled={running || auto} onClick={runOne}>▶ Run next: {S_STEPS[st.next].id}</button><button className="btn btn-primary" disabled={running} onClick={() => setAuto((a) => !a)}>{auto ? "⏸ Pause" : "⚡ Run to contract"}</button></> : <span className="badge awarded">Run complete</span>}
        </div></div>
      <div className="ar-panel">
        <div className="ar-head"><span className="ar-user">👤</span><div><b>Requestor / Business Action → Intake</b><div className="ar-sub">Submission through Conversational AI Chat Bot · <span className="mono">{st.req.request_id}</span> · {st.req.requestor_name}{st.rfxId && <> · <span className="mono">{st.rfxId}</span> <Badge s={st.rfx.status} /></>}</div></div><div className="ar-pills"><span className="ar-pill" onClick={() => setPage("demand-intake")}>to S1</span><span className="ar-pill" onClick={() => setPage("command-center")}>📊 Dashboards & Insights</span></div></div>
        <div className="ar-progress"><i style={{ width: `${progress}%` }}></i></div>
        <div className="ar-grid">
          {S_STEPS.map((s, i) => { const done = st.done[s.id]; const active = i === st.next; const partial = !done && st.partial[s.id]; return (
            <div key={s.id} className={`ar-card ${done ? "done" : active ? (running ? "running" : "active") : partial ? "partial" : ""}`} onClick={() => { if (st.rfxId) setRfxId(st.rfxId); setPage(s.page); }}>
              <span className="ar-badge" style={{ background: s.color }}>{s.id}</span>
              <span className="ar-icon" style={{ background: s.color }}>{s.icon}</span>
              <div className="ar-title">{s.title}</div><div className="ar-subtitle">{s.sub}</div><div className="ar-desc">{s.desc}</div>
              <div className="ar-foot"><span className="vc-agent-chip">{s.agent}</span>{s.hitl && <span className="ar-hitl" title={s.hitl}>HITL</span>}<span className={`ar-state ${done ? "ok" : active ? "on" : ""}`}>{done ? "✓ done" : active ? (running ? "running…" : "next") : partial ? "in progress" : "pending"}</span></div>
              {i < S_STEPS.length - 1 && <span className="ar-arrow">→</span>}
            </div>); })}
        </div>
      </div>
      <div className="card" style={{ padding: 0, marginTop: 16 }}><div className="rc-table-head"><h3>Run log</h3><span className="muted" style={{ fontSize: 12 }}>{log.length} events</span></div>
        {log.length === 0 && <div className="loading-row">No steps run yet in this session. Press ▶ or ⚡.</div>}
        {log.map((l, i) => <div key={i} className={`ar-log ${l.paused ? "paused" : ""}`}><span className="ar-badge sm" style={{ background: S_STEPS.find((s) => s.id === l.id)?.color }}>{l.id}</span><div style={{ flex: 1 }}>{l.text}</div><span className="mono muted" style={{ fontSize: 11 }}>{l.ts}</span></div>)}
      </div>
    </div>);
}

/* ============================= V4: RFx COMMAND CENTER (modernized + cycle time / TAT) ============================= */
const STAGE_DEFS = [
  { id: "intake", label: "Intake → Approval", sla: 5, from: (m) => m.intakeCreated, to: (m) => m.intakeApproved },
  { id: "draft", label: "Approval → RFx Draft", sla: 3, from: (m) => m.intakeApproved, to: (m) => m.rfxCreated },
  { id: "publish", label: "Draft → Publish", sla: 7, from: (m) => m.rfxCreated, to: (m) => m.issued },
  { id: "bidding", label: "Publish → Close", sla: 28, from: (m) => m.issued, to: (m) => m.closed },
  { id: "eval", label: "Close → Evaluation", sla: 5, from: (m) => m.closed, to: (m) => m.evaluated },
  { id: "nego", label: "Evaluation → Negotiation", sla: 10, from: (m) => m.evaluated, to: (m) => m.negotiated },
  { id: "award", label: "Negotiation → Award", sla: 7, from: (m) => m.negotiated, to: (m) => m.awarded },
  { id: "contract", label: "Award → Contract", sla: 10, from: (m) => m.awarded, to: (m) => m.contracted },
];
const dayDiff = (a, b) => { const from = parseUtcDate(a); const to = parseUtcDate(b); return from && to ? Math.round((to.getTime() - from.getTime()) / 86400000) : null; };
const fmtMonth = (iso) => { const date = parseUtcDate(iso); return date ? date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) : "—"; };

// milestone dates for one live event, from the tables
function milestones(db, e) {
  const req = db.intake_requests.find((r) => r.linked_RFx === e.rfx_id);
  const appr = req ? q(db, "intake_approvals", "request_id", req.request_id).filter((a) => a.approved_at) : [];
  const ev = q(db, "agent_evaluations", "rfx_id", e.rfx_id); const fin = one(db, "negotiation_finalization", "rfx_id", e.rfx_id); const dec = one(db, "supplier_selection_decisions", "rfx_id", e.rfx_id); const ctr = one(db, "contract_intake_requests", "linked_rfx", e.rfx_id);
  return { intakeCreated: req?.created_at, intakeApproved: appr.length ? appr.map((a) => a.approved_at).sort().slice(-1)[0] : null, rfxCreated: e.created_at, issued: e.issue_date, closed: e.closed_date, evaluated: ev[0]?.evaluated_at, negotiated: fin?.approved_at, awarded: dec?.approval_timestamp, contracted: ctr?.created_at };
}
function stageRows(db, e) {
  const m = milestones(db, e);
  return STAGE_DEFS.map((s) => { const from = s.from(m), to = s.to(m); const d = dayDiff(from, to); const elapsed = from && !to ? dayDiff(from, TODAY) : null; return { ...s, from, to, days: d, elapsed, breach: d != null ? d > s.sla : elapsed != null && elapsed > s.sla, open: !!from && !to }; });
}
function cycleTime(db, e) { const m = milestones(db, e); const end = m.awarded || TODAY; return { total: dayDiff(m.intakeCreated || m.rfxCreated, end), complete: !!m.awarded }; }

// small SVG charts
function Spark({ values, color = "var(--primary)", h = 34, w = 110 }) { if (!values.length) return null; const max = Math.max(...values, 1), min = Math.min(...values, 0); const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - ((v - min) / Math.max(1, max - min)) * (h - 4) - 2}`); return <svg width={w} height={h} className="spark"><polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" /><circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="3" fill={color} /></svg>; }
function Bars({ data, color = "var(--primary)", h = 120, label }) { const max = Math.max(...data.map((d) => d.v), 1); return <div className="bars" style={{ height: h }}>{data.map((d) => <div key={d.k} className="bar-col" title={`${d.k}: ${d.v}${label || ""}`}><div className="bar" style={{ height: `${(d.v / max) * 100}%`, background: d.c || color }}></div><span>{d.k}</span></div>)}</div>; }
function Gauge({ pct, color }) { const r = 34, c = 2 * Math.PI * r; return <svg width="88" height="88" viewBox="0 0 88 88"><circle cx="44" cy="44" r={r} stroke="#eef1f6" strokeWidth="9" fill="none" /><circle cx="44" cy="44" r={r} stroke={color} strokeWidth="9" fill="none" strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 44 44)" /><text x="44" y="49" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--text)">{Math.round(pct)}%</text></svg>; }

function CommandCenterV4({ db, mutate, push, setPage, setRfxId, openRecord, gotoTable, can, user }) {
  const [view, setView] = useState(["EXEC", "PROC_HEAD", "FINANCE"].includes(user.PLATFORM_ROLE) ? "exec" : "ops");
  const [filter, setFilter] = useState("All");
  const [range, setRange] = useState(12);
  const [openRow, setOpenRow] = useState(null);
  const [sort, setSort] = useState({ k: "deadline", dir: "asc" });
  const [pageN, setPageN] = useState(0); const PAGE = 10;
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const STATUS_LABEL = { OPEN: "Open", DRAFT: "Draft", EVALUATION: "Under Evaluation", NEGOTIATION: "Negotiation", AWARDED: "Awarded", CLOSED: "Closed", CANCELLED: "Cancelled" };
  const events = db.rfx_events.map((e) => { const fin = one(db, "negotiation_finalization", "rfx_id", e.rfx_id); return { ...e, label: STATUS_LABEL[e.status] || nice(e.status), closing: e.status === "OPEN" && daysUntil(e.due_date) !== null && daysUntil(e.due_date) <= 7, ct: cycleTime(db, e), stages: stageRows(db, e), savings: fin ? fin.savings_achieved : null, cat: one(db, "rfx_category", "rfx_category", e.rfx_category)?.category_name || "" }; });
  const hist = (db.sourcing_cycle_history || []).filter((h) => dayDiff(h.awarded_date, TODAY) <= range * 31);
  const TABS = [["All", () => true], ["Open", (e) => e.status === "OPEN"], ["Closed", (e) => e.status === "CLOSED"], ["Under Evaluation", (e) => e.status === "EVALUATION"], ["Negotiation", (e) => e.status === "NEGOTIATION"], ["Awarded", (e) => e.status === "AWARDED"], ["Draft", (e) => e.status === "DRAFT"], ["Cancelled", (e) => e.status === "CANCELLED"]];
  const counts = Object.fromEntries(TABS.map(([t, f]) => [t, events.filter(f).length]));
  const sorters = { rfx: (e) => e.rfx_id, title: (e) => e.title, type: (e) => e.rfx_type, status: (e) => e.label, responses: (e) => e.responses_received, budget: (e) => e.budget_limit_usd || 0, deadline: (e) => e.due_date || "9999", savings: (e) => e.savings || 0, elapsed: (e) => e.ct.total || 0 };
  let filtered = events.filter(TABS.find(([t]) => t === filter)[1]).filter((e) => !search || `${e.rfx_id} ${e.title} ${e.cat} ${e.rfx_type} ${e.label}`.toLowerCase().includes(search.toLowerCase()));
  filtered = [...filtered].sort((x, y) => { const a = sorters[sort.k](x), b2 = sorters[sort.k](y); const r = a > b2 ? 1 : a < b2 ? -1 : 0; return sort.dir === "asc" ? r : -r; });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE)); const pageRows = filtered.slice(pageN * PAGE, pageN * PAGE + PAGE);
  useEffect(() => setPageN(0), [filter, search, sort.k, sort.dir]);
  const toggleSort = (k) => setSort((s2) => ({ k, dir: s2.k === k && s2.dir === "asc" ? "desc" : "asc" }));
  const Th = ({ k, children }) => <th onClick={() => toggleSort(k)} className="v5-th">{children} <span className={`v5-sort ${sort.k === k ? "on" : ""}`}>{sort.k === k ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}</span></th>;
  // KPIs
  const liveSav = db.negotiation_finalization.reduce((a, n) => a + num(n.savings_achieved), 0), histSav = hist.reduce((a, h) => a + num(h.savings_usd), 0);
  const savings = liveSav + histSav; const awardedValue = db.negotiation_finalization.reduce((a, n) => a + num(n.final_price), 0) + hist.reduce((a, h) => a + num(h.awarded_value_usd), 0);
  const completedByRfx = new Map(); hist.forEach((h) => completedByRfx.set(h.rfx_id, { id: h.rfx_id, title: h.title, days: h.cycle_days, month: h.awarded_date, cat: h.category, sav: h.savings_usd, value: h.awarded_value_usd })); events.filter((e) => e.ct.complete).forEach((e) => completedByRfx.set(e.rfx_id, { id: e.rfx_id, title: e.title, days: e.ct.total, month: e.closed_date || TODAY, cat: e.cat, sav: e.savings || 0, value: one(db, "negotiation_finalization", "rfx_id", e.rfx_id)?.final_price, live: true }));
  const completed = [...completedByRfx.values()];
  const avgCycle = completed.length ? Math.round(completed.reduce((a, c) => a + c.days, 0) / completed.length) : 0; const slaTarget = STAGE_DEFS.reduce((a, s2) => a + s2.sla, 0);
  const stageAvg = STAGE_DEFS.map((s2) => { const live = events.flatMap((e) => e.stages.filter((x) => x.id === s2.id && x.days != null).map((x) => x.days)); const past = hist.map((h) => P(h.stage_days, {})[s2.id]).filter((v) => v != null); const all = [...live, ...past]; return { n: all.length, breaches: all.filter((v) => v > s2.sla).length }; });
  const slaCompliance = (() => { const t = stageAvg.reduce((a, x) => a + x.n, 0); const bb = stageAvg.reduce((a, x) => a + x.breaches, 0); return t ? Math.round(((t - bb) / t) * 100) : 100; })();
  const months = Array.from({ length: Math.min(range, 12) }, (_, i) => { const dd = new Date(TODAY + "T00:00:00Z"); dd.setUTCMonth(dd.getUTCMonth() - (Math.min(range, 12) - 1 - i)); return dd.toISOString().slice(0, 7); });
  const trend = months.map((mo) => { const c = completed.filter((x) => String(x.month).slice(0, 7) === mo); return { k: fmtMonth(mo + "-01"), v: c.length ? Math.round(c.reduce((a, x) => a + x.days, 0) / c.length) : 0, sav: c.reduce((a, x) => a + x.sav, 0) }; });
  const catTotals = {}; completed.forEach((x) => { catTotals[x.cat || "Other"] = (catTotals[x.cat || "Other"] || 0) + x.sav; });
  const totalSav = Object.values(catTotals).reduce((a, b2) => a + b2, 0) || 1;
  const segments = Object.entries(catTotals).sort((a, b2) => b2[1] - a[1]).map(([name, value], i) => ({ name, value, pct: Math.round((value / totalSav) * 100), color: CAT_COLORS[i % CAT_COLORS.length] }));
  const byRfx = [...completed].sort((a, b2) => b2.sav - a.sav).slice(0, 8); const maxSav = Math.max(...byRfx.map((x) => x.sav), 1);
  const KPI = ({ lbl, val, sub, spark, color, icon, tone, up }) => <div className={`card v4-kpi ${tone || ""}`}><div className="v4-kpi-top"><span className="v4-kpi-ic" style={{ background: color + "22", color }}>{icon}</span>{spark && <Spark values={spark} color={color} />}</div><div className="lbl">{lbl}</div><div className="val">{val}</div>{sub && <div className={`v5-trend ${up === false ? "down" : ""}`}>{up === false ? "↘" : up ? "↗" : ""} {sub}</div>}</div>;
  const actionFor = (e) => e.status === "EVALUATION" ? ["📊 View Evaluation", "evaluation"] : e.status === "NEGOTIATION" ? ["🤝 View Negotiation", "negotiation"] : e.status === "AWARDED" ? ["🏆 View Award", "award"] : e.status === "OPEN" ? ["✈ View RFx", "rfx-creation-publish"] : e.status === "DRAFT" ? ["📄 Open RFx", "rfx-overview"] : e.status === "CLOSED" && e.responses_received > 0 ? ["📥 View Responses", "rfx-creation-publish"] : null;
  const exportCsv = () => { const rows = [["rfx_id", "title", "type", "category", "status", "responses", "invited", "budget", "deadline", "cycle_days", "savings", ...STAGE_DEFS.map((x) => x.label)], ...filtered.map((e) => [e.rfx_id, e.title, e.rfx_type, e.cat, e.label, e.responses_received, P(e.invited_suppliers).length, e.budget_limit_usd || "", e.due_date || "", e.ct.total ?? "", e.savings ?? "", ...e.stages.map((x) => x.days ?? (x.open ? `${x.elapsed}+` : ""))])]; download("rfx_command_center.csv", rows.map((r) => r.map((v) => `"${v}"`).join(",")).join(" "), "text/csv"); push("Exported", "rfx_command_center.csv"); };
  return (
    <div className="v4cc">
      <div className="v4-head"><div><h2>RFx Command Center</h2><p>Sourcing dashboard</p></div>
        <div className="v4-controls"><div className="tabs"><button className={`tab ${view === "exec" ? "active" : ""}`} onClick={() => setView("exec")}>Executive view</button><button className={`tab ${view === "ops" ? "active" : ""}`} onClick={() => setView("ops")}>Operational view</button><button className={`tab ${view === "tower" ? "active" : ""}`} onClick={() => setView("tower")}>Control Tower</button><button className={`tab ${view === "value" ? "active" : ""}`} onClick={() => setView("value")}>Value Realization</button></div><select value={range} onChange={(e) => setRange(Number(e.target.value))}><option value={3}>Last 3 months</option><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option></select><button className="btn btn-ghost" onClick={exportCsv}>⬇ Export</button>{can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") && <button className="btn btn-primary" onClick={() => setShowDialog(true)}>＋ New RFx</button>}</div></div>
      {(view === "exec" || view === "ops") && <><div className="v5-kpis">
        <KPI lbl="Open RFx" val={counts.Open} sub={`${events.filter((e) => e.status === "OPEN" && dayDiff(e.issue_date, TODAY) <= 30).length} issued in the last 30 days`} color="#1462c4" icon="📄" up />
        <KPI lbl="Closing Soon" val={events.filter((e) => e.closing).length} sub="due within 7 days" color="#16a34a" icon="📈" up />
        <KPI lbl="Suppliers" val={db.supplier.length} sub={`${db.supplier.filter((x) => dayDiff(x.created_at, TODAY) <= 92).length} onboarded this quarter`} color="#0ea5e9" icon="👥" up />
        <KPI lbl="Awarded Value YTD" val={fmtUsd(awardedValue)} sub={`${completed.length} awards`} color="#8b5cf6" icon="💲" up />
      </div>
      <div className="v5-kpis">
        <KPI lbl="Avg RFx cycle time" val={`${avgCycle} d`} sub={`target ${slaTarget} d · ${completed.length} completed`} spark={trend.map((t) => t.v)} color="#1462c4" icon="⏱" up={avgCycle <= slaTarget} />
        <KPI lbl="SLA compliance" val={`${slaCompliance}%`} sub={`${stageAvg.reduce((a, x) => a + x.breaches, 0)} stage breaches`} color={slaCompliance >= 85 ? "#16a34a" : "#f59e0b"} icon="✓" up={slaCompliance >= 85} />
        <KPI lbl="Total Savings YTD" val={fmtUsd(savings)} sub={`${fmtUsd(liveSav)} from live events`} spark={trend.map((t) => t.sav / 1000)} color="#16a34a" icon="💰" tone="hl" up />
        <KPI lbl="Savings Percentage" val={`${awardedValue ? ((savings / (awardedValue + savings)) * 100).toFixed(2) : "0.00"}%`} sub="of pre-negotiation value" color="#0b2545" icon="％" up />
      </div></>}
      {view === "exec" && <div className="v4-grid-exec" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card v4-card"><div className="v4-card-h"><b>Savings by Category</b><span className="muted">{fmtUsd(totalSav)} realised</span></div><div style={{ display: "flex", gap: 16, alignItems: "center" }}><Donut segments={segments} centerLabel="Realised" centerValue={fmtUsd(totalSav)} /><div style={{ flex: 1 }}>{segments.slice(0, 7).map((c) => <div key={c.name} className="cc-legend-row"><span className="lg-left"><span className="dot" style={{ background: c.color }}></span>{c.name}</span><span className="amt">{fmtUsd(c.value)}</span><span className="pct">{c.pct}%</span></div>)}</div></div></div>
        <div className="card v4-card"><div className="v4-card-h"><b>Savings Achieved by RFx</b><span className="muted">top {byRfx.length}</span></div><div className="v5-hbars">{byRfx.map((x) => <div key={x.id} className="v5-hbar" onClick={() => { if (x.live) { setRfxId(x.id); setPage("award"); } }}><span className="l" title={x.title}>{x.title.length > 34 ? x.title.slice(0, 32) + "…" : x.title}</span><div className="t"><i style={{ width: `${(x.sav / maxSav) * 100}%` }}></i></div><span className="v">{fmtUsd(x.sav)}</span></div>)}</div></div>
        <div className="card v4-card"><div className="v4-card-h"><b>Cycle time trend</b><span className="muted">avg days intake → award</span></div><Bars data={trend.map((t) => ({ k: t.k, v: t.v, c: t.v > slaTarget ? "#f59e0b" : "#1462c4" }))} label=" d" /><div className="v4-legend"><span><i style={{ background: "#1462c4" }}></i>within target</span><span><i style={{ background: "#f59e0b" }}></i>above {slaTarget} d target</span></div></div>
        <div className="card v4-card"><div className="v4-card-h"><b>Pipeline by status</b><span className="muted">{events.length} events</span></div><div className="v5-status-grid">{TABS.slice(1).map(([t]) => <div key={t} className="v5-status" onClick={() => { setView("ops"); setFilter(t); }}><span className={`badge ${statusClass(Object.keys(STATUS_LABEL).find((k) => STATUS_LABEL[k] === t))}`}>{t}</span><b>{counts[t]}</b><span className="muted">{fmtUsd(events.filter(TABS.find(([x]) => x === t)[1]).reduce((a, e) => a + (e.budget_limit_usd || 0), 0))}</span></div>)}</div></div>
      </div>}
      {view === "tower" && <ControlTower db={db} setPage={setPage} setRfxId={setRfxId} push={push} mutate={mutate} />}
      {view === "value" && <ValueRealization db={db} setPage={setPage} setRfxId={setRfxId} />}
      {view === "ops" && <div className="card v4-card" style={{ padding: 0 }}>
        <div className="v5-tablebar"><div className="tabs">{TABS.map(([t]) => <button key={t} className={`tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>{t} ({counts[t]})</button>)}</div><input className="ex-search" placeholder="Search RFx number, title, category…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} /></div>
        <div style={{ overflowX: "auto" }}><table className="v4-table v5-table"><thead><tr><Th k="rfx">RFx Number</Th><Th k="title">RFx Title</Th><Th k="type">Event Type</Th><Th k="status">Status</Th><th>Stage progress · TAT</th><Th k="elapsed">Elapsed</Th><Th k="responses">Responses</Th><Th k="budget">Budget</Th><Th k="deadline">Deadline</Th><Th k="savings">Savings</Th><th>Actions</th></tr></thead>
          <tbody>{pageRows.length === 0 && <tr><td colSpan="11" className="loading-row">No RFx events match.</td></tr>}
            {pageRows.map((e) => { const act = actionFor(e); return <React.Fragment key={e.rfx_id}><tr className={openRow === e.rfx_id ? "sel" : ""} onClick={() => setOpenRow(openRow === e.rfx_id ? null : e.rfx_id)} style={{ cursor: "pointer" }}>
              <td><span className="v4-caret">{openRow === e.rfx_id ? "▾" : "▸"}</span><span className="di2-id">{e.rfx_id}</span></td>
              <td><div style={{ fontWeight: 600, maxWidth: 320 }}>{e.title}</div><div className="muted mono" style={{ fontSize: 10.5 }}>{e.rfx_category}</div></td>
              <td>{e.rfx_type}</td><td><span className={`badge ${statusClass(e.status)}`}>{e.label}</span>{e.closing && <div className="muted" style={{ fontSize: 10.5 }}>closing soon</div>}</td>
              <td><div className="v4-stages">{e.stages.map((x) => <span key={x.id} className={`v4-stage ${x.days != null ? (x.breach ? "bad" : "ok") : x.open ? (x.breach ? "bad open" : "open") : ""}`} title={`${x.label}: ${x.days != null ? `${x.days} d` : x.open ? `${x.elapsed} d elapsed` : "not started"} · SLA ${x.sla} d`}>{x.days ?? (x.open ? `${x.elapsed}+` : "")}</span>)}</div></td>
              <td><b>{e.ct.total ?? "—"} d</b></td><td>{e.responses_received}/{P(e.invited_suppliers).length}</td><td>{fmtUsd(e.budget_limit_usd)}</td><td>{fmtDate(e.due_date)}</td><td style={{ color: e.savings ? "var(--emerald)" : "var(--muted)", fontWeight: e.savings ? 700 : 400 }}>{e.savings ? fmtUsd(e.savings) : "—"}</td>
              <td onClick={(ev) => ev.stopPropagation()}>{act ? <button className="btn btn-ghost btn-sm" onClick={() => { setRfxId(e.rfx_id); setPage(act[1]); }}>{act[0]}</button> : <span className="muted">—</span>}</td></tr>
              {openRow === e.rfx_id && <tr className="v4-expand"><td colSpan="11"><div className="v4-detail">
                <div><div className="k">Type · Category</div><div>{e.rfx_type} · {e.cat}</div></div><div><div className="k">Owner</div><div>{P(e.owner, {}).name} · {P(e.owner, {}).role}</div></div><div><div className="k">Budget</div><div>{fmtFull(e.budget_limit_usd)}</div></div>
                <div><div className="k">Issue · Due · Closed</div><div>{fmtDate(e.issue_date)} · {fmtDate(e.due_date)} · {fmtDate(e.closed_date)}</div></div><div><div className="k">Invited · Responses</div><div>{P(e.invited_suppliers).length} invited · {e.responses_received} received</div></div><div><div className="k">Cycle time</div><div>{e.ct.total ?? "—"} days {e.ct.complete ? "(intake → award)" : "so far"} · target {slaTarget} d</div></div>
                <div style={{ gridColumn: "1 / -1" }}><div className="k">Stage durations</div><div className="v4-stagelist">{e.stages.map((x) => <span key={x.id} className={x.days != null ? (x.breach ? "bad" : "ok") : x.open ? "open" : ""}>{x.label}: <b>{x.days != null ? `${x.days} d` : x.open ? `${x.elapsed} d so far` : "—"}</b> <span className="muted">/ {x.sla}</span></span>)}</div></div>
                <div style={{ gridColumn: "1 / -1" }}><div className="k">Description</div><div>{e.description}</div></div>{e.key_findings && <div style={{ gridColumn: "1 / -1" }}><div className="k">Key findings</div><div>{e.key_findings}</div></div>}
              </div></td></tr>}</React.Fragment>; })}</tbody></table></div>
        <div className="v5-pager"><span className="muted">Showing {filtered.length ? pageN * PAGE + 1 : 0} to {Math.min(filtered.length, (pageN + 1) * PAGE)} of {filtered.length} results</span><div style={{ display: "flex", gap: 6 }}><button className="btn btn-ghost btn-sm" disabled={pageN === 0} onClick={() => setPageN((p) => p - 1)}>‹ Previous</button><button className="btn btn-ghost btn-sm" disabled={pageN >= pages - 1} onClick={() => setPageN((p) => p + 1)}>Next ›</button></div></div>
        <div className="v4-legend" style={{ padding: "8px 14px" }}><span><i style={{ background: "var(--emerald)" }}></i>stage within SLA</span><span><i style={{ background: "var(--red)" }}></i>SLA breached</span><span><i style={{ background: "#dbe7f7", border: "1px solid #9fc0ea" }}></i>in progress</span><span className="muted">stages: {STAGE_DEFS.map((x) => x.label.split(" → ")[1] || x.label).join(" · ")}</span></div>
      </div>}
      {showDialog && (<div className="modal-overlay" onClick={() => setShowDialog(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><h3>Create RFx from an approved intake</h3><p className="muted" style={{ fontSize: 12.5 }}>Every RFx originates from a business request that has cleared Procurement → Finance → Legal.</p>
        {db.intake_requests.filter((r) => r.intake_status === "APPROVED" && !r.linked_RFx).length === 0 && <div className="callout info">All approved requests already have an RFx. New demand is raised by a business profile in Demand Intake.</div>}
        {db.intake_requests.filter((r) => r.intake_status === "APPROVED" && !r.linked_RFx).map((r) => <div key={r.request_id} className="home-req" onClick={() => { const gov = one(db, "intake_strategy_governance", "request_id", r.request_id); const ct = one(db, "intake_commercials_timelines", "request_id", r.request_id); const rid = `${gov?.sourcing_approach || "RFP"}-2026-${r.request_id.split("-").slice(2).join("-")}`; mutate((d) => { d.rfx_events = [{ rfx_id: rid, title: r.requirement_description.slice(0, 70), rfx_type: gov?.sourcing_approach || "RFP", rfx_category: d.rfx_category.find((c) => c.category_name === r.category)?.rfx_category || "CAT-ITS", status: "DRAFT", issue_date: null, due_date: null, closed_date: null, owner: J({ name: "Priya Nair", role: "Category Manager", email: "priya.nair@s2c.com" }), description: r.requirement_description, scope: null, invited_suppliers: "[]", responses_received: 0, key_findings: null, attachments: "[]", budget_limit_usd: ct?.approved_budget || null, created_at: nowTs() }, ...d.rfx_events]; d.rfx_weight_configs = [...d.rfx_weight_configs, { rfx_id: rid, commercial_weight: 0.35, operational_weight: 0.35, risk_compliance_weight: 0.2, esg_weight: 0.1, completeness_score: 94.5, consistency_score: 92, complaince_score: 98, readability_score: 90, overall_quality_score: 93.6, status: "PENDING_HITL", issues: "[]", warnings: "[]", created_at: nowTs(), updated_at: nowTs() }]; d.intake_requests = d.intake_requests.map((x) => (x.request_id === r.request_id ? { ...x, linked_RFx: rid } : x)); }); setShowDialog(false); setRfxId(rid); push("Draft RFx created", `${rid} linked to ${r.request_id}.`); }}><div><div className="t">{r.request_id} · {r.category}</div><div className="d">{r.requirement_description}</div></div><Badge s="APPROVED" /></div>)}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}><button className="btn btn-ghost btn-sm" onClick={() => setShowDialog(false)}>Close</button></div></div></div>)}
    </div>);
}

/* ============================= Q&A (A8) ============================= */
function QnA({ db, mutate, push, rfxId, openRecord, gotoTable, can }) {
  const proc = can("PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const qs = q(db, "rfx_questions", "rfx_id", rfxId).sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));
  const [drafts, setDrafts] = useState({});
  const [newQ, setNewQ] = useState({ supplier: P(rfx.invited_suppliers)[0] || db.supplier[0].supplier_id, section: "Section 2 – Scope", text: "", priv: 0 });
  const owner = P(rfx.owner, {}).name;
  const publish = (qid, priv) => {
    const text = drafts[qid]; if (!text?.trim()) { push("Answer required", "Draft an answer first."); return; }
    mutate((d) => { d.rfx_question_responses = [...d.rfx_question_responses, { response_id: `QR-${String(d.rfx_question_responses.length + 1).padStart(3, "0")}`, question_id: qid, response_text: text.trim(), internal_notes: null, response_status: "PUBLISHED", answered_by: owner, approved_by: "Priya Nair", published_at: nowTs(), created_at: nowTs(), updated_at: nowTs() }]; d.rfx_questions = d.rfx_questions.map((x) => (x.question_id === qid ? { ...x, submission_status: "ANSWERED" } : x)); });
    push("Answer published", priv ? "Private answer released to the asking supplier only." : "Public answer released to all invited suppliers (equality of access).");
  };
  const submitQ = () => { if (!newQ.text.trim()) return; mutate((d) => { d.rfx_questions = [...d.rfx_questions, { question_id: `Q-${String(d.rfx_questions.length + 1).padStart(3, "0")}`, rfx_id: rfxId, supplier_id: newQ.supplier, section_reference: newQ.section, question_text: newQ.text.trim(), is_private: newQ.priv, submission_status: "SUBMITTED", submitted_by: `bids@${supName(d, newQ.supplier).toLowerCase().replace(/\s+/g, "")}.example`, submitted_at: nowTs() }]; }); setNewQ((n) => ({ ...n, text: "" })); push("Question logged", "Simulated supplier question inserted into rfx_questions."); };
  const draftAi = (x) => setDrafts((d) => ({ ...d, [x.question_id]: `Thank you for the question on ${x.section_reference}. ${/scope|endpoint|include/i.test(x.question_text) ? "The item is in scope as described in the RFx; volumes are provided in Annex C." : /extension|due|date|timeline/i.test(x.question_text) ? "The due date is unchanged. A 3-day grace period applies for the pricing template only." : /currency|usd|price|rate/i.test(x.question_text) ? "All rates must be quoted in USD as per the pricing schedule." : "Please refer to the relevant section of the RFx document; the requirement stands as written."} — grounded draft by Agent A8, pending Sourcing Lead approval.` }));
  return (
    <div>
      <div className="page-head"><Eyebrow activity="Workspace" tables={["rfx_questions", "rfx_question_responses"]} agent="Agent A8 — Supplier Q&A" gotoTable={gotoTable} /><h2 className="page-title">Supplier Q&A</h2><p className="page-desc">Questions from invited suppliers on <b>{rfx.title}</b>. A8 drafts a grounded answer; a human approves and publishes — public answers go to every bidder.</p></div>
      <div className="cc-layout" style={{ gridTemplateColumns: "1.8fr 1fr" }}>
        <div>{qs.length === 0 && <div className="card placeholder-card"><div className="icon">💬</div><h3>No questions yet</h3><p style={{ fontSize: 13 }}>Q&A opens once the RFx is published.</p></div>}
          {qs.map((x) => { const a = one(db, "rfx_question_responses", "question_id", x.question_id); return (
            <div key={x.question_id} className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}><Ref t="rfx_questions" c="question_id" v={x.question_id} openRecord={openRecord} /><b style={{ color: "var(--text)" }}>{supName(db, x.supplier_id)}</b>· {x.section_reference} · {x.submitted_at}{x.is_private ? <span className="badge closing">private</span> : <span className="badge open">public</span>}<Badge s={x.submission_status} /></div>
              <p style={{ margin: "8px 0", fontSize: 13.5 }}>{x.question_text}</p>
              {a ? <div className="callout success"><div><b>Answer</b> · {a.answered_by} · approved by {a.approved_by} · {a.published_at}<br/>{a.response_text}{a.internal_notes && <div className="muted" style={{ marginTop: 4 }}>Internal: {a.internal_notes}</div>}</div></div>
                : !proc ? <div className="callout warn">Awaiting Procurement answer.</div> : <div><textarea placeholder="Draft answer…" value={drafts[x.question_id] || ""} onChange={(e) => setDrafts((d) => ({ ...d, [x.question_id]: e.target.value }))} style={{ minHeight: 70 }} /><div style={{ display: "flex", gap: 8, marginTop: 6 }}><button className="btn btn-ghost btn-sm" onClick={() => draftAi(x)}>✨ A8 draft</button><button className="btn btn-primary btn-sm" onClick={() => publish(x.question_id, x.is_private)}>Approve & publish {x.is_private ? "(private)" : "(public)"}</button></div></div>}
            </div>); })}</div>
        <div><div className="card cc-side-card"><div className="cc-side-title">Simulate a supplier question</div>
          <label>Supplier</label><select value={newQ.supplier} onChange={(e) => setNewQ((n) => ({ ...n, supplier: e.target.value }))}>{P(rfx.invited_suppliers).map((s) => <option key={s} value={s}>{supName(db, s)}</option>)}</select>
          <label>Section</label><input value={newQ.section} onChange={(e) => setNewQ((n) => ({ ...n, section: e.target.value }))} />
          <label>Question</label><textarea value={newQ.text} onChange={(e) => setNewQ((n) => ({ ...n, text: e.target.value }))} />
          <label className="rvem-checkbox-row"><input type="checkbox" checked={!!newQ.priv} onChange={() => setNewQ((n) => ({ ...n, priv: n.priv ? 0 : 1 }))} />Private (commercially sensitive)</label>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={submitQ} disabled={!P(rfx.invited_suppliers).length}>Submit question</button></div>
          <div className="card cc-side-card"><div className="cc-side-title">Stats</div><div className="rfp-field-row"><span className="lbl">Questions</span><span className="val">{qs.length}</span></div><div className="rfp-field-row"><span className="lbl">Answered</span><span className="val">{qs.filter((x) => x.submission_status === "ANSWERED").length}</span></div><div className="rfp-field-row"><span className="lbl">Awaiting</span><span className="val">{qs.filter((x) => x.submission_status !== "ANSWERED").length}</span></div></div></div>
      </div>
    </div>);
}

/* ============================= APPROVAL DASHBOARD ============================= */
function Approvals({ db, mutate, push, setPage, setRfxId, openRecord, gotoTable, user, can }) {
  const [mineOnly, setMineOnly] = useState(true);
  const mine = new Set(myQueue(db, user).map((i) => i.ref));
  const items = [];
  db.intake_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => { const r = one(db, "intake_requests", "request_id", a.request_id); items.push({ gate: "Intake Approval", ref: a.request_id, t: "intake_requests", c: "request_id", who: `${a.approver_role} · ${one(db, "enterprise_user_master", "BNAME", a.approver_bname)?.NAME_FIRST || ""}`, what: `Step ${a.approval_sequence}/3 · ${r?.category} · raised by ${r?.requestor_name}`, status: "PENDING", page: "demand-intake" }); });
  db.rfx_draft_versions.filter((v) => v.approval_status === "IN_REVIEW").forEach((v) => items.push({ gate: "RFx Draft", ref: v.draft_id, t: "rfx_draft_versions", c: "draft_id", who: "Legal Counsel", what: `${v.rfx_id} v${v.version_number}`, status: "IN_REVIEW", rfx: v.rfx_id, page: "rfx-creation-publish" }));
  db.bid_exceptions.filter((x) => x.resolution_status === "OPEN").forEach((x) => { const b = one(db, "bid_responses", "bid_id", x.bid_id); items.push({ gate: "Bid Exception", ref: x.bid_exceptions_id, t: "bid_exceptions", c: "bid_exceptions_id", who: "Sourcing Lead", what: `${nice(x.exception_type)} · ${supName(db, b?.supplier_id)} · ${b?.rfx_id}`, status: x.severity, rfx: b?.rfx_id, page: "rfx-creation-publish" }); });
  db.rfx_assigned_approvers.filter((a) => a.current_status === "PENDING").forEach((a) => items.push({ gate: "Evaluation", ref: a.assignment_id, t: "rfx_assigned_approvers", c: "assignment_id", who: one(db, "approver_availability_matrix", "user_id", a.approver_user_id)?.user_email, what: `Confirm ranking · ${a.rfx_id}`, status: "PENDING", rfx: a.rfx_id, page: "evaluation" }));
  db.negotiation_insights.filter((n) => !n.approval_flag).forEach((n) => items.push({ gate: "Negotiation", ref: n.insight_id, t: "negotiation_insights", c: "insight_id", who: "Finance Controller", what: `Envelope for ${supName(db, n.supplier_id)} · ${n.rfx_id}`, status: "PENDING", rfx: n.rfx_id, page: "negotiation" }));
  db.rfx_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => items.push({ gate: "Award", ref: a.approval_id, t: "rfx_approvals", c: "approval_id", who: `${a.approver_role} · ${a.approver_name}`, what: `Award step ${a.approval_sequence} · ${a.rfx_id}`, status: "PENDING", rfx: a.rfx_id, page: "award" }));
  db.contract_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => items.push({ gate: "Contract Approval", ref: a.approval_id, t: "contract_approvals", c: "approval_id", who: `${a.approver_role} · ${a.approver_name}`, what: `Sign-off ${a.contract_id}`, status: "PENDING", page: "new-contract-rollout" }));
  const history = [...db.rfx_approvals.filter((a) => a.approval_status === "APPROVED").map((a) => ({ ts: a.approved_at, gate: "Award", who: a.approver_name, what: a.rfx_id, ref: a.approval_id })), ...db.contract_approvals.filter((a) => a.approved_at).map((a) => ({ ts: a.approved_at, gate: "Contract", who: a.approver_name, what: a.contract_id, ref: a.approval_id })), ...db.negotiation_insights.filter((n) => n.approved_at).map((n) => ({ ts: n.approved_at, gate: "Negotiation", who: n.approved_by, what: n.rfx_id, ref: n.insight_id })), ...db.rfx_draft_versions.filter((v) => v.approved_at).map((v) => ({ ts: v.approved_at, gate: "RFx Draft", who: v.approved_by, what: v.rfx_id, ref: v.draft_id })), ...db.intake_approvals.filter((a) => a.approved_at).map((a) => ({ ts: a.approved_at, gate: "Intake", who: one(db, "enterprise_user_master", "BNAME", a.approver_bname)?.NAME_LAST || a.approver_role, what: a.request_id, ref: a.approval_id }))].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 12);
  const byGate = {}; items.forEach((i) => { byGate[i.gate] = (byGate[i.gate] || 0) + 1; });
  return (
    <div>
      <div className="page-head"><Eyebrow activity="Workspace" tables={["human_in_loop_controls", "rfx_assigned_approvers", "rfx_approvals", "contract_approvals"]} agent="A15 — Orchestration & Audit" gotoTable={gotoTable} /><h2 className="page-title">Approval Dashboard</h2><p className="page-desc">Every item where an agent has stopped and is waiting for a person, across all events. Act here or open the originating screen.</p></div>
      <div className="kpi-grid">{db.human_in_loop_controls.map((h) => <div key={h.hitl_id} className={`card kpi ${byGate[h.process_stage] ? "hl-warn" : ""}`}><div className="lbl">{h.process_stage}</div><div className="val">{byGate[h.process_stage] || 0}</div><div className="sub">{one(db, "personas_master", "persona_id", h.primary_persona)?.persona_name}</div></div>)}</div>
      <div className="card" style={{ padding: 0, marginBottom: 18 }}><div className="rc-table-head"><h3>Open items ({(mineOnly ? items.filter((i) => mine.has(i.ref)) : items).length})</h3><div className="tabs"><button className={`tab ${mineOnly ? "active" : ""}`} onClick={() => setMineOnly(true)}>My queue ({items.filter((i) => mine.has(i.ref)).length})</button><button className={`tab ${!mineOnly ? "active" : ""}`} onClick={() => setMineOnly(false)}>All ({items.length})</button></div></div>
        <table><thead><tr><th>Gate</th><th>Record</th><th>What</th><th>Assigned to</th><th>Status</th><th></th></tr></thead>
          <tbody>{(mineOnly ? items.filter((i) => mine.has(i.ref)) : items).length === 0 && <tr><td colSpan="6" className="loading-row">Nothing waiting on {mineOnly ? "you" : "anyone"}.</td></tr>}
            {(mineOnly ? items.filter((i) => mine.has(i.ref)) : items).map((i) => <tr key={i.ref}><td><b>{i.gate}</b></td><td><Ref t={i.t} c={i.c} v={i.ref} openRecord={openRecord} /></td><td>{i.what}</td><td>{i.who}</td><td><Badge s={i.status} /></td><td style={{ whiteSpace: "nowrap" }}>{i.act && <button className="btn btn-primary btn-sm" onClick={() => { i.act(); push("Approved", `${i.ref} approved.`); }}>Approve</button>} <button className="btn btn-ghost btn-sm" onClick={() => { if (i.rfx) setRfxId(i.rfx); setPage(i.page); }}>Open</button></td></tr>)}</tbody></table></div>
      <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Recent decisions (audit trail)</h3></div>
        <table><thead><tr><th>When</th><th>Gate</th><th>Approver</th><th>Subject</th><th>Record</th></tr></thead><tbody>{history.map((h) => <tr key={h.ref}><td className="mono" style={{ fontSize: 11.5 }}>{h.ts}</td><td>{h.gate}</td><td>{h.who}</td><td>{h.what}</td><td className="mono" style={{ fontSize: 11.5 }}>{h.ref}</td></tr>)}</tbody></table></div>
    </div>);
}

/* ============================= FAQ & KNOWLEDGE CENTER ============================= */
const AGENTS = [["A1", "Demand Intake Agent", "Captures and validates intake; runs policy pre-checks.", "intake_*"], ["A2", "Supplier Discovery Agent", "Scores the panel; proposes shortlist.", "supplier_shortlisting"], ["A3", "RFx Builder Agent", "Drafts versioned RFx packages and questionnaires.", "rfx_draft_versions, rfx_requirements"], ["A4", "Bid Ingestion Agent", "Extracts, normalises and flags exceptions in bids.", "bid_*"], ["A5", "Evaluation Agent", "Weighted scoring with rationale and confidence.", "agent_evaluations"], ["A6", "Negotiation Agent", "Benchmark, target, walk-away; round strategy.", "negotiation_*"], ["A7", "Award Agent", "Assembles award package; routes approvals; hands off to CLM.", "supplier_selection_decisions"], ["A8", "Supplier Q&A Agent", "Grounded draft answers for supplier questions.", "rfx_question_responses"], ["A9–A17", "CLM Agents", "Contract drafting, risk, obligations, renewal, termination (partially in ERD).", "contract_*"], ["A15", "Orchestration & Audit", "HITL gates, routing, audit trail.", "human_in_loop_controls"]];
function FaqCenter({ db, gotoTable }) {
  const [qq, setQq] = useState("");
  const filt = (s) => !qq || String(s).toLowerCase().includes(qq.toLowerCase());
  return (
    <div>
      <div className="page-head"><Eyebrow activity="Workspace" tables={["compliance", "personas_master", "human_in_loop_controls"]} gotoTable={gotoTable} /><h2 className="page-title">FAQ & Knowledge Center</h2><p className="page-desc">Agent catalogue, HITL gates, personas and the compliance clause library — the reference material every agent grounds its answers in.</p></div>
      <input className="ex-search" placeholder="Search the knowledge center" value={qq} onChange={(e) => setQq(e.target.value)} style={{ marginBottom: 14, minWidth: 320 }} />
      <div className="section-label">Agents</div>
      <div className="personas">{AGENTS.filter((a) => filt(a.join(" "))).map((a) => <div key={a[0]} className="card rfp-card"><span className="vc-agent-chip">{a[0]}</span><b style={{ display: "block", marginTop: 6 }}>{a[1]}</b><p style={{ fontSize: 12.5, color: "#39424f", margin: "6px 0" }}>{a[2]}</p><span className="mono muted" style={{ fontSize: 11 }}>{a[3]}</span></div>)}</div>
      <div className="section-label" style={{ marginTop: 18 }}>Personas · personas_master</div>
      <div className="personas">{db.personas_master.filter((p) => filt(p.persona_name + p.role_description)).map((p) => <div key={p.persona_id} className="card rfp-card"><div className="mono muted" style={{ fontSize: 11 }}>{p.persona_id}</div><b>{p.persona_name}</b><div className="muted" style={{ fontSize: 12 }}>{p.function_area}</div><p style={{ fontSize: 12.5, margin: "6px 0" }}>{p.role_description}</p>{P(p.typical_stages).map((s) => <span key={s} className="vr-attach-chip" style={{ marginRight: 4 }}>{s}</span>)}</div>)}</div>
      <div className="section-label" style={{ marginTop: 18 }}>Compliance clause library · compliance</div>
      <div className="card" style={{ padding: 0 }}><table><thead><tr><th>Clause</th><th>Geography</th><th>Applies to</th><th>Priority</th><th>Mandatory</th><th>Text</th></tr></thead><tbody>{db.compliance.filter((c) => filt(c.compliance_name + c.clause_text)).map((c) => <tr key={c.compliance_id}><td style={{ fontWeight: 600 }}>{c.compliance_name}</td><td>{c.geography}</td><td>{c.procurement_type} · {c.category}</td><td><Badge s={c.priority} /></td><td>{c.is_mandatory ? "Yes" : "No"}</td><td style={{ fontSize: 12, maxWidth: 420 }}>{c.clause_text}</td></tr>)}</tbody></table></div>
      <div className="section-label" style={{ marginTop: 18 }}>Frequently asked</div>
      <div className="card" style={{ padding: 18 }}>{[["Can an agent publish an RFx without a human?", "No. HITL-004 requires the Sourcing Lead to approve publication; the draft must be APPROVED by Legal (HITL-003) first."], ["What happens when a bid arrives by email in another currency?", "Agent A4 OCRs the attachment, stores the raw value in bid_line_items.raw_*, converts to USD with the day's exchange_rate, and raises a CURRENCY_MISMATCH exception for the Sourcing Lead to confirm."], ["How is the award approver chosen?", "agent_approval_routing_rules match on process stage, contract value and risk tier, then approver_availability_matrix picks an available person (or their delegate)."], ["Where do overrides get recorded?", "Shortlist overrides: supplier_shortlisting.manual_override_flag + override_reason. Award overrides: supplier_selection_decisions.manual_override_flag. Both are audit_required."]].filter((f) => filt(f.join(" "))).map((f) => <div key={f[0]} style={{ marginBottom: 12 }}><b style={{ fontSize: 13.5 }}>{f[0]}</b><p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#39424f" }}>{f[1]}</p></div>)}</div>
    </div>);
}

/* ============================= RFP WORKFLOW STATUS ============================= */
function WorkflowStatus({ db, rfxId, setPage, openRecord, gotoTable }) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const intake = db.intake_requests.find((r) => r.linked_RFx === rfxId);
  const drafts = q(db, "rfx_draft_versions", "rfx_id", rfxId); const bids = q(db, "bid_responses", "rfx_id", rfxId); const evals = q(db, "agent_evaluations", "rfx_id", rfxId); const ins = q(db, "negotiation_insights", "rfx_id", rfxId); const fin = one(db, "negotiation_finalization", "rfx_id", rfxId); const dec = one(db, "supplier_selection_decisions", "rfx_id", rfxId); const ctr = one(db, "contract_intake_requests", "linked_rfx", rfxId);
  const steps = [
    { s: "S1–S2", t: "Intake", done: intake?.intake_status === "APPROVED", partial: !!intake, meta: intake ? `${intake.request_id} · ${nice(intake.intake_status)}` : "no intake linked", page: "demand-intake" },
    { s: "S3–S4", t: "Shortlist", done: P(rfx.invited_suppliers).length >= 3, partial: P(rfx.invited_suppliers).length > 0, meta: `${P(rfx.invited_suppliers).length} invited`, page: "supplier-discovery" },
    { s: "S5", t: "RFx draft & publish", done: rfx.status !== "DRAFT", partial: drafts.length > 0, meta: `${drafts.length} versions · ${rfx.status === "DRAFT" ? "not published" : `issued ${fmtDate(rfx.issue_date)}`}`, page: "rfx-creation-publish" },
    { s: "S6", t: "Q&A", done: q(db, "rfx_questions", "rfx_id", rfxId).every((x) => x.submission_status === "ANSWERED") && rfx.status !== "DRAFT", partial: q(db, "rfx_questions", "rfx_id", rfxId).length > 0, meta: `${q(db, "rfx_questions", "rfx_id", rfxId).length} questions`, page: "qna" },
    { s: "S7", t: "Bids normalised", done: bids.length > 0 && bids.every((b) => b.status === "NORMALIZED"), partial: bids.length > 0, meta: `${bids.length} bids · ${bids.filter((b) => b.status !== "NORMALIZED").length} with exceptions`, page: "rfx-creation-publish" },
    { s: "S8", t: "Evaluation", done: evals.length > 0 && !q(db, "rfx_assigned_approvers", "rfx_id", rfxId).some((a) => a.current_status !== "APPROVED"), partial: evals.length > 0, meta: evals.length ? `rank 1: ${supName(db, evals.find((e) => e.agent_rank === 1)?.supplier_id)}` : "pending", page: "evaluation" },
    { s: "S9–S10", t: "Negotiation", done: !!fin, partial: ins.length > 0, meta: fin ? `saved ${fmtUsd(fin.savings_achieved)}` : ins.length ? `${ins.length} envelopes` : "pending", page: "negotiation" },
    { s: "S11", t: "Award", done: dec?.procurement_approval_status === "APPROVED", partial: !!dec, meta: dec ? `${dec.decision_id} · ${nice(dec.procurement_approval_status)}` : "pending", page: "award" },
    { s: "S12", t: "Contract handoff", done: !!ctr, partial: false, meta: ctr ? ctr.contract_id : "pending", page: "new-contract-rollout" },
  ];
  const cur = steps.findIndex((s) => !s.done);
  const docs = q(db, "rfx_documents", "rfx_id", rfxId).map((d) => ({ ...d, doc: one(db, "documents", "document_id", d.document_id) }));
  return (
    <div>
      <div className="page-head"><Eyebrow activity="Workspace" tables={["rfx_events"]} gotoTable={gotoTable} /><h2 className="page-title">RFP Workflow Status</h2><p className="page-desc">Where <b>{rfx.title}</b> sits in the S1–S12 lifecycle, derived from what exists in the tables.</p></div>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}><div><div style={{ fontSize: 16, fontWeight: 800 }}><Ref t="rfx_events" c="rfx_id" v={rfxId} openRecord={openRecord} /> <Badge s={rfx.status} /></div><div className="muted" style={{ fontSize: 12 }}>{rfx.rfx_type} · {one(db, "rfx_category", "rfx_category", rfx.rfx_category)?.category_name} · owner {P(rfx.owner, {}).name}</div></div><div style={{ display: "flex", gap: 20 }}>{[["Budget", fmtUsd(rfx.budget_limit_usd)], ["Issue", fmtDate(rfx.issue_date)], ["Due", fmtDate(rfx.due_date)], ["Responses", `${rfx.responses_received}/${P(rfx.invited_suppliers).length}`]].map(([l, v]) => <div key={l}><div className="lbl" style={{ fontSize: 9.5, color: "var(--muted)", textTransform: "uppercase" }}>{l}</div><div style={{ fontWeight: 600 }}>{v}</div></div>)}</div></div></div>
      <div className="wf-track">{steps.map((s, i) => <div key={s.s} className={`wf-step ${s.done ? "done" : i === cur ? "active" : s.partial ? "partial" : ""}`} onClick={() => setPage(s.page)}><div className="wf-dot">{s.done ? "✓" : i + 1}</div><div className="wf-s">{s.s}</div><div className="wf-t">{s.t}</div><div className="wf-m">{s.meta}</div></div>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 16 }}><div className="cc-side-title">Documents · rfx_documents</div>{docs.map((d) => <div key={d.document_id} className="rfp-file-row"><span>📄</span><span className="name"><Ref t="documents" c="document_id" v={d.document_id} openRecord={openRecord}>{d.doc?.file_name}</Ref></span><span className="size">{d.phase} · {d.visibility}</span></div>)}{!docs.length && <div className="muted">None yet.</div>}</div>
        <div className="card" style={{ padding: 16 }}><div className="cc-side-title">Key findings</div><p style={{ fontSize: 13 }}>{rfx.key_findings || <span className="muted">Populated by A5/A7 as the event progresses.</span>}</p><div className="cc-side-title" style={{ marginTop: 12 }}>Description</div><p style={{ fontSize: 12.5, color: "var(--muted)" }}>{rfx.description}</p></div>
      </div>
    </div>);
}

/* ============================= CLM: NEW CONTRACT ROLLOUT (C1–C4 in ERD) ============================= */
function NewContractRollout({ db, mutate, push, openRecord, gotoTable, setRfxId, setPage, can }) {
  const ctrRole = { "Legal Counsel": ["LEGAL", "CONTRACTS"], "Finance Controller": ["FINANCE"], CPO: ["PROC_HEAD"] };
  const ctrs = db.contract_intake_requests;
  const [sel, setSel] = useState(ctrs[0]?.contract_id);
  const c = ctrs.find((x) => x.contract_id === sel) || ctrs[0];
  if (!c) return <div className="card placeholder-card"><div className="icon">📝</div><h3>No contracts yet</h3><p style={{ fontSize: 13 }}>Contracts are created by the S12 handoff after an award chain completes.</p></div>;
  const ra = one(db, "contract_risk_assessment", "contract_id", c.contract_id); const aps = q(db, "contract_approvals", "contract_id", c.contract_id).sort((a, b) => a.approval_sequence - b.approval_sequence); const docs = q(db, "contract_documents", "contract_id", c.contract_id).map((d) => ({ ...d, doc: one(db, "documents", "document_id", d.document_id) }));
  const rfx = one(db, "rfx_events", "rfx_id", c.linked_rfx); const fin = one(db, "negotiation_finalization", "rfx_id", c.linked_rfx);
  const stage = c.intake_status === "NEW" ? 0 : c.intake_status === "IN_REVIEW" ? (ra?.approved_flag ? 2 : 1) : c.intake_status === "APPROVED" ? 3 : 4;
  const validate = () => { mutate((d) => { d.contract_intake_requests = d.contract_intake_requests.map((x) => (x.contract_id === c.contract_id ? { ...x, intake_status: "IN_REVIEW", validated_by: "Laura Bennett", validated_at: nowTs() } : x)); }); push("Contract intake validated", "C1 complete — Legal now reviews risk (C2)."); };
  const acceptRisk = () => { mutate((d) => { d.contract_risk_assessment = d.contract_risk_assessment.map((x) => (x.contract_id === c.contract_id ? { ...x, approved_flag: 1, reviewed_by: "Laura Bennett", approved_by: "Laura Bennett", legal_risk_notes: x.legal_risk_notes.replace("Legal review pending.", "Legal review complete.") } : x)); if (!d.contract_documents.some((x) => x.contract_id === c.contract_id)) { const id = Math.max(...d.documents.map((x) => x.document_id)) + 1; d.documents = [...d.documents, { document_id: id, title: `${rfx?.title} – Draft ${c.contract_type}`, document_type: "CONTRACT_DRAFT", status: "ACTIVE", file_path: `/docs/contracts/${c.contract_id}/draft.docx`, file_name: `${c.contract_id}_draft.docx`, file_size_bytes: 1638400, created_by: "A9 Contract Drafting Agent", created_at: nowTs(), updated_at: nowTs(), deleted_at: null }]; d.contract_documents = [...d.contract_documents, { contract_id: c.contract_id, document_id: id, visibility: "INTERNAL", classification: "CONFIDENTIAL", created_at: nowTs() }]; } }); push("Residual risk accepted", "C2 complete — A9 drafted the contract into contract_documents (C3)."); };
  const approveStep = (id) => { mutate((d) => { d.contract_approvals = d.contract_approvals.map((a) => (a.approval_id === id ? { ...a, approval_status: "APPROVED", comments: a.comments || "Approved.", approved_at: nowTs() } : a)); if (d.contract_approvals.filter((a) => a.contract_id === c.contract_id).every((a) => a.approval_status === "APPROVED")) d.contract_intake_requests = d.contract_intake_requests.map((x) => (x.contract_id === c.contract_id ? { ...x, intake_status: "APPROVED" } : x)); }); push("Approved", "contract_approvals updated."); };
  return (
    <div>
      <div className="page-head"><Eyebrow activity="CLM · C1–C4" tables={["contract_intake_requests", "contract_risk_assessment", "contract_documents", "contract_approvals"]} agent="Agents A9 · A12" gotoTable={gotoTable} /><h2 className="page-title">New Contract Rollout</h2><p className="page-desc">The four contract tables in the ERD cover intake, risk, documents and approvals (C1–C4). Execution and obligation extraction (C5–C9) are not yet modelled — see the other CLM screens.</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}><label style={{ margin: 0 }}>Contract</label><select value={c.contract_id} onChange={(e) => setSel(e.target.value)} style={{ maxWidth: 420 }}>{ctrs.map((x) => <option key={x.contract_id} value={x.contract_id}>{x.contract_id} · {one(db, "rfx_events", "rfx_id", x.linked_rfx)?.title} · {nice(x.intake_status)}</option>)}</select><Badge s={c.intake_status} /></div>
      <Stepper steps={["C1 Intake validated", "C2 Risk assessed", "C3 Draft generated", "C4 Approvals", "Executed"]} current={stage} />
      <div className="rfp-columns">
        <div><div className="card rfp-card"><div className="rfp-card-title">Contract facts · <Ref t="contract_intake_requests" c="contract_id" v={c.contract_id} openRecord={openRecord} /></div>
          {[["Linked RFx", <Ref t="rfx_events" c="rfx_id" v={c.linked_rfx} openRecord={openRecord} />], ["Supplier", supName(db, fin?.supplier_id)], ["Type", c.contract_type], ["Value", fmtFull(c.contract_value)], ["Risk level", <Badge s={c.risk_level} />], ["Business owner", c.business_owner], ["Validated", c.validated_by ? `${c.validated_by} · ${c.validated_at}` : "—"]].map(([l, v]) => <div key={l} className="rfp-field-row"><span className="lbl">{l}</span><span className="val">{v}</span></div>)}
          {c.intake_status === "NEW" && can("LEGAL", "CONTRACTS") && <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={validate}>Validate intake (C1)</button>}</div>
          <div className="card rfp-card"><div className="rfp-card-title">Award facts handed off</div><p style={{ fontSize: 12.5, color: "var(--muted)" }}>{fin?.negotiation_summary}</p><button className="btn btn-ghost btn-sm" onClick={() => { setRfxId(c.linked_rfx); setPage("award"); }}>View award →</button></div></div>
        <div><div className="card rfp-card"><div className="rfp-card-title">Risk assessment · {ra?.risk_id}</div>{ra ? <><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><div className="ev-score-ring" style={{ background: `conic-gradient(${ra.risk_score > 50 ? "var(--red)" : ra.risk_score > 35 ? "var(--amber)" : "var(--emerald)"} ${ra.risk_score}%, #eef1f5 ${ra.risk_score}%)` }}><div className="hole">{Math.round(ra.risk_score)}<span className="t">risk</span></div></div><div style={{ fontSize: 12.5 }}>{P(ra.compliance_flags).map((f) => <div key={f}>⚑ {f}</div>)}</div></div><div className="rfp-field-row"><span className="lbl">Legal notes</span><span className="val" style={{ maxWidth: 260 }}>{ra.legal_risk_notes}</span></div><div className="rfp-field-row"><span className="lbl">Mitigation</span><span className="val" style={{ maxWidth: 260 }}>{ra.mitigation_plan}</span></div><div className="rfp-field-row"><span className="lbl">Accepted</span><span className="val">{ra.approved_flag ? `${ra.approved_by}` : <Badge s="PENDING" />}</span></div>{!ra.approved_flag && c.intake_status !== "NEW" && can("LEGAL") && <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={acceptRisk}>Accept residual risk as Legal (C2 · HITL-009)</button>}</> : <div className="muted">No assessment.</div>}</div>
          <div className="card rfp-card"><div className="rfp-card-title">Documents · contract_documents</div>{docs.map((d) => <div key={d.document_id} className="rfp-file-row"><span>📄</span><span className="name"><Ref t="documents" c="document_id" v={d.document_id} openRecord={openRecord}>{d.doc?.file_name}</Ref></span><span className="size">{d.classification}</span></div>)}{!docs.length && <div className="muted" style={{ fontSize: 12 }}>Draft is generated after risk acceptance.</div>}</div></div>
        <div><div className="card rfp-card"><div className="rfp-card-title">Approval chain · contract_approvals (C4 · HITL-010)</div><ol className="chain">{aps.map((a, i) => { const prevOk = i === 0 || aps[i - 1].approval_status === "APPROVED"; return <li key={a.approval_id}><div className="who">{a.approver_role}<span className="muted"> {a.approver_name}</span></div><Badge s={a.approval_status} />{a.approval_status === "PENDING" && prevOk && docs.length > 0 && can(...ctrRole[a.approver_role]) && <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => approveStep(a.approval_id)}>Approve</button>}<div className="muted">{a.comments || ""} {a.approved_at || ""}</div></li>; })}</ol>{!docs.length && <div className="muted" style={{ fontSize: 12 }}>Approvals unlock once a draft document exists.</div>}</div></div>
      </div>
    </div>);
}

/* ============================= CLM REGISTERS (proposed extension — not in ERD) ============================= */
const CLM_DEF = {
  nda: { title: "NDA Rollout", steps: ["N1 Request", "N2 Draft (A9)", "N3 Supplier review", "N4 Signature", "N5 Filed"], table: "nda_requests", cols: ["nda_id", "supplier_id", "purpose", "type", "status", "requested_by", "requested_at", "expiry_date"], agents: "A9 · A10 · A11 · A12 · A15" },
  renewal: { title: "Contract Renewal", steps: ["R1 Detect expiry", "R2 Performance review", "R3 Renegotiate", "R4 Approve", "R5 Execute"], table: "contract_renewals", cols: ["renewal_id", "contract_id", "supplier_id", "current_end_date", "notice_deadline", "proposed_term_years", "value_change_pct", "status", "owner"], agents: "A9 – A16" },
  amendment: { title: "Contract Amendment", steps: ["A1 Change request", "A2 Impact analysis", "A3 Draft amendment", "A4 Approve", "A5 Execute"], table: "contract_amendments", cols: ["amendment_id", "contract_id", "change_type", "description", "value_impact", "status", "requested_by", "requested_at"], agents: "A9 – A13 · A15 – A17" },
  obligation: { title: "Obligation Management", steps: ["O1 Extract (A14)", "O2 Assign owner", "O3 Monitor", "O4 Evidence", "O5 Escalate", "O6 Report", "O7 Close"], table: "contract_obligations", cols: ["obligation_id", "contract_id", "obligation_type", "description", "due_date", "owner", "frequency", "status", "evidence_document_id"], agents: "A14 – A17" },
  termination: { title: "Contract Termination", steps: ["T1 Trigger", "T2 Rights & notice check", "T3 Exit plan", "T4 Approve", "T5 Execute & archive"], table: "contract_terminations", cols: ["termination_id", "contract_id", "supplier_id", "reason", "notice_period_days", "effective_date", "exit_plan_status", "status", "approved_by"], agents: "A9 · A10 · A14 – A16" },
};
function seedExt(db) {
  if (db.__ext) return db.__ext;
  const ctr = db.contract_intake_requests[0]; const cid = ctr?.contract_id || "CTR-2026-001"; const sup = ctr ? db.negotiation_finalization.find((f) => f.rfx_id === ctr.linked_rfx)?.supplier_id : "SUP-002";
  return {
    nda: [{ nda_id: "NDA-2026-014", supplier_id: "SUP-011", purpose: "IFM Nordics RFQ – site data", type: "Mutual", status: "N3", requested_by: "Daniel Okafor", requested_at: "2026-08-20 10:00:00", expiry_date: "2028-08-20" }, { nda_id: "NDA-2026-015", supplier_id: "SUP-012", purpose: "Freight tender – volume data", type: "One-way", status: "N1", requested_by: "Daniel Okafor", requested_at: "2026-09-08 14:30:00", expiry_date: null }, { nda_id: "NDA-2026-011", supplier_id: "SUP-003", purpose: "Cloud migration – architecture", type: "Mutual", status: "N5", requested_by: "Sarah Jenkins", requested_at: "2026-07-22 09:15:00", expiry_date: "2028-07-22" }],
    renewal: [{ renewal_id: "REN-2026-003", contract_id: "CTR-2024-017", supplier_id: "SUP-004", current_end_date: "2026-12-31", notice_deadline: "2026-09-30", proposed_term_years: 2, value_change_pct: -6.5, status: "R3", owner: "Priya Nair" }, { renewal_id: "REN-2026-004", contract_id: "CTR-2023-041", supplier_id: "SUP-011", current_end_date: "2026-12-31", notice_deadline: "2026-10-01", proposed_term_years: 1, value_change_pct: 0, status: "R1", owner: "Daniel Okafor" }],
    amendment: [{ amendment_id: "AMD-2026-007", contract_id: cid, change_type: "Scope", description: "Add EMEA endpoint estate (2,400 devices) to L1 scope", value_impact: 186000, status: "A2", requested_by: "Priya Nair", requested_at: "2026-09-09 11:00:00" }],
    obligation: [{ obligation_id: "OBL-0001", contract_id: cid, obligation_type: "Reporting", description: "Monthly SLA report by 5th working day", due_date: "2026-10-07", owner: sup, frequency: "Monthly", status: "O3", evidence_document_id: null }, { obligation_id: "OBL-0002", contract_id: cid, obligation_type: "Compliance", description: "Annual ISO 27001 certificate evidence", due_date: "2027-01-31", owner: sup, frequency: "Annual", status: "O2", evidence_document_id: null }, { obligation_id: "OBL-0003", contract_id: cid, obligation_type: "Commercial", description: "Hypercare credits (8 weeks) applied on first invoice", due_date: "2026-11-30", owner: "Rachel Kim", frequency: "One-off", status: "O1", evidence_document_id: null }],
    termination: [{ termination_id: "TRM-2026-001", contract_id: "CTR-2022-009", supplier_id: "SUP-010", reason: "Convenience – consolidation into IFM framework", notice_period_days: 90, effective_date: "2026-12-31", exit_plan_status: "Drafted", status: "T3", approved_by: null }],
  };
}
function ClmRegister({ db, mutate, push, kind, openRecord, gotoTable, can }) {
  const def = CLM_DEF[kind]; const ext = seedExt(db); const rows = ext[kind];
  const [sel, setSel] = useState(rows[0]?.[def.cols[0]]);
  const row = rows.find((r) => r[def.cols[0]] === sel) || rows[0];
  const stageIdx = def.steps.findIndex((s) => s.startsWith(row?.status || "")); const cur = stageIdx < 0 ? 0 : stageIdx;
  const advance = () => { if (cur >= def.steps.length - 1) return; const next = def.steps[cur + 1].split(" ")[0]; mutate((d) => { d.__ext = { ...seedExt(d), [kind]: seedExt(d)[kind].map((r) => (r[def.cols[0]] === row[def.cols[0]] ? { ...r, status: next, ...(kind === "termination" && next === "T4" ? { approved_by: "Michael Chen" } : {}) } : r)) }; }); push(`Advanced to ${def.steps[cur + 1]}`, `${row[def.cols[0]]} updated in ${def.table} (extension register).`); };
  return (
    <div>
      <div className="page-head"><div className="page-eyebrow">CLM · {def.agents} · <span className="mono">{def.table}</span> <span className="badge closing" style={{ marginLeft: 6 }}>proposed extension — not in ERD v0723</span></div><h2 className="page-title">{def.title}</h2><p className="page-desc">The sales deck and requirements describe this lifecycle, but the ERD extract has no tables for it. This screen runs on a proposed <span className="mono">{def.table}</span> register so the flow can be demonstrated; the column set is the recommendation for the schema gap analysis.</p></div>
      <Stepper steps={def.steps} current={cur} />
      <div className="cc-layout" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>{def.title} register ({rows.length})</h3></div><div style={{ overflowX: "auto" }}><table><thead><tr>{def.cols.map((c) => <th key={c}>{nice(c)}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r[def.cols[0]]} className={r === row ? "sel" : ""} onClick={() => setSel(r[def.cols[0]])} style={{ cursor: "pointer" }}>{def.cols.map((c) => <td key={c}>{c === "supplier_id" || c === "owner" && /^SUP/.test(r[c]) ? <Ref t="supplier" c="supplier_id" v={r[c]} openRecord={openRecord}>{supName(db, r[c])}</Ref> : c === "contract_id" && db.contract_intake_requests.some((x) => x.contract_id === r[c]) ? <Ref t="contract_intake_requests" c="contract_id" v={r[c]} openRecord={openRecord} /> : c === "status" || c === "exit_plan_status" ? <Badge s={r[c]}>{r[c]}</Badge> : typeof r[c] === "number" ? (c.includes("pct") ? `${r[c]}%` : c.includes("impact") ? fmtFull(r[c]) : r[c]) : r[c] ?? "—"}</td>)}</tr>)}</tbody></table></div></div>
        <div><div className="card cc-side-card"><div className="cc-side-title">Selected · {row?.[def.cols[0]]}</div>{def.cols.slice(1).map((c) => <div key={c} className="rfp-field-row"><span className="lbl">{nice(c)}</span><span className="val" style={{ maxWidth: 200 }}>{String(row?.[c] ?? "—")}</span></div>)}<button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }} disabled={cur >= def.steps.length - 1 || !can("LEGAL", "CONTRACTS")} onClick={advance}>{cur >= def.steps.length - 1 ? "Complete" : `Advance to ${def.steps[cur + 1]}`}</button></div>
          <div className="card cc-side-card"><div className="cc-side-title">Proposed columns</div><div className="mono" style={{ fontSize: 11, lineHeight: 1.7 }}>{def.cols.map((c) => <div key={c}>{c}</div>)}</div></div></div>
      </div>
      {IS_V4 && <><div className="section-label" style={{ margin: "18px 0 8px" }}>Interactive workflow screens · {def.steps[0].split(" ")[0]}–{def.steps[1].split(" ")[0]} <span className="muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· AI agents registry, request → assessment flows</span></div><ClmLifecycleFrame kind={kind} db={db} /></>}
    </div>);
}

/* ============================= SUPPLIER PERFORMANCE ============================= */
function SupplierPerformance({ db, mutate, push, openRecord, gotoTable }) {
  const cards = db.supplier_scorecards.filter((s) => s.evaluation_period === "2026-Q2").sort((a, b) => b.overall_score - a.overall_score);
  const [sel, setSel] = useState(cards[0]?.supplier_id);
  const kpis = q(db, "supplier_kpi_metrics", "supplier_id", sel); const qbr = db.supplier_qbr_reviews.find((x) => x.supplier_id === sel); const plans = q(db, "supplier_improvement_plans", "supplier_id", sel);
  return (
    <div>
      <div className="page-head"><Eyebrow activity="SPM 1.0–6.0" tables={["supplier_kpi_metrics", "supplier_scorecards", "supplier_qbr_reviews", "supplier_improvement_plans"]} gotoTable={gotoTable} /><h2 className="page-title">Supplier Scorecards & QBR</h2><p className="page-desc">Ten weighted KPIs roll into a quarterly scorecard; QBRs and improvement plans hang off the result and feed back into supplier_agent_memory for the next sourcing event.</p></div>
      <div className="scorecards">{cards.map((s) => { const k = q(db, "supplier_kpi_metrics", "supplier_id", s.supplier_id); return <div key={s.scorecard_id} className={`card pad sc ${s.supplier_id === sel ? "on" : ""}`} onClick={() => setSel(s.supplier_id)} style={{ cursor: "pointer" }}><div className="sc-h"><b>{supName(db, s.supplier_id)}</b><Badge s={s.performance_status} /></div><div className="big mono">{s.overall_score}</div><div className="kpis">{k.map((x) => <div key={x.kpi_id} title={`${x.kpi_name}: target ${x.target_value}, actual ${x.actual_value}`}><i style={{ height: `${Math.max(4, x.calculated_score * 0.5)}px` }} className={x.calculated_score >= 95 ? "ok" : x.calculated_score >= 85 ? "warn" : "bad"}></i></div>)}</div><div className="muted" style={{ fontSize: 11.5 }}>{s.evaluation_period} · approved {s.approved_at?.slice(0, 10)}</div></div>; })}</div>
      {sel && <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>{supName(db, sel)} — KPI detail · supplier_kpi_metrics</h3></div><table><thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Variance</th><th>Weight</th><th>Score</th></tr></thead><tbody>{kpis.map((x) => <tr key={x.kpi_id}><td>{x.kpi_name}</td><td>{x.target_value}</td><td>{x.actual_value}</td><td style={{ color: x.variance < 0 && !/Defect|Response|Escalations|Cost/.test(x.kpi_name) ? "var(--red)" : "inherit" }}>{x.variance > 0 ? "+" : ""}{x.variance}</td><td>{x.weight}%</td><td style={{ fontWeight: 700 }}>{x.calculated_score}</td></tr>)}</tbody></table></div>
        <div><div className="card rfp-card"><div className="rfp-card-title">QBR · {qbr?.qbr_id}</div>{qbr ? <><p style={{ fontSize: 12.5 }}><b>Performance</b> {qbr.performance_summary}</p><p style={{ fontSize: 12.5 }}><b>Actions</b> {qbr.action_items}</p><p style={{ fontSize: 12.5 }}><b>Business feedback</b> {qbr.business_feedback}</p><div className="muted" style={{ fontSize: 11.5 }}>approved by {qbr.approved_by} · {qbr.approved_at}</div></> : <div className="muted">No QBR this period.</div>}</div>
          <div className="card rfp-card"><div className="rfp-card-title">Improvement plans</div>{plans.map((p) => <div key={p.plan_id} style={{ fontSize: 12.5, marginBottom: 8 }}><Badge s={p.status} /> <b>{p.plan_id}</b><div>{p.issue_identified}</div><div className="muted">{p.corrective_action} · due {p.target_date}</div></div>)}{!plans.length && <div className="muted" style={{ fontSize: 12 }}>None open.</div>}</div></div>
      </div>}
    </div>);
}

/* ============================= GOVERNANCE ============================= */
function Governance({ db, openRecord, gotoTable }) {
  return (
    <div>
      <div className="page-head"><Eyebrow activity="Cross-cutting" tables={["human_in_loop_controls", "agent_approval_routing_rules", "approver_availability_matrix"]} agent="A15" gotoTable={gotoTable} /><h2 className="page-title">HITL Gates & Routing</h2><p className="page-desc">Every agent decision passes a gate. Routing rules pick the persona by value and risk; the availability matrix picks the person (or delegate).</p></div>
      <div className="card" style={{ padding: 0, marginBottom: 16 }}><div className="rc-table-head"><h3>Gates · human_in_loop_controls</h3></div><table><thead><tr><th>Stage</th><th>Entity</th><th>Decision</th><th>Primary</th><th>Supporting</th><th>Flow</th><th>Override</th><th>Audit</th></tr></thead><tbody>{db.human_in_loop_controls.map((h) => <tr key={h.hitl_id}><td><b>{h.process_stage}</b><div className="mono muted" style={{ fontSize: 10.5 }}>{h.hitl_id}</div></td><td><TableLink t={h.entity_table} gotoTable={gotoTable} /></td><td>{h.decision_type}</td><td>{one(db, "personas_master", "persona_id", h.primary_persona)?.persona_name}</td><td className="muted">{P(h.supporting_personas).map((p) => one(db, "personas_master", "persona_id", p)?.persona_name).join(", ") || "—"}</td><td className="muted" style={{ fontSize: 12 }}>{h.approval_flow}</td><td>{h.override_allowed ? <span className="bool yes">allowed</span> : <span className="bool no">locked</span>}</td><td>{h.audit_required ? <span className="bool yes">required</span> : ""}</td></tr>)}</tbody></table></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DataTable db={db} t="agent_approval_routing_rules" rows={db.agent_approval_routing_rules} cols={["rule_id", "process_stage", "persona_id", "min_value_threshold", "max_value_threshold", "risk_level_criteria", "is_active"]} openRecord={openRecord} gotoTable={gotoTable} />
        <DataTable db={db} t="approver_availability_matrix" rows={db.approver_availability_matrix} cols={["user_id", "persona_id", "user_email", "current_active_assignments", "is_available", "delegated_user_id"]} openRecord={openRecord} gotoTable={gotoTable} />
      </div>
    </div>);
}


export default App;
