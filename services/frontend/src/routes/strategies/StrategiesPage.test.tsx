import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FALLBACK_STRATEGY_CATALOG } from '@/lib/strategy-catalog';
import { useAppStore } from '@/store';
import { StrategiesPage } from './StrategiesPage';

vi.mock('wouter', () => ({
  useLocation: () => ['/strategies', vi.fn()],
}));

describe('StrategiesPage', () => {
  beforeEach(() => {
    useAppStore.setState({
      loading: {},
      errors: {},
      strategiesCatalog: FALLBACK_STRATEGY_CATALOG,
      strategyStats: {
        'Momentum Strategy': {
          totalBacktests: 6,
          avgWinRate: 61,
          avgProfitFactor: 1.6,
          avgDrawdown: 4.2,
          bestTrade: 9.4,
          worstTrade: -2.1,
        },
      },
      fetchStrategiesCatalog: vi.fn().mockResolvedValue(undefined),
      fetchStrategyStats: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders strategy overview cards', () => {
    render(<StrategiesPage />);

    expect(screen.getByText('Trading Strategies')).toBeInTheDocument();
    expect(screen.getByText('Momentum Strategy')).toBeInTheDocument();
  });
});