
const { useState, useEffect, useCallback, useMemo, useRef } = React;

/* ============================= DATABASE (52 tables) ============================= */
const STORAGE_KEY = "s2c-app-db";
const STATE_VERSION = 10;
const SESSION_KEY = "s2c-session";
const DEMO_PASSWORD = "Demo@1234";
const FLAGSHIP_RFX = "RFX-2026-0731-001";
const TODAY = "2026-09-11";

async function loadDb() {
  try {
    if (window.storage) {
      const r = await window.storage.get(STORAGE_KEY);
      if (r && r.value) { const p = JSON.parse(r.value); if (p && p.__version === STATE_VERSION && p.db && ALL_TABLES.every((t) => Array.isArray(p.db[t]))) return p.db; }
    }
  } catch (e) { /* seed */ }
  return buildDatabase(2026);
}
let saveTimer = null;
function saveDb(db) {
  if (!window.storage) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => { try { await window.storage.set(STORAGE_KEY, JSON.stringify({ __version: STATE_VERSION, db })); } catch (e) { console.error("save failed", e); } }, 400);
}

const DOMAINS = [
  { id: "intake", label: "Demand intake", agent: "A1", tables: ["intake_requests", "intake_scope_specs", "intake_strategy_governance", "intake_commercials_timelines", "intake_evaluation_weights", "intake_documents"] },
  { id: "supplier", label: "Supplier master", agent: "A2", tables: ["supplier", "supplier_classification", "supplier_esg_compliance", "supplier_external_enrichment", "supplier_risk_profile", "supplier_agent_memory", "supplier_services_profiles", "supplier_software_profiles", "supplier_product_profiles", "supplier_documents", "supplier_shortlisting"] },
  { id: "rfx", label: "RFx build & publish", agent: "A3 · A8", tables: ["rfx_events", "rfx_category", "rfx_requirements", "rfx_weight_configs", "rfx_draft_versions", "rfx_documents", "rfx_questions", "rfx_question_responses"] },
  { id: "bids", label: "Bid receipt & normalisation", agent: "A4", tables: ["bid_responses", "bid_line_items", "bid_exceptions", "bid_attachments", "rfx_response", "rfx_response_answers"] },
  { id: "eval", label: "Evaluation", agent: "A5", tables: ["agent_evaluations", "agent_assignment_evaluations", "rfx_assigned_approvers"] },
  { id: "nego", label: "Negotiation", agent: "A6", tables: ["negotiation_insights", "negotiation_finalization"] },
  { id: "award", label: "Award & handover", agent: "A7", tables: ["supplier_selection_decisions", "rfx_approvals"] },
  { id: "contract", label: "Contract", agent: "A9 · A12", tables: ["contract_intake_requests", "contract_risk_assessment", "contract_approvals", "contract_documents"] },
  { id: "spm", label: "Supplier performance", agent: "SPM", tables: ["supplier_kpi_metrics", "supplier_scorecards", "supplier_qbr_reviews", "supplier_improvement_plans"] },
  { id: "gov", label: "Governance", agent: "A15", tables: ["human_in_loop_controls", "agent_approval_routing_rules", "personas_master", "approver_availability_matrix", "compliance", "documents"] },
  { id: "iam", label: "Identity & access (extension)", agent: "SAP · RBAC", tables: ["sap_user_master", "platform_roles", "role_module_access", "intake_approvals"], ext: true },
  { id: "vm", label: "Vendor master import (extension)", agent: "XLSX → supplier", tables: ["vendor_master"], ext: true },
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
  role_id: ["platform_roles", "role_id"], approver_role_id: ["platform_roles", "role_id"], workflow_id: ["approval_workflows", "workflow_id"], PLATFORM_ROLE: ["platform_roles", "role_id"], approver_bname: ["sap_user_master", "BNAME"], MANAGER_BNAME: ["sap_user_master", "BNAME"],
};
const PK = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t, SCHEMA[t][0][0]]));
const ALL_TABLES = Object.keys(SCHEMA);

/* ============================= HELPERS ============================= */
const J = (v) => JSON.stringify(v);
const P = (s, d = []) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };
function fmtUsd(n) { if (n === null || n === undefined) return "—"; if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`; if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`; return `$${Number(n).toLocaleString()}`; }
function fmtFull(n) { return n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
function fmtDate(d) { if (!d) return "—"; return new Date(String(d).slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }); }
function nowTs() { return `${TODAY} ${new Date().toTimeString().slice(0, 8)}`; }
function daysUntil(d) { if (!d) return null; return Math.round((new Date(d + "T00:00:00Z") - new Date(TODAY + "T00:00:00Z")) / 86400000); }
function statusClass(s) { s = String(s || "").toUpperCase(); return { OPEN: "open", "CLOSING SOON": "closing", CLOSED: "closed", AWARDED: "awarded", DRAFT: "draft", EVALUATION: "evaluation", NEGOTIATION: "evaluation", APPROVED: "awarded", PENDING: "closing", PENDING_HITL: "closing", REJECTED: "closed", VERIFIED: "awarded", HIGH: "closed", MEDIUM: "closing", LOW: "awarded", NORMALIZED: "awarded", EXCEPTION_REVIEW: "closing", RESOLVED: "awarded", PUBLISHED: "awarded", ANSWERED: "awarded", SUBMITTED: "closing", IN_REVIEW: "closing", QUEUED: "draft", CONFIRMED: "awarded", ACTIVE: "awarded", EXPIRED: "closed", MEETS: "open", EXCEEDS: "awarded", NEEDS_IMPROVEMENT: "closed", IN_PROGRESS: "open", SUPERSEDED: "draft", UNDER_REVIEW: "closing", INTAKE: "draft", UNASSESSED: "draft", TAIL_SPEND: "draft" }[s] || "closed"; }
function nice(s) { return String(s ?? "").replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()); }
const Badge = ({ s, children, style }) => <span className={`badge ${statusClass(s)}`} style={style}>{children ?? nice(s)}</span>;

// db accessors
const q = (db, t, col, v) => db[t].filter((r) => r[col] === v);
const one = (db, t, col, v) => db[t].find((r) => r[col] === v);
const supName = (db, id) => one(db, "supplier", "supplier_id", id)?.name ?? id;
const rfxStatusLabel = (db, e) => { if (e.status === "OPEN") { const d = daysUntil(e.due_date); if (d !== null && d <= 7) return "Closing Soon"; } return nice(e.status); };
function displayStatus(db, e) { const l = rfxStatusLabel(db, e); return l; }

/* ============================= AI HELPER ============================= */
async function callClaudeJson(systemPrompt, userMessage, maxTokens = 3000) {
  // Published artifact: use the viewer-consented `sample` capability. Preview / file: direct API call.
  try {
    if (window.claude && typeof window.claude.use === "function") {
      const sample = await window.claude.use("sample");
      if (sample) return await sample.json(`${systemPrompt}\n\n---\n\n${userMessage}`, { cache: false });
    }
  } catch (e) { if (e && e.code === "not_granted") throw new Error("AI access was not granted for this page."); if (e && e.code === "rate_limited") throw new Error("AI is rate-limited right now; try again shortly."); if (e && e.code === "invalid_json") throw new Error("AI returned content that could not be parsed as JSON."); if (e && e.code) throw new Error(e.message || String(e.code)); }
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system: systemPrompt, messages: [{ role: "user", content: userMessage }] }) });
  if (!response.ok) { const t = await response.text().catch(() => ""); throw new Error(`AI request failed (${response.status}): ${t.slice(0, 200)}`); }
  const data = await response.json();
  const tb = (data.content || []).find((b) => b.type === "text");
  if (!tb) throw new Error("AI response did not contain text content.");
  const cleaned = tb.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try { return JSON.parse(cleaned); } catch { throw new Error("AI returned content that could not be parsed as JSON."); }
}

/* ============================= TOASTS ============================= */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((title, desc) => { const id = Date.now() + Math.random(); setToasts((t) => [...t, { id, title, desc }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600); }, []);
  return { toasts, push };
}

