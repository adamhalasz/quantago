import manifestData from './manifest.json';
import { calculateMACD, calculateRSI } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 26) return { type: null };
  const rsi = calculateRSI(candles, index);
  const macd = calculateMACD(candles, index);
  const prevMacd = calculateMACD(candles, index - 1);
  const currentPrice = candles[index].close;
  const prevPrice = candles[index - 1].close;
  const priceChange = (currentPrice - prevPrice) / prevPrice;

  if ((rsi < 40 && macd.macd > macd.signal && prevMacd.macd <= prevMacd.signal) ||
    (rsi < 45 && macd.histogram > 0 && priceChange > 0.001) ||
    (macd.macd > macd.signal && macd.histogram > prevMacd.histogram * 1.5)) {
    return { type: 'BUY', reason: 'RSI indicates oversold conditions with MACD bullish crossover' };
  }

  if ((rsi > 60 && macd.macd < macd.signal && prevMacd.macd >= prevMacd.signal) ||
    (rsi > 55 && macd.histogram < 0 && priceChange < -0.001) ||
    (macd.macd < macd.signal && macd.histogram < prevMacd.histogram * 1.5)) {
    return { type: 'SELL', reason: 'RSI indicates overbought conditions with MACD bearish crossover' };
  }

  return { type: null };
});