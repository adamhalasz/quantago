import manifestData from './manifest.json';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 20) return { type: null };
  const slice = candles.slice(index - 19, index + 1);
  const totals = slice.reduce((state, candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    return {
      pv: state.pv + typicalPrice * candle.volume,
      volume: state.volume + candle.volume,
    };
  }, { pv: 0, volume: 0 });
  const vwap = totals.volume === 0 ? candles[index].close : totals.pv / totals.volume;
  const currentPrice = candles[index].close;
  const currentVolume = candles[index].volume;
  const avgVolume = candles.slice(index - 20, index).reduce((sum, candle) => sum + candle.volume, 0) / 20;
  if (currentPrice > vwap && currentVolume > avgVolume * 1.5) return { type: 'BUY', reason: 'High volume breakout above VWAP' };
  if (currentPrice < vwap && currentVolume > avgVolume * 1.5) return { type: 'SELL', reason: 'High volume breakdown below VWAP' };
  return { type: null };
});