/* ============================= NAV ============================= */
const NAV_GROUPS = [
  { id: "home", label: "Home", subsections: [{ label: null, items: [{ id: "home", label: "My Workspace" }] }] },
  { id: "sourcing", label: "Autonomous Sourcing", top: { id: "sourcing-overview", label: "Autonomous Sourcing Overview" },
    subsections: [
      { label: "Activities", items: [
        { id: "command-center", idx: "00", label: "RFx Command Center" },
        { id: "demand-intake", idx: "01", label: "Demand Intake" },
        { id: "supplier-discovery", idx: "02", label: "Supplier Discovery" },
        { id: "rfx-creation-publish", idx: "03a", label: "RFx Creation and Publish" },
        { id: "quick-rfx-creation", idx: "03b", label: "Quick RFx Creation (AI)" },
        { id: "evaluation", idx: "04", label: "RFx Response Evaluation Analysis" },
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
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [rfxId, setRfxId] = useState(FLAGSHIP_RFX);
  const [collapsed, setCollapsed] = useState({});
  const [drawer, setDrawer] = useState(null);
  const [explorerTable, setExplorerTable] = useState("rfx_events");
  const { toasts, push } = useToasts();

  useEffect(() => { loadDb().then(async (d) => { setDb(d); try { if (window.storage) { const r = await window.storage.get(SESSION_KEY); if (r && r.value) { const u = d.sap_user_master.find((x) => x.BNAME === JSON.parse(r.value).bname); if (u) setUser(u); } } } catch (e) {} }); }, []);

  const mutate = useCallback((fn) => { setDb((prev) => { const next = { ...prev }; fn(next); saveDb(next); return next; }); }, []);
  const openRecord = useCallback((t, col, v) => { setDb((prev) => { const typed = typeof prev[t][0]?.[col] === "number" ? Number(v) : v; const rec = prev[t].find((r) => r[col] === typed); if (rec) setDrawer({ t, rec }); return prev; }); }, []);
  const gotoTable = (t) => { setExplorerTable(t); setPage("explorer"); setDrawer(null); };
  const reset = () => { const fresh = buildDatabase(2026); setDb(fresh); saveDb(fresh); setRfxId(FLAGSHIP_RFX); setDrawer(null); push("Data reset", "All tables regenerated from seed."); };
  const login = (u) => { setUser(u); setPage("home"); try { const p = window.storage && window.storage.set(SESSION_KEY, JSON.stringify({ bname: u.BNAME })); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
  const logout = () => { setUser(null); try { const p = window.storage && window.storage.delete(SESSION_KEY); if (p && p.catch) p.catch(() => {}); } catch (e) {} };

  if (!db) return <div className="loading-row">Loading S2C Platform…</div>;
  if (!user) return <LoginPage db={db} onLogin={login} />;

  const role = one(db, "platform_roles", "role_id", user.PLATFORM_ROLE);
  const access = Object.fromEntries(db.role_module_access.filter((r) => r.role_id === user.PLATFORM_ROLE).map((r) => [r.module_id, r.access_level]));
  const can = (...roles) => user.PLATFORM_ROLE === "ADMIN" || roles.includes(user.PLATFORM_ROLE);
  const level = (m) => access[m] || null;
  const visibleGroups = NAV_GROUPS.map((g) => ({ ...g, top: g.top && access[g.top.id] ? g.top : null, subsections: g.subsections.map((s) => ({ ...s, items: s.items.filter((i) => access[i.id]) })).filter((s) => s.items.length) })).filter((g) => g.top || g.subsections.length);
  const pageMeta = ALL_NAV_ITEMS.find((i) => i.id === page);
  const ctx = { db, mutate, push, setPage, rfxId, setRfxId, openRecord, gotoTable, setExplorerTable, explorerTable, user, role, can, level, logout };
  const rfx = one(db, "rfx_events", "rfx_id", rfxId) || db.rfx_events[0];
  const toggleGroup = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const total = ALL_TABLES.reduce((a, t) => a + db[t].length, 0);
  const allowed = !!access[page];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-head"><div className="logo"></div><span>S2C Platform</span></div>
        {visibleGroups.map((group) => (
          <div key={group.id}>
            <div className="nav-group-head" onClick={() => toggleGroup(group.id)}><span>{group.label}</span><span>{collapsed[group.id] ? "›" : "⌄"}</span></div>
            {!collapsed[group.id] && (<>
              {group.top && <div className="nav-section"><a className={`nav-item nav-top ${page === group.top.id ? "active" : ""}`} onClick={() => setPage(group.top.id)}><span>{group.top.label}</span></a></div>}
              {group.subsections.map((sub, si) => (
                <div className="nav-section" key={si}>
                  {sub.label && <div className="nav-heading">{sub.label}</div>}
                  {sub.items.map((item) => <a key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>{item.idx && <span className="idx">{item.idx}</span>}<span>{item.label}</span>{access[item.id] === "VIEW" && <span className="nav-view" title="view only">👁</span>}</a>)}
                </div>))}
            </>)}
          </div>))}
        <div className="side-foot"><div className="mono" style={{ fontSize: 10.5 }}>{ALL_TABLES.length} tables · {total.toLocaleString()} rows</div>{can("ADMIN") && <button className="btn btn-ghost btn-sm side-reset" onClick={reset}>Reset simulated data</button>}</div>
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
          {!allowed && <div className="card placeholder-card"><div className="icon">🔒</div><h3>No access to this module</h3><p style={{ fontSize: 13 }}>Your role ({role.role_name}) is not granted <span className="mono">{page}</span>. Ask an administrator in Roles &amp; Permissions.</p></div>}
          {allowed && page === "home" && <HomePage {...ctx} />}
          {allowed && page === "roles-permissions" && <RolesPermissions {...ctx} />}
          {allowed && page === "workflow-config" && <WorkflowConfig {...ctx} />}
          {allowed && ["user-management", "agent-processing", "template-management", "audit-logs", "settings"].includes(page) && <ComingSoon id={page} label={pageMeta?.label} />}
          {allowed && page === "sourcing-overview" && <SourcingOverview {...ctx} />}
          {allowed && page === "command-center" && <CommandCenter {...ctx} />}
          {allowed && page === "demand-intake" && <DemandIntake {...ctx} />}
          {allowed && page === "supplier-discovery" && <SupplierDiscovery {...ctx} />}
          {allowed && page === "rfx-creation-publish" && <RfxCreationPublish {...ctx} />}
          {allowed && page === "quick-rfx-creation" && <QuickRfxCreation {...ctx} />}
          {allowed && page === "evaluation" && <RfxEvaluationAnalysis {...ctx} />}
          {allowed && page === "negotiation" && <Negotiation {...ctx} />}
          {allowed && page === "award" && <Award {...ctx} />}
          {allowed && page === "qna" && <QnA {...ctx} />}
          {allowed && page === "approvals" && <Approvals {...ctx} />}
          {allowed && page === "faq" && <FaqCenter {...ctx} />}
          {allowed && page === "rfp-workflow-status" && <WorkflowStatus {...ctx} />}
          {allowed && page === "new-contract-rollout" && <NewContractRollout {...ctx} />}
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
        <tbody>{rows.length ? rows.map((r, i) => <tr key={r[PK[t]] ?? i}>{cols.map((c) => <td key={c}><Cell db={db} t={t} col={c} v={r[c]} openRecord={openRecord} /></td>)}</tr>) : <tr><td colSpan={cols.length} className="empty">{empty || "No rows yet for this stage."}</td></tr>}</tbody>
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
        <h4>Linked records <span className="count">{related.reduce((a, r) => a + r.rows.length, 0)}</span></h4>
        {related.length ? related.map((r) => (
          <div className="rel" key={r.table + r.col}><div className="rel-h"><TableLink t={r.table} gotoTable={gotoTable} /> <span className="muted">via {r.col} · {r.rows.length}</span></div>
            <ul>{r.rows.slice(0, 8).map((row) => <li key={row[PK[r.table]]}><Ref t={r.table} c={PK[r.table]} v={row[PK[r.table]]} openRecord={openRecord} /> <span className="muted">{summary(r.table, row)}</span></li>)}{r.rows.length > 8 && <li className="muted">+{r.rows.length - 8} more</li>}</ul></div>))
          : <p className="muted">Nothing references this record yet.</p>}
      </div>
    </aside>);
}

/* ============================= TABLE EXPLORER ============================= */
function download(name, content, mime) { const b = new Blob([content], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 500); }
function toSQL(db, t) { const cols = SCHEMA[t].map((c) => c[0]); const lit = (v) => v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`; if (!db[t].length) return `-- ${t}: no rows`; return `-- ${t} (${db[t].length} rows)\nINSERT INTO ${t} (${cols.join(", ")}) VALUES\n${db[t].map((r) => "  (" + cols.map((c) => lit(r[c])).join(", ") + ")").join(",\n")};`; }

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
          <button className="btn btn-ghost btn-sm" onClick={() => { const cs = cols.map((c) => c[0]); const qv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`; download(`${t}.csv`, [cs.join(","), ...db[t].map((r) => cs.map((c) => qv(r[c])).join(","))].join("\n"), "text/csv"); }}>CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${t}.sql`, toSQL(db, t), "text/plain")}>SQL</button>
          <button className="btn btn-primary btn-sm" onClick={() => { download("s2c_all_tables.sql", ALL_TABLES.map((x) => toSQL(db, x)).join("\n\n"), "text/plain"); push("Exported", "All 52 tables written to s2c_all_tables.sql"); }}>Export all 52 as SQL</button>
        </div>
        <DataTable db={db} t={t} rows={rows} openRecord={openRecord} compact={false} footer={false} empty={`No rows match "${search}".`} />
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Rows {rows.length} of {db[t].length}. Click any identifier to open the record and every row linked to it.</div>
      </div>
    </div>);
}

function DomainMap({ db, gotoTable }) {
  const LIFE = [["Identity & Access (extension)", "—", "SAP · RBAC", "iam"], ["Vendor Master import (extension)", "—", "XLSX", "vm"], ["Demand Intake", "S1–S2", "A1", "intake"], ["Supplier Discovery", "S3–S4", "A2", "supplier"], ["RFx Build & Publish", "S5–S6", "A3 · A8", "rfx"], ["Bid Receipt", "S7", "A4", "bids"], ["Evaluation", "S8", "A5", "eval"], ["Negotiation", "S9–S10", "A6", "nego"], ["Award & Handover", "S11–S12", "A7", "award"], ["New Contract (C1–C4)", "C1–C4", "A9 · A12", "contract"], ["Supplier Performance", "1.0–6.0", "SPM", "spm"], ["Governance (all)", "—", "A15", "gov"]];
  return (
    <div>
      <div className="page-head"><div className="page-eyebrow">ERR schema · 52 tables · 467 columns · plus 4 extension tables (identity & intake approvals)</div><h2 className="page-title">Domain Map & Coverage</h2><p className="page-desc">Lifecycle → tables → owning agent, with live row counts. Anything not in the ERD (NDA, Renewal, Amendment, Obligation, Termination) is flagged as a proposed extension in the CLM screens.</p></div>
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
    const u = db.sap_user_master.find((x) => x.SMTP_ADDR.toLowerCase() === email.trim().toLowerCase());
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
          <div className="login-eyebrow">Autonomous Source-to-Contract</div>
          <h1>Sourcing that runs itself,<br/>governed by the people who own it.</h1>
          <p>A multi-agent orchestration takes a request from intake to signed contract. Every decision that matters — shortlist, publish, negotiate, award — stops at a named human first.</p>
          <div className="login-stats">
            <div><b>{db.rfx_events.length}</b><span>live RFx events</span></div>
            <div><b>{db.supplier.length}</b><span>suppliers on panel</span></div>
            <div><b>{ALL_TABLES.length}</b><span>governed tables</span></div>
            <div><b>{db.human_in_loop_controls.length}</b><span>human gates</span></div>
          </div>
        </div>
        <div className="login-lanes">
          {["Intake", "Discover", "Build RFx", "Ingest bids", "Evaluate", "Negotiate", "Award", "Contract"].map((l, i) => <React.Fragment key={l}><div className="lane-node"><span className="mono">{String(i + 1).padStart(2, "0")}</span>{l}</div>{i < 7 && <div className="lane-link"></div>}</React.Fragment>)}
        </div>
      </div>
      <div className="login-right">
        <div className="login-card" onKeyDown={(e) => { if (e.key === "Enter") submit(); }}>
          <h2>Sign in</h2>
          <p className="muted">Identity is resolved against the SAP user master (<span className="mono">sap_user_master</span>); your platform role decides what you see.</p>
          <label>User ID</label>
          <input type="text" placeholder="name@s2c.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <div className="login-err">{err}</div>}
          <button className="btn btn-primary login-btn" type="button" onClick={() => submit()} disabled={busy}>{busy ? "Resolving identity…" : "Sign in"}</button>
          <div className="login-hint">Demo password for every account: <span className="mono">{DEMO_PASSWORD}</span></div>
          <div className="login-divider"><span>or sign in as a persona profile</span></div>
          <div className="persona-grid">
            {roles.map((r) => { const u = db.sap_user_master.find((x) => x.PLATFORM_ROLE === r.role_id); if (!u) return null; return (
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
              {mine.map((r) => { const ch = q(db, "intake_approvals", "request_id", r.request_id).sort((a, b) => a.approval_sequence - b.approval_sequence); const e = r.linked_RFx ? one(db, "rfx_events", "rfx_id", r.linked_RFx) : null; return (
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
  const roles = db.platform_roles; const users = (rid) => db.sap_user_master.filter((u) => u.PLATFORM_ROLE === rid);
  const mods = (rid) => db.role_module_access.filter((r) => r.role_id === rid);
  const ALLM = ALL_NAV_ITEMS.map((i) => i.id);
  const toggle = (rid, mid) => { if (!can("ADMIN")) { push("Read only", "Only Admins can change permissions."); return; } mutate((d) => { const ex = d.role_module_access.find((r) => r.role_id === rid && r.module_id === mid); if (!ex) d.role_module_access = [...d.role_module_access, { role_id: rid, module_id: mid, access_level: "VIEW" }]; else if (ex.access_level === "VIEW") d.role_module_access = d.role_module_access.map((r) => (r === ex ? { ...r, access_level: "EDIT" } : r)); else if (ex.access_level === "EDIT") d.role_module_access = d.role_module_access.map((r) => (r === ex ? { ...r, access_level: "APPROVE" } : r)); else d.role_module_access = d.role_module_access.filter((r) => r !== ex); }); };
  const exportCsv = () => { const rows = [["role_id", "role_name", "module_id", "access_level"], ...db.role_module_access.map((r) => [r.role_id, one(db, "platform_roles", "role_id", r.role_id)?.role_name, r.module_id, r.access_level])]; download("roles_permissions.csv", rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n"), "text/csv"); push("Exported", "roles_permissions.csv"); };
  const selRole = sel ? one(db, "platform_roles", "role_id", sel) : null;
  return (
    <div>
      <div className="rp-head"><div><h2 className="page-title" style={{ fontSize: 26 }}>Roles &amp; Permissions</h2><p className="page-desc">Configure access rights and permissions for user roles. Users come from the SAP user master; roles decide which modules they see and whether they can view, edit or approve.</p></div><button className="btn btn-ghost" onClick={exportCsv}>⬇ Export</button></div>
      <div className="rp-grid">{roles.map((r) => <div key={r.role_id} className={`card rp-card ${sel === r.role_id ? "on" : ""}`} onClick={() => setSel(sel === r.role_id ? null : r.role_id)}><span className="shield lg" style={{ background: r.color_hex }}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/></svg></span><h3>{r.role_name}</h3><p>{r.description}</p><div className="rp-meta"><span>👥 {users(r.role_id).length} users</span><b>{mods(r.role_id).length} modules</b></div></div>)}</div>
      {selRole && (
        <div className="rp-detail">
          <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Users · sap_user_master · {selRole.role_name}</h3><span className="muted" style={{ fontSize: 12 }}>MANDT 100</span></div>
            <table><thead><tr><th>BNAME</th><th>Name</th><th>PERSNO</th><th>ORGEH</th><th>KOSTL</th><th>WERKS</th><th>PLANS</th><th>Manager</th><th>Valid to</th></tr></thead><tbody>{users(selRole.role_id).map((u) => <tr key={u.BNAME}><td><Ref t="sap_user_master" c="BNAME" v={u.BNAME} openRecord={openRecord} /></td><td>{u.NAME_FIRST} {u.NAME_LAST}<div className="muted" style={{ fontSize: 11 }}>{u.SMTP_ADDR}</div></td><td className="mono">{u.PERSNO}</td><td>{u.ORGEH}</td><td className="mono">{u.KOSTL}</td><td className="mono">{u.WERKS}</td><td>{u.PLANS}</td><td className="mono">{u.MANAGER_BNAME || "—"}</td><td className="mono">{u.GLTGB}</td></tr>)}</tbody></table></div>
          <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Module access · role_module_access</h3><span className="muted" style={{ fontSize: 12 }}>{can("ADMIN") ? "click a cell to cycle none → view → edit → approve" : "read only"}</span></div>
            <div className="rp-matrix">{ALLM.map((m) => { const a = mods(selRole.role_id).find((x) => x.module_id === m); const lvl = a?.access_level; return <div key={m} className={`rp-cell ${lvl ? lvl.toLowerCase() : "none"}`} onClick={() => toggle(selRole.role_id, m)}><span className="mono">{m}</span><span className="lv">{lvl ? lvl.toLowerCase() : "—"}</span></div>; })}</div></div>
        </div>)}
      <div className="rp-detail" style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 0 }}><div className="rc-table-head"><h3>Approval routing by role</h3></div><table><thead><tr><th>Gate</th><th>Sequence</th><th>Roles that can act</th></tr></thead><tbody>{[["Intake approval", "Procurement → Finance → Legal", "Procurement Manager / Head → Finance → Legal"], ["Shortlist confirm", "single", "Procurement Manager / Head"], ["RFx draft approval", "single", "Legal"], ["Publish RFx", "single", "Procurement Manager / Head / Team"], ["Bid exception", "single", "Procurement Team / Manager"], ["Confirm ranking", "single", "Procurement Manager / Head"], ["Negotiation envelope", "single", "Finance"], ["Finalise negotiation", "single", "Negotiation / Procurement"], ["Award", "Business → Finance → Legal → CPO", "Business Manager → Finance → Legal → Procurement Head"], ["Contract sign-off", "Legal → Finance → CPO", "Legal / Contracts → Finance → Procurement Head"]].map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div>
        <DataTable db={db} t="sap_user_master" rows={db.sap_user_master} cols={["BNAME", "NAME_FIRST", "NAME_LAST", "PLATFORM_ROLE", "ORGEH", "PLANS", "MANAGER_BNAME"]} openRecord={openRecord} gotoTable={gotoTable} />
      </div>
    </div>);
}

const roleCanAct = (can, roleId) => roleId === "PROC_MGR" ? can("PROC_MGR", "PROC_HEAD") : can(roleId);
function buildIntakeChain(d, requestId) {
  const chainUsers = { Procurement: d.sap_user_master.find((u) => u.PLATFORM_ROLE === "PROC_MGR")?.BNAME, Finance: d.sap_user_master.find((u) => u.PLATFORM_ROLE === "FINANCE")?.BNAME, Legal: d.sap_user_master.find((u) => u.PLATFORM_ROLE === "LEGAL")?.BNAME };
  let seq = d.intake_approvals.length;
  return ["Procurement", "Finance", "Legal"].map((r, k) => ({ approval_id: `IAP-${String(++seq).padStart(3, "0")}`, request_id: requestId, approval_sequence: k + 1, approver_role: r, role_id: { Procurement: "PROC_MGR", Finance: "FINANCE", Legal: "LEGAL" }[r], approver_bname: chainUsers[r], approval_status: k === 0 ? "PENDING" : "QUEUED", comments: null, approved_at: null }));
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
const CB_LABEL = { category: "Category", requestType: "Request type", procurementType: "Procurement type", priority: "Priority", requirementDescription: "Requirement", businessOutcome: "Business outcome", impactIfNotProcured: "Impact if not procured", scopeDescription: "Scope", deliverables: "Deliverables", geographyCoverage: "Geography", transitionRequirement: "Transition", specificationType: "Spec type", complianceRequirements: "Compliance", dataSecurity: "Data security", esgRequirement: "ESG", approvedBudget: "Budget", currency: "Currency", capexOpex: "Capex / Opex", costCenter: "Cost center", rfpIssueDate: "RFP issue date", awardDate: "Award date", serviceStartDate: "Service start", incumbentSupplier: "Incumbent", suggestedSuppliers: "Suggested suppliers", sourcingApproach: "Approach", contractType: "Contract type", duration: "Duration (yrs)", paymentTerms: "Payment terms (days)" };
const lbl = (f) => CB_LABEL[f] || nice(f);
const CB_CHIPS = { need: ["24×7 managed infrastructure support", "SaaS licences renewal", "Facilities management for our offices", "It's high priority — contract expires Q4"], scope: ["L1–L3 support, monitoring and patching", "India, US and UK", "6-week transition from incumbent"], specs: ["ISO 27001 and SOC 2 required", "Data must stay in-region", "EcoVadis score ≥ 45"], budget: ["USD 1.2M approved, Opex", "Around 500K, Capex"], timeline: ["Service start 1 January 2027", "Award by end of November"], supplier: ["Incumbent is TCS", "Invite Accenture and Infosys too", "3-year MSA, Net 45"] };

function IntakeChatbot({ db, mutate, push, user, actor, form, setForm, onSubmitted }) {
  const [step, setStep] = useState(1);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const bodyRef = useRef(null);
  const sec = CB_SECTIONS[step];
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  useEffect(() => { setMsgs([{ role: "bot", text: actor && actor.BNAME !== user.BNAME ? `Raising on behalf of ${user.NAME_FIRST} ${user.NAME_LAST} (${user.ORGEH}). ${CB_SECTIONS[1].opener}` : `Hi ${user.NAME_FIRST}. Your details are in from SAP (${user.ORGEH}, ${user.KOSTL}). ${CB_SECTIONS[1].opener}` }]); }, []);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, busy]);
  const pct = Math.round((step / (CB_SECTIONS.length - 1)) * 100);
  const missing = (s) => s.fields.filter((f) => form[f] === "" || form[f] === null || form[f] === undefined);

  const fallbackExtract = (text, s) => { // offline heuristic so the demo never stalls
    const out = {}; const t = text; const lower = t.toLowerCase();
    const money = t.match(/(?:usd|\$|eur|€)?\s*([\d.,]+)\s*(m|million|k|thousand)?/i);
    if (s.id === "budget" && money) { let n = parseFloat(money[1].replace(/,/g, "")); if (/m/i.test(money[2] || "")) n *= 1e6; if (/k|thousand/i.test(money[2] || "")) n *= 1e3; if (n > 1000) out.approvedBudget = Math.round(n); if (/capex/i.test(lower)) out.capexOpex = "CAPEX"; if (/opex/i.test(lower)) out.capexOpex = "OPEX"; const cc = t.match(/CC-\d{4}/i); if (cc) out.costCenter = cc[0].toUpperCase(); }
    if (s.id === "need") { if (/critical/.test(lower)) out.priority = "CRITICAL"; else if (/high|urgent/.test(lower)) out.priority = "HIGH"; else if (/low/.test(lower)) out.priority = "LOW"; if (/cloud|aws|azure/.test(lower)) out.category = "Cloud Infrastructure"; else if (/saas|software|licen/.test(lower)) out.category = "Software & SaaS"; else if (/facilit|cleaning|office/.test(lower)) out.category = "Facilities Management"; else if (/freight|logistic|shipping/.test(lower)) out.category = "Logistics & Freight"; else if (/hardware|laptop|device/.test(lower)) out.category = "IT Hardware"; else if (/advis|consult/.test(lower)) out.category = "Professional Services"; else if (/it|infra|support|network/.test(lower)) out.category = "IT Services"; if (!form.requirementDescription) out.requirementDescription = t; else if (!form.businessOutcome) out.businessOutcome = t; else out.impactIfNotProcured = t; }
    if (s.id === "scope") { const geos = ["India", "United States", "United Kingdom", "Germany", "Sweden", "Netherlands", "France", "Singapore"].filter((g) => lower.includes(g.toLowerCase()) || (g === "United States" && /\bus\b|usa/.test(lower)) || (g === "United Kingdom" && /\buk\b/.test(lower))); if (geos.length) out.geographyCoverage = geos.join(", "); if (/transition|week/.test(lower)) out.transitionRequirement = t; else if (!form.scopeDescription) out.scopeDescription = t; else out.deliverables = t; }
    if (s.id === "specs") { const stds = ["ISO 27001", "SOC 2", "GDPR", "HIPAA", "PCI DSS", "ISO 14001", "ISO 9001"].filter((x) => lower.replace(/\s/g, "").includes(x.toLowerCase().replace(/\s/g, ""))); if (stds.length) out.complianceRequirements = stds.join(", "); if (/region|resid|pii|data/.test(lower)) out.dataSecurity = t; if (/ecovadis|esg|emission|sustain/.test(lower)) out.esgRequirement = t; if (!Object.keys(out).length) out.specificationType = t; }
    if (s.id === "timeline") { const iso = t.match(/\d{4}-\d{2}-\d{2}/g) || []; const key = /start/.test(lower) ? "serviceStartDate" : /award/.test(lower) ? "awardDate" : "rfpIssueDate"; if (iso[0]) out[key] = iso[0]; else { const d = Date.parse(t.replace(/(\d+)(st|nd|rd|th)/, "$1")); if (!isNaN(d)) out[key] = new Date(d).toISOString().slice(0, 10); } }
    if (s.id === "supplier") { const names = db.supplier.filter((x) => lower.includes(x.name.toLowerCase().split(" ")[0].toLowerCase())).map((x) => x.name); const incM = lower.match(/(?:incumbent|current(?:ly)?(?: supplier)?)\s*(?:is|:|-)?\s*([a-z]+)/); const inc = incM ? names.find((n) => n.toLowerCase().startsWith(incM[1])) : null; if (inc) out.incumbentSupplier = inc; const rest = names.filter((n) => n !== inc); if (rest.length) out.suggestedSuppliers = rest.join(", "); const yrs = t.match(/(\d+)\s*-?\s*year/i); if (yrs) out.duration = Number(yrs[1]); const net = t.match(/net\s*(\d+)/i); if (net) out.paymentTerms = Number(net[1]); if (/rfq/i.test(t)) out.sourcingApproach = "RFQ"; if (/rfi/i.test(t)) out.sourcingApproach = "RFI"; if (/msa/i.test(t)) out.contractType = "Master Services Agreement"; if (/sow|statement of work/i.test(t)) out.contractType = "Statement of Work"; }
    return out;
  };

  const send = async (textArg) => {
    const text = (textArg ?? input).trim(); if (!text || busy) return;
    setInput(""); setMsgs((m) => [...m, { role: "user", text }]); setBusy(true);
    const s = CB_SECTIONS[step]; let extracted = {}, reply = null, complete = false;
    if (!offline) {
      try {
        const sys = `You are the Procurement Intake Assistant for an enterprise Source-to-Contract platform. You are capturing section "${s.title}" of a sourcing request through conversation. Extract structured values from the user's latest message into these fields: ${s.fields.map((f) => `${f} (${CB_FIELD_HELP[f] || "free text"})`).join("; ")}. Current captured values: ${JSON.stringify(Object.fromEntries(s.fields.map((f) => [f, form[f]])))}. Rules: only set fields the user actually gave or clearly implied; keep free-text fields concise (1-2 sentences, in the user's words); dates as YYYY-MM-DD (today is ${TODAY}); numbers as numbers. Then write the reply: ONE short sentence, at most 12 words, no preamble, no restating what the user said — just ask for the single most important missing field (e.g. "Got it. Expected business outcome?"). If every field is captured or the user says to move on, set section_complete true and reply with 2-3 words (e.g. "Captured."). Respond with ONLY JSON: {"extracted": {...}, "reply": "...", "section_complete": true|false}`;
        const parsed = await callClaudeJson(sys, text, 800);
        extracted = parsed.extracted || {}; reply = parsed.reply; complete = !!parsed.section_complete;
      } catch (e) { setOffline(true); push("AI unavailable — continuing in guided mode", e.message.slice(0, 120)); }
    }
    if (!reply) { extracted = fallbackExtract(text, s); const left = missing(s).filter((f) => !(f in extracted)); const skip = /move on|next|skip|that's all|done/i.test(text); complete = skip || left.length === 0; reply = complete ? "Captured." : left.length ? `${Object.keys(extracted).length ? "Got it. " : ""}${lbl(left[0])}?` : "Noted."; }
    if (Object.keys(extracted).length) set(extracted);
    const stillMissing = missing(s).filter((f) => !(f in extracted) || extracted[f] === "" || extracted[f] == null);
    if (!complete && stillMissing.length === 0) complete = true;
    if (complete) {
      const next = CB_SECTIONS[step + 1];
      setMsgs((m) => [...m, { role: "bot", text: next.id === "review" ? "All set — review and submit below." : `✓ ${s.title}. ${next.opener}` }]);
      setStep(step + 1);
    } else setMsgs((m) => [...m, { role: "bot", text: reply }]);
    setBusy(false);
  };
  const skipSection = () => { const next = CB_SECTIONS[step + 1]; setMsgs((m) => [...m, { role: "bot", text: next.id === "review" ? "Review and submit below." : next.opener }]); setStep(step + 1); };
  const submit = () => {
    const bu = user.ORGEH; let first = "Procurement", n = 3;
    mutate((d) => { writeIntake(d, { ...form, businessUnit: bu }, "UNDER_REVIEW"); const chain = buildIntakeChain(d, form.requestId); first = chain[0]?.approver_role; n = chain.length; d.intake_approvals = [...d.intake_approvals.filter((a) => a.request_id !== form.requestId), ...chain]; });
    push("Request submitted", `${form.requestId} written to the intake tables and routed to ${first} (step 1 of ${n}).`); onSubmitted();
  };
  const Field = ({ k, label, type = "text", options }) => <div><label>{label}</label>{options ? <select value={form[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })}>{options.map((o) => <option key={o} value={o}>{o || "None"}</option>)}</select> : <input type={type} value={form[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })} />}</div>;
  return (
    <div className="pa-layout">
      <div>
        <div className="card pa-card"><div className="pa-side-head">Procurement Assistant</div><div className="pa-side-sub">{offline ? "Guided mode (AI offline)" : "Live AI · Claude"}</div></div>
        <div className="card pa-progress-card"><div className="pa-progress-title">Intake in progress</div><div className="pa-progress-row"><ProgressRing pct={pct} /><div><div className="pa-progress-step">Step {step + 1} of {CB_SECTIONS.length}</div><div className="pa-progress-time">⏱ Estimated time: 5-8 min</div></div></div><div className="pa-progress-track"><div className="pa-progress-fill" style={{ width: `${pct}%` }}></div></div></div>
        <div className="card pa-card"><div className="pa-sections-title">Intake sections</div>{CB_SECTIONS.map((s, i) => <div key={s.id} className={`pa-section-item ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} onClick={() => i <= step && setStep(i)}><span className="pa-section-icon">{i < step ? "✓" : ""}</span>{s.title}{i === 0 && <span className="muted" style={{ marginLeft: "auto", fontSize: 10.5 }}>from SAP</span>}</div>)}</div>
      </div>
      <div className="pa-chat-panel">
        <div className="pa-chat-head"><h3>{form.requestId}</h3><span className="muted" style={{ fontSize: 12 }}>Section: <b>{sec.title}</b></span></div>
        <div className="pa-chat-body" ref={bodyRef}>
          {msgs.map((m, i) => m.role === "bot" ? <div key={i} className="pa-msg"><div className="pa-avatar">🤖</div><div><div className="pa-bubble">{m.text}</div></div></div> : <div key={i} className="pa-msg user"><div><div className="pa-bubble user">{m.text}</div></div><div className="pa-avatar user">{user.NAME_FIRST[0]}</div></div>)}
          {busy && <div className="pa-msg"><div className="pa-avatar">🤖</div><div className="pa-bubble typing"><span></span><span></span><span></span></div></div>}
          {sec.id === "review" && <div className="pa-step-card"><h4>Review &amp; submit</h4><div className="kv" style={{ gridTemplateColumns: "150px 1fr" }}>{[["Requestor", `${form.requestorName} · ${form.employeeId} · ${user.ORGEH}`], ["Category", `${form.category} · ${form.procurementType} · ${form.priority}`], ["Need", form.requirementDescription], ["Outcome", form.businessOutcome], ["Scope", form.scopeDescription], ["Geography", form.geographyCoverage], ["Compliance", form.complianceRequirements], ["Budget", `${form.currency} ${Number(form.approvedBudget || 0).toLocaleString()} · ${form.capexOpex} · ${form.costCenter}`], ["Timeline", `issue ${form.rfpIssueDate || "—"} · award ${form.awardDate || "—"} · start ${form.serviceStartDate || "—"}`], ["Suppliers", `${form.incumbentSupplier || "no incumbent"} · ${form.suggestedSuppliers || "—"}`], ["Contract", `${form.sourcingApproach} · ${form.contractType} · ${form.duration} yr · Net ${form.paymentTerms}`]].map(([k, v]) => <React.Fragment key={k}><div className="k">{k}</div><div className="v">{v || <span className="muted">—</span>}</div></React.Fragment>)}</div><div style={{ display: "flex", gap: 8, marginTop: 14 }}><button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Edit via chat</button><button className="btn btn-primary" onClick={submit} disabled={!form.requirementDescription}>Submit for approval →</button></div><div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>Routes to Procurement → Finance → Legal (intake_approvals). Writes 5 intake tables.</div></div>}
        </div>
        {sec.id !== "review" && <>
          <div className="pa-chips-row">{(CB_CHIPS[sec.id] || []).map((c) => <button key={c} className="pa-chip" onClick={() => send(c)} disabled={busy}>{c}</button>)}<button className="pa-chip ghost" onClick={skipSection} disabled={busy}>Skip section →</button></div>
          <div className="pa-chat-input-row"><input type="text" placeholder={`Tell me about the ${sec.title.toLowerCase()}…`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={busy} /><button className="pa-send-btn" onClick={() => send()} disabled={busy}>➤</button></div></>}
      </div>
      <div>
        <div className="pa-tips-card"><div className="pa-tips-title">👤 Requestor (from SAP)</div><div className="kv" style={{ gridTemplateColumns: "80px 1fr", fontSize: 12 }}><div className="k">Name</div><div className="v">{user.NAME_FIRST} {user.NAME_LAST}</div><div className="k">PERSNO</div><div className="v mono">{user.PERSNO}</div><div className="k">Org unit</div><div className="v">{user.ORGEH}</div><div className="k">Cost center</div><div className="v mono">{user.KOSTL}</div><div className="k">Location</div><div className="v">{user.WERKS}</div><div className="k">Manager</div><div className="v mono">{user.MANAGER_BNAME}</div></div></div>
        <div className="card pa-card" style={{ marginTop: 12 }}><div className="pa-sections-title">Captured so far · {sec.title}</div>
          {sec.fields.length ? sec.fields.map((f) => <div key={f} className={`cap-row ${form[f] ? "ok" : ""}`}><span className="cap-k">{lbl(f)}</span><span className="cap-v">{form[f] ? String(form[f]) : "—"}</span></div>) : <div className="muted" style={{ fontSize: 12 }}>{sec.id === "review" ? "Edit any field below before submitting." : "Pre-filled from your SAP profile."}</div>}
          {sec.id === "review" && <div style={{ marginTop: 8 }}><Field k="category" label="Category" options={db.rfx_category.map((c) => c.category_name)} /><Field k="priority" label="Priority" options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} /><Field k="approvedBudget" label="Approved budget (USD)" type="number" /><Field k="serviceStartDate" label="Service start" type="date" /><Field k="sourcingApproach" label="Approach" options={["RFP", "RFQ", "RFI"]} /><Field k="incumbentSupplier" label="Incumbent" options={["", ...db.supplier.map((s) => s.name)]} /></div>}
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
          <div className="vc-intake-row"><div className="chatbot">💬 Chat Bot</div><div className="mid"><b>Requestor / Business Action — Intake</b><span>Submission through Conversational AI Chat Bot</span></div><div className="side">↓ to S1</div><div className="side">📊 Dashboards &amp; Insights<br/>Real-time KPIs from CLM push</div></div>
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
  const awardedValue = awarded.reduce((a, n) => a + n.final_price, 0);
  const savings = awarded.reduce((a, n) => a + n.savings_achieved, 0);
  const pipeline = db.rfx_events.reduce((a, e) => a + (e.budget_limit_usd || 0), 0);
  // savings by category — realised + projected (target vs quoted for in-flight negotiations)
  const savRows = [];
  db.negotiation_finalization.forEach((n) => savRows.push({ rfx: n.rfx_id, value: n.savings_achieved, kind: "Realised" }));
  db.negotiation_insights.filter((n) => !db.negotiation_finalization.some((f) => f.rfx_id === n.rfx_id)).forEach((n) => { const r = db.rfx_response.find((x) => x.rfx_id === n.rfx_id && x.supplier_id === n.supplier_id); if (r && !savRows.some((s) => s.rfx === n.rfx_id)) savRows.push({ rfx: n.rfx_id, value: r.quoted_total_price - n.target_price, kind: "Projected" }); });
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
  upsert("intake_commercials_timelines", { request_id: id, cost_center: f.costCenter, approved_budget: Number(f.approvedBudget) || null, currency: f.currency, capex_opex: f.capexOpex, sourcing_start_date: f.sourcingStartDate || null, rfp_issue_date: f.rfpIssueDate || null, award_date: f.awardDate || null, service_start_date: f.serviceStartDate || null, linked_RFx: f.linkedRfx || null });
  upsert("intake_evaluation_weights", { request_id: id, commercial_weight: Number(f.commercialWeight), technical_weight: Number(f.technicalWeight), compliance_weight: Number(f.complianceWeight) });
}
const NEW_INTAKE = (n) => ({ requestId: `REQ-2026-0911-${String(n).padStart(3, "0")}`, requestorName: "", employeeId: "", businessUnit: "", location: "", requestType: "Services", category: "IT Services", procurementType: "Strategic Sourcing", priority: "MEDIUM", requirementDescription: "", businessOutcome: "", impactIfNotProcured: "", scopeDescription: "", deliverables: "", specificationType: "Technical", complianceRequirements: "", geographyCoverage: "", transitionRequirement: "", documentationAttachments: "", incumbentSupplier: "", suggestedSuppliers: "", sourcingApproach: "RFP", expectedBidders: "3-5", contractType: "Master Services Agreement", duration: 3, paymentTerms: 45, riskCategory: "", dataSecurity: "", esgRequirement: "", costCenter: "", approvedBudget: "", currency: "USD", capexOpex: "OPEX", sourcingStartDate: TODAY, rfpIssueDate: "", awardDate: "", serviceStartDate: "", commercialWeight: 40, technicalWeight: 40, complianceWeight: 20, intakeStatus: "DRAFT", linkedRfx: null });

