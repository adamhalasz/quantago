# Deployment Guide

This document describes how to deploy the backtest platform to production using GitHub Actions and Cloudflare.

## Prerequisites

1. **Cloudflare Account** with Workers and Pages enabled
2. **GitHub Repository** with Actions enabled
3. **Neon PostgreSQL** database
4. **ClickHouse** database
5. **Domain name** (optional, but recommended)

## GitHub Secrets Setup

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers/Pages permissions | `your-cloudflare-api-token` |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | `abc123def456` |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `BETTER_AUTH_SECRET` | Secret key for auth sessions (min 32 chars) | `your-random-secret-key-here` |
| `INGESTION_ADMIN_SECRET` | Secret for ingestion admin endpoints | `your-ingestion-secret` |
| `CLICKHOUSE_URL` | ClickHouse HTTP endpoint | `https://your-clickhouse.cloud:8443` |
| `CLICKHOUSE_USERNAME` | ClickHouse username | `default` |
| `CLICKHOUSE_PASSWORD` | ClickHouse password | `your-password` |
| `VITE_API_URL` | Production API URL for frontend | `https://api.backtest.yourdomain.com` |

### How to Get Cloudflare Credentials

1. **API Token**:
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use "Edit Cloudflare Workers" template
   - Add permissions for:
     - Account: Workers Scripts (Edit)
     - Account: Cloudflare Pages (Edit)
     - Zone: Workers Routes (Edit)

2. **Account ID**:
   - Go to https://dash.cloudflare.com
   - Select your domain
   - Scroll down to "Account ID" on the right sidebar
   - Copy the Account ID

### Generate Secrets

```bash
# Generate a random secret for BETTER_AUTH_SECRET
openssl rand -base64 32

# Generate a random secret for INGESTION_ADMIN_SECRET
openssl rand -base64 32
```

## Deployment Workflow

The platform uses GitHub Actions for CI/CD. On every push to `main`:

1. **Run Tests** - Type checking, linting, and unit tests
2. **Deploy Backend** - Cloudflare Workers deployment
3. **Deploy Frontend** - Cloudflare Pages deployment
4. **Deploy Admin** - Cloudflare Pages deployment

### Manual Deployment Trigger

You can manually trigger deployments from GitHub:
1. Go to Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select branch and run

## Cloudflare Pages Setup

Before the first deployment, you need to create Pages projects:

### Option 1: Via Wrangler CLI

```bash
# Create frontend project
cd services/frontend
pnpm build
npx wrangler pages project create backtest-frontend

# Create admin project
cd ../admin
pnpm build
npx wrangler pages project create backtest-admin
```

### Option 2: Via Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Select "Workers & Pages"
3. Create two new Pages projects:
   - `backtest-frontend`
   - `backtest-admin`

## Custom Domains (Optional)

### Setup DNS Records

Add these DNS records in Cloudflare:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | `api` | `backtest-api.workers.dev` | Proxied |
| CNAME | `backtest` | `backtest-frontend.pages.dev` | Proxied |
| CNAME | `admin` | `backtest-admin.pages.dev` | Proxied |

### Configure Custom Domains

#### Backend Worker (API)
```bash
cd services/backend
npx wrangler deploy
npx wrangler domains add api.yourdomain.com
```

#### Frontend Pages
1. Go to Cloudflare Dashboard → Pages → backtest-frontend
2. Click "Custom domains"
3. Add `backtest.yourdomain.com`

#### Admin Pages
1. Go to Cloudflare Dashboard → Pages → backtest-admin
2. Click "Custom domains"
3. Add `admin.yourdomain.com`

## Environment Variables

### Backend Worker

Set production environment variables:

```bash
cd services/backend

# Set vars (non-secret)
npx wrangler secret put BETTER_AUTH_URL
# Enter: https://api.yourdomain.com

npx wrangler secret put FRONTEND_ORIGIN
# Enter: https://backtest.yourdomain.com

# Set secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put INGESTION_ADMIN_SECRET
npx wrangler secret put CLICKHOUSE_URL
npx wrangler secret put CLICKHOUSE_USERNAME
npx wrangler secret put CLICKHOUSE_PASSWORD
```

