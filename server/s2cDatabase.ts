import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";
import { S2C_DEMO_DATA } from "./s2cDemoSeed";
import { S2C_PRIMARY_KEYS, S2C_TABLE_COLUMNS, S2C_TABLE_NAMES, type S2cTableName } from "../shared/s2cSchemaContract";

export type S2cRow = Record<string, unknown>;
export type S2cSnapshot = Record<S2cTableName, S2cRow[]>;
export type S2cChange = {
  table: S2cTableName;
  upserts: S2cRow[];
  deletes: S2cRow[];
};

// DATE columns must never receive conversational text such as
// "Award by end of November". Optional dates are stored as NULL when the
// value is missing or not an unambiguous ISO date; required dates still fail
// at the database boundary with the normal NOT NULL constraint if a caller
// does not provide a valid value.
const DATE_ONLY_COLUMNS = new Set([
  "compliance.effective_date",
  "intake_commercials_timelines.sourcing_start_date",
  "intake_commercials_timelines.rfp_issue_date",
  "intake_commercials_timelines.award_date",
  "intake_commercials_timelines.service_start_date",
  "rfx_events.issue_date",
  "rfx_events.due_date",
  "rfx_events.closed_date",
  "supplier.kyc_verified_date",
  "supplier_improvement_plans.target_date",
  "invoices.invoice_date",
  "invoices.payment_date",
  "negotiation_market_benchmarks.valid_from",
  "negotiation_market_benchmarks.valid_to",
  "sourcing_cycle_history.intake_date",
  "sourcing_cycle_history.awarded_date",
  "supplier_diversity.verified_at",
]);

let pool: Pool | null = null;
let mutationQueue: Promise<unknown> = Promise.resolve();

function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const next = mutationQueue.then(operation, operation);
  mutationQueue = next.then(() => undefined, () => undefined);
  return next;
}

function isRetryableTransactionError(error: unknown) {
  const code = String((error as { code?: unknown })?.code || "");
  return code === "ER_LOCK_WAIT_TIMEOUT" || code === "ER_LOCK_DEADLOCK" || code === "LOCK_WAIT_TIMEOUT" || code === "DEADLOCK";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 6, charset: "utf8mb4" });
  }
  return pool;
}

function tableSql(table: S2cTableName) {
  return mysql.escapeId(table);
}

function columnSql(column: string) {
  return mysql.escapeId(column);
}

function normalizeValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return value;
}

export function normalizeS2cDateValue(table: string, column: string, value: unknown): string | null | undefined {
  if (!DATE_ONLY_COLUMNS.has(`${table}.${column}`)) return normalizeValue(value) as string | null | undefined;
  if (value === undefined || value === null || String(value).trim() === "") return null;

  const raw = value instanceof Date
    ? (Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : "")
    : String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.\d{1,3})?)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)$/.exec(raw);
  if (!match) return null;

  const isoDay = `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(`${isoDay}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === isoDay ? isoDay : null;
}

function serializeRow(row: RowDataPacket): S2cRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]));
}

function prepareRow(table: S2cTableName, row: S2cRow): S2cRow {
  const allowed = new Set(S2C_TABLE_COLUMNS[table]);
  const prepared: S2cRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key)) prepared[key] = normalizeS2cDateValue(table, key, value);
  }
  return prepared;
}

function requirePrimaryKey(table: S2cTableName, row: S2cRow) {
  const key = S2C_PRIMARY_KEYS[table];
  if (key.some((column) => row[column] === undefined || row[column] === null)) {
    throw new Error(`Missing primary key for ${table}`);
  }
}

async function upsert(connection: PoolConnection, table: S2cTableName, rows: S2cRow[]) {
  if (!rows.length) return;
  const columns = S2C_TABLE_COLUMNS[table];
  const primary = S2C_PRIMARY_KEYS[table];
  const prepared = rows.map((row) => prepareRow(table, row));
  for (const row of prepared) {
    requirePrimaryKey(table, row);
    const presentColumns = columns.filter((column) => Object.prototype.hasOwnProperty.call(row, column));
    if (!presentColumns.length) continue;
    const values = presentColumns.map((column) => row[column]);
    const updates = presentColumns
      .filter((column) => !primary.includes(column))
      .map((column) => `${columnSql(column)} = VALUES(${columnSql(column)})`);
    const sql = `INSERT INTO ${tableSql(table)} (${presentColumns.map(columnSql).join(", ")}) VALUES (${presentColumns.map(() => "?").join(", ")})${updates.length ? ` ON DUPLICATE KEY UPDATE ${updates.join(", ")}` : ""}`;
    await connection.execute(sql, values as any[]);
  }
}

