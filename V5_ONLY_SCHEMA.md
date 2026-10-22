# V5-only table definitions

### discovery_runs
| Column | Type |
|---|---|
| `run_id` | `VARCHAR(30)` |
| `rfx_id` | `VARCHAR(50)` |
| `scenario` | `VARCHAR(40)` |
| `weights_json` | `JSON` |
| `screened` | `INT` |
| `qualified` | `INT` |
| `recommended` | `INT` |
| `portfolio_score` | `DECIMAL(5,2)` |
| `confidence` | `DECIMAL(5,2)` |
| `run_by` | `VARCHAR(100)` |
| `created_at` | `TIMESTAMP` |

### invoices
| Column | Type |
|---|---|
| `invoice_id` | `VARCHAR(30)` |
| `contract_id` | `VARCHAR(50)` |
| `supplier_id` | `VARCHAR(50)` |
| `rfx_id` | `VARCHAR(50)` |
| `category` | `VARCHAR(100)` |
| `invoice_date` | `DATE` |
| `period` | `VARCHAR(7)` |
| `baseline_amount` | `DECIMAL(15,2)` |
| `contracted_amount` | `DECIMAL(15,2)` |
| `invoiced_amount` | `DECIMAL(15,2)` |
| `paid_amount` | `DECIMAL(15,2)` |
| `payment_date` | `DATE` |
| `status` | `VARCHAR(20)` |
| `on_contract` | `TINYINT(1)` |
| `leakage_type` | `VARCHAR(40)` |
| `cost_center` | `VARCHAR(20)` |

### market_signals
| Column | Type |
|---|---|
| `signal_id` | `VARCHAR(30)` |
| `signal_type` | `VARCHAR(40)` |
| `severity` | `VARCHAR(10)` |
| `category` | `VARCHAR(100)` |
| `supplier_id` | `VARCHAR(50)` |
| `contract_id` | `VARCHAR(50)` |
| `rfx_id` | `VARCHAR(50)` |
| `metric` | `VARCHAR(100)` |
| `change_pct` | `DECIMAL(6,2)` |
| `source` | `VARCHAR(100)` |
| `detected_at` | `TIMESTAMP` |
| `status` | `VARCHAR(20)` |

### negotiation_actions
| Column | Type |
|---|---|
| `action_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `negotiation_round_id` | `VARCHAR(50)` |
| `action_type` | `VARCHAR(50)` |
| `action_title` | `VARCHAR(255)` |
| `action_detail` | `TEXT` |
| `owner_type` | `VARCHAR(20)` |
| `owner_user_id` | `VARCHAR(50)` |
| `owner_persona_id` | `VARCHAR(50)` |
| `action_status` | `VARCHAR(30)` |
| `priority` | `VARCHAR(20)` |
| `due_at` | `TIMESTAMP` |
| `completed_at` | `TIMESTAMP` |
| `source_recommendation_id` | `VARCHAR(50)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### negotiation_batna_scenarios
| Column | Type |
|---|---|
| `batna_scenario_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `scenario_type` | `VARCHAR(50)` |
| `supplier_id` | `VARCHAR(50)` |
| `scenario_title` | `VARCHAR(255)` |
| `description` | `TEXT` |
| `feasibility_level` | `VARCHAR(30)` |
| `annual_cost` | `DECIMAL(15,2)` |
| `currency_code` | `VARCHAR(3)` |
| `implementation_days` | `INT` |
| `pros_json` | `JSON` |
| `cons_json` | `JSON` |
| `recommendation_score` | `DECIMAL(5,2)` |
| `evidence_json` | `JSON` |
| `model_version` | `VARCHAR(100)` |
| `review_status` | `VARCHAR(30)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### negotiation_case_tactics
| Column | Type |
|---|---|
| `case_tactic_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `tactic_id` | `VARCHAR(50)` |
| `recommendation_status` | `VARCHAR(30)` |
| `recommendation_rationale` | `TEXT` |
| `evidence_json` | `JSON` |
| `confidence_score` | `DECIMAL(5,2)` |
| `requires_hitl` | `TINYINT(1)` |
| `approved_by` | `VARCHAR(100)` |
| `approved_at` | `TIMESTAMP` |
| `created_at` | `TIMESTAMP` |

### negotiation_cases
| Column | Type |
|---|---|
| `negotiation_case_id` | `VARCHAR(50)` |
| `rfx_id` | `VARCHAR(50)` |
| `supplier_id` | `VARCHAR(50)` |
| `insight_id` | `VARCHAR(50)` |
| `decision_id` | `VARCHAR(50)` |
| `case_status` | `VARCHAR(50)` |
| `strategy_version` | `INT` |
| `currency_code` | `VARCHAR(3)` |
| `opening_offer_amount` | `DECIMAL(15,2)` |
| `target_price` | `DECIMAL(15,2)` |
| `walk_away_price` | `DECIMAL(15,2)` |
| `case_owner_user_id` | `VARCHAR(50)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |
| `closed_at` | `TIMESTAMP` |

