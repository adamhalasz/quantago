# Contributing to Quantago

First off, thank you for considering contributing to Quantago! It's people like you that make this project better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by respect, professionalism, and collaboration. By participating, you are expected to uphold these values.

### Our Standards

- **Be respectful** - Treat everyone with respect and kindness
- **Be constructive** - Provide helpful feedback and criticism
- **Be collaborative** - Work together to solve problems
- **Be patient** - Remember that everyone has different skill levels
- **Be inclusive** - Welcome newcomers and help them get started

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title** - Summarize the issue in one line
- **Description** - Detailed explanation of the problem
- **Steps to reproduce** - Exact steps to trigger the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, Node version, browser, etc.
- **Screenshots** - If applicable
- **Error logs** - Console output or stack traces

**Example:**

```markdown
## Bug: Backtest fails with empty ClickHouse response

### Description
When running a backtest for BTC-USD with 1-hour timeframe, the workflow fails with "No data found" even though data exists in ClickHouse.

### Steps to Reproduce
1. Log in to the frontend
2. Navigate to Backtest page
3. Select strategy: "Dual Moving Average"
4. Select symbol: "BTC-USD"
5. Select timeframe: "1h"
6. Click "Run Backtest"

### Expected Behavior
Backtest should execute and return results

### Actual Behavior
Workflow fails with error: "No data found for symbol BTC-USD"

### Environment
- OS: macOS 14.0
- Node: 20.10.0
- Browser: Chrome 120

### Error Logs
```
[ERROR] ClickHouse query returned 0 rows
```
```

### Suggesting Features

We love feature suggestions! Before suggesting a feature:

1. **Check existing issues** - Someone might have already suggested it
2. **Consider the scope** - Should it be in core or a plugin?
3. **Explain the use case** - Why is this feature needed?
4. **Describe the solution** - How should it work?

**Template:**

```markdown
## Feature Request: Multi-asset portfolio backtesting

### Problem Statement
Currently, backtests can only test one asset at a time. Traders often need to test strategies across multiple assets simultaneously to evaluate portfolio performance.

### Proposed Solution
Add support for multi-asset backtesting where users can:
1. Select multiple symbols
2. Configure position sizing per asset
3. View aggregated portfolio metrics
4. See individual asset performance

### Alternatives Considered
- Running multiple backtests separately (current workaround, but tedious)
- Using strategy parameters to switch between assets (not true portfolio testing)

### Additional Context
This is common in professional trading systems and would help validate diversification strategies.
```

### Contributing Code

1. **Find an issue** - Look for issues labeled `good first issue` or `help wanted`
2. **Comment on the issue** - Let others know you're working on it
3. **Fork and create a branch** - Create a feature branch from `main`
4. **Make your changes** - Follow our coding standards
5. **Write tests** - Add tests for new functionality
6. **Update documentation** - Keep docs in sync with code
7. **Submit a pull request** - Follow our PR template

### Contributing Documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or unclear wording
- Adding examples and tutorials
- Improving API documentation
- Translating documentation
- Adding diagrams and visuals

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL (recommend Neon for development)
- ClickHouse (local or cloud instance)
- Git
- Code editor (VS Code recommended)

### Setup Steps

1. **Fork and clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/backtest.git
   cd backtest
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env file
   cp services/backend/.dev.vars.example services/backend/.dev.vars
   
   # Edit with your credentials
   vim services/backend/.dev.vars
   ```

4. **Run migrations**
   ```bash
   cd services/backend
   psql $DATABASE_URL -f src/db/migrations/0001_init.sql
   psql $DATABASE_URL -f src/db/migrations/0002_better_auth.sql
   psql $DATABASE_URL -f src/db/migrations/0003_backtest_workflows.sql
   psql $DATABASE_URL -f src/db/migrations/0004_ingestion_metadata.sql
   psql $DATABASE_URL -f src/db/migrations/0005_add_user_roles.sql
   cd ../..
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd services/backend && pnpm dev
   
   # Terminal 2 - Frontend
   cd services/frontend && pnpm dev
   
   # Terminal 3 - Admin (optional)
   cd services/admin && pnpm dev
   ```

### Verify Setup

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Test
pnpm test
```

## Pull Request Process

