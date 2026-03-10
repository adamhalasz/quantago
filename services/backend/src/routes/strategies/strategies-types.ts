import type { z } from 'zod';
import type { createStrategySchema, createStrategyVersionSchema } from './strategies-schema';

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type CreateStrategyVersionInput = z.infer<typeof createStrategyVersionSchema>;

export interface StrategyDefinitionRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  runtime_type: 'remote' | 'wasm';
  language: string;
  default_frequency: string;
  min_candles: number;
  lookback_candles: number;
  default_config: Record<string, unknown> | string;
  parameter_schema: Record<string, unknown> | string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  current_version_id: string | null;
}

export interface StrategyVersionRow {
  id: string;
  strategy_id: string;
  version: string;
  runtime_config: Record<string, unknown> | string;
  artifact_key: string | null;
  artifact_content_type: string | null;
  created_at: string;
}

export interface StrategyCatalogRow extends StrategyDefinitionRow {
  current_version: string;
  current_runtime_config: Record<string, unknown> | string;
  current_artifact_key: string | null;
}