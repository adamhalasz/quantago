import manifestData from './manifest.json';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

const detectPinBar = (candle: { open: number; high: number; low: number; close: number }) => {
  const body = Math.abs(candle.close - candle.open);
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

  if (lowerWick > body * 2 && upperWick < body) {
    return { type: 'BUY' as const, reason: 'Bullish pin bar suggests buyer rejection of lower prices' };
  }

  if (upperWick > body * 2 && lowerWick < body) {
    return { type: 'SELL' as const, reason: 'Bearish pin bar suggests seller rejection of higher prices' };
  }

  return { type: null };
};

export default Strategy(manifest, (candles, index) => {
  return detectPinBar(candles[index]);
});