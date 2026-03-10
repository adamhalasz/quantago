import { FALLBACK_STRATEGY_CATALOG, type StrategyCatalogItem } from '@/lib/strategy-catalog';
import type { StoredBacktest } from '@/lib/types';
import { withLoading } from '@/store/asyncWrapper';
import * as api from './strategies-api';

export type StrategyStats = {
  totalBacktests: number;
  avgWinRate: number;
  avgProfitFactor: number;
  avgDrawdown: number;
  bestTrade: number;
  worstTrade: number;
};

const calculateStats = (backtests: StoredBacktest[], strategies: StrategyCatalogItem[]) => {
  return strategies.reduce<Record<string, StrategyStats>>((accumulator, strategy) => {
    const strategyBacktests = backtests.filter((backtest) => backtest.strategy === strategy.name);

    if (strategyBacktests.length === 0) {
      accumulator[strategy.name] = {
        totalBacktests: 0,
        avgWinRate: 0,
        avgProfitFactor: 0,
        avgDrawdown: 0,
        bestTrade: 0,
        worstTrade: 0,
      };
      return accumulator;
    }

    accumulator[strategy.name] = {
      totalBacktests: strategyBacktests.length,
      avgWinRate: strategyBacktests.reduce((sum, backtest) => sum + backtest.win_rate, 0) / strategyBacktests.length,
      avgProfitFactor:
        strategyBacktests.reduce((sum, backtest) => sum + (backtest.profit_factor || 0), 0) / strategyBacktests.length,
      avgDrawdown:
        strategyBacktests.reduce((sum, backtest) => sum + backtest.max_drawdown, 0) / strategyBacktests.length,
      bestTrade: Math.max(
        ...strategyBacktests.map(
          (backtest) => ((backtest.final_balance - backtest.initial_balance) / backtest.initial_balance) * 100,
        ),
      ),
      worstTrade: Math.min(
        ...strategyBacktests.map(
          (backtest) => ((backtest.final_balance - backtest.initial_balance) / backtest.initial_balance) * 100,
        ),
      ),
    };

    return accumulator;
  }, {});
};

export const strategiesSlice = (set: any, get: any) => ({
  strategiesCatalog: [] as StrategyCatalogItem[],
  strategyStats: {} as Record<string, StrategyStats>,

  fetchStrategiesCatalog: async () => {
    return withLoading(
      'fetchStrategiesCatalog',
      async (_set, _get, setKey) => {
        const strategies = await api.fetchStrategiesCatalog();
        setKey('strategiesCatalog', strategies);
      },
      set,
      get,
    );
  },

  fetchStrategyStats: async () => {
    return withLoading(
      'fetchStrategyStats',
      async (_set, _get, setKey) => {
        const backtests = await api.fetchStrategyBacktests();
        const strategies = _get().strategiesCatalog.length > 0 ? _get().strategiesCatalog : FALLBACK_STRATEGY_CATALOG;
        setKey('strategyStats', calculateStats(backtests, strategies));
      },
      set,
      get,
    );
  },
});