import { SCHEMA, buildDatabase } from "../client/src/artifact/seed.js";

const db = buildDatabase(2026);
const overflows = [];
for (const [table, columns] of Object.entries(SCHEMA)) {
  for (const [column, sourceType] of columns) {
    const match = /^(?:VARCHAR|CHAR)\((\d+)\)$/.exec(sourceType);
    if (!match) continue;
    const limit = Number(match[1]);
    const max = Math.max(0, ...(db[table] || []).map((row) => String(row[column] ?? "").length));
    if (max > limit) overflows.push({ table, column, sourceType, limit, max });
  }
}
console.log(JSON.stringify(overflows, null, 2));
