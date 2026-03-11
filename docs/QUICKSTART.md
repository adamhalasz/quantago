---
id: getting-started
slug: /getting-started
sidebar_label: Getting Started
description: Practical first steps for integrating with Quantago.
---

# Getting Started

This guide is for developers who want to understand the fastest path into the platform.

## What Quantago Gives You

- historical market data access
- authenticated backtest execution
- a strategy catalog that can mix built-in, remote, and WASM strategies
- a runtime contract that stays consistent across languages

If you already know which interface you want, skip directly to the relevant section:

- [REST API Overview](/api/rest-api)
- [Python SDK](/runtimes/python-sdk)
- [WASM Runtime](/runtimes/wasm)
- [Self-Hosting Overview](/self-hosting)

## Recommended Onboarding Order

1. Read [How Quantago Works](/concepts/how-quantago-works) to understand the execution model.
2. Use [REST API Authentication](/api/authentication) to establish a session.
3. Fetch a small slice of [market data](/api/market-data).
4. Create a [backtest](/api/backtests).
5. If you need custom logic, choose either the [Python SDK](/runtimes/python-sdk) or [WASM Runtime](/runtimes/wasm).

## Your First End-to-End Flow

### 1. Check that the API is reachable

```bash
curl https://api.quantago.co/api/health
```

Expected response:

```json
{
  "ok": true
}
```

### 2. Start an authenticated session

Quantago uses session-based auth for most application routes. The exact sign-in flow is handled by Better Auth, but once authenticated, your client sends the session cookie on protected routes.

Use [Authentication](/api/authentication) for the request model.

### 3. Pull market data

```bash
curl "https://api.quantago.co/api/market-data/ticks?symbol=AAPL&startDate=2025-01-01&endDate=2025-01-31&timeframe=1d"
```

### 4. Queue a backtest

```bash
curl -X POST https://api.quantago.co/api/backtests \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "backtest": {
      "symbol": "AAPL",
      "exchange": "nasdaq",
      "strategy": "Momentum Strategy",
      "start_date": "2025-01-01",
      "end_date": "2025-03-31",
      "initial_balance": 10000,
      "parameters": {
        "timeframe": "1d"
      }
    }
  }'
```

### 5. Bring your own strategy runtime if needed

- Use [Python SDK](/runtimes/python-sdk) if your research stack is Python-first.
- Use [WASM Runtime](/runtimes/wasm) if you want a deployable binary artifact.

## Integration Checklist

- You know which endpoints are public and which require a session.
- You understand that backtests are queued and return `202 Accepted`.
- You know whether your strategy will be native, remote, or WASM.
- You know whether you are using Quantago as a hosted service or self-hosting the stack.

## What This Site Covers

- how the platform works conceptually
- how to talk to the REST API
- how to build strategy integrations in Python and WASM
- how to self-host the full platform

Use the repository README for source-level setup and contributor workflow. Use this site for the platform guide.
