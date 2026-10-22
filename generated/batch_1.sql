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
  `intake_status` ENUM('DRAFT','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED') NOT NULL,
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