### negotiation_concessions
| Column | Type |
|---|---|
| `concession_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `negotiation_round_id` | `VARCHAR(50)` |
| `concession_name` | `VARCHAR(255)` |
| `concession_category` | `VARCHAR(50)` |
| `our_ask_text` | `TEXT` |
| `supplier_offer_text` | `TEXT` |
| `our_value_amount` | `DECIMAL(15,2)` |
| `supplier_value_amount` | `DECIMAL(15,2)` |
| `currency_code` | `VARCHAR(3)` |
| `value_basis` | `VARCHAR(50)` |
| `impact_level` | `VARCHAR(20)` |
| `concession_status` | `VARCHAR(30)` |
| `notes` | `TEXT` |
| `source_offer_id` | `VARCHAR(50)` |
| `created_by` | `VARCHAR(100)` |
| `approved_by` | `VARCHAR(100)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### negotiation_decisions
| Column | Type |
|---|---|
| `decision_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `negotiation_round_id` | `VARCHAR(50)` |
| `decision_type` | `VARCHAR(50)` |
| `decision_rationale` | `TEXT` |
| `approved_by_user_id` | `VARCHAR(50)` |
| `approved_at` | `TIMESTAMP` |

### negotiation_market_benchmarks
| Column | Type |
|---|---|
| `benchmark_id` | `VARCHAR(50)` |
| `rfx_id` | `VARCHAR(50)` |
| `rfx_category` | `VARCHAR(50)` |
| `benchmark_scope` | `VARCHAR(100)` |
| `range_low_amount` | `DECIMAL(15,2)` |
| `range_high_amount` | `DECIMAL(15,2)` |
| `median_amount` | `DECIMAL(15,2)` |
| `currency_code` | `VARCHAR(3)` |
| `term_months` | `INT` |
| `source_type` | `VARCHAR(50)` |
| `source_reference` | `VARCHAR(1024)` |
| `methodology_version` | `VARCHAR(50)` |
| `confidence_score` | `DECIMAL(5,2)` |
| `valid_from` | `DATE` |
| `valid_to` | `DATE` |
| `created_at` | `TIMESTAMP` |

### negotiation_message_events
| Column | Type |
|---|---|
| `message_event_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `negotiation_round_id` | `VARCHAR(50)` |
| `direction` | `VARCHAR(20)` |
| `channel` | `VARCHAR(30)` |
| `message_type` | `VARCHAR(50)` |
| `subject` | `VARCHAR(255)` |
| `safe_summary` | `TEXT` |
| `source_document_id` | `BIGINT` |
| `source_offer_id` | `VARCHAR(50)` |
| `sent_by_actor_type` | `VARCHAR(20)` |
| `sent_by_actor_id` | `VARCHAR(100)` |
| `delivery_status` | `VARCHAR(30)` |
| `sent_at` | `TIMESTAMP` |
| `received_at` | `TIMESTAMP` |
| `created_at` | `TIMESTAMP` |

### negotiation_offer_lines
| Column | Type |
|---|---|
| `offer_line_id` | `VARCHAR(50)` |
| `offer_id` | `VARCHAR(50)` |
| `rfq_line_item_id` | `INT` |
| `offered_unit_price` | `DECIMAL(15,4)` |
| `offered_quantity` | `DECIMAL(15,2)` |
| `offered_lead_time_days` | `INT` |
| `target_unit_price` | `DECIMAL(15,4)` |
| `currency_code` | `VARCHAR(3)` |
| `created_at` | `TIMESTAMP` |

