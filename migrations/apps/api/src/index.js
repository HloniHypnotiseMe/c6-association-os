// C6 Association OS - Main API Worker
// Handles tenants, customers, subscriptions, webhooks

import { Router } from 'itty-router';

const router = Router();

// Health check endpoint
router.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Get tenant by subdomain
router.get('/api/tenants/:subdomain', async (request, env) => {
  const { subdomain } = request.params;
  
  const tenant = await env.DB.prepare(
    'SELECT * FROM tenants WHERE domain = ? OR id = ?'
  ).bind(subdomain, subdomain).first();
  
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404 });
  }
  
  // Try to get customer from auth header (if logged in)
  const email = request.headers.get('X-User-Email');
  let customer = null;
  
  if (email) {
    customer = await env.DB.prepare(
      'SELECT * FROM unified_customers WHERE email = ?'
    ).bind(email).first();
  }
  
  return new Response(JSON.stringify({ ...tenant, customer }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Checkout - prevents double subscriptions
router.post('/api/checkout', async (request, env) => {
  const { product_type, email, plan } = await request.json();
  
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });
  }
  
  // Check if customer already has active subscription
  const existing = await env.DB.prepare(`
    SELECT cs.*, uc.business_name 
    FROM customer_subscriptions cs
    JOIN unified_customers uc ON cs.customer_id = uc.id
    WHERE uc.email = ? AND cs.product_type = ? AND cs.status = 'active'
  `).bind(email, product_type).first();
  
  if (existing) {
    return new Response(JSON.stringify({ 
      error: 'already_subscribed',
      message: `You already have an active ${product_type} subscription`,
      dashboard_url: '/dashboard'
    }), { status: 409 });
  }
  
  // Get or create customer
  let customer = await env.DB.prepare(
    'SELECT * FROM unified_customers WHERE email = ?'
  ).bind(email).first();
  
  if (!customer) {
    const customerId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO unified_customers (id, email, first_source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(customerId, email, request.headers.get('Origin'), Date.now(), Date.now()).run();
    
    customer = { id: customerId, email };
  }
  
  // Calculate price (R799 for SaaS, R2500 for association OS)
  const price = product_type === 'saas' ? 79900 : 250000;
  
  // Log analytics event
  await env.DB.prepare(`
    INSERT INTO analytics_events (id, tenant_id, event_type, customer_email, amount, created_at)
    VALUES (?, ?, 'checkout_started', ?, ?, ?)
  `).bind(crypto.randomUUID(), null, email, price, Date.now()).run();
  
  // Return checkout session (RemotePay will be added later)
  return new Response(JSON.stringify({
    success: true,
    message: 'Checkout session created',
    amount: price,
    customer_id: customer.id,
    checkout_url: `/checkout/${crypto.randomUUID()}`
  }), { headers: { 'Content-Type': 'application/json' } });
});

// Create new tenant (for testing)
router.post('/api/tenants', async (request, env) => {
  const { name, domain, referral_code, admin_email } = await request.json();
  
  if (!name || !domain) {
    return new Response(JSON.stringify({ error: 'Name and domain required' }), { status: 400 });
  }
  
  const tenantId = domain.toLowerCase().replace(/[^a-z]/g, '');
  const code = referral_code || `${tenantId.toUpperCase()}2026`;
  
  await env.DB.prepare(`
    INSERT INTO tenants (id, name, domain, referral_code, marketplace_source, created_at)
    VALUES (?, ?, ?, ?, 'c6group', ?)
  `).bind(tenantId, name, `${domain}.c6group.co.za`, code, Date.now()).run();
  
  // Audit log
  await env.DB.prepare(`
    INSERT INTO audit_log (id, user_email, user_role, tenant_id, action, resource_type, resource_id, created_at)
    VALUES (?, ?, 'admin', ?, 'create_tenant', 'tenant', ?, ?)
  `).bind(crypto.randomUUID(), admin_email || 'system', tenantId, tenantId, Date.now()).run();
  
  return new Response(JSON.stringify({ 
    success: true, 
    tenant_id: tenantId,
    domain: `${domain}.c6group.co.za`,
    referral_code: code
  }), { headers: { 'Content-Type': 'application/json' } });
});

// Analytics endpoint
router.get('/api/analytics/:tenantId', async (request, env) => {
  const { tenantId } = request.params;
  
  const events = await env.DB.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(CASE WHEN event_type = 'checkout_started' THEN 1 END) as checkouts,
      COUNT(CASE WHEN event_type = 'subscription_created' THEN 1 END) as conversions
    FROM analytics_events
    WHERE tenant_id = ? OR tenant_id IS NULL
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `).bind(tenantId).all();
  
  return new Response(JSON.stringify({ metrics: events.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Catch all - 404
router.all('*', () => {
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
});

// Export worker
export default {
  async fetch(request, env) {
    // Add CORS headers
    const response = await router.handle(request, env);
    
    if (response) {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-User-Email');
    }
    
    return response;
  }
};