### Before Submitting

- [ ] Code follows our coding standards
- [ ] All tests pass (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Documentation is updated
- [ ] Commit messages follow our convention
- [ ] Branch is up to date with `main`

### PR Template

When you create a PR, use this template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issue
Closes #123

## Changes Made
- Added X feature to Y component
- Fixed Z bug in A service
- Updated B documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] All tests pass locally

## Screenshots (if applicable)
Before: [screenshot]
After: [screenshot]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added for new features
- [ ] All tests passing
```

### Review Process

1. **Automated checks** - GitHub Actions will run tests and type checking
2. **Code review** - Maintainers will review your code
3. **Feedback** - Address any requested changes
4. **Approval** - Once approved, your PR will be merged

### After Merge

- Your changes will be included in the next release
- You'll be added to the contributors list
- Thank you for contributing! 🎉

## Coding Standards

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

async function getUserById(id: string): Promise<User | null> {
  // Implementation
}

// ❌ Bad
function getUser(id: any): any {
  // Implementation
}
```

### React Components

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
}

// ❌ Bad
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Backend Routes

See [docs/standards/backend-standards.md](docs/standards/backend-standards.md) for comprehensive backend conventions.

### State Management

See [docs/standards/zustand-standards.md](docs/standards/zustand-standards.md) for Zustand patterns.

### UI Components

See [docs/standards/component-standards.md](docs/standards/component-standards.md) for component guidelines.

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
# Feature
git commit -m "feat(backtest): add multi-asset portfolio support"

# Bug fix
git commit -m "fix(auth): resolve session expiration issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: change backtest response format

BREAKING CHANGE: backtest API now returns results in a different format"
```

### Scope

Common scopes:
- `backend` - Backend API changes
- `frontend` - Frontend app changes
- `admin` - Admin dashboard changes
- `infra` - Infrastructure changes
- `auth` - Authentication changes
- `backtest` - Backtesting engine changes
- `ingestion` - Data ingestion changes
- `docs` - Documentation changes

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Specific service
cd services/backend && pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { calculatePnL } from './backtest';

describe('calculatePnL', () => {
  it('should calculate profit for long position', () => {
    const result = calculatePnL({
      side: 'buy',
      entryPrice: 100,
      exitPrice: 110,
      quantity: 10,
    });
    
    expect(result).toBe(100); // (110 - 100) * 10
  });

  it('should calculate loss for long position', () => {
    const result = calculatePnL({
      side: 'buy',
      entryPrice: 100,
      exitPrice: 90,
      quantity: 10,
    });
    
    expect(result).toBe(-100); // (90 - 100) * 10
  });
});
```

### Test Coverage

We aim for:
- **80%+ coverage** for utility functions
- **60%+ coverage** for services
- **100% coverage** for critical financial calculations

## Documentation

### Code Comments

```typescript
/**
 * Calculate profit and loss for a trade
 * 
 * @param trade - Trade details including entry/exit prices
 * @returns PnL in quote currency
 * 
 * @example
 * ```typescript
 * const pnl = calculatePnL({
 *   side: 'buy',
 *   entryPrice: 100,
 *   exitPrice: 110,
 *   quantity: 10
 * });
 * console.log(pnl); // 100
 * ```
 */
export function calculatePnL(trade: Trade): number {
  // Implementation
}
```

### README Updates

When adding new features, update relevant READMEs:
- `/README.md` - Main project README
- `/docs/ARCHITECTURE.md` - Architecture documentation
- `/services/*/README.md` - Service-specific READMEs

### Adding Examples

Examples help users understand how to use features:

```typescript
// examples/dual-moving-average.ts
import { Strategy } from '../src/strategies/Strategy';

/**
 * Example: Dual Moving Average Strategy
 * 
 * This strategy generates buy signals when the fast MA crosses above
 * the slow MA, and sell signals when the fast MA crosses below.
 */
export class DualMAExample extends Strategy {
  // Implementation with detailed comments
}
```

## Questions?

If you have questions about contributing:

- **GitHub Discussions** - Ask general questions
- **GitHub Issues** - Report bugs or request features
- **Documentation** - Check the [docs/](docs/) folder

---

Thank you for contributing to Quantago! 🚀
