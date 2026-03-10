<div align="center">

# 📈 Quantago

**A serverless, cloud-native backtesting platform for algorithmic trading strategies**

Built on Cloudflare's edge infrastructure for lightning-fast execution and global scalability across Quantago's web, app, admin, and API surfaces.

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 What is Quantago?

Quantago is a modern, open-source backtesting engine designed to help traders and quantitative analysts test algorithmic trading strategies against historical market data. Built with performance and scalability in mind, it leverages Cloudflare Workers for edge computing and ClickHouse for time-series data storage.

Whether you're a quantitative trader developing sophisticated strategies or a developer building trading infrastructure, Quantago provides the tools you need to validate your ideas before risking real capital.

## ✨ Features

### 🚀 **High-Performance Backtesting**
- Execute backtests in seconds using Cloudflare Workers' edge network
- Process millions of data points with ClickHouse's columnar storage
- Durable workflow execution with automatic retry and fault tolerance

### 📊 **Rich Market Data**
- Support for **Forex**, **Crypto**, and **Stock** markets
- Multiple timeframes: 1-minute, 1-hour, 1-day
- Automated data ingestion from CCXT (crypto) and YFinance (stocks)
- Real-time incremental sync to keep data up-to-date

### 🎨 **Interactive Charting**
- Professional candlestick charts with volume indicators
- Interactive trade visualization on timeline
- Multiple chart libraries supported (SciChart, AnyChart)
- Zoom, pan, and analyze backtest results visually

### 🧠 **Built-in Trading Strategies**
- **Trend Following**: Dual Moving Average, Ichimoku Cloud
- **Mean Reversion**: Bollinger Bands, Grid Trading
- **Momentum**: RSI Divergence, Breakout Strategy
- **Scalping**: High-frequency profit targeting
- **Custom Strategies**: Native TypeScript, remote HTTP, and WASM strategy runtimes

### 🛠 **Strategy Platform**
- Root-level strategy registry with versioned manifests and executable strategy modules
- Schema-driven strategy parameters for consistent UI and API validation
- Python SDK and CLI for shipping strategies without rewriting the platform
- Persisted strategy definitions and version history in Postgres with optional R2 artifacts

### 🔐 **Enterprise-Grade Security**
- Role-based access control (User/Admin)
- Session-based authentication with better-auth
- Secure secret management via Cloudflare Workers
- TLS encryption for all data in transit

### ⚡ **Admin Dashboard**
- Real-time ingestion monitoring with Server-Sent Events (SSE)
- Manual data ingestion triggers
- System health monitoring
- Admin-only role enforcement

### 🌍 **Global Edge Deployment**
- Deploy to 300+ cities worldwide via Cloudflare
- Sub-50ms API response times globally
- Automatic scaling with zero configuration
- Infrastructure as Code with Pulumi

## 🎁 Benefits

