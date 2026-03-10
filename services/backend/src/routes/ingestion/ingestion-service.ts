import { AppError } from '../../lib/errors';
import { ensureClickHouseSchema, replaceOHLCVRange } from '../../lib/clickhouse';
import { fetchCcxtIngestionRows } from '../../lib/ingestion/ccxt';
import { fetchFxMinuteRows } from '../../lib/ingestion/fx-minute-data';
import { buildFallbackSymbolDefinition, getDefaultIngestionSource, listDefaultIngestionSymbols, resolveDefaultIngestionSymbol } from '../../lib/ingestion/symbols';
import type { IngestionRequest, IngestionSymbolDefinition, IngestionTimeframe, OHLCVRow } from '../../lib/ingestion/types';
import { fetchYahooIngestionRows } from '../../lib/ingestion/yahoo';
import type { MarketAssetClass } from '../../lib/market-data-types';
import type { BackendEnv } from '../../worker-types';
import { getIngestionSymbol, getLastSuccessfulIngestion, insertIngestionLog, listIngestionLogs, listIngestionSymbols, upsertIngestionSymbol } from './ingestion-repository';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseMetadata = (metadata: Record<string, unknown> | string): Record<string, unknown> => {
  if (typeof metadata === 'string') {
    return JSON.parse(metadata) as Record<string, unknown>;
  }

  return metadata;
};

const parseSupportedTimeframes = (value: unknown, fallback: IngestionTimeframe[]) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const supported = value.filter((entry): entry is IngestionTimeframe => entry === '1m' || entry === '1h' || entry === '1d');
  return supported.length > 0 ? supported : fallback;
};

const buildBaseDefinition = (request: Pick<IngestionRequest, 'symbol' | 'assetType' | 'timeframe'>) => {
  return resolveDefaultIngestionSymbol(request.symbol, request.assetType, request.timeframe)
    ?? buildFallbackSymbolDefinition(request.symbol, request.assetType, getDefaultIngestionSource(request.assetType), request.timeframe);
};

export const resolveIngestionDefinition = async (
  env: BackendEnv,
  request: Pick<IngestionRequest, 'symbol' | 'assetType' | 'timeframe'>,
): Promise<IngestionSymbolDefinition> => {
  const baseDefinition = buildBaseDefinition(request);
  const registered = await getIngestionSymbol(env, request.symbol, request.assetType);

  if (!registered) {
    return baseDefinition;
  }

  const metadata = parseMetadata(registered.metadata);
  return {
    ...baseDefinition,
    source: registered.source,
    availableFrom: typeof metadata.availableFrom === 'string' ? metadata.availableFrom : baseDefinition.availableFrom,
    sourceSymbol: typeof metadata.sourceSymbol === 'string' ? metadata.sourceSymbol : baseDefinition.sourceSymbol,
    supportedTimeframes: parseSupportedTimeframes(metadata.supportedTimeframes, baseDefinition.supportedTimeframes),
    exchangeId: typeof metadata.exchangeId === 'string' ? metadata.exchangeId : baseDefinition.exchangeId,
    rateLimitMs: typeof metadata.rateLimitMs === 'number' ? metadata.rateLimitMs : baseDefinition.rateLimitMs,
  };
};

const ensureTimeframeSupported = (definition: IngestionSymbolDefinition, timeframe: IngestionTimeframe) => {
  if (!definition.supportedTimeframes.includes(timeframe)) {
    throw new AppError(`Timeframe ${timeframe} is not enabled for ${definition.symbol} via ${definition.source}`, 400);
  }
};

const resolveTargetRange = (request: IngestionRequest, availableFrom: string) => {
  const fromTime = request.fromTime ?? availableFrom;
  const toTime = request.toTime ?? new Date().toISOString();
  return { fromTime, toTime };
};

const collectForexRows = async (
  symbol: string,
  sourceSymbol: string,
  fromTime: string,
  toTime: string,
): Promise<OHLCVRow[]> => {
  const start = new Date(fromTime);
  const end = new Date(toTime);
  const rows: OHLCVRow[] = [];
  let year = start.getUTCFullYear();
  const finalYear = end.getUTCFullYear();

  while (year <= finalYear) {
    const currentYear = new Date().getUTCFullYear();
    if (year < currentYear) {
      rows.push(...await fetchFxMinuteRows({ symbol, pairCode: sourceSymbol, year, fromTime, toTime }));
    } else {
      for (let month = 1; month <= 12; month += 1) {
        rows.push(...await fetchFxMinuteRows({ symbol, pairCode: sourceSymbol, year, month, fromTime, toTime }));
      }
    }

    year += 1;
  }

  return rows;
};

