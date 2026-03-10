type LandingStep = {
  step: string;
  title: string;
  description: string;
  bullets: string[];
  exampleTitle: string;
  exampleEyebrow: string;
  exampleLines: string[];
};

const githubUrl = 'https://github.com/adamhalasz/backtest';
const appUrl = 'https://app.quantago.co';
const apiUrl = 'https://api.quantago.co';
const adminUrl = 'https://admin.quantago.co';

const steps: LandingStep[] = [
  {
    step: '01',
    title: 'Define your strategy once',
    description: 'Start with a built-in strategy or publish your own versioned manifest. Native TypeScript, Python over HTTP, and WASM all fit the same execution contract.',
    bullets: [
      'Manifest-driven strategy metadata',
      'Versioned runtime configuration',
      'Shared parameter schema for UI and API validation',
    ],
    exampleTitle: 'Strategy Catalog',
    exampleEyebrow: 'Registry preview',
    exampleLines: [
      'Momentum Strategy      native/typescript     v1.0.0',
      'Mean Reversion Alpha   remote/python         v0.3.4',
      'Rust Breakout Core     wasm/rust             v0.9.1',
    ],
  },
  {
    step: '02',
    title: 'Run backtests with real execution context',
    description: 'Quantago sends each strategy a candle, bounded history, portfolio state, and execution metadata so the signal logic stays portable while the platform owns orchestration and risk.',
    bullets: [
      'Unified protocol across runtimes',
      'Preflight validation before full runs',
      'Consistent position sizing and execution rules',
    ],
    exampleTitle: 'Execution Payload',
    exampleEyebrow: 'Protocol snapshot',
    exampleLines: [
      'candle.close: 104.20',
      'history: 60 candles',
      'portfolio.cash: 10000',
      'context.strategy.runtime: remote',
    ],
  },
  {
    step: '03',
    title: 'Analyze outcomes and iterate fast',
    description: 'Inspect trade history, runtime metadata, and performance characteristics in the app, then publish the next version without rewriting the rest of the system.',
    bullets: [
      'Detailed signal reasons and metadata',
      'App and admin surfaces for monitoring',
      'Fast publish loop from research to production',
    ],
    exampleTitle: 'Backtest Review',
    exampleEyebrow: 'Result summary',
    exampleLines: [
      'Net return          +18.4%',
      'Max drawdown        -4.8%',
      'Win rate            61.2%',
      'Top signal reason   Fast EMA crossed above slow EMA',
    ],
  },
];

const benefits = [
  'Bring your own runtime without changing the platform architecture.',
  'Ship versioned strategies with reproducible parameters and artifacts.',
  'Keep data ingestion, execution, auth, and charting in one system.',
  'Move from research to production with the same protocol boundary.',
];

const features = [
  {
    title: 'Multi-runtime strategies',
    description: 'Native TypeScript, remote HTTP, and WASM execution share one contract.',
  },
  {
    title: 'Versioned registry',
    description: 'Store definitions in Postgres with optional binary artifacts in R2.',
  },
  {
    title: 'Cloudflare-native execution',
    description: 'Workers, Pages, and edge routing keep latency low and operations simple.',
  },
  {
    title: 'Python SDK included',
    description: 'Serve strategies locally or remotely without porting your research code.',
  },
  {
    title: 'Admin operations surface',
    description: 'Monitor ingestion, inspect strategy versions, and manage system health.',
  },
  {
    title: 'Chart-ready outputs',
    description: 'Persist signals, trades, and diagnostics for analysis inside the app.',
  },
];

const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const renderExampleCard = (step: LandingStep) => {
  return `
    <div class="example-card">
      <div class="example-topline">
        <span>${escapeHtml(step.exampleEyebrow)}</span>
        <span>${escapeHtml(step.exampleTitle)}</span>
      </div>
      <div class="example-body">
        ${step.exampleLines
          .map((line) => `<div class="example-line">${escapeHtml(line)}</div>`)
          .join('')}
      </div>
    </div>
  `;
};

