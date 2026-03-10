import { EntryFrequency } from '../services/backend/src/lib/backtest-engine/types';
import type {
  Candle,
  StrategyDecision,
  StrategyDefinition,
  StrategyExecutionInput,
  StrategyParameterSchema,
  StrategySignal,
} from '../services/backend/src/lib/backtest-engine/types';

export type StrategyManifest = {
  slug: string;
  name: string;
  description: string;
  version: string;
  defaultFrequency: EntryFrequency;
  minCandles: number;
  lookbackCandles: number;
  defaultConfig: {
    takeProfitLevel: number;
    stopLossLevel: number;
    timeframe?: string;
  };
  parameterSchema?: StrategyParameterSchema;
};

export const COMMON_PARAMETER_SCHEMA: StrategyParameterSchema = {
  type: 'object',
  description: 'Execution parameters supplied by the platform when a backtest or bot run starts.',
  required: ['timeframe'],
  properties: {
    timeframe: {
      type: 'string',
      title: 'Timeframe',
      description: 'Market data timeframe used to build the candle series.',
      default: '1d',
      enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
    },
    entryFrequency: {
      type: 'string',
      title: 'Entry Frequency',
      description: 'Trading cadence guardrails applied by the platform.',
      default: EntryFrequency.DAILY,
      enum: Object.values(EntryFrequency),
    },
    riskPerTrade: {
      type: 'number',
      title: 'Risk Per Trade',
      description: 'Percentage of account equity to risk on a new position.',
      default: 2,
      minimum: 0.1,
      maximum: 100,
    },
    maxTradeTime: {
      type: 'number',
      title: 'Max Trade Time',
      description: 'Maximum time in hours to keep a position open.',
      default: 8,
      minimum: 1,
      maximum: 2160,
    },
    takeProfitLevel: {
      type: 'number',
      title: 'Take Profit %',
      description: 'Default take-profit threshold as a percentage from entry.',
      default: 1,
      minimum: 0.1,
      maximum: 100,
    },
    stopLossLevel: {
      type: 'number',
      title: 'Stop Loss %',
      description: 'Default stop-loss threshold as a percentage from entry.',
      default: 0.5,
      minimum: 0.1,
      maximum: 100,
    },
  },
};

const toProtocolCandles = (history: StrategyExecutionInput['history']): Candle[] => {
  return history.map((candle) => ({
    time: new Date(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
};

const fromLegacySignal = (signal: StrategySignal): StrategyDecision => {
  if (!signal.type) {
    return { action: 'HOLD', reason: signal.reason, metadata: signal.metadata };
  }

  return {
    action: signal.type,
    size: signal.size,
    reason: signal.reason,
    metadata: signal.metadata,
  };
};

export const Strategy = (
  manifest: StrategyManifest,
  calculateSignal: (candles: Candle[], index: number) => StrategySignal,
): StrategyDefinition => {
  return {
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    runtime: {
      type: 'native',
      language: 'typescript',
    },
    defaultFrequency: manifest.defaultFrequency,
    minCandles: manifest.minCandles,
    lookbackCandles: manifest.lookbackCandles,
    defaultConfig: manifest.defaultConfig,
    parameterSchema: manifest.parameterSchema ?? COMMON_PARAMETER_SCHEMA,
    async evaluateSignal(input) {
      const candles = toProtocolCandles(input.history);
      return fromLegacySignal(calculateSignal(candles, input.context.index));
    },
  };
};