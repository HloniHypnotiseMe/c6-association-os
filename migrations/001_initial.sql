-- C6 Association OS - Main Database Schema
-- Run once. Never touch again.

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT,
  brand_color_primary TEXT DEFAULT '#4B1D6B',
  brand_color_accent TEXT DEFAULT '#D4AF37',
  domain TEXT UNIQUE,
  referral_code TEXT UNIQUE,
  commission_percent INTEGER DEFAULT 5,
  member_referral_percent INTEGER DEFAULT 10,
  setup_fee INTEGER DEFAULT 150000,
  subscription_price INTEGER DEFAULT 79900,
  marketplace_source TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unified_customers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  business_name TEXT,
  phone TEXT,
  first_source TEXT,
  is_association_member BOOLEAN DEFAULT FALSE,
  association_id TEXT,
  association_member_code TEXT,
  has_active_saas BOOLEAN DEFAULT FALSE,
  active_saas_tenant_id TEXT,
  saas_plan TEXT,
  owns_association_os BOOLEAN DEFAULT FALSE,
  owned_tenant_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  product_type TEXT,
  product_id TEXT,
  amount INTEGER,
  status TEXT,
  current_period_end TIMESTAMP,
  remotepay_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, product_type, status)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  event_type TEXT,
  customer_email TEXT,
  referrer TEXT,
  amount INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communication_log (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  channel TEXT,
  direction TEXT,
  template_id TEXT,
  content TEXT,
  status TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  user_role TEXT,
  tenant_id TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo tenant
INSERT INTO tenants (id, name, domain, referral_code, marketplace_source) 
VALUES ('safpa', 'SAFPA', 'safpa.c6group.co.za', 'SAFPA2026', 'c6group')
ON CONFLICT DO NOTHING;

-- Indexes for speed
CREATE INDEX IF NOT EXISTS idx_customer_email ON unified_customers(email);
CREATE INDEX IF NOT EXISTS idx_subscription_customer ON customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_email, created_at);
CREATE INDEX IF NOT EXISTS idx_comms_customer ON communication_log(customer_id, sent_at);
