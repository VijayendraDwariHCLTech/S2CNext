/** The DB-specified pending step is authoritative; admin is NOT a universal approver. */
export function mayDecideIntake(user: { bname: string; platformRole: string }, step: { role_id: string; approver_bname: string; approval_status: string }) {
  return step.approval_status === "PENDING" && step.role_id === user.platformRole && step.approver_bname.trim() === user.bname;
}
export const GOVERNED_TABLES = new Set([
  "intake_approvals", "intake_requests", "intake_commercials_timelines", "intake_scope_specs", "intake_strategy_governance",
  "intake_evaluation_weights", "rfx_events", "rfx_weight_configs", "workflow_instances", "workflow_step_log", "approval_workflows", "workflow_steps",
  "role_module_access", "platform_roles", "enterprise_user_master", "rfx_approvals", "contract_approvals", "rfx_assigned_approvers",
]);
export function assertNoGovernedGenericWrites(changes: readonly { table: string }[]) {
  const blocked = changes.find(x => GOVERNED_TABLES.has(x.table));
  if (blocked) throw new Error(`Governed table ${blocked.table} requires a dedicated audited API`);
}
