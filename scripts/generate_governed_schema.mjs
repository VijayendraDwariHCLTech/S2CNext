import fs from "node:fs";
import path from "node:path";
import { SCHEMA as BASE_SCHEMA, EXT_TABLES, buildDatabase } from "../client/src/artifact/seed.js";
import { V5_SCHEMA_EXTENSIONS, V5_DEMO_DATA } from "./v5SchemaExtensions.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "generated");
fs.mkdirSync(outputDir, { recursive: true });
const SCHEMA = { ...BASE_SCHEMA, ...V5_SCHEMA_EXTENSIONS };

const explicitEnums = {
  "bid_attachments.classification": ["TECHNICAL_PROPOSAL", "COMMERCIAL_PROPOSAL", "LEGAL", "OTHER"],
  "bid_exceptions.exception_type": ["MISSING_FIELD", "CURRENCY_MISMATCH", "UOM_MISMATCH", "INVALID_VALUE", "DUPLICATE", "OTHER"],
  "bid_exceptions.severity": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  "bid_exceptions.resolution_status": ["OPEN", "IN_REVIEW", "RESOLVED", "WAIVED"],
  "bid_responses.source_channel": ["PORTAL", "EMAIL", "API", "MANUAL"],
  "bid_responses.status": ["RECEIVED", "NORMALIZED", "EXCEPTION_REVIEW", "REJECTED"],
  "compliance.priority": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  "contract_documents.visibility": ["INTERNAL", "SUPPLIER", "RESTRICTED"],
  "contract_documents.classification": ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
  "documents.document_type": ["RFP", "RFQ", "REQUIREMENTS", "PRICING_TEMPLATE", "BID_PROPOSAL", "BID_PRICING", "AWARD_MEMO", "CONTRACT_DRAFT", "INVITATION", "MSA", "KYC", "OTHER"],
  "documents.status": ["ACTIVE", "ARCHIVED", "SUPERSEDED", "DELETED"],
  "intake_commercials_timelines.capex_opex": ["CAPEX", "OPEX"],
  "intake_documents.visibility": ["INTERNAL", "SUPPLIER", "RESTRICTED"],
  "intake_requests.priority": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  "intake_requests.intake_status": ["DRAFT", "IN_PROCESS", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  "rfx_documents.visibility": ["INTERNAL", "SUPPLIER", "RESTRICTED"],
  "rfx_documents.phase": ["DRAFT", "ISSUE", "EVALUATION", "AWARD", "CONTRACT"],
  "rfx_requirements.priority_level": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  "rfx_requirements.response_type": ["TEXT", "NUMERIC", "YES_NO", "CHOICE", "FILE"],
  "supplier.kyc_status": ["PENDING", "VERIFIED", "EXPIRED", "REJECTED"],
  "supplier_documents.visibility": ["INTERNAL", "SUPPLIER", "RESTRICTED"],
};

const compatibilityTypeOverrides = {
  "enterprise_user_master.BNAME": "VARCHAR(30)",
  "enterprise_user_master.MANAGER_BNAME": "VARCHAR(30)",
  "intake_approvals.approver_bname": "VARCHAR(30)",
};

const compositePrimaryKeys = {
  bid_attachments: ["bid_id", "document_id"],
  contract_documents: ["contract_id", "document_id"],
  intake_documents: ["request_id", "document_id"],
  rfx_documents: ["rfx_id", "document_id"],
  supplier_documents: ["supplier_id", "document_id"],
  role_module_access: ["role_id", "module_id"],
  enterprise_user_master: ["BNAME"],
};

const primaryKeyOverrides = {
  supplier_agent_memory: ["supplier_id"],
  supplier_classification: ["supplier_id"],
  supplier_esg_compliance: ["supplier_id"],
  supplier_external_enrichment: ["supplier_id"],
  supplier_product_profiles: ["supplier_id"],
  supplier_risk_profile: ["supplier_id"],
  supplier_services_profiles: ["supplier_id"],
  supplier_software_profiles: ["supplier_id"],
  intake_commercials_timelines: ["request_id"],
  intake_evaluation_weights: ["request_id"],
  intake_scope_specs: ["request_id"],
  intake_strategy_governance: ["request_id"],
  rfx_weight_configs: ["rfx_id"],
};

const fkMap = {
  persona_id: ["personas_master", "persona_id"],
  primary_persona: ["personas_master", "persona_id"],
  supplier_id: ["supplier", "supplier_id"],
  final_selected_supplier: ["supplier", "supplier_id"],
  rfx_id: ["rfx_events", "rfx_id"],
  linked_RFx: ["rfx_events", "rfx_id"],
  linked_rfx: ["rfx_events", "rfx_id"],
  request_id: ["intake_requests", "request_id"],
  contract_id: ["contract_intake_requests", "contract_id"],
  document_id: ["documents", "document_id"],
  bid_id: ["bid_responses", "bid_id"],
  question_id: ["rfx_questions", "question_id"],
  requirement_id: ["rfx_requirements", "requirement_id"],
  approver_user_id: ["approver_availability_matrix", "user_id"],
  delegated_user_id: ["approver_availability_matrix", "user_id"],
  rfx_category: ["rfx_category", "rfx_category"],
  evaluation_id: ["agent_assignment_evaluations", "evaluation_id"],
  role_id: ["platform_roles", "role_id"],
  approver_role_id: ["platform_roles", "role_id"],
  workflow_id: ["approval_workflows", "workflow_id"],
  PLATFORM_ROLE: ["platform_roles", "role_id"],
  approver_bname: ["enterprise_user_master", "BNAME"],
  MANAGER_BNAME: ["enterprise_user_master", "BNAME"],
  negotiation_case_id: ["negotiation_cases", "negotiation_case_id"],
  negotiation_round_id: ["negotiation_rounds", "negotiation_round_id"],
  offer_id: ["negotiation_offers", "offer_id"],
  tactic_id: ["negotiation_playbook_tactics", "tactic_id"],
  signal_id: ["market_signals", "signal_id"],
  source_offer_id: ["negotiation_offers", "offer_id"],
  batna_scenario_id: ["negotiation_batna_scenarios", "batna_scenario_id"],
  case_tactic_id: ["negotiation_case_tactics", "case_tactic_id"],
};

const db = { ...buildDatabase(2026), ...V5_DEMO_DATA };
db.role_module_access = [
  ...(db.role_module_access || []),
  ...[
    ["ADMIN", "dynamic-resourcing", "ADMIN"],
    ["PROC_HEAD", "dynamic-resourcing", "APPROVE"],
    ["PROC_MGR", "dynamic-resourcing", "APPROVE"],
    ["PROC_TEAM", "dynamic-resourcing", "EDIT"],
    ["NEGOTIATION", "dynamic-resourcing", "EDIT"],
    ["FINANCE", "dynamic-resourcing", "VIEW"],
    ["EXEC", "dynamic-resourcing", "VIEW"],
  ].map(([role_id, module_id, access_level]) => ({ role_id, module_id, access_level })),
];
const q = (identifier) => `\`${String(identifier).replaceAll("`", "``")}\``;
const esc = (value) => `'${String(value).replaceAll("'", "''")}'`;
const typeFor = (table, column, sourceType) => {
  const key = `${table}.${column}`;
  if (compatibilityTypeOverrides[key]) return compatibilityTypeOverrides[key];
  if (explicitEnums[key]) return `ENUM(${explicitEnums[key].map(esc).join(",")})`;
  if (sourceType === "UNKNOWN") return "JSON";
  if (sourceType === "CLNT(3)") return "CHAR(3)";
  if (sourceType === "NUMC(8)") return "CHAR(8)";
  // The inspected artifact labels SAP-style date fields as DATS(8), while the
  // approved demo seed stores ISO date strings. VARCHAR(10) preserves both
  // representations without changing the original column name or semantics.
  if (sourceType === "DATS(8)") return "VARCHAR(10)";
  if (sourceType === "INT1") return "TINYINT UNSIGNED";
  if (/^ENUM/.test(sourceType)) return "VARCHAR(50)";
  return sourceType;
};

function pkFor(table, columns) {
  return compositePrimaryKeys[table] || primaryKeyOverrides[table] || [columns[0][0]];
}

function isNullable(table, column, sourceType) {
  const rows = db[table] || [];
  if (!rows.length) return true;
  if (pkFor(table, SCHEMA[table]).includes(column)) return false;
  return rows.some((row) => row[column] === null || row[column] === undefined) || sourceType === "UNKNOWN";
}

function valueSql(value, sourceType) {
  if (value === undefined || value === null || value === "") return "NULL";
  if (/^(INT|BIGINT|TINYINT|DECIMAL)/.test(sourceType)) return Number.isFinite(Number(value)) ? String(value) : "NULL";
  if (sourceType === "JSON" || sourceType === "UNKNOWN") return esc(typeof value === "string" ? value : JSON.stringify(value));
  return esc(value);
}

const sql = [
  "-- S2C governed MySQL/TiDB schema contract v1",
  "-- 79 tables / expanded V5 contract, preserving existing artifact names and columns.",
  "SET FOREIGN_KEY_CHECKS = 0;",
  ...Object.keys(SCHEMA).map((table) => `DROP TABLE IF EXISTS ${q(table)};`),
  "SET FOREIGN_KEY_CHECKS = 1;",
  "",
];
const deferredConstraints = [];

for (const [table, columns] of Object.entries(SCHEMA)) {
  const pk = pkFor(table, columns);
  const lines = columns.map(([column, sourceType]) => `  ${q(column)} ${typeFor(table, column, sourceType)}${isNullable(table, column, sourceType) ? " NULL" : " NOT NULL"}`);
  lines.push(`  PRIMARY KEY (${pk.map(q).join(", ")})`);
  const indexes = [];
  const constraints = [];
  for (const [column] of columns) {
    const target = fkMap[column];
    if (!target || target[0] === table) continue;
    const targetCols = SCHEMA[target[0]]?.map(([name]) => name) || [];
    if (!targetCols.includes(target[1])) continue;
    const sourceType = columns.find(([name]) => name === column)?.[1] || "";
    const targetType = SCHEMA[target[0]].find(([name]) => name === target[1])?.[1] || "";
    const compatible = typeFor(table, column, sourceType).replace(/\(.*/, "") === typeFor(target[0], target[1], targetType).replace(/\(.*/, "");
    indexes.push(`  INDEX ${q(`idx_${table}_${column}`)} (${q(column)})`);
    if (compatible) constraints.push(`ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(`fk_${table}_${column}`)} FOREIGN KEY (${q(column)}) REFERENCES ${q(target[0])} (${q(target[1])});`);
  }
  for (const item of indexes) lines.push(item);
  deferredConstraints.push(...constraints);
  sql.push(`CREATE TABLE ${q(table)} (\n${lines.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=${esc(EXT_TABLES.includes(table) ? "S2C extension table" : "S2C governed core table")};`, "");
}
sql.push("-- Constraints are applied after all tables exist to support cross-domain references.", ...deferredConstraints, "");

const seedLines = ["-- Deterministic S2C demo data seed v1", "SET FOREIGN_KEY_CHECKS = 0;"];
for (const table of Object.keys(SCHEMA)) {
  const rows = db[table] || [];
  if (!rows.length) continue;
  const columns = SCHEMA[table];
  const columnNames = columns.map(([name]) => name);
  const sourceTypes = columns.map(([, sourceType]) => sourceType);
  for (const row of rows) {
    const values = columnNames.map((name, index) => valueSql(row[name], sourceTypes[index]));
    seedLines.push(`INSERT INTO ${q(table)} (${columnNames.map(q).join(", ")}) VALUES (${values.join(", ")});`);
  }
}
seedLines.push("SET FOREIGN_KEY_CHECKS = 1;");

const fieldDefs = Object.entries(SCHEMA).map(([table, columns]) => ({
  table,
  extension: EXT_TABLES.includes(table),
  primaryKey: pkFor(table, columns),
  columns: columns.map(([name, sourceType]) => ({ name, sourceType, sqlType: typeFor(table, name, sourceType), nullable: isNullable(table, name, sourceType), enumValues: explicitEnums[`${table}.${name}`] || null, reference: fkMap[name] || null })),
}));
const report = {
  version: 1,
  engine: "MySQL/TiDB",
  tableCount: fieldDefs.length,
  columnCount: fieldDefs.reduce((sum, table) => sum + table.columns.length, 0),
  note: "Option B contract: original names and columns preserved; primary keys, nullability, indexes and selected foreign keys explicit. Nullable fields follow the approved demo-data compatibility rule. Enum domains are expanded to production-capable values while preserving all seeded values.",
  tables: fieldDefs,
};

fs.writeFileSync(path.join(outputDir, "s2c_governed_schema.sql"), sql.join("\n"));
fs.writeFileSync(path.join(outputDir, "s2c_demo_seed.sql"), seedLines.join("\n"));
fs.writeFileSync(path.join(outputDir, "s2c_schema_contract.json"), JSON.stringify(report, null, 2));
const sharedDir = path.join(root, "shared");
fs.mkdirSync(sharedDir, { recursive: true });
const artifactDir = path.join(root, "client", "src", "artifact");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "governedSchema.js"),
  `// Generated from the approved 79-table contract. Do not edit manually.\nexport const SCHEMA = ${JSON.stringify(SCHEMA)};\n`,
);
fs.writeFileSync(
  path.join(sharedDir, "s2cSchemaContract.ts"),
  `// Generated from the approved 79-table contract. Do not edit manually.\n` +
    `export const S2C_TABLE_NAMES = ${JSON.stringify(fieldDefs.map((table) => table.table), null, 2)} as const;\n` +
    `export type S2cTableName = (typeof S2C_TABLE_NAMES)[number];\n` +
    `export const S2C_PRIMARY_KEYS: Record<S2cTableName, readonly string[]> = ${JSON.stringify(Object.fromEntries(fieldDefs.map((table) => [table.table, table.primaryKey])), null, 2)};\n` +
    `export const S2C_TABLE_COLUMNS: Record<S2cTableName, readonly string[]> = ${JSON.stringify(Object.fromEntries(fieldDefs.map((table) => [table.table, table.columns.map((column) => column.name)])), null, 2)};\n` +
    `export const S2C_SCHEMA_VERSION = 2 as const;\n`,
);
fs.writeFileSync(
  path.join(root, "server", "s2cDemoSeed.ts"),
  `// Generated deterministic demo rows for the S2C MySQL/TiDB seed. SAP identity is mirrored from enterprise_user_master by the server adapter.\n` +
    `export const S2C_DEMO_DATA: Record<string, Array<Record<string, unknown>>> = ${JSON.stringify(Object.fromEntries(Object.keys(SCHEMA).map((table) => [table, db[table] || []])))};\n`,
);

function drizzleBuilder(table, column, sourceType) {
  const sqlType = typeFor(table, column, sourceType);
  const key = `${table}.${column}`;
  const varcharMatch = /^VARCHAR\((\d+)\)$/.exec(sqlType);
  const charMatch = /^CHAR\((\d+)\)$/.exec(sqlType);
  const decimalMatch = /^DECIMAL\((\d+),(\d+)\)$/.exec(sqlType);
  let builder;
  if (explicitEnums[key]) builder = `mysqlEnum(${JSON.stringify(column)}, ${JSON.stringify(explicitEnums[key])})`;
  else if (sqlType === "JSON") builder = `json(${JSON.stringify(column)})`;
  else if (sqlType === "TEXT") builder = `text(${JSON.stringify(column)})`;
  else if (sqlType === "LONGTEXT") builder = `longtext(${JSON.stringify(column)})`;
  else if (sqlType === "TIMESTAMP") builder = `timestamp(${JSON.stringify(column)}, { mode: "string" })`;
  else if (sqlType === "DATE") builder = `date(${JSON.stringify(column)}, { mode: "string" })`;
  else if (decimalMatch) builder = `decimal(${JSON.stringify(column)}, { precision: ${decimalMatch[1]}, scale: ${decimalMatch[2]} })`;
  else if (sqlType === "BIGINT") builder = `bigint(${JSON.stringify(column)}, { mode: "number" })`;
  else if (/^(INT|TINYINT)/.test(sqlType)) builder = sqlType.startsWith("TINYINT") ? `tinyint(${JSON.stringify(column)})` : `int(${JSON.stringify(column)})`;
  else if (varcharMatch) builder = `varchar(${JSON.stringify(column)}, { length: ${varcharMatch[1]} })`;
  else if (charMatch) builder = `char(${JSON.stringify(column)}, { length: ${charMatch[1]} })`;
  else builder = `varchar(${JSON.stringify(column)}, { length: 255 })`;
  if (!isNullable(table, column, sourceType)) builder += ".notNull()";
  return builder;
}

const schemaLines = [
  '// Generated from the approved S2C 79-table contract. Do not edit manually.',
  'import { bigint, char, date, decimal, int, json, longtext, mysqlEnum, mysqlTable, primaryKey, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";',
  '',
  'export const S2C_SCHEMA_VERSION = 2 as const;',
  '',
];
for (const [table, columns] of Object.entries(SCHEMA)) {
  const exportName = `${table}Table`;
  const pk = pkFor(table, columns);
  schemaLines.push(`export const ${exportName} = mysqlTable(${JSON.stringify(table)}, {`);
  for (const [column, sourceType] of columns) schemaLines.push(`  ${JSON.stringify(column)}: ${drizzleBuilder(table, column, sourceType)},`);
  schemaLines.push(`}, (table) => [`);
  schemaLines.push(`  primaryKey({ columns: [${pk.map((column) => `table[${JSON.stringify(column)}]`).join(", ")}] }),`);
  schemaLines.push(`]);`, '');
}
fs.writeFileSync(path.join(root, "drizzle", "s2cSchema.ts"), schemaLines.join("\n"));
fs.mkdirSync(path.join(root, "drizzle", "migrations"), { recursive: true });
fs.writeFileSync(path.join(root, "drizzle", "migrations", "0001_s2c_governed_schema.sql"), sql.join("\n"));
console.log(JSON.stringify({ tables: report.tableCount, columns: report.columnCount, schemaSqlBytes: sql.join("\n").length, seedSqlBytes: seedLines.join("\n").length }, null, 2));
