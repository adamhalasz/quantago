import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';

// Get Pulumi configuration
const config = new pulumi.Config();
const cloudflareAccountId = config.require('cloudflareAccountId');

// Cloudflare zone (domain)
const zoneName = config.get('zoneName') || 'example.com';
const zone = cloudflare.getZoneOutput({ name: zoneName });

// ============================================================================
// Backend Worker (API)
// ============================================================================

const backendWorker = new cloudflare.WorkersScript('backend-worker', {
  accountId: cloudflareAccountId,
  name: 'quantago-api',
  content: 'export default { fetch() { return new Response("Placeholder"); } }',
  module: true,
  compatibilityDate: '2024-01-01',
  compatibilityFlags: ['nodejs_compat'],
  
  // Workflows binding
  workflowsBindings: [
    {
      name: 'BACKTEST_WORKFLOW',
      className: 'BacktestWorkflow',
    },
    {
      name: 'BULK_INGESTION_WORKFLOW',
      className: 'BulkHistoricalIngestionWorkflow',
    },
    {
      name: 'INCREMENTAL_SYNC_WORKFLOW',
      className: 'IncrementalSyncWorkflow',
    },
    {
      name: 'SYMBOL_BACKFILL_WORKFLOW',
      className: 'SymbolBackfillWorkflow',
    },
  ],
  
  // Secrets will be set via environment variables in CI/CD
  plainTextBindings: [
    { name: 'FRONTEND_ORIGIN', text: config.get('frontendOrigin') || 'https://app.quantago.co' },
    { name: 'BETTER_AUTH_URL', text: config.get('betterAuthUrl') || 'https://api.quantago.co' },
    { name: 'CCXT_EXCHANGE', text: 'binance' },
    { name: 'CLICKHOUSE_DB', text: 'market_data' },
  ],
  
  // Secrets are managed separately via wrangler or Cloudflare API
  secretTextBindings: [
    { name: 'DATABASE_URL', text: config.requireSecret('databaseUrl') },
    { name: 'BETTER_AUTH_SECRET', text: config.requireSecret('betterAuthSecret') },
    { name: 'INGESTION_ADMIN_SECRET', text: config.requireSecret('ingestionAdminSecret') },
    { name: 'CLICKHOUSE_URL', text: config.requireSecret('clickhouseUrl') },
    { name: 'CLICKHOUSE_USERNAME', text: config.requireSecret('clickhouseUsername') },
    { name: 'CLICKHOUSE_PASSWORD', text: config.requireSecret('clickhousePassword') },
  ],
});

// Backend custom domain
const backendDomain = new cloudflare.WorkerDomain('backend-domain', {
  accountId: cloudflareAccountId,
  hostname: pulumi.interpolate`api.${zoneName}`,
  service: backendWorker.name,
  zoneId: zone.id,
});

// ============================================================================
// Frontend Pages Project
// ============================================================================

const frontendProject = new cloudflare.PagesProject('frontend-project', {
  accountId: cloudflareAccountId,
  name: 'quantago-app',
  productionBranch: 'main',
  
  buildConfig: {
    buildCommand: 'cd services/frontend && pnpm install && pnpm build',
    destinationDir: 'services/frontend/dist',
    rootDir: '.',
  },
  
  deploymentConfigs: {
    production: {
      environmentVariables: {
        VITE_API_URL: pulumi.interpolate`https://api.${zoneName}`,
        NODE_VERSION: '20',
      },
      compatibilityDate: '2024-01-01',
    },
  },
});

// Frontend custom domain
const frontendDomain = new cloudflare.PagesDomain('frontend-domain', {
  accountId: cloudflareAccountId,
  projectName: frontendProject.name,
  domain: pulumi.interpolate`app.${zoneName}`,
});

// ============================================================================
// Admin Pages Project
// ============================================================================

const adminProject = new cloudflare.PagesProject('admin-project', {
  accountId: cloudflareAccountId,
  name: 'quantago-admin',
  productionBranch: 'main',
  
  buildConfig: {
    buildCommand: 'cd services/admin && pnpm install && pnpm build',
    destinationDir: 'services/admin/dist',
    rootDir: '.',
  },
  
  deploymentConfigs: {
    production: {
      environmentVariables: {
        VITE_API_URL: pulumi.interpolate`https://api.${zoneName}`,
        NODE_VERSION: '20',
      },
      compatibilityDate: '2024-01-01',
    },
  },
});

// Admin custom domain
const adminDomain = new cloudflare.PagesDomain('admin-domain', {
  accountId: cloudflareAccountId,
  projectName: adminProject.name,
  domain: pulumi.interpolate`admin.${zoneName}`,
});

// ============================================================================
// Landing Worker
// ============================================================================

const landingWorker = new cloudflare.WorkersScript('landing-worker', {
  accountId: cloudflareAccountId,
  name: 'quantago-web',
  content: 'export default { fetch() { return new Response("Placeholder"); } }',
  module: true,
  compatibilityDate: '2024-01-01',
  compatibilityFlags: ['nodejs_compat'],
});

const landingDomain = new cloudflare.WorkerDomain('landing-domain', {
  accountId: cloudflareAccountId,
  hostname: zoneName,
  service: landingWorker.name,
  zoneId: zone.id,
});

// ============================================================================
// Exports
// ============================================================================

export const backendWorkerName = backendWorker.name;
export const backendUrl = pulumi.interpolate`https://api.${zoneName}`;
export const frontendProjectName = frontendProject.name;
export const frontendUrl = pulumi.interpolate`https://app.${zoneName}`;
export const adminProjectName = adminProject.name;
export const adminUrl = pulumi.interpolate`https://admin.${zoneName}`;
export const landingWorkerName = landingWorker.name;
export const landingUrl = pulumi.interpolate`https://${zoneName}`;
