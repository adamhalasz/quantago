export interface WorkflowInstanceStatus {
  status: string;
  output?: unknown;
  error?: string;
}

export interface WorkflowInstance<Params> {
  id: string;
  status(): Promise<WorkflowInstanceStatus>;
  params?: Params;
}

export interface WorkflowBinding<Params> {
  create(options: { id?: string; params: Params }): Promise<WorkflowInstance<Params>>;
  get(id: string): Promise<WorkflowInstance<Params>>;
}

export interface BackendEnv {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  FRONTEND_ORIGIN?: string;
  ADMIN_ORIGIN?: string;
  INGESTION_ADMIN_SECRET?: string;
  // Default admin user (development/demo only)
  ENABLE_DEFAULT_ADMIN_SEED?: string;
  DEFAULT_ADMIN_EMAIL?: string;
  DEFAULT_ADMIN_PASSWORD?: string;
  DEFAULT_ADMIN_NAME?: string;
  CLICKHOUSE_URL?: string;
  CLICKHOUSE_USERNAME?: string;
  CLICKHOUSE_PASSWORD?: string;
  CLICKHOUSE_API_KEY?: string;
  CLICKHOUSE_API_SECRET?: string;
  CLICKHOUSE_DB?: string;
  STRATEGY_ARTIFACTS?: R2Bucket;
  CCXT_EXCHANGE?: string;
  CCXT_DELAY_MS?: string;
  CCXT_BATCH_COOLDOWN_MS?: string;
  CCXT_MAX_RETRIES?: string;
  YFINANCE_DELAY_MS?: string;
  YFINANCE_BATCH_COOLDOWN_MS?: string;
  YFINANCE_MAX_RETRIES?: string;
  BACKTEST_WORKFLOW?: WorkflowBinding<{ backtestId: string }>;
  BULK_HISTORICAL_INGESTION_WORKFLOW?: WorkflowBinding<{ assetType: 'forex' | 'crypto' | 'stock'; timeframe: '1m' | '1h' | '1d'; symbols?: string[] }>;
  INCREMENTAL_SYNC_WORKFLOW?: WorkflowBinding<{ assetType?: 'forex' | 'crypto' | 'stock'; timeframe: '1m' | '1h' | '1d'; symbols?: string[] }>;
  SYMBOL_BACKFILL_WORKFLOW?: WorkflowBinding<{ symbol: string; assetType: 'forex' | 'crypto' | 'stock'; timeframe: '1m' | '1h' | '1d'; fromDate?: string }>;
}

export interface AuthSession {
  id: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export type AppEnv = {
  Bindings: BackendEnv;
  Variables: {
    session: AuthSession | null;
    user: AuthUser | null;
  };
};