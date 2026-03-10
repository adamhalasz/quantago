import manifestData from './manifest.json';
import type { Candle } from '../../services/backend/src/lib/backtest-engine/types';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

const calculateIchimokuLines = (candles: Candle[], index: number) => {
  const toMidpoint = (period: number) => {
    const slice = candles.slice(Math.max(0, index - period + 1), index + 1);
    const high = Math.max(...slice.map((candle) => candle.high));
    const low = Math.min(...slice.map((candle) => candle.low));
    return (high + low) / 2;
  };

  return {
    tenkan: toMidpoint(9),
    kijun: toMidpoint(26),
  };
};

export default Strategy(manifest, (candles, index) => {
  if (index < 26) return { type: null };
  const current = calculateIchimokuLines(candles, index);
  const previous = calculateIchimokuLines(candles, index - 1);
  if (current.tenkan > current.kijun && previous.tenkan <= previous.kijun) return { type: 'BUY', reason: 'Tenkan crossed above Kijun' };
  if (current.tenkan < current.kijun && previous.tenkan >= previous.kijun) return { type: 'SELL', reason: 'Tenkan crossed below Kijun' };
  return { type: null };
});