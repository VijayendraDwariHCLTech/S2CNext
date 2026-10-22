// Generated from the approved S2C 79-table contract. Do not edit manually.
import { bigint, char, date, decimal, int, json, longtext, mysqlEnum, mysqlTable, primaryKey, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

export const S2C_SCHEMA_VERSION = 2 as const;

export const agent_approval_routing_rulesTable = mysqlTable("agent_approval_routing_rules", {
  "rule_id": varchar("rule_id", { length: 50 }).notNull(),
  "process_stage": varchar("process_stage", { length: 100 }).notNull(),
  "persona_id": varchar("persona_id", { length: 50 }).notNull(),
  "min_value_threshold": decimal("min_value_threshold", { precision: 15, scale: 2 }).notNull(),
  "max_value_threshold": decimal("max_value_threshold", { precision: 15, scale: 2 }).notNull(),
  "risk_level_criteria": varchar("risk_level_criteria", { length: 50 }).notNull(),
  "is_active": tinyint("is_active").notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["rule_id"]] }),
]);

export const agent_assignment_evaluationsTable = mysqlTable("agent_assignment_evaluations", {
  "evaluation_id": varchar("evaluation_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "agent_model_version": varchar("agent_model_version", { length: 50 }).notNull(),
  "evaluation_rationale": text("evaluation_rationale").notNull(),
  "confidence_score": decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  "evaluation_status": varchar("evaluation_status", { length: 50 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["evaluation_id"]] }),
]);

export const agent_evaluationsTable = mysqlTable("agent_evaluations", {
  "evaluation_id": int("evaluation_id").notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "commercial_score": decimal("commercial_score", { precision: 5, scale: 2 }).notNull(),
  "operational_score": decimal("operational_score", { precision: 5, scale: 2 }).notNull(),
  "risk_score": decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  "esg_score": decimal("esg_score", { precision: 5, scale: 2 }).notNull(),
  "total_weighted_score": decimal("total_weighted_score", { precision: 5, scale: 2 }).notNull(),
  "agent_rank": int("agent_rank").notNull(),
  "agent_rationale": text("agent_rationale").notNull(),
  "evaluated_at": timestamp("evaluated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["evaluation_id"]] }),
]);

export const approver_availability_matrixTable = mysqlTable("approver_availability_matrix", {
  "user_id": varchar("user_id", { length: 50 }).notNull(),
  "persona_id": varchar("persona_id", { length: 50 }).notNull(),
  "user_email": varchar("user_email", { length: 100 }).notNull(),
  "category_expertise": json("category_expertise").notNull(),
  "current_active_assignments": int("current_active_assignments").notNull(),
  "is_available": tinyint("is_available").notNull(),
  "delegated_user_id": varchar("delegated_user_id", { length: 50 }),
}, (table) => [
  primaryKey({ columns: [table["user_id"]] }),
]);

export const bid_attachmentsTable = mysqlTable("bid_attachments", {
  "bid_id": bigint("bid_id", { mode: "number" }).notNull(),
  "document_id": bigint("document_id", { mode: "number" }).notNull(),
  "classification": mysqlEnum("classification", ["TECHNICAL_PROPOSAL","COMMERCIAL_PROPOSAL","LEGAL","OTHER"]).notNull(),
  "ocr_confidence": decimal("ocr_confidence", { precision: 5, scale: 2 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["bid_id"], table["document_id"]] }),
]);

export const bid_exceptionsTable = mysqlTable("bid_exceptions", {
  "bid_exceptions_id": bigint("bid_exceptions_id", { mode: "number" }).notNull(),
  "bid_id": bigint("bid_id", { mode: "number" }).notNull(),
  "exception_type": mysqlEnum("exception_type", ["MISSING_FIELD","CURRENCY_MISMATCH","UOM_MISMATCH","INVALID_VALUE","DUPLICATE","OTHER"]).notNull(),
  "field_name": varchar("field_name", { length: 100 }).notNull(),
  "raw_value": text("raw_value").notNull(),
  "severity": mysqlEnum("severity", ["LOW","MEDIUM","HIGH","CRITICAL"]).notNull(),
  "resolution_status": mysqlEnum("resolution_status", ["OPEN","IN_REVIEW","RESOLVED","WAIVED"]).notNull(),
  "resolved_by": varchar("resolved_by", { length: 256 }),
  "resolved_at": timestamp("resolved_at", { mode: "string" }),
}, (table) => [
  primaryKey({ columns: [table["bid_exceptions_id"]] }),
]);

export const bid_line_itemsTable = mysqlTable("bid_line_items", {
  "biditem_id": bigint("biditem_id", { mode: "number" }).notNull(),
  "bid_id": bigint("bid_id", { mode: "number" }).notNull(),
  "question_id": varchar("question_id", { length: 50 }),
  "item_code": varchar("item_code", { length: 100 }).notNull(),
  "description": text("description").notNull(),
  "raw_quantity": varchar("raw_quantity", { length: 50 }).notNull(),
  "normalized_quantity": decimal("normalized_quantity", { precision: 15, scale: 2 }).notNull(),
  "raw_uom": varchar("raw_uom", { length: 20 }).notNull(),
  "normalized_uom": varchar("normalized_uom", { length: 20 }).notNull(),
  "raw_unit_price": varchar("raw_unit_price", { length: 50 }).notNull(),
  "normalized_unit_price": decimal("normalized_unit_price", { precision: 15, scale: 4 }).notNull(),
  "raw_currency": varchar("raw_currency", { length: 10 }).notNull(),
  "normalized_currency": varchar("normalized_currency", { length: 3 }).notNull(),
  "exchange_rate": decimal("exchange_rate", { precision: 10, scale: 6 }).notNull(),
  "extended_price_normalized": decimal("extended_price_normalized", { precision: 15, scale: 2 }).notNull(),
  "lead_time_days": int("lead_time_days").notNull(),
  "compliance_flag": tinyint("compliance_flag").notNull(),
}, (table) => [
  primaryKey({ columns: [table["biditem_id"]] }),
]);

export const bid_responsesTable = mysqlTable("bid_responses", {
  "bid_id": bigint("bid_id", { mode: "number" }).notNull(),
  "external_bid_uuid": varchar("external_bid_uuid", { length: 36 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "submission_date": timestamp("submission_date", { mode: "string" }).notNull(),
  "source_channel": mysqlEnum("source_channel", ["PORTAL","EMAIL","API","MANUAL"]).notNull(),
  "version_number": int("version_number").notNull(),
  "status": mysqlEnum("status", ["RECEIVED","NORMALIZED","EXCEPTION_REVIEW","REJECTED"]).notNull(),
  "confidence_score": decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  "raw_payload": json("raw_payload").notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["bid_id"]] }),
]);

export const complianceTable = mysqlTable("compliance", {
  "compliance_id": int("compliance_id").notNull(),
  "compliance_name": varchar("compliance_name", { length: 100 }).notNull(),
  "geography": varchar("geography", { length: 50 }).notNull(),
  "procurement_type": varchar("procurement_type", { length: 100 }).notNull(),
  "category": varchar("category", { length: 100 }).notNull(),
  "priority": mysqlEnum("priority", ["LOW","MEDIUM","HIGH","CRITICAL"]).notNull(),
  "clause_text": text("clause_text").notNull(),
  "is_mandatory": tinyint("is_mandatory").notNull(),
  "status": varchar("status", { length: 20 }).notNull(),
  "effective_date": date("effective_date", { mode: "string" }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["compliance_id"]] }),
]);

