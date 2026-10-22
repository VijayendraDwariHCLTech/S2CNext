-- S2C governed MySQL/TiDB schema contract v1
-- 59 tables / 544 columns, preserving existing artifact names and columns.
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
  `document_type` ENUM('RFP','RFQ','REQUIREMENTS','PRICING_TEMPLATE','BID_PROPOSAL','BID_PRICING','AWARD_MEMO','CONTRACT_DRAFT','MSA','KYC','OTHER') NOT NULL,
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

