import { z } from 'zod';
import { EntryFrequency } from '../../lib/backtest-engine/types';

const parameterSchemaProperty = z.object({
  type: z.enum(['string', 'number', 'integer', 'boolean']),
  title: z.string().optional(),
  description: z.string().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  enum: z.array(z.union([z.string(), z.number()])).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
});

const parameterSchema = z.object({
  type: z.literal('object'),
  description: z.string().optional(),
  required: z.array(z.string()).optional(),
  properties: z.record(z.string(), parameterSchemaProperty),
});

const artifactSchema = z.object({
  file_name: z.string().min(1),
  content_base64: z.string().min(1),
  content_type: z.string().optional(),
});

const remoteRuntimeSchema = z.object({
  type: z.literal('remote'),
  language: z.string().min(1),
  endpoint: z.string().url(),
  timeoutMs: z.number().int().positive().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  lookbackCandles: z.number().int().positive().optional(),
});

const wasmRuntimeSchema = z.object({
  type: z.literal('wasm'),
  language: z.string().min(1),
  moduleUrl: z.string().url().optional(),
  exportedFunction: z.string().optional(),
  resultLengthFunction: z.string().optional(),
  allocFunction: z.string().optional(),
  deallocFunction: z.string().optional(),
  lookbackCandles: z.number().int().positive().optional(),
});

const runtimeSchema = z.discriminatedUnion('type', [remoteRuntimeSchema, wasmRuntimeSchema]);

export const createStrategySchema = z.object({
  strategy: z.object({
    slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(500),
    runtime_type: z.enum(['remote', 'wasm']),
    language: z.string().min(1).max(60),
    default_frequency: z.nativeEnum(EntryFrequency),
    min_candles: z.number().int().positive(),
    lookback_candles: z.number().int().positive(),
    default_config: z.object({
      takeProfitLevel: z.number().positive(),
      stopLossLevel: z.number().positive(),
      timeframe: z.string().optional(),
    }),
    parameter_schema: parameterSchema,
    is_public: z.boolean().default(false),
    initial_version: z.object({
      version: z.string().min(1).max(40),
      runtime_config: runtimeSchema,
      artifact: artifactSchema.optional(),
    }),
  }),
});

export const createStrategyVersionSchema = z.object({
  version: z.object({
    version: z.string().min(1).max(40),
    runtime_config: runtimeSchema,
    artifact: artifactSchema.optional(),
    make_current: z.boolean().default(true),
  }),
});