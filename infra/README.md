# Backtest Infrastructure

This directory contains Pulumi infrastructure-as-code for deploying the backtest platform to Cloudflare.

## Prerequisites

1. **Pulumi CLI**: Install from https://www.pulumi.com/docs/get-started/install/
2. **Cloudflare Account**: Sign up at https://cloudflare.com
3. **Cloudflare API Token**: Create a token with the following permissions:
   - Account: Cloudflare Workers Scripts (Edit)
   - Account: Cloudflare Pages (Edit)
   - Zone: DNS (Edit)
   - Zone: Workers Routes (Edit)

## Setup

1. **Install dependencies**:
   ```bash
   cd infra
   pnpm install
   ```

2. **Login to Pulumi**:
   ```bash
   pulumi login
   ```

3. **Create a new stack**:
   ```bash
   pulumi stack init prod
   ```

4. **Configure Cloudflare provider**:
   ```bash
   export CLOUDFLARE_API_TOKEN="your-api-token"
   ```

5. **Set required configuration**:
   ```bash
   pulumi config set cloudflareAccountId YOUR_ACCOUNT_ID
   pulumi config set zoneName your-domain.com
   pulumi config set frontendOrigin https://backtest.your-domain.com
   pulumi config set betterAuthUrl https://api.backtest.your-domain.com
   ```

6. **Set secrets**:
   ```bash
   pulumi config set --secret databaseUrl "postgresql://..."
   pulumi config set --secret betterAuthSecret "your-secret-key"
   pulumi config set --secret ingestionAdminSecret "your-admin-secret"
   pulumi config set --secret clickhouseUrl "https://..."
   pulumi config set --secret clickhouseUsername "default"
   pulumi config set --secret clickhousePassword "your-password"
   ```

## Deployment

### Preview changes
```bash
pulumi preview
```

### Deploy infrastructure
```bash
pulumi up
```

### Destroy infrastructure
```bash
pulumi destroy
```

## Resources Created

### Backend Worker
- **Name**: `backtest-api`
- **Domain**: `api.your-domain.com`
- **Features**:
  - Cloudflare Workflows for async job processing
  - Environment variables and secrets
  - Custom domain routing

### Frontend Pages
- **Name**: `backtest-frontend`
- **Domain**: `backtest.your-domain.com`
- **Build**: Vite build from `services/frontend`

### Admin Pages
- **Name**: `backtest-admin`
- **Domain**: `admin.your-domain.com`
- **Build**: Vite build from `services/admin`

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys changes on push to `main` branch.

Required GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `PULUMI_ACCESS_TOKEN`

Optional (if using Pulumi Cloud):
- `PULUMI_STACK_NAME` (default: `prod`)

## Manual Deployment

If you prefer to deploy services individually without Pulumi:

### Backend Worker
```bash
cd services/backend
wrangler deploy
```

### Frontend Pages
```bash
cd services/frontend
pnpm build
wrangler pages deploy dist --project-name backtest-frontend
```

### Admin Pages
```bash
cd services/admin
pnpm build
wrangler pages deploy dist --project-name backtest-admin
```

## Troubleshooting

### Secrets not updating
Worker secrets are immutable in Pulumi. To update a secret:
1. Use `wrangler secret put SECRET_NAME` directly, or
2. Update via Cloudflare dashboard, or
3. Destroy and recreate the worker

### Custom domains not working
Ensure your domain is:
1. Added to Cloudflare
2. DNS is active (not just proxied)
3. SSL/TLS mode is set to "Full" or "Full (strict)"

### Build failures
Check that:
1. Node version is 20 or higher
2. All dependencies are in package.json
3. Build commands are correct for your monorepo structure
