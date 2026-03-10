import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ASSET_CLASSES, CRYPTO_SYMBOLS, CURRENCIES, MARKET_DATA_PROVIDERS, STOCK_SYMBOLS, TIMEFRAMES } from '@/lib/constants';
import { FALLBACK_STRATEGY_CATALOG, STRATEGY_ICON_MAP } from '@/lib/strategy-catalog';
import { ArrowLeft, AlertTriangle, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistoryProvider } from '@/lib/history/HistoryProvider';
import { EntryFrequency } from '@/lib/types';
import { queueBacktestRun, waitForBacktestCompletion } from '@/lib/api-client';
import { buildStoredSymbol, estimateTradingDays, getAvailableExchanges, getDefaultExchangeForAssetClass, getDefaultProviderForAssetClass, getDefaultSymbolForAssetClass, type MarketAssetClass, type MarketDataProviderId } from '@/lib/market';
import { useStrategiesCatalog } from '@/routes/strategies/strategies-hooks';

type StrategyIcon = (typeof STRATEGY_ICON_MAP)[keyof typeof STRATEGY_ICON_MAP];
type CreateBacktestFormData = {
  dataSource: 'live' | 'synthetic';
  assetClass: MarketAssetClass;
  provider: MarketDataProviderId;
  symbol: string;
  baseCurrency: string;
  strategy: string;
  cumulativeTrading: boolean;
  macdFastPeriod: number;
  macdSlowPeriod: number;
  macdSignalPeriod: number;
  bollingerPeriod: number;
  bollingerDeviation: number;
  emaPeriod: number;
  vwapPeriod: number;
  atrPeriod: number;
  atrMultiplier: number;
  targetCurrency: string;
  exchange: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  takeProfitLevel: number;
  stopLossLevel: number;
  rsiOverbought: number;
  rsiOversold: number;
};

