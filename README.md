# C6 Association OS

Multi-tenant platform for associations (SAFPA, chambers, liquor traders, professional bodies).

## What it does

- White-label directory for association members
- SaaS tools for businesses (AI SEO, review automation)
- Automatic commission splitting (association gets 5%)
- One customer identity across both marketplaces

## Tech Stack

- Cloudflare Workers (API)
- Cloudflare D1 (Database)
- Cloudflare Pages (Frontend - coming soon)
- GitHub Actions (Auto-deploy)

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|---------------|
| GET | `/api/tenants/:subdomain` | Get tenant by subdomain |
| POST | `/api/checkout` | Create checkout (prevents double subs) |
| POST | `/api/tenants` | Create new tenant |
| GET | `/api/analytics/:tenantId` | Get metrics |
| GET | `/api/health` | Health check |

## Deployment

Push to `main` branch. GitHub Actions auto-deploys to Cloudflare.

## Environment Variables

| Secret | What it is |
|--------|------------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |

## Adding a new association

```bash
curl -X POST https://api.c6group.co.za/tenants \
  -d '{"name":"SAFPA","domain":"safpa","admin_email":"admin@safpa.org"}'
