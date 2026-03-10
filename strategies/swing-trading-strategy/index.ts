import manifestData from './manifest.json';
import { calculateMACD, calculateRSI } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 26) return { type: null };
  const rsi = calculateRSI(candles, index);
  const macd = calculateMACD(candles, index);
  const prevMacd = calculateMACD(candles, index - 1);
  if (rsi < 40 && macd.macd > macd.signal && prevMacd.macd <= prevMacd.signal) return { type: 'BUY', reason: 'Bullish MACD crossover with depressed RSI' };
  if (rsi > 60 && macd.macd < macd.signal && prevMacd.macd >= prevMacd.signal) return { type: 'SELL', reason: 'Bearish MACD crossover with elevated RSI' };
  return { type: null };
});