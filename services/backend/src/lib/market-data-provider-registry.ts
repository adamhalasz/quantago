import type { BackendEnv } from '../worker-types';
import type { MarketDataProviderId } from './market-data-types';
import { createClickHouseMarketDataProvider } from './market-data-clickhouse-provider';
import { yahooMarketDataProvider } from './market-data-yahoo-provider';

export const getMarketDataProvider = (providerId: MarketDataProviderId = 'yahoo', env?: BackendEnv) => {
  if (providerId === 'clickhouse') {
    if (!env) {
      throw new Error('ClickHouse provider requires worker bindings');
    }

    return createClickHouseMarketDataProvider(env);
  }

  return yahooMarketDataProvider;
};

export const listMarketDataProviders = () => ['yahoo', 'clickhouse'] as MarketDataProviderId[];
