import manifestData from './manifest.json';
import { calculateEMA } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 50) return { type: null };
  const fastEMA = calculateEMA(candles, index, 20);
  const slowEMA = calculateEMA(candles, index, 50);
  const prevFastEMA = calculateEMA(candles, index - 1, 20);
  const prevSlowEMA = calculateEMA(candles, index - 1, 50);
  if (fastEMA > slowEMA && prevFastEMA <= prevSlowEMA) return { type: 'BUY', reason: 'Fast EMA crossed above slow EMA indicating uptrend' };
  if (fastEMA < slowEMA && prevFastEMA >= prevSlowEMA) return { type: 'SELL', reason: 'Fast EMA crossed below slow EMA indicating downtrend' };
  return { type: null };
});