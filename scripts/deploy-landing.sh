#!/bin/bash
set -e

echo "🚢 Deploying landing site..."
cd services/landing
npx wrangler deploy
cd ../..
echo "✅ Landing site deployed successfully!"