---
id: backend-standards
slug: /standards/backend
sidebar_label: Backend Standards
description: Backend conventions for Hono routes, workflows, data access, and auth.
unlisted: true
---

# Backend Standards

Standards for organizing **Cloudflare Workers** API routes, Workflows, Durable Objects, Neon database access, and BetterAuth authentication using Hono for routing.

## 1. Folder Structure

```
src/
 ├─ routes/                        # Hono route modules (co-located like frontend)
 │   ├─ accounts/
 │   │   ├─ accounts-router.ts     # Hono router for this domain
 │   │   ├─ accounts-handlers.ts   # Request handler functions
 │   │   ├─ accounts-service.ts    # Business logic
 │   │   ├─ accounts-repository.ts # Database queries (Neon)
 │   │   ├─ accounts-schema.ts     # Zod validation schemas
 │   │   ├─ accounts-types.ts      # TypeScript types & interfaces
 │   │   ├─ accounts-handlers.test.ts
 │   │   └─ accounts-service.test.ts
 │   ├─ transactions/
 │   └─ ...other domains
 ├─ workflows/                     # Cloudflare Workflows (long-running processes)
 │   ├─ file-upload/
 │   │   ├─ file-upload-workflow.ts
 │   │   ├─ file-upload-steps.ts   # Individual workflow steps
 │   │   ├─ file-upload-types.ts
 │   │   └─ file-upload-workflow.test.ts
 │   └─ ...other workflows
 ├─ realtime/                      # Durable Objects + SSE
 │   ├─ notifications/
 │   │   ├─ notifications-do.ts    # Durable Object class
 │   │   ├─ notifications-router.ts
 │   │   ├─ notifications-types.ts
 │   │   └─ notifications-do.test.ts
 │   └─ ...other realtime domains
 ├─ db/
 │   ├─ client.ts                  # Neon client singleton
 │   ├─ migrations/                # SQL migration files
 │   │   ├─ 0001_create_accounts.sql
 │   │   └─ ...
 │   └─ schema/                    # Drizzle schema definitions
 │       ├─ accounts.ts
 │       ├─ transactions.ts
 │       └─ index.ts
 ├─ auth/
 │   ├─ auth-config.ts             # BetterAuth configuration
 │   ├─ auth-middleware.ts         # Auth middleware for Hono
 │   └─ auth-types.ts
 ├─ middleware/                    # Shared Hono middleware
 │   ├─ error-handler.ts
 │   ├─ cors.ts
 │   └─ logger.ts
 ├─ lib/
 │   └─ errors.ts                  # Shared AppError class
 ├─ index.ts                       # Worker entrypoint, app composition
 └─ worker-types.ts                # Env bindings type
```

## 2. Worker Entrypoint (`index.ts`)

All routers are mounted here. This is the only place the Hono app is composed.

```ts
// src/index.ts
import { Hono } from "hono";
import { cors } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/logger";
import { accountsRouter } from "./routes/accounts/accounts-router";
import { transactionsRouter } from "./routes/transactions/transactions-router";
import { notificationsRouter } from "./realtime/notifications/notifications-router";
import { authRouter } from "./auth/auth-config";
import type { AppEnv } from "./worker-types";

const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("*", requestLogger());
app.onError(errorHandler);

app.route("/auth", authRouter);
app.route("/api/accounts", accountsRouter);
app.route("/api/transactions", transactionsRouter);
app.route("/api/notifications", notificationsRouter);

export default app;

// Export Durable Objects and Workflows so Cloudflare can bind them
export { NotificationsDO } from "./realtime/notifications/notifications-do";
export { FileUploadWorkflow } from "./workflows/file-upload/file-upload-workflow";
```

## 3. Environment Bindings (`worker-types.ts`)

```ts
// src/worker-types.ts
import type { DurableObjectNamespace } from "@cloudflare/workers-types";

export type AppEnv = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    NOTIFICATIONS_DO: DurableObjectNamespace;
    FILE_UPLOAD_WORKFLOW: Workflow;
    R2_BUCKET: R2Bucket;
  };
  Variables: {
    userId: string;
    sessionId: string;
  };
};
```

## 4. Route Modules

Each domain under `src/routes/<domain>/` contains exactly these files. The layering is strict: **router → handlers → service → repository**.

### Router (`<domain>-router.ts`)

Mounts handlers and applies route-level middleware. No business logic here.

