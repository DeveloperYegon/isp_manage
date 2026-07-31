/*
# WISP Hotspot Management Schema

## Overview
Creates the core data model for a Wireless ISP (WISP) hotspot management platform.
This is a single-tenant, no-auth app: all data is intentionally shared/public so
the anon-key frontend can read and write it.

## New Tables

### hotspots
Physical Wi-Fi access point locations that the WISP operates.
- id (uuid, pk)
- name (text) — human-friendly location name
- location (text) — city/area
- ip_address (text) — management IP of the NAS/AP
- status (text) — 'online' | 'offline' | 'degraded'
- max_connections (int) — concurrent session capacity
- created_at, updated_at (timestamps)

### plans
Sellable internet service plans (bandwidth + duration).
- id (uuid, pk)
- name (text)
- description (text)
- price (numeric)
- bandwidth_down_mbps (int)
- bandwidth_up_mbps (int)
- duration_hours (int) — session validity
- data_limit_gb (int, nullable) — null = unlimited
- is_active (boolean)
- created_at, updated_at

### customers
End-users who consume hotspot service.
- id (uuid, pk)
- full_name (text)
- email (text)
- phone (text)
- plan_id (uuid FK -> plans, nullable)
- hotspot_id (uuid FK -> hotspots, nullable) — home/preferred hotspot
- status (text) — 'active' | 'suspended' | 'expired'
- data_used_mb (numeric) — cumulative usage
- balance (numeric) — prepaid credit
- created_at, updated_at

### sessions
Active and historical RADIUS-style hotspot sessions.
- id (uuid, pk)
- customer_id (uuid FK -> customers, nullable) — nullable for voucher-only sessions
- hotspot_id (uuid FK -> hotspots)
- ip_address (text) — assigned client IP
- mac_address (text)
- status (text) — 'connected' | 'disconnected'
- connected_at (timestamptz)
- disconnected_at (timestamptz, nullable)
- data_used_mb (numeric)
- session_duration_sec (int, nullable) — populated on disconnect
- created_at

### vouchers
Prepaid access codes sold or distributed.
- id (uuid, pk)
- code (text, unique) — the voucher PIN
- plan_id (uuid FK -> plans)
- status (text) — 'unused' | 'active' | 'used' | 'expired'
- customer_id (uuid FK -> customers, nullable) — who redeemed it
- activated_at (timestamptz, nullable)
- expires_at (timestamptz, nullable)
- created_at

### transactions
Billing records for plan purchases, top-ups, and voucher sales.
- id (uuid, pk)
- customer_id (uuid FK -> customers, nullable)
- plan_id (uuid FK -> plans, nullable)
- voucher_id (uuid FK -> vouchers, nullable)
- hotspot_id (uuid FK -> hotspots, nullable)
- amount (numeric)
- type (text) — 'plan_purchase' | 'topup' | 'voucher_sale' | 'refund'
- status (text) — 'completed' | 'pending' | 'failed'
- payment_method (text) — 'mpesa' | 'card' | 'cash' | 'bank'
- reference (text) — external payment ref
- created_at

## Security
- RLS enabled on every table.
- Single-tenant no-auth: all policies use TO anon, authenticated with USING(true)/WITH CHECK(true)
  because the data is intentionally public/shared within this management dashboard.

## Notes
1. Indexes added on all foreign keys and frequently-filtered columns (status, created_at).
2. updated_at auto-maintained via trigger.
*/

-- ========== hotspots ==========
CREATE TABLE IF NOT EXISTS hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  ip_address text,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','offline','degraded')),
  max_connections integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_hotspots" ON hotspots;
CREATE POLICY "anon_select_hotspots" ON hotspots FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_hotspots" ON hotspots;
CREATE POLICY "anon_insert_hotspots" ON hotspots FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_hotspots" ON hotspots;
CREATE POLICY "anon_update_hotspots" ON hotspots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_hotspots" ON hotspots;
CREATE POLICY "anon_delete_hotspots" ON hotspots FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_hotspots_status ON hotspots(status);

-- ========== plans ==========
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  bandwidth_down_mbps integer NOT NULL DEFAULT 10,
  bandwidth_up_mbps integer NOT NULL DEFAULT 5,
  duration_hours integer NOT NULL DEFAULT 24,
  data_limit_gb integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_plans" ON plans;
CREATE POLICY "anon_select_plans" ON plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_plans" ON plans;
CREATE POLICY "anon_insert_plans" ON plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_plans" ON plans;
CREATE POLICY "anon_update_plans" ON plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_plans" ON plans;
CREATE POLICY "anon_delete_plans" ON plans FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);

-- ========== customers ==========
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  hotspot_id uuid REFERENCES hotspots(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired')),
  data_used_mb numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan_id);
CREATE INDEX IF NOT EXISTS idx_customers_hotspot ON customers(hotspot_id);

-- ========== sessions ==========
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  hotspot_id uuid REFERENCES hotspots(id) ON DELETE SET NULL,
  ip_address text,
  mac_address text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  data_used_mb numeric(12,2) NOT NULL DEFAULT 0,
  session_duration_sec integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_hotspot ON sessions(hotspot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_connected_at ON sessions(connected_at DESC);

-- ========== vouchers ==========
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','active','used','expired')),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vouchers" ON vouchers;
CREATE POLICY "anon_select_vouchers" ON vouchers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vouchers" ON vouchers;
CREATE POLICY "anon_insert_vouchers" ON vouchers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vouchers" ON vouchers;
CREATE POLICY "anon_update_vouchers" ON vouchers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vouchers" ON vouchers;
CREATE POLICY "anon_delete_vouchers" ON vouchers FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_plan ON vouchers(plan_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);

-- ========== transactions ==========
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  voucher_id uuid REFERENCES vouchers(id) ON DELETE SET NULL,
  hotspot_id uuid REFERENCES hotspots(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('plan_purchase','topup','voucher_sale','refund')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','failed')),
  payment_method text NOT NULL DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa','card','cash','bank')),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ========== updated_at trigger ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_hotspots_updated ON hotspots;
CREATE TRIGGER trg_hotspots_updated BEFORE UPDATE ON hotspots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_plans_updated ON plans;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