export const contract_approvalsTable = mysqlTable("contract_approvals", {
  "approval_id": varchar("approval_id", { length: 50 }).notNull(),
  "contract_id": varchar("contract_id", { length: 50 }).notNull(),
  "approver_role": varchar("approver_role", { length: 50 }).notNull(),
  "approver_name": varchar("approver_name", { length: 100 }).notNull(),
  "approval_status": varchar("approval_status", { length: 50 }).notNull(),
  "comments": text("comments"),
  "approval_sequence": int("approval_sequence").notNull(),
  "approved_at": timestamp("approved_at", { mode: "string" }),
}, (table) => [
  primaryKey({ columns: [table["approval_id"]] }),
]);

export const contract_documentsTable = mysqlTable("contract_documents", {
  "contract_id": varchar("contract_id", { length: 50 }).notNull(),
  "document_id": bigint("document_id", { mode: "number" }).notNull(),
  "visibility": mysqlEnum("visibility", ["INTERNAL","SUPPLIER","RESTRICTED"]).notNull(),
  "classification": mysqlEnum("classification", ["PUBLIC","INTERNAL","CONFIDENTIAL","RESTRICTED"]).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["contract_id"], table["document_id"]] }),
]);

export const contract_intake_requestsTable = mysqlTable("contract_intake_requests", {
  "contract_id": varchar("contract_id", { length: 50 }).notNull(),
  "linked_rfx": varchar("linked_rfx", { length: 50 }).notNull(),
  "contract_type": varchar("contract_type", { length: 50 }).notNull(),
  "contract_value": decimal("contract_value", { precision: 15, scale: 2 }).notNull(),
  "risk_level": varchar("risk_level", { length: 50 }).notNull(),
  "business_owner": varchar("business_owner", { length: 100 }).notNull(),
  "intake_status": varchar("intake_status", { length: 50 }).notNull(),
  "validated_by": varchar("validated_by", { length: 100 }).notNull(),
  "validated_at": timestamp("validated_at", { mode: "string" }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["contract_id"]] }),
]);

export const contract_risk_assessmentTable = mysqlTable("contract_risk_assessment", {
  "risk_id": varchar("risk_id", { length: 50 }).notNull(),
  "contract_id": varchar("contract_id", { length: 50 }).notNull(),
  "risk_score": decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  "compliance_flags": json("compliance_flags").notNull(),
  "legal_risk_notes": text("legal_risk_notes").notNull(),
  "mitigation_plan": text("mitigation_plan").notNull(),
  "reviewed_by": varchar("reviewed_by", { length: 100 }).notNull(),
  "approved_flag": tinyint("approved_flag").notNull(),
  "approved_by": varchar("approved_by", { length: 100 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["risk_id"]] }),
]);

export const documentsTable = mysqlTable("documents", {
  "document_id": bigint("document_id", { mode: "number" }).notNull(),
  "title": varchar("title", { length: 255 }).notNull(),
  "document_type": mysqlEnum("document_type", ["RFP","RFQ","REQUIREMENTS","PRICING_TEMPLATE","BID_PROPOSAL","BID_PRICING","AWARD_MEMO","CONTRACT_DRAFT","INVITATION","MSA","KYC","OTHER"]).notNull(),
  "status": mysqlEnum("status", ["ACTIVE","ARCHIVED","SUPERSEDED","DELETED"]).notNull(),
  "file_path": varchar("file_path", { length: 1024 }).notNull(),
  "file_name": varchar("file_name", { length: 255 }).notNull(),
  "file_size_bytes": bigint("file_size_bytes", { mode: "number" }).notNull(),
  "created_by": varchar("created_by", { length: 255 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
  "deleted_at": timestamp("deleted_at", { mode: "string" }),
}, (table) => [
  primaryKey({ columns: [table["document_id"]] }),
]);

export const human_in_loop_controlsTable = mysqlTable("human_in_loop_controls", {
  "hitl_id": varchar("hitl_id", { length: 50 }).notNull(),
  "process_stage": varchar("process_stage", { length: 100 }).notNull(),
  "entity_table": varchar("entity_table", { length: 100 }).notNull(),
  "decision_type": varchar("decision_type", { length: 100 }).notNull(),
  "primary_persona": varchar("primary_persona", { length: 50 }).notNull(),
  "supporting_personas": json("supporting_personas").notNull(),
  "approval_required": tinyint("approval_required").notNull(),
  "approval_flow": varchar("approval_flow", { length: 255 }).notNull(),
  "override_allowed": tinyint("override_allowed").notNull(),
  "audit_required": tinyint("audit_required").notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["hitl_id"]] }),
]);

export const intake_commercials_timelinesTable = mysqlTable("intake_commercials_timelines", {
  "request_id": varchar("request_id", { length: 50 }).notNull(),
  "cost_center": varchar("cost_center", { length: 50 }).notNull(),
  "approved_budget": decimal("approved_budget", { precision: 15, scale: 2 }).notNull(),
  "currency": varchar("currency", { length: 10 }).notNull(),
  "capex_opex": mysqlEnum("capex_opex", ["CAPEX","OPEX"]).notNull(),
  "sourcing_start_date": date("sourcing_start_date", { mode: "string" }).notNull(),
  "rfp_issue_date": date("rfp_issue_date", { mode: "string" }),
  "award_date": date("award_date", { mode: "string" }),
  "service_start_date": date("service_start_date", { mode: "string" }),
  "linked_RFx": varchar("linked_RFx", { length: 50 }),
}, (table) => [
  primaryKey({ columns: [table["request_id"]] }),
]);

export const intake_documentsTable = mysqlTable("intake_documents", {
  "request_id": varchar("request_id", { length: 50 }).notNull(),
  "document_id": bigint("document_id", { mode: "number" }).notNull(),
  "visibility": mysqlEnum("visibility", ["INTERNAL","SUPPLIER","RESTRICTED"]).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["request_id"], table["document_id"]] }),
]);

export const intake_evaluation_weightsTable = mysqlTable("intake_evaluation_weights", {
  "request_id": varchar("request_id", { length: 50 }).notNull(),
  "commercial_weight": decimal("commercial_weight", { precision: 5, scale: 2 }).notNull(),
  "technical_weight": decimal("technical_weight", { precision: 5, scale: 2 }).notNull(),
  "compliance_weight": decimal("compliance_weight", { precision: 5, scale: 2 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["request_id"]] }),
]);

export const intake_requestsTable = mysqlTable("intake_requests", {
  "request_id": varchar("request_id", { length: 50 }).notNull(),
  "requestor_name": varchar("requestor_name", { length: 255 }).notNull(),
  "employee_id": varchar("employee_id", { length: 50 }).notNull(),
  "business_unit": varchar("business_unit", { length: 100 }).notNull(),
  "location": varchar("location", { length: 100 }).notNull(),
  "request_type": varchar("request_type", { length: 50 }).notNull(),
  "category": varchar("category", { length: 100 }).notNull(),
  "procurement_type": varchar("procurement_type", { length: 100 }).notNull(),
  "priority": mysqlEnum("priority", ["LOW","MEDIUM","HIGH","CRITICAL"]).notNull(),
  "requirement_description": text("requirement_description").notNull(),
  "business_outcome": text("business_outcome").notNull(),
  "impact_if_not_procured": text("impact_if_not_procured").notNull(),
  "intake_status": mysqlEnum("intake_status", ["DRAFT","IN_PROCESS","UNDER_REVIEW","APPROVED","REJECTED","CANCELLED"]).notNull(),
  "linked_RFx": varchar("linked_RFx", { length: 50 }),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["request_id"]] }),
]);

