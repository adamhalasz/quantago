# Quick Start Guide

## Deploy to Production

### Option 1: Automated Setup Script

Run the interactive setup script:

```bash
chmod +x setup.sh
./setup.sh
```

The script covers:
- Creating Cloudflare Pages projects
- Setting worker secrets
- Deploying all services

### Option 2: Manual Deployment

#### 1. Login to Cloudflare
```bash
npx wrangler login
```

#### 2. Create Pages Projects
```bash
npx wrangler pages project create quantago-app
npx wrangler pages project create quantago-admin
```

#### 3. Run Database Migrations
```bash
export DATABASE_URL="your-production-database-url"
cd services/backend
psql "$DATABASE_URL" -f src/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f src/db/migrations/0002_better_auth.sql
psql "$DATABASE_URL" -f src/db/migrations/0003_backtest_workflows.sql
psql "$DATABASE_URL" -f src/db/migrations/0004_ingestion_metadata.sql
psql "$DATABASE_URL" -f src/db/migrations/0005_add_user_roles.sql
cd ../..
```

#### 4. Set Backend Secrets
```bash
cd services/backend
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put INGESTION_ADMIN_SECRET
wrangler secret put CLICKHOUSE_URL
wrangler secret put CLICKHOUSE_USERNAME
wrangler secret put CLICKHOUSE_PASSWORD
cd ../..
```

#### 5. Deploy All Services
```bash
pnpm run deploy:all
```

This will execute deployment scripts located in `scripts/` directory:
- `deploy-backend.sh` - Deploys the Worker API
- `deploy-frontend.sh` - Builds and deploys the frontend to Pages
- `deploy-admin.sh` - Builds and deploys the admin dashboard to Pages
- `deploy-landing.sh` - Deploys the SSR landing site to the apex domain

### Option 3: GitHub Actions

1. Set GitHub Secrets (see [docs/SECRETS.md](SECRETS.md))
2. Push to `main` branch
3. GitHub Actions will automatically deploy

## Services

### Backend Worker
- **API endpoints**: All backend routes
- **Workflows**: Async job processing
- **URL**: `quantago-api.workers.dev`

### Frontend Pages
- **Main app**: User interface
- **URL**: `quantago-app.pages.dev`

### Admin Pages
- **Admin dashboard**: Ingestion management
- **URL**: `quantago-admin.pages.dev`

### Landing Worker
- **Marketing site**: Quantago landing page and legal links
- **URL**: `quantago-web.workers.dev`

## Required Secrets

Generate secrets:
```bash
# BETTER_AUTH_SECRET
openssl rand -base64 32

# INGESTION_ADMIN_SECRET
openssl rand -base64 32
```

Set in Cloudflare:
- DATABASE_URL
- BETTER_AUTH_SECRET
- INGESTION_ADMIN_SECRET
- CLICKHOUSE_URL
- CLICKHOUSE_USERNAME
- CLICKHOUSE_PASSWORD

## Custom Domains

After deployment, add custom domains in Cloudflare Dashboard:
- `api.yourdomain.com` → Backend Worker
- `app.quantago.co` → Frontend Pages
- `admin.quantago.co` → Admin Pages
- `quantago.co` → Landing Worker

## ClickHouse Setup

Ensure database exists:
```sql
CREATE DATABASE IF NOT EXISTS market_data;
```

Schema will be auto-created on first ingestion.

## Create Admin User

After deployment, run this SQL on your production database:

```sql
-- Option 1: Update existing user to admin
UPDATE "user" SET role = 'admin' WHERE email = 'your-email@example.com';

-- Option 2: Create new admin user (requires setting password via auth API)
INSERT INTO "user" (id, email, name, email_verified, role, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'admin@example.com',
  'Admin User',
  false,
  'admin',
  NOW(),
  NOW()
);
```

## Documentation

- **Deployment Guide**: [docs/DEPLOYMENT.md](DEPLOYMENT.md)
- **GitHub Secrets**: [docs/SECRETS.md](SECRETS.md)
- **Infrastructure**: [infra/README.md](../infra/README.md)
- **Root README**: [README.md](../README.md)

## Commands

```bash
# Start all services locally
pnpm dev

# Type check everything
pnpm typecheck

# Build for production
pnpm build

# Deploy everything
pnpm run deploy:all

# Deploy individual services
pnpm deploy:backend
pnpm deploy:frontend
pnpm deploy:admin
pnpm deploy:landing
```

## Verification

Before deploying, verify:
- All required secrets are configured
- Database migrations have been applied
- The `market_data` ClickHouse database exists
- `npx wrangler whoami` succeeds
- The `quantago-app` and `quantago-admin` Pages projects exist
