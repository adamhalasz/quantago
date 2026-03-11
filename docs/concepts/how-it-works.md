---
id: concepts
slug: /concepts/how-quantago-works
sidebar_label: How Quantago Works
description: The mental model behind Quantago's API, execution engine, and runtimes.
---

# How Quantago Works

Quantago is easiest to understand if you treat it as two systems working together:

- a control plane for auth, orchestration, metadata, and results
- an execution plane for market data, backtests, and strategy evaluation

## The Core Loop

Every backtest follows the same loop:

1. Load historical candles for the requested symbol and timeframe.
2. Walk through the candles in order.
3. Invoke the strategy with the current candle, bounded history, portfolio state, parameters, and execution context.
4. Accept one of three actions: `BUY`, `SELL`, or `HOLD`.
5. Update the simulated portfolio and continue.
6. Persist the completed result so the frontend can inspect it later.

## What the Platform Owns

Quantago owns the pieces that should stay consistent regardless of strategy language:

- authentication and sessions
- market data access
- backtest queueing and workflow execution
- portfolio simulation and result storage
- strategy catalog and versioning

This lets you change the strategy runtime without rewriting the rest of the platform.

## What Your Strategy Owns

Your strategy is expected to be narrowly scoped.

It receives market context and returns a decision. It does not need to:

- talk directly to databases
- manage users or sessions
- persist backtest results
- render charts

That division keeps strategy code portable.

## Three Runtime Options

### Native

Built-in strategies run directly inside the backend runtime. This is the simplest and fastest option when you are working inside the Quantago codebase.

### Remote HTTP

Remote strategies run somewhere else and expose a `POST /signal` endpoint. This is the best fit when your research stack is already in Python or you want to iterate on strategies independently from the platform deploy cycle.

### WASM

WASM strategies are compiled modules loaded by Quantago. This is the best fit when you want portability and low runtime overhead without operating a separate strategy service.

## Auth Boundaries

Most REST API routes require an authenticated session cookie.

Public routes are intentionally limited:

- `/api/auth/*`
- `/api/health`
- `/api/market-data/*`

Protected routes cover backtests, strategy registry operations, bots, and admin surfaces.

## Data Boundaries

Quantago uses different stores for different jobs:

- PostgreSQL for relational platform state
- ClickHouse for time-series market data
- R2 for optional binary strategy artifacts such as WASM modules

This split avoids forcing one database to do everything badly.

## When to Use Which Interface

- Use the REST API if you are integrating from another app, dashboard, or automation layer.
- Use the Python SDK if your strategy logic already lives in Python.
- Use WASM if you want a portable compiled artifact that Quantago can execute directly.
- Use self-hosting if you need infrastructure control, custom domains, or operational ownership.