export const intake_scope_specsTable = mysqlTable("intake_scope_specs", {
  "request_id": varchar("request_id", { length: 50 }).notNull(),
  "scope_description": text("scope_description").notNull(),
  "deliverables": text("deliverables").notNull(),
  "specification_type": varchar("specification_type", { length: 50 }).notNull(),
  "compliance_requirements": json("compliance_requirements").notNull(),
  "geography_coverage": json("geography_coverage").notNull(),
  "transition_requirement": text("transition_requirement").notNull(),
  "documentation_attachments": json("documentation_attachments").notNull(),
}, (table) => [
  primaryKey({ columns: [table["request_id"]] }),
]);

export const intake_strategy_governanceTable = mysqlTable("intake_strategy_governance", {
  "request_id": varchar("request_id", { length: 50 }).notNull(),
  "incumbent_supplier": varchar("incumbent_supplier", { length: 255 }),
  "suggested_suppliers": json("suggested_suppliers").notNull(),
  "sourcing_approach": varchar("sourcing_approach", { length: 50 }).notNull(),
  "expected_bidders_range": varchar("expected_bidders_range", { length: 50 }).notNull(),
  "contract_type": varchar("contract_type", { length: 100 }).notNull(),
  "duration_years": int("duration_years").notNull(),
  "payment_terms_days": int("payment_terms_days").notNull(),
  "risk_category": text("risk_category").notNull(),
  "data_security_notes": text("data_security_notes").notNull(),
  "esg_requirement": text("esg_requirement").notNull(),
}, (table) => [
  primaryKey({ columns: [table["request_id"]] }),
]);

export const negotiation_finalizationTable = mysqlTable("negotiation_finalization", {
  "finalization_id": varchar("finalization_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "final_price": decimal("final_price", { precision: 15, scale: 2 }).notNull(),
  "savings_achieved": decimal("savings_achieved", { precision: 15, scale: 2 }).notNull(),
  "negotiation_summary": text("negotiation_summary").notNull(),
  "finance_approval_status": varchar("finance_approval_status", { length: 50 }).notNull(),
  "procurement_approval_status": varchar("procurement_approval_status", { length: 50 }).notNull(),
  "approved_by": varchar("approved_by", { length: 100 }).notNull(),
  "approved_at": timestamp("approved_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["finalization_id"]] }),
]);

export const negotiation_insightsTable = mysqlTable("negotiation_insights", {
  "insight_id": varchar("insight_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "benchmark_price": decimal("benchmark_price", { precision: 15, scale: 2 }).notNull(),
  "target_price": decimal("target_price", { precision: 15, scale: 2 }).notNull(),
  "walk_away_price": decimal("walk_away_price", { precision: 15, scale: 2 }).notNull(),
  "ai_recommendation": text("ai_recommendation").notNull(),
  "reviewed_by": varchar("reviewed_by", { length: 100 }).notNull(),
  "approval_flag": tinyint("approval_flag").notNull(),
  "approved_by": varchar("approved_by", { length: 100 }),
  "approved_at": timestamp("approved_at", { mode: "string" }),
}, (table) => [
  primaryKey({ columns: [table["insight_id"]] }),
]);

export const personas_masterTable = mysqlTable("personas_master", {
  "persona_id": varchar("persona_id", { length: 50 }).notNull(),
  "persona_name": varchar("persona_name", { length: 100 }).notNull(),
  "function_area": varchar("function_area", { length: 50 }).notNull(),
  "role_description": text("role_description").notNull(),
  "decision_authority": tinyint("decision_authority").notNull(),
  "approval_authority": tinyint("approval_authority").notNull(),
  "typical_stages": json("typical_stages").notNull(),
}, (table) => [
  primaryKey({ columns: [table["persona_id"]] }),
]);

export const rfx_approvalsTable = mysqlTable("rfx_approvals", {
  "approval_id": varchar("approval_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "approver_role": varchar("approver_role", { length: 50 }).notNull(),
  "approver_name": varchar("approver_name", { length: 100 }).notNull(),
  "approval_status": varchar("approval_status", { length: 50 }).notNull(),
  "comments": text("comments").notNull(),
  "approval_sequence": int("approval_sequence").notNull(),
  "approved_at": timestamp("approved_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["approval_id"]] }),
]);

export const rfx_assigned_approversTable = mysqlTable("rfx_assigned_approvers", {
  "assignment_id": varchar("assignment_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "approver_user_id": varchar("approver_user_id", { length: 50 }).notNull(),
  "evaluation_id": varchar("evaluation_id", { length: 50 }).notNull(),
  "approval_sequence": int("approval_sequence").notNull(),
  "current_status": varchar("current_status", { length: 50 }).notNull(),
  "assigned_at": timestamp("assigned_at", { mode: "string" }).notNull(),
  "actioned_at": timestamp("actioned_at", { mode: "string" }),
  "comments": text("comments"),
}, (table) => [
  primaryKey({ columns: [table["assignment_id"]] }),
]);

export const rfx_categoryTable = mysqlTable("rfx_category", {
  "rfx_category": varchar("rfx_category", { length: 50 }).notNull(),
  "category_name": varchar("category_name", { length: 128 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["rfx_category"]] }),
]);

export const rfx_documentsTable = mysqlTable("rfx_documents", {
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "document_id": bigint("document_id", { mode: "number" }).notNull(),
  "visibility": mysqlEnum("visibility", ["INTERNAL","SUPPLIER","RESTRICTED"]).notNull(),
  "phase": mysqlEnum("phase", ["DRAFT","ISSUE","EVALUATION","AWARD","CONTRACT"]).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["rfx_id"], table["document_id"]] }),
]);

export const rfx_draft_versionsTable = mysqlTable("rfx_draft_versions", {
  "draft_id": varchar("draft_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "version_number": int("version_number").notNull(),
  "template_id": varchar("template_id", { length: 50 }).notNull(),
  "draft_content": longtext("draft_content").notNull(),
  "created_by": varchar("created_by", { length: 100 }).notNull(),
  "reviewed_by": varchar("reviewed_by", { length: 100 }).notNull(),
  "approval_status": varchar("approval_status", { length: 50 }).notNull(),
  "approved_by": varchar("approved_by", { length: 100 }),
  "approved_at": timestamp("approved_at", { mode: "string" }),
}, (table) => [
  primaryKey({ columns: [table["draft_id"]] }),
]);

export const rfx_eventsTable = mysqlTable("rfx_events", {
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "title": varchar("title", { length: 255 }).notNull(),
  "rfx_type": varchar("rfx_type", { length: 45 }).notNull(),
  "rfx_category": varchar("rfx_category", { length: 50 }).notNull(),
  "status": varchar("status", { length: 50 }).notNull(),
  "issue_date": date("issue_date", { mode: "string" }),
  "due_date": date("due_date", { mode: "string" }).notNull(),
  "closed_date": date("closed_date", { mode: "string" }),
  "owner": json("owner").notNull(),
  "description": longtext("description").notNull(),
  "scope": longtext("scope").notNull(),
  "invited_suppliers": json("invited_suppliers").notNull(),
  "responses_received": int("responses_received").notNull(),
  "key_findings": longtext("key_findings"),
  "attachments": json("attachments").notNull(),
  "budget_limit_usd": decimal("budget_limit_usd", { precision: 15, scale: 2 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["rfx_id"]] }),
]);

export const rfx_question_responsesTable = mysqlTable("rfx_question_responses", {
  "response_id": varchar("response_id", { length: 50 }).notNull(),
  "question_id": varchar("question_id", { length: 50 }).notNull(),
  "response_text": text("response_text").notNull(),
  "internal_notes": text("internal_notes"),
  "response_status": varchar("response_status", { length: 50 }).notNull(),
  "answered_by": varchar("answered_by", { length: 100 }).notNull(),
  "approved_by": varchar("approved_by", { length: 100 }).notNull(),
  "published_at": timestamp("published_at", { mode: "string" }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["response_id"]] }),
]);

