# CapitalForge Roadmap
## AI-Powered Strategic Decision Simulation Platform

---

# Vision

CapitalForge is a multi-user AI-powered strategy simulation platform where users allocate capital, simulate risk scenarios, compete with others, and receive AI-driven strategic critiques.

It combines:
- Capital allocation modeling
- Monte Carlo simulations
- Risk analytics
- Multi-agent AI debate system
- Competitive leaderboard mechanics

Goal: build a flagship MBA-level, quant-driven, AI-native product.

---

# Project Overview

CapitalForge is designed as a decision lab for portfolio construction, risk stress-testing, and AI-guided critique. The product should feel like a mix between a finance simulator, a strategy game, and a professional analytics dashboard.

## How The Product Works

1. A user builds a capital allocation across assets such as equity, startups, bonds, gold, crypto, and cash.
2. The simulation engine runs thousands of Monte Carlo paths using the configured means, volatilities, correlations, and crash regimes.
3. The metrics layer converts those outcomes into decision-ready statistics such as expected return, volatility, Sharpe ratio, max drawdown, VaR, CVaR, and large-loss probability.
4. The AI layer explains the result in structured language, calling out weaknesses, downside risks, and possible improvements.
5. If a shock is active, the portfolio is stress-tested against that scenario so the user can compare baseline vs shocked performance.
6. The strategy can be saved, replayed later, and compared against other users on the leaderboard.
7. Multi-agent debate adds a second layer of interpretation by simulating a conservative investor, a growth investor, and a risk manager reviewing the same allocation.

## Core Product Pillars

- Deterministic quant truth: numeric outputs must come from the simulation engine, not from the LLM.
- Auditable runs: every strategy should ideally preserve assumptions, seed, shock state, and model metadata.
- Structured AI: prompts and outputs should stay schema-driven so the UI remains predictable.
- Competitive mechanics: rankings, monthly resets, and shock events make the product feel like an ongoing game.
- Professional presentation: the interface should read like an MBA-grade finance tool rather than a generic dashboard.

## Main User Flows

- Simulate: choose an allocation, run the model, inspect charts, and read the AI critique.
- Save: persist the strategy with metrics and replay data for later comparison.
- Compare: view leaderboard position, shock impact, and historical strategy performance.
- Debate: review a structured multi-agent discussion that challenges the allocation from different finance perspectives.

## Intended Build Order

- First: simulation engine, metrics, and reproducible outputs.
- Second: persistence, auth, and leaderboard ranking.
- Third: shock events and active scenario comparisons.
- Fourth: AI critique and multi-agent debate.
- Fifth: polish, observability, and compliance.

---

# Remaining Work

Completed items have been removed so this section only tracks open work.

## Core Simulation and Metrics
- Apply shock correlation shifts. The shock engine supports correlation modifiers, but the Monte Carlo flow does not apply them yet.
- Persist simulation assumptions, seed, and shock id per run for auditability.
- Wire risk-free rate configuration into metrics and callers. `computeSimulationMetrics` accepts it, but the app still passes the default.

## AI Risk and Debate
- Persist AI response metadata (model, tokens, latency) to DB or audit logs.
- Add AI safety guardrails to prevent investment-advice language and add a visible disclaimer.

## Shock Events
- Surface active shock beyond the simulate page. Strategy detail already shows shock context, but leaderboard context is still missing.
- Weekly rotation or reset logic for shocks (cron/worker + admin trigger).

## Strategies and Leaderboard
- Leaderboard month selector UI + active month display in the page header.
- Strategy detail assumptions snapshot is still missing.
- Enforce allocation bounds server-side (min/max rules + total=100 validation).
- Protect leaderboard routes and make strategy detail redirect unauthenticated users. Dashboard and strategies layouts already redirect, but leaderboard remains public and strategy detail is soft-gated.
- Decide on `SimulationRun` model usage (currently unused in UI).

## Data, Assumptions, and Auditability
- Versioned assumptions config and per-run logging.

## Testing and QA
- Snapshot tests for AI response formatting.
- End-to-end flow tests: allocate -> simulate -> save -> rank.
- Shock validation tests (metric deltas after shock).

