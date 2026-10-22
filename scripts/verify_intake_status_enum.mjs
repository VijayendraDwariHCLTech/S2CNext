import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.beginTransaction();
  const [rows] = await connection.query("SELECT request_id, intake_status FROM intake_requests LIMIT 1 FOR UPDATE");
  const record = rows[0];
  if (!record) throw new Error("No intake request is available for status verification");

  await connection.execute("UPDATE intake_requests SET intake_status = ? WHERE request_id = ?", ["IN_PROCESS", record.request_id]);
  const [verifiedRows] = await connection.execute("SELECT intake_status FROM intake_requests WHERE request_id = ?", [record.request_id]);
  const accepted = verifiedRows[0]?.intake_status === "IN_PROCESS";
  if (!accepted) throw new Error("IN_PROCESS was not accepted by the live intake_status enum");

  console.log(JSON.stringify({ accepted, persisted: false, verification: "transaction rolled back" }));
  await connection.rollback();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