const renderLanding = () => {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Quantago</title>
      <meta name="description" content="Quantago is the strategy platform for versioned backtests, multi-runtime execution, and edge-native trading research." />
      <meta property="og:title" content="Quantago" />
      <meta property="og:description" content="Versioned strategies, multi-runtime execution, and a cloud-native backtesting stack." />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://quantago.co" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>
        :root {
          --bg: #f4efe7;
          --paper: rgba(255, 252, 247, 0.82);
          --panel: rgba(28, 34, 47, 0.94);
          --panel-soft: rgba(247, 240, 228, 0.9);
          --text: #132031;
          --muted: #4e5967;
          --line: rgba(19, 32, 49, 0.12);
          --brand: #0f766e;
          --brand-2: #d97706;
          --shadow: 0 24px 70px rgba(32, 41, 54, 0.14);
          --radius-xl: 32px;
          --radius-lg: 24px;
          --radius-md: 18px;
          --container: 1180px;
        }

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          margin: 0;
          font-family: 'Space Grotesk', sans-serif;
          color: var(--text);
          background:
            radial-gradient(circle at top left, rgba(15, 118, 110, 0.16), transparent 30%),
            radial-gradient(circle at 85% 10%, rgba(217, 119, 6, 0.18), transparent 24%),
            linear-gradient(180deg, #fcfaf6 0%, #f4efe7 48%, #efe7db 100%);
        }

        a { color: inherit; text-decoration: none; }
        .shell { width: min(calc(100% - 32px), var(--container)); margin: 0 auto; }
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0 10px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 18px;
          color: var(--muted);
          font-size: 0.95rem;
        }
        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 20px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-weight: 600;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .button:hover { transform: translateY(-1px); }
        .button.primary {
          background: linear-gradient(135deg, var(--brand), #1d8a80);
          color: white;
          box-shadow: 0 18px 34px rgba(15, 118, 110, 0.24);
        }
        .button.secondary {
          background: rgba(255,255,255,0.62);
          border-color: rgba(19, 32, 49, 0.12);
          color: var(--text);
        }
        .hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 32px;
          align-items: center;
          padding: 34px 0 84px;
        }
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255,255,255,0.58);
          color: var(--muted);
          font-size: 0.84rem;
        }
        h1 {
          margin: 18px 0 16px;
          font-size: clamp(3rem, 8vw, 6.4rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
        }
        .hero p {
          max-width: 640px;
          color: var(--muted);
          font-size: 1.12rem;
          line-height: 1.7;
        }
        .hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 18px;
          margin-top: 22px;
          color: var(--muted);
          font-size: 0.92rem;
        }
        .hero-card {
          position: relative;
          padding: 24px;
          border-radius: var(--radius-xl);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.48));
          border: 1px solid rgba(255,255,255,0.72);
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .hero-card::before {
          content: '';
          position: absolute;
          inset: 14px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(10, 14, 20, 0.92), rgba(20, 31, 44, 0.96));
          z-index: 0;
        }
        .terminal {
          position: relative;
          z-index: 1;
          color: #dfe8f1;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.88rem;
        }
        .terminal-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          color: #8fa6bd;
        }
        .terminal-dot-row { display: flex; gap: 8px; }
        .terminal-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
        }
        .terminal-line { margin: 9px 0; white-space: pre-wrap; }
        .terminal-key { color: #7dd3c7; }
        .terminal-value { color: #f8c17a; }
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 22px;
        }
        .metric {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .metric strong { display: block; font-size: 1.2rem; color: white; margin-bottom: 6px; }
        .metric span { color: #99aebe; font-size: 0.86rem; }
        section { padding: 26px 0 84px; }
        .section-head {
          max-width: 720px;
          margin-bottom: 28px;
        }
        .section-head h2 {
          margin: 0 0 12px;
          font-size: clamp(2rem, 5vw, 3.5rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }
        .section-head p {
          margin: 0;
          color: var(--muted);
          line-height: 1.7;
        }
        .workflow {
          display: grid;
          gap: 26px;
        }
        .workflow-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          padding: 28px;
          border-radius: var(--radius-xl);
          background: var(--paper);
          border: 1px solid rgba(255,255,255,0.74);
          box-shadow: var(--shadow);
          align-items: center;
        }
        .workflow-card.reverse .workflow-copy { order: 2; }
        .workflow-card.reverse .workflow-media { order: 1; }
        .step-badge {
          display: inline-grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin-bottom: 18px;
        }
        .workflow-copy h3 {
          margin: 0 0 12px;
          font-size: 2rem;
          letter-spacing: -0.05em;
        }
        .workflow-copy p { margin: 0; color: var(--muted); line-height: 1.7; }
        .bullet-list {
          margin: 18px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }
        .bullet-list li {
          padding-left: 18px;
          position: relative;
          color: var(--text);
        }
        .bullet-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.65em;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
        }
        .example-card {
          padding: 18px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(23, 32, 44, 0.98), rgba(13, 19, 28, 0.98));
          color: #f7fafc;
          box-shadow: 0 24px 60px rgba(7, 12, 20, 0.28);
          font-family: 'IBM Plex Mono', monospace;
        }
        .example-topline {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #95a7bb;
          font-size: 0.76rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }
        .example-body {
          display: grid;
          gap: 10px;
        }
        .example-line {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.06);
          color: #e5edf5;
        }
        .benefit-grid,
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .benefit,
        .feature {
          padding: 24px;
          border-radius: var(--radius-lg);
          background: rgba(255,255,255,0.56);
          border: 1px solid rgba(19, 32, 49, 0.08);
          box-shadow: 0 20px 48px rgba(24, 35, 48, 0.08);
        }
        .benefit strong,
        .feature strong { display: block; margin-bottom: 10px; font-size: 1.12rem; }
        .benefit p,
        .feature p { margin: 0; color: var(--muted); line-height: 1.7; }
        .cta {
          padding: 34px;
          border-radius: var(--radius-xl);
          background: linear-gradient(135deg, rgba(15, 118, 110, 0.96), rgba(20, 35, 50, 0.96));
          color: white;
          box-shadow: 0 28px 70px rgba(15, 118, 110, 0.24);
        }
        .cta h2 { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); letter-spacing: -0.05em; }
        .cta p { margin: 0 0 24px; max-width: 720px; color: rgba(255,255,255,0.78); line-height: 1.7; }
        .cta .button.secondary { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.18); color: white; }
        footer {
          padding: 24px 0 42px;
          color: var(--muted);
        }
        .footer-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 22px;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--line);
          padding-top: 18px;
        }
        .footer-links { display: flex; gap: 16px; }
        @media (max-width: 960px) {
          .hero,
          .workflow-card,
          .workflow-card.reverse {
            grid-template-columns: 1fr;
          }
          .workflow-card.reverse .workflow-copy,
          .workflow-card.reverse .workflow-media {
            order: initial;
          }
          .benefit-grid,
          .feature-grid,
          .metric-grid { grid-template-columns: 1fr; }
          .nav { flex-direction: column; align-items: flex-start; gap: 14px; }
          .nav-links { flex-wrap: wrap; }
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <header class="nav">
          <a class="brand" href="/">
            <span class="brand-mark"></span>
            <span>QUANTAGO</span>
          </a>
          <nav class="nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#benefits">Benefits</a>
            <a href="#features">Features</a>
            <a href="${appUrl}">Live App</a>
          </nav>
        </header>

        <main>
          <section class="hero">
            <div>
              <div class="eyebrow">Versioned strategy execution for modern quant teams</div>
              <h1>Build, test, and ship strategies without locking yourself into one runtime.</h1>
              <p>Quantago keeps market data, execution orchestration, auth, and analysis inside one platform while your strategy logic stays portable across native TypeScript, Python services, and WASM modules.</p>
              <div class="button-row" style="margin-top: 28px;">
                <a class="button primary" href="${appUrl}">Try the Live App</a>
                <a class="button secondary" href="${githubUrl}">Download GitHub</a>
              </div>
              <div class="hero-meta">
                <span>App: ${appUrl}</span>
                <span>API: ${apiUrl}</span>
                <span>Admin: ${adminUrl}</span>
              </div>
            </div>
            <div class="hero-card">
              <div class="terminal">
                <div class="terminal-bar">
                  <div class="terminal-dot-row">
                    <span class="terminal-dot"></span>
                    <span class="terminal-dot"></span>
                    <span class="terminal-dot"></span>
                  </div>
                  <span>quantago protocol session</span>
                </div>
                <div class="terminal-line"><span class="terminal-key">strategy</span> = <span class="terminal-value">Mean Reversion Alpha</span></div>
                <div class="terminal-line"><span class="terminal-key">runtime</span> = <span class="terminal-value">remote/python</span></div>
                <div class="terminal-line"><span class="terminal-key">signal</span> = <span class="terminal-value">BUY</span></div>
                <div class="terminal-line"><span class="terminal-key">reason</span> = <span class="terminal-value">price re-entered lower Bollinger channel</span></div>
                <div class="metric-grid">
                  <div class="metric"><strong>61.2%</strong><span>Win rate</span></div>
                  <div class="metric"><strong>4.8%</strong><span>Max drawdown</span></div>
                  <div class="metric"><strong>3 runtimes</strong><span>One protocol</span></div>
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works">
            <div class="section-head">
              <h2>How it works</h2>
              <p>Quantago gives you a consistent workflow from strategy definition to reviewed results. Every step uses the same contract, so research, execution, and deployment stay aligned.</p>
            </div>
            <div class="workflow">
              ${steps
                .map((step, index) => `
                  <article class="workflow-card${index % 2 === 1 ? ' reverse' : ''}">
                    <div class="workflow-copy">
                      <div class="step-badge">${step.step}</div>
                      <h3>${escapeHtml(step.title)}</h3>
                      <p>${escapeHtml(step.description)}</p>
                      <ul class="bullet-list">
                        ${step.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
                      </ul>
                    </div>
                    <div class="workflow-media">${renderExampleCard(step)}</div>
                  </article>
                `)
                .join('')}
            </div>
          </section>

          <section id="benefits">
            <div class="section-head">
              <h2>Benefits</h2>
              <p>The platform is opinionated where it should be: execution, storage, and observability stay centralized, while your strategy logic remains easy to evolve.</p>
            </div>
            <div class="benefit-grid">
              ${benefits
                .map((benefit, index) => `
                  <div class="benefit">
                    <strong>0${index + 1}</strong>
                    <p>${escapeHtml(benefit)}</p>
                  </div>
                `)
                .join('')}
            </div>
          </section>

          <section>
            <div class="cta">
              <h2>Ship strategy research with production discipline.</h2>
              <p>Use the live app for backtests, keep the admin surface for operations, and publish strategy versions from the runtime that fits your team instead of bending everything into one stack.</p>
              <div class="button-row">
                <a class="button primary" href="${githubUrl}">Download GitHub</a>
                <a class="button secondary" href="${appUrl}">Try the Live App</a>
              </div>
            </div>
          </section>

          <section id="features">
            <div class="section-head">
              <h2>Feature grid</h2>
              <p>Everything below is designed to reduce friction between research code, production-grade execution, and the operational surface around it.</p>
            </div>
            <div class="feature-grid">
              ${features
                .map((feature) => `
                  <article class="feature">
                    <strong>${escapeHtml(feature.title)}</strong>
                    <p>${escapeHtml(feature.description)}</p>
                  </article>
                `)
                .join('')}
            </div>
          </section>
        </main>

        <footer>
          <div class="footer-bar">
            <div>Quantago by Aimform Kft</div>
            <div class="footer-links">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </body>
  </html>`;
};

const renderLegalPage = (title: string, body: string) => {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)} | Quantago</title>
      <style>
        body { margin: 0; font-family: 'Space Grotesk', sans-serif; background: #f8f4ec; color: #162233; }
        main { width: min(calc(100% - 32px), 840px); margin: 0 auto; padding: 56px 0 80px; }
        a { color: #0f766e; text-decoration: none; }
        .card { background: rgba(255,255,255,0.76); border: 1px solid rgba(22,34,51,0.08); border-radius: 28px; padding: 32px; box-shadow: 0 20px 60px rgba(22,34,51,0.08); }
        h1 { margin-top: 0; font-size: 2.6rem; letter-spacing: -0.05em; }
        p { color: #4e5967; line-height: 1.8; }
      </style>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
    </head>
    <body>
      <main>
        <div class="card">
          <a href="/">Back to Quantago</a>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(body)}</p>
          <p>Company: Aimform Kft</p>
        </div>
      </main>
    </body>
  </html>`;
};

const htmlResponse = (html: string) => {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};

export default {
  fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/privacy') {
      return htmlResponse(renderLegalPage(
        'Privacy',
        'Quantago collects only the data required to operate authenticated backtesting, strategy registry, and operational monitoring features. Contact support before publishing any regulated or sensitive data through the platform.',
      ));
    }

    if (url.pathname === '/terms') {
      return htmlResponse(renderLegalPage(
        'Terms',
        'Quantago is provided as software and infrastructure for strategy research and operations. Users remain responsible for trading decisions, external integrations, and compliance with any market, jurisdiction, or data licensing obligations.',
      ));
    }

    return htmlResponse(renderLanding());
  },
};