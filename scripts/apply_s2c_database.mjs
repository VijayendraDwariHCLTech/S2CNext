import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to apply the S2C database contract.");

const connection = await mysql.createConnection({ uri: databaseUrl, multipleStatements: true });
try {
  const schema = await fs.readFile(new URL("../generated/s2c_governed_schema.sql", import.meta.url), "utf8");
  const seed = await fs.readFile(new URL("../generated/s2c_demo_seed.sql", import.meta.url), "utf8");
  await connection.query(schema);
  await connection.query(seed);
  const [rows] = await connection.query(`
    SELECT COUNT(*) AS table_count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN (
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = DATABASE()
        GROUP BY table_name
        HAVING COUNT(*) > 0
      )
  `);
  const [intake] = await connection.query("SELECT COUNT(*) AS row_count FROM intake_requests");
  const [supplier] = await connection.query("SELECT COUNT(*) AS row_count FROM supplier");
  console.log(JSON.stringify({ applied: true, databaseTableCount: rows[0].table_count, intakeRows: intake[0].row_count, supplierRows: supplier[0].row_count }, null, 2));
} finally {
  await connection.end();
}
