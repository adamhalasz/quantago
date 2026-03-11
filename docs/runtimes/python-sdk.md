---
id: python-sdk
slug: /runtimes/python-sdk
sidebar_label: Python SDK
description: Build and serve Quantago-compatible strategies from Python.
---

# Python SDK

Use the Python SDK when you want Quantago to call strategy logic that stays in Python.

This is the preferred path when your indicators, research code, or feature engineering already depend on Python libraries.

## What the SDK Does

- maps the Quantago strategy payload into typed Python dataclasses
- lets you implement `on_candle(...)` as normal Python code
- serves `POST /signal` and `GET /health`

## Install

```bash
cd sdks/python
python3 -m pip install -e .
```

## Minimal Strategy

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

## Serve the Strategy

```bash
quantago serve my_strategy:MovingAverageStrategy --host 127.0.0.1 --port 8000
```

That server exposes:

- `POST /signal`
- `GET /health`

## Connect It to Quantago

Register it as a remote strategy or pass the runtime metadata in a backtest request:

```json
{
  "type": "remote",
  "language": "python",
  "endpoint": "http://127.0.0.1:8000/signal",
  "timeoutMs": 5000,
  "lookbackCandles": 60
}
```

## Operational Advice

- keep the response pure and deterministic for the same input payload
- size your `lookbackCandles` to the largest window your indicators need
- return `HOLD` instead of raising errors for normal warm-up conditions
- use the Quantago platform for persistence and orchestration, not the strategy server

## When Python Is the Right Choice

Choose Python when:

- you already have strategy code in pandas, numpy, or similar tooling
- you want to iterate on strategies without rebuilding the platform
- you are comfortable operating a small HTTP service for strategy execution