import type { Indicator, EntryFrequency } from '@/lib/types';
import { Indicator as IndicatorEnum } from '@/lib/types';
import { STRATEGIES as LEGACY_STRATEGIES, STRATEGY_ICONS, STRATEGY_TIMEFRAMES } from '@/lib/strategies';

export type StrategyRuntimeType = 'native' | 'remote' | 'wasm';

export type StrategyParameterSchema = {
  type: 'object';
  description?: string;
  required?: string[];
  properties: Record<string, {
    type: 'string' | 'number' | 'integer' | 'boolean';
    title?: string;
    description?: string;
    default?: string | number | boolean;
    enum?: Array<string | number>;
    minimum?: number;
    maximum?: number;
  }>;
};

export type StrategyCatalogRecord = {
  name: string;
  description: string;
  version: string;
  runtime: {
    type: StrategyRuntimeType;
    language: string;
  };
  defaultFrequency: EntryFrequency;
  minCandles: number;
  lookbackCandles: number;
  defaultConfig: {
    takeProfitLevel: number;
    stopLossLevel: number;
    timeframe?: string;
  };
  parameterSchema: StrategyParameterSchema;
};

export type StrategyCatalogItem = StrategyCatalogRecord & {
  indicators: Indicator[];
  recommendedTimeframe: string;
  getDefaultConfig: () => StrategyCatalogRecord['defaultConfig'];
};

const legacyStrategiesByName = new Map(LEGACY_STRATEGIES.map((strategy) => [strategy.name, strategy]));

const inferredIndicatorKeywords: Array<{ pattern: RegExp; indicator: Indicator }> = [
  { pattern: /rsi/i, indicator: IndicatorEnum.RSI },
  { pattern: /macd/i, indicator: IndicatorEnum.MACD },
  { pattern: /bollinger/i, indicator: IndicatorEnum.BOLLINGER },
  { pattern: /ichimoku/i, indicator: IndicatorEnum.ICHIMOKU },
  { pattern: /vwap|volume/i, indicator: IndicatorEnum.VWAP },
  { pattern: /price action|pin bar/i, indicator: IndicatorEnum.PRICE_ACTION },
  { pattern: /moving average|ema|trend/i, indicator: IndicatorEnum.EMA },
  { pattern: /breakout|support|resistance/i, indicator: IndicatorEnum.SUPPORT_RESISTANCE },
];

const inferIndicators = (strategy: StrategyCatalogRecord): Indicator[] => {
  const legacy = legacyStrategiesByName.get(strategy.name);
  if (legacy) {
    return legacy.indicators;
  }

  const source = `${strategy.name} ${strategy.description}`;
  const indicators = inferredIndicatorKeywords.reduce<Indicator[]>((accumulator, entry) => {
    if (entry.pattern.test(source) && !accumulator.includes(entry.indicator)) {
      accumulator.push(entry.indicator);
    }

    return accumulator;
  }, []);

  return indicators.length > 0 ? indicators : [IndicatorEnum.EMA];
};

export const normalizeStrategyCatalogItem = (record: StrategyCatalogRecord): StrategyCatalogItem => {
  const legacy = legacyStrategiesByName.get(record.name);
  const recommendedTimeframe = record.defaultConfig.timeframe
    ?? STRATEGY_TIMEFRAMES[record.name as keyof typeof STRATEGY_TIMEFRAMES]
    ?? '1d';

  return {
    ...record,
    indicators: legacy?.indicators ?? inferIndicators(record),
    recommendedTimeframe,
    getDefaultConfig: () => record.defaultConfig,
  };
};

export const FALLBACK_STRATEGY_CATALOG: StrategyCatalogItem[] = LEGACY_STRATEGIES.map((strategy) => normalizeStrategyCatalogItem({
  name: strategy.name,
  description: strategy.description,
  version: '1.0.0',
  runtime: {
    type: 'native',
    language: 'typescript',
  },
  defaultFrequency: strategy.defaultFrequency,
  minCandles: Math.max(...strategy.indicators.map((indicator) => {
    switch (indicator) {
      case IndicatorEnum.RSI:
        return 14;
      case IndicatorEnum.MACD:
      case IndicatorEnum.ICHIMOKU:
        return 26;
      case IndicatorEnum.BOLLINGER:
      case IndicatorEnum.VWAP:
        return 20;
      case IndicatorEnum.EMA:
        return 50;
      default:
        return 20;
    }
  }), 1),
  lookbackCandles: Math.max(...strategy.indicators.map((indicator) => {
    switch (indicator) {
      case IndicatorEnum.RSI:
        return 14;
      case IndicatorEnum.MACD:
      case IndicatorEnum.ICHIMOKU:
        return 26;
      case IndicatorEnum.BOLLINGER:
      case IndicatorEnum.VWAP:
        return 20;
      case IndicatorEnum.EMA:
        return 50;
      default:
        return 20;
    }
  }), 1),
  defaultConfig: strategy.getDefaultConfig(),
  parameterSchema: {
    type: 'object',
    properties: {},
  },
}));

export const STRATEGY_ICON_MAP = STRATEGY_ICONS;