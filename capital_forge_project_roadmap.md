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
The original roadmap has mostly been implemented. These are the remaining gaps I found in the current repo after checking the live code against the markdown.

## Production-Ready Gaps
- Fix visible UI polish issues before launch, including the broken separator in the recent runs widget and the leaderboard footer glyph.
- Add CSRF or origin validation for cookie-authenticated state-changing routes, and review sensitive API surfaces so their access model matches the intended private versus public product model.
- Add a browser-level smoke suite for auth -> simulate -> save -> leaderboard so the main launch path is exercised outside unit tests.
- Add deployment runbooks for backup/restore, schema migrations, and incident response so the product can be operated safely after launch.

## Product Surface Gaps
- Surface the active shock context on the leaderboard page and, if useful, in the leaderboard API response so rankings are read in the same scenario context as simulate and strategy detail.
- Add an explicit season or reset model for the monthly leaderboard if monthly competition is meant to behave like a true game loop instead of a filterable archive.

## Testing and QA
- Add an end-to-end flow test for allocate -> simulate -> save -> rank.
- Add regression coverage for leaderboard month navigation and any shock-context UI added to that surface.
- Keep snapshot coverage around AI response formatting and safety wrappers so prompt changes do not silently alter the UI contract.

## Ops and Compliance
- Add retention or deletion automation for sessions, AI response logs, and older simulation records so the privacy policy is enforced operationally.
- Add alerting or scheduled reporting on simulation latency and AI cost metrics, not just the existing monitoring widget.

---

# Pending Prompts

Use these prompts when delegating the remaining work.

## Production Polish Cleanup
Prompt:
Fix the visible UI text encoding issues in `components/RecentSimulationRunsWidget.tsx` and `app/(app)/leaderboard/page.tsx`, then scan for any other launch-blocking rendering artifacts. Keep the changes minimal and consistent with the existing design language.

## Add Request Hardening
Prompt:
Add CSRF or origin validation for cookie-authenticated POST, PUT, PATCH, and DELETE routes. Review sensitive API endpoints and make sure the access model matches the intended product model for private versus public data. Keep API error responses JSON-based.

## Add E2E Smoke Coverage
Prompt:
Add a browser-level smoke test that covers login, allocate, simulate, save, and leaderboard visibility. Keep the test focused on the critical launch path and verify the most important UI states rather than implementation details.

## Add Operational Runbooks
Prompt:
Document and, where practical, automate backup/restore validation, schema migration rehearsal, and incident response steps for launch. Align the runbook with `docs/privacy-and-data-handling.md` and the current monitoring route so the team can operate the app safely in production.

## Surface Active Shock On Leaderboard
Prompt:
Update `app/(app)/leaderboard/page.tsx` and `app/api/leaderboard/route.ts` to show the currently active shock context alongside monthly rankings. Add a compact shock badge or summary in the header, and include the active shock id/title in the API payload when available so the UI can explain why rankings may move during a shock week.

## Add Monthly Season Rollovers
Prompt:
Add a season or reset job for the leaderboard so the monthly competition can behave like a true cycle instead of only a query filter. Reuse the existing month-range logic in `app/api/leaderboard/route.ts`, add a scheduled runner or admin action for month rollover, and make sure the active month is displayed consistently in the UI.

## Add End-to-End QA
Prompt:
Add an end-to-end test that covers allocate -> simulate -> save -> rank, plus a smaller regression test for leaderboard month navigation and any new shock-context UI. Keep the test focused on user-visible behavior and the API contract, not implementation details.

## Enforce Retention Automation
Prompt:
Add automated retention and deletion workflows for sessions, AI response logs, and older simulation records. Reuse the guidance in `docs/privacy-and-data-handling.md`, make the deletion path explicit for support or admin use, and ensure audit records remain compliant with the intended retention policy.

## Add Monitoring Alerts
Prompt:
Expand the current monitoring surface into actionable reporting or alerts for simulation latency and AI cost spikes. Hook the logic behind `app/api/monitoring/route.ts` into a scheduled check or admin summary, and surface threshold breaches clearly enough for operators to spot regressions quickly.

---

# Roadmap Update Metadata

Date: April 1, 2026

Codebase checked against the current repo state. This document now tracks only open work and the prompts needed to implement it.

---