```ts
// src/routes/accounts/accounts-router.ts
import { Hono } from "hono";
import { requireAuth } from "../../auth/auth-middleware";
import {
  handleGetAccounts,
  handleGetAccount,
  handleCreateAccount,
  handleUpdateAccount,
  handleDeleteAccount,
} from "./accounts-handlers";
import type { AppEnv } from "../../worker-types";

export const accountsRouter = new Hono<AppEnv>();

accountsRouter.use("*", requireAuth);

accountsRouter.get("/", handleGetAccounts);
accountsRouter.get("/:id", handleGetAccount);
accountsRouter.post("/", handleCreateAccount);
accountsRouter.put("/:id", handleUpdateAccount);
accountsRouter.delete("/:id", handleDeleteAccount);
```

### Handlers (`<domain>-handlers.ts`)

Parse and validate the request, call the service, return the response. No raw SQL or business logic.

```ts
// src/routes/accounts/accounts-handlers.ts
import type { Context } from "hono";
import type { AppEnv } from "../../worker-types";
import { createAccountSchema, updateAccountSchema } from "./accounts-schema";
import * as service from "./accounts-service";
import { AppError } from "../../lib/errors";

export async function handleGetAccounts(c: Context<AppEnv>) {
  const userId = c.get("userId");
  const accounts = await service.getAccounts(c.env, userId);
  return c.json({ data: accounts });
}

export async function handleGetAccount(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const userId = c.get("userId");
  const account = await service.getAccount(c.env, id, userId);
  if (!account) throw new AppError("Account not found", 404);
  return c.json({ data: account });
}

export async function handleCreateAccount(c: Context<AppEnv>) {
  const body = await c.req.json();
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) throw new AppError("Invalid request body", 400, parsed.error);
  const userId = c.get("userId");
  const account = await service.createAccount(c.env, userId, parsed.data);
  return c.json({ data: account }, 201);
}

export async function handleUpdateAccount(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) throw new AppError("Invalid request body", 400, parsed.error);
  const userId = c.get("userId");
  const account = await service.updateAccount(c.env, id, userId, parsed.data);
  return c.json({ data: account });
}

export async function handleDeleteAccount(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const userId = c.get("userId");
  await service.deleteAccount(c.env, id, userId);
  return c.json({ success: true });
}
```

### Service (`<domain>-service.ts`)

All business logic lives here. Calls repositories. Never touches `Context` or HTTP concerns.

```ts
// src/routes/accounts/accounts-service.ts
import type { AppEnv } from "../../worker-types";
import * as repo from "./accounts-repository";
import { AppError } from "../../lib/errors";
import type { CreateAccountInput, UpdateAccountInput } from "./accounts-types";

type Env = AppEnv["Bindings"];

export async function getAccounts(env: Env, userId: string) {
  return repo.findAccountsByUser(env, userId);
}

export async function getAccount(env: Env, id: string, userId: string) {
  const account = await repo.findAccountById(env, id);
  if (account && account.userId !== userId) {
    throw new AppError("Forbidden", 403);
  }
  return account;
}

export async function createAccount(env: Env, userId: string, input: CreateAccountInput) {
  return repo.insertAccount(env, { ...input, userId });
}

export async function updateAccount(
  env: Env,
  id: string,
  userId: string,
  input: UpdateAccountInput
) {
  const existing = await repo.findAccountById(env, id);
  if (!existing) throw new AppError("Account not found", 404);
  if (existing.userId !== userId) throw new AppError("Forbidden", 403);
  return repo.updateAccount(env, id, input);
}

export async function deleteAccount(env: Env, id: string, userId: string) {
  const existing = await repo.findAccountById(env, id);
  if (!existing) throw new AppError("Account not found", 404);
  if (existing.userId !== userId) throw new AppError("Forbidden", 403);
  await repo.deleteAccount(env, id);
}
```

### Repository (`<domain>-repository.ts`)

All Neon/Drizzle queries. Returns raw data — no HTTP concerns, no business rules.

```ts
// src/routes/accounts/accounts-repository.ts
import { getNeonClient } from "../../db/client";
import { accounts } from "../../db/schema/accounts";
import { eq } from "drizzle-orm";
import type { AppEnv } from "../../worker-types";
import type { CreateAccountRow, UpdateAccountInput } from "./accounts-types";

type Env = AppEnv["Bindings"];

export async function findAccountsByUser(env: Env, userId: string) {
  const db = getNeonClient(env);
  return db.select().from(accounts).where(eq(accounts.userId, userId));
}

export async function findAccountById(env: Env, id: string) {
  const db = getNeonClient(env);
  const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
  return row ?? null;
}

export async function insertAccount(env: Env, input: CreateAccountRow) {
  const db = getNeonClient(env);
  const [row] = await db.insert(accounts).values(input).returning();
  return row;
}

export async function updateAccount(env: Env, id: string, input: UpdateAccountInput) {
  const db = getNeonClient(env);
  const [row] = await db
    .update(accounts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(accounts.id, id))
    .returning();
  return row;
}

export async function deleteAccount(env: Env, id: string) {
  const db = getNeonClient(env);
  await db.delete(accounts).where(eq(accounts.id, id));
}
```

