---
id: secrets
slug: /secrets
sidebar_label: Secrets
description: GitHub Actions and deployment secret reference for Quantago.
unlisted: true
---

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
Value: [Set as a GitHub environment secret]
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
Value: https://api.quantago.co
```

The backend deployment must also use non-secret runtime variables for:

- `BETTER_AUTH_URL`
- `FRONTEND_ORIGIN`
- `ADMIN_ORIGIN`

Recommended GitHub placement:

- `VITE_API_URL` as a `production` environment secret or variable
- `BETTER_AUTH_URL` as a `production` environment variable
- `FRONTEND_ORIGIN` as a `production` environment variable
- `ADMIN_ORIGIN` as a `production` environment variable

## Verification

After adding all secrets, they should appear in your secrets list (values are hidden):

- ✅ CLOUDFLARE_API_TOKEN
- ✅ DATABASE_URL
- ✅ CLICKHOUSE_URL
- ✅ CLICKHOUSE_USERNAME
- ✅ CLICKHOUSE_PASSWORD
- ✅ BETTER_AUTH_SECRET
- ✅ INGESTION_ADMIN_SECRET
- ✅ VITE_API_URL

Backend runtime secrets are required in GitHub only if the workflow should create or rotate Cloudflare Worker secrets.
If the Worker secrets are already configured in Cloudflare, the backend deploy job can run without the database and ClickHouse secrets in GitHub.

For a public repository, store deployment credentials in the GitHub `production` environment instead of repository-wide secrets whenever possible.

Recommended GitHub setup:
- Put `CLOUDFLARE_API_TOKEN` in the `production` environment secrets
- Put `CLOUDFLARE_ACCOUNT_ID` in the `production` environment variables or secrets
- Require reviewers for the `production` environment
- Restrict deployments to the `main` branch only

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
