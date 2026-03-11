---
id: zustand-standards
slug: /standards/zustand
sidebar_label: Zustand Standards
description: Async action and state management standards for Zustand stores.
unlisted: true
---

# Zustand Async Action Standards

## Centralized Loading and Error State

- Store all loading and error states in top-level objects:
  - `loading: Record<string, boolean>`
  - `errors: Record<string, string | null>`
- Do **not** persist `loading` or `errors` in localStorage (only persist essential data).

## The `withLoading` Utility

Use a generic async wrapper for all async actions:

```typescript
import { produce } from "immer";

export async function withLoading<T extends any[]>(
  key: string,
  fn: (
    set: any,
    get: any,
    setKey: (path: string | string[], value: any) => void,
    setError: (msg: string | null) => void,
    ...args: T
  ) => Promise<void>,
  set: any,
  get: any,
  ...args: T
) {
  set((state: any) => ({
    loading: { ...state.loading, [key]: true },
    errors: { ...state.errors, [key]: null },
  }));

  const setError = (msg: string | null) => {
    set((state: any) => ({
      errors: { ...state.errors, [key]: msg },
    }));
  };

  const setKey = (path: string | string[], value: any) => {
    set(
      produce((draft: any) => {
        const keys = Array.isArray(path) ? path : path.split(".");
        let obj = draft;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
      })
    );
  };

  try {
    await fn(set, get, setKey, setError, ...args);
    set((state: any) => ({
      errors: { ...state.errors, [key]: null },
    }));
  } catch (error: any) {
    setError(error?.message || String(error));
    throw error;
  } finally {
    set((state: any) => ({
      loading: { ...state.loading, [key]: false },
    }));
  }
}
```

## Slice Pattern Example

```typescript
export const transactionsSlice = (set, get) => ({
  transactions: [],
  loading: {},
  errors: {},

  fetchTransactions: async () => {
    return await withLoading(
      "fetchTransactions",
      async (set, get, setKey, setError) => {
        try {
          const result = await api.fetchTransactions();
          setKey("transactions", result);
        } catch (err: any) {
          setError(err?.message || String(err));
        }
      },
      set,
      get
    );
  },

  updateTransactionStatus: async (transactionId, status) => {
    return await withLoading(
      "updateTransactionStatus",
      async (set, get, setKey, setError, transactionId, status) => {
        try {
          const updated = await api.updateTransactionStatus(
            transactionId,
            status
          );
          setKey(
            ["transactions"],
            get().transactions.map((tx) =>
              tx.id === updated.id ? updated : tx
            )
          );
        } catch (err: any) {
          setError(err?.message || String(err));
        }
      },
      set,
      get,
      transactionId,
      status
    );
  },
  // ...other actions
});
```

## Hook Usage Example

```typescript
export function useFetchTransactions() {
  const transactions = useAppStore((state) => state.transactions);
  const isLoading = useAppStore((state) => state.loading["fetchTransactions"]);
  const error = useAppStore((state) => state.errors["fetchTransactions"]);
  const fetchTransactions = useAppStore((state) => state.fetchTransactions);

  return { data: transactions, isLoading, error, run: fetchTransactions };
}
```

## Best Practices

- Always use a unique key for each async action.
- Use `setKey` for updating nested state.
- Use `setError` for error handling.
- Only persist essential data, not UI state.
- Use hooks to expose `isLoading`, `error`, and `run` for each action.
- Keep selectors stable and simple.

---

This pattern ensures:

- Stable React 18 compatibility
- No infinite loops
- Centralized, predictable loading/error state
- Clean, maintainable async actions in Zustand
