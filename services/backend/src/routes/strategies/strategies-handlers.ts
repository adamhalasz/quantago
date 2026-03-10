import type { Context } from 'hono';
import { getRequiredUser } from '../../auth/auth-middleware';
import { AppError } from '../../lib/errors';
import type { AppEnv } from '../../worker-types';
import { createStrategySchema, createStrategyVersionSchema } from './strategies-schema';
import {
  createStrategyDefinitionWithInitialVersion,
  createStrategyVersionForDefinition,
  getStrategyVersions,
  listStrategiesCatalog,
} from './strategies-service';

const getStrategySlug = (c: Context<AppEnv>) => {
  const slug = c.req.param('slug' as never);
  if (!slug) {
    throw new AppError('Strategy not found', 404);
  }

  return slug;
};

export const handleListStrategies = async (c: Context<AppEnv>) => {
  const user = getRequiredUser(c.get('user'));
  return c.json(await listStrategiesCatalog(c.env, user.id));
};

export const handleCreateStrategy = async (c: Context<AppEnv>) => {
  const parsed = createStrategySchema.safeParse(await c.req.json());

  if (!parsed.success) {
    throw new AppError('Invalid request body', 400, parsed.error.flatten());
  }

  const user = getRequiredUser(c.get('user'));
  return c.json(await createStrategyDefinitionWithInitialVersion(c.env, user.id, parsed.data), 201);
};

export const handleCreateStrategyVersion = async (c: Context<AppEnv>) => {
  const parsed = createStrategyVersionSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    throw new AppError('Invalid request body', 400, parsed.error.flatten());
  }

  const user = getRequiredUser(c.get('user'));
  return c.json(await createStrategyVersionForDefinition(c.env, user.id, getStrategySlug(c), parsed.data), 201);
};

export const handleListStrategyVersions = async (c: Context<AppEnv>) => {
  const user = getRequiredUser(c.get('user'));
  return c.json(await getStrategyVersions(c.env, user.id, getStrategySlug(c)));
};