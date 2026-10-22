import { SCHEMA, buildDatabase } from "./client/src/artifact/seed.js";

const db = buildDatabase(2026);
const tables = Object.keys(SCHEMA);
const summary = {
  tables: tables.length,
  columns: Object.values(SCHEMA).flat().length,
  tableArrays: tables.filter((table) => Array.isArray(db[table])).length,
  enterpriseUsers: db.enterprise_user_master.length,
  rfxEvents: db.rfx_events.length,
  extensionTables: [
    "platform_roles",
    "role_module_access",
    "enterprise_user_master",
    "intake_approvals",
    "vendor_master",
    "approval_workflows",
    "workflow_steps",
  ].filter((table) => tables.includes(table)).length,
};

console.log(JSON.stringify(summary, null, 2));
if (summary.tables !== 59 || summary.columns !== 544 || summary.tableArrays !== 59 || summary.extensionTables !== 7) {
  process.exitCode = 1;
}