function DemandIntake({ db, mutate, push, setPage, setRfxId, rfxId, openRecord, gotoTable, user, role, can }) {
  const fullName = `${user.NAME_FIRST} ${user.NAME_LAST}`;
  const isBiz = ["BIZ_USER", "BIZ_MGR"].includes(user.PLATFORM_ROLE);
  const canRaise = isBiz || can("ADMIN"); const canRaiseOnBehalf = can("PROC_MGR", "PROC_HEAD", "PROC_TEAM");
  const visible = isBiz && !can("ADMIN") ? db.intake_requests.filter((r) => r.requestor_name === fullName || r.business_unit === user.ORGEH) : db.intake_requests;
  const [view, setView] = useState("list"); // list | new | detail
  const [mode, setMode] = useState(null); // form | ai
  const [layout, setLayout] = useState("grouped");
  const [reqId, setReqId] = useState(null);
  const [form, setForm] = useState(null);
  const [onBehalf, setOnBehalf] = useState("");
  const bizUsers = db.sap_user_master.filter((u) => ["BIZ_USER", "BIZ_MGR"].includes(u.PLATFORM_ROLE));
  const startNew = () => { const ru = onBehalf ? one(db, "sap_user_master", "BNAME", onBehalf) : user; const n = db.intake_requests.length + 1; setForm({ ...NEW_INTAKE(n), requestorName: `${ru.NAME_FIRST} ${ru.NAME_LAST}`, employeeId: ru.PERSNO, businessUnit: ru.ORGEH, location: ru.WERKS, costCenter: ru.KOSTL, __requestor: ru }); setMode(null); setView("new"); };
  const openDetail = (id) => { setReqId(id); setForm(intakeToForm(db, id)); setView("detail"); };
  useEffect(() => { if (view === "detail" && reqId) { const f = intakeToForm(db, reqId); if (f) setForm(f); } }, [db, reqId, view]);
  const budgetOf = (r) => one(db, "intake_commercials_timelines", "request_id", r.request_id)?.approved_budget || 0;
  const groups = [["UNDER_REVIEW", "In Approval", "amber"], ["APPROVED", "Approved · RFx opened", "green"], ["DRAFT", "Draft", "gray"], ["REJECTED", "Returned", "red"]].map(([st, l, c]) => ({ st, l, c, rows: visible.filter((r) => r.intake_status === st) })).filter((g) => g.rows.length || g.st !== "REJECTED");
  const submitted = (f, requestor) => {
    let first = "Procurement", n = 3;
    mutate((d) => { writeIntake(d, f, "UNDER_REVIEW"); const chain = buildIntakeChain(d, f.requestId); first = chain[0]?.approver_role; n = chain.length; d.intake_approvals = [...d.intake_approvals.filter((a) => a.request_id !== f.requestId), ...chain]; });
    push("Request submitted", `${f.requestId} written to the intake tables and routed to ${first} (step 1 of ${n}).`); openDetail(f.requestId);
  };
  const Avatar = ({ name }) => <span className="di2-avatar">{name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>;
  const Card = ({ r }) => { const ch = q(db, "intake_approvals", "request_id", r.request_id); return (
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
        {[["In Approval", visible.filter((r) => r.intake_status === "UNDER_REVIEW").length, "⏱", "awaiting Procurement / Finance / Legal"], ["Approved", visible.filter((r) => r.intake_status === "APPROVED").length, "✓", `${visible.filter((r) => r.linked_RFx).length} with RFx opened`], ["Drafts", visible.filter((r) => r.intake_status === "DRAFT").length, "📄", "not yet submitted"], ["Total Est. Value", fmtUsd(visible.reduce((a, r) => a + budgetOf(r), 0)), "$", `${visible.length} requests`]].map((k) => <div key={k[0]} className="card di2-kpi"><div><div className="lbl">{k[0]}</div><div className="val">{k[1]}</div><div className="sub">{k[3]}</div></div><span className="ic">{k[2]}</span></div>)}
      </div>
      <div className="di2-listhead"><h3>Sourcing Requests <span className="muted">({visible.length} total)</span></h3><div className="tabs"><button className={`tab ${layout === "grouped" ? "active" : ""}`} onClick={() => setLayout("grouped")}>▦ Grouped</button><button className={`tab ${layout === "table" ? "active" : ""}`} onClick={() => setLayout("table")}>☰ Table</button></div></div>
      {layout === "grouped" ? <div className="di2-board">{groups.map((g) => <div key={g.st} className={`di2-col ${g.c}`}><div className="di2-col-h"><span>{g.l}</span><b>{g.rows.length}</b></div>{g.rows.map((r) => <Card key={r.request_id} r={r} />)}{!g.rows.length && <div className="muted" style={{ fontSize: 12, padding: 12 }}>None</div>}</div>)}</div>
        : <div className="card" style={{ padding: 0 }}><table><thead><tr><th>Request</th><th>Category</th><th>Requestor</th><th>Priority</th><th>Budget</th><th>Status</th><th>Approvals</th><th>RFx</th></tr></thead><tbody>{visible.map((r) => <tr key={r.request_id} onClick={() => openDetail(r.request_id)} style={{ cursor: "pointer" }}><td><div className="di2-id">{r.request_id}</div><div className="muted" style={{ fontSize: 12, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.requirement_description}</div></td><td>{r.category}</td><td>{r.requestor_name}</td><td><Badge s={r.priority} /></td><td>{fmtUsd(budgetOf(r))}</td><td><Badge s={r.intake_status} /></td><td><span className="home-chain">{q(db, "intake_approvals", "request_id", r.request_id).sort((a, b) => a.approval_sequence - b.approval_sequence).map((c) => <span key={c.approval_id} className={`hc ${c.approval_status.toLowerCase()}`}>{c.approver_role[0]}</span>)}</span></td><td>{r.linked_RFx ? <Ref t="rfx_events" c="rfx_id" v={r.linked_RFx} openRecord={openRecord} /> : "—"}</td></tr>)}</tbody></table></div>}
    </div>);

  const Banner = ({ title }) => <div className="di2-hero"><button className="di2-back" onClick={() => setView("list")}>←</button><div><div className="eyebrow">Activity 01 · Agent A1</div><h2>{title}</h2></div><button className="btn di2-sop" onClick={() => setPage("faq")}>📘 Policies &amp; SOPs</button></div>;

  if (view === "new") return (
    <div className="di2">
      <Banner title="Autonomous Demand Intake & Policy Pre-Checks" />
      <div className="di2-modes"><button className={`di2-mode ${mode === "form" ? "on form" : ""}`} onClick={() => setMode("form")}>📄 Fill the form myself</button><button className={`di2-mode ${mode === "ai" ? "on" : ""}`} onClick={() => setMode("ai")}>🤖 Let AI guide me</button>{mode && <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setMode(null)}>← Change mode</button>}</div>
      {form.__requestor && form.__requestor.BNAME !== user.BNAME && <div className="callout info" style={{ marginBottom: 12 }}>Raising on behalf of <b>{form.requestorName}</b> ({form.businessUnit}). Requestor details come from their SAP record.</div>}
      {mode === "ai" && <IntakeChatbot db={db} mutate={mutate} push={push} user={form.__requestor || user} actor={user} form={form} setForm={setForm} onSubmitted={() => openDetail(form.requestId)} />}
      {mode === "form" && <IntakeFormWizard db={db} form={form} setForm={setForm} onBack={() => setMode(null)} onSubmit={() => submitted(form)} onDraft={() => { mutate((d) => writeIntake(d, form, "DRAFT")); push("Draft saved", `${form.requestId} saved. Continue any time from the Drafts column.`); openDetail(form.requestId); }} />}
    </div>);

  // detail
  const r = one(db, "intake_requests", "request_id", reqId); if (!r) return <div className="di2"><Banner title="Request" /><div className="card placeholder-card"><h3>Request not found</h3><button className="btn btn-ghost btn-sm" onClick={() => setView("list")}>Back to list</button></div></div>;
  const chain = q(db, "intake_approvals", "request_id", reqId).sort((a, b) => a.approval_sequence - b.approval_sequence);
  const rfxFor = r.linked_RFx ? one(db, "rfx_events", "rfx_id", r.linked_RFx) : null;
  const approveStep = (a, ok) => {
    mutate((d) => {
      d.intake_approvals = d.intake_approvals.map((x) => (x.approval_id === a.approval_id ? { ...x, approval_status: ok ? "APPROVED" : "REJECTED", approver_bname: user.BNAME, comments: ok ? ({ PROC_MGR: "Business case validated; category strategy aligned.", FINANCE: "Budget confirmed against cost center.", LEGAL: "No legal blockers; DPA to be included.", PROC_HEAD: "Strategic fit confirmed.", BIZ_MGR: "Business need confirmed." }[a.role_id] || "Approved.") : "Returned to requestor for rework.", approved_at: nowTs() } : x));
      const ch = d.intake_approvals.filter((x) => x.request_id === a.request_id).sort((p, r2) => p.approval_sequence - r2.approval_sequence);
      if (!ok) { d.intake_requests = d.intake_requests.map((x) => (x.request_id === a.request_id ? { ...x, intake_status: "REJECTED" } : x)); return; }
      const next = ch.find((x) => x.approval_status === "QUEUED"); if (next) d.intake_approvals = d.intake_approvals.map((x) => (x.approval_id === next.approval_id ? { ...x, approval_status: "PENDING" } : x));
      if (ch.every((x) => x.approval_status === "APPROVED")) {
        const req = d.intake_requests.find((x) => x.request_id === a.request_id); const gov = one(d, "intake_strategy_governance", "request_id", a.request_id); const ct = one(d, "intake_commercials_timelines", "request_id", a.request_id);
        let rid = req.linked_RFx;
        if (!rid) { rid = `${gov?.sourcing_approach || "RFP"}-2026-${a.request_id.split("-").slice(2).join("-")}`; const cat = d.rfx_category.find((c) => c.category_name === req.category)?.rfx_category || "CAT-ITS"; const owner = d.sap_user_master.find((u) => u.PLATFORM_ROLE === "PROC_MGR");
          d.rfx_events = [{ rfx_id: rid, title: req.requirement_description.slice(0, 70), rfx_type: gov?.sourcing_approach || "RFP", rfx_category: cat, status: "DRAFT", issue_date: null, due_date: ct?.rfp_issue_date ? addDaysIso(ct.rfp_issue_date, 28) : null, closed_date: null, owner: J({ name: `${owner.NAME_FIRST} ${owner.NAME_LAST}`, role: "Category Manager", email: owner.SMTP_ADDR }), description: req.requirement_description, scope: one(d, "intake_scope_specs", "request_id", a.request_id)?.scope_description || null, invited_suppliers: "[]", responses_received: 0, key_findings: null, attachments: "[]", budget_limit_usd: ct?.approved_budget || null, created_at: nowTs() }, ...d.rfx_events];
          d.rfx_weight_configs = [...d.rfx_weight_configs, { rfx_id: rid, commercial_weight: 0.35, operational_weight: 0.35, risk_compliance_weight: 0.2, esg_weight: 0.1, completeness_score: null, consistency_score: null, complaince_score: null, readability_score: null, overall_quality_score: null, status: "PENDING_HITL", issues: "[]", warnings: "[]", created_at: nowTs(), updated_at: nowTs() }];
          d.intake_commercials_timelines = d.intake_commercials_timelines.map((x) => (x.request_id === a.request_id ? { ...x, linked_RFx: rid } : x)); }
        d.intake_requests = d.intake_requests.map((x) => (x.request_id === a.request_id ? { ...x, intake_status: "APPROVED", linked_RFx: rid } : x));
      }
    });
    push(ok ? `Approved as ${a.approver_role}` : "Returned to requestor", ok ? (a.approval_sequence === chain.length ? "Chain complete — intake APPROVED and a DRAFT RFx was created for Procurement." : `Routed to step ${a.approval_sequence + 1}.`) : "intake_status = REJECTED.");
  };
  const sc = one(db, "intake_scope_specs", "request_id", reqId) || {}, gov = one(db, "intake_strategy_governance", "request_id", reqId) || {}, ct = one(db, "intake_commercials_timelines", "request_id", reqId) || {}, w = one(db, "intake_evaluation_weights", "request_id", reqId) || {};
  const KV = ({ rows }) => <div className="di2-kv">{rows.map(([k, v]) => <React.Fragment key={k}><div className="k">{k}</div><div className="v">{v || <span className="muted">—</span>}</div></React.Fragment>)}</div>;
  return (
    <div className="di2">
      <Banner title={r.requirement_description.slice(0, 80)} />
      <div className="di2-detail-top"><div><span className="di2-id" style={{ fontSize: 14 }}>{r.request_id}</span> <Badge s={r.intake_status} /> <Badge s={r.priority} /> <span className="muted">· {r.category} · raised by {r.requestor_name} on {fmtDate(r.created_at)}</span></div>
        <div style={{ display: "flex", gap: 8 }}>{r.intake_status === "DRAFT" && (r.requestor_name === fullName || can("ADMIN", "PROC_MGR", "PROC_HEAD", "PROC_TEAM")) && <button className="btn btn-primary btn-sm" onClick={() => { setForm({ ...intakeToForm(db, reqId), __requestor: null }); setMode("form"); setView("new"); }}>Continue draft</button>}{rfxFor && <button className="btn btn-primary btn-sm" onClick={() => { setRfxId(rfxFor.rfx_id); setPage("rfp-workflow-status"); }}>Open {rfxFor.rfx_id} →</button>}</div></div>
      <div className="card" style={{ padding: 16, marginBottom: 14 }}><div className="cc-side-title">Approval chain · Business → Procurement → Finance → Legal</div><div className="ia-chain">
        <div className="ia-step done"><span className="n">✓</span><div><b>Business</b><div className="muted">{r.requestor_name} · raised</div></div></div>
        {chain.map((a) => { const mine = roleCanAct(can, a.role_id); const who = one(db, "sap_user_master", "BNAME", a.approver_bname); return <div key={a.approval_id} className={`ia-step ${a.approval_status.toLowerCase()}`}><span className="n">{a.approval_status === "APPROVED" ? "✓" : a.approval_sequence}</span><div><b>{a.approver_role}</b><div className="muted">{who ? `${who.NAME_FIRST} ${who.NAME_LAST}` : a.approver_role} · {nice(a.approval_status)}{a.approved_at ? ` · ${a.approved_at.slice(0, 16)}` : ""}</div>{a.comments && <div className="muted" style={{ fontSize: 11 }}>{a.comments}</div>}{a.approval_status === "PENDING" && mine && <div style={{ display: "flex", gap: 6, marginTop: 6 }}><button className="btn btn-primary btn-sm" onClick={() => approveStep(a, true)}>Approve</button><button className="btn btn-ghost btn-sm" onClick={() => approveStep(a, false)}>Return</button></div>}{a.approval_status === "PENDING" && !mine && <div className="muted" style={{ fontSize: 11 }}>awaiting {a.approver_role}</div>}</div></div>; })}
        <div className={`ia-step ${r.intake_status === "APPROVED" ? "done" : "queued"}`}><span className="n">{r.intake_status === "APPROVED" ? "✓" : "→"}</span><div><b>RFx opened</b><div className="muted">{rfxFor ? `${rfxFor.rfx_id} · owner ${P(rfxFor.owner, {}).name}` : "Procurement, after Legal"}</div></div></div>
        {chain.length === 0 && <div className="ia-step queued"><span className="n">…</span><div><b>Not submitted</b><div className="muted">Draft — continue to submit for approval</div></div></div>}
      </div></div>
      <div className="di2-detail-grid">
        <div className="card di2-sec"><h4>Requestor <span className="badge awarded">SAP</span></h4><KV rows={[["Name", r.requestor_name], ["Employee ID", r.employee_id], ["Business unit", r.business_unit], ["Location", r.location]]} /></div>
        <div className="card di2-sec"><h4>Request</h4><KV rows={[["Type", `${r.request_type} · ${r.procurement_type}`], ["Description", r.requirement_description], ["Business outcome", r.business_outcome], ["Impact if not procured", r.impact_if_not_procured]]} /></div>
        <div className="card di2-sec"><h4>Scope &amp; specifications</h4><KV rows={[["Scope", sc.scope_description], ["Deliverables", sc.deliverables], ["Geography", P(sc.geography_coverage).join(", ")], ["Transition", sc.transition_requirement], ["Compliance", P(sc.compliance_requirements).join(", ")], ["Data security", gov.data_security_notes], ["ESG", gov.esg_requirement]]} /></div>
        <div className="card di2-sec"><h4>Financial &amp; timeline</h4><KV rows={[["Budget", ct.approved_budget ? `${ct.currency} ${Number(ct.approved_budget).toLocaleString()} · ${ct.capex_opex}` : null], ["Cost center", ct.cost_center], ["Sourcing start", fmtDate(ct.sourcing_start_date)], ["RFP issue", ct.rfp_issue_date ? fmtDate(ct.rfp_issue_date) : null], ["Award", ct.award_date ? fmtDate(ct.award_date) : null], ["Service start", ct.service_start_date ? fmtDate(ct.service_start_date) : null]]} /></div>
        <div className="card di2-sec"><h4>Supplier &amp; strategy</h4><KV rows={[["Incumbent", gov.incumbent_supplier], ["Suggested", P(gov.suggested_suppliers).join(", ")], ["Approach", `${gov.sourcing_approach || ""} · ${gov.expected_bidders_range || ""} bidders`], ["Contract", `${gov.contract_type || ""} · ${gov.duration_years ?? ""} yr · Net ${gov.payment_terms_days ?? ""}`], ["Weights", w.commercial_weight != null ? `Commercial ${w.commercial_weight} · Technical ${w.technical_weight} · Compliance ${w.compliance_weight}` : null]]} /></div>
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
        {step === 1 && <><h4>Financial &amp; Timeline</h4><p className="muted">Budget, cost allocation and key dates.</p>
          <div className="field-row"><F k="approvedBudget" label="Approved Budget" type="number" /><F k="costCenter" label="Cost Center" /></div>
          <div className="field-row"><F k="currency" label="Currency" options={["USD", "EUR", "GBP", "INR"]} /><F k="capexOpex" label="Capex / Opex" options={["OPEX", "CAPEX"]} /></div>
          <div className="field-row"><F k="sourcingStartDate" label="Sourcing Start Date" type="date" /><F k="rfpIssueDate" label="RFP Issue Date" type="date" /></div>
          <div className="field-row"><F k="awardDate" label="Award Date" type="date" /><F k="serviceStartDate" label="Service Start Date" type="date" /></div></>}
        {step === 2 && <><h4>Requirements &amp; Supporting Info</h4><p className="muted">Scope, deliverables, specifications and compliance.</p>
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
        {step === 4 && <><h4>Review &amp; Submit</h4><p className="muted">Check the summary, then submit for Procurement → Finance → Legal approval.</p>
          <div className="di2-kv">{[["Request", form.requestId], ["Requestor", `${form.requestorName} · ${form.employeeId} · ${form.businessUnit}`], ["Category", `${form.category} · ${form.requestType} · ${form.procurementType} · ${form.priority}`], ["Requirement", form.requirementDescription], ["Outcome", form.businessOutcome], ["Scope", form.scopeDescription], ["Geography", form.geographyCoverage], ["Compliance", form.complianceRequirements], ["Budget", `${form.currency} ${Number(form.approvedBudget || 0).toLocaleString()} · ${form.capexOpex} · ${form.costCenter}`], ["Timeline", `issue ${form.rfpIssueDate || "—"} · award ${form.awardDate || "—"} · start ${form.serviceStartDate || "—"}`], ["Suppliers", `${form.incumbentSupplier || "no incumbent"} · ${form.suggestedSuppliers || "—"}`], ["Contract", `${form.sourcingApproach} · ${form.contractType} · ${form.duration} yr · Net ${form.paymentTerms}`]].map(([k, v]) => <React.Fragment key={k}><div className="k">{k}</div><div className="v">{v || <span className="muted">—</span>}</div></React.Fragment>)}</div></>}
      </div>
      <div className="card di2-wiz-foot"><span className="muted">📄 Step {step + 1} of {STEPS.length}</span><div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={onDraft}>💾 Save Draft</button>{step > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}>← Previous</button>}{step < 4 ? <button className="btn btn-primary btn-sm" disabled={!valid} onClick={() => setStep(step + 1)}>Next →</button> : <button className="btn btn-primary btn-sm" disabled={!weightsOk || !form.requirementDescription} onClick={onSubmit}>Submit for approval</button>}</div></div>
    </div>);
}

const addDaysIso = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function ProgressRing({ pct }) { return <div className="pa-ring" style={{ background: `conic-gradient(var(--primary) ${pct}%, #eef1f5 ${pct}%)` }}><div className="hole">{pct}%</div></div>; }

/* ============================= SUPPLIER DISCOVERY ============================= */
function SupplierDiscovery({ db, mutate, push, setPage, rfxId, openRecord, gotoTable, can }) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const intake = db.intake_requests.find((r) => r.linked_RFx === rfxId);
  const gov = intake ? one(db, "intake_strategy_governance", "request_id", intake.request_id) : null;
  const shortlist = q(db, "supplier_shortlisting", "rfx_id", rfxId);
  const [search, setSearch] = useState(""); const [allCats, setAllCats] = useState(false);
  const vmBy = Object.fromEntries(db.vendor_master.map((v) => [v.supplier_id, v]));
  const catName = one(db, "rfx_category", "rfx_category", rfx.rfx_category)?.category_name;
  // candidates: vendors whose master-data category matches the RFx category (plus anyone already shortlisted); scored the way A2 would
  const pool = db.supplier.filter((s) => { const v = vmBy[s.supplier_id]; const inCat = allCats || !v || v.rfx_category === rfx.rfx_category || (rfx.rfx_category === "CAT-SW" || rfx.rfx_category === "CAT-CLOUD" || rfx.rfx_category === "CAT-HW") && v.rfx_category === "CAT-ITS"; const hit = !search || (s.name + " " + s.country + " " + (v?.city || "") + " " + (v?.vendor_profile || "")).toLowerCase().includes(search.toLowerCase()); return (inCat || shortlist.some((x) => x.supplier_id === s.supplier_id)) && hit; });
  const rankedAll = pool.map((s) => { const sh = shortlist.find((x) => x.supplier_id === s.supplier_id); const v = vmBy[s.supplier_id]; const en = one(db, "supplier_external_enrichment", "supplier_id", s.supplier_id) || {}; const rp = one(db, "supplier_risk_profile", "supplier_id", s.supplier_id) || {}; const cl = one(db, "supplier_classification", "supplier_id", s.supplier_id) || {}; const svc = one(db, "supplier_services_profiles", "supplier_id", s.supplier_id); const capability = v?.compliance_score ?? (svc ? Math.round(60 + svc.client_csat_score * 8 + Math.min(10, svc.bench_strength_count / 500)) : 70); const assessed = s.esg_score != null; const composite = sh ? sh.agent_score : v?.composite_score ?? (assessed ? +(0.3 * (en.db_credit_score || 60) + 0.25 * s.esg_score + 0.25 * (100 - (rp.interos_geopolitical_risk || 30)) + 0.2 * capability).toFixed(2) : 0); return { ...s, v, sh, credit: en.db_credit_score, geoRisk: rp.interos_geopolitical_risk, capability, composite, assessed, strategic: !!cl.strategic_flag, preferred: !!cl.preferred_supplier_flag, incumbent: gov?.incumbent_supplier === s.name }; }).sort((a, b) => b.composite - a.composite);
  const ranked = rankedAll.slice(0, 30);
  const [selected, setSelected] = useState(shortlist.filter((s) => s.shortlist_flag).map((s) => s.supplier_id));
  useEffect(() => setSelected(q(db, "supplier_shortlisting", "rfx_id", rfxId).filter((s) => s.shortlist_flag).map((s) => s.supplier_id)), [rfxId]);
  const AUTOMATED_CHECKS = [["Master data scan", "supplier"], ["Performance history", "supplier_scorecards"], ["Pre-qualification / KYC", "supplier_classification"], ["External intelligence feed", "supplier_external_enrichment"]];
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
      <div className="cc-hero"><div className="eyebrow">Activity 02 · Agent A2 — Supplier Discovery · supplier_shortlisting ← supplier · supplier_external_enrichment · supplier_risk_profile · supplier_classification</div><h2>Smart Supplier Discovery &amp; Shortlisting</h2></div>
      <div className="cc-layout" style={{ gridTemplateColumns: "2.3fr 1fr" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}><span style={{ fontSize: 13.5 }}><b>{rankedAll.length} candidates</b> <span style={{ color: "var(--muted)" }}>in <b>{catName}</b> from the vendor master ({db.supplier.length} total) — top {ranked.length} shown, select 3-6 to invite</span></span><span className="badge awarded">{selected.length} / 6 selected</span></div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}><input className="ex-search" placeholder="Search name, country, city, profile" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} /><label className="rvem-checkbox-row" style={{ margin: 0 }}><input type="checkbox" checked={allCats} onChange={() => setAllCats((x) => !x)} />All categories</label></div>
          {locked && <div className="callout warn" style={{ marginBottom: 10 }}>{!can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") ? "Shortlisting is a Procurement action — your role can view the agent ranking but not change the shortlist." : `Shortlist is locked — this event is already ${rfx.status.toLowerCase()}.`}</div>}
          {ranked.map((s, i) => (
            <div key={s.supplier_id} className={`supplier-row ${selected.includes(s.supplier_id) ? "selected" : ""}`} onClick={() => toggle(s.supplier_id)}>
              <div className="rank-badge">{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{s.name}{s.incumbent && <span className="badge awarded" style={{ fontSize: 9.5 }}>Incumbent</span>}{s.strategic && <span className="badge open" style={{ fontSize: 9.5 }}>Strategic</span>}{s.kyc_status !== "VERIFIED" && <span className="badge closed" style={{ fontSize: 9.5 }}>KYC {nice(s.kyc_status)}</span>}{!s.assessed && <span className="badge draft" style={{ fontSize: 9.5 }}>Tail spend · unassessed</span>}{s.sh?.manual_override_flag ? <span className="badge closing" style={{ fontSize: 9.5 }}>Override</span> : null}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}><Ref t="supplier" c="supplier_id" v={s.supplier_id} openRecord={openRecord} /> · {s.region} · {s.country}{s.v?.city ? ` · ${s.v.city}` : ""} · {s.years_on_panel} yrs{s.v?.vendor_profile ? ` · ${s.v.vendor_profile}` : ""}{s.v?.contact_name ? ` · ${s.v.contact_name}` : ""}</div></div>
              <div className="metric"><span className="m-lbl">ESG</span><span className="m-val">{s.esg_score ?? "—"}</span></div>
              <div className="metric"><span className="m-lbl">Credit</span><span className="m-val">{s.credit ?? "—"}</span></div>
              <div className="metric"><span className="m-lbl">Geo risk</span><span className="m-val" style={{ color: s.geoRisk > 30 ? "var(--amber)" : "inherit" }}>{s.geoRisk ?? "—"}</span></div>
              <div className="metric"><span className="m-lbl">Capability</span><span className="m-val">{s.capability}</span></div>
              <div style={{ textAlign: "center", width: 54 }}><div style={{ fontSize: 22, fontWeight: 800, color: s.assessed ? "var(--primary)" : "var(--muted)" }}>{s.assessed ? Math.round(s.composite) : "n/a"}</div><div style={{ fontSize: 8.5, textTransform: "uppercase", color: "var(--muted)" }}>Composite</div></div>
              <div className={`checkbox ${selected.includes(s.supplier_id) ? "checked" : ""}`}>{selected.includes(s.supplier_id) ? "✓" : ""}</div>
            </div>))}
        </div>
        <div>
          <div className="card cc-side-card"><div className="cc-side-title">Automated Checks</div>{AUTOMATED_CHECKS.map(([c, t]) => <div key={c} className="progress-check done"><span className="dot">✓</span>{c} <a className="mono rfp-link" style={{ marginLeft: "auto", fontSize: 10.5 }} onClick={() => gotoTable(t)}>{t}</a></div>)}</div>
          <div className="card cc-side-card" style={{ background: "var(--primary-soft)", borderColor: "#c9def6" }}><div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", color: "var(--primary)", marginBottom: 6, fontWeight: 700 }}>RFP Shortlist · HITL-002</div><p style={{ fontSize: 12.5, marginBottom: 12 }}>Category Manager validates; Risk officer co-signs any HIGH-risk supplier. Overrides against the agent's recommendation are recorded with a reason.</p><button className="btn btn-primary" style={{ width: "100%" }} disabled={!canConfirm} onClick={confirm}>Confirm Shortlist ({selected.length})</button></div>
          <div className="card cc-side-card"><div className="cc-side-title">Agent memory (supplier_agent_memory)</div>{ranked.filter((s) => one(db, "supplier_agent_memory", "supplier_id", s.supplier_id)).slice(0, 3).map((s) => <div key={s.supplier_id} style={{ fontSize: 11.5, marginBottom: 8 }}><b>{s.name}</b><div className="muted">{one(db, "supplier_agent_memory", "supplier_id", s.supplier_id)?.agent_notes_semantic}</div></div>)}{!ranked.some((s) => one(db, "supplier_agent_memory", "supplier_id", s.supplier_id)) && <div className="muted" style={{ fontSize: 12 }}>No prior engagement notes for these vendors yet.</div>}</div>
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
      <div className="rc-head-row"><div><h2>RFx Questionnaire <span className="vc-agent-chip">A3</span></h2><p>Add, edit, reorder or reweight requirements. Each row is a <a className="mono rfp-link" onClick={() => gotoTable("rfx_requirements")}>rfx_requirements</a> record; weights drive the A5 scoring.</p></div>
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

function RfpCreation({ db, mutate, push, setPage, rfxId, openRecord, gotoTable, can }) {
  const rfx = one(db, "rfx_events", "rfx_id", rfxId);
  const intake = db.intake_requests.find((r) => r.linked_RFx === rfxId);
  const ct = intake ? one(db, "intake_commercials_timelines", "request_id", intake.request_id) : null;
  const gov = intake ? one(db, "intake_strategy_governance", "request_id", intake.request_id) : null;
  const w = one(db, "rfx_weight_configs", "rfx_id", rfxId);
  const drafts = q(db, "rfx_draft_versions", "rfx_id", rfxId).sort((a, b) => a.version_number - b.version_number);
  const latest = drafts[drafts.length - 1];
  const docs = q(db, "rfx_documents", "rfx_id", rfxId).map((d) => ({ ...d, doc: one(db, "documents", "document_id", d.document_id) }));
  const [config, setConfig] = useState({ template: rfx.rfx_type === "RFQ" ? "TPL-RFQ-STD-02" : "TPL-RFP-SVC-04", evaluationMethod: "Weighted Scoring", currency: "USD", bidValidity: 90, language: "English (US)" });
  const [preview, setPreview] = useState(false);
  const reqs = q(db, "rfx_requirements", "rfx_id", rfxId);
  const years = gov?.duration_years || 1; const invited = P(rfx.invited_suppliers).length;
  const step = latest?.approval_status === "APPROVED" ? (rfx.status === "DRAFT" ? 3 : 4) : latest?.approval_status === "IN_REVIEW" ? 2 : 1;
  const sections = ["Executive Summary", "Project Overview & Objectives", "Scope of Work", "Service Requirements", "Technical Requirements", "Service Level Agreement (SLA)", "Commercial Terms", "Evaluation Criteria", "Submission Instructions", "Terms & Conditions", "Appendices"];
  const generateDraft = () => {
    const v = (latest?.version_number || 0) + 1;
    const content = `# ${rfx.title}\n\n## 1. Executive Summary\nLeona invites proposals for ${rfx.description}\n\n## 2. Scope of Work\n${rfx.scope || intake?.requirement_description || ""}\n\n## 3. Requirements (${reqs.length})\n${reqs.map((r, i) => `${i + 1}. ${r.title} (${r.weight}%) — ${r.description}`).join("\n")}\n\n## 4. Evaluation\nCommercial ${Math.round(w.commercial_weight * 100)}%, Operational ${Math.round(w.operational_weight * 100)}%, Risk & Compliance ${Math.round(w.risk_compliance_weight * 100)}%, ESG ${Math.round(w.esg_weight * 100)}%. Method: ${config.evaluationMethod}.\n\n## 5. Commercial Terms\nCurrency ${config.currency} · Bid validity ${config.bidValidity} days · Contract ${gov?.contract_type || "MSA"} · ${years} year(s) · Payment Net ${gov?.payment_terms_days || 45}.\n\n## 6. Timeline\nIssue ${ct?.rfp_issue_date || "TBC"} · Due ${rfx.due_date || "TBC"} · Award ${ct?.award_date || "TBC"}\n\n_Generated ${nowTs()} from template ${config.template}._`;
    mutate((d) => { d.rfx_draft_versions = [...d.rfx_draft_versions.map((x) => (x.rfx_id === rfxId && x.approval_status !== "APPROVED" ? { ...x, approval_status: "SUPERSEDED" } : x)), { draft_id: `DRF-${String(d.rfx_draft_versions.length + 1).padStart(3, "0")}`, rfx_id: rfxId, version_number: v, template_id: config.template, draft_content: content, created_by: "A3 RFx Builder Agent", reviewed_by: P(rfx.owner, {}).name, approval_status: "IN_REVIEW", approved_by: null, approved_at: null }]; });
    push("RFP created", `V${v}.0 generated into rfx_draft_versions — pending Legal approval (HITL-003).`);
  };
  const approveDraft = () => { mutate((d) => { d.rfx_draft_versions = d.rfx_draft_versions.map((x) => (x.draft_id === latest.draft_id ? { ...x, approval_status: "APPROVED", approved_by: "Laura Bennett", approved_at: nowTs() } : x)); d.rfx_weight_configs = d.rfx_weight_configs.map((x) => (x.rfx_id === rfxId ? { ...x, status: "APPROVED", completeness_score: x.completeness_score ?? 94.5, consistency_score: x.consistency_score ?? 92, complaince_score: x.complaince_score ?? 98, readability_score: x.readability_score ?? 90, overall_quality_score: x.overall_quality_score ?? 93.6, updated_at: nowTs() } : x)); }); push("Draft approved", `${latest.draft_id} approved by Legal. Ready to publish from the Invitation Email tab.`); };
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
          <div className="card rfp-card"><div className="rfp-card-title">3. Scope Documents &amp; Inputs</div>
            <div className="rfp-dropzone"><div className="icon">⬆</div><div className="drop-main">Drag &amp; drop files here or <span style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }} onClick={addDoc}>browse</span></div><div className="sub">PDF, DOCX, XLSX (Max 50MB) → documents + rfx_documents</div></div>
            {docs.filter((d) => d.doc?.status !== "DELETED").map((d) => <div key={d.document_id} className="rfp-file-row"><span>📄</span><span className="name"><Ref t="documents" c="document_id" v={d.document_id} openRecord={openRecord}>{d.doc?.file_name}</Ref></span><span className="size">{(d.doc?.file_size_bytes / 1048576).toFixed(1)} MB · {d.phase}</span><button className="rm" onClick={() => removeDoc(d.document_id)}>✕</button></div>)}
            <span className="rfp-link" onClick={addDoc}>+ Add More Documents</span></div>
          <div className="card rfp-card"><div className="rfp-card-title">4. RFP Configuration</div>
            <div className="field-row single"><div><label>Template</label><select value={config.template} onChange={(e) => setConfig((c) => ({ ...c, template: e.target.value }))}><option>TPL-RFP-SVC-04</option><option>TPL-RFQ-STD-02</option><option>TPL-RFI-DISC-01</option></select></div></div>
            <div className="field-row single"><div><label>Evaluation Method</label><select value={config.evaluationMethod} onChange={(e) => setConfig((c) => ({ ...c, evaluationMethod: e.target.value }))}><option>Weighted Scoring</option><option>Lowest Cost</option><option>Best Value</option></select></div></div>
            <div className="field-row"><div><label>Response Currency</label><select value={config.currency} onChange={(e) => setConfig((c) => ({ ...c, currency: e.target.value }))}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></div><div><label>Bid Validity (Days)</label><input type="number" value={config.bidValidity} onChange={(e) => setConfig((c) => ({ ...c, bidValidity: e.target.value }))} /></div></div>
            <div className="section-label" style={{ marginTop: 6 }}>Evaluation weights (rfx_weight_configs)</div>
            {w && [["Commercial", "commercial_weight"], ["Operational", "operational_weight"], ["Risk & compliance", "risk_compliance_weight"], ["ESG", "esg_weight"]].map(([l, k]) => <div key={k} className="w-row"><span>{l}</span><input type="range" min="0" max="1" step="0.05" value={w[k]} disabled={rfx.status !== "DRAFT"} onChange={(e) => mutate((d) => { d.rfx_weight_configs = d.rfx_weight_configs.map((x) => (x.rfx_id === rfxId ? { ...x, [k]: Number(e.target.value), updated_at: nowTs() } : x)); })} /><b className="mono">{Math.round(w[k] * 100)}%</b></div>)}
            {w && Math.round((w.commercial_weight + w.operational_weight + w.risk_compliance_weight + w.esg_weight) * 100) !== 100 && <div className="callout warn">Weights total {Math.round((w.commercial_weight + w.operational_weight + w.risk_compliance_weight + w.esg_weight) * 100)}% — must be 100%.</div>}
          </div>
        </div>
        <div>
          <div className="card rfp-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><div className="rfp-card-title" style={{ marginBottom: 0 }}>5. Generated RFP Document</div>{rfx.status === "DRAFT" && can("PROC_MGR", "PROC_HEAD", "PROC_TEAM") && <span className="rfp-pill primary" style={{ fontSize: 11 }} onClick={generateDraft}>⟳ {latest ? "Regenerate" : "Create"} draft</span>}</div>
            <div style={{ height: 10 }}></div>
            <div className="rfp-doc-preview"><div className="dochead"><span>◆</span> Autonomous Sourcing &nbsp;·&nbsp; {rfxId} &nbsp;·&nbsp; {latest ? `V${latest.version_number}.0` : "no draft"}</div><div className="doctitle">Request for {rfx.rfx_type === "RFQ" ? "Quotation" : rfx.rfx_type === "RFI" ? "Information" : "Proposal"} ({rfx.rfx_type})</div><div className="docsub">{rfx.title}</div><div className="prep">Prepared by<b>{latest?.created_by || "—"}</b>{latest ? `reviewed by ${latest.reviewed_by}` : ""}</div><div className="foot">Confidential – For Evaluation Purposes Only</div></div>
            <div className="rfp-doc-sections"><div className="dst">Document Sections</div><ul style={{ margin: 0, padding: 0 }}>{sections.map((s, i) => <li key={s}><span className="num">{latest ? "✓" : "·"}</span>{i + 1}. {s}</li>)}</ul></div>
            <div className="rfp-doc-stats"><div><b>{reqs.length}</b>Requirements</div><div><b>{latest ? latest.draft_content.split(/\s+/).length.toLocaleString() : 0}</b>Word Count</div><div><b>{drafts.length}</b>Versions</div><div><b>{latest?.approval_status ? nice(latest.approval_status) : "—"}</b>Status</div></div>
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
  const defaultBody = `Dear {{Vendor Contact Name}},\n\nWe are pleased to invite you to participate in our ${rfx.rfx_type} for the following requirement:\n\nRFx ID: ${rfxId}\nTitle: ${rfx.title}\nDescription: ${rfx.description}\n\nPlease find attached the complete ${rfx.rfx_type} document containing the scope of work, terms & conditions, evaluation criteria, and submission instructions.\n\nKey Terms & Conditions:\n- All submissions must follow the instructions in the ${rfx.rfx_type} document.\n- Prices should be quoted in USD as per the pricing schedule.\n- Proposals must remain valid for 90 days from the response due date.\n- All information provided will be treated as confidential.\n\nTimeline:\n- Issue Date: ${TODAY}\n- Questions Due: ${due ? new Date(new Date(due).getTime() - 10 * 86400000).toISOString().slice(0, 10) : "TBC"}\n- Response Due: ${due}\n- Expected Award: ${ct?.award_date || "TBC"}\n\nQuestions should be submitted through the Q&A section of the sourcing portal.\n\n${owner.name}\nSourcing Lead, Leona Procurement`;
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
      <div className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", marginTop: 4 }}><button className="btn btn-ghost btn-sm" onClick={() => push("Saved as draft", "Invitation email saved as draft.")}>📁 Save as Draft</button><div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => push("Scheduled", "Approve & Send Later scheduling queued.")}>🕐 Approve &amp; Send Later</button><button className="btn btn-primary btn-sm" disabled={!canSend} onClick={publish}>✈ Approve &amp; Send</button></div></div>
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
  const [subTab, setSubTab] = useState("questionnaire");
  return (
    <div>
      <div className="di-tabbar">{[["questionnaire", "☑ Questionnaire"], ["creation", "📄 RFP Creation"], ["email", "✉ Invitation & Publish"], ["vendor", "🎧 Vendor Responses"]].map(([id, l]) => <button key={id} className={`di-tab ${subTab === id ? "active" : ""}`} onClick={() => setSubTab(id)}>{l}</button>)}</div>
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
  useEffect(() => { setPrompt(rfx.title); setContext(rfx.description || ""); }, [rfxId]);
  const genQuestions = async () => {
    if (!prompt.trim()) { push("Prompt required", "Describe what is being procured."); return; }
    setBusy(true); setErr(null);
    const sys = `You are an expert procurement analyst drafting RFP questionnaires. Respond with ONLY a JSON array (no prose, no fences) of 8-12 objects with exactly: "section" (2-5 words), "title" (short requirement title), "text" (the question, 1-3 sentences), "priority" one of LOW/MEDIUM/HIGH, "type" one of TEXT/NUMERIC/YES_NO/CHOICE/FILE, "weight" integer percent — weights across all objects must sum to exactly 100.`;
    const msg = [`RFP need: ${prompt.trim()}`, context.trim() ? `Context: ${context.trim()}` : null, focus.length ? `Focus areas: ${focus.join(", ")}.` : null].filter(Boolean).join("\n\n");
    try { const parsed = await callClaudeJson(sys, msg, 2500); if (!Array.isArray(parsed)) throw new Error("AI response was not a JSON array."); setQuestions(parsed); push("Questions generated", `${parsed.length} questions ready for review.`); }
    catch (e) { setErr(e.message); push("Generation failed", e.message); } finally { setBusy(false); }
  };
  const genDoc = async () => {
    if (!prompt.trim()) { push("Title required", "Enter an RFP title."); return; }
    setBusy(true); setErr(null); setDoc(null); setReviewed(false);
    const sys = `You draft complete enterprise RFP documents. Respond with ONLY a JSON object (no prose, no fences) with: "title", "category" (2-4 words), "sections": array of exactly 11 objects in this order with these exact names: ${QB_SECTIONS.map((s) => `"${s}"`).join(", ")}. Each object has "name" and "content" (2-5 sentences of substantive draft text).`;
    try { const parsed = await callClaudeJson(sys, `RFP need: ${prompt.trim()}${context.trim() ? `\nContext: ${context.trim()}` : ""}`, 3500); if (!Array.isArray(parsed.sections)) throw new Error("AI response missing sections."); setDoc(parsed); push("RFP generated", `${parsed.sections.length} sections drafted.`); }
    catch (e) { setErr(e.message); push("Generation failed", e.message); } finally { setBusy(false); }
  };
  const addToRfx = () => {
    const total = questions.reduce((a, x) => a + Number(x.weight || 0), 0);
    mutate((d) => { let id = Math.max(0, ...d.rfx_requirements.map((r) => r.requirement_id)); d.rfx_requirements = [...d.rfx_requirements.filter((r) => r.rfx_id !== rfxId), ...questions.map((x) => ({ requirement_id: ++id, rfx_id: rfxId, category: x.section, title: x.title || x.section, description: x.text, priority_level: RC_PRIO.includes(x.priority) ? x.priority : "MEDIUM", response_type: RC_TYPE_OPTIONS.includes(x.type) ? x.type : "TEXT", choices: x.type === "YES_NO" ? J(["Yes", "No"]) : null, max_points_allocated: 100, weight: total === 100 ? Number(x.weight) : Math.round(100 / questions.length), created_at: nowTs(), updated_at: nowTs() }))]; });
    push("Added to RFx", `${questions.length} AI-generated requirements replaced rfx_requirements for ${rfxId}${total !== 100 ? " (weights normalised)" : ""}.`);
  };
  const saveDoc = () => { mutate((d) => { const v = q(d, "rfx_draft_versions", "rfx_id", rfxId).length + 1; d.rfx_draft_versions = [...d.rfx_draft_versions.map((x) => (x.rfx_id === rfxId && x.approval_status !== "APPROVED" ? { ...x, approval_status: "SUPERSEDED" } : x)), { draft_id: `DRF-${String(d.rfx_draft_versions.length + 1).padStart(3, "0")}`, rfx_id: rfxId, version_number: v, template_id: "TPL-AI-QUICKBID", draft_content: `# ${doc.title}\n\n` + doc.sections.map((s, i) => `## ${i + 1}. ${s.name}\n${s.content}`).join("\n\n"), created_by: "Claude (Quick Bid)", reviewed_by: P(rfx.owner, {}).name, approval_status: "IN_REVIEW", approved_by: null, approved_at: null }]; }); push("Saved as draft", `Version written to rfx_draft_versions for ${rfxId} — pending Legal approval.`); };
  const updQ = (i, k, v) => setQuestions((qs) => qs.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  return (
    <div>
      <div className="qc-mode-row"><button className={`qc-mode-tab ${mode === "prompt" ? "active" : ""}`} onClick={() => setMode("prompt")}>🔄 Questionnaire from Prompt</button><button className={`qc-mode-tab ${mode === "bid" ? "active" : ""}`} onClick={() => setMode("bid")}>⚡ Quick Bid RFP Document</button></div>
      <div className="rc-breadcrumb">RFx &gt; <b>{rfxId}</b> &gt; {mode === "prompt" ? "AI Questionnaire" : "Quick Bid"}</div>
      <div className="rc-head-row"><div><h2>{mode === "prompt" ? "Create RFP Questionnaire with AI" : "Quick Bid – RFP Document"} <span className="vc-agent-chip">A3</span></h2><p>Generates with a live Claude call, then writes the reviewed output into {mode === "prompt" ? <a className="mono rfp-link" onClick={() => gotoTable("rfx_requirements")}>rfx_requirements</a> : <a className="mono rfp-link" onClick={() => gotoTable("rfx_draft_versions")}>rfx_draft_versions</a>} for the working RFx.</p></div></div>
      <div className="qc-columns">
        <div className="card" style={{ padding: 20 }}>
          <div className="rfp-card-title" style={{ fontSize: 14 }}>1. Describe the need</div>
          <label>RFP need <span className="qc-charcount">{prompt.length}/150</span></label><textarea maxLength={150} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ marginBottom: 14 }} />
          <label>Additional context <span className="qc-charcount">{context.length}/300</span></label><textarea maxLength={300} value={context} onChange={(e) => setContext(e.target.value)} style={{ marginBottom: 14 }} />
          {mode === "prompt" && <><label>Focus areas</label><div className="pa-chip-group" style={{ marginBottom: 8 }}>{QC_FOCUS_AREAS.map((f) => <button type="button" key={f} className={`qc-chip ${focus.includes(f) ? "selected" : ""}`} onClick={() => setFocus((fa) => (fa.includes(f) ? fa.filter((x) => x !== f) : [...fa, f]))}>{f}</button>)}</div></>}
          <div style={{ marginTop: 20 }}><button className="btn btn-primary qc-gen-btn" disabled={busy} onClick={mode === "prompt" ? genQuestions : genDoc}>{busy ? "✨ Generating…" : mode === "prompt" ? "✨ Generate Questions" : "✨ Generate RFP"}</button><div className="qc-gen-hint">Calls the Anthropic API directly from this artifact — genuinely generated, not scripted. Review is required before anything is written (HITL-003).</div></div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="rc-table-head"><h3>2. {mode === "prompt" ? "AI Generated Questions" : "AI Generated RFP Document"}</h3>{(questions || doc) && <span className="badge open">Generated</span>}</div>
          {busy && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>⏳ Drafting…</div>}
          {err && !busy && <div className="callout warn" style={{ margin: 16 }}>⚠ {err}</div>}
          {!busy && !err && mode === "prompt" && !questions && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>Enter a prompt and click Generate.</div>}
          {!busy && mode === "prompt" && questions && <>
            <div style={{ overflowX: "auto" }}><table className="qc-q-table"><thead><tr><th>#</th><th>Section / title</th><th>Question</th><th>Type</th><th>W%</th></tr></thead><tbody>{questions.map((x, i) => <tr key={i}><td className="qc-q-num">{i + 1}</td><td style={{ minWidth: 150 }}><input className="qc-q-title-input" value={x.section} onChange={(e) => updQ(i, "section", e.target.value)} /><input className="qc-q-title-input" style={{ marginTop: 4, fontWeight: 400 }} value={x.title || ""} onChange={(e) => updQ(i, "title", e.target.value)} /></td><td style={{ minWidth: 260 }}><textarea className="qc-q-desc-textarea" value={x.text} onChange={(e) => updQ(i, "text", e.target.value)} /></td><td><select className="rc-select" value={x.type} onChange={(e) => updQ(i, "type", e.target.value)}>{RC_TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></td><td><input type="number" className="rc-section-input" style={{ width: 54 }} value={x.weight} onChange={(e) => updQ(i, "weight", e.target.value)} /></td></tr>)}</tbody></table></div>
            <div className="rc-footer-actions"><span className="muted" style={{ fontSize: 12, marginRight: "auto" }}>Weights total {questions.reduce((a, x) => a + Number(x.weight || 0), 0)}%</span><button className="btn btn-ghost btn-sm" disabled={busy} onClick={genQuestions}>🔄 Regenerate</button><button className="btn btn-primary btn-sm" onClick={addToRfx} disabled={!editable}>+ Add to {rfxId}</button></div></>}
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
      <div className="ev-report-head"><div className="ev-eyebrow">Activity 04B — Benchmark Analysis Report</div><div className="ev-report-title">Pricing Benchmark &amp; Market Alignment</div><div className="ev-report-sub">Calibrated market mid-points (USD / unit / year) versus each vendor's normalised unit rate from bid_line_items.</div></div>
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
      <div className="cc-hero"><div className="eyebrow">Activity 04 · Agent A5 — Evaluation &amp; Scoring · agent_evaluations · rfx_response_answers · bid_line_items</div><h2>AI Ingestion, Normalization &amp; Multi-Objective Evaluation</h2></div>
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
  const ins = q(db, "negotiation_insights", "rfx_id", rfxId);
  const fin = one(db, "negotiation_finalization", "rfx_id", rfxId);
  const [finalPrice, setFinalPrice] = useState("");
  if (!ins.length) return <div><div className="page-head"><Eyebrow activity="Activity 05" tables={["negotiation_insights", "negotiation_finalization"]} agent="Agent A6 — Negotiation" gotoTable={gotoTable} /><h2 className="page-title">Predictive Negotiation &amp; Multi-Round Optimization</h2></div><div className="card placeholder-card"><div className="icon">🤝</div><h3>No negotiation insights for {rfxId}</h3><p style={{ fontSize: 13 }}>Insights are generated when the evaluation ranking is confirmed (Activity 04 → 4E Dashboard).</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setPage("evaluation")}>Go to Evaluation</button></div></div>;
  const approve = (id) => { mutate((d) => { d.negotiation_insights = d.negotiation_insights.map((n) => (n.insight_id === id ? { ...n, approval_flag: 1, approved_by: "Rachel Kim", approved_at: nowTs() } : n)); }); push("Targets approved", `${id} approved by Finance (HITL-007).`); };
  const primary = ins[0]; const quote = db.rfx_response.find((r) => r.rfx_id === rfxId && r.supplier_id === primary.supplier_id)?.quoted_total_price || primary.walk_away_price;
  const finalize = () => {
    const fp = Number(finalPrice); if (!fp || fp > primary.walk_away_price) { push("Check the final price", `Must be a number at or below walk-away (${fmtFull(primary.walk_away_price)}).`); return; }
    mutate((d) => { d.negotiation_finalization = [...d.negotiation_finalization, { finalization_id: `NF-${String(d.negotiation_finalization.length + 1).padStart(3, "0")}`, rfx_id: rfxId, supplier_id: primary.supplier_id, final_price: fp, savings_achieved: quote - fp, negotiation_summary: `Rounds concluded. ${supName(d, primary.supplier_id)} moved from ${fmtFull(quote)} to ${fmtFull(fp)} (−${(((quote - fp) / quote) * 100).toFixed(1)}%).`, finance_approval_status: "APPROVED", procurement_approval_status: "APPROVED", approved_by: "Rachel Kim", approved_at: nowTs() }]; });
    push("Negotiation finalised", `negotiation_finalization written · ${fmtUsd(quote - fp)} saved. Proceed to Award.`);
  };
  return (
    <div>
      <div className="page-head"><Eyebrow activity="Activity 05" tables={["negotiation_insights", "negotiation_finalization", "supplier_agent_memory"]} agent="Agent A6 — Negotiation" gotoTable={gotoTable} /><h2 className="page-title">Predictive Negotiation &amp; Multi-Round Optimization</h2><p className="page-desc">Benchmark, target and walk-away envelopes for the shortlisted suppliers on <b>{rfx.title}</b>. Finance must approve the envelope before any offer goes out.</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 16, marginBottom: 18 }}>
        {ins.map((n, k) => { const qp = db.rfx_response.find((r) => r.rfx_id === rfxId && r.supplier_id === n.supplier_id)?.quoted_total_price || n.walk_away_price; return (
          <div key={n.insight_id} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div className="mono muted" style={{ fontSize: 11 }}>{n.insight_id} · {k === 0 ? "primary" : "lever"}</div><h3 style={{ margin: "2px 0 8px" }}>{supName(db, n.supplier_id)}</h3></div>{n.approval_flag ? <span className="badge awarded">Finance approved</span> : can("FINANCE") ? <button className="btn btn-primary btn-sm" onClick={() => approve(n.insight_id)}>Approve envelope</button> : <span className="badge closing">Awaiting Finance</span>}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div className="card kpi" style={{ padding: 12 }}><div className="lbl">Benchmark · anchor</div><div className="val" style={{ fontSize: 18 }}>{fmtUsd(n.benchmark_price)}</div></div>
              <div className="card kpi" style={{ padding: 12 }}><div className="lbl">Target · internal</div><div className="val" style={{ fontSize: 18, color: "var(--emerald)" }}>{fmtUsd(n.target_price)}</div></div>
              <div className="card kpi" style={{ padding: 12 }}><div className="lbl">Walk-away · restricted</div><div className="val" style={{ fontSize: 18, color: "var(--red)" }}>{fmtUsd(n.walk_away_price)}</div></div></div>
            <div className="ladder">{[["Quoted", qp, "#c9d4e3"], ["Walk-away", n.walk_away_price, "var(--red)"], ["Benchmark", n.benchmark_price, "var(--amber)"], ["Target", n.target_price, "var(--emerald)"]].map(([l, v, c]) => <div key={l} className="rung"><span>{l}</span><i style={{ width: `${(v / qp) * 100}%`, background: c }}></i><b className="mono">{fmtFull(v)}</b></div>)}</div>
            <div className="section-label" style={{ marginTop: 10 }}>AI Recommendation</div><p style={{ fontSize: 12.5 }}>{n.ai_recommendation}</p>
            <div className="muted" style={{ fontSize: 11.5 }}>reviewed by {n.reviewed_by}{n.approved_by ? ` · approved by ${n.approved_by} ${n.approved_at}` : ""}</div>
          </div>); })}
      </div>
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <div className="section-label">Negotiation Outcome · negotiation_finalization</div>
        {fin ? <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 10 }}><div><div className="muted" style={{ fontSize: 12 }}>Final Price</div><b style={{ fontSize: 18 }}>{fmtFull(fin.final_price)}</b></div><div><div className="muted" style={{ fontSize: 12 }}>Savings Achieved</div><b style={{ fontSize: 18, color: "var(--emerald)" }}>{fmtFull(fin.savings_achieved)}</b></div><div><div className="muted" style={{ fontSize: 12 }}>Finance</div><Badge s={fin.finance_approval_status} /></div><div><div className="muted" style={{ fontSize: 12 }}>Procurement</div><Badge s={fin.procurement_approval_status} /></div></div>
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>{fin.negotiation_summary} — {fin.approved_by}, {fin.approved_at}</p>
          <button className="btn btn-primary" onClick={() => setPage("award")}>Continue to Award →</button></>
          : <>
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Record the negotiated outcome with {supName(db, primary.supplier_id)}. Quoted {fmtFull(quote)} · walk-away {fmtFull(primary.walk_away_price)}.</p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}><div><label>Final negotiated price (USD)</label><input type="number" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} placeholder={String(primary.target_price)} style={{ width: 220 }} /></div><button className="btn btn-ghost btn-sm" onClick={() => setFinalPrice(String(primary.target_price))}>Use target</button><button className="btn btn-primary" disabled={!primary.approval_flag || !can("NEGOTIATION", "PROC_MGR", "PROC_HEAD")} onClick={finalize}>Finalise negotiation</button>{!primary.approval_flag && <span className="muted" style={{ fontSize: 12 }}>Finance approval of the envelope is required first.</span>}</div></>}
      </div>
      <div className="card" style={{ padding: 20 }}><div className="section-label">Supplier memory used · supplier_agent_memory</div>{ins.map((n) => <div key={n.insight_id} style={{ marginBottom: 8, fontSize: 12.5 }}><b>{supName(db, n.supplier_id)}</b> — <span className="muted">{one(db, "supplier_agent_memory", "supplier_id", n.supplier_id)?.agent_notes_semantic}</span></div>)}</div>
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
  if (!fin) return <div><div className="page-head"><Eyebrow activity="Activity 06" tables={["supplier_selection_decisions", "rfx_approvals", "contract_intake_requests"]} agent="Agent A7 — Award" gotoTable={gotoTable} /><h2 className="page-title">Award Recommendation &amp; Contract Handover</h2></div><div className="card placeholder-card"><div className="icon">🏆</div><h3>No finalised negotiation for {rfxId}</h3><p style={{ fontSize: 13 }}>The award recommendation is assembled from negotiation_finalization. Finalise the negotiation first.</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setPage("negotiation")}>Go to Negotiation</button></div></div>;
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
      <div className="page-head"><Eyebrow activity="Activity 06" tables={["supplier_selection_decisions", "rfx_approvals", "contract_intake_requests"]} agent="Agent A7 — Award Recommendation" gotoTable={gotoTable} /><h2 className="page-title">Award Recommendation &amp; Contract Handover</h2></div>
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
      <div className="page-head"><Eyebrow activity="Workspace" tables={["rfx_questions", "rfx_question_responses"]} agent="Agent A8 — Supplier Q&A" gotoTable={gotoTable} /><h2 className="page-title">Supplier Q&amp;A</h2><p className="page-desc">Questions from invited suppliers on <b>{rfx.title}</b>. A8 drafts a grounded answer; a human approves and publishes — public answers go to every bidder.</p></div>
      <div className="cc-layout" style={{ gridTemplateColumns: "1.8fr 1fr" }}>
        <div>{qs.length === 0 && <div className="card placeholder-card"><div className="icon">💬</div><h3>No questions yet</h3><p style={{ fontSize: 13 }}>Q&A opens once the RFx is published.</p></div>}
          {qs.map((x) => { const a = one(db, "rfx_question_responses", "question_id", x.question_id); return (
            <div key={x.question_id} className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}><Ref t="rfx_questions" c="question_id" v={x.question_id} openRecord={openRecord} /><b style={{ color: "var(--text)" }}>{supName(db, x.supplier_id)}</b>· {x.section_reference} · {x.submitted_at}{x.is_private ? <span className="badge closing">private</span> : <span className="badge open">public</span>}<Badge s={x.submission_status} /></div>
              <p style={{ margin: "8px 0", fontSize: 13.5 }}>{x.question_text}</p>
              {a ? <div className="callout success"><div><b>Answer</b> · {a.answered_by} · approved by {a.approved_by} · {a.published_at}<br/>{a.response_text}{a.internal_notes && <div className="muted" style={{ marginTop: 4 }}>Internal: {a.internal_notes}</div>}</div></div>
                : !proc ? <div className="callout warn">Awaiting Procurement answer.</div> : <div><textarea placeholder="Draft answer…" value={drafts[x.question_id] || ""} onChange={(e) => setDrafts((d) => ({ ...d, [x.question_id]: e.target.value }))} style={{ minHeight: 70 }} /><div style={{ display: "flex", gap: 8, marginTop: 6 }}><button className="btn btn-ghost btn-sm" onClick={() => draftAi(x)}>✨ A8 draft</button><button className="btn btn-primary btn-sm" onClick={() => publish(x.question_id, x.is_private)}>Approve &amp; publish {x.is_private ? "(private)" : "(public)"}</button></div></div>}
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
  db.intake_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => { const r = one(db, "intake_requests", "request_id", a.request_id); items.push({ gate: "Intake Approval", ref: a.request_id, t: "intake_requests", c: "request_id", who: `${a.approver_role} · ${one(db, "sap_user_master", "BNAME", a.approver_bname)?.NAME_FIRST || ""}`, what: `Step ${a.approval_sequence}/3 · ${r?.category} · raised by ${r?.requestor_name}`, status: "PENDING", page: "demand-intake" }); });
  db.rfx_draft_versions.filter((v) => v.approval_status === "IN_REVIEW").forEach((v) => items.push({ gate: "RFx Draft", ref: v.draft_id, t: "rfx_draft_versions", c: "draft_id", who: "Legal Counsel", what: `${v.rfx_id} v${v.version_number}`, status: "IN_REVIEW", rfx: v.rfx_id, page: "rfx-creation-publish" }));
  db.bid_exceptions.filter((x) => x.resolution_status === "OPEN").forEach((x) => { const b = one(db, "bid_responses", "bid_id", x.bid_id); items.push({ gate: "Bid Exception", ref: x.bid_exceptions_id, t: "bid_exceptions", c: "bid_exceptions_id", who: "Sourcing Lead", what: `${nice(x.exception_type)} · ${supName(db, b?.supplier_id)} · ${b?.rfx_id}`, status: x.severity, rfx: b?.rfx_id, page: "rfx-creation-publish" }); });
  db.rfx_assigned_approvers.filter((a) => a.current_status === "PENDING").forEach((a) => items.push({ gate: "Evaluation", ref: a.assignment_id, t: "rfx_assigned_approvers", c: "assignment_id", who: one(db, "approver_availability_matrix", "user_id", a.approver_user_id)?.user_email, what: `Confirm ranking · ${a.rfx_id}`, status: "PENDING", rfx: a.rfx_id, page: "evaluation" }));
  db.negotiation_insights.filter((n) => !n.approval_flag).forEach((n) => items.push({ gate: "Negotiation", ref: n.insight_id, t: "negotiation_insights", c: "insight_id", who: "Finance Controller", what: `Envelope for ${supName(db, n.supplier_id)} · ${n.rfx_id}`, status: "PENDING", rfx: n.rfx_id, page: "negotiation" }));
  db.rfx_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => items.push({ gate: "Award", ref: a.approval_id, t: "rfx_approvals", c: "approval_id", who: `${a.approver_role} · ${a.approver_name}`, what: `Award step ${a.approval_sequence} · ${a.rfx_id}`, status: "PENDING", rfx: a.rfx_id, page: "award" }));
  db.contract_approvals.filter((a) => a.approval_status === "PENDING").forEach((a) => items.push({ gate: "Contract Approval", ref: a.approval_id, t: "contract_approvals", c: "approval_id", who: `${a.approver_role} · ${a.approver_name}`, what: `Sign-off ${a.contract_id}`, status: "PENDING", page: "new-contract-rollout" }));
  const history = [...db.rfx_approvals.filter((a) => a.approval_status === "APPROVED").map((a) => ({ ts: a.approved_at, gate: "Award", who: a.approver_name, what: a.rfx_id, ref: a.approval_id })), ...db.contract_approvals.filter((a) => a.approved_at).map((a) => ({ ts: a.approved_at, gate: "Contract", who: a.approver_name, what: a.contract_id, ref: a.approval_id })), ...db.negotiation_insights.filter((n) => n.approved_at).map((n) => ({ ts: n.approved_at, gate: "Negotiation", who: n.approved_by, what: n.rfx_id, ref: n.insight_id })), ...db.rfx_draft_versions.filter((v) => v.approved_at).map((v) => ({ ts: v.approved_at, gate: "RFx Draft", who: v.approved_by, what: v.rfx_id, ref: v.draft_id })), ...db.intake_approvals.filter((a) => a.approved_at).map((a) => ({ ts: a.approved_at, gate: "Intake", who: one(db, "sap_user_master", "BNAME", a.approver_bname)?.NAME_LAST || a.approver_role, what: a.request_id, ref: a.approval_id }))].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 12);
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
      <div className="page-head"><Eyebrow activity="Workspace" tables={["compliance", "personas_master", "human_in_loop_controls"]} gotoTable={gotoTable} /><h2 className="page-title">FAQ &amp; Knowledge Center</h2><p className="page-desc">Agent catalogue, HITL gates, personas and the compliance clause library — the reference material every agent grounds its answers in.</p></div>
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
    </div>);
}

