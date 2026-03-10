import momentumStrategy from './momentum-strategy';
import meanReversionStrategy from './mean-reversion-strategy';
import trendFollowingStrategy from './trend-following-strategy';
import bollingerBandsStrategy from './bollinger-bands-strategy';
import breakoutStrategy from './breakout-strategy';
import dualMovingAverageStrategy from './dual-moving-average-strategy';
import gridTradingStrategy from './grid-trading-strategy';
import ichimokuCloudStrategy from './ichimoku-cloud-strategy';
import priceActionStrategy from './price-action-strategy';
import rsiDivergenceStrategy from './rsi-divergence-strategy';
import scalpingStrategy from './scalping-strategy';
import swingTradingStrategy from './swing-trading-strategy';
import volumeWeightedStrategy from './volume-weighted-strategy';

export const BUILT_IN_STRATEGIES = [
  momentumStrategy,
  meanReversionStrategy,
  trendFollowingStrategy,
  bollingerBandsStrategy,
  breakoutStrategy,
  dualMovingAverageStrategy,
  gridTradingStrategy,
  ichimokuCloudStrategy,
  priceActionStrategy,
  rsiDivergenceStrategy,
  scalpingStrategy,
  swingTradingStrategy,
  volumeWeightedStrategy,
];