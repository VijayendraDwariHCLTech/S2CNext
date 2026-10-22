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
  `BNAME` CHAR(12) NOT NULL,
  `SMTP_ADDR` CHAR(241) NOT NULL,
  `NAME_FIRST` CHAR(40) NOT NULL,
  `NAME_LAST` CHAR(40) NOT NULL,
  `PERSNO` CHAR(8) NOT NULL,
  `ORGEH` CHAR(60) NOT NULL,
  `KOSTL` CHAR(10) NOT NULL,
  `BUKRS` CHAR(4) NOT NULL,
  `WERKS` CHAR(4) NOT NULL,
  `PLANS` CHAR(60) NOT NULL,
  `MANAGER_BNAME` CHAR(12) NULL,
  `PLATFORM_ROLE` VARCHAR(30) NOT NULL,
  `USTYP` CHAR(1) NOT NULL,
  `GLTGB` CHAR(8) NOT NULL,
  `UFLAG` TINYINT UNSIGNED NOT NULL,
  `TRDAT` CHAR(8) NOT NULL,
  `ERDAT` CHAR(8) NOT NULL,
  PRIMARY KEY (`BNAME`),
  INDEX `idx_enterprise_user_master_PLATFORM_ROLE` (`PLATFORM_ROLE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='S2C extension table';

CREATE TABLE `intake_approvals` (
  `approval_id` VARCHAR(50) NOT NULL,
  `request_id` VARCHAR(50) NOT NULL,
  `approval_sequence` INT NOT NULL,
  `approver_role` VARCHAR(50) NOT NULL,
  `role_id` VARCHAR(30) NOT NULL,
  `approver_bname` CHAR(12) NOT NULL,
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
