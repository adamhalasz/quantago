import manifestData from './manifest.json';
import { calculateRSI } from '../../services/backend/src/lib/backtest-engine/indicators';
import { Strategy, type StrategyManifest } from '../helpers';

const manifest = manifestData as StrategyManifest;

export default Strategy(manifest, (candles, index) => {
  if (index < 14) return { type: null };

  const currentPrice = candles[index].close;
  const currentRSI = calculateRSI(candles, index);

  for (let offset = 2; offset <= 5; offset += 1) {
    const priorIndex = index - offset;
    if (priorIndex < 14) break;

    const priorPrice = candles[priorIndex].close;
    const priorRSI = calculateRSI(candles, priorIndex);
    const divergenceStrength = Math.abs(currentRSI - priorRSI) / 100;

    if (currentPrice < priorPrice && currentRSI > priorRSI && divergenceStrength > 0.01) {
      return { type: 'BUY', reason: 'Bullish RSI divergence suggests downside momentum is weakening' };
    }

    if (currentPrice > priorPrice && currentRSI < priorRSI && divergenceStrength > 0.01) {
      return { type: 'SELL', reason: 'Bearish RSI divergence suggests upside momentum is weakening' };
    }
  }

  return { type: null };
});