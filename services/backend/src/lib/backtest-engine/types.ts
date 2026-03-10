import type { MarketAssetClass, MarketDataProviderId } from '../market-data-types';

export enum EntryFrequency {
  SCALPING = 'scalping',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export interface Candle {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyProtocolCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  type: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: Date;
  exitPrice: number;
  exitTime: Date;
  profit: number;
  signals: Record<string, unknown>;
  reason?: string;
}

export interface BacktestMetrics {
  winRate: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface BacktestRunResult {
  finalBalance: number;
  trades: Trade[];
  metrics: BacktestMetrics;
}

export type StrategyAction = 'BUY' | 'SELL' | 'HOLD';

export interface StrategySignal {
  type: 'BUY' | 'SELL' | null;
  size?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface StrategyDecision {
  action: StrategyAction;
  size?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface StrategyPositionState {
  type: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: string;
  size: number;
  unrealizedPnl: number;
}

export interface StrategyPortfolioState {
  cash: number;
  equity: number;
  openPosition: StrategyPositionState | null;
  lastTradeAt: string | null;
}

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

export interface StrategyRuntimeBase {
  type: 'native' | 'remote' | 'wasm';
  language: string;
}

export interface NativeStrategyRuntime extends StrategyRuntimeBase {
  type: 'native';
  language: 'typescript';
}

export interface RemoteStrategyRuntime extends StrategyRuntimeBase {
  type: 'remote';
  endpoint: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  lookbackCandles?: number;
}

export interface WasmStrategyRuntime extends StrategyRuntimeBase {
  type: 'wasm';
  moduleUrl?: string;
  artifactKey?: string;
  exportedFunction?: string;
  resultLengthFunction?: string;
  allocFunction?: string;
  deallocFunction?: string;
  lookbackCandles?: number;
}

export type StrategyRuntime = NativeStrategyRuntime | RemoteStrategyRuntime | WasmStrategyRuntime;
export type StrategyRuntimeType = StrategyRuntime['type'];

export interface StrategyExecutionInput {
  candle: StrategyProtocolCandle;
  history: StrategyProtocolCandle[];
  portfolio: StrategyPortfolioState;
  parameters: Record<string, unknown>;
  context: {
    index: number;
    totalCandles: number;
    timeframe: string;
    strategy: {
      name: string;
      version: string;
      runtime: StrategyRuntimeType;
      language: string;
    };
  };
}

export interface StrategyDefinition {
  name: string;
  description: string;
  version: string;
  runtime: StrategyRuntime;
  defaultFrequency: EntryFrequency;
  minCandles: number;
  lookbackCandles: number;
  defaultConfig: {
    takeProfitLevel: number;
    stopLossLevel: number;
    timeframe?: string;
  };
  parameterSchema: StrategyParameterSchema;
  evaluateSignal?(input: StrategyExecutionInput): StrategyDecision | Promise<StrategyDecision>;
}

export interface BacktestExecutionConfig {
  symbol: string;
  exchange: string;
  strategy: string;
  strategyDefinition: StrategyDefinition;
  startDate: string;
  endDate: string;
  initialBalance: number;
  timeframe: string;
  entryFrequency: EntryFrequency;
  assetClass: MarketAssetClass;
  provider: MarketDataProviderId;
  riskPerTrade: number;
  maxTradeTime: number;
  strategyParameters: Record<string, unknown>;
  takeProfitLevel?: number;
  stopLossLevel?: number;
}