from pathlib import Path
import re

project = Path('/home/ubuntu/autonomous-s2c-platform-clone')
extract = project / '.artifact-extract'
src = project / 'client' / 'src'
(src / 'artifact').mkdir(parents=True, exist_ok=True)

seed = (extract / 'unnamed.js').read_text()
# Retain the artifact's localStorage compatibility shim and expose its exact schema + deterministic data builder.
seed = seed.replace('if (!window.storage)', 'if (typeof window !== "undefined" && !window.storage)', 1)
seed = seed.replace('var SCHEMA = {', 'export const SCHEMA = {', 1)
seed = seed.replace('var EXT_TABLES = ', 'export const EXT_TABLES = ', 1)
seed = seed.replace('var VENDOR_MASTER = ', 'export const VENDOR_MASTER = ', 1)
seed = seed.replace('function buildDatabase(seed = 2026) {', 'export function buildDatabase(seed = 2026) {', 1)
seed = seed.replace('sap_user_master', 'enterprise_user_master')
for old, new in {
    'Infosys': 'Nexa Digital',
    'Wipro': 'Aster Services',
    'Vijay Kumar': 'Morgan Shah',
    '"Vijay", "Kumar"': '"Morgan", "Shah"',
    'vijay.kumar': 'platform.admin',
    'SAP': 'Enterprise',
    'leona.example': 's2c.example',
}.items():
    seed = seed.replace(old, new)
(seed_path := src / 'artifact' / 'seed.js').write_text(seed)

app = (extract / 'app-source.js').read_text()
app = app.replace(
    'const { useState, useEffect, useCallback, useMemo, useRef } = React;',
    '// @ts-nocheck\nimport React, { useState, useEffect, useCallback, useMemo, useRef } from "react";\nimport { SCHEMA, buildDatabase } from "./artifact/seed";',
    1,
)
# Replace the artifact-only model bridge with a transparent, deterministic demo fallback.
start = app.index('async function callClaudeJson(')
end = app.index('/* ============================= TOASTS ============================= */', start)
fallback = '''async function callClaudeJson(systemPrompt, userMessage) {
  const requirementTitle = userMessage.replace(/^RFP need:\\s*/i, "").split("\\n")[0].trim() || "Sourcing requirement";
  if (systemPrompt.includes("RFP questionnaires")) {
    const areas = [
      ["Business outcomes", "Business value and measurable outcomes", "Describe the business outcomes, baselines and success measures.", "HIGH", "TEXT", 14],
      ["Solution scope", "Proposed solution and delivery model", "Describe the proposed delivery model, scope coverage and assumptions.", "HIGH", "TEXT", 14],
      ["Technical", "Architecture and integration", "Explain the proposed architecture, integrations and dependencies.", "HIGH", "TEXT", 12],
      ["Security", "Security and privacy controls", "Confirm security certifications, privacy controls and data-residency approach.", "HIGH", "FILE", 12],
      ["Implementation", "Transition plan", "Provide milestones, governance, transition approach and key risks.", "HIGH", "TEXT", 12],
      ["Commercial", "Pricing schedule", "Provide a transparent rate card, price assumptions and payment terms.", "HIGH", "NUMERIC", 12],
      ["Service", "Service levels", "State proposed SLAs, service credits and escalation commitments.", "MEDIUM", "TEXT", 10],
      ["Sustainability", "ESG evidence", "Provide relevant ESG commitments and supporting evidence.", "MEDIUM", "FILE", 7],
      ["References", "Comparable client references", "Provide two comparable reference engagements.", "MEDIUM", "TEXT", 7],
    ];
    return areas.map(([section, title, text, priority, type, weight]) => ({ section, title, text, priority, type, weight }));
  }
  if (systemPrompt.includes("complete enterprise RFP documents")) {
    const sections = ["Executive Summary", "Background & Objectives", "Scope of Services", "Supplier Instructions", "Technical Requirements", "Commercial Requirements", "Implementation & Transition", "Service Levels & Governance", "Security, Privacy & Compliance", "Evaluation Criteria", "Submission Checklist"];
    return { title: requirementTitle, category: "Professional Services", sections: sections.map((name, index) => ({ name, content: `${requirementTitle} — ${name}. This offline demonstration draft provides structured requirements for review. The procurement owner must validate commercial, legal, technical and delivery assumptions before publication. Respondents must clearly state assumptions, dependencies, risks and supporting evidence for this section.` })) };
  }
  return { extracted: {}, reply: "Please provide the next required detail.", section_complete: false, mode: "DETERMINISTIC_DEMO" };
}
'''
app = app[:start] + fallback + app[end:]
app = app.replace(
    'const root = ReactDOM.createRoot(document.getElementById("root"));\nroot.render(<ErrorBoundary><App /></ErrorBoundary>);',
    'export default App;',
    1,
)
# White-label remaining direct user and vendor references without changing application behavior.
replacements = {
    'Autonomous S2C Platform': 'Autonomous S2C Operations',
    'S2C Platform': 'S2C Operations',
    'vijay.kumar': 'platform.admin',
    'Vijay': 'Platform',
    'Infosys': 'Nexa Digital',
    'Wipro': 'Aster Services',
    'leona.example': 's2c.example',
}
for old, new in replacements.items():
    app = app.replace(old, new)
