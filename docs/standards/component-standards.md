---
id: component-standards
slug: /standards/components
sidebar_label: Component Standards
description: Frontend component and route organization standards for Quantago.
unlisted: true
---

Here are the updated standards with testing fully integrated:

---

# Component Standards

Standards for organizing **Wouter** routes, reusable UI components, API layers, and state slices using Zustand.

## 1. Folder Structure

```
src/
 ├─ routes/               # Route-level feature modules
 │   ├─ accounts/
 │   │   ├─ AccountsPage.tsx
 │   │   ├─ AccountsPage.test.tsx    # Unit tests for the page
 │   │   ├─ AccountsPage.stories.tsx # Storybook stories for the page
 │   │   ├─ accounts-api.ts
 │   │   ├─ accounts-store.ts
 │   │   ├─ accounts-hooks.ts
 │   │   └─ components/
 │   │       ├─ AccountList/
 │   │       │   ├─ AccountList.tsx
 │   │       │   ├─ AccountList.test.tsx
 │   │       │   ├─ AccountList.stories.tsx
 │   │       │   └─ index.ts
 │   │       └─ AccountItem/
 │   │           ├─ AccountItem.tsx
 │   │           ├─ AccountItem.test.tsx
 │   │           ├─ AccountItem.stories.tsx
 │   │           └─ index.ts
 │   └─ ...other routes
 ├─ components/
 │   ├─ ui/
 │   │   └─ button/
 │   │       ├─ button-component.tsx
 │   │       ├─ button-types.ts
 │   │       ├─ button-utils.ts
 │   │       ├─ button-component.test.tsx
 │   │       ├─ button-component.stories.tsx
 │   │       ├─ README.md
 │   │       └─ index.ts
 │   └─ layout/
 ├─ store/
 │   ├─ asyncWrapper.ts
 │   └─ index.ts
 ├─ router.tsx
 └─ styles/
```

Every component — whether under `src/routes/` or `src/components/` — ships with a `.test.tsx` and a `.stories.tsx` file co-located alongside it.

## 2. Wouter Route Definitions

All routes are declared in a single `router.tsx` at the project root:

```tsx
// src/router.tsx
import { Switch, Route } from "wouter";
import { AccountsPage } from "./routes/accounts/AccountsPage";
import { TransactionsPage } from "./routes/transactions/TransactionsPage";
import { NotFoundPage } from "./routes/not-found/NotFoundPage";

export function AppRouter() {
  return (
    <Switch>
      <Route path="/accounts" component={AccountsPage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
```

Each route under `src/routes/<route>/`:

- **`<Route>Page.tsx`**: The top-level React component rendered for that route.
- **`<Route>Page.test.tsx`**: Unit tests for the page component.
- **`<Route>Page.stories.tsx`**: Storybook stories for the page component.
- **`<route>-api.ts`**: All remote calls and DTO types.
- **`<route>-store.ts`**: Zustand slice (state shape + async actions).
- **`<route>-hooks.ts`**: Exported hooks wrapping store selectors for each action.
- **`components/`**: Route-specific subcomponents, each with their own test and story files.

## 3. Reusable Components

Under `src/components/`:

- **`ui/`**: Shared primitive components (Button, Input, Modal).
- **`layout/`**: Layout components (NavBar, Sidebar, Footer).

Each component folder:

```
src/components/ui/button/
  ├─ button-component.tsx
  ├─ button-types.ts
  ├─ button-utils.ts
  ├─ button-component.test.tsx
  ├─ button-component.stories.tsx
  ├─ README.md
  └─ index.ts
```

## 4. API Files (`<route>-api.ts`)

- Name `<route>-api.ts` matching route folder.
- Define only network calls and DTO types — no store logic.

```ts
// src/routes/accounts/accounts-api.ts
export interface Account {
  id: string;
  name: string;
}

export async function fetchAccounts(): Promise<Account[]> { /*...*/ }
export async function createAccount(p: Partial<Account>): Promise<Account> { /*...*/ }
// updateAccount(), deleteAccount(), etc.
```

