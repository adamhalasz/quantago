---
id: rest-api-market-data
slug: /api/market-data
sidebar_label: Market Data
description: Historical market data queries through the Quantago REST API.
---

# Market Data

Quantago exposes a public market data endpoint for historical ticks.

## Endpoint

`GET /api/market-data/ticks`

This route is public. It does not require a user session.

## Query Parameters

- `symbol`: required
- `startDate`: required
- `endDate`: required
- `timeframe`: optional, defaults to `1m`
- `assetClass`: optional, one of `forex`, `crypto`, `stock`
- `provider`: optional, one of `yahoo`, `clickhouse`

## Example

```bash
curl "https://api.quantago.co/api/market-data/ticks?symbol=AAPL&startDate=2025-01-01&endDate=2025-01-31&timeframe=1d&assetClass=stock"
```

Example response shape:

```json
{
  "symbol": "AAPL",
  "timeframe": "1d",
  "assetClass": "stock",
  "provider": "yahoo",
  "ticks": [
    {
      "timestamp": "2025-01-02T00:00:00.000Z",
      "open": 185.64,
      "high": 187.12,
      "low": 184.98,
      "close": 186.37,
      "volume": 52314000
    }
  ]
}
```

## Validation Rules

- `startDate` must be before `endDate`
- future ranges are rejected
- malformed requests return `400`
- provider rate limits are surfaced as `429`

## When to Use This Route

Use it when you need:

- a quick data sanity check before running a backtest
- data exploration in a custom frontend
- direct historical candles without creating a backtest job

If you need deterministic backtest execution against the platform's strategy engine, move on to [Backtests](/api/backtests).