/* ============================= SUPPLIER PERFORMANCE ============================= */
function SupplierPerformance({ db, mutate, push, openRecord, gotoTable }) {
  const cards = db.supplier_scorecards.filter((s) => s.evaluation_period === "2026-Q2").sort((a, b) => b.overall_score - a.overall_score);
  const [sel, setSel] = useState(cards[0]?.supplier_id);
  const kpis = q(db, "supplier_kpi_metrics", "supplier_id", sel); const qbr = db.supplier_qbr_reviews.find((x) => x.supplier_id === sel); const plans = q(db, "supplier_improvement_plans", "supplier_id", sel);
  return (
    <div>
      <div className="page-head"><Eyebrow activity="SPM 1.0–6.0" tables={["supplier_kpi_metrics", "supplier_scorecards", "supplier_qbr_reviews", "supplier_improvement_plans"]} gotoTable={gotoTable} /><h2 className="page-title">Supplier Scorecards &amp; QBR</h2><p className="page-desc">Ten weighted KPIs roll into a quarterly scorecard; QBRs and improvement plans hang off the result and feed back into supplier_agent_memory for the next sourcing event.</p></div>
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
      <div className="page-head"><Eyebrow activity="Cross-cutting" tables={["human_in_loop_controls", "agent_approval_routing_rules", "approver_availability_matrix"]} agent="A15" gotoTable={gotoTable} /><h2 className="page-title">HITL Gates &amp; Routing</h2><p className="page-desc">Every agent decision passes a gate. Routing rules pick the persona by value and risk; the availability matrix picks the person (or delegate).</p></div>
      <div className="card" style={{ padding: 0, marginBottom: 16 }}><div className="rc-table-head"><h3>Gates · human_in_loop_controls</h3></div><table><thead><tr><th>Stage</th><th>Entity</th><th>Decision</th><th>Primary</th><th>Supporting</th><th>Flow</th><th>Override</th><th>Audit</th></tr></thead><tbody>{db.human_in_loop_controls.map((h) => <tr key={h.hitl_id}><td><b>{h.process_stage}</b><div className="mono muted" style={{ fontSize: 10.5 }}>{h.hitl_id}</div></td><td><TableLink t={h.entity_table} gotoTable={gotoTable} /></td><td>{h.decision_type}</td><td>{one(db, "personas_master", "persona_id", h.primary_persona)?.persona_name}</td><td className="muted">{P(h.supporting_personas).map((p) => one(db, "personas_master", "persona_id", p)?.persona_name).join(", ") || "—"}</td><td className="muted" style={{ fontSize: 12 }}>{h.approval_flow}</td><td>{h.override_allowed ? <span className="bool yes">allowed</span> : <span className="bool no">locked</span>}</td><td>{h.audit_required ? <span className="bool yes">required</span> : ""}</td></tr>)}</tbody></table></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DataTable db={db} t="agent_approval_routing_rules" rows={db.agent_approval_routing_rules} cols={["rule_id", "process_stage", "persona_id", "min_value_threshold", "max_value_threshold", "risk_level_criteria", "is_active"]} openRecord={openRecord} gotoTable={gotoTable} />
        <DataTable db={db} t="approver_availability_matrix" rows={db.approver_availability_matrix} cols={["user_id", "persona_id", "user_email", "current_active_assignments", "is_available", "delegated_user_id"]} openRecord={openRecord} gotoTable={gotoTable} />
      </div>
    </div>);
}

