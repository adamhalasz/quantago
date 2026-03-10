#!/bin/bash

# Backtest Platform Setup Script
# This script helps you set up the infrastructure and deploy to Cloudflare

set -e

echo "🚀 Backtest Platform Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}❌ pnpm is required but not installed.${NC}" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ git is required but not installed.${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ Node.js installed${NC}"
echo -e "${GREEN}✓ pnpm installed${NC}"
echo -e "${GREEN}✓ git installed${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Type check
echo "🔍 Running type checks..."
pnpm typecheck
echo -e "${GREEN}✓ Type checks passed${NC}"
echo ""

# Build
echo "🔨 Building all services..."
pnpm build
echo -e "${GREEN}✓ All services built successfully${NC}"
echo ""

# Check Cloudflare authentication
echo "🔐 Cloudflare authentication"
echo "================================"
echo ""
echo -e "${YELLOW}To deploy to Cloudflare, you need to be logged in.${NC}"
echo ""
read -p "Do you want to check/setup Cloudflare authentication? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Checking authentication status (this may take a moment)..."
    if npx wrangler whoami 2>/dev/null | grep -q "You are logged in"; then
        echo -e "${GREEN}✓ Already logged in to Cloudflare${NC}"
    else
        echo -e "${YELLOW}Not logged in. Starting login process...${NC}"
        npx wrangler login
    fi
else
    echo -e "${YELLOW}⚠️  Skipping authentication check. Login later with: npx wrangler login${NC}"
fi
echo ""

# Database migrations
echo "💾 Database migrations"
echo "================================"
echo ""
echo -e "${YELLOW}Before deploying, ensure you've run database migrations:${NC}"
echo ""
echo "  export DATABASE_URL='your-production-database-url'"
echo "  cd services/backend"
echo "  psql \"\$DATABASE_URL\" -f src/db/migrations/0001_init.sql"
echo "  psql \"\$DATABASE_URL\" -f src/db/migrations/0002_better_auth.sql"
echo "  psql \"\$DATABASE_URL\" -f src/db/migrations/0003_backtest_workflows.sql"
echo "  psql \"\$DATABASE_URL\" -f src/db/migrations/0004_ingestion_metadata.sql"
echo "  psql \"\$DATABASE_URL\" -f src/db/migrations/0005_add_user_roles.sql"
echo ""
read -p "Have you run the migrations? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please run migrations before deploying.${NC}"
    exit 1
fi

# ClickHouse setup
echo ""
echo "📊 ClickHouse setup"
echo "================================"
echo ""
echo -e "${YELLOW}Ensure ClickHouse has the market_data database:${NC}"
echo ""
echo "  CREATE DATABASE IF NOT EXISTS market_data;"
echo ""
read -p "Is ClickHouse configured? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please configure ClickHouse before deploying.${NC}"
    exit 1
fi

# Create Pages projects
echo ""
echo "📄 Cloudflare Pages projects"
echo "================================"
echo ""
echo "Creating Pages projects if they don't exist..."
echo ""

if ! npx wrangler pages project list 2>/dev/null | grep -q "quantago-app"; then
    echo "Creating frontend project..."
    npx wrangler pages project create quantago-app --production-branch main || true
else
    echo -e "${GREEN}✓ Frontend project exists${NC}"
fi

if ! npx wrangler pages project list 2>/dev/null | grep -q "quantago-admin"; then
    echo "Creating admin project..."
    npx wrangler pages project create quantago-admin --production-branch main || true
else
    echo -e "${GREEN}✓ Admin project exists${NC}"
fi

# Set backend secrets
echo ""
echo "🔑 Backend Worker secrets"
echo "================================"
echo ""
echo -e "${YELLOW}You need to set the following secrets for the backend worker:${NC}"
echo ""
echo "  cd services/backend"
echo "  npx wrangler secret put DATABASE_URL"
echo "  npx wrangler secret put BETTER_AUTH_SECRET"
echo "  npx wrangler secret put INGESTION_ADMIN_SECRET"
echo "  npx wrangler secret put CLICKHOUSE_URL"
echo "  npx wrangler secret put CLICKHOUSE_USERNAME"
echo "  npx wrangler secret put CLICKHOUSE_PASSWORD"
echo ""
read -p "Do you want to set secrets now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd services/backend
    
    echo "Setting DATABASE_URL..."
    npx wrangler secret put DATABASE_URL
    
    echo "Setting BETTER_AUTH_SECRET..."
    npx wrangler secret put BETTER_AUTH_SECRET
    
    echo "Setting INGESTION_ADMIN_SECRET..."
    npx wrangler secret put INGESTION_ADMIN_SECRET
    
    echo "Setting CLICKHOUSE_URL..."
    npx wrangler secret put CLICKHOUSE_URL
    
    echo "Setting CLICKHOUSE_USERNAME..."
    npx wrangler secret put CLICKHOUSE_USERNAME
    
    echo "Setting CLICKHOUSE_PASSWORD..."
    npx wrangler secret put CLICKHOUSE_PASSWORD
    
    cd ../..
fi

# Deploy
echo ""
echo "🚢 Ready to deploy!"
echo "================================"
echo ""
read -p "Deploy to production now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying all services..."
    pnpm run deploy:all
    
    echo ""
    echo -e "${GREEN}✨ Deployment complete!${NC}"
    echo ""
    echo "Your services are now live:"
    echo "  🔧 Backend: https://quantago-api.workers.dev"
    echo "  🌐 Frontend: https://quantago-app.pages.dev"
    echo "  👑 Admin: https://quantago-admin.pages.dev"
    echo "  🏠 Landing: https://quantago-web.workers.dev"
    echo ""
    echo "Next steps:"
    echo "  1. Set up custom domains in Cloudflare Dashboard"
    echo "  2. Configure GitHub secrets for CI/CD"
    echo "  3. Update BETTER_AUTH_URL, FRONTEND_ORIGIN, and ADMIN_ORIGIN in wrangler.jsonc"
else
    echo ""
    echo -e "${YELLOW}Deployment skipped. To deploy later, run:${NC}"
    echo "  pnpm run deploy:all"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📚 Documentation:"
echo "  - Deployment guide: docs/DEPLOYMENT.md"
echo "  - GitHub secrets: docs/SECRETS.md"
echo "  - Infrastructure: infra/README.md"
echo ""
