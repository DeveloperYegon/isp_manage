/*
# Seed Demo Tenant with RADIUS Data (retry)
*/

INSERT INTO tenants (id, company_name, contact_email, contact_phone, country, city, package_id, subscription_status, trial_ends_at, max_nas, max_users, max_hotspots, status)
VALUES ('d0000000-0000-0000-0000-000000000001', 'DemoISP Ltd', 'admin@demoisp.co.ke', '+254700100200', 'Kenya', 'Nairobi', '22222222-2222-2222-2222-222222222222', 'trial', (now() + interval '14 days'), 10, 500, 20, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO nas (id, tenant_id, nasname, shortname, type, secret, ports, description, status, location, max_connections) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '10.0.1.1', 'Central Cafe', 'other', 'sharedSecret123', 0, 'MikroTik hAP ac2', 'online', 'Nairobi CBD', 80),
  ('d0000002-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', '10.0.2.1', 'Riverside Mall', 'other', 'sharedSecret123', 0, 'Ubiquiti EdgeRouter', 'online', 'Nairobi Westlands', 120),
  ('d0000003-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', '10.0.3.1', 'JKIA Terminal 1A', 'other', 'sharedSecret123', 0, 'Cisco WLC', 'degraded', 'Embakasi', 200),
  ('d0000004-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', '10.0.4.1', 'Mombasa Beach Resort', 'other', 'sharedSecret123', 0, 'MikroTik CCR', 'online', 'Nyali', 150)
ON CONFLICT (id) DO NOTHING;

