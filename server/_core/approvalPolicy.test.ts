import { describe, it, expect } from "vitest";
import { assertNoGovernedGenericWrites, mayDecideIntake } from "./approvalPolicy";
const employee = { bname: "FIN001", platformRole: "FINANCE" };
describe("server-side intake approval policy", () => {
  it("allows only the exact assigned pending approver", () => {
    expect(mayDecideIntake(employee, { role_id: "FINANCE", approver_bname: "FIN001", approval_status: "PENDING" })).toBe(true);
    expect(mayDecideIntake(employee, { role_id: "FINANCE", approver_bname: "OTHER", approval_status: "PENDING" })).toBe(false);
    expect(mayDecideIntake(employee, { role_id: "LEGAL", approver_bname: "FIN001", approval_status: "PENDING" })).toBe(false);
    expect(mayDecideIntake(employee, { role_id: "FINANCE", approver_bname: "FIN001", approval_status: "APPROVED" })).toBe(false);
    expect(mayDecideIntake({ bname: "ADMIN", platformRole: "ADMIN" }, { role_id: "FINANCE", approver_bname: "FIN001", approval_status: "PENDING" })).toBe(false);
  });
  it("blocks generic writes to governed process tables", () => {
    expect(() => assertNoGovernedGenericWrites([{ table: "intake_approvals" }])).toThrow();
    expect(() => assertNoGovernedGenericWrites([{ table: "enterprise_user_master" }])).toThrow();
    expect(() => assertNoGovernedGenericWrites([{ table: "supplier" }])).not.toThrow();
  });
});