## 5. Store Files (`<route>-store.ts`)

- Name `<route>-store.ts` matching route folder.
- Use `withLoading` for every async action — no exceptions.
- Declare `loading: {}` and `errors: {}` in the slice; do **not** persist them.
- Only persist essential domain data (e.g. `accounts`), never UI state.
- Error handling inside the `withLoading` callback is optional — `withLoading` catches and re-throws unhandled errors automatically.

```ts
// src/routes/accounts/accounts-store.ts
import { withLoading } from "../../store/asyncWrapper";
import * as api from "./accounts-api";

export const accountsSlice = (set, get) => ({
  accounts: [],
  loading: {},
  errors: {},

  fetchAccounts: async () => {
    return await withLoading(
      "fetchAccounts",
      async (set, get, setKey) => {
        const result = await api.fetchAccounts();
        setKey("accounts", result);
      },
      set,
      get
    );
  },

  createAccount: async (accountData) => {
    return await withLoading(
      "createAccount",
      async (set, get, setKey, setError, accountData) => {
        const result = await api.createAccount(accountData);
        setKey("accounts", [...get().accounts, result]);
      },
      set,
      get,
      accountData
    );
  },
});
```

## 6. Hook Files (`<route>-hooks.ts`)

Each async action gets a dedicated hook that exposes `data`, `isLoading`, `error`, and `run`. Components consume hooks — never raw store selectors for async actions.

```ts
// src/routes/accounts/accounts-hooks.ts
import { useAppStore } from "@/store";

export function useFetchAccounts() {
  const accounts = useAppStore((state) => state.accounts);
  const isLoading = useAppStore((state) => state.loading["fetchAccounts"]);
  const error = useAppStore((state) => state.errors["fetchAccounts"]);
  const fetchAccounts = useAppStore((state) => state.fetchAccounts);

  return { data: accounts, isLoading, error, run: fetchAccounts };
}

export function useCreateAccount() {
  const isLoading = useAppStore((state) => state.loading["createAccount"]);
  const error = useAppStore((state) => state.errors["createAccount"]);
  const createAccount = useAppStore((state) => state.createAccount);

  return { isLoading, error, run: createAccount };
}
```

## 7. Unit Tests (`.test.tsx`)

Use **Vitest** and **React Testing Library**. Every component gets its own `.test.tsx` co-located in the same folder.

### What to test

- **Renders correctly** given each meaningful prop combination.
- **User interactions** — clicks, input changes, form submissions.
- **Conditional rendering** — loading states, error states, empty states.
- **Hook integration** — mock the hook, verify the component reacts correctly.

### Mocking hooks

Always mock the route's hooks at the module boundary. Never reach into the Zustand store directly from a component test.

```tsx
// src/routes/accounts/AccountsPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AccountsPage } from "./AccountsPage";
import * as hooks from "./accounts-hooks";

vi.mock("./accounts-hooks");

const mockUseFetchAccounts = vi.mocked(hooks.useFetchAccounts);

describe("AccountsPage", () => {
  beforeEach(() => {
    mockUseFetchAccounts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      run: vi.fn(),
    });
  });

  it("renders a loading spinner while fetching", () => {
    mockUseFetchAccounts.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      run: vi.fn(),
    });
    render(<AccountsPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error message on failure", () => {
    mockUseFetchAccounts.mockReturnValue({
      data: [],
      isLoading: false,
      error: "Failed to load accounts",
      run: vi.fn(),
    });
    render(<AccountsPage />);
    expect(screen.getByText("Failed to load accounts")).toBeInTheDocument();
  });

  it("renders the account list when data is available", () => {
    mockUseFetchAccounts.mockReturnValue({
      data: [{ id: "1", name: "Savings" }],
      isLoading: false,
      error: null,
      run: vi.fn(),
    });
    render(<AccountsPage />);
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("calls fetchAccounts on mount", () => {
    const run = vi.fn();
    mockUseFetchAccounts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      run,
    });
    render(<AccountsPage />);
    expect(run).toHaveBeenCalledOnce();
  });
});
```