INSERT INTO radgroupreply (id, tenant_id, groupname, attribute, op, value, plan_name, plan_description, plan_price, plan_duration_hours, plan_data_limit_gb, plan_down_mbps, plan_up_mbps, is_active, sort_order) VALUES
  ('d0000010-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'daily-lite', 'Mikrotik-Rate-Limit', ':=', '5M/2M 2G/2G', 'Daily Lite', 'Light browsing & messaging', 50, 24, 2, 5, 2, true, 1),
  ('d0000010-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'daily-pro', 'Mikrotik-Rate-Limit', ':=', '15M/5M 10G/10G', 'Daily Pro', 'Streaming & social media', 150, 24, 10, 15, 5, true, 2),
  ('d0000010-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'weekly-plus', 'Mikrotik-Rate-Limit', ':=', '20M/8M 25G/25G', 'Weekly Plus', '7 days of heavy usage', 500, 168, 25, 20, 8, true, 3),
  ('d0000010-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'monthly-unlimited', 'Mikrotik-Rate-Limit', ':=', '25M/10M', 'Monthly Unlimited', '30 days unlimited data', 1500, 720, NULL, 25, 10, true, 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO radcheck (id, tenant_id, username, attribute, op, value, plan_id, is_voucher, status, full_name, phone, email, data_used_mb) VALUES
  ('d0000020-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'amara.ochieng', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000002', false, 'active', 'Amara Ochieng', '+254700100100', 'amara@email.com', 8420.50),
  ('d0000020-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'brian.kamau', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000004', false, 'active', 'Brian Kamau', '+254700100101', 'brian@email.com', 48230.00),
  ('d0000020-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'chen.wei', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000003', false, 'active', 'Chen Wei', '+254700100102', 'chen@email.com', 15890.75),
  ('d0000020-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'diana.wanjiru', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000001', false, 'active', 'Diana Wanjiru', '+254700100103', 'diana@email.com', 1850.20),
  ('d0000020-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'emmanuel.otieno', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000004', false, 'active', 'Emmanuel Otieno', '+254700100104', 'emmanuel@email.com', 92100.40),
  ('d0000020-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'george.mwangi', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000002', false, 'active', 'George Mwangi', '+254700100106', 'george@email.com', 6740.80),
  ('d0000020-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'hassan.ali', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000004', false, 'expired', 'Hassan Ali', '+254700100107', 'hassan@email.com', 112400.00),
  ('d0000020-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'irene.nyambura', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000001', false, 'active', 'Irene Nyambura', '+254700100108', 'irene@email.com', 920.45),
  ('d0000020-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'james.kibet', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000003', false, 'active', 'James Kibet', '+254700100109', 'james@email.com', 12800.00),
  ('d0000020-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'khalid.mohammed', 'Cleartext-Password', ':=', 'pass1234', 'd0000010-0000-0000-0000-000000000002', false, 'active', 'Khalid Mohammed', '+254700100110', 'khalid@email.com', 5230.60),
  ('d0000030-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'WISP-4827-AX91', 'Cleartext-Password', ':=', '4827AX91', 'd0000010-0000-0000-0000-000000000001', true, 'used', NULL, NULL, NULL, 1850.00),
  ('d0000030-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'WISP-1903-BZ42', 'Cleartext-Password', ':=', '1903BZ42', 'd0000010-0000-0000-0000-000000000002', true, 'used', NULL, NULL, NULL, 8420.50),
  ('d0000030-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'WISP-7741-CX08', 'Cleartext-Password', ':=', '7741CX08', 'd0000010-0000-0000-0000-000000000003', true, 'active', NULL, NULL, NULL, 3200.00),
  ('d0000030-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'WISP-3092-DY55', 'Cleartext-Password', ':=', '3092DY55', 'd0000010-0000-0000-0000-000000000002', true, 'unused', NULL, NULL, NULL, 0),
  ('d0000030-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'WISP-5568-EZ17', 'Cleartext-Password', ':=', '5568EZ17', 'd0000010-0000-0000-0000-000000000001', true, 'unused', NULL, NULL, NULL, 0),
  ('d0000030-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'WISP-8841-FA63', 'Cleartext-Password', ':=', '8841FA63', 'd0000010-0000-0000-0000-000000000004', true, 'unused', NULL, NULL, NULL, 0),
  ('d0000030-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'WISP-6203-GQ29', 'Cleartext-Password', ':=', '6203GQ29', 'd0000010-0000-0000-0000-000000000002', true, 'unused', NULL, NULL, NULL, 0),
  ('d0000030-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'WISP-2204-NW19', 'Cleartext-Password', ':=', '2204NW19', 'd0000010-0000-0000-0000-000000000002', true, 'expired', NULL, NULL, NULL, 2980.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO radusergroup (tenant_id, username, groupname, priority)
SELECT tenant_id, username,
  CASE username
    WHEN 'amara.ochieng' THEN 'daily-pro'
    WHEN 'brian.kamau' THEN 'monthly-unlimited'
    WHEN 'chen.wei' THEN 'weekly-plus'
    WHEN 'diana.wanjiru' THEN 'daily-lite'
    WHEN 'emmanuel.otieno' THEN 'monthly-unlimited'
    WHEN 'george.mwangi' THEN 'daily-pro'
    WHEN 'hassan.ali' THEN 'monthly-unlimited'
    WHEN 'irene.nyambura' THEN 'daily-lite'
    WHEN 'james.kibet' THEN 'weekly-plus'
    WHEN 'khalid.mohammed' THEN 'daily-pro'
    WHEN 'WISP-4827-AX91' THEN 'daily-lite'
    WHEN 'WISP-1903-BZ42' THEN 'daily-pro'
    WHEN 'WISP-7741-CX08' THEN 'weekly-plus'
    WHEN 'WISP-3092-DY55' THEN 'daily-pro'
    WHEN 'WISP-5568-EZ17' THEN 'daily-lite'
    WHEN 'WISP-8841-FA63' THEN 'monthly-unlimited'
    WHEN 'WISP-6203-GQ29' THEN 'daily-pro'
    WHEN 'WISP-2204-NW19' THEN 'daily-pro'
  END, 1
FROM radcheck WHERE tenant_id = 'd0000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, username, groupname) DO NOTHING;

INSERT INTO radacct (tenant_id, acctsessionid, acctuniqueid, username, groupname, nasipaddress, acctstarttime, acctstoptime, acctsessiontime, acctinputoctets, acctoutputoctets, callingstationid, framedipaddress, status) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'sess-001', 'uniq-0001', 'amara.ochieng', 'daily-pro', '10.0.1.1', now() - interval '2 hours', NULL, 7200, 500000000, 800000000, 'A4:5E:60:AA:11:01', '10.1.0.12', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-002', 'uniq-0002', 'brian.kamau', 'monthly-unlimited', '10.0.2.1', now() - interval '4 hours', NULL, 14400, 2000000000, 3000000000, 'A4:5E:60:BB:22:02', '10.2.0.22', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-003', 'uniq-0003', 'diana.wanjiru', 'daily-lite', '10.0.4.1', now() - interval '1 hour', NULL, 3600, 100000000, 200000000, 'A4:5E:60:CC:44:04', '10.4.0.44', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-004', 'uniq-0004', 'george.mwangi', 'daily-pro', '10.0.1.1', now() - interval '45 minutes', NULL, 2700, 80000000, 120000000, 'A4:5E:60:EE:77:07', '10.1.0.77', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-005', 'uniq-0005', 'irene.nyambura', 'daily-lite', '10.0.1.1', now() - interval '30 minutes', NULL, 1800, 30000000, 50000000, 'A4:5E:60:FF:99:09', '10.1.0.99', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-006', 'uniq-0006', 'james.kibet', 'weekly-plus', '10.0.3.1', now() - interval '3 hours', NULL, 10800, 800000000, 1200000000, 'A4:5E:60:10:33:10', '10.3.0.33', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-007', 'uniq-0007', 'khalid.mohammed', 'daily-pro', '10.0.2.1', now() - interval '90 minutes', NULL, 5400, 200000000, 350000000, 'A4:5E:60:11:BB:12', '10.2.0.11', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-008', 'uniq-0008', 'WISP-7741-CX08', 'weekly-plus', '10.0.4.1', now() - interval '2 hours', NULL, 7200, 400000000, 600000000, 'A4:5E:60:12:77:14', '10.4.0.15', 'connected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-009', 'uniq-0009', 'amara.ochieng', 'daily-pro', '10.0.1.1', now() - interval '1 day', now() - interval '20 hours', 14400, 1000000000, 1500000000, 'A4:5E:60:AA:11:01', '10.1.0.12', 'disconnected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-010', 'uniq-0010', 'brian.kamau', 'monthly-unlimited', '10.0.2.1', now() - interval '2 days', now() - interval '1 day', 43200, 3000000000, 5000000000, 'A4:5E:60:BB:22:02', '10.2.0.22', 'disconnected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-011', 'uniq-0011', 'chen.wei', 'weekly-plus', '10.0.3.1', now() - interval '3 days', now() - interval '2 days', 43200, 2000000000, 3000000000, 'A4:5E:60:CC:33:03', '10.3.0.33', 'disconnected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-012', 'uniq-0012', 'emmanuel.otieno', 'monthly-unlimited', '10.0.1.1', now() - interval '4 days', now() - interval '3 days', 86400, 4000000000, 6000000000, 'A4:5E:60:DD:55:05', '10.1.0.55', 'disconnected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-013', 'uniq-0013', 'hassan.ali', 'monthly-unlimited', '10.0.4.1', now() - interval '5 days', now() - interval '4 days', 86400, 5000000000, 7000000000, 'A4:5E:60:EE:77:07', '10.4.0.77', 'disconnected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-014', 'uniq-0014', 'WISP-4827-AX91', 'daily-lite', '10.0.1.1', now() - interval '6 days', now() - interval '5 days', 3600, 50000000, 100000000, 'A4:5E:60:13:11:01', '10.1.0.50', 'disconnected'),
  ('d0000000-0000-0000-0000-000000000001', 'sess-015', 'uniq-0015', 'WISP-1903-BZ42', 'daily-pro', '10.0.2.1', now() - interval '7 days', now() - interval '6 days', 86400, 2000000000, 3000000000, 'A4:5E:60:14:22:02', '10.2.0.60', 'disconnected')
ON CONFLICT (acctuniqueid) DO NOTHING;

INSERT INTO billing_transactions (tenant_id, customer_username, plan_id, amount, type, status, payment_method, mpesa_receipt, reference, callback_received) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'amara.ochieng', 'd0000010-0000-0000-0000-000000000002', 150, 'plan_purchase', 'completed', 'mpesa', 'QFG4X9P8K2', 'MPESA-X90-A112', true),
  ('d0000000-0000-0000-0000-000000000001', 'brian.kamau', 'd0000010-0000-0000-0000-000000000004', 1500, 'plan_purchase', 'completed', 'mpesa', 'QFG5X1P9L3', 'MPESA-X91-B222', true),
  ('d0000000-0000-0000-0000-000000000001', 'chen.wei', 'd0000010-0000-0000-0000-000000000003', 500, 'plan_purchase', 'completed', 'card', NULL, 'CARD-VISA-333', true),
  ('d0000000-0000-0000-0000-000000000001', 'diana.wanjiru', 'd0000010-0000-0000-0000-000000000001', 50, 'voucher_sale', 'completed', 'mpesa', 'QFG6X2P0M4', 'MPESA-X92-D444', true),
  ('d0000000-0000-0000-0000-000000000001', 'emmanuel.otieno', 'd0000010-0000-0000-0000-000000000004', 1500, 'plan_purchase', 'completed', 'mpesa', 'QFG7X3P1N5', 'MPESA-X93-E555', true),
  ('d0000000-0000-0000-0000-000000000001', 'george.mwangi', 'd0000010-0000-0000-0000-000000000002', 150, 'plan_purchase', 'completed', 'mpesa', 'QFG8X4P2O6', 'MPESA-X94-G777', true),
  ('d0000000-0000-0000-0000-000000000001', 'irene.nyambura', 'd0000010-0000-0000-0000-000000000001', 50, 'voucher_sale', 'completed', 'cash', NULL, 'CASH-0001', true),
  ('d0000000-0000-0000-0000-000000000001', 'james.kibet', 'd0000010-0000-0000-0000-000000000003', 500, 'plan_purchase', 'completed', 'mpesa', 'QFG9X5P3P7', 'MPESA-X95-J999', true),
  ('d0000000-0000-0000-0000-000000000001', 'khalid.mohammed', 'd0000010-0000-0000-0000-000000000002', 150, 'plan_purchase', 'completed', 'mpesa', 'QGH0X6P4Q8', 'MPESA-X96-K111', true),
  ('d0000000-0000-0000-0000-000000000001', 'amara.ochieng', NULL, 200, 'topup', 'completed', 'mpesa', 'QGH1X7P5R9', 'MPESA-X97-T112', true),
  ('d0000000-0000-0000-0000-000000000001', 'brian.kamau', NULL, 500, 'topup', 'completed', 'mpesa', 'QGH2X8P6S0', 'MPESA-X98-T222', true),
  ('d0000000-0000-0000-0000-000000000001', 'hassan.ali', 'd0000010-0000-0000-0000-000000000004', 1500, 'plan_purchase', 'pending', 'mpesa', NULL, 'MPESA-X99-H777', false)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION claim_demo_tenant()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM tenant_users
  WHERE tenant_id = 'd0000000-0000-0000-0000-000000000001';

  IF v_count > 0 THEN
    RETURN false;
  END IF;

  INSERT INTO tenant_users (user_id, tenant_id, role, accepted_at)
  VALUES (auth.uid(), 'd0000000-0000-0000-0000-000000000001', 'owner', now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION claim_demo_tenant FROM anon;
GRANT EXECUTE ON FUNCTION claim_demo_tenant TO authenticated;
