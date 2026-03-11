---
id: intro
title: Quantago Guide
slug: /
description: Guide-first documentation for integrating with Quantago over REST, Python, and WASM.
---

Quantago is a backtesting platform with three integration surfaces:

- a REST API for market data, backtest orchestration, and strategy catalog access
- a Python SDK for serving remote strategies over HTTP
- a WASM runtime for portable, high-performance strategy execution

This site is written as a product guide. It focuses on how to use the platform and how to host it, rather than mirroring repository internals.

## Start Here

- New to Quantago: read [Getting Started](/getting-started)
- Want the mental model first: read [How Quantago Works](/concepts/how-quantago-works)
- Integrating from your own app or service: start with [REST API Overview](/api/rest-api)
- Shipping a Python strategy: go to [Python SDK](/runtimes/python-sdk)
- Shipping a compiled strategy: go to [WASM Runtime](/runtimes/wasm)
- Running the full stack yourself: go to [Self-Hosting Overview](/self-hosting)

## Core Concepts

Quantago separates concerns deliberately:

- the platform owns orchestration, storage, authentication, and results
- your strategy owns one decision at a time: `BUY`, `SELL`, or `HOLD`
- market data can be queried independently of backtest execution
- strategy code can run natively, remotely over HTTP, or inside WASM

That separation is what lets the same backtest engine work with TypeScript strategies in-repo, Python strategies on a local server, or compiled modules stored as artifacts.

## Choose an Integration Path

### REST API

Use the API when you want Quantago to be the execution and storage layer.

You can:

- fetch historical ticks
- create and inspect backtests
- inspect or register strategies
- check the authenticated user session

### Python SDK

Use the Python SDK when your strategy code already lives in Python and you want to keep it there. Quantago sends protocol payloads to your strategy server over HTTP, and your server returns trading signals.

### WASM

Use WASM when you want a portable artifact that can run inside the platform without standing up a separate strategy service.

## Self-Hosting

Quantago is designed as a small set of deployable services:

- a Cloudflare Worker backend for the API and workflows
- a frontend app on Pages
- an optional admin app on Pages
- PostgreSQL for users, metadata, and backtests
- ClickHouse for historical OHLCV data

The [self-hosting section](/self-hosting) explains how those pieces fit together and what you need to run them in production.