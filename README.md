# Backtest Monorepo

This repository is organized as separate services under `services/`.

## Layout

- `services/frontend` — Vite + React client (main application)
- `services/backend` — Cloudflare Workers + Hono API
- `services/admin` — Admin dashboard for ingestion management
- `infra` — Pulumi infrastructure-as-code for Cloudflare
- `shared` — shared types and non-UI utilities
- `docs` — repository-level docs and archived legacy assets

## Quick Start

### Local Development

**Frontend**:
```bash
cd services/frontend
pnpm install
pnpm dev  # http://localhost:5173
```

**Backend**:
```bash
cd services/backend
pnpm install
pnpm dev  # http://localhost:8788
```

**Admin Dashboard**:
```bash
cd services/admin
pnpm install
pnpm dev  # http://localhost:5176
```

Login with:
- Email: `adamfsh@gmail.com`
- Password: `123123`

### Validation

Run type checking and linting:

```bash
cd services/frontend && pnpm check
cd services/backend && pnpm check
cd services/admin && pnpm check
```

## Deployment

See [`.github/DEPLOYMENT.md`](.github/DEPLOYMENT.md) for comprehensive deployment guide.

### GitHub Secrets Required

Set these secrets in your GitHub repository for automated deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `INGESTION_ADMIN_SECRET`
- `CLICKHOUSE_URL`
- `CLICKHOUSE_USERNAME`
- `CLICKHOUSE_PASSWORD`
- `VITE_API_URL`

See [`.github/SECRETS.md`](.github/SECRETS.md) for quick reference.

### Manual Deployment

**All services**:
```bash
pnpm run deploy:all
```

**Individual services**:
```bash
# Backend
pnpm run deploy:backend

# Frontend
pnpm run deploy:frontend

# Admin
pnpm run deploy:admin
```

## Infrastructure

Pulumi-based infrastructure management in [`infra/`](infra/)

```bash
cd infra
pnpm install
pulumi preview  # Preview changes
pulumi up       # Deploy infrastructure
```

## Architecture

- **Backend**: Cloudflare Workers with Workflows for async job processing
- **Frontend**: React SPA deployed to Cloudflare Pages
- **Admin**: React admin dashboard deployed to Cloudflare Pages
- **Database**: Neon PostgreSQL for metadata and auth
- **Data Store**: ClickHouse for OHLCV market data
- **Auth**: better-auth with email/password and role-based access

## Workflows

The backend includes Cloudflare Workflows for:
- Backtest execution
- Bulk historical data ingestion
- Incremental sync
- Symbol backfill

## Admin Features

The admin dashboard provides:
- Manual ingestion triggers
- Real-time SSE event monitoring
- Ingestion job status tracking
- Admin-only role-based access