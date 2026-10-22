-- S2C governed MySQL/TiDB schema contract v1
-- 79 tables / expanded V5 contract, preserving existing artifact names and columns.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `agent_approval_routing_rules`;
DROP TABLE IF EXISTS `agent_assignment_evaluations`;
DROP TABLE IF EXISTS `agent_evaluations`;
DROP TABLE IF EXISTS `approver_availability_matrix`;
DROP TABLE IF EXISTS `bid_attachments`;
DROP TABLE IF EXISTS `bid_exceptions`;
DROP TABLE IF EXISTS `bid_line_items`;
DROP TABLE IF EXISTS `bid_responses`;
DROP TABLE IF EXISTS `compliance`;
DROP TABLE IF EXISTS `contract_approvals`;
DROP TABLE IF EXISTS `contract_documents`;
DROP TABLE IF EXISTS `contract_intake_requests`;
DROP TABLE IF EXISTS `contract_risk_assessment`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `human_in_loop_controls`;
DROP TABLE IF EXISTS `intake_commercials_timelines`;
DROP TABLE IF EXISTS `intake_documents`;
DROP TABLE IF EXISTS `intake_evaluation_weights`;
DROP TABLE IF EXISTS `intake_requests`;
DROP TABLE IF EXISTS `intake_scope_specs`;
DROP TABLE IF EXISTS `intake_strategy_governance`;
DROP TABLE IF EXISTS `negotiation_finalization`;
DROP TABLE IF EXISTS `negotiation_insights`;
DROP TABLE IF EXISTS `personas_master`;
DROP TABLE IF EXISTS `rfx_approvals`;
DROP TABLE IF EXISTS `rfx_assigned_approvers`;
DROP TABLE IF EXISTS `rfx_category`;
DROP TABLE IF EXISTS `rfx_documents`;
DROP TABLE IF EXISTS `rfx_draft_versions`;
DROP TABLE IF EXISTS `rfx_events`;
DROP TABLE IF EXISTS `rfx_question_responses`;
DROP TABLE IF EXISTS `rfx_questions`;
DROP TABLE IF EXISTS `rfx_requirements`;
DROP TABLE IF EXISTS `rfx_response`;
DROP TABLE IF EXISTS `rfx_response_answers`;
DROP TABLE IF EXISTS `rfx_weight_configs`;
DROP TABLE IF EXISTS `supplier`;
DROP TABLE IF EXISTS `supplier_agent_memory`;
DROP TABLE IF EXISTS `supplier_classification`;
DROP TABLE IF EXISTS `supplier_documents`;
DROP TABLE IF EXISTS `supplier_esg_compliance`;
DROP TABLE IF EXISTS `supplier_external_enrichment`;
DROP TABLE IF EXISTS `supplier_improvement_plans`;
DROP TABLE IF EXISTS `supplier_kpi_metrics`;
DROP TABLE IF EXISTS `supplier_product_profiles`;
DROP TABLE IF EXISTS `supplier_qbr_reviews`;
DROP TABLE IF EXISTS `supplier_risk_profile`;
DROP TABLE IF EXISTS `supplier_scorecards`;
DROP TABLE IF EXISTS `supplier_selection_decisions`;
DROP TABLE IF EXISTS `supplier_services_profiles`;
DROP TABLE IF EXISTS `supplier_shortlisting`;
DROP TABLE IF EXISTS `supplier_software_profiles`;
DROP TABLE IF EXISTS `platform_roles`;
DROP TABLE IF EXISTS `role_module_access`;
DROP TABLE IF EXISTS `enterprise_user_master`;
DROP TABLE IF EXISTS `intake_approvals`;
DROP TABLE IF EXISTS `approval_workflows`;
DROP TABLE IF EXISTS `workflow_steps`;
DROP TABLE IF EXISTS `vendor_master`;
DROP TABLE IF EXISTS `discovery_runs`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `market_signals`;
DROP TABLE IF EXISTS `negotiation_actions`;
DROP TABLE IF EXISTS `negotiation_batna_scenarios`;
DROP TABLE IF EXISTS `negotiation_case_tactics`;
DROP TABLE IF EXISTS `negotiation_cases`;
DROP TABLE IF EXISTS `negotiation_concessions`;
DROP TABLE IF EXISTS `negotiation_decisions`;
DROP TABLE IF EXISTS `negotiation_market_benchmarks`;
DROP TABLE IF EXISTS `negotiation_message_events`;
DROP TABLE IF EXISTS `negotiation_offer_lines`;
DROP TABLE IF EXISTS `negotiation_offers`;
DROP TABLE IF EXISTS `negotiation_playbook_tactics`;
DROP TABLE IF EXISTS `negotiation_rounds`;
DROP TABLE IF EXISTS `negotiation_strategy_assessments`;
DROP TABLE IF EXISTS `resourcing_recommendations`;
DROP TABLE IF EXISTS `rfx_weight_categories`;
DROP TABLE IF EXISTS `sourcing_cycle_history`;
DROP TABLE IF EXISTS `supplier_diversity`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `agent_approval_routing_rules` (
  `rule_id` VARCHAR(50) NOT NULL,
  `process_stage` VARCHAR(100) NOT NULL,
  `persona_id` VARCHAR(50) NOT NULL,
  `min_value_threshold` DECIMAL(15,2) NOT NULL,
  `max_value_threshold` DECIMAL(15,2) NOT NULL,
  `risk_level_criteria` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`rule_id`),
  INDEX `idx_agent_approval_routing_rules_persona_id` (`persona_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `agent_assignment_evaluations` (
  `evaluation_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `agent_model_version` VARCHAR(50) NOT NULL,
  `evaluation_rationale` TEXT NOT NULL,
  `confidence_score` DECIMAL(5,2) NOT NULL,
  `evaluation_status` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`evaluation_id`),
  INDEX `idx_agent_assignment_evaluations_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `agent_evaluations` (
  `evaluation_id` INT NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `commercial_score` DECIMAL(5,2) NOT NULL,
  `operational_score` DECIMAL(5,2) NOT NULL,
  `risk_score` DECIMAL(5,2) NOT NULL,
  `esg_score` DECIMAL(5,2) NOT NULL,
  `total_weighted_score` DECIMAL(5,2) NOT NULL,
  `agent_rank` INT NOT NULL,
  `agent_rationale` TEXT NOT NULL,
  `evaluated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`evaluation_id`),
  INDEX `idx_agent_evaluations_evaluation_id` (`evaluation_id`),
  INDEX `idx_agent_evaluations_rfx_id` (`rfx_id`),
  INDEX `idx_agent_evaluations_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `approver_availability_matrix` (
  `user_id` VARCHAR(50) NOT NULL,
  `persona_id` VARCHAR(50) NOT NULL,
  `user_email` VARCHAR(100) NOT NULL,
  `category_expertise` JSON NOT NULL,
  `current_active_assignments` INT NOT NULL,
  `is_available` TINYINT(1) NOT NULL,
  `delegated_user_id` VARCHAR(50) NULL,
  PRIMARY KEY (`user_id`),
  INDEX `idx_approver_availability_matrix_persona_id` (`persona_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `bid_attachments` (
  `bid_id` BIGINT NOT NULL,
  `document_id` BIGINT NOT NULL,
  `classification` ENUM('TECHNICAL_PROPOSAL','COMMERCIAL_PROPOSAL','LEGAL','OTHER') NOT NULL,
  `ocr_confidence` DECIMAL(5,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`bid_id`, `document_id`),
  INDEX `idx_bid_attachments_bid_id` (`bid_id`),
  INDEX `idx_bid_attachments_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `bid_exceptions` (
  `bid_exceptions_id` BIGINT NOT NULL,
  `bid_id` BIGINT NOT NULL,
  `exception_type` ENUM('MISSING_FIELD','CURRENCY_MISMATCH','UOM_MISMATCH','INVALID_VALUE','DUPLICATE','OTHER') NOT NULL,
  `field_name` VARCHAR(100) NOT NULL,
  `raw_value` TEXT NOT NULL,
  `severity` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  `resolution_status` ENUM('OPEN','IN_REVIEW','RESOLVED','WAIVED') NOT NULL,
  `resolved_by` VARCHAR(256) NULL,
  `resolved_at` TIMESTAMP NULL,
  PRIMARY KEY (`bid_exceptions_id`),
  INDEX `idx_bid_exceptions_bid_id` (`bid_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `bid_line_items` (
  `biditem_id` BIGINT NOT NULL,
  `bid_id` BIGINT NOT NULL,
  `question_id` VARCHAR(50) NULL,
  `item_code` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `raw_quantity` VARCHAR(50) NOT NULL,
  `normalized_quantity` DECIMAL(15,2) NOT NULL,
  `raw_uom` VARCHAR(20) NOT NULL,
  `normalized_uom` VARCHAR(20) NOT NULL,
  `raw_unit_price` VARCHAR(50) NOT NULL,
  `normalized_unit_price` DECIMAL(15,4) NOT NULL,
  `raw_currency` VARCHAR(10) NOT NULL,
  `normalized_currency` VARCHAR(3) NOT NULL,
  `exchange_rate` DECIMAL(10,6) NOT NULL,
  `extended_price_normalized` DECIMAL(15,2) NOT NULL,
  `lead_time_days` INT NOT NULL,
  `compliance_flag` TINYINT(1) NOT NULL,
  PRIMARY KEY (`biditem_id`),
  INDEX `idx_bid_line_items_bid_id` (`bid_id`),
  INDEX `idx_bid_line_items_question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `bid_responses` (
  `bid_id` BIGINT NOT NULL,
  `external_bid_uuid` VARCHAR(36) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `submission_date` TIMESTAMP NOT NULL,
  `source_channel` ENUM('PORTAL','EMAIL','API','MANUAL') NOT NULL,
  `version_number` INT NOT NULL,
  `status` ENUM('RECEIVED','NORMALIZED','EXCEPTION_REVIEW','REJECTED') NOT NULL,
  `confidence_score` DECIMAL(5,2) NOT NULL,
  `raw_payload` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`bid_id`),
  INDEX `idx_bid_responses_rfx_id` (`rfx_id`),
  INDEX `idx_bid_responses_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `compliance` (
  `compliance_id` INT NOT NULL,
  `compliance_name` VARCHAR(100) NOT NULL,
  `geography` VARCHAR(50) NOT NULL,
  `procurement_type` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  `clause_text` TEXT NOT NULL,
  `is_mandatory` TINYINT(1) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `effective_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`compliance_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `contract_approvals` (
  `approval_id` VARCHAR(50) NOT NULL,
  `contract_id` VARCHAR(50) NOT NULL,
  `approver_role` VARCHAR(50) NOT NULL,
  `approver_name` VARCHAR(100) NOT NULL,
  `approval_status` VARCHAR(50) NOT NULL,
  `comments` TEXT NULL,
  `approval_sequence` INT NOT NULL,
  `approved_at` TIMESTAMP NULL,
  PRIMARY KEY (`approval_id`),
  INDEX `idx_contract_approvals_contract_id` (`contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `contract_documents` (
  `contract_id` VARCHAR(50) NOT NULL,
  `document_id` BIGINT NOT NULL,
  `visibility` ENUM('INTERNAL','SUPPLIER','RESTRICTED') NOT NULL,
  `classification` ENUM('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED') NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`contract_id`, `document_id`),
  INDEX `idx_contract_documents_contract_id` (`contract_id`),
  INDEX `idx_contract_documents_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `contract_intake_requests` (
  `contract_id` VARCHAR(50) NOT NULL,
  `linked_rfx` VARCHAR(50) NOT NULL,
  `contract_type` VARCHAR(50) NOT NULL,
  `contract_value` DECIMAL(15,2) NOT NULL,
  `risk_level` VARCHAR(50) NOT NULL,
  `business_owner` VARCHAR(100) NOT NULL,
  `intake_status` VARCHAR(50) NOT NULL,
  `validated_by` VARCHAR(100) NOT NULL,
  `validated_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`contract_id`),
  INDEX `idx_contract_intake_requests_linked_rfx` (`linked_rfx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `contract_risk_assessment` (
  `risk_id` VARCHAR(50) NOT NULL,
  `contract_id` VARCHAR(50) NOT NULL,
  `risk_score` DECIMAL(5,2) NOT NULL,
  `compliance_flags` JSON NOT NULL,
  `legal_risk_notes` TEXT NOT NULL,
  `mitigation_plan` TEXT NOT NULL,
  `reviewed_by` VARCHAR(100) NOT NULL,
  `approved_flag` TINYINT(1) NOT NULL,
  `approved_by` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`risk_id`),
  INDEX `idx_contract_risk_assessment_contract_id` (`contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `documents` (
  `document_id` BIGINT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `document_type` ENUM('RFP','RFQ','REQUIREMENTS','PRICING_TEMPLATE','BID_PROPOSAL','BID_PRICING','AWARD_MEMO','CONTRACT_DRAFT','INVITATION','MSA','KYC','OTHER') NOT NULL,
  `status` ENUM('ACTIVE','ARCHIVED','SUPERSEDED','DELETED') NOT NULL,
  `file_path` VARCHAR(1024) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size_bytes` BIGINT NOT NULL,
  `created_by` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `human_in_loop_controls` (
  `hitl_id` VARCHAR(50) NOT NULL,
  `process_stage` VARCHAR(100) NOT NULL,
  `entity_table` VARCHAR(100) NOT NULL,
  `decision_type` VARCHAR(100) NOT NULL,
  `primary_persona` VARCHAR(50) NOT NULL,
  `supporting_personas` JSON NOT NULL,
  `approval_required` TINYINT(1) NOT NULL,
  `approval_flow` VARCHAR(255) NOT NULL,
  `override_allowed` TINYINT(1) NOT NULL,
  `audit_required` TINYINT(1) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`hitl_id`),
  INDEX `idx_human_in_loop_controls_primary_persona` (`primary_persona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `intake_commercials_timelines` (
  `request_id` VARCHAR(50) NOT NULL,
  `cost_center` VARCHAR(50) NOT NULL,
  `approved_budget` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `capex_opex` ENUM('CAPEX','OPEX') NOT NULL,
  `sourcing_start_date` DATE NOT NULL,
  `rfp_issue_date` DATE NULL,
  `award_date` DATE NULL,
  `service_start_date` DATE NULL,
  `linked_RFx` VARCHAR(50) NULL,
  PRIMARY KEY (`request_id`),
  INDEX `idx_intake_commercials_timelines_request_id` (`request_id`),
  INDEX `idx_intake_commercials_timelines_linked_RFx` (`linked_RFx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `intake_documents` (
  `request_id` VARCHAR(50) NOT NULL,
  `document_id` BIGINT NOT NULL,
  `visibility` ENUM('INTERNAL','SUPPLIER','RESTRICTED') NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`request_id`, `document_id`),
  INDEX `idx_intake_documents_request_id` (`request_id`),
  INDEX `idx_intake_documents_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `intake_evaluation_weights` (
  `request_id` VARCHAR(50) NOT NULL,
  `commercial_weight` DECIMAL(5,2) NOT NULL,
  `technical_weight` DECIMAL(5,2) NOT NULL,
  `compliance_weight` DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (`request_id`),
  INDEX `idx_intake_evaluation_weights_request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `intake_requests` (
  `request_id` VARCHAR(50) NOT NULL,
  `requestor_name` VARCHAR(255) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `business_unit` VARCHAR(100) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `request_type` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `procurement_type` VARCHAR(100) NOT NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  `requirement_description` TEXT NOT NULL,
  `business_outcome` TEXT NOT NULL,
  `impact_if_not_procured` TEXT NOT NULL,
  `intake_status` ENUM('DRAFT','IN_PROCESS','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED') NOT NULL,
  `linked_RFx` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`request_id`),
  INDEX `idx_intake_requests_linked_RFx` (`linked_RFx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `intake_scope_specs` (
  `request_id` VARCHAR(50) NOT NULL,
  `scope_description` TEXT NOT NULL,
  `deliverables` TEXT NOT NULL,
  `specification_type` VARCHAR(50) NOT NULL,
  `compliance_requirements` JSON NOT NULL,
  `geography_coverage` JSON NOT NULL,
  `transition_requirement` TEXT NOT NULL,
  `documentation_attachments` JSON NOT NULL,
  PRIMARY KEY (`request_id`),
  INDEX `idx_intake_scope_specs_request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `intake_strategy_governance` (
  `request_id` VARCHAR(50) NOT NULL,
  `incumbent_supplier` VARCHAR(255) NULL,
  `suggested_suppliers` JSON NOT NULL,
  `sourcing_approach` VARCHAR(50) NOT NULL,
  `expected_bidders_range` VARCHAR(50) NOT NULL,
  `contract_type` VARCHAR(100) NOT NULL,
  `duration_years` INT NOT NULL,
  `payment_terms_days` INT NOT NULL,
  `risk_category` TEXT NOT NULL,
  `data_security_notes` TEXT NOT NULL,
  `esg_requirement` TEXT NOT NULL,
  PRIMARY KEY (`request_id`),
  INDEX `idx_intake_strategy_governance_request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_finalization` (
  `finalization_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `final_price` DECIMAL(15,2) NOT NULL,
  `savings_achieved` DECIMAL(15,2) NOT NULL,
  `negotiation_summary` TEXT NOT NULL,
  `finance_approval_status` VARCHAR(50) NOT NULL,
  `procurement_approval_status` VARCHAR(50) NOT NULL,
  `approved_by` VARCHAR(100) NOT NULL,
  `approved_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`finalization_id`),
  INDEX `idx_negotiation_finalization_rfx_id` (`rfx_id`),
  INDEX `idx_negotiation_finalization_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_insights` (
  `insight_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `benchmark_price` DECIMAL(15,2) NOT NULL,
  `target_price` DECIMAL(15,2) NOT NULL,
  `walk_away_price` DECIMAL(15,2) NOT NULL,
  `ai_recommendation` TEXT NOT NULL,
  `reviewed_by` VARCHAR(100) NOT NULL,
  `approval_flag` TINYINT(1) NOT NULL,
  `approved_by` VARCHAR(100) NULL,
  `approved_at` TIMESTAMP NULL,
  PRIMARY KEY (`insight_id`),
  INDEX `idx_negotiation_insights_rfx_id` (`rfx_id`),
  INDEX `idx_negotiation_insights_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `personas_master` (
  `persona_id` VARCHAR(50) NOT NULL,
  `persona_name` VARCHAR(100) NOT NULL,
  `function_area` VARCHAR(50) NOT NULL,
  `role_description` TEXT NOT NULL,
  `decision_authority` TINYINT(1) NOT NULL,
  `approval_authority` TINYINT(1) NOT NULL,
  `typical_stages` JSON NOT NULL,
  PRIMARY KEY (`persona_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_approvals` (
  `approval_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `approver_role` VARCHAR(50) NOT NULL,
  `approver_name` VARCHAR(100) NOT NULL,
  `approval_status` VARCHAR(50) NOT NULL,
  `comments` TEXT NOT NULL,
  `approval_sequence` INT NOT NULL,
  `approved_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`approval_id`),
  INDEX `idx_rfx_approvals_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_assigned_approvers` (
  `assignment_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `approver_user_id` VARCHAR(50) NOT NULL,
  `evaluation_id` VARCHAR(50) NOT NULL,
  `approval_sequence` INT NOT NULL,
  `current_status` VARCHAR(50) NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL,
  `actioned_at` TIMESTAMP NULL,
  `comments` TEXT NULL,
  PRIMARY KEY (`assignment_id`),
  INDEX `idx_rfx_assigned_approvers_rfx_id` (`rfx_id`),
  INDEX `idx_rfx_assigned_approvers_approver_user_id` (`approver_user_id`),
  INDEX `idx_rfx_assigned_approvers_evaluation_id` (`evaluation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_category` (
  `rfx_category` VARCHAR(50) NOT NULL,
  `category_name` VARCHAR(128) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`rfx_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_documents` (
  `rfx_id` VARCHAR(50) NOT NULL,
  `document_id` BIGINT NOT NULL,
  `visibility` ENUM('INTERNAL','SUPPLIER','RESTRICTED') NOT NULL,
  `phase` ENUM('DRAFT','ISSUE','EVALUATION','AWARD','CONTRACT') NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`rfx_id`, `document_id`),
  INDEX `idx_rfx_documents_rfx_id` (`rfx_id`),
  INDEX `idx_rfx_documents_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_draft_versions` (
  `draft_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `version_number` INT NOT NULL,
  `template_id` VARCHAR(50) NOT NULL,
  `draft_content` LONGTEXT NOT NULL,
  `created_by` VARCHAR(100) NOT NULL,
  `reviewed_by` VARCHAR(100) NOT NULL,
  `approval_status` VARCHAR(50) NOT NULL,
  `approved_by` VARCHAR(100) NULL,
  `approved_at` TIMESTAMP NULL,
  PRIMARY KEY (`draft_id`),
  INDEX `idx_rfx_draft_versions_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_events` (
  `rfx_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `rfx_type` VARCHAR(45) NOT NULL,
  `rfx_category` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `issue_date` DATE NULL,
  `due_date` DATE NOT NULL,
  `closed_date` DATE NULL,
  `owner` JSON NOT NULL,
  `description` LONGTEXT NOT NULL,
  `scope` LONGTEXT NOT NULL,
  `invited_suppliers` JSON NOT NULL,
  `responses_received` INT NOT NULL,
  `key_findings` LONGTEXT NULL,
  `attachments` JSON NOT NULL,
  `budget_limit_usd` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`rfx_id`),
  INDEX `idx_rfx_events_rfx_category` (`rfx_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_question_responses` (
  `response_id` VARCHAR(50) NOT NULL,
  `question_id` VARCHAR(50) NOT NULL,
  `response_text` TEXT NOT NULL,
  `internal_notes` TEXT NULL,
  `response_status` VARCHAR(50) NOT NULL,
  `answered_by` VARCHAR(100) NOT NULL,
  `approved_by` VARCHAR(100) NOT NULL,
  `published_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`response_id`),
  INDEX `idx_rfx_question_responses_question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_questions` (
  `question_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `section_reference` VARCHAR(100) NOT NULL,
  `question_text` TEXT NOT NULL,
  `is_private` TINYINT(1) NOT NULL,
  `submission_status` VARCHAR(50) NOT NULL,
  `submitted_by` VARCHAR(100) NOT NULL,
  `submitted_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`question_id`),
  INDEX `idx_rfx_questions_rfx_id` (`rfx_id`),
  INDEX `idx_rfx_questions_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_requirements` (
  `requirement_id` INT NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `title` TEXT NOT NULL,
  `description` TEXT NOT NULL,
  `priority_level` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  `response_type` ENUM('TEXT','NUMERIC','YES_NO','CHOICE','FILE') NOT NULL,
  `choices` JSON NULL,
  `max_points_allocated` INT NOT NULL,
  `weight` DECIMAL(5,0) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`requirement_id`),
  INDEX `idx_rfx_requirements_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_response` (
  `response_id` INT NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `quoted_total_price` DECIMAL(15,2) NOT NULL,
  `quoted_delivery_days` INT NOT NULL,
  `payment_terms_offered` VARCHAR(50) NOT NULL,
  `requirement_deviations` TEXT NOT NULL,
  `extended_bid_details` JSON NOT NULL,
  `submitted_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`response_id`),
  INDEX `idx_rfx_response_rfx_id` (`rfx_id`),
  INDEX `idx_rfx_response_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_response_answers` (
  `answer_id` INT NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `requirement_id` INT NOT NULL,
  `vendor_answer_text` TEXT NOT NULL,
  `agent_calculated_score` DECIMAL(5,2) NOT NULL,
  `agent_answer_rationale` TEXT NOT NULL,
  PRIMARY KEY (`answer_id`),
  INDEX `idx_rfx_response_answers_rfx_id` (`rfx_id`),
  INDEX `idx_rfx_response_answers_supplier_id` (`supplier_id`),
  INDEX `idx_rfx_response_answers_requirement_id` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_weight_configs` (
  `rfx_id` VARCHAR(50) NOT NULL,
  `commercial_weight` DECIMAL(3,2) NOT NULL,
  `operational_weight` DECIMAL(3,2) NOT NULL,
  `risk_compliance_weight` DECIMAL(3,2) NOT NULL,
  `esg_weight` DECIMAL(3,2) NOT NULL,
  `completeness_score` DECIMAL(5,2) NOT NULL,
  `consistency_score` DECIMAL(5,2) NOT NULL,
  `complaince_score` DECIMAL(5,2) NOT NULL,
  `readability_score` DECIMAL(5,2) NOT NULL,
  `overall_quality_score` DECIMAL(5,2) NOT NULL,
  `status` VARCHAR(45) NOT NULL,
  `issues` JSON NOT NULL,
  `warnings` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`rfx_id`),
  INDEX `idx_rfx_weight_configs_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `legal_name` VARCHAR(255) NOT NULL,
  `country` VARCHAR(100) NOT NULL,
  `region` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `risk_rating` VARCHAR(50) NOT NULL,
  `esg_score` INT NULL,
  `years_on_panel` INT NOT NULL,
  `certifications` JSON NOT NULL,
  `payment_terms_baseline` VARCHAR(50) NOT NULL,
  `annual_spend_usd` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `kyc_status` ENUM('PENDING','VERIFIED','EXPIRED','REJECTED') NOT NULL,
  `kyc_verified_date` DATE NULL,
  `kyc_verified_by` VARCHAR(255) NULL,
  PRIMARY KEY (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_agent_memory` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `agent_notes_semantic` TEXT NOT NULL,
  `last_updated_by_agent` TIMESTAMP NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_agent_memory_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_classification` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `strategic_flag` TINYINT(1) NOT NULL,
  `preferred_supplier_flag` TINYINT(1) NOT NULL,
  `risk_flag` TINYINT(1) NOT NULL,
  `classification_approved_by` VARCHAR(100) NOT NULL,
  `classification_date` TIMESTAMP NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_classification_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_documents` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `document_id` BIGINT NOT NULL,
  `visibility` ENUM('INTERNAL','SUPPLIER','RESTRICTED') NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`supplier_id`, `document_id`),
  INDEX `idx_supplier_documents_supplier_id` (`supplier_id`),
  INDEX `idx_supplier_documents_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_esg_compliance` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `ecovadis_overall_score` INT NOT NULL,
  `ecovadis_environmental` INT NOT NULL,
  `ecovadis_social` INT NOT NULL,
  `ecovadis_governance` INT NOT NULL,
  `sanctions_flag` TINYINT(1) NOT NULL,
  `regulatory_violations` INT NOT NULL,
  `last_updated` TIMESTAMP NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_esg_compliance_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_external_enrichment` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `db_credit_score` INT NOT NULL,
  `db_financial_risk_rating` VARCHAR(20) NOT NULL,
  `db_annual_revenue` DECIMAL(15,2) NOT NULL,
  `db_employee_count` INT NOT NULL,
  `ariba_performance_rating` DECIMAL(3,2) NOT NULL,
  `hidden_col_1` JSON NULL,
  `hidden_col_2` JSON NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_external_enrichment_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_improvement_plans` (
  `plan_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `issue_identified` TEXT NOT NULL,
  `corrective_action` TEXT NOT NULL,
  `target_date` DATE NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `owner` VARCHAR(100) NOT NULL,
  `reviewed_by` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`plan_id`),
  INDEX `idx_supplier_improvement_plans_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_kpi_metrics` (
  `kpi_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `kpi_name` VARCHAR(100) NOT NULL,
  `target_value` DECIMAL(10,2) NOT NULL,
  `actual_value` DECIMAL(10,2) NOT NULL,
  `variance` DECIMAL(10,2) NOT NULL,
  `weight` DECIMAL(5,2) NOT NULL,
  `calculated_score` DECIMAL(5,2) NOT NULL,
  `reviewed_by` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`kpi_id`),
  INDEX `idx_supplier_kpi_metrics_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_product_profiles` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `categories` JSON NOT NULL,
  `moq_units` INT NOT NULL,
  `moq_uom` VARCHAR(20) NOT NULL,
  `current_capacity_available_pct` DECIMAL(5,2) NOT NULL,
  `avg_lead_time_days` INT NOT NULL,
  `on_time_delivery_pct` DECIMAL(5,2) NOT NULL,
  `defect_rate_pct` DECIMAL(5,2) NOT NULL,
  `preferred_incoterms` VARCHAR(10) NOT NULL,
  `shipping_origin_ports` JSON NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_product_profiles_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_qbr_reviews` (
  `qbr_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `review_period` VARCHAR(50) NOT NULL,
  `performance_summary` TEXT NOT NULL,
  `action_items` TEXT NOT NULL,
  `business_feedback` TEXT NOT NULL,
  `approved_by` VARCHAR(100) NOT NULL,
  `approved_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`qbr_id`),
  INDEX `idx_supplier_qbr_reviews_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_risk_profile` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `interos_geopolitical_risk` DECIMAL(5,2) NOT NULL,
  `interos_supply_chain_risk` DECIMAL(5,2) NOT NULL,
  `resilinc_disruption_risk` DECIMAL(5,2) NOT NULL,
  `resilinc_operational_resilience` DECIMAL(5,2) NOT NULL,
  `last_updated` TIMESTAMP NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_risk_profile_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_scorecards` (
  `scorecard_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `evaluation_period` VARCHAR(50) NOT NULL,
  `overall_score` DECIMAL(5,2) NOT NULL,
  `performance_status` VARCHAR(50) NOT NULL,
  `approved_by` VARCHAR(100) NOT NULL,
  `approved_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`scorecard_id`),
  INDEX `idx_supplier_scorecards_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_selection_decisions` (
  `decision_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `shortlisted_suppliers` JSON NOT NULL,
  `final_selected_supplier` VARCHAR(50) NOT NULL,
  `selection_rationale` TEXT NOT NULL,
  `agent_recommendation_score` DECIMAL(5,2) NOT NULL,
  `manual_override_flag` TINYINT(1) NOT NULL,
  `business_approval_status` VARCHAR(50) NOT NULL,
  `procurement_approval_status` VARCHAR(50) NOT NULL,
  `final_approval_by` VARCHAR(100) NOT NULL,
  `approval_timestamp` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`decision_id`),
  INDEX `idx_supplier_selection_decisions_rfx_id` (`rfx_id`),
  INDEX `idx_supplier_selection_decisions_final_selected_supplier` (`final_selected_supplier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_services_profiles` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `engagement_models` JSON NOT NULL,
  `delivery_locations` JSON NOT NULL,
  `primary_resource_stack` JSON NOT NULL,
  `average_resource_rate_usd` DECIMAL(10,2) NOT NULL,
  `subcontracting_allowed` TINYINT(1) NOT NULL,
  `bench_strength_count` INT NOT NULL,
  `client_csat_score` DECIMAL(3,1) NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_services_profiles_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_shortlisting` (
  `shortlist_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `agent_score` DECIMAL(5,2) NOT NULL,
  `shortlist_flag` TINYINT(1) NOT NULL,
  `manual_override_flag` TINYINT(1) NOT NULL,
  `override_reason` TEXT NULL,
  `validated_by` VARCHAR(100) NOT NULL,
  `validated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`shortlist_id`),
  INDEX `idx_supplier_shortlisting_rfx_id` (`rfx_id`),
  INDEX `idx_supplier_shortlisting_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_software_profiles` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `hosting_models` JSON NOT NULL,
  `data_security_compliance` JSON NOT NULL,
  `supported_integrations` JSON NOT NULL,
  `sla_availability_commitment` DECIMAL(5,2) NOT NULL,
  `disaster_recovery_rto_hours` INT NOT NULL,
  `vulnerability_scanned_status` VARCHAR(100) NOT NULL,
  `license_models_supported` JSON NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_software_profiles_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `platform_roles` (
  `role_id` VARCHAR(30) NOT NULL,
  `role_name` VARCHAR(100) NOT NULL,
  `color_hex` VARCHAR(7) NOT NULL,
  `description` TEXT NOT NULL,
  `is_system_role` TINYINT(1) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `role_module_access` (
  `role_id` VARCHAR(30) NOT NULL,
  `module_id` VARCHAR(50) NOT NULL,
  `access_level` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`role_id`, `module_id`),
  INDEX `idx_role_module_access_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `enterprise_user_master` (
  `MANDT` CHAR(3) NOT NULL,
  `BNAME` VARCHAR(30) NOT NULL,
  `SMTP_ADDR` CHAR(241) NOT NULL,
  `NAME_FIRST` CHAR(40) NOT NULL,
  `NAME_LAST` CHAR(40) NOT NULL,
  `PERSNO` CHAR(8) NOT NULL,
  `ORGEH` CHAR(60) NOT NULL,
  `KOSTL` CHAR(10) NOT NULL,
  `BUKRS` CHAR(4) NOT NULL,
  `WERKS` CHAR(4) NOT NULL,
  `PLANS` CHAR(60) NOT NULL,
  `MANAGER_BNAME` VARCHAR(30) NULL,
  `PLATFORM_ROLE` VARCHAR(30) NOT NULL,
  `USTYP` CHAR(1) NOT NULL,
  `GLTGB` VARCHAR(10) NOT NULL,
  `UFLAG` TINYINT UNSIGNED NOT NULL,
  `TRDAT` VARCHAR(10) NOT NULL,
  `ERDAT` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`BNAME`),
  INDEX `idx_enterprise_user_master_PLATFORM_ROLE` (`PLATFORM_ROLE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `intake_approvals` (
  `approval_id` VARCHAR(50) NOT NULL,
  `request_id` VARCHAR(50) NOT NULL,
  `approval_sequence` INT NOT NULL,
  `approver_role` VARCHAR(50) NOT NULL,
  `role_id` VARCHAR(30) NOT NULL,
  `approver_bname` VARCHAR(30) NOT NULL,
  `approval_status` VARCHAR(20) NOT NULL,
  `comments` TEXT NULL,
  `approved_at` TIMESTAMP NULL,
  PRIMARY KEY (`approval_id`),
  INDEX `idx_intake_approvals_request_id` (`request_id`),
  INDEX `idx_intake_approvals_role_id` (`role_id`),
  INDEX `idx_intake_approvals_approver_bname` (`approver_bname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `approval_workflows` (
  `workflow_id` VARCHAR(30) NOT NULL,
  `workflow_type` VARCHAR(50) NOT NULL,
  `workflow_name` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `auto_escalate_days` INT NULL,
  `condition_field` VARCHAR(50) NULL,
  `condition_operator` VARCHAR(10) NULL,
  `condition_value` DECIMAL(15,2) NULL,
  `created_by` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`workflow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `workflow_steps` (
  `step_id` VARCHAR(30) NOT NULL,
  `workflow_id` VARCHAR(30) NOT NULL,
  `step_order` INT NOT NULL,
  `step_name` VARCHAR(100) NOT NULL,
  `approver_role_id` VARCHAR(30) NOT NULL,
  `approver_count` INT NOT NULL,
  `is_optional` TINYINT(1) NOT NULL,
  PRIMARY KEY (`step_id`),
  INDEX `idx_workflow_steps_workflow_id` (`workflow_id`),
  INDEX `idx_workflow_steps_approver_role_id` (`approver_role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `vendor_master` (
  `vendor_id` VARCHAR(20) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `vendor_name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `rfx_category` VARCHAR(50) NOT NULL,
  `vendor_profile` VARCHAR(200) NOT NULL,
  `region` VARCHAR(20) NOT NULL,
  `country` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NULL,
  `geography` VARCHAR(20) NOT NULL,
  `contact_name` VARCHAR(100) NULL,
  `phone_number` VARCHAR(30) NULL,
  `email` VARCHAR(150) NOT NULL,
  `annual_spend_usd` DECIMAL(15,2) NOT NULL,
  `spend_threshold` VARCHAR(20) NOT NULL,
  `esg_score` DECIMAL(5,2) NULL,
  `financial_score` DECIMAL(5,2) NULL,
  `risk_score` DECIMAL(5,2) NULL,
  `compliance_score` DECIMAL(5,2) NULL,
  `composite_score` DECIMAL(5,2) NULL,
  `source_file` VARCHAR(100) NOT NULL,
  `loaded_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`vendor_id`),
  INDEX `idx_vendor_master_supplier_id` (`supplier_id`),
  INDEX `idx_vendor_master_rfx_category` (`rfx_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `discovery_runs` (
  `run_id` VARCHAR(30) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `scenario` VARCHAR(40) NOT NULL,
  `weights_json` JSON NOT NULL,
  `screened` INT NOT NULL,
  `qualified` INT NOT NULL,
  `recommended` INT NOT NULL,
  `portfolio_score` DECIMAL(5,2) NOT NULL,
  `confidence` DECIMAL(5,2) NOT NULL,
  `run_by` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`run_id`),
  INDEX `idx_discovery_runs_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `invoices` (
  `invoice_id` VARCHAR(30) NOT NULL,
  `contract_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `period` VARCHAR(7) NOT NULL,
  `baseline_amount` DECIMAL(15,2) NOT NULL,
  `contracted_amount` DECIMAL(15,2) NOT NULL,
  `invoiced_amount` DECIMAL(15,2) NOT NULL,
  `paid_amount` DECIMAL(15,2) NULL,
  `payment_date` DATE NULL,
  `status` VARCHAR(20) NOT NULL,
  `on_contract` TINYINT(1) NOT NULL,
  `leakage_type` VARCHAR(40) NULL,
  `cost_center` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`invoice_id`),
  INDEX `idx_invoices_contract_id` (`contract_id`),
  INDEX `idx_invoices_supplier_id` (`supplier_id`),
  INDEX `idx_invoices_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `market_signals` (
  `signal_id` VARCHAR(30) NOT NULL,
  `signal_type` VARCHAR(40) NOT NULL,
  `severity` VARCHAR(10) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `supplier_id` VARCHAR(50) NULL,
  `contract_id` VARCHAR(50) NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `metric` VARCHAR(100) NOT NULL,
  `change_pct` DECIMAL(6,2) NOT NULL,
  `source` VARCHAR(100) NOT NULL,
  `detected_at` TIMESTAMP NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`signal_id`),
  INDEX `idx_market_signals_supplier_id` (`supplier_id`),
  INDEX `idx_market_signals_contract_id` (`contract_id`),
  INDEX `idx_market_signals_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_actions` (
  `action_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `negotiation_round_id` VARCHAR(50) NOT NULL,
  `action_type` VARCHAR(50) NOT NULL,
  `action_title` VARCHAR(255) NOT NULL,
  `action_detail` TEXT NOT NULL,
  `owner_type` VARCHAR(20) NOT NULL,
  `owner_user_id` VARCHAR(50) NOT NULL,
  `owner_persona_id` VARCHAR(50) NOT NULL,
  `action_status` VARCHAR(30) NOT NULL,
  `priority` VARCHAR(20) NOT NULL,
  `due_at` TIMESTAMP NOT NULL,
  `completed_at` TIMESTAMP NULL,
  `source_recommendation_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`action_id`),
  INDEX `idx_negotiation_actions_negotiation_case_id` (`negotiation_case_id`),
  INDEX `idx_negotiation_actions_negotiation_round_id` (`negotiation_round_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_batna_scenarios` (
  `batna_scenario_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `scenario_type` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `scenario_title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `feasibility_level` VARCHAR(30) NOT NULL,
  `annual_cost` DECIMAL(15,2) NOT NULL,
  `currency_code` VARCHAR(3) NOT NULL,
  `implementation_days` INT NOT NULL,
  `pros_json` JSON NOT NULL,
  `cons_json` JSON NOT NULL,
  `recommendation_score` DECIMAL(5,2) NOT NULL,
  `evidence_json` JSON NOT NULL,
  `model_version` VARCHAR(100) NOT NULL,
  `review_status` VARCHAR(30) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`batna_scenario_id`),
  INDEX `idx_negotiation_batna_scenarios_negotiation_case_id` (`negotiation_case_id`),
  INDEX `idx_negotiation_batna_scenarios_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_case_tactics` (
  `case_tactic_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `tactic_id` VARCHAR(50) NOT NULL,
  `recommendation_status` VARCHAR(30) NOT NULL,
  `recommendation_rationale` TEXT NOT NULL,
  `evidence_json` JSON NOT NULL,
  `confidence_score` DECIMAL(5,2) NOT NULL,
  `requires_hitl` TINYINT(1) NOT NULL,
  `approved_by` VARCHAR(100) NULL,
  `approved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`case_tactic_id`),
  INDEX `idx_negotiation_case_tactics_negotiation_case_id` (`negotiation_case_id`),
  INDEX `idx_negotiation_case_tactics_tactic_id` (`tactic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_cases` (
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `insight_id` VARCHAR(50) NOT NULL,
  `decision_id` VARCHAR(50) NULL,
  `case_status` VARCHAR(50) NOT NULL,
  `strategy_version` INT NOT NULL,
  `currency_code` VARCHAR(3) NOT NULL,
  `opening_offer_amount` DECIMAL(15,2) NOT NULL,
  `target_price` DECIMAL(15,2) NOT NULL,
  `walk_away_price` DECIMAL(15,2) NOT NULL,
  `case_owner_user_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  `closed_at` TIMESTAMP NULL,
  PRIMARY KEY (`negotiation_case_id`),
  INDEX `idx_negotiation_cases_rfx_id` (`rfx_id`),
  INDEX `idx_negotiation_cases_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_concessions` (
  `concession_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `negotiation_round_id` VARCHAR(50) NOT NULL,
  `concession_name` VARCHAR(255) NOT NULL,
  `concession_category` VARCHAR(50) NOT NULL,
  `our_ask_text` TEXT NOT NULL,
  `supplier_offer_text` TEXT NULL,
  `our_value_amount` DECIMAL(15,2) NOT NULL,
  `supplier_value_amount` DECIMAL(15,2) NULL,
  `currency_code` VARCHAR(3) NOT NULL,
  `value_basis` VARCHAR(50) NOT NULL,
  `impact_level` VARCHAR(20) NOT NULL,
  `concession_status` VARCHAR(30) NOT NULL,
  `notes` TEXT NOT NULL,
  `source_offer_id` VARCHAR(50) NOT NULL,
  `created_by` VARCHAR(100) NOT NULL,
  `approved_by` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`concession_id`),
  INDEX `idx_negotiation_concessions_negotiation_case_id` (`negotiation_case_id`),
  INDEX `idx_negotiation_concessions_negotiation_round_id` (`negotiation_round_id`),
  INDEX `idx_negotiation_concessions_source_offer_id` (`source_offer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_decisions` (
  `decision_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `negotiation_round_id` VARCHAR(50) NOT NULL,
  `decision_type` VARCHAR(50) NOT NULL,
  `decision_rationale` TEXT NOT NULL,
  `approved_by_user_id` VARCHAR(50) NOT NULL,
  `approved_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`decision_id`),
  INDEX `idx_negotiation_decisions_negotiation_case_id` (`negotiation_case_id`),
  INDEX `idx_negotiation_decisions_negotiation_round_id` (`negotiation_round_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_market_benchmarks` (
  `benchmark_id` VARCHAR(50) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `rfx_category` VARCHAR(50) NOT NULL,
  `benchmark_scope` VARCHAR(100) NOT NULL,
  `range_low_amount` DECIMAL(15,2) NOT NULL,
  `range_high_amount` DECIMAL(15,2) NOT NULL,
  `median_amount` DECIMAL(15,2) NOT NULL,
  `currency_code` VARCHAR(3) NOT NULL,
  `term_months` INT NOT NULL,
  `source_type` VARCHAR(50) NOT NULL,
  `source_reference` VARCHAR(1024) NOT NULL,
  `methodology_version` VARCHAR(50) NOT NULL,
  `confidence_score` DECIMAL(5,2) NOT NULL,
  `valid_from` DATE NOT NULL,
  `valid_to` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`benchmark_id`),
  INDEX `idx_negotiation_market_benchmarks_rfx_id` (`rfx_id`),
  INDEX `idx_negotiation_market_benchmarks_rfx_category` (`rfx_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_message_events` (
  `message_event_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `negotiation_round_id` VARCHAR(50) NOT NULL,
  `direction` VARCHAR(20) NOT NULL,
  `channel` VARCHAR(30) NOT NULL,
  `message_type` VARCHAR(50) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `safe_summary` TEXT NOT NULL,
  `source_document_id` BIGINT NULL,
  `source_offer_id` VARCHAR(50) NOT NULL,
  `sent_by_actor_type` VARCHAR(20) NOT NULL,
  `sent_by_actor_id` VARCHAR(100) NOT NULL,
  `delivery_status` VARCHAR(30) NOT NULL,
  `sent_at` TIMESTAMP NULL,
  `received_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`message_event_id`),
  INDEX `idx_negotiation_message_events_negotiation_case_id` (`negotiation_case_id`),
  INDEX `idx_negotiation_message_events_negotiation_round_id` (`negotiation_round_id`),
  INDEX `idx_negotiation_message_events_source_offer_id` (`source_offer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_offer_lines` (
  `offer_line_id` VARCHAR(50) NOT NULL,
  `offer_id` VARCHAR(50) NOT NULL,
  `rfq_line_item_id` INT NOT NULL,
  `offered_unit_price` DECIMAL(15,4) NOT NULL,
  `offered_quantity` DECIMAL(15,2) NOT NULL,
  `offered_lead_time_days` INT NOT NULL,
  `target_unit_price` DECIMAL(15,4) NOT NULL,
  `currency_code` VARCHAR(3) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`offer_line_id`),
  INDEX `idx_negotiation_offer_lines_offer_id` (`offer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_offers` (
  `offer_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `negotiation_round_id` VARCHAR(50) NOT NULL,
  `offer_party` VARCHAR(20) NOT NULL,
  `offer_type` VARCHAR(30) NOT NULL,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `currency_code` VARCHAR(3) NOT NULL,
  `pricing_basis` VARCHAR(50) NOT NULL,
  `term_months` INT NOT NULL,
  `offer_summary` TEXT NOT NULL,
  `source_bid_id` BIGINT NOT NULL,
  `source_response_id` INT NOT NULL,
  `offer_status` VARCHAR(30) NOT NULL,
  `received_at` TIMESTAMP NULL,
  `submitted_at` TIMESTAMP NULL,
  `created_by` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`offer_id`),
  INDEX `idx_negotiation_offers_negotiation_case_id` (`negotiation_case_id`),
  INDEX `idx_negotiation_offers_negotiation_round_id` (`negotiation_round_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_playbook_tactics` (
  `tactic_id` VARCHAR(50) NOT NULL,
  `tactic_name` VARCHAR(255) NOT NULL,
  `tactic_phase` VARCHAR(50) NOT NULL,
  `risk_level` VARCHAR(20) NOT NULL,
  `description` TEXT NOT NULL,
  `when_to_use` TEXT NOT NULL,
  `expected_outcome` TEXT NOT NULL,
  `prohibited_conditions_json` JSON NOT NULL,
  `policy_version` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `owner_persona_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`tactic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_rounds` (
  `negotiation_round_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `round_number` INT NOT NULL,
  `round_type` VARCHAR(50) NOT NULL,
  `round_status` VARCHAR(50) NOT NULL,
  `strategy_label` VARCHAR(100) NOT NULL,
  `next_step_code` VARCHAR(100) NOT NULL,
  `opened_at` TIMESTAMP NOT NULL,
  `response_due_at` TIMESTAMP NOT NULL,
  `closed_at` TIMESTAMP NULL,
  `created_by` VARCHAR(100) NOT NULL,
  `approved_by` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`negotiation_round_id`),
  INDEX `idx_negotiation_rounds_negotiation_case_id` (`negotiation_case_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `negotiation_strategy_assessments` (
  `strategy_assessment_id` VARCHAR(50) NOT NULL,
  `negotiation_case_id` VARCHAR(50) NOT NULL,
  `assessment_dimension` VARCHAR(80) NOT NULL,
  `assessment_version` INT NOT NULL,
  `our_position` VARCHAR(30) NOT NULL,
  `supplier_position` VARCHAR(30) NOT NULL,
  `leverage_score` DECIMAL(5,2) NOT NULL,
  `insight_text` TEXT NOT NULL,
  `evidence_json` JSON NOT NULL,
  `recommendation_text` TEXT NOT NULL,
  `model_version` VARCHAR(100) NOT NULL,
  `confidence_score` DECIMAL(5,2) NOT NULL,
  `review_status` VARCHAR(30) NOT NULL,
  `reviewed_by` VARCHAR(100) NULL,
  `reviewed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`strategy_assessment_id`),
  INDEX `idx_negotiation_strategy_assessments_negotiation_case_id` (`negotiation_case_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `resourcing_recommendations` (
  `rec_id` VARCHAR(30) NOT NULL,
  `signal_id` VARCHAR(30) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `contract_id` VARCHAR(50) NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `action` VARCHAR(30) NOT NULL,
  `rationale` TEXT NOT NULL,
  `est_impact_usd` DECIMAL(15,2) NOT NULL,
  `confidence` DECIMAL(5,2) NOT NULL,
  `alternative_supplier_id` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `decided_by` VARCHAR(100) NULL,
  `decided_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`rec_id`),
  INDEX `idx_resourcing_recommendations_signal_id` (`signal_id`),
  INDEX `idx_resourcing_recommendations_rfx_id` (`rfx_id`),
  INDEX `idx_resourcing_recommendations_contract_id` (`contract_id`),
  INDEX `idx_resourcing_recommendations_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `rfx_weight_categories` (
  `weight_category_id` VARCHAR(30) NOT NULL,
  `rfx_id` VARCHAR(50) NOT NULL,
  `category_name` VARCHAR(100) NOT NULL,
  `weight` DECIMAL(5,2) NOT NULL,
  `source` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`weight_category_id`),
  INDEX `idx_rfx_weight_categories_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `sourcing_cycle_history` (
  `rfx_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `rfx_type` VARCHAR(10) NOT NULL,
  `intake_date` DATE NOT NULL,
  `awarded_date` DATE NULL,
  `cycle_days` INT NOT NULL,
  `stage_days` JSON NOT NULL,
  `awarded_value_usd` DECIMAL(15,2) NULL,
  `savings_usd` DECIMAL(15,2) NULL,
  `supplier_name` VARCHAR(200) NOT NULL,
  `sla_breaches` INT NOT NULL,
  PRIMARY KEY (`rfx_id`),
  INDEX `idx_sourcing_cycle_history_rfx_id` (`rfx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

CREATE TABLE `supplier_diversity` (
  `supplier_id` VARCHAR(50) NOT NULL,
  `minority_owned` TINYINT(1) NOT NULL,
  `women_owned` TINYINT(1) NOT NULL,
  `veteran_owned` TINYINT(1) NOT NULL,
  `small_business` TINYINT(1) NOT NULL,
  `sustainability_certified` TINYINT(1) NOT NULL,
  `source` VARCHAR(30) NOT NULL,
  `verified_at` DATE NOT NULL,
  PRIMARY KEY (`supplier_id`),
  INDEX `idx_supplier_diversity_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C governed core table';

-- Constraints are applied after all tables exist to support cross-domain references.
ALTER TABLE `agent_approval_routing_rules` ADD CONSTRAINT `fk_agent_approval_routing_rules_persona_id` FOREIGN KEY (`persona_id`) REFERENCES `personas_master` (`persona_id`);
ALTER TABLE `agent_assignment_evaluations` ADD CONSTRAINT `fk_agent_assignment_evaluations_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `agent_evaluations` ADD CONSTRAINT `fk_agent_evaluations_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `agent_evaluations` ADD CONSTRAINT `fk_agent_evaluations_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `approver_availability_matrix` ADD CONSTRAINT `fk_approver_availability_matrix_persona_id` FOREIGN KEY (`persona_id`) REFERENCES `personas_master` (`persona_id`);
ALTER TABLE `bid_attachments` ADD CONSTRAINT `fk_bid_attachments_bid_id` FOREIGN KEY (`bid_id`) REFERENCES `bid_responses` (`bid_id`);
ALTER TABLE `bid_attachments` ADD CONSTRAINT `fk_bid_attachments_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`);
ALTER TABLE `bid_exceptions` ADD CONSTRAINT `fk_bid_exceptions_bid_id` FOREIGN KEY (`bid_id`) REFERENCES `bid_responses` (`bid_id`);
ALTER TABLE `bid_line_items` ADD CONSTRAINT `fk_bid_line_items_bid_id` FOREIGN KEY (`bid_id`) REFERENCES `bid_responses` (`bid_id`);
ALTER TABLE `bid_line_items` ADD CONSTRAINT `fk_bid_line_items_question_id` FOREIGN KEY (`question_id`) REFERENCES `rfx_questions` (`question_id`);
ALTER TABLE `bid_responses` ADD CONSTRAINT `fk_bid_responses_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `bid_responses` ADD CONSTRAINT `fk_bid_responses_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `contract_approvals` ADD CONSTRAINT `fk_contract_approvals_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_intake_requests` (`contract_id`);
ALTER TABLE `contract_documents` ADD CONSTRAINT `fk_contract_documents_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_intake_requests` (`contract_id`);
ALTER TABLE `contract_documents` ADD CONSTRAINT `fk_contract_documents_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`);
ALTER TABLE `contract_intake_requests` ADD CONSTRAINT `fk_contract_intake_requests_linked_rfx` FOREIGN KEY (`linked_rfx`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `contract_risk_assessment` ADD CONSTRAINT `fk_contract_risk_assessment_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_intake_requests` (`contract_id`);
ALTER TABLE `human_in_loop_controls` ADD CONSTRAINT `fk_human_in_loop_controls_primary_persona` FOREIGN KEY (`primary_persona`) REFERENCES `personas_master` (`persona_id`);
ALTER TABLE `intake_commercials_timelines` ADD CONSTRAINT `fk_intake_commercials_timelines_request_id` FOREIGN KEY (`request_id`) REFERENCES `intake_requests` (`request_id`);
ALTER TABLE `intake_commercials_timelines` ADD CONSTRAINT `fk_intake_commercials_timelines_linked_RFx` FOREIGN KEY (`linked_RFx`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `intake_documents` ADD CONSTRAINT `fk_intake_documents_request_id` FOREIGN KEY (`request_id`) REFERENCES `intake_requests` (`request_id`);
ALTER TABLE `intake_documents` ADD CONSTRAINT `fk_intake_documents_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`);
ALTER TABLE `intake_evaluation_weights` ADD CONSTRAINT `fk_intake_evaluation_weights_request_id` FOREIGN KEY (`request_id`) REFERENCES `intake_requests` (`request_id`);
ALTER TABLE `intake_requests` ADD CONSTRAINT `fk_intake_requests_linked_RFx` FOREIGN KEY (`linked_RFx`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `intake_scope_specs` ADD CONSTRAINT `fk_intake_scope_specs_request_id` FOREIGN KEY (`request_id`) REFERENCES `intake_requests` (`request_id`);
ALTER TABLE `intake_strategy_governance` ADD CONSTRAINT `fk_intake_strategy_governance_request_id` FOREIGN KEY (`request_id`) REFERENCES `intake_requests` (`request_id`);
ALTER TABLE `negotiation_finalization` ADD CONSTRAINT `fk_negotiation_finalization_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `negotiation_finalization` ADD CONSTRAINT `fk_negotiation_finalization_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `negotiation_insights` ADD CONSTRAINT `fk_negotiation_insights_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `negotiation_insights` ADD CONSTRAINT `fk_negotiation_insights_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `rfx_approvals` ADD CONSTRAINT `fk_rfx_approvals_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_assigned_approvers` ADD CONSTRAINT `fk_rfx_assigned_approvers_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_assigned_approvers` ADD CONSTRAINT `fk_rfx_assigned_approvers_approver_user_id` FOREIGN KEY (`approver_user_id`) REFERENCES `approver_availability_matrix` (`user_id`);
ALTER TABLE `rfx_assigned_approvers` ADD CONSTRAINT `fk_rfx_assigned_approvers_evaluation_id` FOREIGN KEY (`evaluation_id`) REFERENCES `agent_assignment_evaluations` (`evaluation_id`);
ALTER TABLE `rfx_documents` ADD CONSTRAINT `fk_rfx_documents_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_documents` ADD CONSTRAINT `fk_rfx_documents_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`);
ALTER TABLE `rfx_draft_versions` ADD CONSTRAINT `fk_rfx_draft_versions_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_events` ADD CONSTRAINT `fk_rfx_events_rfx_category` FOREIGN KEY (`rfx_category`) REFERENCES `rfx_category` (`rfx_category`);
ALTER TABLE `rfx_question_responses` ADD CONSTRAINT `fk_rfx_question_responses_question_id` FOREIGN KEY (`question_id`) REFERENCES `rfx_questions` (`question_id`);
ALTER TABLE `rfx_questions` ADD CONSTRAINT `fk_rfx_questions_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_questions` ADD CONSTRAINT `fk_rfx_questions_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `rfx_requirements` ADD CONSTRAINT `fk_rfx_requirements_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_response` ADD CONSTRAINT `fk_rfx_response_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_response` ADD CONSTRAINT `fk_rfx_response_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `rfx_response_answers` ADD CONSTRAINT `fk_rfx_response_answers_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `rfx_response_answers` ADD CONSTRAINT `fk_rfx_response_answers_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `rfx_response_answers` ADD CONSTRAINT `fk_rfx_response_answers_requirement_id` FOREIGN KEY (`requirement_id`) REFERENCES `rfx_requirements` (`requirement_id`);
ALTER TABLE `rfx_weight_configs` ADD CONSTRAINT `fk_rfx_weight_configs_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `supplier_agent_memory` ADD CONSTRAINT `fk_supplier_agent_memory_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_classification` ADD CONSTRAINT `fk_supplier_classification_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_documents` ADD CONSTRAINT `fk_supplier_documents_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_documents` ADD CONSTRAINT `fk_supplier_documents_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`);
ALTER TABLE `supplier_esg_compliance` ADD CONSTRAINT `fk_supplier_esg_compliance_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_external_enrichment` ADD CONSTRAINT `fk_supplier_external_enrichment_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_improvement_plans` ADD CONSTRAINT `fk_supplier_improvement_plans_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_kpi_metrics` ADD CONSTRAINT `fk_supplier_kpi_metrics_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_product_profiles` ADD CONSTRAINT `fk_supplier_product_profiles_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_qbr_reviews` ADD CONSTRAINT `fk_supplier_qbr_reviews_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_risk_profile` ADD CONSTRAINT `fk_supplier_risk_profile_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_scorecards` ADD CONSTRAINT `fk_supplier_scorecards_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_selection_decisions` ADD CONSTRAINT `fk_supplier_selection_decisions_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `supplier_selection_decisions` ADD CONSTRAINT `fk_supplier_selection_decisions_final_selected_supplier` FOREIGN KEY (`final_selected_supplier`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_services_profiles` ADD CONSTRAINT `fk_supplier_services_profiles_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_shortlisting` ADD CONSTRAINT `fk_supplier_shortlisting_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `supplier_shortlisting` ADD CONSTRAINT `fk_supplier_shortlisting_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `supplier_software_profiles` ADD CONSTRAINT `fk_supplier_software_profiles_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `role_module_access` ADD CONSTRAINT `fk_role_module_access_role_id` FOREIGN KEY (`role_id`) REFERENCES `platform_roles` (`role_id`);
ALTER TABLE `enterprise_user_master` ADD CONSTRAINT `fk_enterprise_user_master_PLATFORM_ROLE` FOREIGN KEY (`PLATFORM_ROLE`) REFERENCES `platform_roles` (`role_id`);
ALTER TABLE `intake_approvals` ADD CONSTRAINT `fk_intake_approvals_request_id` FOREIGN KEY (`request_id`) REFERENCES `intake_requests` (`request_id`);
ALTER TABLE `intake_approvals` ADD CONSTRAINT `fk_intake_approvals_role_id` FOREIGN KEY (`role_id`) REFERENCES `platform_roles` (`role_id`);
ALTER TABLE `intake_approvals` ADD CONSTRAINT `fk_intake_approvals_approver_bname` FOREIGN KEY (`approver_bname`) REFERENCES `enterprise_user_master` (`BNAME`);
ALTER TABLE `workflow_steps` ADD CONSTRAINT `fk_workflow_steps_workflow_id` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`workflow_id`);
ALTER TABLE `workflow_steps` ADD CONSTRAINT `fk_workflow_steps_approver_role_id` FOREIGN KEY (`approver_role_id`) REFERENCES `platform_roles` (`role_id`);
ALTER TABLE `vendor_master` ADD CONSTRAINT `fk_vendor_master_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `vendor_master` ADD CONSTRAINT `fk_vendor_master_rfx_category` FOREIGN KEY (`rfx_category`) REFERENCES `rfx_category` (`rfx_category`);
ALTER TABLE `discovery_runs` ADD CONSTRAINT `fk_discovery_runs_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_intake_requests` (`contract_id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `market_signals` ADD CONSTRAINT `fk_market_signals_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `market_signals` ADD CONSTRAINT `fk_market_signals_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_intake_requests` (`contract_id`);
ALTER TABLE `market_signals` ADD CONSTRAINT `fk_market_signals_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `negotiation_actions` ADD CONSTRAINT `fk_negotiation_actions_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_actions` ADD CONSTRAINT `fk_negotiation_actions_negotiation_round_id` FOREIGN KEY (`negotiation_round_id`) REFERENCES `negotiation_rounds` (`negotiation_round_id`);
ALTER TABLE `negotiation_batna_scenarios` ADD CONSTRAINT `fk_negotiation_batna_scenarios_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_batna_scenarios` ADD CONSTRAINT `fk_negotiation_batna_scenarios_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `negotiation_case_tactics` ADD CONSTRAINT `fk_negotiation_case_tactics_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_case_tactics` ADD CONSTRAINT `fk_negotiation_case_tactics_tactic_id` FOREIGN KEY (`tactic_id`) REFERENCES `negotiation_playbook_tactics` (`tactic_id`);
ALTER TABLE `negotiation_cases` ADD CONSTRAINT `fk_negotiation_cases_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `negotiation_cases` ADD CONSTRAINT `fk_negotiation_cases_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `negotiation_concessions` ADD CONSTRAINT `fk_negotiation_concessions_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_concessions` ADD CONSTRAINT `fk_negotiation_concessions_negotiation_round_id` FOREIGN KEY (`negotiation_round_id`) REFERENCES `negotiation_rounds` (`negotiation_round_id`);
ALTER TABLE `negotiation_concessions` ADD CONSTRAINT `fk_negotiation_concessions_source_offer_id` FOREIGN KEY (`source_offer_id`) REFERENCES `negotiation_offers` (`offer_id`);
ALTER TABLE `negotiation_decisions` ADD CONSTRAINT `fk_negotiation_decisions_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_decisions` ADD CONSTRAINT `fk_negotiation_decisions_negotiation_round_id` FOREIGN KEY (`negotiation_round_id`) REFERENCES `negotiation_rounds` (`negotiation_round_id`);
ALTER TABLE `negotiation_market_benchmarks` ADD CONSTRAINT `fk_negotiation_market_benchmarks_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `negotiation_market_benchmarks` ADD CONSTRAINT `fk_negotiation_market_benchmarks_rfx_category` FOREIGN KEY (`rfx_category`) REFERENCES `rfx_category` (`rfx_category`);
ALTER TABLE `negotiation_message_events` ADD CONSTRAINT `fk_negotiation_message_events_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_message_events` ADD CONSTRAINT `fk_negotiation_message_events_negotiation_round_id` FOREIGN KEY (`negotiation_round_id`) REFERENCES `negotiation_rounds` (`negotiation_round_id`);
ALTER TABLE `negotiation_message_events` ADD CONSTRAINT `fk_negotiation_message_events_source_offer_id` FOREIGN KEY (`source_offer_id`) REFERENCES `negotiation_offers` (`offer_id`);
ALTER TABLE `negotiation_offer_lines` ADD CONSTRAINT `fk_negotiation_offer_lines_offer_id` FOREIGN KEY (`offer_id`) REFERENCES `negotiation_offers` (`offer_id`);
ALTER TABLE `negotiation_offers` ADD CONSTRAINT `fk_negotiation_offers_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_offers` ADD CONSTRAINT `fk_negotiation_offers_negotiation_round_id` FOREIGN KEY (`negotiation_round_id`) REFERENCES `negotiation_rounds` (`negotiation_round_id`);
ALTER TABLE `negotiation_rounds` ADD CONSTRAINT `fk_negotiation_rounds_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `negotiation_strategy_assessments` ADD CONSTRAINT `fk_negotiation_strategy_assessments_negotiation_case_id` FOREIGN KEY (`negotiation_case_id`) REFERENCES `negotiation_cases` (`negotiation_case_id`);
ALTER TABLE `resourcing_recommendations` ADD CONSTRAINT `fk_resourcing_recommendations_signal_id` FOREIGN KEY (`signal_id`) REFERENCES `market_signals` (`signal_id`);
ALTER TABLE `resourcing_recommendations` ADD CONSTRAINT `fk_resourcing_recommendations_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `resourcing_recommendations` ADD CONSTRAINT `fk_resourcing_recommendations_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_intake_requests` (`contract_id`);
ALTER TABLE `resourcing_recommendations` ADD CONSTRAINT `fk_resourcing_recommendations_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
ALTER TABLE `rfx_weight_categories` ADD CONSTRAINT `fk_rfx_weight_categories_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `sourcing_cycle_history` ADD CONSTRAINT `fk_sourcing_cycle_history_rfx_id` FOREIGN KEY (`rfx_id`) REFERENCES `rfx_events` (`rfx_id`);
ALTER TABLE `supplier_diversity` ADD CONSTRAINT `fk_supplier_diversity_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);
