import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 6, charset: "utf8mb4" });
  }
  return pool;
}

export async function closeV5SourcingPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

const rows = async (sql: string, params: unknown[] = []) => {
  const [result] = await getPool().query<RowDataPacket[]>(sql, params);
  return result;
};

export async function getSapUsers() {
  const result = await rows("SELECT * FROM enterprise_user_master ORDER BY NAME_LAST, NAME_FIRST");
  return result.map((user) => ({ ...user, source_table: "enterprise_user_master", compatibility_alias: "sap_user_master" }));
}

export async function getDynamicResourcing(rfxId?: string) {
  const suffix = rfxId ? " WHERE rfx_id = ?" : "";
  const [runs, signals, recommendations, diversity, cycles] = await Promise.all([
    rows(`SELECT * FROM discovery_runs${suffix} ORDER BY created_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT * FROM market_signals${suffix} ORDER BY detected_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT * FROM resourcing_recommendations${suffix} ORDER BY created_at DESC`, rfxId ? [rfxId] : []),
    rows("SELECT d.*, s.name AS supplier_name, s.country, s.region FROM supplier_diversity d JOIN supplier s ON s.supplier_id = d.supplier_id ORDER BY s.name"),
    rows(`SELECT * FROM sourcing_cycle_history${suffix} ORDER BY intake_date DESC`, rfxId ? [rfxId] : []),
  ]);
  return { runs, signals, recommendations, diversity, cycles };
}

export async function getNegotiationCockpit(rfxId?: string) {
  const suffix = rfxId ? " WHERE rfx_id = ?" : "";
  const caseSuffix = rfxId ? " WHERE c.rfx_id = ?" : "";
  const [cases, rounds, offers, concessions, batna, tactics, assessments, benchmarks, messages, actions, decisions, playbook] = await Promise.all([
    rows(`SELECT c.*, s.name AS supplier_name, n.ai_recommendation FROM negotiation_cases c JOIN supplier s ON s.supplier_id = c.supplier_id LEFT JOIN negotiation_insights n ON n.insight_id = c.insight_id${caseSuffix} ORDER BY c.updated_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT r.* FROM negotiation_rounds r JOIN negotiation_cases c ON c.negotiation_case_id = r.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY r.opened_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT o.* FROM negotiation_offers o JOIN negotiation_cases c ON c.negotiation_case_id = o.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY o.created_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT x.* FROM negotiation_concessions x JOIN negotiation_cases c ON c.negotiation_case_id = x.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY x.created_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT x.* FROM negotiation_batna_scenarios x JOIN negotiation_cases c ON c.negotiation_case_id = x.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY x.recommendation_score DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT x.* FROM negotiation_case_tactics x JOIN negotiation_cases c ON c.negotiation_case_id = x.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY x.created_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT x.* FROM negotiation_strategy_assessments x JOIN negotiation_cases c ON c.negotiation_case_id = x.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY x.created_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT * FROM negotiation_market_benchmarks${suffix} ORDER BY valid_from DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT x.* FROM negotiation_message_events x JOIN negotiation_cases c ON c.negotiation_case_id = x.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY x.created_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT x.* FROM negotiation_actions x JOIN negotiation_cases c ON c.negotiation_case_id = x.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY x.created_at DESC`, rfxId ? [rfxId] : []),
    rows(`SELECT x.* FROM negotiation_decisions x JOIN negotiation_cases c ON c.negotiation_case_id = x.negotiation_case_id${rfxId ? " WHERE c.rfx_id = ?" : ""} ORDER BY x.approved_at DESC`, rfxId ? [rfxId] : []),
    rows("SELECT * FROM negotiation_playbook_tactics WHERE is_active = 1 ORDER BY tactic_phase, tactic_name"),
  ]);
  return { cases, rounds, offers, concessions, batna, tactics, assessments, benchmarks, messages, actions, decisions, playbook };
}

export async function decideResourcingRecommendation(recId: string, status: string, decidedBy: string) {
  const allowed = ["PENDING_HITL", "APPROVED", "REJECTED", "DEFERRED"];
  if (!allowed.includes(status)) throw new Error("Unsupported resourcing decision status");
  await getPool().execute("UPDATE resourcing_recommendations SET status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP WHERE rec_id = ?", [status, decidedBy, recId]);
  return { recId, status, decidedBy };
}

export async function approveNegotiationTactic(caseTacticId: string, approvedBy: string, status: "APPROVED" | "REJECTED") {
  await getPool().execute("UPDATE negotiation_case_tactics SET recommendation_status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE case_tactic_id = ?", [status, approvedBy, caseTacticId]);
  await getPool().execute("UPDATE negotiation_actions SET action_status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE source_recommendation_id = ?", [status === "APPROVED" ? "COMPLETED" : "CANCELLED", caseTacticId]);
  return { caseTacticId, status, approvedBy };
}

export async function openNegotiationRound(input: { negotiationCaseId: string; roundType: string; strategyLabel: string; responseDueAt: string; createdBy: string }) {
  const id = `NR-${Date.now().toString().slice(-8)}`;
  await getPool().execute(
    "INSERT INTO negotiation_rounds (negotiation_round_id, negotiation_case_id, round_number, round_type, round_status, strategy_label, next_step_code, opened_at, response_due_at, created_by, created_at, updated_at) SELECT ?, ?, COALESCE(MAX(round_number), 0) + 1, ?, 'OPEN', ?, 'SUPPLIER_RESPONSE', CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM negotiation_rounds WHERE negotiation_case_id = ?",
    [id, input.negotiationCaseId, input.roundType, input.strategyLabel, input.responseDueAt, input.createdBy, input.negotiationCaseId],
  );
  return { negotiationRoundId: id };
}
