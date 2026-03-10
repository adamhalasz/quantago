#!/bin/bash
set -e

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
	echo "ℹ️  CLOUDFLARE_ACCOUNT_ID is not set. Wrangler may prompt for account selection during local deploys."
fi

echo "🚢 Deploying landing site..."
cd services/landing
pnpm exec wrangler deploy
cd ../..
echo "✅ Landing site deployed successfully!"