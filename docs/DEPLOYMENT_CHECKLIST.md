# Deployment Checklist

Use this checklist before and during deployment.

## Pre-Deployment

### Local Environment
- [x] All dependencies installed (`pnpm install`)
- [x] TypeScript type checks pass (`pnpm typecheck`)
- [x] All services build successfully (`pnpm build`)
- [x] Linting passes (`pnpm lint`)
- [ ] Local services running and tested
  - [ ] Backend: http://localhost:8788
  - [ ] Frontend: http://localhost:5173
  - [ ] Admin: http://localhost:5176

### Database Setup
- [ ] Production PostgreSQL database created (Neon)
- [ ] Database migrations executed
- [ ] Database connection string ready
- [ ] Admin user will be created after deployment

### ClickHouse Setup
- [ ] ClickHouse instance provisioned
- [ ] Database `market_data` created
- [ ] Connection credentials ready
- [ ] Network access configured

### Cloudflare Setup
- [ ] Cloudflare account created
- [ ] Domain added to Cloudflare (optional)
- [ ] API token generated with correct permissions
- [ ] Account ID obtained

## Deployment Setup

### Cloudflare Authentication
- [ ] Run `npx wrangler login`
- [ ] Verify: `npx wrangler whoami`

### Create Projects
- [ ] Frontend Pages project created (`quantago-app`)
- [ ] Admin Pages project created (`quantago-admin`)

### Backend Secrets
Set these with `cd services/backend && wrangler secret put SECRET_NAME`:
- [ ] DATABASE_URL
- [ ] BETTER_AUTH_SECRET (generate: `openssl rand -base64 32`)
- [ ] INGESTION_ADMIN_SECRET (generate: `openssl rand -base64 32`)
- [ ] CLICKHOUSE_URL
- [ ] CLICKHOUSE_USERNAME
- [ ] CLICKHOUSE_PASSWORD

### Update Configuration
- [ ] Update `services/backend/wrangler.jsonc` vars:
  - [ ] BETTER_AUTH_URL (production URL)
  - [ ] FRONTEND_ORIGIN (production URL)
- [ ] Verify environment variables are correct

## Deployment

### Option 1: Interactive Script
- [ ] Run `./setup.sh`
- [ ] Follow prompts
- [ ] Verify deployment URLs

### Option 2: Manual Deployment
- [ ] Deploy backend: `cd services/backend && npx wrangler deploy`
- [ ] Build frontend: `cd services/frontend && pnpm build`
- [ ] Deploy frontend: `cd services/frontend && npx wrangler pages deploy dist --project-name=quantago-app`
- [ ] Build admin: `cd services/admin && pnpm build`
- [ ] Deploy admin: `cd services/admin && npx wrangler pages deploy dist --project-name=quantago-admin`
- [ ] Deploy landing: `cd services/landing && npx wrangler deploy`

Or use the convenience script: `pnpm run deploy:all`

### Option 3: GitHub Actions
- [ ] Set all GitHub secrets (see [docs/SECRETS.md](SECRETS.md))
- [ ] Push to main branch
- [ ] Monitor GitHub Actions workflow
- [ ] Verify deployment succeeded

## Post-Deployment

### Verification
- [ ] Backend health check: `curl https://api.yourdomain.com/api/health`
- [ ] Frontend loads: https://app.quantago.co
- [ ] Admin login works: https://admin.quantago.co
- [ ] Landing loads: https://quantago.co
- [ ] Test authentication flow
- [ ] Test admin ingestion trigger

### Create Admin User
Run on production database:
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Custom Domains (Optional)
- [ ] Configure DNS records in Cloudflare
- [ ] Add custom domain to backend worker
- [ ] Add custom domain to frontend Pages
- [ ] Add custom domain to admin Pages
- [ ] Verify SSL certificates provisioned
- [ ] Update CORS and auth URLs

### Monitoring
- [ ] View backend logs: `cd services/backend && npx wrangler tail`
- [ ] Check Pages deployment logs in Dashboard
- [ ] Set up alerts for errors
- [ ] Monitor database connections
- [ ] Monitor ClickHouse usage

## GitHub CI/CD Setup

### Repository Secrets
Go to: Settings → Secrets and variables → Actions

- [ ] CLOUDFLARE_API_TOKEN
- [ ] DATABASE_URL
- [ ] BETTER_AUTH_SECRET
- [ ] INGESTION_ADMIN_SECRET
- [ ] CLICKHOUSE_URL
- [ ] CLICKHOUSE_USERNAME
- [ ] CLICKHOUSE_PASSWORD
- [ ] VITE_API_URL

### Workflow Verification
- [ ] `.github/workflows/deploy.yml` configured
- [ ] `.github/workflows/pr-check.yml` configured
- [ ] Test PR workflow with a test PR
- [ ] Verify main deployment workflow works

## Security Review

- [ ] All secrets stored securely (not in code)
- [ ] CORS origins restricted to production domains
- [ ] Database uses SSL/TLS
- [ ] ClickHouse has strong authentication
- [ ] Admin role enforcement working
- [ ] API rate limiting configured (if needed)
- [ ] Cloudflare WAF rules reviewed (optional)

## Performance Optimization

- [ ] Review bundle sizes (frontend: 1.9MB, admin: 261KB)
- [ ] Consider code splitting for large chunks
- [ ] Enable Cloudflare caching rules
- [ ] Configure CDN settings
- [ ] Test page load times

## Documentation

- [ ] Update README.md with production URLs
- [ ] Document any custom configuration
- [ ] Share credentials securely with team
- [ ] Document rollback procedure
- [ ] Create runbook for common issues

## Rollback Plan

In case of issues:
- [ ] Know how to rollback: `cd services/backend && npx wrangler rollback`
- [ ] Pages rollback: Cloudflare Dashboard → Pages → Deployments
- [ ] Database backup available
- [ ] Team knows the rollback procedure

---

## Quick Deploy Command

After completing pre-deployment:
```bash
./setup.sh
```

Or manually:
```bash
pnpm run deploy:all
```

---

**Status**: Check off items as you complete them!
