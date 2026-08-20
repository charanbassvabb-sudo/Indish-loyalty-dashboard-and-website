-- Indish Loyalty — MySQL schema
-- Run this against an empty database, e.g. in MySQL Workbench:
--   CREATE DATABASE indish_loyalty;
--   USE indish_loyalty;
--   (then run this file)

CREATE TABLE IF NOT EXISTS staff (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('manager', 'staff') NOT NULL DEFAULT 'staff',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- One row per branch — each branch runs its own campaign rules. `branch` is
-- the primary key instead of the old single `id = 1` row.
CREATE TABLE IF NOT EXISTS settings (
  branch VARCHAR(10) PRIMARY KEY,
  restaurant_name VARCHAR(120) NOT NULL DEFAULT 'Indish — Fusion Food & Cocktails',
  loyalty_prefix VARCHAR(10) NOT NULL DEFAULT 'IND',
  currency VARCHAR(5) NOT NULL DEFAULT 'K',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  minimum_spend INT NOT NULL DEFAULT 500,
  campaign_duration INT NOT NULL DEFAULT 60,
  required_visits INT NOT NULL DEFAULT 6,
  reward_visit INT NOT NULL DEFAULT 6
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reward_options (
  id CHAR(36) PRIMARY KEY,
  branch VARCHAR(10) NOT NULL,
  label VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  INDEX idx_reward_options_branch (branch)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) PRIMARY KEY,
  branch VARCHAR(10) NOT NULL,
  loyalty_id VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(160) NOT NULL,
  gender VARCHAR(20) NULL,
  notes TEXT NULL,
  disabled TINYINT(1) NOT NULL DEFAULT 0,
  visit_count INT NOT NULL DEFAULT 0,
  reward_claimed TINYINT(1) NOT NULL DEFAULT 0,
  reward_type VARCHAR(120) NULL,
  campaign_start DATE NOT NULL,
  campaign_end DATE NOT NULL,
  campaign_duration INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customers_branch (branch),
  INDEX idx_customers_status (disabled, reward_claimed, campaign_end),
  INDEX idx_customers_full_name (full_name),
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_email (email)
) ENGINE=InnoDB;

-- `branch` is where the visit was physically recorded — NOT necessarily the
-- customer's own `branch` (their home/registration branch). A customer can
-- register at Lusaka and later visit Kitwe; that visit still counts toward
-- their one ongoing campaign (see addVisitFn), but is tagged KITWE here so
-- reporting attributes the revenue to the branch it actually happened at.
CREATE TABLE IF NOT EXISTS visits (
  id CHAR(36) PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  branch VARCHAR(10) NOT NULL,
  date DATETIME NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  staff_id CHAR(36) NULL,
  staff_name VARCHAR(120) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE SET NULL,
  INDEX idx_visits_customer (customer_id),
  INDEX idx_visits_branch (branch)
) ENGINE=InnoDB;
