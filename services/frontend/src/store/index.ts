import { create } from 'zustand';
import { backtestsSlice } from '@/routes/backtests/backtests-store';
import { botsSlice } from '@/routes/bots/bots-store';
import { strategiesSlice, type StrategyStats } from '@/routes/strategies/strategies-store';
import type { StrategyCatalogItem } from '@/lib/strategy-catalog';
import type { Bot, StoredBacktest, Trade } from '@/lib/types';
import type { CreateBacktestPayload } from '@/routes/backtests/backtests-api';
import type { CreateBotPayload } from '@/routes/bots/bots-api';

type AppState = {
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  backtests: StoredBacktest[];
  selectedBacktest: StoredBacktest | null;
  backtestTrades: Trade[];
  bots: Bot[];
  strategiesCatalog: StrategyCatalogItem[];
  strategyStats: Record<string, StrategyStats>;
  fetchBacktests: () => Promise<void>;
  fetchBacktestDetail: (backtestId: string) => Promise<void>;
  createBacktest: (payload: CreateBacktestPayload) => Promise<void>;
  fetchBots: () => Promise<void>;
  createBot: (payload: CreateBotPayload) => Promise<void>;
  updateBotStatus: (botId: string, status: Bot['status']) => Promise<void>;
  deleteBot: (botId: string) => Promise<void>;
  fetchStrategiesCatalog: () => Promise<void>;
  fetchStrategyStats: () => Promise<void>;
};

export const useAppStore = create<AppState>()((set, get) => ({
  loading: {},
  errors: {},
  ...backtestsSlice(set, get),
  ...botsSlice(set, get),
  ...strategiesSlice(set, get),
}));