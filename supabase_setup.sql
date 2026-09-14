-- =========================================================================
-- Village LabPulse - Supabase SQL Schema Setup Script
-- Copy and paste this entire script into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =========================================================================

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(16) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Branches
INSERT INTO public.branches (id, code, name, address, phone, is_active)
VALUES 
  ('branch-01', 'BR01', 'Divine Laboratory - Koottummugham, Sreekandapuram', 'Koottummugham, Sreekandapuram, Kannur, Kerala', '+91 94470 12345', true),
  ('branch-02', 'BR02', 'Divine Laboratory - Chandanakkampara, Payyavoor', 'Chandanakkampara, Payyavoor, Kannur, Kerala', '+91 94470 67890', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Patients Table (Scoped with branch_id)
CREATE TABLE IF NOT EXISTS public.patients (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'BR01-PT-20260914-1042'
  branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  branch_code VARCHAR(16) NOT NULL,
  name VARCHAR(128) NOT NULL,
  age NUMERIC(5,2) NOT NULL,
  age_unit VARCHAR(16) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  phone VARCHAR(32),
  address TEXT,
  referral_doctor VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sync_status VARCHAR(16) DEFAULT 'synced'
);

-- 3. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'BR01-ORD-20260914-1042'
  branch_id VARCHAR(64) NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  branch_code VARCHAR(16) NOT NULL,
  patient_id VARCHAR(64) NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(128) NOT NULL,
  patient_age NUMERIC(5,2) NOT NULL,
  patient_age_unit VARCHAR(16) NOT NULL,
  patient_gender VARCHAR(16) NOT NULL,
  patient_phone VARCHAR(32),
  referral_doctor VARCHAR(128),
  order_date DATE NOT NULL,
  order_time VARCHAR(32) NOT NULL,
  tests JSONB NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(16) NOT NULL DEFAULT 'unpaid',
  payment_mode VARCHAR(32) NOT NULL DEFAULT 'Cash',
  overall_status VARCHAR(32) NOT NULL DEFAULT 'registered',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sync_status VARCHAR(16) DEFAULT 'synced'
);

-- 4. High-Volume Performance Composite Indexes (Handles 200+ patients/day smoothly)
CREATE INDEX IF NOT EXISTS idx_orders_branch_date ON public.orders(branch_id, order_date);
CREATE INDEX IF NOT EXISTS idx_orders_patient_phone ON public.orders(patient_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_branch ON public.patients(branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow public read & write via anon API key (or authenticated)
CREATE POLICY "Allow public read branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow all on patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- Done! Your Supabase database is now configured for multi-branch sync.
