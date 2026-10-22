import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { TRPCError } from "@trpc/server";
import { mayDecideIntake } from "./_core/approvalPolicy";
import type { EmployeeIdentity } from "./_core/identity";

let pool: Pool | undefined;
export async function decideIntake(user: EmployeeIdentity, approvalId: string, decision: "APPROVED" | "REJECTED", comment: string) {
  if (!process.env.DATABASE_URL) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  pool ??= mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 4 });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [steps] = await connection.execute<RowDataPacket[]>("SELECT * FROM intake_approvals WHERE approval_id = ? FOR UPDATE", [approvalId]);
    const step = steps[0];
    if (!step) throw new TRPCError({ code: "NOT_FOUND" });
    if (!mayDecideIntake(user, step as { role_id: string; approver_bname: string; approval_status: string })) throw new TRPCError({ code: "FORBIDDEN", message: "Not the assigned pending approver" });
    const [reqs] = await connection.execute<RowDataPacket[]>("SELECT request_id, intake_status FROM intake_requests WHERE request_id = ? FOR UPDATE", [step.request_id]);
    if (reqs.length !== 1 || reqs[0].intake_status !== "UNDER_REVIEW") throw new TRPCError({ code: "CONFLICT", message: "Request is no longer under review" });
    await connection.execute("UPDATE intake_approvals SET approval_status=?, comments=?, approved_at=CURRENT_TIMESTAMP WHERE approval_id=? AND approval_status='PENDING'", [decision, comment, approvalId]);
    if (decision === "REJECTED") {
      await connection.execute("UPDATE intake_requests SET intake_status='REJECTED' WHERE request_id=?", [step.request_id]);
    } else {
      const [queued] = await connection.execute<RowDataPacket[]>("SELECT approval_id FROM intake_approvals WHERE request_id=? AND approval_status='QUEUED' ORDER BY approval_sequence LIMIT 1 FOR UPDATE", [step.request_id]);
      if (queued.length) await connection.execute("UPDATE intake_approvals SET approval_status='PENDING' WHERE approval_id=?", [queued[0].approval_id]);
      else await connection.execute("UPDATE intake_requests SET intake_status='APPROVED' WHERE request_id=?", [step.request_id]);
    }
    await connection.commit();
    return { approvalId, requestId: String(step.request_id), decision, decidedBy: user.bname };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
