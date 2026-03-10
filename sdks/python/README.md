# Quantago Python SDK

This package lets Python strategies participate in the Quantago Strategy Protocol over HTTP.

## Install

```bash
cd sdks/python
python3 -m pip install -e .
```

## Example

```python
from quantago import Signal, Strategy, StrategyInput


class MovingAverageStrategy(Strategy):
    def on_candle(self, input: StrategyInput) -> Signal:
        closes = [candle.close for candle in input.history]
        if len(closes) < 20:
            return Signal.hold("Need at least 20 candles")

        sma = sum(closes[-20:]) / 20
        if input.candle.close > sma:
            return Signal.buy(size=0.25, reason="Close above 20-period SMA")
        if input.candle.close < sma:
            return Signal.sell(size=0.25, reason="Close below 20-period SMA")
        return Signal.hold("No crossover")
```

Serve it locally:

```bash
quantago serve my_strategy:MovingAverageStrategy --host 127.0.0.1 --port 8000
```

Point a Quantago remote strategy at:

```text
http://127.0.0.1:8000/signal
```

## Protocol Notes

- `POST /signal` accepts the JSON payload documented in `docs/STRATEGY_PROTOCOL.md`
- the SDK converts that payload into typed Python dataclasses
- your strategy returns `Signal.buy(...)`, `Signal.sell(...)`, or `Signal.hold(...)`