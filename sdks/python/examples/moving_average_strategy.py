from quantago import Signal, Strategy, StrategyInput


class MovingAverageStrategy(Strategy):
    def on_candle(self, input: StrategyInput) -> Signal:
        closes = [candle.close for candle in input.history]
        fast_window = int(input.parameters.get("fastWindow", 10))
        slow_window = int(input.parameters.get("slowWindow", 20))

        if len(closes) < slow_window:
            return Signal.hold(reason=f"Need at least {slow_window} candles")

        fast_average = sum(closes[-fast_window:]) / fast_window
        slow_average = sum(closes[-slow_window:]) / slow_window

        if fast_average > slow_average:
            return Signal.buy(size=0.25, reason="Fast moving average is above slow moving average")
        if fast_average < slow_average:
            return Signal.sell(size=0.25, reason="Fast moving average is below slow moving average")
        return Signal.hold(reason="Moving averages are equal")