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
The dashboard portfolio snapshot is also implemented, so there is no longer a verified open task in that area.
The remaining gaps are mostly around test coverage and operational confidence, not missing core product features.

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

# Production-Ready Gaps

The product is feature-complete enough to run, but these gaps still block a confident production launch.

## Priority 1: Coverage For User-Facing Paths

- Add direct coverage for the dashboard snapshot and its core widgets. The dashboard now renders `PortfolioSnapshotSection`, `RecentSimulationRunsWidget`, and `MonitoringWidget`, but the current e2e suite only verifies that `/dashboard` loads and does not assert the snapshot content or empty states.
- Add route-level tests for the untested API surface, especially auth/account/password, admin, and cron handlers. The repo has 25 route handlers under `app/api`, but the current automated coverage is concentrated in response-shape tests plus two e2e smoke/regression flows.

## Priority 2: Coverage For Operational Flows

- Add CI-visible smoke checks for the operational routes that power production maintenance, especially monitoring, retention, leaderboard rollover, and weekly shocks. Those endpoints exist, but they are not directly exercised by the present test suite.
- Verify the backup and restore check path in a real deployment-like environment before launch. The repo has `npm run ops:restore:check`, but the roadmap should treat restore validation as a launch gate rather than a documented suggestion.
- Gate schema changes with a pre-deploy rehearsal that includes `npm run ops:schema:drift` and a post-deploy smoke path. The runbook documents the workflow, but the repo still relies on humans to remember and sequence it correctly.

## Priority 3: Production Confidence

- Add a release checklist that confirms the required secrets and operator routes are configured in the target environment, including `CRON_SECRET` and `ADMIN_TRIGGER_SECRET`.
- Add explicit production smoke criteria for the monitoring summary so a deploy can be accepted or rolled back based on measurable health signals rather than manual inspection alone.

---

# Prompt Pack

Use these prompts when delegating the remaining work.

## Harden The Dashboard

Prompt:
Add direct automated coverage for the dashboard snapshot and its key states. Assert that the dashboard renders the portfolio snapshot, recent performance, and recent activity sections when data exists, and that the empty state is correct when no saved strategy exists.

## Cover The Routes

Prompt:
Add route-level tests for the currently untested API handlers, focusing first on auth/account/password, admin, and cron endpoints. Verify both happy-path payload shapes and the failure modes that matter for production hardening.

## Exercise Ops Flows

Prompt:
Add CI-friendly smoke coverage for the maintenance flows that keep the app healthy in production. Prioritize monitoring, retention, leaderboard rollover, and weekly shock endpoints so the operational surface is verified before release.

## Launch Gate The Ops Checks

Prompt:
Turn the documented backup, schema, and monitoring steps into explicit launch gates. Make sure restore validation, schema-drift checks, and post-deploy monitoring smoke tests are required before a production release is considered ready.

---

# Roadmap Update Metadata

Date: April 19, 2026

Codebase checked against the current repo state. This document now tracks the verified gaps that still need production hardening before launch.
