import manifestData from './manifest.json';
import { calculateBollingerBands } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  const price = candles[index].close;
  const prevPrice = index > 0 ? candles[index - 1].close : price;
  const bands = calculateBollingerBands(candles, index);
  if (prevPrice >= bands.lower && price < bands.lower) return { type: 'BUY', reason: 'Price crossed below the lower Bollinger Band' };
  if (prevPrice <= bands.upper && price > bands.upper) return { type: 'SELL', reason: 'Price crossed above the upper Bollinger Band' };
  return { type: null };
});