import { applyS2cChanges, getS2cDatabaseMetrics, getS2cSnapshot, resetS2cDemoDatabase } from "../server/s2cDatabase";

const baseline = await getS2cSnapshot();
const target = baseline.rfx_events.find((row) => row.rfx_id === "RFX-2026-0731-001");
if (!target) throw new Error("Expected flagship RFx row");

await applyS2cChanges([{ table: "rfx_events", upserts: [{ ...target, status: "DATABASE_WRITE_TEST" }], deletes: [] }]);
const changed = await getS2cSnapshot();
if (changed.rfx_events.find((row) => row.rfx_id === target.rfx_id)?.status !== "DATABASE_WRITE_TEST") {
  throw new Error("Database update did not persist");
}

await resetS2cDemoDatabase();
const reset = await getS2cSnapshot();
const metrics = await getS2cDatabaseMetrics();
if (reset.rfx_events.find((row) => row.rfx_id === target.rfx_id)?.status !== target.status) {
  throw new Error("Database reset did not restore the deterministic seed");
}
if (metrics.tableCount !== 59 || metrics.rowCount !== 4524) throw new Error("Database reset did not restore the expected contract");
console.log(JSON.stringify({ writePersisted: true, resetRestored: true, tableCount: metrics.tableCount, rowCount: metrics.rowCount }, null, 2));
process.exit(0);
