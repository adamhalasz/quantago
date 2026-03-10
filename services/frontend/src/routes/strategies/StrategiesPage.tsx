import React from 'react';
import { useLocation } from 'wouter';
import { Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFetchStrategyStats, useStrategiesCatalog } from './strategies-hooks';

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export function StrategiesPage() {
  const [, navigate] = useLocation();
  const { data: strategies, error: strategiesError, run: runCatalog } = useStrategiesCatalog();
  const { data: strategyStats, isLoading, error, run } = useFetchStrategyStats();

  React.useEffect(() => {
    void runCatalog();
  }, [runCatalog]);

  React.useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trading Strategies</h1>
          <p className="mt-2 text-gray-600">Review the indicator mix and historical performance of each strategy.</p>
        </div>
        <Brain className="h-12 w-12 text-indigo-600" />
      </div>

      {error || strategiesError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || strategiesError}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
          Loading strategy stats...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {strategies.map((strategy) => {
            const stats = strategyStats[strategy.name];

            return (
              <article key={strategy.name} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{strategy.name}</h2>
                    <p className="mt-2 text-sm text-gray-600">{strategy.description}</p>
                  </div>
                  <Badge variant="secondary">{strategy.defaultFrequency}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {strategy.indicators.map((indicator) => (
                    <Badge key={indicator} variant="outline">
                      {indicator}
                    </Badge>
                  ))}
                  <Badge variant="secondary">{strategy.runtime.language}</Badge>
                  <Badge variant="outline">v{strategy.version}</Badge>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-600">Backtests</p>
                    <p className="font-semibold text-gray-900">{stats?.totalBacktests ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-600">Avg Win Rate</p>
                    <p className="font-semibold text-gray-900">{formatPercent(stats?.avgWinRate ?? 0)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-600">Avg Profit Factor</p>
                    <p className="font-semibold text-gray-900">{(stats?.avgProfitFactor ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-600">Avg Drawdown</p>
                    <p className="font-semibold text-gray-900">{(stats?.avgDrawdown ?? 0).toFixed(2)}%</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Best trade: {(stats?.bestTrade ?? 0).toFixed(2)}% · Worst trade: {(stats?.worstTrade ?? 0).toFixed(2)}% · Min candles: {strategy.minCandles}
                  </div>
                  <Button onClick={() => navigate(`/strategies/${encodeURIComponent(strategy.name)}`)} variant="outline">
                    View Details
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}