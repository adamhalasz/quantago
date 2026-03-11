---
id: rest-api-strategies
slug: /api/strategies
sidebar_label: Strategies
description: Working with the Quantago strategy catalog and registry over REST.
---

# Strategies

The strategies API exposes two kinds of strategies through one catalog:

- built-in strategies that ship with the platform
- persisted registry strategies that users create as remote or WASM definitions

## Endpoints

- `GET /api/strategies`
- `POST /api/strategies`
- `GET /api/strategies/:slug/versions`
- `POST /api/strategies/:slug/versions`

These routes require an authenticated session.

## List the Catalog

```bash
curl https://api.quantago.co/api/strategies \
  -b cookies.txt
```

The catalog response includes runtime metadata, defaults, parameter schema, and whether the source is built-in or registry-backed.

## Create a Remote Strategy

```bash
curl -X POST https://api.quantago.co/api/strategies \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "strategy": {
      "slug": "my-python-momentum",
      "name": "My Python Momentum",
      "description": "Momentum strategy served from a Python process",
      "runtime_type": "remote",
      "language": "python",
      "default_frequency": "DAILY",
      "min_candles": 30,
      "lookback_candles": 60,
      "default_config": {
        "takeProfitLevel": 10,
        "stopLossLevel": 5,
        "timeframe": "1d"
      },
      "parameter_schema": {
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
      "is_public": false,
      "initial_version": {
        "version": "0.1.0",
        "runtime_config": {
          "type": "remote",
          "language": "python",
          "endpoint": "http://127.0.0.1:8000/signal",
          "timeoutMs": 5000,
          "lookbackCandles": 60
        }
      }
    }
  }'
```

## Create a WASM Strategy

WASM strategies use the same endpoint, but the runtime config changes to `type: "wasm"`. You can either reference a hosted module URL or upload an artifact in base64.

```json
{
  "type": "wasm",
  "language": "rust",
  "lookbackCandles": 120,
  "moduleUrl": "https://example.com/strategy.wasm"
}
```

Or attach an artifact with:

```json
{
  "artifact": {
    "file_name": "strategy.wasm",
    "content_base64": "...",
    "content_type": "application/wasm"
  }
}
```

## Versioning

Use `POST /api/strategies/:slug/versions` to add new runtime versions. This is useful when you want to update a remote endpoint, change timeout settings, or publish a new WASM build without changing the strategy identity.

## Related Guides

- [Strategy Contract](/runtimes/strategy-contract)
- [Python SDK](/runtimes/python-sdk)
- [WASM Runtime](/runtimes/wasm)