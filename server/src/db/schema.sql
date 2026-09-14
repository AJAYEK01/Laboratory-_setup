-- =========================================================================
-- Village LabPulse - Production PostgreSQL Central Database Schema
-- Optimized for Multi-Branch Diagnostic Operations & 70,000+ Records/Year
-- =========================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(16) UNIQUE NOT NULL, -- e.g. 'BR01', 'BR02'
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Staff Table (RBAC)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL, -- NULL = Global HQ / Owner
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'branch_manager', 'technician', 'pathologist')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Patients Table (Namespaced with branch_id)
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'BR01-PT-20260914-1042'
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  branch_code VARCHAR(16) NOT NULL,
  name VARCHAR(128) NOT NULL,
  age NUMERIC(5,2) NOT NULL,
  age_unit VARCHAR(16) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  phone VARCHAR(32),
  address TEXT,
  referral_doctor VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Test Orders & Diagnostic Results Table
CREATE TABLE IF NOT EXISTS test_orders (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'BR01-ORD-20260914-1042'
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  branch_code VARCHAR(16) NOT NULL,
  patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(128) NOT NULL,
  patient_age NUMERIC(5,2) NOT NULL,
  patient_age_unit VARCHAR(16) NOT NULL,
  patient_gender VARCHAR(16) NOT NULL,
  patient_phone VARCHAR(32),
  referral_doctor VARCHAR(128),
  order_date DATE NOT NULL,
  order_time VARCHAR(32) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(16) NOT NULL DEFAULT 'unpaid',
  payment_mode VARCHAR(32) NOT NULL DEFAULT 'Cash',
  overall_status VARCHAR(32) NOT NULL DEFAULT 'registered',
  tests_data JSONB NOT NULL, -- Full test parameters, observed findings, reference ranges
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Audit Logs Table (For medical compliance and owner tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(64),
  username VARCHAR(64),
  branch_id VARCHAR(64),
  action VARCHAR(64) NOT NULL,
  details TEXT
);

-- =========================================================================
-- High-Performance Composite Indexes (Handles 200+ patients/day smoothly)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_orders_branch_date ON test_orders(branch_id, order_date);
CREATE INDEX IF NOT EXISTS idx_orders_patient_phone ON test_orders(patient_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON test_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_branch ON patients(branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