### negotiation_offers
| Column | Type |
|---|---|
| `offer_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `negotiation_round_id` | `VARCHAR(50)` |
| `offer_party` | `VARCHAR(20)` |
| `offer_type` | `VARCHAR(30)` |
| `total_amount` | `DECIMAL(15,2)` |
| `currency_code` | `VARCHAR(3)` |
| `pricing_basis` | `VARCHAR(50)` |
| `term_months` | `INT` |
| `offer_summary` | `TEXT` |
| `source_bid_id` | `BIGINT` |
| `source_response_id` | `INT` |
| `offer_status` | `VARCHAR(30)` |
| `received_at` | `TIMESTAMP` |
| `submitted_at` | `TIMESTAMP` |
| `created_by` | `VARCHAR(100)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### negotiation_playbook_tactics
| Column | Type |
|---|---|
| `tactic_id` | `VARCHAR(50)` |
| `tactic_name` | `VARCHAR(255)` |
| `tactic_phase` | `VARCHAR(50)` |
| `risk_level` | `VARCHAR(20)` |
| `description` | `TEXT` |
| `when_to_use` | `TEXT` |
| `expected_outcome` | `TEXT` |
| `prohibited_conditions_json` | `JSON` |
| `policy_version` | `VARCHAR(50)` |
| `is_active` | `TINYINT(1)` |
| `owner_persona_id` | `VARCHAR(50)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### negotiation_rounds
| Column | Type |
|---|---|
| `negotiation_round_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `round_number` | `INT` |
| `round_type` | `VARCHAR(50)` |
| `round_status` | `VARCHAR(50)` |
| `strategy_label` | `VARCHAR(100)` |
| `next_step_code` | `VARCHAR(100)` |
| `opened_at` | `TIMESTAMP` |
| `response_due_at` | `TIMESTAMP` |
| `closed_at` | `TIMESTAMP` |
| `created_by` | `VARCHAR(100)` |
| `approved_by` | `VARCHAR(100)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### negotiation_strategy_assessments
| Column | Type |
|---|---|
| `strategy_assessment_id` | `VARCHAR(50)` |
| `negotiation_case_id` | `VARCHAR(50)` |
| `assessment_dimension` | `VARCHAR(80)` |
| `assessment_version` | `INT` |
| `our_position` | `VARCHAR(30)` |
| `supplier_position` | `VARCHAR(30)` |
| `leverage_score` | `DECIMAL(5,2)` |
| `insight_text` | `TEXT` |
| `evidence_json` | `JSON` |
| `recommendation_text` | `TEXT` |
| `model_version` | `VARCHAR(100)` |
| `confidence_score` | `DECIMAL(5,2)` |
| `review_status` | `VARCHAR(30)` |
| `reviewed_by` | `VARCHAR(100)` |
| `reviewed_at` | `TIMESTAMP` |
| `created_at` | `TIMESTAMP` |

### resourcing_recommendations
| Column | Type |
|---|---|
| `rec_id` | `VARCHAR(30)` |
| `signal_id` | `VARCHAR(30)` |
| `rfx_id` | `VARCHAR(50)` |
| `contract_id` | `VARCHAR(50)` |
| `supplier_id` | `VARCHAR(50)` |
| `action` | `VARCHAR(30)` |
| `rationale` | `TEXT` |
| `est_impact_usd` | `DECIMAL(15,2)` |
| `confidence` | `DECIMAL(5,2)` |
| `alternative_supplier_id` | `VARCHAR(50)` |
| `status` | `VARCHAR(20)` |
| `decided_by` | `VARCHAR(100)` |
| `decided_at` | `TIMESTAMP` |
| `created_at` | `TIMESTAMP` |

### rfx_weight_categories
| Column | Type |
|---|---|
| `weight_category_id` | `VARCHAR(30)` |
| `rfx_id` | `VARCHAR(50)` |
| `category_name` | `VARCHAR(100)` |
| `weight` | `DECIMAL(5,2)` |
| `source` | `VARCHAR(20)` |
| `created_at` | `TIMESTAMP` |

### sap_user_master
| Column | Type |
|---|---|
| `MANDT` | `CLNT(3)` |
| `BNAME` | `CHAR(12)` |
| `SMTP_ADDR` | `CHAR(241)` |
| `NAME_FIRST` | `CHAR(40)` |
| `NAME_LAST` | `CHAR(40)` |
| `PERSNO` | `NUMC(8)` |
| `ORGEH` | `CHAR(60)` |
| `KOSTL` | `CHAR(10)` |
| `BUKRS` | `CHAR(4)` |
| `WERKS` | `CHAR(4)` |
| `PLANS` | `CHAR(60)` |
| `MANAGER_BNAME` | `CHAR(12)` |
| `PLATFORM_ROLE` | `VARCHAR(30)` |
| `USTYP` | `CHAR(1)` |
| `GLTGB` | `DATS(8)` |
| `UFLAG` | `INT1` |
| `TRDAT` | `DATS(8)` |
| `ERDAT` | `DATS(8)` |

### sourcing_cycle_history
| Column | Type |
|---|---|
| `rfx_id` | `VARCHAR(50)` |
| `title` | `VARCHAR(200)` |
| `category` | `VARCHAR(100)` |
| `rfx_type` | `VARCHAR(10)` |
| `intake_date` | `DATE` |
| `awarded_date` | `DATE` |
| `cycle_days` | `INT` |
| `stage_days` | `JSON` |
| `awarded_value_usd` | `DECIMAL(15,2)` |
| `savings_usd` | `DECIMAL(15,2)` |
| `supplier_name` | `VARCHAR(200)` |
| `sla_breaches` | `INT` |

### supplier_diversity
| Column | Type |
|---|---|
| `supplier_id` | `VARCHAR(50)` |
| `minority_owned` | `TINYINT(1)` |
| `women_owned` | `TINYINT(1)` |
| `veteran_owned` | `TINYINT(1)` |
| `small_business` | `TINYINT(1)` |
| `sustainability_certified` | `TINYINT(1)` |
| `source` | `VARCHAR(30)` |
| `verified_at` | `DATE` |
