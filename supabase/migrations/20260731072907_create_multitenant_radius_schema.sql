/*
# Multitenant FreeRADIUS Schema — Foundation

## Overview
Transforms the single-tenant demo into a multitenant SaaS where multiple ISPs sign up,
get a tenant record, and operate their own FreeRADIUS hotspot infrastructure.

## New Tables
- tenant_packages: subscription tiers (publicly readable)
- tenants: ISP company records
- tenant_users: auth.users -> tenants mapping with roles
- tenant_profile: auth user display info
- tenant_invitations: pending invites
- nas: FreeRADIUS NAS devices (tenant-scoped)
- radcheck: user credentials (tenant-scoped)
- radreply: per-user reply attributes (tenant-scoped)
- radgroupcheck: group checks (tenant-scoped)
- radgroupreply: service plans (tenant-scoped)
- radusergroup: user->group mapping (tenant-scoped)
- radacct: accounting records (tenant-scoped)
- radpostauth: auth log (tenant-scoped)
- nasreload: reload signals (tenant-scoped)
- billing_transactions: M-Pesa billing (tenant-scoped)

## Security
- RLS on every table with tenant isolation
- get_current_tenant_id() derives tenant from auth.uid()
- tenant_packages publicly readable
- create_tenant() SECURITY DEFINER function for signup
*/

-- ============================================================
-- TENANT PACKAGES (publicly readable — subscription tiers)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  max_nas integer NOT NULL DEFAULT 5,
  max_users integer NOT NULL DEFAULT 100,
  max_hotspots integer NOT NULL DEFAULT 10,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tenant_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pkgs_select_all" ON tenant_packages;
CREATE POLICY "pkgs_select_all" ON tenant_packages FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  country text NOT NULL DEFAULT 'Kenya',
  city text,
  package_id uuid REFERENCES tenant_packages(id) ON DELETE SET NULL,
  subscription_status text NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','suspended','expired','cancelled')),
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  max_nas integer NOT NULL DEFAULT 5,
  max_users integer NOT NULL DEFAULT 100,
  max_hotspots integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- Policies added after helper function is created below

-- ============================================================
-- TENANT USERS (auth.users -> tenants mapping)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','viewer')),
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
-- Policies added after helper function

