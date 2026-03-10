# Architecture

This document provides a comprehensive overview of the Quantago architecture, including system design, data flows, and infrastructure components.

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Component Architecture](#component-architecture)
- [Data Architecture](#data-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Ingestion Pipeline](#ingestion-pipeline)
- [Backtest Execution](#backtest-execution)
- [Strategy Protocol](#strategy-protocol)
- [Infrastructure & Deployment](#infrastructure--deployment)

## System Overview

Quantago is a cloud-native, serverless application designed for algorithmic trading strategy backtesting and market data management. Built on Cloudflare's edge infrastructure, it provides:

- **Fast backtesting execution** using Cloudflare Workers
- **Scalable data storage** with ClickHouse for OHLCV data
- **Real-time ingestion monitoring** via Server-Sent Events (SSE)
- **Admin controls** for data management
- **Role-based access control** for secure operations

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Frontend App<br/>React + Vite]
        ADMIN[Admin Dashboard<br/>React + Vite]
    end

    subgraph "Edge Layer - Cloudflare"
        API[Backend API<br/>Workers + Hono]
        WF[Workflows Engine]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Neon)]
        CH[(ClickHouse<br/>OHLCV Data)]
    end

    subgraph "External Services"
        CCXT[CCXT<br/>Crypto Data]
        YF[YFinance<br/>Stock Data]
    end

    FE -->|API Requests| API
    ADMIN -->|Admin API + SSE| API
    API -->|Auth & Metadata| PG
    API -->|Query OHLCV| CH
    API -->|Trigger| WF
    WF -->|Store Data| CH
    WF -->|Fetch Market Data| CCXT
    WF -->|Fetch Market Data| YF
    WF -->|Update Status| PG
```

## Component Architecture

### Frontend Services

```mermaid
graph LR
    subgraph "Frontend Application"
        UI[UI Components<br/>shadcn/ui]
        CHARTS[Charts<br/>SciChart/AnyChart]
        AUTH[Auth Client<br/>Better Auth]
        API_CLIENT[API Client<br/>Fetch]
    end

    subgraph "Pages"
        HOME[Backtest Page]
        STRAT[Strategies]
        BOTS[Bots]
        DATA[Data Explorer]
        RESULTS[Results & Timeline]
    end

    UI --> HOME
    UI --> STRAT
    UI --> BOTS
    UI --> DATA
    UI --> RESULTS
    CHARTS --> RESULTS
    AUTH --> API_CLIENT
    API_CLIENT -->|HTTPS| BACKEND[Backend API]
```

### Admin Dashboard

```mermaid
graph TB
    LOGIN[Admin Login<br/>Role Validation]
    DASH[Dashboard<br/>Ingestion Controls]
    SSE[SSE Stream<br/>Real-time Events]
    
    LOGIN -->|Authenticated| DASH
    DASH -->|Subscribe| SSE
    DASH -->|Trigger Ingestion| API[Backend API]
    SSE -->|Event Stream| DASH
```

### Backend API

```mermaid
graph TB
    subgraph "Backend Worker"
        ROUTER[Hono Router]
        AUTH_MW[Auth Middleware]
        ADMIN_MW[Admin Middleware]
        
        subgraph "Route Handlers"
            HEALTH[Health Check]
            AUTH_ROUTES[Auth Routes]
            BACKTEST[Backtest API]
            MARKET[Market Data API]
            ADMIN_ROUTES[Admin API]
        end

        subgraph "Services Layer"
            BACKTEST_SVC[Backtest Service]
            INGESTION_SVC[Ingestion Service]
            MARKET_SVC[Market Data Service]
        end

        subgraph "Repository Layer"
            DB_REPO[DB Repository]
            CH_REPO[ClickHouse Repository]
        end
    end

    ROUTER --> AUTH_MW
    AUTH_MW --> HEALTH
    AUTH_MW --> AUTH_ROUTES
    AUTH_MW --> BACKTEST
    AUTH_MW --> MARKET
    AUTH_MW --> ADMIN_MW
    ADMIN_MW --> ADMIN_ROUTES

    BACKTEST --> BACKTEST_SVC
    ADMIN_ROUTES --> INGESTION_SVC
    MARKET --> MARKET_SVC

    BACKTEST_SVC --> DB_REPO
    INGESTION_SVC --> CH_REPO
    MARKET_SVC --> CH_REPO
```

## Data Architecture

### Database Schema

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ ACCOUNT : has
    USER ||--o{ BACKTEST : creates
    BACKTEST ||--o{ TRADE : generates
    
    USER {
        string id PK
        string email
        string name
        string role
        timestamp createdAt
    }
    
    SESSION {
        string id PK
        string userId FK
        timestamp expiresAt
    }
    
    BACKTEST {
        string id PK
        string userId FK
        string strategy
        jsonb parameters
        timestamp startDate
        timestamp endDate
        string workflowInstanceId
        string status
        jsonb result
    }
    
    TRADE {
        string id PK
        string backtestId FK
        string symbol
        string side
        decimal entryPrice
        decimal exitPrice
        decimal quantity
        decimal pnl
        timestamp entryTime
        timestamp exitTime
    }
```

### ClickHouse Schema

```sql
-- OHLCV Data Table
CREATE TABLE market_data.ohlcv (
    symbol String,
    timeframe String,
    timestamp DateTime64(3),
    open Float64,
    high Float64,
    low Float64,
    close Float64,
    volume Float64,
    asset_type String,
    source String,
    ingested_at DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (symbol, timeframe, timestamp);
```

### Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Workflow
    participant ClickHouse
    participant External

    User->>Frontend: Create Backtest
    Frontend->>API: POST /api/backtest
    API->>Workflow: Trigger Backtest Workflow
    Workflow->>ClickHouse: Query OHLCV Data
    ClickHouse-->>Workflow: Historical Data
    Workflow->>Workflow: Execute Strategy
    Workflow->>API: Update Status & Results
    API->>Frontend: Backtest Complete
    Frontend-->>User: Display Results
```

## Authentication & Authorization

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Auth
    participant Database

    User->>Frontend: Login (email/password)
    Frontend->>API: POST /api/auth/sign-in
    API->>Auth: Validate Credentials
    Auth->>Database: Query User
    Database-->>Auth: User Record (with role)
    Auth->>Auth: Hash & Verify Password
    Auth->>Database: Create Session
    Auth-->>API: Session Token + User Data
    API-->>Frontend: Set Cookie + User Info
    Frontend-->>User: Redirect to Dashboard

    Note over Frontend,API: Subsequent Requests
    Frontend->>API: API Request + Session Cookie
    API->>Auth: Validate Session
    Auth->>Database: Verify Session
    Database-->>Auth: Session Valid
    Auth-->>API: User Context (with role)
    API->>API: Check Authorization
    API-->>Frontend: API Response
```

### Role-Based Access Control

| Role | Frontend Access | Admin Access | API Permissions |
|------|----------------|--------------|-----------------|
| `user` | ✅ Full | ❌ Denied | Read backtests, create backtests, query market data |
| `admin` | ✅ Full | ✅ Full | All user permissions + trigger ingestion, view system status, manage users |

## Ingestion Pipeline

### Architecture

```mermaid
graph TB
    subgraph "Ingestion Triggers"
        ADMIN_TRIGGER[Admin Dashboard]
        CRON[Cron Trigger]
        API_TRIGGER[API Request]
    end

    subgraph "Workflow Orchestration"
        BULK[Bulk Historical<br/>Ingestion Workflow]
        INCREMENTAL[Incremental Sync<br/>Workflow]
        SYMBOL[Symbol Backfill<br/>Workflow]
    end

    subgraph "Data Sources"
        CCXT[CCXT Library<br/>Crypto Exchanges]
        YF[YFinance<br/>Stock Market]
    end

    subgraph "Processing"
        VALIDATE[Data Validation]
        TRANSFORM[Transform to OHLCV]
        BATCH[Batch Processing]
    end

    subgraph "Storage"
        CH[(ClickHouse<br/>OHLCV Table)]
        META[(PostgreSQL<br/>Ingestion Metadata)]
    end

    ADMIN_TRIGGER --> BULK
    ADMIN_TRIGGER --> INCREMENTAL
    ADMIN_TRIGGER --> SYMBOL
    CRON --> INCREMENTAL
    API_TRIGGER --> SYMBOL

    BULK --> CCXT
    BULK --> YF
    INCREMENTAL --> CCXT
    INCREMENTAL --> YF
    SYMBOL --> CCXT
    SYMBOL --> YF

    CCXT --> VALIDATE
    YF --> VALIDATE
    VALIDATE --> TRANSFORM
    TRANSFORM --> BATCH
    BATCH --> CH
    BATCH --> META
```

### Workflow Details

#### Bulk Historical Ingestion

Fetches complete historical data for multiple symbols:

1. **Input**: Asset type, timeframe, symbol list (optional)
2. **Process**: 
   - Fetch symbols for asset type
   - For each symbol: fetch all available historical data
   - Batch insert into ClickHouse
   - Update metadata with ingestion status
3. **Output**: Total rows ingested, success/failure per symbol

#### Incremental Sync

Keeps data up-to-date with latest market activity:

1. **Input**: Asset type, timeframe, symbol list (optional)
2. **Process**:
   - Query last ingested timestamp per symbol
   - Fetch new data from last timestamp to now
   - Insert only new records
   - Update metadata
3. **Scheduling**: Runs every 1 hour (configurable)

#### Symbol Backfill

Fills missing data for a specific symbol:

1. **Input**: Symbol, asset type, timeframe, start date (optional)
2. **Process**:
   - Identify gaps in existing data
   - Fetch missing data ranges
   - Insert missing records
3. **Use Case**: Fix data gaps, onboard new symbols

### Real-Time Monitoring

```mermaid
sequenceDiagram
    participant Admin
    participant Dashboard
    participant API
    participant Workflow

    Admin->>Dashboard: Open Dashboard
    Dashboard->>API: GET /api/admin/ingestion/events
    Note over Dashboard,API: SSE Connection Established

    Workflow->>API: Emit "ingestion.started"
    API-->>Dashboard: Event: ingestion.started
    Dashboard-->>Admin: Show "Ingestion Started"

    Workflow->>API: Emit "symbol.processing"
    API-->>Dashboard: Event: symbol.processing
    Dashboard-->>Admin: Update Progress (10/100)

    Workflow->>API: Emit "symbol.completed"
    API-->>Dashboard: Event: symbol.completed
    Dashboard-->>Admin: Update Progress (11/100)

    Workflow->>API: Emit "ingestion.completed"
    API-->>Dashboard: Event: ingestion.completed
    Dashboard-->>Admin: Show "Completed: 10,000 rows"
```

## Backtest Execution

### Workflow Process

```mermaid
graph TB
    START[Backtest Request] --> VALIDATE[Validate Parameters]
    VALIDATE --> CREATE_WF[Create Workflow Instance]
    CREATE_WF --> FETCH[Fetch Historical Data<br/>from ClickHouse]
    FETCH --> INIT[Initialize Strategy]
    INIT --> LOOP{More Candles?}
    LOOP -->|Yes| PROCESS[Process Candle]
    PROCESS --> CHECK{Signal Generated?}
    CHECK -->|Buy| EXECUTE_BUY[Execute Buy]
    CHECK -->|Sell| EXECUTE_SELL[Execute Sell]
    CHECK -->|No Signal| LOOP
    EXECUTE_BUY --> UPDATE_POS[Update Position]
    EXECUTE_SELL --> UPDATE_POS
    UPDATE_POS --> RECORD[Record Trade]
    RECORD --> LOOP
    LOOP -->|No| CALC[Calculate Metrics]
    CALC --> SAVE[Save Results to DB]
    SAVE --> COMPLETE[Backtest Complete]
```

### Strategy Interface

Strategies no longer need to be coupled to the platform runtime. The platform evaluates a language-agnostic Strategy Protocol and dispatches to one of three runtimes:

- `native`: in-process TypeScript strategy execution
- `remote`: HTTP call to an external strategy service
- `wasm`: reserved for future high-performance strategy execution

See [docs/STRATEGY_PROTOCOL.md](docs/STRATEGY_PROTOCOL.md) for the full request and response contract.

## Strategy Protocol

```mermaid
graph LR
        C[Candle + History] --> R[Strategy Runner]
        P[Portfolio State] --> R
        M[Strategy Metadata] --> R
        R --> N[Native TypeScript]
        R --> H[Remote HTTP]
        R --> W[WASM Future Tier]
        N --> S[Normalized Signal]
        H --> S
        W --> S
```

The Strategy Runner normalizes every runtime behind the same protocol:

- Input: candle, bounded history window, portfolio snapshot, parameters, execution context
- Output: `BUY`, `SELL`, or `HOLD` plus optional `size`, `reason`, and diagnostic metadata

This keeps execution, P&L, storage, and charting inside the platform while making strategy implementations portable across languages.

### Supported Strategies

- **Dual Moving Average**: Crossover-based trend following
- **RSI Divergence**: Momentum reversal detection
- **Bollinger Bands**: Volatility breakout/mean reversion
- **Ichimoku Cloud**: Multi-indicator trend system
- **Price Action**: Chart pattern recognition
- **Grid Trading**: Range-bound profit taking
- **Scalping**: High-frequency small profit targeting
- **Mean Reversion**: Statistical arbitrage
- **Momentum**: Trend continuation
- **Breakout**: Support/resistance breaks

## Infrastructure & Deployment

### Cloudflare Architecture

```mermaid
graph TB
    subgraph "Cloudflare Edge"
        subgraph "Workers"
            API[Backend Worker<br/>quantago-api]
            WF_ENGINE[Workflows Engine]
            LANDING[Landing Worker<br/>quantago-web]
        end
        
        subgraph "Pages"
            FRONTEND[Frontend Pages<br/>quantago-app]
            ADMIN_PAGES[Admin Pages<br/>quantago-admin]
        end
        
        subgraph "Bindings"
            WF_BACKTEST[Backtest Workflow]
            WF_BULK[Bulk Ingestion Workflow]
            WF_SYNC[Incremental Sync Workflow]
            WF_BACKFILL[Symbol Backfill Workflow]
        end
    end

    subgraph "External Services"
        NEON[(Neon PostgreSQL)]
        CLICKHOUSE[(ClickHouse Cloud)]
    end

    FRONTEND -->|HTTPS| API
    ADMIN_PAGES -->|HTTPS| API
    LANDING -->|HTTPS| FRONTEND
    API --> WF_BACKTEST
    API --> WF_BULK
    API --> WF_SYNC
    API --> WF_BACKFILL
    API --> NEON
    API --> CLICKHOUSE
    WF_ENGINE --> NEON
    WF_ENGINE --> CLICKHOUSE
```

### Deployment Pipeline

```mermaid
graph LR
    subgraph "GitHub Actions"
        TRIGGER[Push to main]
        TEST[Run Tests]
        BUILD[Build Services]
        DEPLOY_BE[Deploy Backend]
        DEPLOY_FE[Deploy Frontend]
        DEPLOY_ADMIN[Deploy Admin]
        DEPLOY_WEB[Deploy Landing]
    end

    subgraph "Cloudflare"
        WORKER[Worker Deployed]
        PAGES_FE[Frontend Live]
        PAGES_ADMIN[Admin Live]
        WEB[Landing Live]
    end

    TRIGGER --> TEST
    TEST --> BUILD
    BUILD --> DEPLOY_BE
    BUILD --> DEPLOY_FE
    BUILD --> DEPLOY_ADMIN
    BUILD --> DEPLOY_WEB
    DEPLOY_BE --> WORKER
    DEPLOY_FE --> PAGES_FE
    DEPLOY_ADMIN --> PAGES_ADMIN
    DEPLOY_WEB --> WEB
```

### Infrastructure as Code

The platform uses Pulumi for infrastructure management:

```typescript
// Backend Worker with Workflow bindings
const backendWorker = new cloudflare.WorkerScript("quantago-api", {
  content: workerCode,
    name: "quantago-api",
  compatibilityDate: "2024-01-01",
  workflows: [
    { name: "backtest-workflow", binding: "BACKTEST_WORKFLOW" },
    { name: "bulk-ingestion-workflow", binding: "BULK_HISTORICAL_INGESTION_WORKFLOW" },
    { name: "incremental-sync-workflow", binding: "INCREMENTAL_SYNC_WORKFLOW" },
    { name: "symbol-backfill-workflow", binding: "SYMBOL_BACKFILL_WORKFLOW" },
  ],
});

// Frontend Pages Project
const frontendPages = new cloudflare.PagesProject("quantago-app", {
  accountId: cloudflareAccountId,
    name: "quantago-app",
  productionBranch: "main",
});

// Admin Pages Project
const adminPages = new cloudflare.PagesProject("quantago-admin", {
  accountId: cloudflareAccountId,
    name: "quantago-admin",
  productionBranch: "main",
});
```

### Scaling Characteristics

| Component | Scaling Strategy | Limits |
|-----------|-----------------|--------|
| **Workers** | Auto-scale across global edge network | 50ms CPU time per request |
| **Workflows** | Durable execution with automatic retry | 30 days max duration |
| **ClickHouse** | Vertical scaling + sharding | Based on plan |
| **PostgreSQL** | Auto-scaling compute + storage | Based on plan |
| **Pages** | Global CDN with edge caching | Unlimited requests |

### Performance Characteristics

- **API Response Time**: < 50ms (p50), < 200ms (p99)
- **Workflow Execution**: 1-5 minutes per backtest (depends on data volume)
- **Data Ingestion**: 1,000-10,000 OHLCV rows/second
- **ClickHouse Queries**: < 100ms for 1M rows
- **Global Latency**: < 50ms from 95% of internet users

## Security

### Authentication

- **Method**: Session-based authentication with better-auth
- **Session Storage**: PostgreSQL with encrypted cookies
- **Password Hashing**: bcrypt with salt
- **Session Duration**: 7 days (configurable)

### Authorization

- **Role System**: User vs Admin roles
- **Middleware**: Route-level authorization checks
- **Admin Endpoints**: Protected by `requireAdmin` middleware

### Data Security

- **TLS**: All traffic encrypted with HTTPS
- **Database**: Encrypted connections (SSL/TLS)
- **Secrets**: Managed via Cloudflare Workers Secrets
- **Environment Variables**: Never committed to version control

### CORS Configuration

```typescript
app.use('*', cors({
    origin: ['https://app.quantago.co', 'https://admin.quantago.co'],
  credentials: true,
}));
```

## Monitoring & Observability

### Logging

- **Workers Logs**: `wrangler tail` for real-time logs
- **Workflow Logs**: Captured in workflow execution history
- **Error Tracking**: Console errors logged to Workers analytics

### Metrics

- **Worker Metrics**: Request count, duration, error rate
- **Workflow Metrics**: Success rate, execution time, retry count
- **Database Metrics**: Query performance, connection pool

### Health Checks

```http
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-10T12:00:00Z",
  "services": {
    "database": "ok",
    "clickhouse": "ok",
    "workflows": "ok"
  }
}
```

## Development Workflow

### Local Development

1. **Start Backend**: `cd services/backend && pnpm dev`
2. **Start Frontend**: `cd services/frontend && pnpm dev`
3. **Start Admin**: `cd services/admin && pnpm dev`

### Code Quality

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with recommended rules
- **Type Checking**: Pre-commit type checks
- **Testing**: Unit tests for critical functions

### Coding Standards

See:
- [Backend Standards](standards/backend-standards.md)
- [Component Standards](standards/component-standards.md)
- [Zustand Standards](standards/zustand-standards.md)

## Future Enhancements

### Planned Features

- [ ] WebSocket support for real-time backtest updates
- [ ] Multi-asset portfolio backtesting
- [ ] Paper trading mode with live data
- [ ] Strategy optimization with genetic algorithms
- [ ] Custom indicator builder
- [ ] Backtest comparison and analysis tools
- [ ] Export to multiple formats (CSV, Excel, JSON)
- [ ] Advanced charting with custom indicators
- [ ] Risk management tools (position sizing, stop loss)
- [ ] Performance attribution analysis

### Technical Debt

- [ ] Add comprehensive unit test coverage
- [ ] Implement integration tests for workflows
- [ ] Add E2E tests with Playwright
- [ ] Set up proper CI/CD for infrastructure changes
- [ ] Add database migration versioning
- [ ] Implement blue-green deployment strategy

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows/)
- [Hono Framework](https://hono.dev/)
- [Better Auth](https://www.better-auth.com/)
- [ClickHouse Documentation](https://clickhouse.com/docs)
- [CCXT Documentation](https://docs.ccxt.com/)
