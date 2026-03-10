import { AppError } from '../errors';
import { loadStrategyArtifact } from '../strategy-artifacts';
import type { BackendEnv } from '../../worker-types';
import type { StrategyDecision, StrategyDefinition, StrategyExecutionInput, StrategySignal } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const normalizeAction = (value: unknown): StrategySignal['type'] => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toUpperCase();
  if (normalized === 'BUY' || normalized === 'SELL') {
    return normalized;
  }

  return null;
};

const toStrategySignal = (decision: StrategyDecision): StrategySignal => {
  if (decision.action === 'HOLD') {
    return {
      type: null,
      size: decision.size,
      reason: decision.reason,
      metadata: decision.metadata,
    };
  }

  return {
    type: decision.action,
    size: decision.size,
    reason: decision.reason,
    metadata: decision.metadata,
  };
};

const executeRemoteStrategy = async (
  definition: StrategyDefinition,
  input: StrategyExecutionInput,
): Promise<StrategySignal> => {
  if (definition.runtime.type !== 'remote') {
    throw new AppError(`Invalid remote strategy runtime for ${definition.name}`, 500);
  }

  const controller = new AbortController();
  const timeoutMs = definition.runtime.timeoutMs ?? 5_000;
  const timeout = setTimeout(() => controller.abort('Strategy request timed out'), timeoutMs);

  try {
    const response = await fetch(definition.runtime.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(definition.runtime.headers ?? {}),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;

    if (!response.ok) {
      const message = typeof payload?.message === 'string'
        ? payload.message
        : `Remote strategy request failed with status ${response.status}`;
      throw new AppError(message, 502, { strategy: definition.name, endpoint: definition.runtime.endpoint });
    }

    if (payload?.action != null && normalizeAction(payload.action) == null && String(payload.action).toUpperCase() !== 'HOLD') {
      throw new AppError('Remote strategy returned an invalid action', 422, {
        strategy: definition.name,
        endpoint: definition.runtime.endpoint,
        action: payload.action,
      });
    }

    if (payload?.size != null && (typeof payload.size !== 'number' || !Number.isFinite(payload.size) || payload.size < 0)) {
      throw new AppError('Remote strategy returned an invalid size', 422, {
        strategy: definition.name,
        endpoint: definition.runtime.endpoint,
        size: payload.size,
      });
    }

    const signalType = normalizeAction(payload?.action);
    return {
      type: signalType,
      size: typeof payload?.size === 'number' ? payload.size : undefined,
      reason: typeof payload?.reason === 'string' ? payload.reason : undefined,
      metadata: payload && typeof payload.metadata === 'object' && payload.metadata !== null
        ? payload.metadata as Record<string, unknown>
        : undefined,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Remote strategy execution failed';
    throw new AppError(message, 502, { strategy: definition.name, endpoint: definition.runtime.endpoint });
  } finally {
    clearTimeout(timeout);
  }
};

const executeWasmStrategy = async (
  env: BackendEnv,
  definition: StrategyDefinition,
  input: StrategyExecutionInput,
): Promise<StrategySignal> => {
  if (definition.runtime.type !== 'wasm') {
    throw new AppError(`Invalid WASM strategy runtime for ${definition.name}`, 500);
  }

  const bytes = definition.runtime.artifactKey
    ? await loadStrategyArtifact(env, definition.runtime.artifactKey)
    : definition.runtime.moduleUrl
      ? await fetch(definition.runtime.moduleUrl).then(async (response) => {
        if (!response.ok) {
          throw new AppError(`Failed to fetch WASM module for ${definition.name}`, 502);
        }

        return response.arrayBuffer();
      })
      : null;

  if (!bytes) {
    throw new AppError(`No WASM module configured for ${definition.name}`, 500);
  }

  const module = await WebAssembly.compile(bytes);
  const instance = await WebAssembly.instantiate(module, {});
  const wasmExports = instance.exports as Record<string, unknown>;
  const memory = wasmExports.memory as WebAssembly.Memory | undefined;
  const signal = wasmExports[definition.runtime.exportedFunction ?? 'signal'] as ((ptr: number, len: number) => number) | undefined;
  const signalLength = wasmExports[definition.runtime.resultLengthFunction ?? 'signal_len'] as (() => number) | undefined;
  const alloc = wasmExports[definition.runtime.allocFunction ?? 'alloc'] as ((size: number) => number) | undefined;
  const dealloc = wasmExports[definition.runtime.deallocFunction ?? 'dealloc'] as ((ptr: number, size: number) => void) | undefined;

  if (!memory || !signal || !signalLength || !alloc) {
    throw new AppError(`WASM strategy ${definition.name} is missing required exports`, 500, {
      required: ['memory', definition.runtime.exportedFunction ?? 'signal', definition.runtime.resultLengthFunction ?? 'signal_len', definition.runtime.allocFunction ?? 'alloc'],
    });
  }

  const payload = encoder.encode(JSON.stringify(input));
  const inputPointer = alloc(payload.length);
  new Uint8Array(memory.buffer, inputPointer, payload.length).set(payload);

  try {
    const outputPointer = signal(inputPointer, payload.length);
    const outputLength = signalLength();
    const outputBytes = new Uint8Array(memory.buffer, outputPointer, outputLength);
    const parsed = JSON.parse(decoder.decode(outputBytes)) as Record<string, unknown>;

    if (parsed.action != null && normalizeAction(parsed.action) == null && String(parsed.action).toUpperCase() !== 'HOLD') {
      throw new AppError('WASM strategy returned an invalid action', 422, {
        strategy: definition.name,
        action: parsed.action,
      });
    }

    return {
      type: normalizeAction(parsed.action),
      size: typeof parsed.size === 'number' ? parsed.size : undefined,
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      metadata: parsed.metadata && typeof parsed.metadata === 'object'
        ? parsed.metadata as Record<string, unknown>
        : undefined,
    };
  } finally {
    dealloc?.(inputPointer, payload.length);
  }
};

export const runStrategySignal = async (
  env: BackendEnv,
  definition: StrategyDefinition,
  input: StrategyExecutionInput,
): Promise<StrategySignal> => {
  switch (definition.runtime.type) {
    case 'native': {
      if (!definition.evaluateSignal) {
        throw new AppError(`Native strategy ${definition.name} is missing an evaluator`, 500);
      }

      return toStrategySignal(await definition.evaluateSignal(input));
    }
    case 'remote':
      return executeRemoteStrategy(definition, input);
    case 'wasm':
        return executeWasmStrategy(env, definition, input);
    default:
      throw new AppError(`Unsupported strategy runtime for ${definition.name}`, 500);
  }
};