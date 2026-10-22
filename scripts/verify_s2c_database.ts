import { getS2cDatabaseMetrics, getS2cSnapshot } from "../server/s2cDatabase";

const metrics = await getS2cDatabaseMetrics();
const snapshot = await getS2cSnapshot();
if (metrics.tableCount !== 59) throw new Error(`Expected 59 tables, received ${metrics.tableCount}`);
if (metrics.rowCount !== 4524) throw new Error(`Expected 4,524 seeded rows, received ${metrics.rowCount}`);
if (snapshot.supplier.length !== 512) throw new Error(`Expected 512 suppliers, received ${snapshot.supplier.length}`);
if (snapshot.intake_requests.length !== 6) throw new Error(`Expected 6 intake requests, received ${snapshot.intake_requests.length}`);
console.log(JSON.stringify({ metrics, supplierRows: snapshot.supplier.length, intakeRows: snapshot.intake_requests.length }, null, 2));
