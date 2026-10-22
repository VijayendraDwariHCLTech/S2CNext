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

