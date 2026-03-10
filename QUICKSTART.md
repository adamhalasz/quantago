# Quick Start Guide

Everything is now set up and ready to deploy! 🎉

## ✅ What's Ready

- All dependencies installed
- TypeScript type checks passing
- Production builds working
- Infrastructure code configured
- GitHub Actions workflows ready
- Documentation complete

## 🚀 Deploy to Production

### Option 1: Automated Setup Script

Run the interactive setup script:

```bash
chmod +x setup.sh
./setup.sh
```

This will guide you through:
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
npx wrangler pages project create backtest-frontend
npx wrangler pages project create backtest-admin
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

### Option 3: GitHub Actions (Recommended for CI/CD)

1. Set GitHub Secrets (see `.github/SECRETS.md`)
2. Push to `main` branch
3. GitHub Actions will automatically deploy

## 📦 What to Deploy

### Backend Worker
- **API endpoints**: All backend routes
- **Workflows**: Async job processing
- **URL**: `backtest-api.workers.dev`

### Frontend Pages
- **Main app**: User interface
- **URL**: `backtest-frontend.pages.dev`

### Admin Pages
- **Admin dashboard**: Ingestion management
- **URL**: `backtest-admin.pages.dev`

## 🔑 Required Secrets

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

## 🌐 Custom Domains (Optional)

After deployment, add custom domains in Cloudflare Dashboard:
- `api.yourdomain.com` → Backend Worker
- `backtest.yourdomain.com` → Frontend Pages
- `admin.yourdomain.com` → Admin Pages

## 📊 ClickHouse Setup

Ensure database exists:
```sql
CREATE DATABASE IF NOT EXISTS market_data;
```

Schema will be auto-created on first ingestion.

## 👤 Create Admin User

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

## ✨ Next Steps

1. **Test locally**: Services are running at:
   - Backend: http://localhost:8788
   - Frontend: http://localhost:5173
   - Admin: http://localhost:5176

2. **Deploy to production**: Run `./setup.sh` or `pnpm deploy`

3. **Set up CI/CD**: Configure GitHub secrets for automated deployments

4. **Monitor**: Use `wrangler tail` to view logs

## 📚 Documentation

- **Deployment Guide**: `.github/DEPLOYMENT.md`
- **GitHub Secrets**: `.github/SECRETS.md`
- **Infrastructure**: `infra/README.md`
- **Root README**: `README.md`

## 💡 Quick Commands

```bash
# Start all services locally
pnpm dev

# Type check everything
pnpm typecheck

# Build for production
pnpm build

# Deploy everything
pnpm deploy

# Deploy individual services
pnpm deploy:backend
pnpm deploy:frontend
pnpm deploy:admin
```

## ❓ Need Help?

Check the documentation or verify:
- ✅ All secrets are set
- ✅ Database migrations are run
- ✅ ClickHouse database exists
- ✅ Logged in to Cloudflare (`wrangler whoami`)
- ✅ Pages projects are created

---

**Ready to deploy?** Run `./setup.sh` to get started! 🚀
