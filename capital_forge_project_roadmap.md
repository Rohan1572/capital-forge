# CapitalForge Roadmap
## AI-Powered Strategic Decision Simulation Platform

---

# Status

Updated against the current repo state on April 19, 2026.

The original launch roadmap is mostly complete. This document now tracks only:

- What is already in place.
- The verified open work that still needs implementation.
- The prompt needed to delegate that remaining task.

Since the previous revision, the home page and contributor docs cleanup is implemented, the API contract coverage is in place, and the Vercel cron scheduler is already wired through `vercel.json`.

---

# Product Snapshot

CapitalForge is a multi-user AI-powered strategy simulation platform where users allocate capital, simulate risk scenarios, compete on a leaderboard, and receive AI-driven strategic critique.

The main product loop is already present in the codebase:

1. Users build a capital allocation across assets such as equity, startups, bonds, gold, crypto, and cash.
2. The simulation engine runs Monte Carlo paths using the configured means, volatilities, correlations, and crash regimes.
3. The metrics layer converts outcomes into decision-ready statistics such as expected return, volatility, Sharpe ratio, max drawdown, VaR, CVaR, and large-loss probability.
4. The AI layer explains the result in structured language.
5. Active shocks are surfaced in both simulation and leaderboard flows.
6. Strategies can be saved, replayed, and compared on the leaderboard.
7. Multi-agent debate is available for structured interpretation.

---

# Already In Place

## Core Product

- Simulation, metrics, strategy persistence, leaderboard ranking, shock generation, AI critique, and debate are implemented.
- Leaderboard season handling and active shock context are exposed through the API and UI.
- Saved strategies can be replayed with assumptions and shock snapshots.

## Security And Hardening

- Same-origin validation is in place for cookie-authenticated state-changing routes.
- Auth, strategy save/delete, and simulation save flows are protected with server-side session checks.
- AI routes are rate-limited and use structured responses with safety wrappers.

## Testing

- End-to-end coverage exists for the launch path: login, allocate, simulate, save, and leaderboard.
- Leaderboard month navigation and shock context are covered by a separate regression spec.
- Snapshot coverage exists for AI prompt and safety formatting.

## Operations

- Privacy and data handling guidance is documented.
- Backup and restore, schema drift, monitoring, and incident response runbooks are documented.
- Monitoring summaries, cron checks, retention sweeps, leaderboard rollover routes, and the Vercel cron schedules are present.

## UI Polish

- The recent runs widget and leaderboard footer formatting issues called out in the older roadmap are already fixed in the current UI.

---

# Open Work

## Verified Open Work

- Replace the placeholder dashboard summary copy with a real portfolio snapshot section. The dashboard already renders recent simulation runs and monitoring, but the opening copy in `app/(app)/dashboard/page.tsx` still says the portfolio snapshot, metrics, and recent simulations "will be shown here".

---

# Prompt Pack

Use this prompt when delegating the remaining work. It is kept intentionally narrow so it does not drift into already-implemented dashboard widgets.

## Build The Dashboard Snapshot

Prompt:
Replace the placeholder dashboard copy with a real portfolio snapshot section above the existing monitoring and recent-runs widgets. Reuse the data and components already in the app where possible, and surface a concise at-a-glance overview of the user's current portfolio, recent performance, and recent activity without duplicating the rest of the dashboard.

---

# Roadmap Update Metadata

Date: April 19, 2026

Codebase checked against the current repo state. This document now tracks only verified open work and the prompts needed to implement it.