### Schema (`<domain>-schema.ts`)

Zod validation schemas for incoming request bodies.

```ts
// src/routes/accounts/accounts-schema.ts
import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["checking", "savings", "investment"]),
});

export const updateAccountSchema = createAccountSchema.partial();
```

### Types (`<domain>-types.ts`)

TypeScript types derived from schemas and DB rows.

```ts
// src/routes/accounts/accounts-types.ts
import type { z } from "zod";
import type { createAccountSchema, updateAccountSchema } from "./accounts-schema";
import type { accounts } from "../../db/schema/accounts";
import type { InferSelectModel } from "drizzle-orm";

export type Account = InferSelectModel<typeof accounts>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateAccountRow = CreateAccountInput & { userId: string };
```

## 5. Database (`db/`)

### Client (`db/client.ts`)

```ts
// src/db/client.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import type { AppEnv } from "../worker-types";

export function getNeonClient(env: AppEnv["Bindings"]) {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}
```

### Schema (`db/schema/accounts.ts`)

```ts
// src/db/schema/accounts.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## 6. Authentication (`auth/`)

### BetterAuth Config (`auth/auth-config.ts`)

```ts
// src/auth/auth-config.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getNeonClient } from "../db/client";
import type { AppEnv } from "../worker-types";

export function createAuth(env: AppEnv["Bindings"]) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getNeonClient(env), { provider: "pg" }),
    emailAndPassword: { enabled: true },
    session: {
      cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 },
    },
  });
}

// Hono sub-router for /auth/* endpoints
import { Hono } from "hono";

export const authRouter = new Hono<AppEnv>().all("/*", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});
```

### Auth Middleware (`auth/auth-middleware.ts`)

```ts
// src/auth/auth-middleware.ts
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../worker-types";
import { createAuth } from "./auth-config";
import { AppError } from "../lib/errors";

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) throw new AppError("Unauthorized", 401);
  c.set("userId", session.user.id);
  c.set("sessionId", session.session.id);
  await next();
};
```

## 7. Cloudflare Workflows

Use Workflows for any long-running process — file uploads, report generation, bulk imports, email sequences. Each workflow lives in `src/workflows/<name>/`.

```
src/workflows/file-upload/
  ├─ file-upload-workflow.ts   # WorkflowEntrypoint class
  ├─ file-upload-steps.ts      # Individual step functions
  ├─ file-upload-types.ts      # Params & result types
  └─ file-upload-workflow.test.ts
```

### Workflow Entrypoint

```ts
// src/workflows/file-upload/file-upload-workflow.ts
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { validateFile, processFile, notifyCompletion } from "./file-upload-steps";
import type { FileUploadParams, FileUploadResult } from "./file-upload-types";
import type { AppEnv } from "../../worker-types";

export class FileUploadWorkflow extends WorkflowEntrypoint
  AppEnv["Bindings"],
  FileUploadParams