## Ops and Compliance
- Monitoring for simulation latency and AI costs.
- PII retention policy and documentation.

---

# Pending Prompts

Use these prompts when delegating the remaining work.

## Apply Shock Correlation Shifts
Prompt:
Update `lib/monteCarlo.ts` to apply shock-adjusted correlation matrices when `ShockParameters` are provided. Use `applyShockToCorrelation` from `lib/shockEngine.ts`, recompute Cholesky decomposition for the shocked matrix, and ensure the simulation uses the shocked correlation only for the affected run. Add a unit test in `lib/monteCarlo.test.ts` to verify correlations shift in the expected direction.

## Persist Simulation Assumptions + Seed + Shock
Prompt:
Store simulation assumptions, seed, and shock id in the database for auditability. Update the strategy save flow or create a new `SimulationRun` model to persist `assumptionsVersion`, `assumptions`, `seed`, `shockId`, and `shockModifiers`. Add the fields to the Prisma schema and include them in API responses where needed.

## Risk-Free Rate Configuration
Prompt:
Add `RISK_FREE_RATE` to environment configuration and pass it into `computeSimulationMetrics` in the API and UI. Update `lib/metrics.ts` callers so Sharpe uses the configured value. Add a test to validate Sharpe changes when risk-free rate is non-zero.

## Persist AI Metadata
Prompt:
Store AI response metadata for risk and debate in the database. Add columns or a JSON blob to the strategy record or an `AiResponseLog` table. Update `/api/ai/risk` and `/api/ai/debate` to persist metadata alongside strategy runs.

## AI Safety Guardrails
Prompt:
Add a post-response safety check that flags investment-advice language such as buy, sell, or guaranteed. If detected, replace the content with a neutral warning and show a disclaimer card in the UI. Update prompts to discourage advice-like phrasing and add a short disclaimer banner to AI panels.

## Weekly Shock Rotation
Prompt:
Add a scheduled job or worker that calls `/api/ai/shocks` weekly and sets the active shock. Ensure old shocks are deactivated and `weekStart` is set consistently in UTC on Monday. Add a manual admin trigger route for testing.

## Leaderboard Month Selector UI
Prompt:
Update `app/(app)/leaderboard/page.tsx` with a month picker in `YYYY-MM` format. Pass the `month` query param to the API, show the active month in the header, and allow quick navigation to the previous and next months.

## Strategy Detail Enhancements
Prompt:
Enhance `app/(app)/strategy/[id]/page.tsx` to include an assumptions snapshot, active shock context, and a compact metrics sidebar. Reuse `SimulationChart` and add a `Back to History` link if needed.

## Server-Side Allocation Validation
Prompt:
Add server-side allocation validation in `/api/strategies` and any `/api/ai/*` endpoints that accept allocation data. Enforce totals = 100 and min/max per asset. Return 400 with a clear error if invalid. Add tests for invalid allocations.

## Protect Routes With Redirect
Prompt:
Add middleware or server-side checks to redirect unauthenticated users from `/leaderboard` and `/strategy/[id]` to `/login`. Keep API routes returning 401 JSON rather than redirects.

## Decide SimulationRun Model Usage
Prompt:
Either wire `SimulationRun` into the simulation flow so each run is stored and linked to a strategy, or remove the model if it remains unused. If you keep it, add API endpoints and a dashboard widget for recent runs.

## Versioned Assumptions and Auditability
Prompt:
Centralize asset assumptions in a versioned config file and persist the version plus runtime assumptions for each simulation. Include the configuration metadata in saved strategy records and API responses.

## Testing Coverage
Prompt:
Add snapshot tests for AI response formatting, end-to-end tests for allocate -> simulate -> save -> rank, and shock validation tests that verify metrics move after a shock is applied.

## Ops and Compliance
Prompt:
Add monitoring for simulation latency and AI costs, then document a PII retention policy and data handling rules.

---

# Roadmap Update Metadata

Date: March 30, 2026

Codebase checked against the current repo state. This document now tracks only open work and the prompts needed to implement it.

---
