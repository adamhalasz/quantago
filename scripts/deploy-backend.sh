#!/bin/bash
set -e

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
	echo "ℹ️  CLOUDFLARE_ACCOUNT_ID is not set. Wrangler may prompt for account selection during local deploys."
fi

echo "🚢 Deploying backend..."
cd services/backend
pnpm exec wrangler deploy
cd ../..
echo "✅ Backend deployed successfully!"
