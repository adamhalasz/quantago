#!/bin/bash
set -e

DOCS_PAGES_PROJECT="${DOCS_PAGES_PROJECT:-quantago-docs}"

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
	echo "ℹ️  CLOUDFLARE_ACCOUNT_ID is not set. Wrangler may prompt for account selection during local deploys."
fi

echo "🚢 Deploying docs..."
echo "Building..."
pnpm --filter @quantago/docs build
echo "Ensuring Cloudflare Pages project exists..."
pnpm --dir services/docs exec wrangler pages project create "$DOCS_PAGES_PROJECT" --production-branch main || true
echo "Deploying to Cloudflare Pages..."
pnpm --dir services/docs exec wrangler pages deploy build --project-name="$DOCS_PAGES_PROJECT"
echo "✅ Docs deployed successfully!"