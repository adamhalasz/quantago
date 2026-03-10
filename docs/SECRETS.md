# GitHub Secrets Quick Reference

Copy and paste this checklist when setting up your repository secrets.

## Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

### Cloudflare Credentials

```
Name: CLOUDFLARE_API_TOKEN
Value: [Get from: https://dash.cloudflare.com/profile/api-tokens]
```

```
Name: CLOUDFLARE_ACCOUNT_ID
Value: [Get from: Cloudflare Dashboard → Account ID in sidebar]
```

### Database Credentials

```
Name: DATABASE_URL
Value: postgresql://username:password@host:5432/database?sslmode=require
```

```
Name: CLICKHOUSE_URL
Value: https://your-instance.clickhouse.cloud:8443
```

```
Name: CLICKHOUSE_USERNAME
Value: default
```

```
Name: CLICKHOUSE_PASSWORD
Value: your-clickhouse-password
```

### Authentication Secrets

```
Name: BETTER_AUTH_SECRET
Generate: openssl rand -base64 32
Value: [paste generated value]
```

```
Name: INGESTION_ADMIN_SECRET
Generate: openssl rand -base64 32
Value: [paste generated value]
```

### Frontend Configuration

```
Name: VITE_API_URL
Value: https://api.backtest.yourdomain.com
```

## Verification

After adding all secrets, they should appear in your secrets list (values are hidden):

- ✅ CLOUDFLARE_API_TOKEN
- ✅ CLOUDFLARE_ACCOUNT_ID
- ✅ DATABASE_URL
- ✅ CLICKHOUSE_URL
- ✅ CLICKHOUSE_USERNAME
- ✅ CLICKHOUSE_PASSWORD
- ✅ BETTER_AUTH_SECRET
- ✅ INGESTION_ADMIN_SECRET
- ✅ VITE_API_URL

Backend runtime secrets are required in GitHub only if the workflow should create or rotate Cloudflare Worker secrets.
If the Worker secrets are already configured in Cloudflare, the backend deploy job can run without the database and ClickHouse secrets in GitHub.

## Optional: Pulumi Secrets

If using Pulumi for infrastructure management:

```
Name: PULUMI_ACCESS_TOKEN
Value: [Get from: Pulumi Cloud dashboard]
```

## Test Deployment

After setting secrets, push to `main` branch or manually trigger the workflow:
1. Go to Actions tab
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Monitor deployment progress