### Shared UI component example

For pure UI components with no store dependency, test props and interactions directly:

```tsx
// src/components/ui/button/button-component.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button-component";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button label="Save" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when the disabled prop is true", () => {
    render(<Button label="Save" onClick={vi.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

## 8. Storybook Stories (`.stories.tsx`)

Use **Storybook 8+** with the `@storybook/react` renderer. Every component gets a `.stories.tsx` co-located in the same folder, covering all meaningful visual states.

### Story conventions

- One `meta` export with `title` matching the folder path.
- One named export per visual state.
- Use `args` for all props — never hardcode values inside `render`.
- Cover at minimum: **default**, **loading**, **error**, and **empty** states where applicable.

```tsx
// src/routes/accounts/AccountsPage.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { vi } from "vitest";
import * as hooks from "./accounts-hooks";
import { AccountsPage } from "./AccountsPage";

vi.mock("./accounts-hooks");
const mockUseFetchAccounts = vi.mocked(hooks.useFetchAccounts);

const meta: Meta<typeof AccountsPage> = {
  title: "Routes/Accounts/AccountsPage",
  component: AccountsPage,
};
export default meta;

type Story = StoryObj<typeof AccountsPage>;

export const Default: Story = {
  beforeEach: () => {
    mockUseFetchAccounts.mockReturnValue({
      data: [{ id: "1", name: "Savings" }, { id: "2", name: "Checking" }],
      isLoading: false,
      error: null,
      run: vi.fn(),
    });
  },
};

export const Loading: Story = {
  beforeEach: () => {
    mockUseFetchAccounts.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      run: vi.fn(),
    });
  },
};

export const Error: Story = {
  beforeEach: () => {
    mockUseFetchAccounts.mockReturnValue({
      data: [],
      isLoading: false,
      error: "Failed to load accounts",
      run: vi.fn(),
    });
  },
};

export const Empty: Story = {
  beforeEach: () => {
    mockUseFetchAccounts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      run: vi.fn(),
    });
  },
};
```

### Shared UI component stories

```tsx
// src/components/ui/button/button-component.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button-component";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  args: {
    label: "Click me",
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Loading: Story = {
  args: { label: "Saving…", disabled: true },
};
```

## 9. Root Store (`store/index.ts`)

```ts
// src/store/index.ts
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { accountsSlice } from "../routes/accounts/accounts-store";
import { transactionsSlice } from "../routes/transactions/transactions-store";

export const useAppStore = create(
  combine({}, (...a) => ({
    ...accountsSlice(...a),
    ...transactionsSlice(...a),
  }))
);
```

## 10. Navigation

Use Wouter's `Link` and `useLocation` for all navigation — never native `<a>` tags or `window.location`:

```tsx
import { Link, useLocation, useParams } from "wouter";

// Declarative
<Link href="/accounts">Accounts</Link>

// Programmatic
const [, navigate] = useLocation();
navigate("/accounts");

// Route params
const { id } = useParams<{ id: string }>();
```

## 11. Benefits

- **Clear separation** between route components and shared UI.
- **Co-located API, state, hooks, tests, and stories** for each route under `src/routes/<route>`.
- **Consistent naming**: `<route>-api.ts`, `<route>-store.ts`, `<route>-hooks.ts`, `<Route>Page.tsx`, `<Route>Page.test.tsx`, `<Route>Page.stories.tsx`.
- **Single router file** — all routes visible at a glance in `router.tsx`.
- **Uniform async pattern** via `withLoading` — centralized loading/error state with no boilerplate.
- **Hook-encapsulated actions** — components and tests never access loading or error state directly from the store.
- **Full visual coverage** via Storybook for every meaningful component state.
- **Reliable unit tests** by mocking at the hook boundary, keeping tests fast and store-agnostic.

---

The key additions: every component folder now requires a `.test.tsx` and `.stories.tsx`, tests mock at the hook boundary (never the store directly), and Storybook stories use `beforeEach` to control hook return values per story — mirroring the same mock pattern used in unit tests for consistency.