const fetchRowsForRequest = async (env: BackendEnv, request: IngestionRequest, definition: IngestionSymbolDefinition): Promise<OHLCVRow[]> => {
  ensureTimeframeSupported(definition, request.timeframe);
  const { fromTime, toTime } = resolveTargetRange(request, definition.availableFrom);

  if (definition.source === 'histdata') {
    if (request.timeframe !== '1m') {
      throw new AppError('Forex ingestion currently supports 1m only via FX-1-Minute-Data', 400);
    }

    return collectForexRows(request.symbol, definition.sourceSymbol, fromTime, toTime);
  }

  if (definition.source === 'ccxt') {
    return fetchCcxtIngestionRows({
      symbol: request.symbol,
      sourceSymbol: definition.sourceSymbol,
      exchangeId: definition.exchangeId ?? env.CCXT_EXCHANGE ?? 'binance',
      timeframe: request.timeframe,
      fromTime,
      toTime,
      rateLimitMs: definition.rateLimitMs ?? Number(env.CCXT_DELAY_MS ?? 1500),
      maxRetries: Number(env.CCXT_MAX_RETRIES ?? 3),
    });
  }

  if (request.timeframe === '1m') {
    throw new AppError('1m ingestion is only supported for forex or CCXT-backed crypto symbols', 400);
  }

  return fetchYahooIngestionRows({
    symbol: request.symbol,
    assetType: request.assetType as Exclude<MarketAssetClass, 'forex'>,
    timeframe: request.timeframe as Extract<IngestionTimeframe, '1d' | '1h'>,
    fromTime,
    toTime,
  });
};

export const ingestSymbolData = async (env: BackendEnv, request: IngestionRequest) => {
  const definition = await resolveIngestionDefinition(env, request);
  const { fromTime, toTime } = resolveTargetRange(request, definition.availableFrom);
  const rows = await fetchRowsForRequest(env, { ...request, fromTime, toTime }, definition);

  await ensureClickHouseSchema(env);
  await replaceOHLCVRange(env, rows, {
    symbol: request.symbol,
    assetType: request.assetType,
    timeframe: request.timeframe,
    fromTime,
    toTime,
  });

  await insertIngestionLog(env, {
    assetType: request.assetType,
    symbol: request.symbol,
    workflowId: request.workflowId,
    workflowType: request.workflowType,
    timeframe: request.timeframe,
    fromTime,
    toTime,
    rowsWritten: rows.length,
    status: rows.length > 0 ? 'success' : 'partial',
  });

  return {
    symbol: request.symbol,
    assetType: request.assetType,
    timeframe: request.timeframe,
    fromTime,
    toTime,
    rowsWritten: rows.length,
  };
};

export const getBulkBatchSize = (assetType: MarketAssetClass, timeframe: IngestionTimeframe) => {
  if (assetType === 'forex' && timeframe === '1m') return 10;
  if (timeframe === '1d') return 50;
  if (timeframe === '1h') return 100;
  return 50;
};

export const getWorkflowSymbols = async (
  env: BackendEnv,
  assetType: MarketAssetClass | undefined,
  timeframe: IngestionTimeframe,
  symbols?: string[],
) => {
  if (symbols?.length) {
    return symbols;
  }

  const registered = await listIngestionSymbols(env);
  const enabled = registered.filter((entry) => entry.enabled && (!assetType || entry.asset_type === assetType));
  if (enabled.length > 0) {
    return enabled
      .filter((entry) => {
        const metadata = parseMetadata(entry.metadata);
        const supported = Array.isArray(metadata.supportedTimeframes) ? metadata.supportedTimeframes as string[] : [];
        return supported.length === 0 || supported.includes(timeframe);
      })
      .map((entry) => entry.symbol);
  }

  return listDefaultIngestionSymbols(assetType, timeframe).map((entry) => entry.symbol);
};

export const getIncrementalFromTime = async (
  env: BackendEnv,
  symbol: string,
  timeframe: IngestionTimeframe,
  fallbackFrom: string,
) => {
  const last = await getLastSuccessfulIngestion(env, symbol, timeframe);
  if (!last?.to_time) {
    return fallbackFrom;
  }

  return new Date(new Date(last.to_time).getTime() + 60 * 1000).toISOString();
};

const getDelayMs = (env: BackendEnv, definition: IngestionSymbolDefinition) => {
  if (definition.rateLimitMs != null) {
    return definition.rateLimitMs;
  }

  if (definition.source === 'ccxt') {
    return Number(env.CCXT_DELAY_MS ?? 1500);
  }

  if (definition.source === 'histdata') {
    return 1500;
  }

  return Number(env.YFINANCE_DELAY_MS ?? 1000);
};

export const delayBetweenSymbols = async (
  env: BackendEnv,
  request: Pick<IngestionRequest, 'symbol' | 'assetType' | 'timeframe'>,
) => {
  const definition = await resolveIngestionDefinition(env, request);
  const delayMs = getDelayMs(env, definition);
  await sleep(delayMs);
};

export const getBatchCooldownMs = async (
  env: BackendEnv,
  request: Pick<IngestionRequest, 'symbol' | 'assetType' | 'timeframe'>,
) => {
  const definition = await resolveIngestionDefinition(env, request);
  if (definition.source === 'ccxt') {
    return Number(env.CCXT_BATCH_COOLDOWN_MS ?? 120000);
  }

  return Number(env.YFINANCE_BATCH_COOLDOWN_MS ?? 300000);
};

export const listLogs = (env: BackendEnv, query: { assetType?: MarketAssetClass; symbol?: string; limit: number }) => listIngestionLogs(env, query);

export const listSymbols = (env: BackendEnv) => listIngestionSymbols(env);

export const saveSymbol = (env: BackendEnv, input: {
  symbol: string;
  assetType: MarketAssetClass;
  source: 'histdata' | 'yahoo' | 'ccxt';
  enabled: boolean;
  metadata: Record<string, unknown>;
}) => {
  return upsertIngestionSymbol(env, input);
};