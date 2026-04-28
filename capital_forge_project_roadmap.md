# CapitalForge Roadmap
## AI-Powered Strategic Decision Simulation Platform

---

# Status

Updated against the current repo state on April 28, 2026.

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
- Dashboard snapshot state is covered at the library level for both populated and empty states.
- Route-level coverage exists for auth account/password, admin, and cron handlers, plus smoke coverage for the operational maintenance routes.

## Operations

- Privacy and data handling guidance is documented.
- Backup and restore, schema drift, monitoring, and incident response runbooks are documented.
- Monitoring summaries, cron checks, retention sweeps, leaderboard rollover routes, and the Vercel cron schedules are present.
- The backup restore, schema drift, and monitoring-check scripts already exist, but they are still documentation-driven rather than release-gated.

## UI Polish

- The recent runs widget and leaderboard footer formatting issues called out in the older roadmap are already fixed in the current UI.

---

# Production-Ready Gaps

The product is feature-complete enough to run, but these gaps still block a confident production launch.

## Priority 1: Coverage For User-Facing Paths

- Add page-level e2e coverage for the dashboard snapshot and its core widgets. The dashboard now renders `PortfolioSnapshotSection`, `RecentSimulationRunsWidget`, and `MonitoringWidget`, but the current e2e suite only verifies that `/dashboard` loads and does not assert the rendered snapshot content or empty states.
- Add route-level tests for the remaining untested API surface, especially auth login/logout/register, the user-scoped monitoring route, the AI routes, and the simulation/strategy/leaderboard handlers. The current automated coverage is concentrated in account/password, admin, cron, response-shape tests, and two e2e smoke/regression flows.

## Priority 2: Coverage For Operational Flows

- Promote the documented backup, schema, and monitoring checks into an explicit release gate. A production release is not ready until all of the following are true:
  - Restore validation passes against a disposable restore of the latest production backup via `npm run ops:restore:check`.
  - Schema drift is clear before deploy via `npm run ops:schema:drift`, and the migration rehearsal completes without unresolved drift.
  - Post-deploy monitoring smoke checks succeed against the live release, including the user-scoped monitoring route and the operator summary route, with no unexpected critical alerts.
- Add a deployment preflight that verifies the required operator secrets are present in the target environment, including `CRON_SECRET` and `ADMIN_TRIGGER_SECRET`, before a production release can be marked ready.

## Priority 3: Production Confidence

- Add a release checklist that fails closed if any launch gate is missing, skipped, or only verified manually outside the documented checks.
- Keep the monitoring smoke criteria explicit so a deploy can be accepted or rolled back based on measurable health signals rather than manual inspection alone.

## Launch Gates

These gates are the production-release acceptance criteria implied by the runbooks and scripts already in the repo.

1. Backup restore validation
   - Restore the latest production backup into a disposable database.
   - Point `RESTORED_DATABASE_URL` at that database.
   - Run `npm run ops:restore:check`.
   - Do not promote the release unless this passes.
2. Schema drift gate
   - Run `npm run ops:schema:drift` before applying migrations.
   - Rehearse the migration on staging or a disposable production copy.
   - Do not consider the release ready if drift remains or migration history is inconsistent.
3. Post-deploy monitoring smoke gate
   - Verify the live release with the monitoring route and the operator summary route.
   - Confirm the health response is `healthy` or an explained `warning`, and that unexpected critical alerts are absent.
   - Use the smoke result as a release blocker, not an after-the-fact check.

---

# Prompt Pack

Use these prompts when delegating the remaining work.

## Harden The Dashboard

Prompt:
Add page-level e2e coverage for the dashboard snapshot and its key states. Assert that the dashboard renders the portfolio snapshot, recent performance, and recent activity sections when data exists, and that the empty state is correct when no saved strategy exists.

## Cover The Routes

Prompt:
Add route-level tests for the currently untested API handlers, focusing first on auth login/logout/register, the user-scoped monitoring route, the AI endpoints, and the simulation/strategy/leaderboard handlers. Verify both happy-path payload shapes and the failure modes that matter for production hardening.

## Exercise Ops Flows

Prompt:
Promote the documented restore, schema, and monitoring checks into a required release gate. The release should fail if restore validation, schema-drift rehearsal, or post-deploy monitoring smoke tests have not been completed.

## Launch Gate The Ops Checks

Prompt:
Turn the documented backup, schema, and monitoring steps into explicit launch gates. Make sure restore validation, schema-drift checks, post-deploy monitoring smoke tests, and required operator secrets are enforced before a production release is considered ready.

---

# Roadmap Update Metadata

Date: April 28, 2026

Codebase checked against the current repo state. This document now tracks the verified gaps that still need production hardening before launch.
