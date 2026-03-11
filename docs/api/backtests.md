---
id: rest-api-backtests
slug: /api/backtests
sidebar_label: Backtests
description: How to queue, inspect, and reason about backtests through the API.
---

# Backtests

Backtests are asynchronous jobs. Creating one does not run the full simulation inline with the request. The API persists the request, creates a workflow instance, and returns `202 Accepted`.

## Endpoints

- `GET /api/backtests`
- `POST /api/backtests`
- `GET /api/backtests/:id`
- `GET /api/backtests/:id/trades`

All of these routes require an authenticated user session.

## Create a Backtest

```bash
curl -X POST https://api.quantago.co/api/backtests \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "backtest": {
      "symbol": "BTC-USD",
      "exchange": "crypto",
      "strategy": "Momentum Strategy",
      "start_date": "2025-01-01",
      "end_date": "2025-03-01",
      "initial_balance": 10000,
      "parameters": {
        "timeframe": "1h"
      }
    }
  }'
```

Request fields:

- `symbol`: market symbol
- `exchange`: exchange or market venue label used by the platform
- `strategy`: display name of the strategy to run
- `start_date`: ISO-like start date string
- `end_date`: ISO-like end date string
- `initial_balance`: numeric starting capital
- `parameters`: free-form strategy parameters

## Expected Behavior

- the API validates the request body
- the platform inserts a backtest record for the current user
- a workflow instance is created
- the response comes back with status `202`

## Inspect Backtests

List all backtests for the current user:

```bash
curl https://api.quantago.co/api/backtests \
  -b cookies.txt
```

Fetch a specific backtest:

```bash
curl https://api.quantago.co/api/backtests/<backtest-id> \
  -b cookies.txt
```

Fetch the trades created by a backtest:

```bash
curl https://api.quantago.co/api/backtests/<backtest-id>/trades \
  -b cookies.txt
```

## Remote and WASM Strategies

You can run non-native strategies without changing the backtest endpoint itself. The runtime metadata travels inside `backtest.parameters`, which lets Quantago route execution to:

- a remote HTTP endpoint
- a stored WASM artifact
- a built-in native strategy

See [Strategy Contract](/runtimes/strategy-contract), [Python SDK](/runtimes/python-sdk), and [WASM Runtime](/runtimes/wasm).