import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

export type EmployeeIdentity = { bname: string; email: string; displayName: string; platformRole: string };
let pool: Pool | undefined;
export async function resolveEmployee(email: string): Promise<EmployeeIdentity | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool ??= mysql.createPool({ uri: url, connectionLimit: 4 });
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT BNAME, SMTP_ADDR, NAME_FIRST, NAME_LAST, PLATFORM_ROLE, UFLAG FROM enterprise_user_master WHERE LOWER(TRIM(SMTP_ADDR)) = LOWER(?) LIMIT 2",
    [email.trim()],
  );
  if (rows.length !== 1 || Number(rows[0].UFLAG) !== 0) return null;
  const row = rows[0];
  return { bname: String(row.BNAME).trim(), email: String(row.SMTP_ADDR).trim(), displayName: `${String(row.NAME_FIRST).trim()} ${String(row.NAME_LAST).trim()}`, platformRole: String(row.PLATFORM_ROLE).trim() };
}
