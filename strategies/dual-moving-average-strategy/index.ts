import manifestData from './manifest.json';
import { calculateEMA } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 50) return { type: null };
  const fastMA = calculateEMA(candles, index, 10);
  const slowMA = calculateEMA(candles, index, 50);
  const prevFastMA = calculateEMA(candles, index - 1, 10);
  const prevSlowMA = calculateEMA(candles, index - 1, 50);
  if (fastMA > slowMA && prevFastMA <= prevSlowMA) return { type: 'BUY', reason: 'Fast moving average crossed above slow moving average' };
  if (fastMA < slowMA && prevFastMA >= prevSlowMA) return { type: 'SELL', reason: 'Fast moving average crossed below slow moving average' };
  return { type: null };
});