export const rfx_questionsTable = mysqlTable("rfx_questions", {
  "question_id": varchar("question_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "section_reference": varchar("section_reference", { length: 100 }).notNull(),
  "question_text": text("question_text").notNull(),
  "is_private": tinyint("is_private").notNull(),
  "submission_status": varchar("submission_status", { length: 50 }).notNull(),
  "submitted_by": varchar("submitted_by", { length: 100 }).notNull(),
  "submitted_at": timestamp("submitted_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["question_id"]] }),
]);

export const rfx_requirementsTable = mysqlTable("rfx_requirements", {
  "requirement_id": int("requirement_id").notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "category": varchar("category", { length: 100 }).notNull(),
  "title": text("title").notNull(),
  "description": text("description").notNull(),
  "priority_level": mysqlEnum("priority_level", ["LOW","MEDIUM","HIGH","CRITICAL"]).notNull(),
  "response_type": mysqlEnum("response_type", ["TEXT","NUMERIC","YES_NO","CHOICE","FILE"]).notNull(),
  "choices": json("choices"),
  "max_points_allocated": int("max_points_allocated").notNull(),
  "weight": decimal("weight", { precision: 5, scale: 0 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["requirement_id"]] }),
]);

export const rfx_responseTable = mysqlTable("rfx_response", {
  "response_id": int("response_id").notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "quoted_total_price": decimal("quoted_total_price", { precision: 15, scale: 2 }).notNull(),
  "quoted_delivery_days": int("quoted_delivery_days").notNull(),
  "payment_terms_offered": varchar("payment_terms_offered", { length: 50 }).notNull(),
  "requirement_deviations": text("requirement_deviations").notNull(),
  "extended_bid_details": json("extended_bid_details").notNull(),
  "submitted_at": timestamp("submitted_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["response_id"]] }),
]);

export const rfx_response_answersTable = mysqlTable("rfx_response_answers", {
  "answer_id": int("answer_id").notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "requirement_id": int("requirement_id").notNull(),
  "vendor_answer_text": text("vendor_answer_text").notNull(),
  "agent_calculated_score": decimal("agent_calculated_score", { precision: 5, scale: 2 }).notNull(),
  "agent_answer_rationale": text("agent_answer_rationale").notNull(),
}, (table) => [
  primaryKey({ columns: [table["answer_id"]] }),
]);

export const rfx_weight_configsTable = mysqlTable("rfx_weight_configs", {
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "commercial_weight": decimal("commercial_weight", { precision: 3, scale: 2 }).notNull(),
  "operational_weight": decimal("operational_weight", { precision: 3, scale: 2 }).notNull(),
  "risk_compliance_weight": decimal("risk_compliance_weight", { precision: 3, scale: 2 }).notNull(),
  "esg_weight": decimal("esg_weight", { precision: 3, scale: 2 }).notNull(),
  "completeness_score": decimal("completeness_score", { precision: 5, scale: 2 }).notNull(),
  "consistency_score": decimal("consistency_score", { precision: 5, scale: 2 }).notNull(),
  "complaince_score": decimal("complaince_score", { precision: 5, scale: 2 }).notNull(),
  "readability_score": decimal("readability_score", { precision: 5, scale: 2 }).notNull(),
  "overall_quality_score": decimal("overall_quality_score", { precision: 5, scale: 2 }).notNull(),
  "status": varchar("status", { length: 45 }).notNull(),
  "issues": json("issues").notNull(),
  "warnings": json("warnings").notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["rfx_id"]] }),
]);

