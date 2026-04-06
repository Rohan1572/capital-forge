# CapitalForge Roadmap
## AI-Powered Strategic Decision Simulation Platform

---

# Status

Updated against the current repo state on April 7, 2026.

The original launch roadmap is mostly complete. This document now tracks:

- What is already in place.
- The small set of open follow-up items that still need implementation.
- The prompts we should use to delegate those remaining tasks.

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
- Monitoring summaries, cron checks, retention sweeps, and leaderboard rollover routes are present.

## UI Polish

- The recent runs widget and leaderboard footer formatting issues called out in the older roadmap are already fixed in the current UI.

---

# Open Work

## P0 Launch Blockers

- Wire scheduled jobs to real deployment infrastructure.
- Fix leaderboard correctness, pagination, and page-state behavior.
- Make simulation and replay output honest and stable.
- Add lightweight API contract tests for public JSON surfaces.

## P1 Core Product Gaps

- Improve monitoring visibility, refresh behavior, and operator delivery.
- Improve strategy history and workspace tools.
- Harden auth, session, and account-management flows.
- Fix the home page and contributor tooling docs.

## P2 UX, Accessibility, And Polish

- Separate loading and error states across shared widgets.
- Make loading states and metric labels accessible.
- Improve onboarding modal accessibility.

---

# Prompt Pack

Use these prompts when delegating the remaining work. The prompts below are merged to avoid duplicate work and overlapping implementation paths.

## Wire Scheduled Jobs

Prompt:
Connect the existing cron routes in `app/api/cron/shocks/weekly/route.ts`, `app/api/cron/leaderboard/monthly/route.ts`, `app/api/cron/monitoring/route.ts`, and `app/api/cron/retention/route.ts` to the real deployment scheduler for this repo. Keep the implementation minimal, document the required secrets and run cadence, and make sure the existing manual admin routes remain usable.

## Fix Leaderboard Correctness And State

Prompt:
Fix the leaderboard flow so the API returns globally ranked results before pagination, missing or partial metrics are handled explicitly instead of being coerced to zero, and the page keeps its month/page state in the URL. While you're there, make loading transitions unambiguous so stale table data does not linger while a new request is in flight.

## Make Simulation Output Honest And Stable

Prompt:
Update the simulate flow so starting a new run clears stale results, stale comparison cards, and any previous AI output before the new run completes. Rewrite the save error messaging so it accurately reflects backend failures, and correct the scenario path chart so it does not imply a true Monte Carlo path if it is only compounding percentile returns. Also make the replay path surface malformed or partial saved results instead of silently trimming them.

## Improve Monitoring Visibility And Delivery

Prompt:
Enhance monitoring so the dashboard card shows report status, alert summaries, and a clear refresh behavior, while the cron and report paths provide a concise operator-facing delivery path for warning and critical conditions. Reuse the existing monitoring report and keep the output actionable without making the UI noisy.

## Improve Strategy History And Workspace

Prompt:
Refine strategy history and detail views so users can page through or load more than the first 20 saved strategies, see all calculated comparison metrics, and jump into strategy detail more easily. Add a clearer confirmation step for destructive actions, replace raw strategy IDs with user-friendly labels, and include lightweight workflow tools such as search, sort, rename, clone, annotation, or export where they make sense.

## Harden Auth And Account Management

Prompt:
Harden the login and registration forms so network failures do not leave the submit button stuck, make logout redirect only after a successful sign-out response, and keep logged-in users away from `/login` and `/register` unless they explicitly want to switch accounts. Extend the auth area with password recovery, basic account settings, and self-service account deletion so the product feels complete.

## Improve Loading And Accessibility

Prompt:
Update shared loading and empty states so they are clearly separated from errors, add `aria-busy` or equivalent status announcements where skeletons are used, and make metric help labels keyboard-focusable and touch-friendly. Also improve the onboarding modal and glossary drawer with keyboard dismissal, focus management, and body scroll handling.

## Fix Home Page And Contributor Docs

Prompt:
Remove or replace the `/strategy/demo` link on the home page so the landing screen only points to real routes, and refresh the landing-page copy so it reflects the actual product instead of the scaffold template language. Then align the contributor docs with the actual code-review-graph scripts in `package.json`, or add the missing scripts if that workflow is still intended.

## Add API Contract Tests

Prompt:
Add a small set of tests that validate the JSON response shape for leaderboard, monitoring, and cron endpoints. Focus on the fields the UI and runbooks depend on, and keep the tests resilient to harmless data changes.

---

# Roadmap Update Metadata

Date: April 7, 2026

Codebase checked against the current repo state. This document now tracks only verified open work and the prompts needed to implement it.
