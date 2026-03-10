import manifestData from './manifest.json';
import { calculateBollingerBands } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  const bands = calculateBollingerBands(candles, index);
  const price = candles[index].close;
  if (price < bands.lower) return { type: 'BUY', reason: 'Price moved below the lower Bollinger Band' };
  if (price > bands.upper) return { type: 'SELL', reason: 'Price moved above the upper Bollinger Band' };
  return { type: null };
});