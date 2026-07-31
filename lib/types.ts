// lib/types.ts
export type NasStatus = 'online' | 'offline' | 'degraded';
export type UserStatus = 'active' | 'disabled' | 'expired' | 'used' | 'unused';
export type SessionStatus = 'connected' | 'disconnected';
export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'cancelled';
export type TenantStatus = 'active' | 'suspended';
export type TenantRole = 'owner' | 'admin' | 'viewer';
export type TransactionType =
  | 'plan_purchase'
  | 'topup'
  | 'voucher_sale'
  | 'subscription'
  | 'refund';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type PaymentMethod = 'mpesa' | 'card' | 'cash' | 'bank';

export interface TenantPackage {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_nas: number;
  max_users: number;
  max_hotspots: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Tenant {
  id: string;
  company_name: string;
  contact_email: string;
  contact_phone: string | null;
  country: string;
  city: string | null;
  package_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  max_nas: number;
  max_users: number;
  max_hotspots: number;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
  package?: Pick<TenantPackage, 'id' | 'name'> | null;
}

export interface TenantUser {
  id: string;
  user_id: string;
  tenant_id: string;
  role: TenantRole;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface TenantProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Nas {
  id: string;
  tenant_id: string;
  nasname: string;
  shortname: string;
  type: string;
  secret: string;
  ports: number;
  server: string | null;
  community: string | null;
  description: string | null;
  status: NasStatus;
  location: string | null;
  max_connections: number;
  created_at: string;
  updated_at: string;
}

export interface RadGroupReply {
  id: string;
  tenant_id: string;
  groupname: string;
  attribute: string;
  op: string;
  value: string;
  plan_name: string;
  plan_description: string | null;
  plan_price: number;
  plan_duration_hours: number;
  plan_data_limit_gb: number | null;
  plan_down_mbps: number;
  plan_up_mbps: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RadCheck {
  id: string;
  tenant_id: string;
  username: string;
  attribute: string;
  op: string;
  value: string;
  plan_id: string | null;
  is_voucher: boolean;
  status: UserStatus;
  expires_at: string | null;
  data_used_mb: number;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  plan?: Pick<RadGroupReply, 'id' | 'plan_name' | 'plan_price' | 'plan_duration_hours'> | null;
}

export interface RadAcct {
  id: string;
  tenant_id: string;
  radacctid: number | null;
  acctsessionid: string;
  acctuniqueid: string | null;
  username: string | null;
  groupname: string | null;
  nasipaddress: string | null;
  nasportid: string | null;
  acctstarttime: string;
  acctstoptime: string | null;
  acctsessiontime: number;
  acctauthentic: string | null;
  connectinfo_start: string | null;
  connectinfo_stop: string | null;
  acctinputoctets: number;
  acctoutputoctets: number;
  calledstationid: string | null;
  callingstationid: string | null;
  acctterminatecause: string | null;
  framedipaddress: string | null;
  status: SessionStatus;
  created_at: string;
}

export interface BillingTransaction {
  id: string;
  tenant_id: string;
  customer_username: string | null;
  plan_id: string | null;
  nas_id: string | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  mpesa_checkout_request_id: string | null;
  mpesa_merchant_request_id: string | null;
  mpesa_phone: string | null;
  mpesa_receipt: string | null;
  mpesa_result_code: number | null;
  mpesa_result_desc: string | null;
  callback_received: boolean;
  reference: string | null;
  created_at: string;
  updated_at: string;
  plan?: Pick<RadGroupReply, 'id' | 'plan_name' | 'plan_price'> | null;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: TenantProfile | null;
  tenant: Tenant | null;
  tenantUser: TenantUser | null;
  loading: boolean;
}
