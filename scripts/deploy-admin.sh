#!/bin/bash
set -e

echo "🚢 Deploying admin..."
echo "Building..."
pnpm --filter @quantago/admin build
echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy services/admin/dist --project-name=quantago-admin
echo "✅ Admin deployed successfully!"