### Frontend/Admin Pages

Environment variables are set in the build step via GitHub Actions.
You can also set them in Cloudflare Dashboard → Pages → Settings → Environment variables.

## Database Migrations

Run migrations on production database:

```bash
# Connect to production database
export DATABASE_URL="your-production-database-url"

# Run migrations
cd services/backend
psql "$DATABASE_URL" -f src/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f src/db/migrations/0002_better_auth.sql
psql "$DATABASE_URL" -f src/db/migrations/0003_backtest_workflows.sql
psql "$DATABASE_URL" -f src/db/migrations/0004_ingestion_metadata.sql
psql "$DATABASE_URL" -f src/db/migrations/0005_add_user_roles.sql
```

## ClickHouse Setup

Ensure your ClickHouse instance has:

1. **Database created**:
   ```sql
   CREATE DATABASE IF NOT EXISTS market_data;
   ```

2. **Schema will be auto-created** by the backend on first ingestion

## Initial Admin User

After deployment, create your admin user:

```sql
-- Connect to production Neon database
INSERT INTO "user" (id, email, name, email_verified, role, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'your-email@example.com',
  'Your Name',
  false,
  'admin',
  NOW(),
  NOW()
);

-- Set password via better-auth API or directly in database
-- Recommended: Use the signup endpoint and then update role
```

Or update existing user to admin:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Monitoring

### View Logs

**Backend Worker Logs**:
```bash
cd services/backend
npx wrangler tail
```

**Pages Deployment Logs**:
- Go to Cloudflare Dashboard → Pages
- Select project → Deployments
- Click on deployment to view logs

### Health Check

After deployment, verify services are running:

```bash
# Backend API
curl https://api.yourdomain.com/api/health

# Frontend
curl https://backtest.yourdomain.com

# Admin
curl https://admin.yourdomain.com
```

## Rollback

If a deployment fails or causes issues:

1. **Backend Worker**:
   ```bash
   cd services/backend
   npx wrangler rollback
   ```

2. **Pages Projects**:
   - Go to Cloudflare Dashboard → Pages
   - Select project → Deployments
   - Click "⋯" next to previous working deployment
   - Click "Rollback to this deployment"

## Troubleshooting

### Build Failures

- Check GitHub Actions logs for specific errors
- Verify all secrets are set correctly
- Ensure pnpm-lock.yaml is committed

### Worker Not Updating

- Check that wrangler.jsonc name matches deployed worker
- Verify CLOUDFLARE_API_TOKEN has correct permissions
- Try manual deployment: `cd services/backend && npx wrangler deploy`

### Pages Build Errors

- Ensure build command is correct in workflow
- Check node version compatibility (should be 20+)
- Verify environment variables are set

### SSL/TLS Issues

- Ensure Cloudflare SSL/TLS mode is "Full (strict)"
- Wait up to 24 hours for SSL certificates to provision
- Check DNS propagation with `dig yourdomain.com`

## Cost Estimates

**Cloudflare Workers/Pages**:
- Free tier: 100,000 requests/day
- Paid tier: $5/month for 10M requests

**Neon PostgreSQL**:
- Free tier: 512MB storage, 1 compute
- Pro tier: $19/month

**ClickHouse Cloud**:
- Varies by usage, typically $50-200/month

## Security Checklist

- [ ] All secrets are set in GitHub Secrets (never in code)
- [ ] BETTER_AUTH_SECRET is at least 32 characters
- [ ] Database uses SSL/TLS connections
- [ ] CORS origins are restricted to your domains
- [ ] Admin users are manually created (no signup)
- [ ] ClickHouse uses strong authentication
- [ ] Environment-specific configs are separate
- [ ] API tokens have minimal required permissions

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review Cloudflare Worker logs (`wrangler tail`)
3. Verify all secrets and environment variables
4. Test locally with `pnpm dev` before deploying
