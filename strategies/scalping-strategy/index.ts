import manifestData from './manifest.json';
import { calculateEMA } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 10) return { type: null };
  const fastEMA = calculateEMA(candles, index, 5);
  const slowEMA = calculateEMA(candles, index, 10);
  const currentPrice = candles[index].close;
  const previousPrice = candles[index - 1].close;
  const momentum = (currentPrice - previousPrice) / previousPrice;
  if (momentum > 0.001 && currentPrice > fastEMA && fastEMA > slowEMA) return { type: 'BUY', reason: 'Short-term momentum and moving averages aligned bullish' };
  if (momentum < -0.001 && currentPrice < fastEMA && fastEMA < slowEMA) return { type: 'SELL', reason: 'Short-term momentum and moving averages aligned bearish' };
  return { type: null };
});