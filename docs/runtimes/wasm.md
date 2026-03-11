---
id: wasm-guide
slug: /runtimes/wasm
sidebar_label: WASM Runtime
description: Build portable Quantago strategies as WebAssembly modules.
---

# WASM Runtime

Use the WASM runtime when you want Quantago to execute a compiled module directly.

This is a good fit for Rust, Go, Zig, C++, or any other language that can target WebAssembly.

## Why WASM Exists Here

- no separate strategy server to operate
- a portable artifact that can be versioned and stored
- fast execution with a stable JSON-over-memory boundary

## Required Exports

By default, Quantago expects these WASM exports:

- `memory`
- `alloc(size: i32) -> i32`
- `signal(ptr: i32, len: i32) -> i32`
- `signal_len() -> i32`

Optional:

- `dealloc(ptr: i32, len: i32)`

## Execution Model

1. Quantago serializes the strategy input as UTF-8 JSON.
2. It allocates memory in the module.
3. It writes the input bytes into module memory.
4. It invokes `signal(ptr, len)`.
5. It reads the output pointer and output length.
6. It parses the returned JSON as a strategy signal.

## Output Shape

Your WASM module must return JSON matching the normal strategy contract:

```json
{
  "action": "BUY",
  "size": 0.25,
  "reason": "Momentum threshold crossed",
  "metadata": {
    "score": 0.81
  }
}
```

## Registering a WASM Strategy

The strategies API accepts either:

- a `moduleUrl` pointing to a hosted `.wasm` file
- an uploaded base64 artifact stored by Quantago

Example runtime config:

```json
{
  "type": "wasm",
  "language": "rust",
  "lookbackCandles": 120,
  "moduleUrl": "https://example.com/strategy.wasm"
}
```

## When WASM Is the Right Choice

Choose WASM when:

- you want a portable compiled runtime
- you do not want to operate a separate HTTP strategy service
- your strategy language has a strong WASM toolchain

Use the [Strategies API](/api/strategies) to publish and version these modules.