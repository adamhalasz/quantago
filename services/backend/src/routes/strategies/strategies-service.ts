import { AppError } from '../../lib/errors';
import { storeStrategyArtifact } from '../../lib/strategy-artifacts';
import { listStrategies as listBuiltInStrategies } from '../../lib/backtest-engine/strategies';
import type { StrategyParameterSchema } from '../../lib/backtest-engine/types';
import type { BackendEnv } from '../../worker-types';
import {
  findPersistedStrategyBySlug,
  insertStrategyDefinition,
  insertStrategyVersion,
  listPersistedStrategies,
  listStrategyVersions,
  setCurrentStrategyVersion,
} from './strategies-repository';
import type { CreateStrategyInput, CreateStrategyVersionInput, StrategyVersionRow } from './strategies-types';

const parseJsonField = <T>(value: T | string): T => {
  return typeof value === 'string' ? JSON.parse(value) as T : value;
};

export const listStrategiesCatalog = async (env: BackendEnv, userId: string) => {
  const builtInStrategies = listBuiltInStrategies().map((strategy) => ({
    slug: strategy.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name: strategy.name,
    description: strategy.description,
    version: strategy.version,
    runtime: strategy.runtime,
    defaultFrequency: strategy.defaultFrequency,
    minCandles: strategy.minCandles,
    lookbackCandles: strategy.lookbackCandles,
    defaultConfig: strategy.defaultConfig,
    parameterSchema: strategy.parameterSchema,
    source: 'builtin' as const,
  }));

  const persistedStrategies = await listPersistedStrategies(env, userId);
  const persistedCatalog = persistedStrategies.map((strategy) => {
    const runtime = parseJsonField<Record<string, unknown>>(strategy.current_runtime_config);
    return {
      slug: strategy.slug,
      name: strategy.name,
      description: strategy.description,
      version: strategy.current_version,
      runtime: strategy.runtime_type === 'wasm'
        ? {
          ...runtime,
          type: 'wasm',
          language: strategy.language,
          artifactKey: strategy.current_artifact_key ?? (typeof runtime.artifactKey === 'string' ? runtime.artifactKey : undefined),
        }
        : {
          ...runtime,
          type: 'remote',
          language: strategy.language,
        },
      defaultFrequency: strategy.default_frequency,
      minCandles: strategy.min_candles,
      lookbackCandles: strategy.lookback_candles,
      defaultConfig: parseJsonField<Record<string, unknown>>(strategy.default_config),
      parameterSchema: parseJsonField<StrategyParameterSchema>(strategy.parameter_schema as string | StrategyParameterSchema),
      source: 'registry' as const,
    };
  });

  return [...builtInStrategies, ...persistedCatalog];
};

export const createStrategyDefinitionWithInitialVersion = async (
  env: BackendEnv,
  userId: string,
  payload: CreateStrategyInput,
) => {
  const existing = await findPersistedStrategyBySlug(env, payload.strategy.slug, userId);
  if (existing) {
    throw new AppError('Strategy slug already exists', 409);
  }

  const definition = await insertStrategyDefinition(env, {
    userId,
    slug: payload.strategy.slug,
    name: payload.strategy.name,
    description: payload.strategy.description,
    runtimeType: payload.strategy.runtime_type,
    language: payload.strategy.language,
    defaultFrequency: payload.strategy.default_frequency,
    minCandles: payload.strategy.min_candles,
    lookbackCandles: payload.strategy.lookback_candles,
    defaultConfig: payload.strategy.default_config,
    parameterSchema: payload.strategy.parameter_schema,
    isPublic: payload.strategy.is_public,
  });

  const artifact = payload.strategy.initial_version.artifact;
  const artifactKey = artifact
    ? await storeStrategyArtifact({
      env,
      strategyId: definition.id,
      version: payload.strategy.initial_version.version,
      fileName: artifact.file_name,
      contentBase64: artifact.content_base64,
      contentType: artifact.content_type,
    })
    : undefined;

  const version = await insertStrategyVersion(env, {
    strategyId: definition.id,
    version: payload.strategy.initial_version.version,
    runtimeConfig: {
      ...payload.strategy.initial_version.runtime_config,
      ...(artifactKey ? { artifactKey } : {}),
    },
    artifactKey,
    artifactContentType: artifact?.content_type,
  });

  await setCurrentStrategyVersion(env, { strategyId: definition.id, versionId: version.id });

  return {
    definition,
    version,
  };
};

export const createStrategyVersionForDefinition = async (
  env: BackendEnv,
  userId: string,
  slug: string,
  payload: CreateStrategyVersionInput,
) => {
  const strategy = await findPersistedStrategyBySlug(env, slug, userId);
  if (!strategy) {
    throw new AppError('Strategy not found', 404);
  }

  if (strategy.user_id !== userId) {
    throw new AppError('You do not have permission to update this strategy', 403);
  }

  const artifact = payload.version.artifact;
  const artifactKey = artifact
    ? await storeStrategyArtifact({
      env,
      strategyId: strategy.id,
      version: payload.version.version,
      fileName: artifact.file_name,
      contentBase64: artifact.content_base64,
      contentType: artifact.content_type,
    })
    : undefined;

  const version = await insertStrategyVersion(env, {
    strategyId: strategy.id,
    version: payload.version.version,
    runtimeConfig: {
      ...payload.version.runtime_config,
      ...(artifactKey ? { artifactKey } : {}),
    },
    artifactKey,
    artifactContentType: artifact?.content_type,
  });

  if (payload.version.make_current) {
    await setCurrentStrategyVersion(env, { strategyId: strategy.id, versionId: version.id });
  }

  return version;
};

export const getStrategyVersions = async (
  env: BackendEnv,
  userId: string,
  slug: string,
): Promise<StrategyVersionRow[]> => {
  const strategy = await findPersistedStrategyBySlug(env, slug, userId);
  if (!strategy) {
    throw new AppError('Strategy not found', 404);
  }

  return listStrategyVersions(env, strategy.id);
};