export function CreateBacktestPage() {
  const [, navigate] = useLocation();
  const { data: strategyCatalog, run: runStrategiesCatalog } = useStrategiesCatalog();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [validation, setValidation] = React.useState<{
    tradingDays: number;
    totalDays: number;
    minRequiredCandles: number;
    isValid: boolean;
    message: string | null;
  }>({
    tradingDays: 0,
    totalDays: 0,
    minRequiredCandles: 0,
    isValid: false,
    message: null
  });
  const startTimeRef = React.useRef<number | null>(null);
  const STRATEGIES = strategyCatalog.length > 0 ? strategyCatalog : FALLBACK_STRATEGY_CATALOG;
  const STRATEGY_TIMEFRAMES = React.useMemo(() => {
    return Object.fromEntries(STRATEGIES.map((strategy) => [strategy.name, strategy.recommendedTimeframe]));
  }, [STRATEGIES]);
  const STRATEGY_ICONS = STRATEGY_ICON_MAP;
  const strategyTimeframes = STRATEGY_TIMEFRAMES as Record<string, string>;
  const strategyIcons = STRATEGY_ICONS as Record<string, StrategyIcon>;
  const defaultStartDate = new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0];
  const defaultEndDate = new Date().toISOString().split('T')[0];
  const defaultStrategy = STRATEGIES[0];
  const defaultConfig = defaultStrategy.getDefaultConfig();
  const defaultTimeframe = '1d'; // Default to daily timeframe

  const [formData, setFormData] = React.useState<CreateBacktestFormData>({
    dataSource: 'live',
    assetClass: 'forex',
    provider: getDefaultProviderForAssetClass('forex'),
    symbol: getDefaultSymbolForAssetClass('crypto'),
    baseCurrency: 'EUR',
    strategy: defaultStrategy.name,
    cumulativeTrading: false,
    // Indicator Parameters
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    bollingerPeriod: 20,
    bollingerDeviation: 2,
    emaPeriod: 14,
    vwapPeriod: 14,
    atrPeriod: 14,
    atrMultiplier: 2,
    targetCurrency: 'USD',
    exchange: getDefaultExchangeForAssetClass('forex'),
    timeframe: defaultTimeframe,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    initialBalance: 10000,
    takeProfitLevel: defaultConfig.takeProfitLevel,
    stopLossLevel: defaultConfig.stopLossLevel,
    rsiOverbought: 65,
    rsiOversold: 35
  });

  const [dataInfo, setDataInfo] = React.useState<{ size: number; points: number; time: number } | null>(null);
  const availableExchanges = React.useMemo(() => getAvailableExchanges(formData.assetClass), [formData.assetClass]);

  React.useEffect(() => {
    void runStrategiesCatalog();
  }, [runStrategiesCatalog]);

  // Calculate data info whenever relevant form fields change
  React.useEffect(() => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const tradingDays = estimateTradingDays(days, formData.assetClass);
    
    // Calculate data points based on timeframe
    let points = 0;
    switch (formData.timeframe) {
      case '1m': points = tradingDays * 1440; break; // Minutes per day
      case '5m': points = tradingDays * 288; break; // 5-min intervals
      case '15m': points = tradingDays * 96; break; // 15-min intervals
      case '1h': points = tradingDays * 24; break; // Hours per day
      case '4h': points = tradingDays * 6; break; // 4-hour intervals
      case '1d': points = tradingDays; break; // Days
      default: points = tradingDays * 24; break; // Default to hourly
    }
    
    // Calculate size based on data points and additional factors
    const bytesPerPoint = 50; // Base size per data point
    const strategyComplexityMultiplier = (() => {
      const strategy = STRATEGIES.find(s => s.name === formData.strategy);
      return (strategy?.indicators.length || 1) * 1.5; // Increased multiplier for more accurate size estimation
    })();
    
    // Calculate total size in bytes
    const totalBytes = points * bytesPerPoint * strategyComplexityMultiplier;
    
    // Convert to appropriate unit (KB, MB, GB, TB)
    const size = totalBytes / (1024 * 1024); // Convert to MB
    
    // Calculate processing time based on data size and complexity
    const baseTimePerPoint = 0.0001; // Base processing time per point in seconds
    const timeMultiplier = (() => {
      switch (formData.dataSource) {
        case 'synthetic': return 0.5; // Synthetic data processes faster
        case 'live': return 1.5; // Live data requires API calls
        default: return 1;
      }
    })();
    
    const processingTimeSeconds = points * baseTimePerPoint * strategyComplexityMultiplier * timeMultiplier;
    const processingTimeMinutes = Math.ceil(processingTimeSeconds / 60);
    
    setDataInfo({
      size,
      points,
      time: processingTimeMinutes
    });
  }, [
    STRATEGIES,
    formData.timeframe,
    formData.startDate,
    formData.endDate,
    formData.strategy,
    formData.dataSource,
    formData.assetClass,
  ]);

  // Calculate validation info whenever relevant form fields change
  React.useEffect(() => {
    const startTime = new Date(formData.startDate);
    const endTime = new Date(formData.endDate);
    
    // Calculate total and trading days
    const totalDays = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
    const tradingDays = estimateTradingDays(totalDays, formData.assetClass);
    
    // Get minimum required candles based on strategy
    const strategy = STRATEGIES.find(s => s.name === formData.strategy);
    let minRequiredCandles = 0;
    
    // Calculate base requirement based on indicators
    if (strategy) {
      strategy.indicators.forEach(indicator => {
        switch (indicator) {
          case 'RSI': minRequiredCandles = Math.max(minRequiredCandles, 14); break;
          case 'MACD': minRequiredCandles = Math.max(minRequiredCandles, 26); break;
          case 'Bollinger Bands': minRequiredCandles = Math.max(minRequiredCandles, 20); break;
          case 'EMA': minRequiredCandles = Math.max(minRequiredCandles, 50); break;
          case 'VWAP': minRequiredCandles = Math.max(minRequiredCandles, 20); break;
          default: minRequiredCandles = Math.max(minRequiredCandles, 20);
        }
      });

      // Adjust based on frequency
      const frequencyMultiplier = {
        'scalping': 1,
        'daily': 2,
        'weekly': 4,
        'monthly': 6,
        'quarterly': 8
      }[strategy.defaultFrequency] || 1;

      minRequiredCandles = Math.ceil(minRequiredCandles * frequencyMultiplier);
    }

    // Validate and set message
    const isValid = tradingDays >= minRequiredCandles;
    const message = isValid ? null :
      `Insufficient data for backtesting with ${formData.strategy}. ` +
      `Need at least ${minRequiredCandles} trading days of data ` +
      `(approximately ${Math.ceil(minRequiredCandles * 7/5)} calendar days including weekends/holidays). ` +
      `Your selected period is ${totalDays} days and contains approximately ${tradingDays} trading days. ` +
      `Please extend your date range to include more trading days.`;

    setValidation({
      tradingDays,
      totalDays,
      minRequiredCandles,
      isValid,
      message
    });
  }, [STRATEGIES, formData.startDate, formData.endDate, formData.strategy, formData.assetClass]);

  const handleStrategyChange = (value: string) => {
    const strategy = STRATEGIES.find(s => s.name === value);
    if (strategy) {
      // Calculate minimum required days
      let minRequiredCandles = 0;
      strategy.indicators.forEach(indicator => {
        switch (indicator) {
          case 'RSI': minRequiredCandles = Math.max(minRequiredCandles, 14); break;
          case 'MACD': minRequiredCandles = Math.max(minRequiredCandles, 26); break;
          case 'Bollinger Bands': minRequiredCandles = Math.max(minRequiredCandles, 20); break;
          case 'EMA': minRequiredCandles = Math.max(minRequiredCandles, 50); break;
          case 'VWAP': minRequiredCandles = Math.max(minRequiredCandles, 20); break;
          default: minRequiredCandles = Math.max(minRequiredCandles, 20);
        }
      });

      // Adjust based on frequency
      const frequencyMultiplier = {
        'scalping': 1,
        'daily': 2,
        'weekly': 4,
        'monthly': 6,
        'quarterly': 8
      }[strategy.defaultFrequency] || 1;

      minRequiredCandles = Math.ceil(minRequiredCandles * frequencyMultiplier);

      // Add 50% buffer for weekends/holidays
      const calendarDays = Math.ceil(minRequiredCandles * 7/5 * 1.5);
      
      // Calculate new start date
      const endDate = new Date(formData.endDate);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - calendarDays);

      const config = strategy.getDefaultConfig();
      const recommendedTimeframe = strategyTimeframes[value] || defaultTimeframe;
      setFormData(prev => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        // Reset indicator parameters to defaults based on strategy
        macdFastPeriod: strategy.name.includes('MACD') ? 12 : prev.macdFastPeriod,
        macdSlowPeriod: strategy.name.includes('MACD') ? 26 : prev.macdSlowPeriod,
        macdSignalPeriod: strategy.name.includes('MACD') ? 9 : prev.macdSignalPeriod,
        bollingerPeriod: strategy.name.includes('Bollinger') ? 20 : prev.bollingerPeriod,
        bollingerDeviation: strategy.name.includes('Bollinger') ? 2 : prev.bollingerDeviation,
        emaPeriod: strategy.name.includes('Moving Average') ? 14 : prev.emaPeriod,
        vwapPeriod: strategy.name.includes('Volume') ? 14 : prev.vwapPeriod,
        atrPeriod: strategy.name.includes('ATR') ? 14 : prev.atrPeriod,
        atrMultiplier: strategy.name.includes('ATR') ? 2 : prev.atrMultiplier,
        strategy: value,
        timeframe: recommendedTimeframe,
        takeProfitLevel: config.takeProfitLevel,
        stopLossLevel: config.stopLossLevel,
        rsiOverbought: 65,
        rsiOversold: 35
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProgress(null);
    startTimeRef.current = Date.now();
    

    try {
      const storedSymbol = buildStoredSymbol({
        assetClass: formData.assetClass,
        symbol: formData.symbol,
        baseCurrency: formData.baseCurrency,
        targetCurrency: formData.targetCurrency,
      });

      // Validate date range
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const now = new Date();

      if (start > now || end > now) {
        throw new Error('Cannot backtest future dates. Please select a valid historical date range.');
      }

      if (start >= end) {
        throw new Error('Start date must be before end date.');
      }
      
      // Calculate estimated time based on timeframe and date range
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const timeframeMultiplier = (() => {
        switch (formData.timeframe) {
          case 'TICK': return 20;
          case 'S1': return 15;
          case 'M1': return 10;
          case 'M5': return 8;
          case 'M15': return 6;
          case 'M30': return 5;
          case 'H1': return 4;
          case 'H4': return 3;
          case 'D1': return 2;
          case 'MN1': return 1;
          default: return 5;
        }
      })();
      
      const estimatedSeconds = days * timeframeMultiplier;
      setEstimatedTime(`${Math.ceil(estimatedSeconds / 60)} minutes`);

      setProgress(10);

      const queuedBacktest = await queueBacktestRun({
        backtest: {
          symbol: storedSymbol,
          exchange: formData.exchange,
          strategy: formData.strategy,
          start_date: formData.startDate,
          end_date: formData.endDate,
          initial_balance: formData.initialBalance,
          parameters: {
            assetClass: formData.assetClass,
            provider: formData.provider,
            timeframe: formData.timeframe,
            entryFrequency: STRATEGIES.find(s => s.name === formData.strategy)?.defaultFrequency || EntryFrequency.DAILY,
            riskPerTrade: 2,
            maxTradeTime: 8,
            takeProfitLevel: formData.takeProfitLevel,
            stopLossLevel: formData.stopLossLevel,
            rsiOverbought: formData.rsiOverbought,
            rsiOversold: formData.rsiOversold,
            macdFastPeriod: formData.macdFastPeriod,
            macdSlowPeriod: formData.macdSlowPeriod,
            macdSignalPeriod: formData.macdSignalPeriod,
            bollingerPeriod: formData.bollingerPeriod,
            bollingerDeviation: formData.bollingerDeviation,
            emaPeriod: formData.emaPeriod,
            vwapPeriod: formData.vwapPeriod,
            atrPeriod: formData.atrPeriod,
            atrMultiplier: formData.atrMultiplier,
          }
        },
      });

      setProgress(35);
      setEstimatedTime('Queued in Cloudflare Workflow');

      const backtestData = await waitForBacktestCompletion(queuedBacktest.id, {
        intervalMs: 2000,
        timeoutMs: 10 * 60 * 1000,
      });

      setProgress(100);

      // Navigate to the backtest result page
      navigate(`/backtest/${backtestData.id}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run backtest';
      setError(errorMessage);
      
      // Scroll error into view
      const errorElement = document.getElementById('backtest-error');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New Backtest</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {/* Progress and Time Estimate */}
        {(loading || estimatedTime) && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-700">
                {loading ? 'Running Backtest in Cloudflare Workflow...' : 'Estimated Processing Time'}
              </span>
              <span className="text-sm font-medium text-indigo-700">
                {loading && progress !== null ? `${Math.round(progress)}%` : estimatedTime}
              </span>
            </div>
            {loading && (
              <div className="w-full bg-indigo-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress !== null ? progress : 0}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Asset Class</Label>
            <Select
              value={formData.assetClass}
              onValueChange={(value) => {
                const nextAssetClass = value as MarketAssetClass;
                setFormData((current) => ({
                  ...current,
                  assetClass: nextAssetClass,
                    provider: getDefaultProviderForAssetClass(nextAssetClass),
                  exchange: getDefaultExchangeForAssetClass(nextAssetClass),
                  symbol: nextAssetClass === 'forex' ? current.symbol : getDefaultSymbolForAssetClass(nextAssetClass),
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset class" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CLASSES.map((assetClass) => (
                  <SelectItem key={assetClass.value} value={assetClass.value}>
                    {assetClass.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Provider</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => setFormData((current) => ({ ...current, provider: value as MarketDataProviderId }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {MARKET_DATA_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Strategy</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    {formData.strategy && strategyIcons[formData.strategy] && (
                      <div className="flex items-center justify-center w-5 h-5">
                        {React.createElement(strategyIcons[formData.strategy], { size: 16 })}
                      </div>
                    )}
                    {formData.strategy || "Select a strategy"}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search strategies..." />
                  <CommandEmpty>No strategy found.</CommandEmpty>
                  <CommandGroup>
                    {STRATEGIES.map((strategy) => (
                      <CommandItem
                        key={strategy.name}
                        value={strategy.name}
                        onSelect={() => handleStrategyChange(strategy.name)}
                        className="py-3"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex items-center justify-center w-5 h-5 mt-0.5">
                            {strategyIcons[strategy.name] && React.createElement(strategyIcons[strategy.name], { size: 16 })}
                          </div>
                          <div>
                            <div className="font-medium">{strategy.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {strategy.description}
                              <div className="mt-1 text-xs text-indigo-600">
                                Recommended Timeframe: {TIMEFRAMES.find(tf => tf.value === strategyTimeframes[strategy.name])?.label}
                              </div>
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              formData.strategy === strategy.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="mt-1 text-sm text-gray-500">
              {STRATEGIES.find(s => s.name === formData.strategy)?.description}
            </p>
          </div>

          <div>
            <Label>Data Source</Label>
            <Select
              value={formData.dataSource}
              onValueChange={(value) => {
                setFormData({ ...formData, dataSource: value as 'live' | 'synthetic' });
                HistoryProvider.getInstance().setSource(value as 'synthetic' | 'live');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="synthetic">Synthetic Data (Testing)</SelectItem>
                <SelectItem value="live">Live Historical Data</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-sm text-gray-500">
              {formData.dataSource === 'synthetic' 
                ? "Uses generated data for testing - faster but not real market data"
                : "Uses real historical market data - more accurate but rate-limited"}
            </p>
          </div>

          {formData.assetClass === 'forex' ? (
            <>
              <div>
                <Label>Base Currency</Label>
                <Select
                  value={formData.baseCurrency}
                  onValueChange={(value) => setFormData({ ...formData, baseCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select base currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Currency</Label>
                <Select
                  value={formData.targetCurrency}
                  onValueChange={(value) => setFormData({ ...formData, targetCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem 
                        key={currency.code} 
                        value={currency.code}
                        disabled={currency.code === formData.baseCurrency}
                      >
                        {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="md:col-span-2 space-y-4">
              <div>
                <Label>{formData.assetClass === 'crypto' ? 'Crypto Symbol' : 'Stock Symbol'}</Label>
                <Select
                  value={formData.symbol}
                  onValueChange={(value) => setFormData((current) => ({ ...current, symbol: value.toUpperCase() }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select market symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.assetClass === 'crypto' ? CRYPTO_SYMBOLS : STOCK_SYMBOLS).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custom Symbol</Label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData((current) => ({ ...current, symbol: e.target.value.toUpperCase() }))}
                  placeholder={formData.assetClass === 'crypto' ? 'BTC-USD' : 'AAPL'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div>
            <Label>{formData.assetClass === 'crypto' ? 'Market Session' : 'Exchange'}</Label>
            <Select
              value={formData.exchange}
              onValueChange={(value) => setFormData({ ...formData, exchange: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.assetClass === 'crypto' ? 'Select market session' : 'Select exchange'} />
              </SelectTrigger>
              <SelectContent>
                {availableExchanges.map((exchange) => (
                  <SelectItem key={exchange.id} value={exchange.id}>
                    {exchange.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-sm text-gray-500">
              {availableExchanges.find((exchange) => exchange.id === formData.exchange)?.description}
            </p>
          </div>

          <div className="col-span-2 mb-4">
            <Label className="mb-4 block">Date Range</Label>
            {/* Validation Info */}
            <div className={`mb-4 p-6 rounded-lg ${
              validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className={`text-sm font-medium ${
                    validation.isValid ? 'text-green-800' : 'text-amber-800'
                  }`}>
                    Data Requirements
                  </h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Calendar Days:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{validation.totalDays}</span>
                        <span className="text-xs text-gray-500">
                          (Required: {Math.ceil(validation.minRequiredCandles * 7/5)})
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          validation.totalDays >= Math.ceil(validation.minRequiredCandles * 7/5)
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`} />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{formData.assetClass === 'crypto' ? 'Market Days:' : 'Trading Days:'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{validation.tradingDays}</span>
                        <span className="text-xs text-gray-500">
                          (Required: {validation.minRequiredCandles})
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          validation.tradingDays >= validation.minRequiredCandles
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`} />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mt-4">
                      <span className="text-gray-600">Coverage:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {Math.round((validation.tradingDays / validation.minRequiredCandles) * 100)}%
                        </span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              validation.isValid ? 'bg-green-500' : 'bg-amber-500'
                            }`}
                            style={{ 
                              width: `${Math.min(
                                Math.round((validation.tradingDays / validation.minRequiredCandles) * 100),
                                100
                              )}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {validation.message && (
                    <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                      <p className="text-sm text-amber-700">{validation.message}</p>
                    </div>
                  )}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  validation.isValid ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {validation.isValid ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Start Date</Label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">End Date</Label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 mt-8">
            <Label className="mb-6 block text-lg font-semibold">Timeframe Selection</Label>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                {TIMEFRAMES.map((tf) => (
                  <div
                    key={tf.value}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      formData.timeframe === tf.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setFormData({ ...formData, timeframe: tf.value })}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{tf.label}</span>
                      <div className={`w-3 h-3 rounded-full ${
                        formData.timeframe === tf.value ? 'bg-indigo-600' : 'bg-gray-300'
                      }`} />
                    </div>
                    <p className="text-sm text-gray-600">{tf.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold mb-6">Data Analysis</h3>
                {dataInfo ? (
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium text-gray-700">Data Size</span>
                        <span className="text-lg font-bold text-indigo-600">
                          {dataInfo.size < 1 
                            ? `${(dataInfo.size * 1024).toFixed(0)} KB` 
                            : dataInfo.size < 1024
                            ? `${dataInfo.size.toFixed(1)} MB`
                            : dataInfo.size < 1024 * 1024
                            ? `${(dataInfo.size / 1024).toFixed(1)} GB`
                            : `${(dataInfo.size / (1024 * 1024)).toFixed(1)} TB`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {dataInfo.size < 1 
                          ? "Small dataset suitable for quick analysis and testing"
                          : dataInfo.size < 100
                          ? "Medium dataset with good balance of detail and performance"
                          : dataInfo.size < 1024
                          ? "Large dataset providing comprehensive market coverage"
                          : "Very large dataset, consider using a larger timeframe"}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min((dataInfo.size / 100) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium text-gray-700">Data Points</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-indigo-600">{dataInfo.points.toLocaleString()}</span>
                          {(() => {
                            const strategy = STRATEGIES.find(s => s.name === formData.strategy);
                            const minPoints = strategy?.indicators.reduce((acc, indicator) => {
                              switch (indicator) {
                                case 'RSI': return Math.max(acc, 14);
                                case 'MACD': return Math.max(acc, 26);
                                case 'Bollinger Bands': return Math.max(acc, 20);
                                case 'EMA': return Math.max(acc, 50);
                                case 'VWAP': return Math.max(acc, 20);
                                default: return Math.max(acc, 20);
                              }
                            }, 0) || 0;
                            return dataInfo.points >= minPoints ? (
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600">Required Points:</span>
                        <div className="space-x-2">
                          {STRATEGIES.find(s => s.name === formData.strategy)?.indicators.map(indicator => {
                            let points = 0;
                            switch (indicator) {
                              case 'RSI': points = 14; break;
                              case 'MACD': points = 26; break;
                              case 'Bollinger Bands': points = 20; break;
                              case 'EMA': points = 50; break;
                              case 'VWAP': points = 20; break;
                              default: points = 20;
                            }
                            return (
                              <span
                                key={indicator}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  dataInfo.points >= points
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {indicator}: {points}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {dataInfo.points < 1000
                          ? "Limited data points, best for long-term trend analysis"
                          : dataInfo.points < 10000
                          ? "Sufficient data points for basic technical analysis"
                          : dataInfo.points < 100000
                          ? "Rich dataset enabling detailed pattern recognition"
                          : "High-resolution data for advanced algorithmic trading"}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min((dataInfo.points / 1000000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium text-gray-700">Processing Time</span>
                        <span className="text-lg font-bold text-indigo-600">
                          {dataInfo.time < 1 ? 'Less than a minute' : 
                           dataInfo.time < 60 ? `~${dataInfo.time} minutes` :
                           `~${Math.ceil(dataInfo.time / 60)} hours`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {dataInfo.time < 1
                          ? "Near-instant processing, ideal for rapid testing"
                          : dataInfo.time < 15
                          ? "Quick processing suitable for iterative analysis"
                          : dataInfo.time < 60
                          ? "Moderate processing time, good for detailed backtesting"
                          : "Extended processing time, recommended for final validation"}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min((dataInfo.time / 60) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Select a timeframe to see data analysis
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <Label>Strategy Parameters</Label>
            <div className="mt-4 space-y-6 bg-gray-50 p-6 rounded-lg">
              {/* Indicator-specific parameters */}
              {STRATEGIES.find(s => s.name === formData.strategy)?.indicators.map((indicator, index) => (
                <React.Fragment key={indicator}>
                  {index > 0 && <Separator />}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">{indicator} Parameters</h3>
                    
                    {/* RSI Parameters */}
                    {indicator === 'RSI' && (
                      <>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>RSI Overbought Level</Label>
                            <span className="text-sm text-gray-600">{formData.rsiOverbought}</span>
                          </div>
                          <Slider
                            value={[formData.rsiOverbought]}
                            onValueChange={([value]) => setFormData({ ...formData, rsiOverbought: value })}
                            min={50}
                            max={80}
                            step={1}
                            className="w-full"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Default: 65 (Sell signal when RSI exceeds this level)
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>RSI Oversold Level</Label>
                            <span className="text-sm text-gray-600">{formData.rsiOversold}</span>
                          </div>
                          <Slider
                            value={[formData.rsiOversold]}
                            onValueChange={([value]) => setFormData({ ...formData, rsiOversold: value })}
                            min={20}
                            max={50}
                            step={1}
                            className="w-full"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Default: 35 (Buy signal when RSI falls below this level)
                          </p>
                        </div>
                      </>
                    )}

                    {/* MACD Parameters */}
                    {indicator === 'MACD' && (
                      <>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Fast Period</Label>
                            <span className="text-sm text-gray-600">{formData.macdFastPeriod}</span>
                          </div>
                          <Slider
                            value={[formData.macdFastPeriod]}
                            onValueChange={([value]) => setFormData({ ...formData, macdFastPeriod: value })}
                            min={5}
                            max={20}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Slow Period</Label>
                            <span className="text-sm text-gray-600">{formData.macdSlowPeriod}</span>
                          </div>
                          <Slider
                            value={[formData.macdSlowPeriod]}
                            onValueChange={([value]) => setFormData({ ...formData, macdSlowPeriod: value })}
                            min={15}
                            max={35}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Signal Period</Label>
                            <span className="text-sm text-gray-600">{formData.macdSignalPeriod}</span>
                          </div>
                          <Slider
                            value={[formData.macdSignalPeriod]}
                            onValueChange={([value]) => setFormData({ ...formData, macdSignalPeriod: value })}
                            min={5}
                            max={15}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}

                    {/* Bollinger Bands Parameters */}
                    {indicator === 'Bollinger Bands' && (
                      <>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Period</Label>
                            <span className="text-sm text-gray-600">{formData.bollingerPeriod}</span>
                          </div>
                          <Slider
                            value={[formData.bollingerPeriod]}
                            onValueChange={([value]) => setFormData({ ...formData, bollingerPeriod: value })}
                            min={10}
                            max={50}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Standard Deviation</Label>
                            <span className="text-sm text-gray-600">{formData.bollingerDeviation}</span>
                          </div>
                          <Slider
                            value={[formData.bollingerDeviation]}
                            onValueChange={([value]) => setFormData({ ...formData, bollingerDeviation: value })}
                            min={1}
                            max={3}
                            step={0.1}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}

                    {/* EMA Parameters */}
                    {indicator === 'EMA' && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label>EMA Period</Label>
                          <span className="text-sm text-gray-600">{formData.emaPeriod}</span>
                        </div>
                        <Slider
                          value={[formData.emaPeriod]}
                          onValueChange={([value]) => setFormData({ ...formData, emaPeriod: value })}
                          min={5}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* VWAP Parameters */}
                    {indicator === 'VWAP' && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label>VWAP Period</Label>
                          <span className="text-sm text-gray-600">{formData.vwapPeriod}</span>
                        </div>
                        <Slider
                          value={[formData.vwapPeriod]}
                          onValueChange={([value]) => setFormData({ ...formData, vwapPeriod: value })}
                          min={5}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}

              <Separator />

              {/* Common Strategy Parameters */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Risk Parameters</h3>
                <div className="flex justify-between mb-2">
                  <Label>Take Profit Level (%)</Label>
                  <span className="text-sm text-gray-600">{formData.takeProfitLevel.toFixed(1)}%</span>
                </div>
                <Slider
                  value={[formData.takeProfitLevel]}
                  onValueChange={([value]) => setFormData({ ...formData, takeProfitLevel: value })}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Default: {STRATEGIES.find(s => s.name === formData.strategy)?.getDefaultConfig().takeProfitLevel}%
                </p>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Stop Loss Level (%)</Label>
                  <span className="text-sm text-gray-600">{formData.stopLossLevel.toFixed(1)}%</span>
                </div>
                <Slider
                  value={[formData.stopLossLevel]}
                  onValueChange={([value]) => setFormData({ ...formData, stopLossLevel: value })}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Default: {STRATEGIES.find(s => s.name === formData.strategy)?.getDefaultConfig().stopLossLevel}%
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label>Initial Balance ($)</Label>
            <input
              type="number"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
              min="1000"
              step="1000"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Running Backtest...' : 'Start Backtest'}
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}