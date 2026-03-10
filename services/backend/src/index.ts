import { Hono } from 'hono';
import { authRouter } from './auth/auth-config';
import { defaultUserSeedMiddleware } from './auth/default-user';
import { sessionMiddleware } from './auth/auth-middleware';
import { createCorsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/logger';
import { backtestsRouter } from './routes/backtests/backtests-router';
import { BacktestWorkflow } from './routes/backtests/backtest-workflow';
import { botsRouter } from './routes/bots/bots-router';
import { healthRouter } from './routes/health/health-router';
import { BulkHistoricalIngestionWorkflow } from './routes/ingestion/bulk-ingestion-workflow';
import { IncrementalSyncWorkflow } from './routes/ingestion/incremental-sync-workflow';
import { ingestionRouter } from './routes/ingestion/ingestion-router';
import { marketDataRouter } from './routes/market-data/market-data-router';
import { SymbolBackfillWorkflow } from './routes/ingestion/symbol-backfill-workflow';
import { sessionRouter } from './routes/session/session-router';
import { adminRouter } from './routes/admin/admin-router';
import { strategiesRouter } from './routes/strategies/strategies-router';
import type { AppEnv } from './worker-types';

const app = new Hono<AppEnv>();

app.use('*', createCorsMiddleware());
app.use('*', requestLogger());
app.use('*', defaultUserSeedMiddleware);
app.use('/api/*', sessionMiddleware);
app.onError(errorHandler);

app.route('/api/auth', authRouter);
app.route('/api/health', healthRouter);
app.route('/api/session', sessionRouter);
app.route('/api/market-data', marketDataRouter);
app.route('/api/backtests', backtestsRouter);
app.route('/api/strategies', strategiesRouter);
app.route('/api/bots', botsRouter);
app.route('/api/admin', adminRouter);
app.route('/api/admin/ingestion', ingestionRouter);

export { BacktestWorkflow, BulkHistoricalIngestionWorkflow, IncrementalSyncWorkflow, SymbolBackfillWorkflow };
export default app;