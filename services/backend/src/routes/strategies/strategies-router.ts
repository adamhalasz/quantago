import { Hono } from 'hono';
import { requireAuth } from '../../auth/auth-middleware';
import {
  handleCreateStrategy,
  handleCreateStrategyVersion,
  handleListStrategies,
  handleListStrategyVersions,
} from './strategies-handlers';
import type { AppEnv } from '../../worker-types';

export const strategiesRouter = new Hono<AppEnv>();

strategiesRouter.use('*', requireAuth);
strategiesRouter.get('/', handleListStrategies);
strategiesRouter.post('/', handleCreateStrategy);
strategiesRouter.get('/:slug/versions', handleListStrategyVersions);
strategiesRouter.post('/:slug/versions', handleCreateStrategyVersion);