export const supplierTable = mysqlTable("supplier", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "name": varchar("name", { length: 255 }).notNull(),
  "legal_name": varchar("legal_name", { length: 255 }).notNull(),
  "country": varchar("country", { length: 100 }).notNull(),
  "region": varchar("region", { length: 50 }).notNull(),
  "status": varchar("status", { length: 50 }).notNull(),
  "risk_rating": varchar("risk_rating", { length: 50 }).notNull(),
  "esg_score": int("esg_score"),
  "years_on_panel": int("years_on_panel").notNull(),
  "certifications": json("certifications").notNull(),
  "payment_terms_baseline": varchar("payment_terms_baseline", { length: 50 }).notNull(),
  "annual_spend_usd": decimal("annual_spend_usd", { precision: 15, scale: 2 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "kyc_status": mysqlEnum("kyc_status", ["PENDING","VERIFIED","EXPIRED","REJECTED"]).notNull(),
  "kyc_verified_date": date("kyc_verified_date", { mode: "string" }),
  "kyc_verified_by": varchar("kyc_verified_by", { length: 255 }),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_agent_memoryTable = mysqlTable("supplier_agent_memory", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "agent_notes_semantic": text("agent_notes_semantic").notNull(),
  "last_updated_by_agent": timestamp("last_updated_by_agent", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_classificationTable = mysqlTable("supplier_classification", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "strategic_flag": tinyint("strategic_flag").notNull(),
  "preferred_supplier_flag": tinyint("preferred_supplier_flag").notNull(),
  "risk_flag": tinyint("risk_flag").notNull(),
  "classification_approved_by": varchar("classification_approved_by", { length: 100 }).notNull(),
  "classification_date": timestamp("classification_date", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_documentsTable = mysqlTable("supplier_documents", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "document_id": bigint("document_id", { mode: "number" }).notNull(),
  "visibility": mysqlEnum("visibility", ["INTERNAL","SUPPLIER","RESTRICTED"]).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"], table["document_id"]] }),
]);

export const supplier_esg_complianceTable = mysqlTable("supplier_esg_compliance", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "ecovadis_overall_score": int("ecovadis_overall_score").notNull(),
  "ecovadis_environmental": int("ecovadis_environmental").notNull(),
  "ecovadis_social": int("ecovadis_social").notNull(),
  "ecovadis_governance": int("ecovadis_governance").notNull(),
  "sanctions_flag": tinyint("sanctions_flag").notNull(),
  "regulatory_violations": int("regulatory_violations").notNull(),
  "last_updated": timestamp("last_updated", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_external_enrichmentTable = mysqlTable("supplier_external_enrichment", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "db_credit_score": int("db_credit_score").notNull(),
  "db_financial_risk_rating": varchar("db_financial_risk_rating", { length: 20 }).notNull(),
  "db_annual_revenue": decimal("db_annual_revenue", { precision: 15, scale: 2 }).notNull(),
  "db_employee_count": int("db_employee_count").notNull(),
  "ariba_performance_rating": decimal("ariba_performance_rating", { precision: 3, scale: 2 }).notNull(),
  "hidden_col_1": json("hidden_col_1"),
  "hidden_col_2": json("hidden_col_2"),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_improvement_plansTable = mysqlTable("supplier_improvement_plans", {
  "plan_id": varchar("plan_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "issue_identified": text("issue_identified").notNull(),
  "corrective_action": text("corrective_action").notNull(),
  "target_date": date("target_date", { mode: "string" }).notNull(),
  "status": varchar("status", { length: 50 }).notNull(),
  "owner": varchar("owner", { length: 100 }).notNull(),
  "reviewed_by": varchar("reviewed_by", { length: 100 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["plan_id"]] }),
]);

export const supplier_kpi_metricsTable = mysqlTable("supplier_kpi_metrics", {
  "kpi_id": varchar("kpi_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "kpi_name": varchar("kpi_name", { length: 100 }).notNull(),
  "target_value": decimal("target_value", { precision: 10, scale: 2 }).notNull(),
  "actual_value": decimal("actual_value", { precision: 10, scale: 2 }).notNull(),
  "variance": decimal("variance", { precision: 10, scale: 2 }).notNull(),
  "weight": decimal("weight", { precision: 5, scale: 2 }).notNull(),
  "calculated_score": decimal("calculated_score", { precision: 5, scale: 2 }).notNull(),
  "reviewed_by": varchar("reviewed_by", { length: 100 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["kpi_id"]] }),
]);

export const supplier_product_profilesTable = mysqlTable("supplier_product_profiles", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "categories": json("categories").notNull(),
  "moq_units": int("moq_units").notNull(),
  "moq_uom": varchar("moq_uom", { length: 20 }).notNull(),
  "current_capacity_available_pct": decimal("current_capacity_available_pct", { precision: 5, scale: 2 }).notNull(),
  "avg_lead_time_days": int("avg_lead_time_days").notNull(),
  "on_time_delivery_pct": decimal("on_time_delivery_pct", { precision: 5, scale: 2 }).notNull(),
  "defect_rate_pct": decimal("defect_rate_pct", { precision: 5, scale: 2 }).notNull(),
  "preferred_incoterms": varchar("preferred_incoterms", { length: 10 }).notNull(),
  "shipping_origin_ports": json("shipping_origin_ports").notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_qbr_reviewsTable = mysqlTable("supplier_qbr_reviews", {
  "qbr_id": varchar("qbr_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "review_period": varchar("review_period", { length: 50 }).notNull(),
  "performance_summary": text("performance_summary").notNull(),
  "action_items": text("action_items").notNull(),
  "business_feedback": text("business_feedback").notNull(),
  "approved_by": varchar("approved_by", { length: 100 }).notNull(),
  "approved_at": timestamp("approved_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["qbr_id"]] }),
]);

export const supplier_risk_profileTable = mysqlTable("supplier_risk_profile", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "interos_geopolitical_risk": decimal("interos_geopolitical_risk", { precision: 5, scale: 2 }).notNull(),
  "interos_supply_chain_risk": decimal("interos_supply_chain_risk", { precision: 5, scale: 2 }).notNull(),
  "resilinc_disruption_risk": decimal("resilinc_disruption_risk", { precision: 5, scale: 2 }).notNull(),
  "resilinc_operational_resilience": decimal("resilinc_operational_resilience", { precision: 5, scale: 2 }).notNull(),
  "last_updated": timestamp("last_updated", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_scorecardsTable = mysqlTable("supplier_scorecards", {
  "scorecard_id": varchar("scorecard_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "evaluation_period": varchar("evaluation_period", { length: 50 }).notNull(),
  "overall_score": decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  "performance_status": varchar("performance_status", { length: 50 }).notNull(),
  "approved_by": varchar("approved_by", { length: 100 }).notNull(),
  "approved_at": timestamp("approved_at", { mode: "string" }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["scorecard_id"]] }),
]);

export const supplier_selection_decisionsTable = mysqlTable("supplier_selection_decisions", {
  "decision_id": varchar("decision_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "shortlisted_suppliers": json("shortlisted_suppliers").notNull(),
  "final_selected_supplier": varchar("final_selected_supplier", { length: 50 }).notNull(),
  "selection_rationale": text("selection_rationale").notNull(),
  "agent_recommendation_score": decimal("agent_recommendation_score", { precision: 5, scale: 2 }).notNull(),
  "manual_override_flag": tinyint("manual_override_flag").notNull(),
  "business_approval_status": varchar("business_approval_status", { length: 50 }).notNull(),
  "procurement_approval_status": varchar("procurement_approval_status", { length: 50 }).notNull(),
  "final_approval_by": varchar("final_approval_by", { length: 100 }).notNull(),
  "approval_timestamp": timestamp("approval_timestamp", { mode: "string" }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["decision_id"]] }),
]);

export const supplier_services_profilesTable = mysqlTable("supplier_services_profiles", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "engagement_models": json("engagement_models").notNull(),
  "delivery_locations": json("delivery_locations").notNull(),
  "primary_resource_stack": json("primary_resource_stack").notNull(),
  "average_resource_rate_usd": decimal("average_resource_rate_usd", { precision: 10, scale: 2 }).notNull(),
  "subcontracting_allowed": tinyint("subcontracting_allowed").notNull(),
  "bench_strength_count": int("bench_strength_count").notNull(),
  "client_csat_score": decimal("client_csat_score", { precision: 3, scale: 1 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const supplier_shortlistingTable = mysqlTable("supplier_shortlisting", {
  "shortlist_id": varchar("shortlist_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "agent_score": decimal("agent_score", { precision: 5, scale: 2 }).notNull(),
  "shortlist_flag": tinyint("shortlist_flag").notNull(),
  "manual_override_flag": tinyint("manual_override_flag").notNull(),
  "override_reason": text("override_reason"),
  "validated_by": varchar("validated_by", { length: 100 }).notNull(),
  "validated_at": timestamp("validated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["shortlist_id"]] }),
]);

export const supplier_software_profilesTable = mysqlTable("supplier_software_profiles", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "hosting_models": json("hosting_models").notNull(),
  "data_security_compliance": json("data_security_compliance").notNull(),
  "supported_integrations": json("supported_integrations").notNull(),
  "sla_availability_commitment": decimal("sla_availability_commitment", { precision: 5, scale: 2 }).notNull(),
  "disaster_recovery_rto_hours": int("disaster_recovery_rto_hours").notNull(),
  "vulnerability_scanned_status": varchar("vulnerability_scanned_status", { length: 100 }).notNull(),
  "license_models_supported": json("license_models_supported").notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);

export const platform_rolesTable = mysqlTable("platform_roles", {
  "role_id": varchar("role_id", { length: 30 }).notNull(),
  "role_name": varchar("role_name", { length: 100 }).notNull(),
  "color_hex": varchar("color_hex", { length: 7 }).notNull(),
  "description": text("description").notNull(),
  "is_system_role": tinyint("is_system_role").notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["role_id"]] }),
]);

export const role_module_accessTable = mysqlTable("role_module_access", {
  "role_id": varchar("role_id", { length: 30 }).notNull(),
  "module_id": varchar("module_id", { length: 50 }).notNull(),
  "access_level": varchar("access_level", { length: 20 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["role_id"], table["module_id"]] }),
]);

export const enterprise_user_masterTable = mysqlTable("enterprise_user_master", {
  "MANDT": char("MANDT", { length: 3 }).notNull(),
  "BNAME": varchar("BNAME", { length: 30 }).notNull(),
  "SMTP_ADDR": char("SMTP_ADDR", { length: 241 }).notNull(),
  "NAME_FIRST": char("NAME_FIRST", { length: 40 }).notNull(),
  "NAME_LAST": char("NAME_LAST", { length: 40 }).notNull(),
  "PERSNO": char("PERSNO", { length: 8 }).notNull(),
  "ORGEH": char("ORGEH", { length: 60 }).notNull(),
  "KOSTL": char("KOSTL", { length: 10 }).notNull(),
  "BUKRS": char("BUKRS", { length: 4 }).notNull(),
  "WERKS": char("WERKS", { length: 4 }).notNull(),
  "PLANS": char("PLANS", { length: 60 }).notNull(),
  "MANAGER_BNAME": varchar("MANAGER_BNAME", { length: 30 }),
  "PLATFORM_ROLE": varchar("PLATFORM_ROLE", { length: 30 }).notNull(),
  "USTYP": char("USTYP", { length: 1 }).notNull(),
  "GLTGB": varchar("GLTGB", { length: 10 }).notNull(),
  "UFLAG": tinyint("UFLAG").notNull(),
  "TRDAT": varchar("TRDAT", { length: 10 }).notNull(),
  "ERDAT": varchar("ERDAT", { length: 10 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["BNAME"]] }),
]);

export const intake_approvalsTable = mysqlTable("intake_approvals", {
  "approval_id": varchar("approval_id", { length: 50 }).notNull(),
  "request_id": varchar("request_id", { length: 50 }).notNull(),
  "approval_sequence": int("approval_sequence").notNull(),
  "approver_role": varchar("approver_role", { length: 50 }).notNull(),
  "role_id": varchar("role_id", { length: 30 }).notNull(),
  "approver_bname": varchar("approver_bname", { length: 30 }).notNull(),
  "approval_status": varchar("approval_status", { length: 20 }).notNull(),
  "comments": text("comments"),
  "approved_at": timestamp("approved_at", { mode: "string" }),
}, (table) => [
  primaryKey({ columns: [table["approval_id"]] }),
]);

export const approval_workflowsTable = mysqlTable("approval_workflows", {
  "workflow_id": varchar("workflow_id", { length: 30 }).notNull(),
  "workflow_type": varchar("workflow_type", { length: 50 }).notNull(),
  "workflow_name": varchar("workflow_name", { length: 150 }).notNull(),
  "description": text("description").notNull(),
  "is_active": tinyint("is_active").notNull(),
  "auto_escalate_days": int("auto_escalate_days"),
  "condition_field": varchar("condition_field", { length: 50 }),
  "condition_operator": varchar("condition_operator", { length: 10 }),
  "condition_value": decimal("condition_value", { precision: 15, scale: 2 }),
  "created_by": varchar("created_by", { length: 100 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["workflow_id"]] }),
]);

export const workflow_stepsTable = mysqlTable("workflow_steps", {
  "step_id": varchar("step_id", { length: 30 }).notNull(),
  "workflow_id": varchar("workflow_id", { length: 30 }).notNull(),
  "step_order": int("step_order").notNull(),
  "step_name": varchar("step_name", { length: 100 }).notNull(),
  "approver_role_id": varchar("approver_role_id", { length: 30 }).notNull(),
  "approver_count": int("approver_count").notNull(),
  "is_optional": tinyint("is_optional").notNull(),
}, (table) => [
  primaryKey({ columns: [table["step_id"]] }),
]);

export const vendor_masterTable = mysqlTable("vendor_master", {
  "vendor_id": varchar("vendor_id", { length: 20 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "vendor_name": varchar("vendor_name", { length: 200 }).notNull(),
  "category": varchar("category", { length: 100 }).notNull(),
  "rfx_category": varchar("rfx_category", { length: 50 }).notNull(),
  "vendor_profile": varchar("vendor_profile", { length: 200 }).notNull(),
  "region": varchar("region", { length: 20 }).notNull(),
  "country": varchar("country", { length: 100 }).notNull(),
  "city": varchar("city", { length: 100 }),
  "geography": varchar("geography", { length: 20 }).notNull(),
  "contact_name": varchar("contact_name", { length: 100 }),
  "phone_number": varchar("phone_number", { length: 30 }),
  "email": varchar("email", { length: 150 }).notNull(),
  "annual_spend_usd": decimal("annual_spend_usd", { precision: 15, scale: 2 }).notNull(),
  "spend_threshold": varchar("spend_threshold", { length: 20 }).notNull(),
  "esg_score": decimal("esg_score", { precision: 5, scale: 2 }),
  "financial_score": decimal("financial_score", { precision: 5, scale: 2 }),
  "risk_score": decimal("risk_score", { precision: 5, scale: 2 }),
  "compliance_score": decimal("compliance_score", { precision: 5, scale: 2 }),
  "composite_score": decimal("composite_score", { precision: 5, scale: 2 }),
  "source_file": varchar("source_file", { length: 100 }).notNull(),
  "loaded_at": timestamp("loaded_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["vendor_id"]] }),
]);

export const discovery_runsTable = mysqlTable("discovery_runs", {
  "run_id": varchar("run_id", { length: 30 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "scenario": varchar("scenario", { length: 40 }).notNull(),
  "weights_json": json("weights_json").notNull(),
  "screened": int("screened").notNull(),
  "qualified": int("qualified").notNull(),
  "recommended": int("recommended").notNull(),
  "portfolio_score": decimal("portfolio_score", { precision: 5, scale: 2 }).notNull(),
  "confidence": decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  "run_by": varchar("run_by", { length: 100 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["run_id"]] }),
]);

export const invoicesTable = mysqlTable("invoices", {
  "invoice_id": varchar("invoice_id", { length: 30 }).notNull(),
  "contract_id": varchar("contract_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "category": varchar("category", { length: 100 }).notNull(),
  "invoice_date": date("invoice_date", { mode: "string" }).notNull(),
  "period": varchar("period", { length: 7 }).notNull(),
  "baseline_amount": decimal("baseline_amount", { precision: 15, scale: 2 }).notNull(),
  "contracted_amount": decimal("contracted_amount", { precision: 15, scale: 2 }).notNull(),
  "invoiced_amount": decimal("invoiced_amount", { precision: 15, scale: 2 }).notNull(),
  "paid_amount": decimal("paid_amount", { precision: 15, scale: 2 }),
  "payment_date": date("payment_date", { mode: "string" }),
  "status": varchar("status", { length: 20 }).notNull(),
  "on_contract": tinyint("on_contract").notNull(),
  "leakage_type": varchar("leakage_type", { length: 40 }),
  "cost_center": varchar("cost_center", { length: 20 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["invoice_id"]] }),
]);

export const market_signalsTable = mysqlTable("market_signals", {
  "signal_id": varchar("signal_id", { length: 30 }).notNull(),
  "signal_type": varchar("signal_type", { length: 40 }).notNull(),
  "severity": varchar("severity", { length: 10 }).notNull(),
  "category": varchar("category", { length: 100 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }),
  "contract_id": varchar("contract_id", { length: 50 }),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "metric": varchar("metric", { length: 100 }).notNull(),
  "change_pct": decimal("change_pct", { precision: 6, scale: 2 }).notNull(),
  "source": varchar("source", { length: 100 }).notNull(),
  "detected_at": timestamp("detected_at", { mode: "string" }).notNull(),
  "status": varchar("status", { length: 20 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["signal_id"]] }),
]);

export const negotiation_actionsTable = mysqlTable("negotiation_actions", {
  "action_id": varchar("action_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "negotiation_round_id": varchar("negotiation_round_id", { length: 50 }).notNull(),
  "action_type": varchar("action_type", { length: 50 }).notNull(),
  "action_title": varchar("action_title", { length: 255 }).notNull(),
  "action_detail": text("action_detail").notNull(),
  "owner_type": varchar("owner_type", { length: 20 }).notNull(),
  "owner_user_id": varchar("owner_user_id", { length: 50 }).notNull(),
  "owner_persona_id": varchar("owner_persona_id", { length: 50 }).notNull(),
  "action_status": varchar("action_status", { length: 30 }).notNull(),
  "priority": varchar("priority", { length: 20 }).notNull(),
  "due_at": timestamp("due_at", { mode: "string" }).notNull(),
  "completed_at": timestamp("completed_at", { mode: "string" }),
  "source_recommendation_id": varchar("source_recommendation_id", { length: 50 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["action_id"]] }),
]);

export const negotiation_batna_scenariosTable = mysqlTable("negotiation_batna_scenarios", {
  "batna_scenario_id": varchar("batna_scenario_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "scenario_type": varchar("scenario_type", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "scenario_title": varchar("scenario_title", { length: 255 }).notNull(),
  "description": text("description").notNull(),
  "feasibility_level": varchar("feasibility_level", { length: 30 }).notNull(),
  "annual_cost": decimal("annual_cost", { precision: 15, scale: 2 }).notNull(),
  "currency_code": varchar("currency_code", { length: 3 }).notNull(),
  "implementation_days": int("implementation_days").notNull(),
  "pros_json": json("pros_json").notNull(),
  "cons_json": json("cons_json").notNull(),
  "recommendation_score": decimal("recommendation_score", { precision: 5, scale: 2 }).notNull(),
  "evidence_json": json("evidence_json").notNull(),
  "model_version": varchar("model_version", { length: 100 }).notNull(),
  "review_status": varchar("review_status", { length: 30 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["batna_scenario_id"]] }),
]);

export const negotiation_case_tacticsTable = mysqlTable("negotiation_case_tactics", {
  "case_tactic_id": varchar("case_tactic_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "tactic_id": varchar("tactic_id", { length: 50 }).notNull(),
  "recommendation_status": varchar("recommendation_status", { length: 30 }).notNull(),
  "recommendation_rationale": text("recommendation_rationale").notNull(),
  "evidence_json": json("evidence_json").notNull(),
  "confidence_score": decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  "requires_hitl": tinyint("requires_hitl").notNull(),
  "approved_by": varchar("approved_by", { length: 100 }),
  "approved_at": timestamp("approved_at", { mode: "string" }),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["case_tactic_id"]] }),
]);

export const negotiation_casesTable = mysqlTable("negotiation_cases", {
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "insight_id": varchar("insight_id", { length: 50 }).notNull(),
  "decision_id": varchar("decision_id", { length: 50 }),
  "case_status": varchar("case_status", { length: 50 }).notNull(),
  "strategy_version": int("strategy_version").notNull(),
  "currency_code": varchar("currency_code", { length: 3 }).notNull(),
  "opening_offer_amount": decimal("opening_offer_amount", { precision: 15, scale: 2 }).notNull(),
  "target_price": decimal("target_price", { precision: 15, scale: 2 }).notNull(),
  "walk_away_price": decimal("walk_away_price", { precision: 15, scale: 2 }).notNull(),
  "case_owner_user_id": varchar("case_owner_user_id", { length: 50 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
  "closed_at": timestamp("closed_at", { mode: "string" }),
}, (table) => [
  primaryKey({ columns: [table["negotiation_case_id"]] }),
]);

export const negotiation_concessionsTable = mysqlTable("negotiation_concessions", {
  "concession_id": varchar("concession_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "negotiation_round_id": varchar("negotiation_round_id", { length: 50 }).notNull(),
  "concession_name": varchar("concession_name", { length: 255 }).notNull(),
  "concession_category": varchar("concession_category", { length: 50 }).notNull(),
  "our_ask_text": text("our_ask_text").notNull(),
  "supplier_offer_text": text("supplier_offer_text"),
  "our_value_amount": decimal("our_value_amount", { precision: 15, scale: 2 }).notNull(),
  "supplier_value_amount": decimal("supplier_value_amount", { precision: 15, scale: 2 }),
  "currency_code": varchar("currency_code", { length: 3 }).notNull(),
  "value_basis": varchar("value_basis", { length: 50 }).notNull(),
  "impact_level": varchar("impact_level", { length: 20 }).notNull(),
  "concession_status": varchar("concession_status", { length: 30 }).notNull(),
  "notes": text("notes").notNull(),
  "source_offer_id": varchar("source_offer_id", { length: 50 }).notNull(),
  "created_by": varchar("created_by", { length: 100 }).notNull(),
  "approved_by": varchar("approved_by", { length: 100 }),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["concession_id"]] }),
]);

export const negotiation_decisionsTable = mysqlTable("negotiation_decisions", {
  "decision_id": varchar("decision_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "negotiation_round_id": varchar("negotiation_round_id", { length: 50 }).notNull(),
  "decision_type": varchar("decision_type", { length: 50 }).notNull(),
  "decision_rationale": text("decision_rationale").notNull(),
  "approved_by_user_id": varchar("approved_by_user_id", { length: 50 }).notNull(),
  "approved_at": timestamp("approved_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["decision_id"]] }),
]);

export const negotiation_market_benchmarksTable = mysqlTable("negotiation_market_benchmarks", {
  "benchmark_id": varchar("benchmark_id", { length: 50 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "rfx_category": varchar("rfx_category", { length: 50 }).notNull(),
  "benchmark_scope": varchar("benchmark_scope", { length: 100 }).notNull(),
  "range_low_amount": decimal("range_low_amount", { precision: 15, scale: 2 }).notNull(),
  "range_high_amount": decimal("range_high_amount", { precision: 15, scale: 2 }).notNull(),
  "median_amount": decimal("median_amount", { precision: 15, scale: 2 }).notNull(),
  "currency_code": varchar("currency_code", { length: 3 }).notNull(),
  "term_months": int("term_months").notNull(),
  "source_type": varchar("source_type", { length: 50 }).notNull(),
  "source_reference": varchar("source_reference", { length: 1024 }).notNull(),
  "methodology_version": varchar("methodology_version", { length: 50 }).notNull(),
  "confidence_score": decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  "valid_from": date("valid_from", { mode: "string" }).notNull(),
  "valid_to": date("valid_to", { mode: "string" }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["benchmark_id"]] }),
]);

export const negotiation_message_eventsTable = mysqlTable("negotiation_message_events", {
  "message_event_id": varchar("message_event_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "negotiation_round_id": varchar("negotiation_round_id", { length: 50 }).notNull(),
  "direction": varchar("direction", { length: 20 }).notNull(),
  "channel": varchar("channel", { length: 30 }).notNull(),
  "message_type": varchar("message_type", { length: 50 }).notNull(),
  "subject": varchar("subject", { length: 255 }).notNull(),
  "safe_summary": text("safe_summary").notNull(),
  "source_document_id": bigint("source_document_id", { mode: "number" }),
  "source_offer_id": varchar("source_offer_id", { length: 50 }).notNull(),
  "sent_by_actor_type": varchar("sent_by_actor_type", { length: 20 }).notNull(),
  "sent_by_actor_id": varchar("sent_by_actor_id", { length: 100 }).notNull(),
  "delivery_status": varchar("delivery_status", { length: 30 }).notNull(),
  "sent_at": timestamp("sent_at", { mode: "string" }),
  "received_at": timestamp("received_at", { mode: "string" }),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["message_event_id"]] }),
]);

export const negotiation_offer_linesTable = mysqlTable("negotiation_offer_lines", {
  "offer_line_id": varchar("offer_line_id", { length: 50 }).notNull(),
  "offer_id": varchar("offer_id", { length: 50 }).notNull(),
  "rfq_line_item_id": int("rfq_line_item_id").notNull(),
  "offered_unit_price": decimal("offered_unit_price", { precision: 15, scale: 4 }).notNull(),
  "offered_quantity": decimal("offered_quantity", { precision: 15, scale: 2 }).notNull(),
  "offered_lead_time_days": int("offered_lead_time_days").notNull(),
  "target_unit_price": decimal("target_unit_price", { precision: 15, scale: 4 }).notNull(),
  "currency_code": varchar("currency_code", { length: 3 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["offer_line_id"]] }),
]);

export const negotiation_offersTable = mysqlTable("negotiation_offers", {
  "offer_id": varchar("offer_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "negotiation_round_id": varchar("negotiation_round_id", { length: 50 }).notNull(),
  "offer_party": varchar("offer_party", { length: 20 }).notNull(),
  "offer_type": varchar("offer_type", { length: 30 }).notNull(),
  "total_amount": decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  "currency_code": varchar("currency_code", { length: 3 }).notNull(),
  "pricing_basis": varchar("pricing_basis", { length: 50 }).notNull(),
  "term_months": int("term_months").notNull(),
  "offer_summary": text("offer_summary").notNull(),
  "source_bid_id": bigint("source_bid_id", { mode: "number" }).notNull(),
  "source_response_id": int("source_response_id").notNull(),
  "offer_status": varchar("offer_status", { length: 30 }).notNull(),
  "received_at": timestamp("received_at", { mode: "string" }),
  "submitted_at": timestamp("submitted_at", { mode: "string" }),
  "created_by": varchar("created_by", { length: 100 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["offer_id"]] }),
]);

export const negotiation_playbook_tacticsTable = mysqlTable("negotiation_playbook_tactics", {
  "tactic_id": varchar("tactic_id", { length: 50 }).notNull(),
  "tactic_name": varchar("tactic_name", { length: 255 }).notNull(),
  "tactic_phase": varchar("tactic_phase", { length: 50 }).notNull(),
  "risk_level": varchar("risk_level", { length: 20 }).notNull(),
  "description": text("description").notNull(),
  "when_to_use": text("when_to_use").notNull(),
  "expected_outcome": text("expected_outcome").notNull(),
  "prohibited_conditions_json": json("prohibited_conditions_json").notNull(),
  "policy_version": varchar("policy_version", { length: 50 }).notNull(),
  "is_active": tinyint("is_active").notNull(),
  "owner_persona_id": varchar("owner_persona_id", { length: 50 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["tactic_id"]] }),
]);

export const negotiation_roundsTable = mysqlTable("negotiation_rounds", {
  "negotiation_round_id": varchar("negotiation_round_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "round_number": int("round_number").notNull(),
  "round_type": varchar("round_type", { length: 50 }).notNull(),
  "round_status": varchar("round_status", { length: 50 }).notNull(),
  "strategy_label": varchar("strategy_label", { length: 100 }).notNull(),
  "next_step_code": varchar("next_step_code", { length: 100 }).notNull(),
  "opened_at": timestamp("opened_at", { mode: "string" }).notNull(),
  "response_due_at": timestamp("response_due_at", { mode: "string" }).notNull(),
  "closed_at": timestamp("closed_at", { mode: "string" }),
  "created_by": varchar("created_by", { length: 100 }).notNull(),
  "approved_by": varchar("approved_by", { length: 100 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
  "updated_at": timestamp("updated_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["negotiation_round_id"]] }),
]);

export const negotiation_strategy_assessmentsTable = mysqlTable("negotiation_strategy_assessments", {
  "strategy_assessment_id": varchar("strategy_assessment_id", { length: 50 }).notNull(),
  "negotiation_case_id": varchar("negotiation_case_id", { length: 50 }).notNull(),
  "assessment_dimension": varchar("assessment_dimension", { length: 80 }).notNull(),
  "assessment_version": int("assessment_version").notNull(),
  "our_position": varchar("our_position", { length: 30 }).notNull(),
  "supplier_position": varchar("supplier_position", { length: 30 }).notNull(),
  "leverage_score": decimal("leverage_score", { precision: 5, scale: 2 }).notNull(),
  "insight_text": text("insight_text").notNull(),
  "evidence_json": json("evidence_json").notNull(),
  "recommendation_text": text("recommendation_text").notNull(),
  "model_version": varchar("model_version", { length: 100 }).notNull(),
  "confidence_score": decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  "review_status": varchar("review_status", { length: 30 }).notNull(),
  "reviewed_by": varchar("reviewed_by", { length: 100 }),
  "reviewed_at": timestamp("reviewed_at", { mode: "string" }),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["strategy_assessment_id"]] }),
]);

export const resourcing_recommendationsTable = mysqlTable("resourcing_recommendations", {
  "rec_id": varchar("rec_id", { length: 30 }).notNull(),
  "signal_id": varchar("signal_id", { length: 30 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "contract_id": varchar("contract_id", { length: 50 }),
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "action": varchar("action", { length: 30 }).notNull(),
  "rationale": text("rationale").notNull(),
  "est_impact_usd": decimal("est_impact_usd", { precision: 15, scale: 2 }).notNull(),
  "confidence": decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  "alternative_supplier_id": varchar("alternative_supplier_id", { length: 50 }).notNull(),
  "status": varchar("status", { length: 20 }).notNull(),
  "decided_by": varchar("decided_by", { length: 100 }),
  "decided_at": timestamp("decided_at", { mode: "string" }),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["rec_id"]] }),
]);

export const rfx_weight_categoriesTable = mysqlTable("rfx_weight_categories", {
  "weight_category_id": varchar("weight_category_id", { length: 30 }).notNull(),
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "category_name": varchar("category_name", { length: 100 }).notNull(),
  "weight": decimal("weight", { precision: 5, scale: 2 }).notNull(),
  "source": varchar("source", { length: 20 }).notNull(),
  "created_at": timestamp("created_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["weight_category_id"]] }),
]);

export const sourcing_cycle_historyTable = mysqlTable("sourcing_cycle_history", {
  "rfx_id": varchar("rfx_id", { length: 50 }).notNull(),
  "title": varchar("title", { length: 200 }).notNull(),
  "category": varchar("category", { length: 100 }).notNull(),
  "rfx_type": varchar("rfx_type", { length: 10 }).notNull(),
  "intake_date": date("intake_date", { mode: "string" }).notNull(),
  "awarded_date": date("awarded_date", { mode: "string" }),
  "cycle_days": int("cycle_days").notNull(),
  "stage_days": json("stage_days").notNull(),
  "awarded_value_usd": decimal("awarded_value_usd", { precision: 15, scale: 2 }),
  "savings_usd": decimal("savings_usd", { precision: 15, scale: 2 }),
  "supplier_name": varchar("supplier_name", { length: 200 }).notNull(),
  "sla_breaches": int("sla_breaches").notNull(),
}, (table) => [
  primaryKey({ columns: [table["rfx_id"]] }),
]);

export const supplier_diversityTable = mysqlTable("supplier_diversity", {
  "supplier_id": varchar("supplier_id", { length: 50 }).notNull(),
  "minority_owned": tinyint("minority_owned").notNull(),
  "women_owned": tinyint("women_owned").notNull(),
  "veteran_owned": tinyint("veteran_owned").notNull(),
  "small_business": tinyint("small_business").notNull(),
  "sustainability_certified": tinyint("sustainability_certified").notNull(),
  "source": varchar("source", { length: 30 }).notNull(),
  "verified_at": date("verified_at", { mode: "string" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table["supplier_id"]] }),
]);
