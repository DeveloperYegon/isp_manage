/*
# Drop Old Demo Tables + Seed Packages

## Changes
1. Drops old single-tenant demo tables
2. Seeds 4 tenant subscription packages (Starter, Growth, Professional, Enterprise)
*/

-- Drop old demo tables (safe — only contained previous build's seed data)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS hotspots CASCADE;

-- Seed tenant packages using fixed UUIDs
INSERT INTO tenant_packages (id, name, description, price_monthly, price_yearly, max_nas, max_users, max_hotspots, features, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Starter', 'Perfect for small ISPs getting started with hotspot management', 2900, 29000, 3, 100, 5,
    '["Up to 3 NAS devices","100 RADIUS users","5 hotspot locations","M-Pesa Daraja integration","Email support","Basic analytics"]'::jsonb, 1),
  ('22222222-2222-2222-2222-222222222222', 'Growth', 'For growing ISPs that need more capacity and advanced features', 6900, 69000, 10, 500, 20,
    '["Up to 10 NAS devices","500 RADIUS users","20 hotspot locations","M-Pesa Daraja integration","Priority email support","Advanced analytics","Voucher generation","Session monitoring"]'::jsonb, 2),
  ('33333333-3333-3333-3333-333333333333', 'Professional', 'Full-featured plan for established ISPs with multiple locations', 14900, 149000, 50, 5000, 100,
    '["Up to 50 NAS devices","5,000 RADIUS users","100 hotspot locations","M-Pesa Daraja integration","Priority phone support","Real-time monitoring","Bulk voucher generation","Custom branding","API access"]'::jsonb, 3),
  ('44444444-4444-4444-4444-444444444444', 'Enterprise', 'Unlimited scale for large operators and telecom companies', 49000, 490000, 999, 999999, 999,
    '["Unlimited NAS devices","Unlimited RADIUS users","Unlimited locations","M-Pesa Daraja integration","24/7 phone support","Real-time monitoring","Bulk voucher generation","Custom branding","Full API access","Dedicated account manager","SLA guarantee"]'::jsonb, 4)
ON CONFLICT (id) DO NOTHING;
