import type { MarketAssetClass, MarketDataProviderId } from '@/lib/market';
import { normalizeStrategyCatalogItem, type StrategyCatalogItem, type StrategyCatalogRecord } from '@/lib/strategy-catalog';
import type { Bot, StoredBacktest, Trade } from '@/lib/types';

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const buildUrl = (path: string) => {
  if (!configuredBaseUrl) {
    return path;
  }

  return `${configuredBaseUrl}${path}`;
};

const parseJsonField = <T>(value: T | string | null | undefined, fallback: T): T => {
  if (value == null) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

const normalizeTrade = (trade: Record<string, unknown>): Trade => ({
  type: trade.type as Trade['type'],
  entryPrice: Number(trade.entry_price ?? trade.entryPrice),
  entryTime: new Date(String(trade.entry_time ?? trade.entryTime)),
  exitPrice: Number(trade.exit_price ?? trade.exitPrice),
  exitTime: new Date(String(trade.exit_time ?? trade.exitTime)),
  profit: Number(trade.profit),
  signals: parseJsonField(trade.signals as Trade['signals'] | string | undefined, {} as Trade['signals']),
  reason: typeof trade.reason === 'string' ? trade.reason : undefined,
});

const normalizeBacktest = (backtest: Record<string, unknown>): StoredBacktest => ({
  id: String(backtest.id),
  created_at: String(backtest.created_at),
  updated_at: typeof backtest.updated_at === 'string' ? backtest.updated_at : undefined,
  symbol: String(backtest.symbol),
  exchange: String(backtest.exchange),
  strategy: String(backtest.strategy),
  start_date: String(backtest.start_date),
  end_date: String(backtest.end_date),
  initial_balance: Number(backtest.initial_balance),
  final_balance: Number(backtest.final_balance),
  win_rate: Number(backtest.win_rate),
  profit_factor: backtest.profit_factor == null ? 0 : Number(backtest.profit_factor),
  max_drawdown: Number(backtest.max_drawdown),
  status: (backtest.status as StoredBacktest['status'] | undefined) ?? 'completed',
  workflow_instance_id: typeof backtest.workflow_instance_id === 'string' ? backtest.workflow_instance_id : null,
  error_message: typeof backtest.error_message === 'string' ? backtest.error_message : null,
  parameters: parseJsonField(backtest.parameters as StoredBacktest['parameters'] | string | undefined, {
    takeProfitLevel: 0,
    stopLossLevel: 0,
  }),
});

const normalizeBot = (bot: Record<string, unknown>): Bot => ({
  id: String(bot.id),
  name: String(bot.name),
  strategy: String(bot.strategy),
  symbol: String(bot.symbol),
  exchange: String(bot.exchange),
  status: bot.status as Bot['status'],
  parameters: parseJsonField(bot.parameters as Bot['parameters'] | string | undefined, {} as Bot['parameters']),
  created_at: String(bot.created_at),
  updated_at: String(bot.updated_at),
  last_trade_at: bot.last_trade_at ? String(bot.last_trade_at) : null,
  total_trades: Number(bot.total_trades ?? 0),
  win_rate: Number(bot.win_rate ?? 0),
  total_profit: Number(bot.total_profit ?? 0),
});

export async function listBacktests(): Promise<StoredBacktest[]> {
  const data = await apiRequest<Record<string, unknown>[]>('/api/backtests');
  return data.map(normalizeBacktest);
}

export async function listStrategies(): Promise<StrategyCatalogItem[]> {
  const data = await apiRequest<StrategyCatalogRecord[]>('/api/strategies');
  return data.map(normalizeStrategyCatalogItem);
}

export async function getBacktest(id: string): Promise<StoredBacktest> {
  const data = await apiRequest<Record<string, unknown>>(`/api/backtests/${id}`);
  return normalizeBacktest(data);
}

export async function listBacktestTrades(id: string): Promise<Trade[]> {
  const data = await apiRequest<Record<string, unknown>[]>(`/api/backtests/${id}/trades`);
  return data.map(normalizeTrade);
}

export async function queueBacktestRun(payload: {
  backtest: Pick<StoredBacktest, 'symbol' | 'exchange' | 'strategy' | 'start_date' | 'end_date' | 'initial_balance' | 'parameters'>;
}): Promise<StoredBacktest> {
  const data = await apiRequest<Record<string, unknown>>('/api/backtests', {
    method: 'POST',
    body: JSON.stringify({
      backtest: payload.backtest,
    }),
  });
  return normalizeBacktest(data);
}

export async function waitForBacktestCompletion(
  id: string,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<StoredBacktest> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 10 * 60 * 1000;
  const startedAt = Date.now();

  for (;;) {
    const backtest = await getBacktest(id);

    if (backtest.status === 'completed') {
      return backtest;
    }

    if (backtest.status === 'failed') {
      throw new Error(backtest.error_message || 'Backtest workflow failed');
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Backtest workflow timed out while waiting for completion');
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
}

export async function listBots(): Promise<Bot[]> {
  const data = await apiRequest<Record<string, unknown>[]>('/api/bots');
  return data.map(normalizeBot);
}

export async function createBotRecord(payload: Omit<Bot, 'id' | 'created_at' | 'updated_at' | 'last_trade_at' | 'total_trades' | 'win_rate' | 'total_profit'>): Promise<Bot> {
  const data = await apiRequest<Record<string, unknown>>('/api/bots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeBot(data);
}

export async function updateBotStatus(botId: string, status: Bot['status']): Promise<Bot> {
  const data = await apiRequest<Record<string, unknown>>(`/api/bots/${botId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return normalizeBot(data);
}

export async function deleteBotRecord(botId: string): Promise<void> {
  await apiRequest<void>(`/api/bots/${botId}`, {
    method: 'DELETE',
  });
}

export interface MarketTick {
  timestamp: Date;
  bid: number;
  ask: number;
  bidVolume: number;
  askVolume: number;
}

export async function fetchMarketTicks(params: {
  symbol: string;
  startDate: string;
  endDate: string;
  timeframe: string;
  assetClass?: MarketAssetClass;
  provider?: MarketDataProviderId;
}): Promise<MarketTick[]> {
  const searchParams = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((accumulator, [key, value]) => {
      if (value) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {}),
  );
  const data = await apiRequest<{ ticks: Array<Omit<MarketTick, 'timestamp'> & { timestamp: string }> }>(`/api/market-data/ticks?${searchParams.toString()}`);
  return data.ticks.map((tick) => ({
    ...tick,
    timestamp: new Date(tick.timestamp),
  }));
}