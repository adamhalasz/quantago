#!/bin/bash
set -e

FRONTEND_PAGES_PROJECT="${FRONTEND_PAGES_PROJECT:-quantago-app}"

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
	echo "ℹ️  CLOUDFLARE_ACCOUNT_ID is not set. Wrangler may prompt for account selection during local deploys."
fi

echo "🚢 Deploying frontend..."
echo "Building..."
pnpm --filter @quantago/frontend build
echo "Ensuring Cloudflare Pages project exists..."
pnpm --dir services/frontend exec wrangler pages project create "$FRONTEND_PAGES_PROJECT" --production-branch main || true
echo "Deploying to Cloudflare Pages..."
pnpm --dir services/frontend exec wrangler pages deploy dist --project-name="$FRONTEND_PAGES_PROJECT"
echo "✅ Frontend deployed successfully!"
