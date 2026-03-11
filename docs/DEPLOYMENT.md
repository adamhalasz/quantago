---
id: self-hosting-deployment
slug: /self-hosting/deployment
sidebar_label: Deployment
description: Step-by-step guide for deploying Quantago as a self-hosted stack.
---

# Self-Hosting Deployment

This guide is the operational companion to the architecture page. Use it when you want to run the full Quantago stack yourself on Cloudflare Workers and Pages, backed by PostgreSQL and ClickHouse.

## Before You Deploy

You need:

- a Cloudflare account with Workers and Pages enabled
- a PostgreSQL database
- a ClickHouse database
- a GitHub repository if you want CI/CD
- a domain if you want production hostnames instead of provider defaults

## Services You Will Deploy

- backend API Worker
- frontend app on Pages
- optional admin app on Pages
- docs site on Pages
- optional landing Worker

## Required Runtime Configuration

### Backend secrets

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `INGESTION_ADMIN_SECRET`
- `CLICKHOUSE_URL`
- `CLICKHOUSE_USERNAME`
- `CLICKHOUSE_PASSWORD`

Generate the secret values with:

```bash
openssl rand -base64 32
```

### Backend non-secret vars

- `BETTER_AUTH_URL`
- `FRONTEND_ORIGIN`
- `ADMIN_ORIGIN`

### Frontend and admin build vars

- `VITE_API_URL`

## Database Setup

### PostgreSQL migrations

```bash
export DATABASE_URL="your-production-database-url"
cd services/backend
psql "$DATABASE_URL" -f src/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f src/db/migrations/0002_better_auth.sql
psql "$DATABASE_URL" -f src/db/migrations/0003_backtest_workflows.sql
psql "$DATABASE_URL" -f src/db/migrations/0004_ingestion_metadata.sql
psql "$DATABASE_URL" -f src/db/migrations/0005_add_user_roles.sql
psql "$DATABASE_URL" -f src/db/migrations/0006_strategy_registry.sql
```

### ClickHouse bootstrap

Create the market data database if needed:

```sql
CREATE DATABASE IF NOT EXISTS market_data;
```

The schema is created by the backend on first ingestion.

## Cloudflare Pages Projects

Create Pages projects before the first deploy:

```bash
cd services/frontend
pnpm build
npx wrangler pages project create ${FRONTEND_PAGES_PROJECT:-quantago-app}

cd ../admin
pnpm build
npx wrangler pages project create ${ADMIN_PAGES_PROJECT:-quantago-admin}

cd ../docs
pnpm build
npx wrangler pages project create ${DOCS_PAGES_PROJECT:-quantago-docs}
```

The deploy scripts default to `quantago-app`, `quantago-admin`, and `quantago-docs`, but those names can be overridden with environment variables.

## Deploy Order

1. Provision databases.
2. Run PostgreSQL migrations.
3. Configure backend secrets and trusted origins.
4. Create Pages projects.
5. Deploy the backend.
6. Deploy frontend, admin, docs, and landing.

## Deploy Commands

From the repository root:

```bash
pnpm deploy:backend
pnpm deploy:frontend
pnpm deploy:admin
pnpm deploy:docs
pnpm deploy:landing
```

Or deploy everything together:

```bash
pnpm run deploy:all
```

## Custom Domains

Recommended production hostnames:

- `api.quantago.co` for the API
- `app.quantago.co` for the frontend
- `admin.quantago.co` for the admin app
- `docs.quantago.co` for the docs site
- `quantago.co` for the landing site

## Verification Checklist

- `curl https://api.your-domain.com/api/health` returns `{ "ok": true }`
- the frontend can authenticate against the backend without CORS or cookie issues
- `/api/session` returns a user for authenticated requests
- market data queries return ticks
- backtests can be queued and advance beyond the initial `pending` state
- admin-only routes reject non-admin users

## Common Failure Modes

- wrong `BETTER_AUTH_URL`, `FRONTEND_ORIGIN`, or `ADMIN_ORIGIN`
- missing Pages projects
- missing ClickHouse credentials
- missing workflow binding or database migrations

Pair this guide with [Self-Hosting Architecture](/self-hosting/architecture).