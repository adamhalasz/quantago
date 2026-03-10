import { BUILT_IN_STRATEGIES } from '../../../../../strategies';
import { COMMON_PARAMETER_SCHEMA } from '../../../../../strategies/helpers';
import { findPersistedStrategyVersionForExecution } from '../../routes/strategies/strategies-repository';
import type { BackendEnv } from '../../worker-types';
import { EntryFrequency } from './types';
import type { StrategyDefinition, StrategyParameterSchema } from './types';

const STRATEGIES: StrategyDefinition[] = BUILT_IN_STRATEGIES;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const listStrategies = () => STRATEGIES;

export const getStrategy = (strategyName: string) => {
  return STRATEGIES.find((strategy) => strategy.name === strategyName);
};

export const resolveStrategyDefinition = (
  strategyName: string,
  parameters: Record<string, unknown>,
): StrategyDefinition | undefined => {
  const nativeStrategy = getStrategy(strategyName);
  if (nativeStrategy) {
    return nativeStrategy;
  }

  const runtime = parameters.strategyRuntime;
  if (!isRecord(runtime) || runtime.type !== 'remote' || typeof runtime.endpoint !== 'string') {
    return undefined;
  }

  const schema = isRecord(parameters.strategyParameterSchema) && parameters.strategyParameterSchema.type === 'object'
    ? parameters.strategyParameterSchema as StrategyParameterSchema
    : COMMON_PARAMETER_SCHEMA;
  const takeProfitLevel = typeof parameters.takeProfitLevel === 'number' ? parameters.takeProfitLevel : 1;
  const stopLossLevel = typeof parameters.stopLossLevel === 'number' ? parameters.stopLossLevel : 0.5;
  const timeframe = typeof parameters.timeframe === 'string' ? parameters.timeframe : '1d';
  const minCandles = typeof parameters.strategyMinCandles === 'number' ? parameters.strategyMinCandles : 1;
  const lookbackCandles = typeof runtime.lookbackCandles === 'number'
    ? runtime.lookbackCandles
    : (typeof parameters.strategyLookbackCandles === 'number' ? parameters.strategyLookbackCandles : minCandles);

  return {
    name: strategyName,
    description: typeof parameters.strategyDescription === 'string'
      ? parameters.strategyDescription
      : 'Remote strategy executed over the Strategy Protocol HTTP boundary.',
    version: typeof parameters.strategyVersion === 'string' ? parameters.strategyVersion : '1.0.0',
    runtime: {
      type: 'remote',
      language: typeof runtime.language === 'string' ? runtime.language : 'python',
      endpoint: runtime.endpoint,
      timeoutMs: typeof runtime.timeoutMs === 'number' ? runtime.timeoutMs : undefined,
      headers: isRecord(runtime.headers)
        ? Object.entries(runtime.headers).reduce<Record<string, string>>((accumulator, [key, value]) => {
            if (typeof value === 'string') {
              accumulator[key] = value;
            }

            return accumulator;
          }, {})
        : undefined,
      lookbackCandles,
    },
    defaultFrequency: Object.values(EntryFrequency).includes(parameters.entryFrequency as EntryFrequency)
      ? (parameters.entryFrequency as EntryFrequency)
      : EntryFrequency.DAILY,
    minCandles,
    lookbackCandles,
    defaultConfig: {
      takeProfitLevel,
      stopLossLevel,
      timeframe,
    },
    parameterSchema: schema,
  };
};

export const resolveStrategyDefinitionForExecution = async (input: {
  env: BackendEnv;
  userId: string;
  strategyName: string;
  parameters: Record<string, unknown>;
}): Promise<StrategyDefinition | undefined> => {
  const dynamicDefinition = resolveStrategyDefinition(input.strategyName, input.parameters);
  if (dynamicDefinition) {
    return dynamicDefinition;
  }

  const requestedVersion = typeof input.parameters.strategyVersion === 'string' ? input.parameters.strategyVersion : undefined;
  const persisted = await findPersistedStrategyVersionForExecution(
    input.env,
    input.strategyName,
    input.userId,
    requestedVersion,
  );
  if (!persisted) {
    return undefined;
  }

  const runtimeConfig = typeof persisted.runtime_config === 'string'
    ? (JSON.parse(persisted.runtime_config) as Record<string, unknown>)
    : persisted.runtime_config;
  const parameterSchema = typeof persisted.parameter_schema === 'string'
    ? (JSON.parse(persisted.parameter_schema) as StrategyParameterSchema)
    : (persisted.parameter_schema as StrategyParameterSchema);
  const defaultConfig = typeof persisted.default_config === 'string'
    ? (JSON.parse(persisted.default_config) as StrategyDefinition['defaultConfig'])
    : (persisted.default_config as StrategyDefinition['defaultConfig']);

  if (persisted.runtime_type === 'wasm') {
    return {
      name: persisted.name,
      description: persisted.description,
      version: persisted.version,
      runtime: {
        type: 'wasm',
        language: persisted.language,
        moduleUrl: typeof runtimeConfig.moduleUrl === 'string' ? runtimeConfig.moduleUrl : undefined,
        artifactKey:
          persisted.artifact_key ??
          (typeof runtimeConfig.artifactKey === 'string' ? runtimeConfig.artifactKey : undefined),
        exportedFunction:
          typeof runtimeConfig.exportedFunction === 'string' ? runtimeConfig.exportedFunction : undefined,
        resultLengthFunction:
          typeof runtimeConfig.resultLengthFunction === 'string'
            ? runtimeConfig.resultLengthFunction
            : undefined,
        allocFunction: typeof runtimeConfig.allocFunction === 'string' ? runtimeConfig.allocFunction : undefined,
        deallocFunction:
          typeof runtimeConfig.deallocFunction === 'string' ? runtimeConfig.deallocFunction : undefined,
        lookbackCandles:
          typeof runtimeConfig.lookbackCandles === 'number'
            ? runtimeConfig.lookbackCandles
            : persisted.lookback_candles,
      },
      defaultFrequency: persisted.default_frequency as EntryFrequency,
      minCandles: persisted.min_candles,
      lookbackCandles: persisted.lookback_candles,
      defaultConfig,
      parameterSchema,
    };
  }

  if (typeof runtimeConfig.endpoint !== 'string') {
    return undefined;
  }

  return {
    name: persisted.name,
    description: persisted.description,
    version: persisted.version,
    runtime: {
      type: 'remote',
      language: persisted.language,
      endpoint: runtimeConfig.endpoint,
      timeoutMs: typeof runtimeConfig.timeoutMs === 'number' ? runtimeConfig.timeoutMs : undefined,
      headers: isRecord(runtimeConfig.headers)
        ? Object.entries(runtimeConfig.headers).reduce<Record<string, string>>((accumulator, [key, value]) => {
            if (typeof value === 'string') {
              accumulator[key] = value;
            }

            return accumulator;
          }, {})
        : undefined,
      lookbackCandles:
        typeof runtimeConfig.lookbackCandles === 'number'
          ? runtimeConfig.lookbackCandles
          : persisted.lookback_candles,
    },
    defaultFrequency: persisted.default_frequency as EntryFrequency,
    minCandles: persisted.min_candles,
    lookbackCandles: persisted.lookback_candles,
    defaultConfig,
    parameterSchema,
  };
};
