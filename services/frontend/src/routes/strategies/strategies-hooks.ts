import { useAppStore } from '@/store';
import { FALLBACK_STRATEGY_CATALOG } from '@/lib/strategy-catalog';

export function useStrategiesCatalog() {
  const data = useAppStore((state) => state.strategiesCatalog.length > 0 ? state.strategiesCatalog : FALLBACK_STRATEGY_CATALOG);
  const isLoading = useAppStore((state) => state.loading.fetchStrategiesCatalog ?? false);
  const error = useAppStore((state) => state.errors.fetchStrategiesCatalog ?? null);
  const run = useAppStore((state) => state.fetchStrategiesCatalog);

  return { data, isLoading, error, run };
}

export function useFetchStrategyStats() {
  const data = useAppStore((state) => state.strategyStats);
  const isLoading = useAppStore((state) => state.loading.fetchStrategyStats ?? false);
  const error = useAppStore((state) => state.errors.fetchStrategyStats ?? null);
  const run = useAppStore((state) => state.fetchStrategyStats);

  return { data, isLoading, error, run };
}