| Benefit | Description |
|---------|-------------|
| **💰 No Infrastructure Costs** | Generous free tier on Cloudflare, Neon, and ClickHouse |
| **📈 Test Before You Invest** | Validate strategies with historical data before risking capital |
| **⚡ Fast Iteration** | Develop and test strategies in seconds, not hours |
| **🧩 Bring Your Own Runtime** | Run strategies as native TypeScript, deploy them over HTTP from Python, or package them as WASM |
| **🐍 Python-Friendly** | Build and serve strategies with the included Python SDK and CLI instead of porting logic into the backend |
| **🔧 Fully Customizable** | Open source, extensible architecture with manifest-driven strategies and a persisted registry |
| **🌐 Production-Ready** | Built for scale with enterprise-grade infrastructure |
| **📊 Data-Driven Decisions** | Comprehensive metrics and visualizations for strategy analysis |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **PostgreSQL** database (we recommend [Neon](https://neon.tech))
- **ClickHouse** instance (cloud or self-hosted)
- **Cloudflare account** (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/adamhalasz/backtest.git
   cd backtest
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create `services/backend/.dev.vars`:
   ```bash
   DATABASE_URL=postgresql://user:pass@host/db
   BETTER_AUTH_SECRET=your-secret-key-here
   CLICKHOUSE_URL=https://your-clickhouse-instance
   CLICKHOUSE_USERNAME=default
   CLICKHOUSE_PASSWORD=your-password
   ```

4. **Run database migrations**
   ```bash
   cd services/backend
   psql $DATABASE_URL -f src/db/migrations/0001_init.sql
   psql $DATABASE_URL -f src/db/migrations/0002_better_auth.sql
   psql $DATABASE_URL -f src/db/migrations/0003_backtest_workflows.sql
   psql $DATABASE_URL -f src/db/migrations/0004_ingestion_metadata.sql
   psql $DATABASE_URL -f src/db/migrations/0005_add_user_roles.sql
   psql $DATABASE_URL -f src/db/migrations/0006_strategy_registry.sql
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd services/backend
   pnpm dev  # http://localhost:8788

   # Terminal 2 - Frontend
   cd services/frontend
   pnpm dev  # http://localhost:5173

   # Terminal 3 - Admin (optional)
   cd services/admin
   pnpm dev  # http://localhost:5174

   # Terminal 4 - Landing (optional)
   cd services/landing
   pnpm dev  # http://localhost:8786
   ```

6. **Create your first admin user**
   ```sql
   UPDATE "user" SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

7. **Start backtesting!** 🎉
   - Open http://localhost:5173
   - Sign up for an account
   - Navigate to the Backtest page
   - Configure your strategy and run your first backtest


### Verify Installation

```bash
# Type check all services
pnpm typecheck

# Lint all services
pnpm lint

# Build for production
pnpm build
```

## 🏗 Architecture

Quantago is built as a serverless, edge-first application:

```
┌─────────────────────────────────────────────────┐
│           Cloudflare Edge Network               │
├─────────────────────────────────────────────────┤
│  Frontend (Pages)  │  Admin (Pages)  │  API     │
│  React + Vite      │  React + Vite   │  Workers │
│  Landing (SSR)     │                 │          │
└──────────┬─────────┴─────────┬───────┴────┬─────┘
           │                   │            │
           └───────────────────┴────────────┤
                                            │
           ┌────────────────────────────────┤
           │                                │
    ┌──────▼──────┐              ┌─────────▼────────┐
    │  PostgreSQL │              │   ClickHouse     │
    │    (Neon)   │              │  (Time-Series)   │
    │             │              │                  │
    │ • Users     │              │ • OHLCV Data     │
    │ • Sessions  │              │ • Market Data    │
    │ • Backtests │              │                  │
    └─────────────┘              └──────────────────┘
```

### Key Components

- **Frontend**: React SPA with shadcn/ui components and professional charting
- **Backend**: Cloudflare Workers API with Hono framework
- **Workflows**: Durable execution engine for long-running backtests and data ingestion
- **Admin Dashboard**: Real-time monitoring and data management interface
- **PostgreSQL**: Metadata, user accounts, and backtest configuration
- **ClickHouse**: High-performance time-series storage for OHLCV data

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The published documentation site is available at https://docs.quantago.co.

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Live Docs](https://docs.quantago.co) | Published Docusaurus site for docs.quantago.co |
| [Architecture](docs/ARCHITECTURE.md) | Comprehensive architecture overview with diagrams |
| [Strategy Protocol](docs/STRATEGY_PROTOCOL.md) | Runtime-agnostic strategy contract for native, remote, and future WASM strategies |
| [Deployment Guide](docs/DEPLOYMENT.md) | Step-by-step production deployment |
| [Quick Start](docs/QUICKSTART.md) | Fast-track deployment guide |
| [Secrets Reference](docs/SECRETS.md) | GitHub Actions secrets configuration |
| [Backend Standards](docs/standards/backend-standards.md) | Backend coding conventions |
| [Component Standards](docs/standards/component-standards.md) | Frontend component patterns |
| [Zustand Standards](docs/standards/zustand-standards.md) | State management patterns |

## SDKs

- [Python SDK](sdks/python/README.md): local strategy server and CLI for remote Python strategies

## Strategies

- Built-in strategies live in `strategies/<strategy-name>/` with a `manifest.json` and `index.ts`
- The backend strategy catalog loads built-ins from this root directory, then merges persisted remote and WASM definitions from the registry

## 🗂 Project Structure

```
backtest/
├── services/
│   ├── backend/          # Cloudflare Workers API
│   ├── frontend/         # React frontend application
│   ├── admin/            # Admin dashboard
│   └── landing/          # SSR landing site for quantago.co
├── infra/                # Pulumi infrastructure code
├── shared/               # Shared types and utilities
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## 🔧 Development

### Running Tests

```bash
# Run all tests
pnpm test

# Test individual services
cd services/backend && pnpm test
cd services/frontend && pnpm test
```

### Code Quality

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

### Building for Production

```bash
# Build all services
pnpm build

# Build individual services
cd services/backend && pnpm build
cd services/frontend && pnpm build
cd services/admin && pnpm build
```

## 🚀 Deployment

Deploy to Cloudflare with one command:

```bash
pnpm run deploy:all
```

This executes optimized deployment scripts (`scripts/deploy-*.sh`) that:
- Build each service independently
- Deploy from the workspace root to avoid PATH issues
- Provide clear progress feedback

Individual service deployment:

```bash
pnpm run deploy:backend    # Backend Worker
pnpm run deploy:frontend   # Frontend Pages
pnpm run deploy:admin      # Admin Pages
```

Or use GitHub Actions for automated deployments on every push to `main`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `pnpm test`
5. **Type check**: `pnpm typecheck`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines

- Follow the coding standards in [docs/standards/](docs/standards/)
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all checks pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with amazing open-source technologies:

- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/) - Durable execution engine
- [Hono](https://hono.dev/) - Ultrafast web framework
- [React](https://react.dev/) - UI library
- [ClickHouse](https://clickhouse.com/) - Fast columnar database
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Better Auth](https://www.better-auth.com/) - Authentication library
- [CCXT](https://github.com/ccxt/ccxt) - Cryptocurrency exchange API
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Vite](https://vitejs.dev/) - Next-generation frontend tooling

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/backtest/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/backtest/discussions)
- **Documentation**: [docs/](docs/)
- **Published Docs**: https://docs.quantago.co

---

<div align="center">

**[⬆ Back to Top](#-backtest-platform)**

Made with ❤️ by Adam Halasz

</div>