> {
  async run(event: WorkflowEvent<FileUploadParams>, step: WorkflowStep) {
    const { fileKey, userId, mimeType } = event.payload;

    const validated = await step.do("validate-file", async () => {
      return validateFile({ fileKey, mimeType });
    });

    const processed = await step.do(
      "process-file",
      { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" } },
      async () => {
        return processFile({ env: this.env, fileKey, userId, metadata: validated });
      }
    );

    await step.sleep("wait-before-notify", "2 seconds");

    await step.do("notify-completion", async () => {
      return notifyCompletion({ env: this.env, userId, result: processed });
    });
  }
}
```

### Workflow Steps

```ts
// src/workflows/file-upload/file-upload-steps.ts
import type { AppEnv } from "../../worker-types";
import type { FileMetadata, ProcessedFile } from "./file-upload-types";

export async function validateFile({
  fileKey,
  mimeType,
}: {
  fileKey: string;
  mimeType: string;
}): Promise<FileMetadata> {
  const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  return { fileKey, mimeType, validatedAt: new Date().toISOString() };
}

export async function processFile({
  env,
  fileKey,
  userId,
  metadata,
}: {
  env: AppEnv["Bindings"];
  fileKey: string;
  userId: string;
  metadata: FileMetadata;
}): Promise<ProcessedFile> {
  const object = await env.R2_BUCKET.get(fileKey);
  if (!object) throw new Error(`File not found in R2: ${fileKey}`);
  // ... transform, resize, index, etc.
  return { fileKey, userId, processedAt: new Date().toISOString(), size: object.size };
}

export async function notifyCompletion({
  env,
  userId,
  result,
}: {
  env: AppEnv["Bindings"];
  userId: string;
  result: ProcessedFile;
}): Promise<void> {
  const doId = env.NOTIFICATIONS_DO.idFromName(userId);
  const stub = env.NOTIFICATIONS_DO.get(doId);
  await stub.fetch("https://do/notify", {
    method: "POST",
    body: JSON.stringify({ type: "file-upload-complete", payload: result }),
  });
}
```

### Triggering a Workflow from a Handler

```ts
// src/routes/files/files-handlers.ts
export async function handleFileUpload(c: Context<AppEnv>) {
  const { fileKey, mimeType } = await c.req.json();
  const userId = c.get("userId");

  const instance = await c.env.FILE_UPLOAD_WORKFLOW.create({
    params: { fileKey, userId, mimeType },
  });

  return c.json({ instanceId: instance.id }, 202);
}
```

## 8. Durable Objects + SSE for Real-Time Updates

Each real-time domain lives in `src/realtime/<name>/`. The Durable Object manages connected SSE clients and fans out messages to them.

```
src/realtime/notifications/
  ├─ notifications-do.ts       # Durable Object class
  ├─ notifications-router.ts   # Hono router for SSE + trigger endpoints
  ├─ notifications-types.ts
  └─ notifications-do.test.ts
```

### Durable Object (`notifications-do.ts`)

```ts
// src/realtime/notifications/notifications-do.ts
import { DurableObject } from "cloudflare:workers";
import type { AppEnv } from "../../worker-types";
import type { NotificationEvent } from "./notifications-types";

export class NotificationsDO extends DurableObject<AppEnv["Bindings"]> {
  private clients = new Map<string, ReadableStreamDefaultController>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      return this.handleSSEConnect(request);
    }

    if (url.pathname === "/notify" && request.method === "POST") {
      return this.handleNotify(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private handleSSEConnect(request: Request): Response {
    const clientId = crypto.randomUUID();

    const stream = new ReadableStream({
      start: (controller) => {
        this.clients.set(clientId, controller);
        // Send initial ping to confirm connection
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
        );
      },
      cancel: () => {
        this.clients.delete(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  private async handleNotify(request: Request): Promise<Response> {
    const event: NotificationEvent = await request.json();
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const encoded = new TextEncoder().encode(payload);

    for (const [clientId, controller] of this.clients) {
      try {
        controller.enqueue(encoded);
      } catch {
        // Client disconnected — clean up
        this.clients.delete(clientId);
      }
    }

    return new Response(JSON.stringify({ delivered: this.clients.size }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Realtime Router (`notifications-router.ts`)

```ts
// src/realtime/notifications/notifications-router.ts
import { Hono } from "hono";
import { requireAuth } from "../../auth/auth-middleware";
import type { AppEnv } from "../../worker-types";

export const notificationsRouter = new Hono<AppEnv>();

notificationsRouter.use("*", requireAuth);

// Client connects here to receive SSE events
notificationsRouter.get("/stream", async (c) => {
  const userId = c.get("userId");
  const doId = c.env.NOTIFICATIONS_DO.idFromName(userId);
  const stub = c.env.NOTIFICATIONS_DO.get(doId);
  return stub.fetch(new Request("https://do/connect", { headers: c.req.raw.headers }));
});

// Internal or admin endpoint to push a notification to a user
notificationsRouter.post("/send/:userId", async (c) => {
  const { userId } = c.req.param();
  const body = await c.req.json();
  const doId = c.env.NOTIFICATIONS_DO.idFromName(userId);
  const stub = c.env.NOTIFICATIONS_DO.get(doId);
  const result = await stub.fetch("https://do/notify", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return c.json(await result.json());
});
```

### Client-side SSE consumption

```ts
// Frontend: src/lib/notifications-client.ts
export function connectNotifications(onEvent: (event: NotificationEvent) => void) {
  const source = new EventSource("/api/notifications/stream", {
    withCredentials: true,
  });

  source.onmessage = (e) => {
    const event = JSON.parse(e.data) as NotificationEvent;
    if (event.type !== "connected") onEvent(event);
  };

  source.onerror = () => source.close();

  return () => source.close();
}
```

## 9. Shared Middleware

```ts
// src/middleware/error-handler.ts
import type { ErrorHandler } from "hono";
import type { AppEnv } from "../worker-types";
import { AppError } from "../lib/errors";

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, details: err.details ?? null }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
};
```

```ts
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

## 10. Testing

Every handler and service file has a co-located `.test.ts`. Use **Vitest** with `@cloudflare/vitest-pool-workers` so tests run in the actual Workers runtime.

### Handler tests

Mock the service layer — never the repository or database.

```ts
// src/routes/accounts/accounts-handlers.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { handleGetAccounts, handleCreateAccount } from "./accounts-handlers";
import * as service from "./accounts-service";

vi.mock("./accounts-service");

const mockGetAccounts = vi.mocked(service.getAccounts);
const mockCreateAccount = vi.mocked(service.createAccount);

function buildApp() {
  const app = new Hono();
  app.use("*", async (c, next) => { c.set("userId", "user-123"); await next(); });
  app.get("/", handleGetAccounts);
  app.post("/", handleCreateAccount);
  return app;
}

describe("accounts handlers", () => {
  beforeEach(() => vi.resetAllMocks());

  it("GET / returns accounts for the authenticated user", async () => {
    mockGetAccounts.mockResolvedValue([{ id: "1", name: "Savings", type: "savings" }]);
    const res = await buildApp().request("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockGetAccounts).toHaveBeenCalledWith(expect.anything(), "user-123");
  });

  it("POST / returns 400 for invalid body", async () => {
    const res = await buildApp().request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST / creates an account with valid body", async () => {
    mockCreateAccount.mockResolvedValue({ id: "2", name: "Checking", type: "checking" });
    const res = await buildApp().request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Checking", type: "checking" }),
    });
    expect(res.status).toBe(201);
  });
});
```

### Service tests

Mock the repository layer.

```ts
// src/routes/accounts/accounts-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccount, deleteAccount } from "./accounts-service";
import * as repo from "./accounts-repository";
import { AppError } from "../../lib/errors";

vi.mock("./accounts-repository");

const mockFindById = vi.mocked(repo.findAccountById);
const mockDelete = vi.mocked(repo.deleteAccount);
const mockEnv = {} as any;

describe("accounts service", () => {
  beforeEach(() => vi.resetAllMocks());

  it("getAccount throws 403 if account belongs to another user", async () => {
    mockFindById.mockResolvedValue({ id: "1", userId: "other-user", name: "Savings" });
    await expect(getAccount(mockEnv, "1", "user-123")).rejects.toThrow(
      new AppError("Forbidden", 403)
    );
  });

  it("deleteAccount throws 404 if account does not exist", async () => {
    mockFindById.mockResolvedValue(null);
    await expect(deleteAccount(mockEnv, "1", "user-123")).rejects.toThrow(
      new AppError("Account not found", 404)
    );
  });

  it("deleteAccount calls repo.deleteAccount for the owner", async () => {
    mockFindById.mockResolvedValue({ id: "1", userId: "user-123", name: "Savings" });
    mockDelete.mockResolvedValue(undefined);
    await deleteAccount(mockEnv, "1", "user-123");
    expect(mockDelete).toHaveBeenCalledWith(mockEnv, "1");
  });
});
```

## 11. Benefits

- **Co-located by domain** — every concern for a domain (router, handlers, service, repository, schema, types, tests) lives together, mirroring the frontend route structure.
- **Strict layering** — router → handlers → service → repository. Each layer has one job and nothing leaks across boundaries.
- **Workers-native** — Neon's HTTP driver, Workflows, and Durable Objects are all serverless-compatible with no persistent connections.
- **Centralized auth** — BetterAuth config is created once per request from env bindings; `requireAuth` middleware sets `userId` on context for all protected routes.
- **Long-running processes isolated** — Workflows handle everything that can't finish in a single request: file processing, bulk jobs, multi-step pipelines with retries.
- **Real-time via DO+SSE** — one Durable Object per user fans out events from any source (workflows, other routes) to all active SSE connections for that user.
- **Testable by design** — mocking at the service boundary for handler tests and at the repository boundary for service tests keeps tests fast and decoupled from the runtime.

---

The layering rule to internalize: **handlers never touch the DB, services never touch HTTP, repositories never contain business rules.** Every Workflow step is a pure function that receives `env` explicitly. Every real-time event flows through the DO — no direct SSE writes from routes.