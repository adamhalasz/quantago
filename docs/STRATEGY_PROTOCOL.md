---
id: runtime-contract
slug: /runtimes/strategy-contract
sidebar_label: Strategy Contract
description: Runtime-agnostic contract for strategies across native, remote, and WASM execution.
---

# Strategy Contract

Quantago talks to every strategy through the same contract. The goal is to make the execution runtime replaceable without changing how the backtest engine thinks.

## Why This Contract Exists

- The platform owns orchestration, order simulation, storage, and charts.
- The strategy owns a single decision for a single candle.
- The payload shape stays stable whether the strategy is native, remote, or WASM.
- Versioning stays explicit so a backtest can be reproduced later.

## Core Contract

The platform invokes a strategy with one candle at a time plus the current portfolio snapshot.

Input:

```json
{
  "candle": {
    "time": "2026-03-10T00:00:00.000Z",
    "open": 102.1,
    "high": 104.8,
    "low": 101.7,
    "close": 104.2,
    "volume": 183920
  },
  "history": [
    {
      "time": "2026-03-09T00:00:00.000Z",
      "open": 100.3,
      "high": 103.1,
      "low": 99.8,
      "close": 102.1,
      "volume": 164002
    }
  ],
  "portfolio": {
    "cash": 10000,
    "equity": 10000,
    "openPosition": null,
    "lastTradeAt": null
  },
  "parameters": {
    "timeframe": "1d",
    "riskPerTrade": 2,
    "maxTradeTime": 8
  },
  "context": {
    "index": 1,
    "totalCandles": 252,
    "timeframe": "1d",
    "strategy": {
      "name": "Momentum Strategy",
      "version": "1.0.0",
      "runtime": "native",
      "language": "typescript"
    }
  }
}
```

Output:

```json
{
  "action": "BUY",
  "size": 0.25,
  "reason": "Fast EMA crossed above slow EMA",
  "metadata": {
    "fastEma": 103.4,
    "slowEma": 102.8
  }
}
```

Rules:

- `action` must be `BUY`, `SELL`, or `HOLD`.
- `size` is optional. If omitted, the platform uses its own position-sizing rules.
- `metadata` is optional and is persisted alongside strategy signals for analysis.
- Strategies are expected to behave like pure functions of the supplied input.

## Runtime Modes

### Tier 1: Native TypeScript

Built-in TypeScript strategies execute inside the backend runtime with no transport overhead.

- Runtime type: `native`
- Language: `typescript`
- Best for the fastest local iteration inside the existing codebase

### Remote HTTP

Remote strategies run anywhere and expose a single HTTP endpoint that accepts the protocol payload.

- Runtime type: `remote`
- Language: any
- Current first-class path for Python, local development servers, serverless functions, and managed containers

Request:

```http
POST /signal
Content-Type: application/json
```

The request body is the full protocol payload shown above.

### WASM

WASM is now supported through a simple JSON-over-memory ABI. This tier is intended for portable high-performance strategies compiled from Rust, Go, C, C++, Zig, AssemblyScript, and similar languages.

- Runtime type: `wasm`
- Artifact source: persisted R2 object key or external `moduleUrl`
- Planned use: Rust, Go, C++, AssemblyScript, and other languages that compile to WASM

Required exports by default:

- `memory`
- `alloc(size: i32) -> i32`
- `signal(ptr: i32, len: i32) -> i32`
- `signal_len() -> i32`

Optional export:

- `dealloc(ptr: i32, len: i32)`

Execution model:

1. The platform serializes the strategy input as UTF-8 JSON.
2. The JSON bytes are written into WASM memory after calling `alloc`.
3. `signal(ptr, len)` returns the pointer to a UTF-8 JSON response.
4. `signal_len()` returns the output length.
5. The JSON response must contain the same `action`, `size`, `reason`, and optional `metadata` shape used by remote HTTP strategies.

## Strategy Definition

Each strategy definition contains:

- `name`: user-facing strategy name
- `description`: short explanation of intent
- `version`: explicit strategy version for reproducibility
- `runtime`: one of `native`, `remote`, `wasm`
- `minCandles`: minimum data required before a backtest is allowed to run
- `lookbackCandles`: how much history the platform should send to the strategy
- `defaultConfig`: platform-level default execution settings
- `parameterSchema`: JSON-schema-like form metadata used by the UI and validation layer

## Registry Model

Persisted strategies are stored in Postgres and versioned independently of backtests:

- `strategy_definitions`: identity, runtime family, parameter schema, defaults, and ownership
- `strategy_versions`: immutable versions with runtime config and optional artifact key

Binary artifacts such as `.wasm` modules are stored in R2 under the `STRATEGY_ARTIFACTS` binding.

Registry endpoints:

```text
GET  /api/strategies
POST /api/strategies
GET  /api/strategies/:slug/versions
POST /api/strategies/:slug/versions
```

The list endpoint returns built-in strategies plus persisted strategies visible to the current user.

## Backtest API Usage

Built-in native strategies continue to use the existing request shape:

```json
{
  "backtest": {
    "symbol": "AAPL",
    "exchange": "nasdaq",
    "strategy": "Momentum Strategy",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "initial_balance": 10000,
    "parameters": {
      "timeframe": "1d"
    }
  }
}
```

Remote strategies can be queued without shipping code into the platform runtime by supplying runtime metadata in `parameters`:

```json
{
  "backtest": {
    "symbol": "BTC-USD",
    "exchange": "crypto",
    "strategy": "My Python Momentum",
    "start_date": "2025-01-01",
    "end_date": "2025-03-01",
    "initial_balance": 10000,
    "parameters": {
      "timeframe": "1h",
      "strategyVersion": "0.1.0",
      "strategyDescription": "Remote pandas-based strategy",
      "strategyMinCandles": 30,
      "strategyLookbackCandles": 60,
      "strategyRuntime": {
        "type": "remote",
        "language": "python",
        "endpoint": "http://127.0.0.1:8000/signal",
        "timeoutMs": 5000,
        "lookbackCandles": 60
      },
      "strategyParameterSchema": {
        "type": "object",
        "properties": {
          "fastWindow": {
            "type": "integer",
            "default": 12
          },
          "slowWindow": {
            "type": "integer",
            "default": 26
          }
        }
      },
      "fastWindow": 12,
      "slowWindow": 26
    }
  }
}
```

## Catalog Endpoint

Built-in strategies are exposed from:

```text
GET /api/strategies
```

The response includes runtime metadata, default config, and parameter schema so the frontend and admin tools can render forms from the backend source of truth instead of duplicating strategy metadata.

For persisted strategies it also includes the registry slug and currently active version.

## Validation

Before a full backtest runs, the platform executes a small preflight window against the strategy contract.

- Native strategies must return valid actions.
- Remote strategies must return a valid JSON payload.
- Invalid `action` or `size` values fail the backtest early.

This is the first enforcement step. Synthetic fixture validation and managed packaging can build on top of the same protocol without changing the contract again.

## Python SDK

The repository includes a zero-dependency Python SDK and CLI in `sdks/python`.

Install locally:

```bash
cd sdks/python
python3 -m pip install -e .
```

Serve a strategy:

```bash
quantago serve examples.moving_average_strategy:MovingAverageStrategy --host 127.0.0.1 --port 8000
```

This exposes:

- `POST /signal`
- `GET /health`

The Python SDK maps the JSON payload into typed dataclasses and expects strategies to return `Signal.buy(...)`, `Signal.sell(...)`, or `Signal.hold(...)`.