app = app.replace('sap_user_master', 'enterprise_user_master').replace('SAP', 'Enterprise')
(app_path := src / 'ArtifactClone.tsx').write_text(app)

css = (extract / 'unnamed.css').read_text()
css += '''\n\n/* Local clone refinement: make the 59-table truth explicit in the white-labelled demo. */\n.clone-notice { background: #eaf2fd; color: #0d4a99; border: 1px solid #c9daf3; border-radius: 8px; font-size: 12px; padding: 9px 12px; margin: 0 0 16px; line-height: 1.45; }\n@media (prefers-reduced-motion: no-preference) { .card, .nav-item, .btn { transition: transform 160ms cubic-bezier(.23,1,.32,1), box-shadow 180ms cubic-bezier(.23,1,.32,1), background-color 180ms ease; } .card:hover { box-shadow: 0 12px 28px rgba(11,37,69,.07); } .btn:active { transform: scale(.97); } }\n'''
(src / 'index.css').write_text(css)

app_shell = '''import ArtifactClone from "./ArtifactClone";\n\nexport default function App() {\n  return <ArtifactClone />;\n}\n'''
(src / 'App.tsx').write_text(app_shell)

index = (project / 'client' / 'index.html').read_text()
index = index.replace('<title>Autonomous S2C Platform Clone</title>', '<title>Autonomous S2C Operations — Demo Clone</title>')
(project / 'client' / 'index.html').write_text(index)

brief = '''# Autonomous S2C Operations — Clone Brief\n\nThis project is a **local, white-labelled static clone** of the inspected Autonomous S2C Platform v3 artifact. It contains no dependency on the Claude artifact at runtime and does not call external LLM services. Demo data is generated deterministically in the browser and persisted in local storage.\n\n## Included application behavior\n\nThe clone retains the role-profile sign-in journey, role-aware navigation, command center, S1–S12 workflow tracking, sourcing workspaces, approvals, supplier performance views, administration modules, Table Explorer, Domain Map, downloadable table data, seeded RFx workflows, and resettable local simulated data. AI-labelled questionnaire and RFP drafting paths retain their UI behavior but now return clearly deterministic, offline demo drafts.\n\n## Schema contract\n\nThe current schema surface contains **59 tables and 544 columns**. This comprises the original **52-table / 467-column core** plus seven operational extensions: platform roles, role-module access, enterprise user master, intake approvals, approval workflows, workflow steps, and vendor master. This corrects stale “52 tables” labels from the inspected artifact.\n\n| Category | Tables | Notes |\n|---|---:|---|\n| Base S2C schema | 52 | Intake, supplier, RFx, bids, evaluation, negotiation, award, contract, performance and governance domains |\n| Identity and approval extensions | 4 | `platform_roles`, `role_module_access`, `sap_user_master`, `intake_approvals` |\n| Vendor extension | 1 | `vendor_master` |\n| Workflow extensions | 2 | `approval_workflows`, `workflow_steps` |\n| **Live clone total** | **59** | **All tables are visible in Table Explorer** |\n\n## Deliberate white-labelling\n\nThe clone is branded as **Autonomous S2C Operations**. Direct references to the named administrator and selected vendor brands seen in the artifact have been replaced with generic equivalents. The UI data remains simulated demonstration data; it must not be treated as a production procurement source of truth.\n\n## Known boundary\n\nThis is a frontend-only demo clone. Sign-in is simulated through profile cards and local state; it is not authentication. The data store is browser local storage, not a database. No supplier messages, approval actions, or contracts are sent externally.\n'''
brief = brief.replace('sap_user_master', 'enterprise_user_master')
(project / 'CLONE_BRIEF.md').write_text(brief)

print('Generated:')
for path in [seed_path, app_path, src / 'index.css', src / 'App.tsx', project / 'CLONE_BRIEF.md']:
    print(path, path.stat().st_size)
