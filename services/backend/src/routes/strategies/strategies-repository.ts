import { getSql } from '../../db/client';
import type { BackendEnv } from '../../worker-types';
import type { StrategyCatalogRow, StrategyDefinitionRow, StrategyVersionRow } from './strategies-types';

export const listPersistedStrategies = async (env: BackendEnv, userId: string): Promise<StrategyCatalogRow[]> => {
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      d.*, 
      v.version AS current_version,
      v.runtime_config AS current_runtime_config,
      v.artifact_key AS current_artifact_key
    FROM strategy_definitions d
    JOIN strategy_versions v ON v.id = d.current_version_id
    WHERE d.user_id = ${userId} OR d.is_public = TRUE
    ORDER BY d.created_at DESC
  `;

  return rows as StrategyCatalogRow[];
};

export const findPersistedStrategyBySlug = async (
  env: BackendEnv,
  slug: string,
  userId: string,
): Promise<StrategyDefinitionRow | null> => {
  const sql = getSql(env);
  const rows = await sql`
    SELECT *
    FROM strategy_definitions
    WHERE slug = ${slug} AND (user_id = ${userId} OR is_public = TRUE)
    LIMIT 1
  `;

  return (rows[0] as StrategyDefinitionRow | undefined) ?? null;
};

export const findPersistedStrategyVersionForExecution = async (
  env: BackendEnv,
  identifier: string,
  userId: string,
  requestedVersion?: string,
): Promise<(StrategyCatalogRow & { runtime_config: Record<string, unknown> | string; artifact_key: string | null; version: string }) | null> => {
  const sql = getSql(env);
  const rows = requestedVersion
    ? await sql`
      SELECT
        d.*,
        v.version,
        v.runtime_config,
        v.artifact_key,
        v.version AS current_version,
        v.runtime_config AS current_runtime_config,
        v.artifact_key AS current_artifact_key
      FROM strategy_definitions d
      JOIN strategy_versions v ON v.strategy_id = d.id
      WHERE (d.slug = ${identifier} OR d.name = ${identifier})
        AND v.version = ${requestedVersion}
        AND (d.user_id = ${userId} OR d.is_public = TRUE)
      LIMIT 1
    `
    : await sql`
      SELECT
        d.*,
        v.version,
        v.runtime_config,
        v.artifact_key,
        v.version AS current_version,
        v.runtime_config AS current_runtime_config,
        v.artifact_key AS current_artifact_key
      FROM strategy_definitions d
      JOIN strategy_versions v ON v.id = d.current_version_id
      WHERE (d.slug = ${identifier} OR d.name = ${identifier})
        AND (d.user_id = ${userId} OR d.is_public = TRUE)
      LIMIT 1
    `;

  return (rows[0] as ((StrategyCatalogRow & { runtime_config: Record<string, unknown> | string; artifact_key: string | null; version: string }) | undefined)) ?? null;
};

export const insertStrategyDefinition = async (
  env: BackendEnv,
  input: {
    userId: string;
    slug: string;
    name: string;
    description: string;
    runtimeType: 'remote' | 'wasm';
    language: string;
    defaultFrequency: string;
    minCandles: number;
    lookbackCandles: number;
    defaultConfig: Record<string, unknown>;
    parameterSchema: Record<string, unknown>;
    isPublic: boolean;
  },
): Promise<StrategyDefinitionRow> => {
  const sql = getSql(env);
  const rows = await sql`
    INSERT INTO strategy_definitions (
      user_id,
      slug,
      name,
      description,
      runtime_type,
      language,
      default_frequency,
      min_candles,
      lookback_candles,
      default_config,
      parameter_schema,
      is_public
    ) VALUES (
      ${input.userId},
      ${input.slug},
      ${input.name},
      ${input.description},
      ${input.runtimeType},
      ${input.language},
      ${input.defaultFrequency},
      ${input.minCandles},
      ${input.lookbackCandles},
      ${JSON.stringify(input.defaultConfig)}::jsonb,
      ${JSON.stringify(input.parameterSchema)}::jsonb,
      ${input.isPublic}
    )
    RETURNING *
  `;

  return rows[0] as StrategyDefinitionRow;
};

export const insertStrategyVersion = async (
  env: BackendEnv,
  input: {
    strategyId: string;
    version: string;
    runtimeConfig: Record<string, unknown>;
    artifactKey?: string;
    artifactContentType?: string;
  },
): Promise<StrategyVersionRow> => {
  const sql = getSql(env);
  const rows = await sql`
    INSERT INTO strategy_versions (
      strategy_id,
      version,
      runtime_config,
      artifact_key,
      artifact_content_type
    ) VALUES (
      ${input.strategyId},
      ${input.version},
      ${JSON.stringify(input.runtimeConfig)}::jsonb,
      ${input.artifactKey ?? null},
      ${input.artifactContentType ?? null}
    )
    RETURNING *
  `;

  return rows[0] as StrategyVersionRow;
};

export const setCurrentStrategyVersion = async (
  env: BackendEnv,
  input: { strategyId: string; versionId: string },
) => {
  const sql = getSql(env);
  await sql`
    UPDATE strategy_definitions
    SET current_version_id = ${input.versionId}, updated_at = NOW()
    WHERE id = ${input.strategyId}
  `;
};

export const listStrategyVersions = async (
  env: BackendEnv,
  strategyId: string,
): Promise<StrategyVersionRow[]> => {
  const sql = getSql(env);
  const rows = await sql`
    SELECT *
    FROM strategy_versions
    WHERE strategy_id = ${strategyId}
    ORDER BY created_at DESC
  `;

  return rows as StrategyVersionRow[];
};