async function remove(connection: PoolConnection, table: S2cTableName, rows: S2cRow[]) {
  if (!rows.length) return;
  const primary = S2C_PRIMARY_KEYS[table];
  for (const row of rows) {
    requirePrimaryKey(table, row);
    const where = primary.map((column) => `${columnSql(column)} = ?`).join(" AND ");
    await connection.execute(`DELETE FROM ${tableSql(table)} WHERE ${where}`, primary.map((column) => row[column]) as any[]);
  }
}

async function insertSeedRows(connection: PoolConnection, table: S2cTableName, rows: S2cRow[]) {
  if (!rows.length) return;
  const columns = S2C_TABLE_COLUMNS[table];
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100).map((row) => prepareRow(table, row));
    const values = batch.flatMap((row) => columns.map((column) => row[column] ?? null));
    const placeholders = batch.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
    await connection.execute(
      `INSERT INTO ${tableSql(table)} (${columns.map(columnSql).join(", ")}) VALUES ${placeholders}`,
      values as any[],
    );
  }
}

export async function getS2cSnapshot(): Promise<S2cSnapshot> {
  const connection = await getPool().getConnection();
  try {
    const tables = await Promise.all(
      S2C_TABLE_NAMES.map(async (table) => {
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${tableSql(table)}`);
        return [table, rows.map(serializeRow)] as const;
      }),
    );
    return Object.fromEntries(tables) as S2cSnapshot;
  } finally {
    connection.release();
  }
}

async function applyS2cChangesOnce(changes: S2cChange[]) {
  const connection = await getPool().getConnection();
  let foreignKeysDisabled = false;
  try {
    await connection.beginTransaction();
    // Changes can span parent and child tables (for example, documents and
    // rfx_documents). The UI diff is already generated from validated tables;
    // temporarily defer checks so a multi-table state transition is atomic.
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    foreignKeysDisabled = true;
    for (const change of changes) await remove(connection, change.table, change.deletes);
    for (const change of changes) await upsert(connection, change.table, change.upserts);
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    foreignKeysDisabled = false;
    await connection.commit();
    return { changedTables: changes.map((change) => change.table) };
  } catch (error) {
    try { await connection.rollback(); } catch { /* preserve the original database error */ }
    throw error;
  } finally {
    // Pool connections retain session variables. Never return a connection to
    // the pool with FK checks disabled after a failed transaction.
    if (foreignKeysDisabled) {
      try { await connection.query("SET FOREIGN_KEY_CHECKS = 1"); } catch { /* connection may already be invalid */ }
    }
    connection.release();
  }
}

export async function applyS2cChanges(changes: S2cChange[]) {
  return enqueueMutation(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await applyS2cChangesOnce(changes);
      } catch (error) {
        lastError = error;
        if (!isRetryableTransactionError(error) || attempt === 2) throw error;
        await sleep(250 * (attempt + 1));
      }
    }
    throw lastError;
  });
}

async function resetS2cDemoDatabaseOnce() {
  const connection = await getPool().getConnection();
  let foreignKeysDisabled = false;
  try {
    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    foreignKeysDisabled = true;
    for (const table of [...S2C_TABLE_NAMES].reverse()) await connection.query(`DELETE FROM ${tableSql(table)}`);
    for (const table of S2C_TABLE_NAMES) await insertSeedRows(connection, table, (S2C_DEMO_DATA[table] || []) as S2cRow[]);
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    foreignKeysDisabled = false;
    await connection.commit();
    return { reset: true, tableCount: S2C_TABLE_NAMES.length };
  } catch (error) {
    try { await connection.rollback(); } catch { /* preserve the original database error */ }
    throw error;
  } finally {
    if (foreignKeysDisabled) {
      try { await connection.query("SET FOREIGN_KEY_CHECKS = 1"); } catch { /* connection may already be invalid */ }
    }
    connection.release();
  }
}

export async function resetS2cDemoDatabase() {
  return enqueueMutation(resetS2cDemoDatabaseOnce);
}

export async function getS2cDatabaseMetrics() {
  const connection = await getPool().getConnection();
  try {
    const counts = await Promise.all(
      S2C_TABLE_NAMES.map(async (table) => {
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS rowCount FROM ${tableSql(table)}`);
        return { table, rowCount: Number(rows[0]?.rowCount ?? 0) };
      }),
    );
    return { tableCount: S2C_TABLE_NAMES.length, rowCount: counts.reduce((total, item) => total + item.rowCount, 0), counts };
  } finally {
    connection.release();
  }
}
