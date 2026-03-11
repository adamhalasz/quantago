---
id: self-hosting-overview
slug: /self-hosting
sidebar_label: Overview
description: What it means to self-host Quantago and what components you need.
---

# Self-Hosting Overview

Self-hosting Quantago means operating the full application stack yourself rather than only consuming the API or strategy contract.

## What You Are Running

- backend API and workflow runtime
- frontend trading app
- optional admin app
- PostgreSQL for metadata and auth state
- ClickHouse for OHLCV data
- optional docs and landing sites

## Why Teams Self-Host

- control over domains and infrastructure boundaries
- direct ownership of databases and secrets
- the ability to customize ingestion and platform policy
- closer integration with internal systems

## What Changes Operationally

When you self-host, you become responsible for:

- configuring trusted origins for auth
- provisioning databases and running migrations
- setting Cloudflare Worker and Pages configuration
- monitoring workflow execution and ingestion health
- managing deployment order across services

## Recommended Reading Order

1. [Architecture](/self-hosting/architecture)
2. [Deployment](/self-hosting/deployment)

Use the self-hosting section as the operational guide. Use the rest of this site for the product and integration model.