-- ============================================================
-- HELPER: get current tenant id from auth session
-- (defined after tenant_users exists)
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- TENANT PROFILES (auth user display info)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tenant_profile ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANT INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner','admin','viewer')),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOW: tenant isolation policies (helper exists)
-- ============================================================
-- tenants
DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
CREATE POLICY "tenants_select_own" ON tenants FOR SELECT
  TO authenticated USING (
    id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "tenants_update_own" ON tenants;
CREATE POLICY "tenants_update_own" ON tenants FOR UPDATE
  TO authenticated USING (
    id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- tenant_users
DROP POLICY IF EXISTS "tu_select_own" ON tenant_users;
CREATE POLICY "tu_select_own" ON tenant_users FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR tenant_id IN (SELECT tenant_id FROM tenant_users tu2 WHERE tu2.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "tu_insert_own" ON tenant_users;
CREATE POLICY "tu_insert_own" ON tenant_users FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- tenant_profile
DROP POLICY IF EXISTS "tp_select_own" ON tenant_profile;
CREATE POLICY "tp_select_own" ON tenant_profile FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "tp_insert_own" ON tenant_profile;
CREATE POLICY "tp_insert_own" ON tenant_profile FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "tp_update_own" ON tenant_profile;
CREATE POLICY "tp_update_own" ON tenant_profile FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- tenant_invitations
DROP POLICY IF EXISTS "ti_select_tenant" ON tenant_invitations;
CREATE POLICY "ti_select_tenant" ON tenant_invitations FOR SELECT
  TO authenticated USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- NAS (FreeRADIUS-compatible + tenant_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS nas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nasname text NOT NULL,
  shortname text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'other',
  secret text NOT NULL,
  ports integer NOT NULL DEFAULT 0,
  server text,
  community text,
  description text,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','offline','degraded')),
  location text,
  max_connections integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, nasname)
);
ALTER TABLE nas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nas_select_tenant" ON nas;
CREATE POLICY "nas_select_tenant" ON nas FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "nas_insert_tenant" ON nas;
CREATE POLICY "nas_insert_tenant" ON nas FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "nas_update_tenant" ON nas;
CREATE POLICY "nas_update_tenant" ON nas FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "nas_delete_tenant" ON nas;
CREATE POLICY "nas_delete_tenant" ON nas FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_nas_tenant ON nas(tenant_id);

-- ============================================================
-- radgroupreply (used as "service plans")
-- ============================================================
CREATE TABLE IF NOT EXISTS radgroupreply (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  groupname text NOT NULL,
  attribute text NOT NULL DEFAULT 'Mikrotik-Rate-Limit',
  op text NOT NULL DEFAULT ':=',
  value text NOT NULL,
  plan_name text NOT NULL,
  plan_description text,
  plan_price numeric(10,2) NOT NULL DEFAULT 0,
  plan_duration_hours integer NOT NULL DEFAULT 24,
  plan_data_limit_gb integer,
  plan_down_mbps integer NOT NULL DEFAULT 10,
  plan_up_mbps integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, groupname)
);
ALTER TABLE radgroupreply ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rgr_select_tenant" ON radgroupreply;
CREATE POLICY "rgr_select_tenant" ON radgroupreply FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rgr_insert_tenant" ON radgroupreply;
CREATE POLICY "rgr_insert_tenant" ON radgroupreply FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rgr_update_tenant" ON radgroupreply;
CREATE POLICY "rgr_update_tenant" ON radgroupreply FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rgr_delete_tenant" ON radgroupreply;
CREATE POLICY "rgr_delete_tenant" ON radgroupreply FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_rgr_tenant ON radgroupreply(tenant_id);

-- ============================================================
-- radcheck (user credentials)
-- ============================================================
CREATE TABLE IF NOT EXISTS radcheck (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username text NOT NULL,
  attribute text NOT NULL DEFAULT 'Cleartext-Password',
  op text NOT NULL DEFAULT ':=',
  value text NOT NULL,
  plan_id uuid REFERENCES radgroupreply(id) ON DELETE SET NULL,
  is_voucher boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','expired')),
  expires_at timestamptz,
  data_used_mb numeric(12,2) NOT NULL DEFAULT 0,
  full_name text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, username)
);
ALTER TABLE radcheck ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rc_select_tenant" ON radcheck;
CREATE POLICY "rc_select_tenant" ON radcheck FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rc_insert_tenant" ON radcheck;
CREATE POLICY "rc_insert_tenant" ON radcheck FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rc_update_tenant" ON radcheck;
CREATE POLICY "rc_update_tenant" ON radcheck FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rc_delete_tenant" ON radcheck;
CREATE POLICY "rc_delete_tenant" ON radcheck FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_rc_tenant ON radcheck(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rc_username ON radcheck(username);

-- ============================================================
-- radreply (per-user reply attributes)
-- ============================================================
CREATE TABLE IF NOT EXISTS radreply (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username text NOT NULL,
  attribute text NOT NULL,
  op text NOT NULL DEFAULT '=',
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE radreply ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rr_select_tenant" ON radreply;
CREATE POLICY "rr_select_tenant" ON radreply FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rr_insert_tenant" ON radreply;
CREATE POLICY "rr_insert_tenant" ON radreply FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rr_update_tenant" ON radreply;
CREATE POLICY "rr_update_tenant" ON radreply FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rr_delete_tenant" ON radreply;
CREATE POLICY "rr_delete_tenant" ON radreply FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_rr_tenant ON radreply(tenant_id);

-- ============================================================
-- radgroupcheck (group-level checks)
-- ============================================================
CREATE TABLE IF NOT EXISTS radgroupcheck (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  groupname text NOT NULL,
  attribute text NOT NULL,
  op text NOT NULL DEFAULT ':=',
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE radgroupcheck ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rgc_select_tenant" ON radgroupcheck;
CREATE POLICY "rgc_select_tenant" ON radgroupcheck FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rgc_insert_tenant" ON radgroupcheck;
CREATE POLICY "rgc_insert_tenant" ON radgroupcheck FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rgc_update_tenant" ON radgroupcheck;
CREATE POLICY "rgc_update_tenant" ON radgroupcheck FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rgc_delete_tenant" ON radgroupcheck;
CREATE POLICY "rgc_delete_tenant" ON radgroupcheck FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_rgc_tenant ON radgroupcheck(tenant_id);

-- ============================================================
-- radusergroup (user -> group mapping)
-- ============================================================
CREATE TABLE IF NOT EXISTS radusergroup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username text NOT NULL,
  groupname text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, username, groupname)
);
ALTER TABLE radusergroup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rug_select_tenant" ON radusergroup;
CREATE POLICY "rug_select_tenant" ON radusergroup FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rug_insert_tenant" ON radusergroup;
CREATE POLICY "rug_insert_tenant" ON radusergroup FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rug_update_tenant" ON radusergroup;
CREATE POLICY "rug_update_tenant" ON radusergroup FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "rug_delete_tenant" ON radusergroup;
CREATE POLICY "rug_delete_tenant" ON radusergroup FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_rug_tenant ON radusergroup(tenant_id);

-- ============================================================
-- radacct (accounting records)
-- ============================================================
CREATE TABLE IF NOT EXISTS radacct (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  radacctid bigint GENERATED ALWAYS AS IDENTITY,
  acctsessionid text NOT NULL,
  acctuniqueid text UNIQUE,
  username text,
  groupname text,
  nasipaddress text,
  nasportid text,
  acctstarttime timestamptz NOT NULL DEFAULT now(),
  acctstoptime timestamptz,
  acctsessiontime integer NOT NULL DEFAULT 0,
  acctauthentic text,
  connectinfo_start text,
  connectinfo_stop text,
  acctinputoctets bigint NOT NULL DEFAULT 0,
  acctoutputoctets bigint NOT NULL DEFAULT 0,
  calledstationid text,
  callingstationid text,
  acctterminatecause text,
  framedipaddress text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE radacct ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ra_select_tenant" ON radacct;
CREATE POLICY "ra_select_tenant" ON radacct FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "ra_insert_tenant" ON radacct;
CREATE POLICY "ra_insert_tenant" ON radacct FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "ra_update_tenant" ON radacct;
CREATE POLICY "ra_update_tenant" ON radacct FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "ra_delete_tenant" ON radacct;
CREATE POLICY "ra_delete_tenant" ON radacct FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_ra_tenant ON radacct(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ra_username ON radacct(username);
CREATE INDEX IF NOT EXISTS idx_ra_starttime ON radacct(acctstarttime DESC);

-- ============================================================
-- radpostauth (auth log)
-- ============================================================
CREATE TABLE IF NOT EXISTS radpostauth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username text,
  pass text,
  reply text,
  authdate timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE radpostauth ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpa_select_tenant" ON radpostauth;
CREATE POLICY "rpa_select_tenant" ON radpostauth FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_rpa_tenant ON radpostauth(tenant_id);

-- ============================================================
-- nasreload
-- ============================================================
CREATE TABLE IF NOT EXISTS nasreload (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nasname text NOT NULL,
  action text NOT NULL DEFAULT 'reload',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE nasreload ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nr_select_tenant" ON nasreload;
CREATE POLICY "nr_select_tenant" ON nasreload FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "nr_insert_tenant" ON nasreload;
CREATE POLICY "nr_insert_tenant" ON nasreload FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_nr_tenant ON nasreload(tenant_id);

-- ============================================================
-- billing_transactions (tenant-scoped + M-Pesa Daraja fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_username text,
  plan_id uuid REFERENCES radgroupreply(id) ON DELETE SET NULL,
  nas_id uuid REFERENCES nas(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'plan_purchase'
    CHECK (type IN ('plan_purchase','topup','voucher_sale','subscription','refund')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('completed','pending','failed')),
  payment_method text NOT NULL DEFAULT 'mpesa'
    CHECK (payment_method IN ('mpesa','card','cash','bank')),
  mpesa_checkout_request_id text,
  mpesa_merchant_request_id text,
  mpesa_phone text,
  mpesa_receipt text,
  mpesa_result_code integer,
  mpesa_result_desc text,
  callback_received boolean NOT NULL DEFAULT false,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bt_select_tenant" ON billing_transactions;
CREATE POLICY "bt_select_tenant" ON billing_transactions FOR SELECT
  TO authenticated USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "bt_insert_tenant" ON billing_transactions;
CREATE POLICY "bt_insert_tenant" ON billing_transactions FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "bt_update_tenant" ON billing_transactions;
CREATE POLICY "bt_update_tenant" ON billing_transactions FOR UPDATE
  TO authenticated USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "bt_delete_tenant" ON billing_transactions;
CREATE POLICY "bt_delete_tenant" ON billing_transactions FOR DELETE
  TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_bt_tenant ON billing_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bt_created ON billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bt_mpesa_id ON billing_transactions(mpesa_checkout_request_id);

-- ============================================================
-- UPDATED_AT triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_tenants_updated ON tenants;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_nas_updated ON nas;
CREATE TRIGGER trg_nas_updated BEFORE UPDATE ON nas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_rgr_updated ON radgroupreply;
CREATE TRIGGER trg_rgr_updated BEFORE UPDATE ON radgroupreply
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_rc_updated ON radcheck;
CREATE TRIGGER trg_rc_updated BEFORE UPDATE ON radcheck
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_bt_updated ON billing_transactions;
CREATE TRIGGER trg_bt_updated BEFORE UPDATE ON billing_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SECURITY DEFINER: create_tenant (called after signup)
-- ============================================================
CREATE OR REPLACE FUNCTION create_tenant(
  p_company_name text,
  p_contact_email text,
  p_contact_phone text DEFAULT NULL,
  p_country text DEFAULT 'Kenya',
  p_city text DEFAULT NULL,
  p_package_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_pkg record;
BEGIN
  IF p_package_id IS NOT NULL THEN
    SELECT * INTO v_pkg FROM tenant_packages WHERE id = p_package_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid package';
    END IF;
  END IF;

  INSERT INTO tenants (
    company_name, contact_email, contact_phone, country, city,
    package_id, subscription_status, trial_ends_at,
    max_nas, max_users, max_hotspots
  )
  VALUES (
    p_company_name, p_contact_email, p_contact_phone, p_country, p_city,
    p_package_id, 'trial', (now() + interval '14 days'),
    COALESCE(v_pkg.max_nas, 5), COALESCE(v_pkg.max_users, 100), COALESCE(v_pkg.max_hotspots, 10)
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO tenant_users (user_id, tenant_id, role, accepted_at)
  VALUES (auth.uid(), v_tenant_id, 'owner', now());

  RETURN v_tenant_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION create_tenant FROM anon;
GRANT EXECUTE ON FUNCTION create_tenant TO authenticated;