/* ============================= MOUNT ============================= */
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    const reset = async () => { try { if (window.storage) { await window.storage.delete(STORAGE_KEY); await window.storage.delete(SESSION_KEY); } } catch (e) {} location.reload(); };
    return <div className="loading-row" style={{ padding: 40 }}><h3>Something went wrong while rendering.</h3><pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--muted)" }}>{String(this.state.err && this.state.err.message)}</pre><button className="btn btn-primary" onClick={reset}>Clear saved data and reload</button></div>;
  }
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><App /></ErrorBoundary>);

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
  const exportCsv = () => { const rows = [["workflow_id", "type", "name", "active", "escalate_days", "condition", "step_order", "step_name", "approver_role", "approvers"], ...db.workflow_steps.map((s) => { const w = one(db, "approval_workflows", "workflow_id", s.workflow_id); return [w.workflow_id, w.workflow_type, w.workflow_name, w.is_active, w.auto_escalate_days, condText(w) || "", s.step_order, s.step_name, roleName(s.approver_role_id), s.approver_count]; })]; download("workflows.csv", rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n"), "text/csv"); push("Exported", "workflows.csv"); };
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
  const DESC = { "user-management": ["Provision users from the SAP user master, assign roles, manage delegations and deactivations.", "sap_user_master · platform_roles"], "agent-processing": ["Monitor agent runs, queues, confidence scores and retries across A1–A17; replay or pause an agent.", "agent_evaluations · agent_assignment_evaluations"], "template-management": ["Maintain RFx, questionnaire, invitation-email and contract templates with versioning.", "rfx_draft_versions · documents"], "audit-logs": ["Immutable trail of every agent decision and human approval with before/after values.", "human_in_loop_controls · *_approvals"], settings: ["Organisation defaults: currencies, fiscal calendar, escalation SLAs, notification channels.", "—"] };
  const [d, t] = DESC[id] || ["", ""];
  return <div><div className="rp-head"><div><h2 className="page-title" style={{ fontSize: 26 }}>{label}</h2><p className="page-desc">{d}</p></div></div><div className="card placeholder-card"><div className="icon">🚧</div><h3>Coming soon</h3><p style={{ fontSize: 13, maxWidth: 520, margin: "6px auto 0" }}>This administration module is on the roadmap. It will operate on <span className="mono">{t}</span>.</p></div></div>;
}

