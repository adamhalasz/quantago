---
id: rest-api-overview
slug: /api/rest-api
sidebar_label: Overview
description: Overview of the Quantago REST API surface and how to work with it.
---

# REST API Overview

Quantago's API is designed around product workflows rather than low-level primitives.

The main jobs of the API are:

- expose session state
- return historical market data
- create and inspect backtests
- expose built-in and persisted strategies
- provide admin ingestion operations

## Base URL

Production:

```text
https://api.quantago.co
```

All routes below are prefixed with `/api`.

## Public and Protected Routes

Public routes:

- `GET /api/health`
- `GET /api/market-data/ticks`
- `POST /api/auth/*` and related auth endpoints exposed through Better Auth

Protected routes:

- `GET /api/session`
- `GET /api/backtests`
- `POST /api/backtests`
- `GET /api/backtests/:id`
- `GET /api/backtests/:id/trades`
- `GET /api/strategies`
- `POST /api/strategies`
- `GET /api/strategies/:slug/versions`
- `POST /api/strategies/:slug/versions`

Admin-only routes:

- `GET /api/admin/ingestion/events`
- `POST /api/admin/ingestion/run-once`
- the ingestion route group under `/api/admin/ingestion/*`

## Response Style

The API returns JSON for normal request-response endpoints.

Typical status codes:

- `200` for successful reads
- `201` for successful strategy creation
- `202` for accepted backtest jobs
- `400` for validation failures
- `401` for missing auth
- `403` for valid auth without the right permissions

## Common Integration Pattern

1. Establish or reuse a session.
2. Call `GET /api/session` to confirm the active user.
3. Query market data or list strategies.
4. Submit a backtest.
5. Poll the backtest resource until the result is available.

## Example Session Check

```bash
curl https://api.quantago.co/api/session \
  -b cookies.txt
```

## Example Health Check

```bash
curl https://api.quantago.co/api/health
```

## Next Steps

- Read [Authentication](/api/authentication) for session behavior.
- Read [Backtests](/api/backtests) for job submission.
- Read [Market Data](/api/market-data) for historical tick queries.
- Read [Strategies](/api/strategies) for the catalog and registry model.