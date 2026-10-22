// Generated from the approved 79-table contract. Do not edit manually.
export const S2C_TABLE_NAMES = [
  "agent_approval_routing_rules",
  "agent_assignment_evaluations",
  "agent_evaluations",
  "approver_availability_matrix",
  "bid_attachments",
  "bid_exceptions",
  "bid_line_items",
  "bid_responses",
  "compliance",
  "contract_approvals",
  "contract_documents",
  "contract_intake_requests",
  "contract_risk_assessment",
  "documents",
  "human_in_loop_controls",
  "intake_commercials_timelines",
  "intake_documents",
  "intake_evaluation_weights",
  "intake_requests",
  "intake_scope_specs",
  "intake_strategy_governance",
  "negotiation_finalization",
  "negotiation_insights",
  "personas_master",
  "rfx_approvals",
  "rfx_assigned_approvers",
  "rfx_category",
  "rfx_documents",
  "rfx_draft_versions",
  "rfx_events",
  "rfx_question_responses",
  "rfx_questions",
  "rfx_requirements",
  "rfx_response",
  "rfx_response_answers",
  "rfx_weight_configs",
  "supplier",
  "supplier_agent_memory",
  "supplier_classification",
  "supplier_documents",
  "supplier_esg_compliance",
  "supplier_external_enrichment",
  "supplier_improvement_plans",
  "supplier_kpi_metrics",
  "supplier_product_profiles",
  "supplier_qbr_reviews",
  "supplier_risk_profile",
  "supplier_scorecards",
  "supplier_selection_decisions",
  "supplier_services_profiles",
  "supplier_shortlisting",
  "supplier_software_profiles",
  "platform_roles",
  "role_module_access",
  "enterprise_user_master",
  "intake_approvals",
  "approval_workflows",
  "workflow_steps",
  "vendor_master",
  "discovery_runs",
  "invoices",
  "market_signals",
  "negotiation_actions",
  "negotiation_batna_scenarios",
  "negotiation_case_tactics",
  "negotiation_cases",
  "negotiation_concessions",
  "negotiation_decisions",
  "negotiation_market_benchmarks",
  "negotiation_message_events",
  "negotiation_offer_lines",
  "negotiation_offers",
  "negotiation_playbook_tactics",
  "negotiation_rounds",
  "negotiation_strategy_assessments",
  "resourcing_recommendations",
  "rfx_weight_categories",
  "sourcing_cycle_history",
  "supplier_diversity"
] as const;
export type S2cTableName = (typeof S2C_TABLE_NAMES)[number];
export const S2C_PRIMARY_KEYS: Record<S2cTableName, readonly string[]> = {
  "agent_approval_routing_rules": [
    "rule_id"
  ],
  "agent_assignment_evaluations": [
    "evaluation_id"
  ],
  "agent_evaluations": [
    "evaluation_id"
  ],
  "approver_availability_matrix": [
    "user_id"
  ],
  "bid_attachments": [
    "bid_id",
    "document_id"
  ],
  "bid_exceptions": [
    "bid_exceptions_id"
  ],
  "bid_line_items": [
    "biditem_id"
  ],
  "bid_responses": [
    "bid_id"
  ],
  "compliance": [
    "compliance_id"
  ],
  "contract_approvals": [
    "approval_id"
  ],
  "contract_documents": [
    "contract_id",
    "document_id"
  ],
  "contract_intake_requests": [
    "contract_id"
  ],
  "contract_risk_assessment": [
    "risk_id"
  ],
  "documents": [
    "document_id"
  ],
  "human_in_loop_controls": [
    "hitl_id"
  ],
  "intake_commercials_timelines": [
    "request_id"
  ],
  "intake_documents": [
    "request_id",
    "document_id"
  ],
  "intake_evaluation_weights": [
    "request_id"
  ],
  "intake_requests": [
    "request_id"
  ],
  "intake_scope_specs": [
    "request_id"
  ],
  "intake_strategy_governance": [
    "request_id"
  ],
  "negotiation_finalization": [
    "finalization_id"
  ],
  "negotiation_insights": [
    "insight_id"
  ],
  "personas_master": [
    "persona_id"
  ],
  "rfx_approvals": [
    "approval_id"
  ],
  "rfx_assigned_approvers": [
    "assignment_id"
  ],
  "rfx_category": [
    "rfx_category"
  ],
  "rfx_documents": [
    "rfx_id",
    "document_id"
  ],
  "rfx_draft_versions": [
    "draft_id"
  ],
  "rfx_events": [
    "rfx_id"
  ],
  "rfx_question_responses": [
    "response_id"
  ],
  "rfx_questions": [
    "question_id"
  ],
  "rfx_requirements": [
    "requirement_id"
  ],
  "rfx_response": [
    "response_id"
  ],
  "rfx_response_answers": [
    "answer_id"
  ],
  "rfx_weight_configs": [
    "rfx_id"
  ],
  "supplier": [
    "supplier_id"
  ],
  "supplier_agent_memory": [
    "supplier_id"
  ],
  "supplier_classification": [
    "supplier_id"
  ],
  "supplier_documents": [
    "supplier_id",
    "document_id"
  ],
  "supplier_esg_compliance": [
    "supplier_id"
  ],
  "supplier_external_enrichment": [
    "supplier_id"
  ],
  "supplier_improvement_plans": [
    "plan_id"
  ],
  "supplier_kpi_metrics": [
    "kpi_id"
  ],
  "supplier_product_profiles": [
    "supplier_id"
  ],
  "supplier_qbr_reviews": [
    "qbr_id"
  ],
  "supplier_risk_profile": [
    "supplier_id"
  ],
  "supplier_scorecards": [
    "scorecard_id"
  ],
  "supplier_selection_decisions": [
    "decision_id"
  ],
  "supplier_services_profiles": [
    "supplier_id"
  ],
  "supplier_shortlisting": [
    "shortlist_id"
  ],
  "supplier_software_profiles": [
    "supplier_id"
  ],
  "platform_roles": [
    "role_id"
  ],
  "role_module_access": [
    "role_id",
    "module_id"
  ],
  "enterprise_user_master": [
    "BNAME"
  ],
  "intake_approvals": [
    "approval_id"
  ],
  "approval_workflows": [
    "workflow_id"
  ],
  "workflow_steps": [
    "step_id"
  ],
  "vendor_master": [
    "vendor_id"
  ],
  "discovery_runs": [
    "run_id"
  ],
  "invoices": [
    "invoice_id"
  ],
  "market_signals": [
    "signal_id"
  ],
  "negotiation_actions": [
    "action_id"
  ],
  "negotiation_batna_scenarios": [
    "batna_scenario_id"
  ],
  "negotiation_case_tactics": [
    "case_tactic_id"
  ],
  "negotiation_cases": [
    "negotiation_case_id"
  ],
  "negotiation_concessions": [
    "concession_id"
  ],
  "negotiation_decisions": [
    "decision_id"
  ],
  "negotiation_market_benchmarks": [
    "benchmark_id"
  ],
  "negotiation_message_events": [
    "message_event_id"
  ],
  "negotiation_offer_lines": [
    "offer_line_id"
  ],
  "negotiation_offers": [
    "offer_id"
  ],
  "negotiation_playbook_tactics": [
    "tactic_id"
  ],
  "negotiation_rounds": [
    "negotiation_round_id"
  ],
  "negotiation_strategy_assessments": [
    "strategy_assessment_id"
  ],
  "resourcing_recommendations": [
    "rec_id"
  ],
  "rfx_weight_categories": [
    "weight_category_id"
  ],
  "sourcing_cycle_history": [
    "rfx_id"
  ],
  "supplier_diversity": [
    "supplier_id"
  ]
};
export const S2C_TABLE_COLUMNS: Record<S2cTableName, readonly string[]> = {
  "agent_approval_routing_rules": [
    "rule_id",
    "process_stage",
    "persona_id",
    "min_value_threshold",
    "max_value_threshold",
    "risk_level_criteria",
    "is_active",
    "created_at"
  ],
  "agent_assignment_evaluations": [
    "evaluation_id",
    "rfx_id",
    "agent_model_version",
    "evaluation_rationale",
    "confidence_score",
    "evaluation_status",
    "created_at"
  ],
  "agent_evaluations": [
    "evaluation_id",
    "rfx_id",
    "supplier_id",
    "commercial_score",
    "operational_score",
    "risk_score",
    "esg_score",
    "total_weighted_score",
    "agent_rank",
    "agent_rationale",
    "evaluated_at"
  ],
  "approver_availability_matrix": [
    "user_id",
    "persona_id",
    "user_email",
    "category_expertise",
    "current_active_assignments",
    "is_available",
    "delegated_user_id"
  ],
  "bid_attachments": [
    "bid_id",
    "document_id",
    "classification",
    "ocr_confidence",
    "created_at"
  ],
  "bid_exceptions": [
    "bid_exceptions_id",
    "bid_id",
    "exception_type",
    "field_name",
    "raw_value",
    "severity",
    "resolution_status",
    "resolved_by",
    "resolved_at"
  ],
  "bid_line_items": [
    "biditem_id",
    "bid_id",
    "question_id",
    "item_code",
    "description",
    "raw_quantity",
    "normalized_quantity",
    "raw_uom",
    "normalized_uom",
    "raw_unit_price",
    "normalized_unit_price",
    "raw_currency",
    "normalized_currency",
    "exchange_rate",
    "extended_price_normalized",
    "lead_time_days",
    "compliance_flag"
  ],
  "bid_responses": [
    "bid_id",
    "external_bid_uuid",
    "rfx_id",
    "supplier_id",
    "submission_date",
    "source_channel",
    "version_number",
    "status",
    "confidence_score",
    "raw_payload",
    "created_at",
    "updated_at"
  ],
  "compliance": [
    "compliance_id",
    "compliance_name",
    "geography",
    "procurement_type",
    "category",
    "priority",
    "clause_text",
    "is_mandatory",
    "status",
    "effective_date",
    "created_at",
    "updated_at"
  ],
  "contract_approvals": [
    "approval_id",
    "contract_id",
    "approver_role",
    "approver_name",
    "approval_status",
    "comments",
    "approval_sequence",
    "approved_at"
  ],
  "contract_documents": [
    "contract_id",
    "document_id",
    "visibility",
    "classification",
    "created_at"
  ],
  "contract_intake_requests": [
    "contract_id",
    "linked_rfx",
    "contract_type",
    "contract_value",
    "risk_level",
    "business_owner",
    "intake_status",
    "validated_by",
    "validated_at",
    "created_at"
  ],
  "contract_risk_assessment": [
    "risk_id",
    "contract_id",
    "risk_score",
    "compliance_flags",
    "legal_risk_notes",
    "mitigation_plan",
    "reviewed_by",
    "approved_flag",
    "approved_by"
  ],
  "documents": [
    "document_id",
    "title",
    "document_type",
    "status",
    "file_path",
    "file_name",
    "file_size_bytes",
    "created_by",
    "created_at",
    "updated_at",
    "deleted_at"
  ],
  "human_in_loop_controls": [
    "hitl_id",
    "process_stage",
    "entity_table",
    "decision_type",
    "primary_persona",
    "supporting_personas",
    "approval_required",
    "approval_flow",
    "override_allowed",
    "audit_required",
    "created_at"
  ],
  "intake_commercials_timelines": [
    "request_id",
    "cost_center",
    "approved_budget",
    "currency",
    "capex_opex",
    "sourcing_start_date",
    "rfp_issue_date",
    "award_date",
    "service_start_date",
    "linked_RFx"
  ],
  "intake_documents": [
    "request_id",
    "document_id",
    "visibility",
    "created_at"
  ],
  "intake_evaluation_weights": [
    "request_id",
    "commercial_weight",
    "technical_weight",
    "compliance_weight"
  ],
  "intake_requests": [
    "request_id",
    "requestor_name",
    "employee_id",
    "business_unit",
    "location",
    "request_type",
    "category",
    "procurement_type",
    "priority",
    "requirement_description",
    "business_outcome",
    "impact_if_not_procured",
    "intake_status",
    "linked_RFx",
    "created_at"
  ],
  "intake_scope_specs": [
    "request_id",
    "scope_description",
    "deliverables",
    "specification_type",
    "compliance_requirements",
    "geography_coverage",
    "transition_requirement",
    "documentation_attachments"
  ],
  "intake_strategy_governance": [
    "request_id",
    "incumbent_supplier",
    "suggested_suppliers",
    "sourcing_approach",
    "expected_bidders_range",
    "contract_type",
    "duration_years",
    "payment_terms_days",
    "risk_category",
    "data_security_notes",
    "esg_requirement"
  ],
  "negotiation_finalization": [
    "finalization_id",
    "rfx_id",
    "supplier_id",
    "final_price",
    "savings_achieved",
    "negotiation_summary",
    "finance_approval_status",
    "procurement_approval_status",
    "approved_by",
    "approved_at"
  ],
  "negotiation_insights": [
    "insight_id",
    "rfx_id",
    "supplier_id",
    "benchmark_price",
    "target_price",
    "walk_away_price",
    "ai_recommendation",
    "reviewed_by",
    "approval_flag",
    "approved_by",
    "approved_at"
  ],
  "personas_master": [
    "persona_id",
    "persona_name",
    "function_area",
    "role_description",
    "decision_authority",
    "approval_authority",
    "typical_stages"
  ],
  "rfx_approvals": [
    "approval_id",
    "rfx_id",
    "approver_role",
    "approver_name",
    "approval_status",
    "comments",
    "approval_sequence",
    "approved_at"
  ],
  "rfx_assigned_approvers": [
    "assignment_id",
    "rfx_id",
    "approver_user_id",
    "evaluation_id",
    "approval_sequence",
    "current_status",
    "assigned_at",
    "actioned_at",
    "comments"
  ],
  "rfx_category": [
    "rfx_category",
    "category_name",
    "created_at"
  ],
  "rfx_documents": [
    "rfx_id",
    "document_id",
    "visibility",
    "phase",
    "created_at"
  ],
  "rfx_draft_versions": [
    "draft_id",
    "rfx_id",
    "version_number",
    "template_id",
    "draft_content",
    "created_by",
    "reviewed_by",
    "approval_status",
    "approved_by",
    "approved_at"
  ],
  "rfx_events": [
    "rfx_id",
    "title",
    "rfx_type",
    "rfx_category",
    "status",
    "issue_date",
    "due_date",
    "closed_date",
    "owner",
    "description",
    "scope",
    "invited_suppliers",
    "responses_received",
    "key_findings",
    "attachments",
    "budget_limit_usd",
    "created_at"
  ],
  "rfx_question_responses": [
    "response_id",
    "question_id",
    "response_text",
    "internal_notes",
    "response_status",
    "answered_by",
    "approved_by",
    "published_at",
    "created_at",
    "updated_at"
  ],
  "rfx_questions": [
    "question_id",
    "rfx_id",
    "supplier_id",
    "section_reference",
    "question_text",
    "is_private",
    "submission_status",
    "submitted_by",
    "submitted_at"
  ],
  "rfx_requirements": [
    "requirement_id",
    "rfx_id",
    "category",
    "title",
    "description",
    "priority_level",
    "response_type",
    "choices",
    "max_points_allocated",
    "weight",
    "created_at",
    "updated_at"
  ],
  "rfx_response": [
    "response_id",
    "rfx_id",
    "supplier_id",
    "quoted_total_price",
    "quoted_delivery_days",
    "payment_terms_offered",
    "requirement_deviations",
    "extended_bid_details",
    "submitted_at"
  ],
  "rfx_response_answers": [
    "answer_id",
    "rfx_id",
    "supplier_id",
    "requirement_id",
    "vendor_answer_text",
    "agent_calculated_score",
    "agent_answer_rationale"
  ],
  "rfx_weight_configs": [
    "rfx_id",
    "commercial_weight",
    "operational_weight",
    "risk_compliance_weight",
    "esg_weight",
    "completeness_score",
    "consistency_score",
    "complaince_score",
    "readability_score",
    "overall_quality_score",
    "status",
    "issues",
    "warnings",
    "created_at",
    "updated_at"
  ],
  "supplier": [
    "supplier_id",
    "name",
    "legal_name",
    "country",
    "region",
    "status",
    "risk_rating",
    "esg_score",
    "years_on_panel",
    "certifications",
    "payment_terms_baseline",
    "annual_spend_usd",
    "created_at",
    "kyc_status",
    "kyc_verified_date",
    "kyc_verified_by"
  ],
  "supplier_agent_memory": [
    "supplier_id",
    "agent_notes_semantic",
    "last_updated_by_agent"
  ],
  "supplier_classification": [
    "supplier_id",
    "strategic_flag",
    "preferred_supplier_flag",
    "risk_flag",
    "classification_approved_by",
    "classification_date"
  ],
  "supplier_documents": [
    "supplier_id",
    "document_id",
    "visibility",
    "created_at"
  ],
  "supplier_esg_compliance": [
    "supplier_id",
    "ecovadis_overall_score",
    "ecovadis_environmental",
    "ecovadis_social",
    "ecovadis_governance",
    "sanctions_flag",
    "regulatory_violations",
    "last_updated"
  ],
  "supplier_external_enrichment": [
    "supplier_id",
    "db_credit_score",
    "db_financial_risk_rating",
    "db_annual_revenue",
    "db_employee_count",
    "ariba_performance_rating",
    "hidden_col_1",
    "hidden_col_2"
  ],
  "supplier_improvement_plans": [
    "plan_id",
    "supplier_id",
    "issue_identified",
    "corrective_action",
    "target_date",
    "status",
    "owner",
    "reviewed_by"
  ],
  "supplier_kpi_metrics": [
    "kpi_id",
    "supplier_id",
    "kpi_name",
    "target_value",
    "actual_value",
    "variance",
    "weight",
    "calculated_score",
    "reviewed_by"
  ],
  "supplier_product_profiles": [
    "supplier_id",
    "categories",
    "moq_units",
    "moq_uom",
    "current_capacity_available_pct",
    "avg_lead_time_days",
    "on_time_delivery_pct",
    "defect_rate_pct",
    "preferred_incoterms",
    "shipping_origin_ports"
  ],
  "supplier_qbr_reviews": [
    "qbr_id",
    "supplier_id",
    "review_period",
    "performance_summary",
    "action_items",
    "business_feedback",
    "approved_by",
    "approved_at"
  ],
  "supplier_risk_profile": [
    "supplier_id",
    "interos_geopolitical_risk",
    "interos_supply_chain_risk",
    "resilinc_disruption_risk",
    "resilinc_operational_resilience",
    "last_updated"
  ],
  "supplier_scorecards": [
    "scorecard_id",
    "supplier_id",
    "evaluation_period",
    "overall_score",
    "performance_status",
    "approved_by",
    "approved_at",
    "created_at"
  ],
  "supplier_selection_decisions": [
    "decision_id",
    "rfx_id",
    "shortlisted_suppliers",
    "final_selected_supplier",
    "selection_rationale",
    "agent_recommendation_score",
    "manual_override_flag",
    "business_approval_status",
    "procurement_approval_status",
    "final_approval_by",
    "approval_timestamp",
    "created_at"
  ],
  "supplier_services_profiles": [
    "supplier_id",
    "engagement_models",
    "delivery_locations",
    "primary_resource_stack",
    "average_resource_rate_usd",
    "subcontracting_allowed",
    "bench_strength_count",
    "client_csat_score"
  ],
  "supplier_shortlisting": [
    "shortlist_id",
    "rfx_id",
    "supplier_id",
    "agent_score",
    "shortlist_flag",
    "manual_override_flag",
    "override_reason",
    "validated_by",
    "validated_at"
  ],
  "supplier_software_profiles": [
    "supplier_id",
    "hosting_models",
    "data_security_compliance",
    "supported_integrations",
    "sla_availability_commitment",
    "disaster_recovery_rto_hours",
    "vulnerability_scanned_status",
    "license_models_supported"
  ],
  "platform_roles": [
    "role_id",
    "role_name",
    "color_hex",
    "description",
    "is_system_role",
    "created_at"
  ],
  "role_module_access": [
    "role_id",
    "module_id",
    "access_level"
  ],
  "enterprise_user_master": [
    "MANDT",
    "BNAME",
    "SMTP_ADDR",
    "NAME_FIRST",
    "NAME_LAST",
    "PERSNO",
    "ORGEH",
    "KOSTL",
    "BUKRS",
    "WERKS",
    "PLANS",
    "MANAGER_BNAME",
    "PLATFORM_ROLE",
    "USTYP",
    "GLTGB",
    "UFLAG",
    "TRDAT",
    "ERDAT"
  ],
  "intake_approvals": [
    "approval_id",
    "request_id",
    "approval_sequence",
    "approver_role",
    "role_id",
    "approver_bname",
    "approval_status",
    "comments",
    "approved_at"
  ],
  "approval_workflows": [
    "workflow_id",
    "workflow_type",
    "workflow_name",
    "description",
    "is_active",
    "auto_escalate_days",
    "condition_field",
    "condition_operator",
    "condition_value",
    "created_by",
    "created_at",
    "updated_at"
  ],
  "workflow_steps": [
    "step_id",
    "workflow_id",
    "step_order",
    "step_name",
    "approver_role_id",
    "approver_count",
    "is_optional"
  ],
  "vendor_master": [
    "vendor_id",
    "supplier_id",
    "vendor_name",
    "category",
    "rfx_category",
    "vendor_profile",
    "region",
    "country",
    "city",
    "geography",
    "contact_name",
    "phone_number",
    "email",
    "annual_spend_usd",
    "spend_threshold",
    "esg_score",
    "financial_score",
    "risk_score",
    "compliance_score",
    "composite_score",
    "source_file",
    "loaded_at"
  ],
  "discovery_runs": [
    "run_id",
    "rfx_id",
    "scenario",
    "weights_json",
    "screened",
    "qualified",
    "recommended",
    "portfolio_score",
    "confidence",
    "run_by",
    "created_at"
  ],
  "invoices": [
    "invoice_id",
    "contract_id",
    "supplier_id",
    "rfx_id",
    "category",
    "invoice_date",
    "period",
    "baseline_amount",
    "contracted_amount",
    "invoiced_amount",
    "paid_amount",
    "payment_date",
    "status",
    "on_contract",
    "leakage_type",
    "cost_center"
  ],
  "market_signals": [
    "signal_id",
    "signal_type",
    "severity",
    "category",
    "supplier_id",
    "contract_id",
    "rfx_id",
    "metric",
    "change_pct",
    "source",
    "detected_at",
    "status"
  ],
  "negotiation_actions": [
    "action_id",
    "negotiation_case_id",
    "negotiation_round_id",
    "action_type",
    "action_title",
    "action_detail",
    "owner_type",
    "owner_user_id",
    "owner_persona_id",
    "action_status",
    "priority",
    "due_at",
    "completed_at",
    "source_recommendation_id",
    "created_at",
    "updated_at"
  ],
  "negotiation_batna_scenarios": [
    "batna_scenario_id",
    "negotiation_case_id",
    "scenario_type",
    "supplier_id",
    "scenario_title",
    "description",
    "feasibility_level",
    "annual_cost",
    "currency_code",
    "implementation_days",
    "pros_json",
    "cons_json",
    "recommendation_score",
    "evidence_json",
    "model_version",
    "review_status",
    "created_at",
    "updated_at"
  ],
  "negotiation_case_tactics": [
    "case_tactic_id",
    "negotiation_case_id",
    "tactic_id",
    "recommendation_status",
    "recommendation_rationale",
    "evidence_json",
    "confidence_score",
    "requires_hitl",
    "approved_by",
    "approved_at",
    "created_at"
  ],
  "negotiation_cases": [
    "negotiation_case_id",
    "rfx_id",
    "supplier_id",
    "insight_id",
    "decision_id",
    "case_status",
    "strategy_version",
    "currency_code",
    "opening_offer_amount",
    "target_price",
    "walk_away_price",
    "case_owner_user_id",
    "created_at",
    "updated_at",
    "closed_at"
  ],
  "negotiation_concessions": [
    "concession_id",
    "negotiation_case_id",
    "negotiation_round_id",
    "concession_name",
    "concession_category",
    "our_ask_text",
    "supplier_offer_text",
    "our_value_amount",
    "supplier_value_amount",
    "currency_code",
    "value_basis",
    "impact_level",
    "concession_status",
    "notes",
    "source_offer_id",
    "created_by",
    "approved_by",
    "created_at",
    "updated_at"
  ],
  "negotiation_decisions": [
    "decision_id",
    "negotiation_case_id",
    "negotiation_round_id",
    "decision_type",
    "decision_rationale",
    "approved_by_user_id",
    "approved_at"
  ],
  "negotiation_market_benchmarks": [
    "benchmark_id",
    "rfx_id",
    "rfx_category",
    "benchmark_scope",
    "range_low_amount",
    "range_high_amount",
    "median_amount",
    "currency_code",
    "term_months",
    "source_type",
    "source_reference",
    "methodology_version",
    "confidence_score",
    "valid_from",
    "valid_to",
    "created_at"
  ],
  "negotiation_message_events": [
    "message_event_id",
    "negotiation_case_id",
    "negotiation_round_id",
    "direction",
    "channel",
    "message_type",
    "subject",
    "safe_summary",
    "source_document_id",
    "source_offer_id",
    "sent_by_actor_type",
    "sent_by_actor_id",
    "delivery_status",
    "sent_at",
    "received_at",
    "created_at"
  ],
  "negotiation_offer_lines": [
    "offer_line_id",
    "offer_id",
    "rfq_line_item_id",
    "offered_unit_price",
    "offered_quantity",
    "offered_lead_time_days",
    "target_unit_price",
    "currency_code",
    "created_at"
  ],
  "negotiation_offers": [
    "offer_id",
    "negotiation_case_id",
    "negotiation_round_id",
    "offer_party",
    "offer_type",
    "total_amount",
    "currency_code",
    "pricing_basis",
    "term_months",
    "offer_summary",
    "source_bid_id",
    "source_response_id",
    "offer_status",
    "received_at",
    "submitted_at",
    "created_by",
    "created_at",
    "updated_at"
  ],
  "negotiation_playbook_tactics": [
    "tactic_id",
    "tactic_name",
    "tactic_phase",
    "risk_level",
    "description",
    "when_to_use",
    "expected_outcome",
    "prohibited_conditions_json",
    "policy_version",
    "is_active",
    "owner_persona_id",
    "created_at",
    "updated_at"
  ],
  "negotiation_rounds": [
    "negotiation_round_id",
    "negotiation_case_id",
    "round_number",
    "round_type",
    "round_status",
    "strategy_label",
    "next_step_code",
    "opened_at",
    "response_due_at",
    "closed_at",
    "created_by",
    "approved_by",
    "created_at",
    "updated_at"
  ],
  "negotiation_strategy_assessments": [
    "strategy_assessment_id",
    "negotiation_case_id",
    "assessment_dimension",
    "assessment_version",
    "our_position",
    "supplier_position",
    "leverage_score",
    "insight_text",
    "evidence_json",
    "recommendation_text",
    "model_version",
    "confidence_score",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "created_at"
  ],
  "resourcing_recommendations": [
    "rec_id",
    "signal_id",
    "rfx_id",
    "contract_id",
    "supplier_id",
    "action",
    "rationale",
    "est_impact_usd",
    "confidence",
    "alternative_supplier_id",
    "status",
    "decided_by",
    "decided_at",
    "created_at"
  ],
  "rfx_weight_categories": [
    "weight_category_id",
    "rfx_id",
    "category_name",
    "weight",
    "source",
    "created_at"
  ],
  "sourcing_cycle_history": [
    "rfx_id",
    "title",
    "category",
    "rfx_type",
    "intake_date",
    "awarded_date",
    "cycle_days",
    "stage_days",
    "awarded_value_usd",
    "savings_usd",
    "supplier_name",
    "sla_breaches"
  ],
  "supplier_diversity": [
    "supplier_id",
    "minority_owned",
    "women_owned",
    "veteran_owned",
    "small_business",
    "sustainability_certified",
    "source",
    "verified_at"
  ]
};
export const S2C_SCHEMA_VERSION = 2 as const;
