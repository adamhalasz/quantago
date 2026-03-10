import manifestData from './manifest.json';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 20) return { type: null };
  const average = candles.slice(index - 19, index + 1).reduce((sum, candle) => sum + candle.close, 0) / 20;
  const price = candles[index].close;
  if (price <= average * 0.998) return { type: 'BUY', reason: 'Price reached lower grid support' };
  if (price >= average * 1.002) return { type: 'SELL', reason: 'Price reached upper grid resistance' };
  return { type: null };
});