import manifestData from './manifest.json';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 20) return { type: null };
  const recent = candles.slice(index - 19, index + 1);
  const recentHigh = Math.max(...recent.map((candle) => candle.high));
  const recentLow = Math.min(...recent.map((candle) => candle.low));
  const price = candles[index].close;
  if (price > recentHigh * 1.002) return { type: 'BUY', reason: 'Price broke above resistance level' };
  if (price < recentLow * 0.998) return { type: 'SELL', reason: 'Price broke below support level' };
  return { type: null };
});