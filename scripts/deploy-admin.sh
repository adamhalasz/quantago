#!/bin/bash
set -e

ADMIN_PAGES_PROJECT="${ADMIN_PAGES_PROJECT:-quantago-admin}"

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
	echo "ℹ️  CLOUDFLARE_ACCOUNT_ID is not set. Wrangler may prompt for account selection during local deploys."
fi

echo "🚢 Deploying admin..."
echo "Building..."
pnpm --filter @quantago/admin build
echo "Ensuring Cloudflare Pages project exists..."
pnpm --dir services/admin exec wrangler pages project create "$ADMIN_PAGES_PROJECT" --production-branch main || true
echo "Deploying to Cloudflare Pages..."
pnpm --dir services/admin exec wrangler pages deploy dist --project-name="$ADMIN_PAGES_PROJECT"
echo "✅ Admin deployed successfully!"
