#!/bin/bash
set -e

echo "🚢 Deploying frontend..."
echo "Building..."
pnpm --filter @quantago/frontend build
echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy services/frontend/dist --project-name=quantago-app
echo "✅ Frontend deployed successfully!"
