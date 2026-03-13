# CapitalForge 🚀
## AI-Powered Strategic Decision Simulation Platform

---

# 📌 Vision

CapitalForge is a multi-user AI-powered strategy simulation platform where users allocate capital, simulate risk scenarios, compete with others, and receive AI-driven strategic critiques.

It combines:
- Capital allocation modeling
- Monte Carlo simulations
- Risk analytics
- Multi-agent AI debate system
- Competitive leaderboard mechanics

Goal: Build a flagship MBA-level, quant-driven, AI-native product.

---

# AI Interpretation Guide

Use this document as a product and engineering roadmap. When implementing, prioritize:
- Deterministic, testable quant outputs over UI polish.
- Clear API contracts before UI integration.
- Reproducible simulations (seeded runs) and auditable assumptions.
- Strictly structured AI outputs (schema-validated JSON).

Definition of "MBA-level, quant-driven, AI-native":
- MBA-level: professional finance tone, clear assumptions, and decision framing.
- Quant-driven: metrics-led, Monte Carlo-based evaluation with reproducible results.
- AI-native: LLMs are used for critique, scenario generation, and debate, but never as the source of numeric truth.

Non-goals:
- Real-world investment advice.
- Live trading or brokerage integration.
- Unverifiable or opaque AI outputs.

---

# 🧱 Overall Architecture

## Frontend
- Next.js (App Router)
- TypeScript (strict mode)
- TailwindCSS
- Recharts or D3 for data visualization
- Zustand / Redux Toolkit for state management

## Backend
- Node.js + Express (or Next.js API routes)
- PostgreSQL
- Prisma ORM

## AI Layer
- OpenAI API for:
  - Risk explanation
  - Strategy critique
  - Shock generation
  - Multi-agent debate

## Quant Layer
- Monte Carlo simulation engine
- Statistical metrics calculator
- Shock event modifier engine

---

# 🗂️ Folder Structure

```
/app
  /dashboard
  /simulate
  /leaderboard
  /strategy/[id]
/components
  AllocationSlider.tsx
  SimulationChart.tsx
  RiskCard.tsx
  AIDebatePanel.tsx
/lib
  monteCarlo.ts
  metrics.ts
  shockEngine.ts
  aiPrompts.ts
```

---

# 🧮 Core Financial Metrics

The platform must compute:

- Expected Return
- Standard Deviation
- Sharpe Ratio
- Max Drawdown
- Value at Risk (VaR)
- Correlation Matrix
- Probability of 30%+ Loss

These metrics power leaderboard ranking, AI analysis, and user-facing risk explanations.

---

# 🚀 PHASE 1 – Core Simulation Engine (Weeks 1–3)

## Objective
Build the foundational single-user simulation engine.

---

## Feature 1: Portfolio Builder

User receives ₹1 Crore virtual capital.

Allocation categories:
- Equity (Large/Mid/Small)
- Startups
- Bonds
- Gold
- Crypto
- Cash

### Data Model

```ts
allocation: {
  equity: number
  startups: number
  bonds: number
  gold: number
  crypto: number
  cash: number
}
```

---

## Feature 2: Monte Carlo Simulation Engine

Simulate 10,000 market paths using:

- Randomized returns
- Volatility modeling
- Crash probability
- Asset correlation

Output:
- Distribution of portfolio returns
- Risk metrics
- Downside scenarios

---

## Feature 3: AI Risk Explainer

After simulation, AI analyzes metrics and explains:

- Risk exposure
- Fragility under crash scenarios
- Improvement suggestions
- Hedging recommendations

AI prompt must include:
- Allocation
- Expected return
- Sharpe ratio
- VaR
- Max drawdown

---

# 🏆 PHASE 2 – Multi-User Platform (Weeks 4–7)

## Objective
Transform engine into competitive multi-user platform.

---

## Feature 1: Authentication

- Email/password or OAuth
- Persist strategies to database

---

## Feature 2: Strategy Persistence

Each strategy stores:

- Allocation JSON
- Expected return
- Sharpe ratio
- Max drawdown
- Timestamp

---

## Feature 3: Leaderboard

Rank users based on:

- Risk-adjusted return (Sharpe ratio)
- Downside protection
- Performance under shock events

Leaderboard resets monthly.

---

## Feature 4: Weekly AI Shock Events

AI generates macro shocks such as:

- Recession
- Funding winter
- Commodity spike
- Regulatory change
- Currency crisis

Each shock modifies:
- Return distributions
- Volatility
- Correlation structure

Users must rebalance portfolios.

---

# 🧠 PHASE 3 – Multi-Agent AI Debate (Weeks 8–10)

## Objective
Introduce advanced AI reasoning layer.

---

## Agents

1. Conservative Investor
2. Growth Investor
3. Risk Manager

---

## Behavior

Each agent:
- Reviews strategy metrics
- Provides critique
- Challenges other agents
- Suggests reallocation

Output displayed as structured debate UI.

---

# 🗄️ Database Schema (Simplified)

## Users
- id
- name
- email
- createdAt

## Strategies
- id
- userId
- allocation (JSON)
- expectedReturn
- sharpeRatio
- maxDrawdown
- createdAt

## ShockEvents
- id
- title
- description
- volatilityModifier
- correlationShift
- active

---

# 🎨 UI/UX Direction

- Dark theme
- Clean minimal SaaS design
- Dashboard-driven interface
- Interactive charts
- Professional financial aesthetic

---

# 🏁 PHASE 4 – Advanced Enhancements (Optional)

- Strategy cloning and remixing
- Public profile pages
- Strategy publishing
- AI-generated improvement score
- Personal performance analytics
- Risk heatmap visualization

---

# 🎯 Resume Positioning

Project Description:

"Built CapitalForge – a multi-user AI-powered strategy simulation platform using Next.js, TypeScript, Monte Carlo modeling, and multi-agent LLM orchestration. Implemented 10,000-path stochastic simulations and AI-driven risk critique system with competitive leaderboard architecture."

---

# 📅 Suggested Timeline

Weeks 1–3: Core simulation engine
Weeks 4–5: Auth + persistence
Weeks 6–7: Leaderboard + shock events
Weeks 8–10: Multi-agent AI debate
Weeks 11–12: UI polish + deployment

---

# 🔥 End Goal

CapitalForge should feel like:

- A quant strategy lab
- An MBA decision simulator
- A competitive AI-powered finance game
- A production-grade SaaS product

This will serve as a flagship portfolio project demonstrating:
- Advanced frontend engineering
- Financial modeling capability
- AI orchestration expertise
- Systems thinking
- Product design maturity

---

# 🛠️ STEP-BY-STEP EXECUTION PLAN (DETAILED)

This section provides an implementation-level breakdown so another AI or developer can execute the project systematically.

---

# STEP 1 – Project Initialization (Week 1)

## 1.1 Create Base Project
- Initialize Next.js app (App Router enabled)
- Enable TypeScript strict mode
- Install TailwindCSS
- Configure ESLint + Prettier
- Setup folder structure as defined above

## 1.2 Setup Backend Layer
Option A: Use Next.js API routes
Option B: Separate Express server

- Install Prisma
- Setup PostgreSQL database
- Configure environment variables
- Run initial migration

## 1.3 Setup Core Utilities Folder
Create:
- monteCarlo.ts
- metrics.ts
- shockEngine.ts
- aiPrompts.ts

No UI yet. Focus on logic.

---

# STEP 2 – Build Quant Engine First (Week 1–2)

IMPORTANT: Simulation engine must work before UI polish.

## 2.1 Define Asset Return Assumptions
Define mean return and volatility for:
- Equity
- Startups
- Bonds
- Gold
- Crypto
- Cash

Example structure:
{
  equity: { mean: 0.12, volatility: 0.18 },
  bonds: { mean: 0.07, volatility: 0.06 }
}

## 2.2 Implement Random Return Generator
Use normal distribution approximation.
Generate yearly returns for each asset.

## 2.3 Implement Monte Carlo Simulation
Algorithm:
1. Loop 10,000 times
2. For each iteration:
   - Generate random return for each asset
   - Apply allocation weights
   - Compute portfolio return
3. Store results in array

Return:
- Array of 10,000 portfolio outcomes

## 2.4 Implement Metrics Engine
From simulation results compute:
- Expected return (mean)
- Standard deviation
- Sharpe ratio
- Max drawdown
- Value at Risk (5% percentile)
- Probability of loss > 30%

Test thoroughly with unit tests.

---

# STEP 3 – Build Simulation UI (Week 2–3)

## 3.1 Portfolio Allocation UI
- Slider components for each asset
- Total allocation must equal 100%
- Show real-time validation

## 3.2 Run Simulation Button
On click:
- Call Monte Carlo engine
- Display loading state
- Render charts

## 3.3 Visualization
Use Recharts or D3:
- Histogram of returns
- Line chart of simulation paths
- Risk metric cards

UI must feel professional and analytical.

---

# STEP 4 – AI Risk Explanation Layer (Week 3)

## 4.1 Structure Prompt Input
Pass:
- Allocation
- Expected return
- Sharpe ratio
- VaR
- Max drawdown

## 4.2 Create Risk Explainer Prompt Template
Prompt must instruct AI to:
- Explain in professional tone
- Identify weaknesses
- Suggest allocation improvements
- Mention downside risks clearly

## 4.3 Display AI Output
- Render formatted markdown
- Show risk warnings in highlighted cards

Ensure response is structured (bullet points preferred).

---

# STEP 5 – Authentication & Persistence (Week 4–5)

## 5.1 Implement Auth
- Email/password or OAuth
- Protect dashboard routes

## 5.2 Save Strategy to Database
Store:
- Allocation JSON
- Metrics
- Simulation timestamp

## 5.3 Strategy History Page
User can:
- View past simulations
- Compare metrics
- Delete strategies

---

# STEP 6 – Leaderboard System (Week 6)

## 6.1 Define Ranking Formula
Primary ranking metric:
- Sharpe ratio = (mean portfolio return - risk-free rate) / standard deviation

Computation notes:
- Use annualized returns from Monte Carlo simulation
- Risk-free rate default: 4% (configurable)
- Higher Sharpe ranks higher

Tie-breakers (in order):
- Lower max drawdown
- Lower VaR (5% percentile)

## 6.2 Create Leaderboard Page
Display:
- Rank
- Username
- Sharpe ratio
- Expected return

Add pagination for scalability.

---

# STEP 7 – AI Shock Event Engine (Week 6–7)

## 7.1 Define Shock Parameters
Each shock modifies:
- Mean return
- Volatility
- Correlation

## 7.2 AI Shock Generator
Prompt AI to generate:
- Shock title
- Description
- Market impact explanation
- Parameter modifiers

## 7.3 Apply Shock to Simulation
Modify base assumptions before running Monte Carlo.

Mark one shock as active per week.

---

# STEP 8 – Multi-Agent Debate System (Week 8–10)

## 8.1 Define Agent Personalities
Conservative Investor:
- Focus on downside protection
- Preference for low volatility, capital preservation
- Emphasize drawdowns, worst-case scenarios, liquidity
- Suggest defensive reallocations and hedges

Growth Investor:
- Focus on CAGR and long-term compounding
- Tolerates higher volatility if expected return is strong
- Emphasize upside capture, innovation exposure
- Suggest aggressive reallocations toward growth assets

Risk Manager:
- Focus on VaR, CVaR, and tail risk
- Stress-test sensitivity to shocks and correlations
- Flag concentration risk and hidden leverage
- Suggest risk limits and diversification rules

## 8.2 Sequential Agent Calls
1. Send strategy metrics to Agent 1
2. Feed response into Agent 2
3. Feed both into Agent 3

## 8.3 Structured Debate Output
Return format:
- Opening statements
- Counter arguments
- Final recommendation

Render in chat-style UI.

---

# STEP 9 – Optimization & Scaling (Week 10–11)

- Add loading skeletons
- Optimize simulation performance
- Cache results
- Add rate limiting for AI calls
- Add error handling

---

# STEP 10 – Deployment (Week 11–12)

## 10.1 Deployment Stack
- Vercel (frontend + API routes)
- Supabase (PostgreSQL + Auth + Row Level Security)
- Railway (optional: background workers, cron jobs, or dedicated API server)
- Storage: Supabase Storage (user exports, charts)

## 10.2 Environment Setup
- Secure API keys
- Setup production database

## 10.3 Monitoring
- Add logging
- Track simulation usage
- Monitor AI cost

---

# FINAL VALIDATION CHECKLIST

Before launch ensure:

- Monte Carlo engine produces stable results
- Monte Carlo validation: run 3 fixed seeds and verify expected return, Sharpe, and VaR stay within defined tolerances
- Monte Carlo validation: run 3 random seeds and confirm metric variance stays within defined tolerances
- AI responses are structured and useful
- AI output validation: response uses the required sections and bullet points (no free-form paragraphs)
- AI output validation: includes at least 3 concrete improvement suggestions tied to metrics
- Leaderboard ranks correctly
- Leaderboard validation: rank order matches Sharpe ratio primary sort, then max drawdown, then VaR
- Shock events modify outcomes visibly
- Shock validation: at least one metric (expected return, volatility, or VaR) shifts beyond tolerance after shock applied
- No allocation exceeds 100%
- Allocation validation: hard server-side guard rejects totals > 100 and < 100 where strict equality is required
- All routes protected
- Route protection validation: unauthenticated requests return 401/403 for every protected API route

---

# Improvements and Clarifications

This section captures recommended upgrades and clarifications identified during a roadmap review.

## Product and Scope
- Add explicit target user personas (e.g., MBA students, finance analysts, retail investors) to guide UX depth and analytics complexity.
- Clarify portfolio horizon (1-year vs multi-year) and rebalancing cadence.
- Define whether allocations must be integer percentages or allow decimals.

## Quant and Modeling
- Add CVaR (Expected Shortfall) alongside VaR for tail-risk sensitivity.
- Add minimum/maximum allocation constraints per asset (configurable rules).
- Document return distribution choice (normal vs lognormal) and justify.
- Add correlation matrix input source and default calibration approach.
- Support seeded runs for reproducible simulations and validation.
- Add stress scenarios with deterministic shocks (not only stochastic).

## Data and Assumptions
- Centralize asset assumptions in a config file with versioning.
- Log assumptions and shock parameters per run for auditability.
- Add risk-free rate configuration per environment.

## AI Layer
- Add strict schema for AI responses to prevent unstructured output.
- Add prompt versioning and response metadata (model, latency, tokens).
- Add safety checks to prevent investment advice language.

## Backend and API
- Define API contracts for `strategies`, `simulations`, `leaderboard`, `ai/risk`.
- Add server-side validation for allocation totals and bounds.
- Add rate limiting and per-user quotas for AI endpoints.

## UI/UX
- Add onboarding flow that explains metrics and assumptions.
- Add an "Assumptions" panel visible on every simulation run.
- Provide a comparison view for strategy versions.

## Testing and QA
- Add unit tests for metrics (including CVaR) and Monte Carlo outputs.
- Add snapshot tests for AI response formatting.
- Add end-to-end tests for the full �allocate ? simulate ? save ? rank� flow.

## Security and Compliance
- Add PII handling policy and data retention duration.
- Add audit logging for strategy changes and leaderboard updates.

## Ops and Observability
- Add structured logging and tracing for simulations and AI calls.
- Track cost per AI call and aggregate cost per user.

---

# Development Checklist (Current Gaps)

Use this as a working checklist for what is still missing or incomplete.

## Core Simulation and Metrics
- [x] Correlation-aware Monte Carlo (Cholesky sampling in `lib/monteCarlo.ts`).
- [x] Explicit crash-regime / fat-tail modeling (configurable crash regime in `lib/assetAssumptions.ts`).
- [x] Seeded simulation runs for reproducible validation.
- [x] CVaR (Expected Shortfall) in metrics.
- [ ] Apply shock correlation shifts (currently shocks adjust means/vols only).
- [ ] Persist simulation assumptions + seed + shock id per run for auditability.
- [ ] Risk-free rate configuration wired to metrics (currently defaults to 0).

## AI Risk and Debate
- [x] Wire `/api/ai/risk` to a real LLM call (schema-validated output).
- [ ] Persist AI response metadata (model, tokens, latency) to DB or audit logs.
- [x] Implement debate agent runner API and LLM invocation.
- [x] Render debate output in UI.
- [ ] Add AI safety guardrails to prevent investment advice language (response linting + user-facing disclaimer).

## Shock Events
- [x] Shock event generator API (LLM JSON output).
- [x] Persist ShockEvents in the database.
- [x] Apply active shock in simulation flow.
- [ ] Surface active shock in UI and leaderboard context (currently only simulate page).
- [ ] Weekly rotation or reset logic for shocks (cron/worker + admin trigger).

## Strategies and Leaderboard
- [x] Strategy detail page with metrics + AI critique.
- [x] Leaderboard monthly filter via `month=YYYY-MM` query param.
- [ ] Leaderboard month selector UI + display active month in page header.
- [ ] Strategy detail enhancements: charts, shock context, and assumptions snapshot.
- [ ] Enforce allocation bounds server-side (min/max rules + total=100 validation).
- [ ] Protect dashboard/strategy routes with redirect when unauthenticated.
- [ ] Decide on `SimulationRun` model usage (currently unused in UI).

## Data, Assumptions, and Auditability
- [ ] Versioned assumptions config and per-run logging.
- [ ] Risk-free rate configuration per environment.
- [x] Audit logging for strategy changes and rank updates (strategy create/delete + leaderboard fetch).

## Testing and QA
- [x] Unit tests for metrics, Monte Carlo, prompts, and debate parsing.
- [ ] Snapshot tests for AI response formatting.
- [ ] End-to-end flow tests: allocate -> simulate -> save -> rank.
- [ ] Shock validation tests (metric deltas after shock).

## Ops and Compliance
- [ ] Monitoring for simulation latency and AI costs.
- [ ] PII retention policy and documentation.

---

# UI/UX Enhancements (Add to Backlog)

## Navigation & App Shell
- Global top nav or sidebar with active route highlighting and quick links (Simulate, Strategies, Leaderboard, Dashboard).
- Auth-aware header (user avatar, logout, session status).
- Consistent page chrome + breadcrumbs for Strategy detail.

## Simulation Experience
- Preset allocation buttons (Conservative / Balanced / Growth) with 1-click set.
- Numeric inputs alongside sliders with auto-balance and "lock" toggles per asset.
- Allocation progress bar and inline validation with actionable error copy.
- Assumptions panel: asset means/vols, correlation matrix, crash regime, and shock modifiers.
- Toggle for baseline vs active shock simulation; show delta metrics.
- Show AI response metadata (model, latency, cached badge).
- Post-run toast with "Strategy saved" + deep link to detail page.

## Analytics & Visualization
- Allocation donut + stacked bar for asset weights.
- Strategy detail charts: histogram, scenario paths, and timeline of saved strategies.
- Leaderboard row expanders to reveal allocation and risk warnings.
- Add tooltips for all metrics (Sharpe, VaR, CVaR, drawdown) with concise definitions.

## Onboarding & Education
- Guided onboarding flow explaining metrics, assumptions, and shock system.
- Inline glossary popovers and "What do these metrics mean?" drawer.
- First-run "sample strategy" to demonstrate expected output.

## Accessibility & Polishing
- Keyboard-friendly sliders + focus-visible styles.
- Color-contrast audit for dark theme and chart labels.
- Empty-state illustrations with actionable next steps.
- Loading states: lighter skeletons, optimistic UI on save.

---

# AI Implementation Prompts

Use these prompts when delegating tasks to an AI coding agent. Each prompt is scoped to a missing roadmap item.

## Correlation-Aware Monte Carlo
Prompt:
Implement correlation-aware Monte Carlo sampling in `lib/monteCarlo.ts` using `lib/correlationMatrix.ts`. Use Cholesky decomposition to generate correlated standard normals for all assets, then apply per-asset mean/volatility. Maintain existing allocation normalization and keep 10,000 iterations. Add unit tests in `lib/metrics.test.ts` or a new `lib/monteCarlo.test.ts` to verify correlation behavior (e.g., simulated correlations approximate inputs within tolerance).

## Crash Regime / Fat-Tail Modeling
Prompt:
Extend the simulation to include a crash regime (e.g., 3–5% probability) that applies a negative shock to equity/startups/crypto and increases volatility for one iteration. Make the regime configurable in `lib/assetAssumptions.ts` and include in `runMonteCarloSimulation`. Add tests validating a higher left-tail risk vs baseline.

## Seeded Simulation Runs
Prompt:
Add deterministic seeding support to `lib/monteCarlo.ts` so tests and validations can reproduce results. Accept an optional `seed` parameter and implement a seeded RNG (no external dependency). Update callers to pass seed for validation tests only.

## CVaR (Expected Shortfall)
Prompt:
Add CVaR at 95% to `lib/metrics.ts` and include it in `SimulationMetrics`. Update any UI and API types to display it and add unit tests for correctness.

## Real LLM Risk Explainer
Prompt:
Replace deterministic markdown generation in `app/api/ai/risk/route.ts` with a real OpenAI call. Enforce a strict JSON schema in the response (headings and bullet arrays), and convert it to markdown for display. Log model name, latency, and token usage in the response payload and store it if needed.

## Debate Agent Runner
Prompt:
Create an API route `app/api/ai/debate/route.ts` that accepts allocation + metrics, runs `runDebateSequence` with LLM calls, and returns structured sections. Add UI integration in `app/simulate/page.tsx` to display `AIDebatePanel` once debate results arrive.

## Shock Generator and Persistence
Prompt:
Create a ShockEvents model in `prisma/schema.prisma`, run a migration, and add an API route to generate weekly shocks using `buildShockGeneratorPrompt`. Store shocks in the database with `active` and `weekStart`. Add a method to fetch the active shock for simulations.

## Apply Shock in Simulation Flow
Prompt:
Update `app/simulate/page.tsx` to fetch the active shock from a new API route and use `runMonteCarloSimulationWithShock`. Display the shock title/summary above the charts.

## Strategy Detail Page
Prompt:
Implement `app/strategy/[id]/page.tsx` to fetch a strategy by ID, show metrics, allocation, simulation timestamp, and AI risk summary. Add a server route for strategy lookup if missing.

## Leaderboard Monthly Reset
Prompt:
Add a date filter to `app/api/leaderboard/route.ts` so it can return monthly results. Implement a `month` query param (YYYY-MM) and default to the current month.

## Audit Logging
Prompt:
Add an `AuditLog` model to Prisma for strategy creation/deletion and leaderboard updates. Log actions in the respective API routes with userId, action, and metadata.

---

END OF DOCUMENT

---

# Roadmap Update Metadata

Date: March 14, 2026

---

# Execution Prompts (New Additions From Latest Review)

Use these prompts to implement the newly identified gaps and UI/UX enhancements above.

## Apply Shock Correlation Shifts
Prompt:
Update `lib/monteCarlo.ts` to apply shock-adjusted correlation matrices when `ShockParameters` are provided. Use `applyShockToCorrelation` from `lib/shockEngine.ts`, recompute Cholesky decomposition for the shocked matrix, and ensure the simulation uses the shocked correlation only for the affected run. Add a unit test in `lib/monteCarlo.test.ts` to verify correlations shift in the expected direction.

## Persist Simulation Assumptions + Seed + Shock
Prompt:
Store simulation assumptions, seed, and shock id in the database for auditability. Update the strategy save flow (or create a new `SimulationRun`) to persist: `assumptionsVersion`, `assumptions`, `seed`, `shockId`, and `shockModifiers`. Add the fields to Prisma schema and include them in API responses where needed.

## Risk-Free Rate Configuration
Prompt:
Add `RISK_FREE_RATE` to environment configuration and pass it into `computeSimulationMetrics` in both API and UI. Update `lib/metrics.ts` callers so Sharpe uses the configured value. Add a test to validate Sharpe changes when risk-free rate is non-zero.

## Persist AI Metadata
Prompt:
Store AI response metadata (model, tokens, latency) for risk and debate in the database. Add columns or a JSON blob to the strategy record or an `AiResponseLog` table. Update `/api/ai/risk` and `/api/ai/debate` to persist metadata alongside strategy runs.

## AI Safety Guardrails
Prompt:
Add a post-response safety check that flags investment-advice language (e.g., “buy”, “sell”, “guaranteed”). If detected, replace with a neutral warning and include a disclaimer card in UI. Update prompts to discourage advice-like phrasing and add a short disclaimer banner to AI panels.

## Surface Active Shock Beyond Simulate Page
Prompt:
Expose the active shock on the leaderboard and strategy detail pages. Add a lightweight API endpoint or reuse `/api/shocks/active` to fetch shock metadata. Display the shock title and a short summary near leaderboard header and in strategy detail metadata.

## Weekly Shock Rotation
Prompt:
Add a scheduled job (cron/worker) that calls `/api/ai/shocks` weekly and sets the active shock. Ensure old shocks are deactivated and weekStart is set consistently (UTC Monday). Add a manual admin trigger route for testing.

## Leaderboard Month Selector UI
Prompt:
Update `app/leaderboard/page.tsx` with a month picker (YYYY-MM). Pass `month` query param to the API, show the active month in the header, and allow quick navigation to previous/next months.

## Strategy Detail Enhancements
Prompt:
Enhance `app/strategy/[id]/page.tsx` to include simulation charts (reuse `SimulationChart`), show active shock context, and render assumptions snapshot (means, vols, crash regime). Add a compact metrics sidebar and a “Back to History” link.

## Server-Side Allocation Validation
Prompt:
Add server-side allocation validation in `/api/strategies` and `/api/ai/*` endpoints. Enforce totals = 100 and min/max per asset. Return 400 with a clear error if invalid. Add tests for invalid allocations.

## Protect Routes With Redirect
Prompt:
Add middleware or server-side checks to redirect unauthenticated users from `/dashboard`, `/strategies`, `/strategy/[id]`, and `/leaderboard` to `/login`. Ensure API routes still return 401 JSON, not redirects.

## Decide `SimulationRun` Model Usage
Prompt:
Either wire `SimulationRun` into the simulation flow (store each run, link to strategy) or remove the model if unused. If keeping, add API endpoints and a dashboard widget showing recent runs.

---

# UI/UX Execution Prompts

## App Shell + Navigation
Prompt:
Implement a global app shell with top nav or sidebar, active route highlighting, and auth-aware user controls. Apply consistent page padding, section spacing, and breadcrumb on strategy detail.

## Preset Allocations + Slider Controls
Prompt:
Add preset buttons (Conservative / Balanced / Growth) that set allocation values. Add numeric inputs next to sliders with lock toggles per asset and an auto-balance mode.

## Allocation Validation UX
Prompt:
Add an allocation progress bar, inline error messaging, and a small “Fix allocation” helper that auto-corrects to 100% by adjusting unlocked assets.

## Assumptions Panel
Prompt:
Add a collapsible “Assumptions” panel on the simulate page showing means, volatilities, correlation matrix, crash regime, and shock modifiers.

## Baseline vs Shock Toggle
Prompt:
Add a toggle to run simulations with and without the active shock. Display delta metrics and a small comparison table.

## AI Metadata + Save Toast
Prompt:
Show AI model/latency metadata in the Risk Explainer and Debate panels. After save, show a success toast with a link to the strategy detail page.

## Allocation Visualization
Prompt:
Add an allocation donut or stacked bar chart beside sliders to visualize weights in real time.

## Strategy Detail Charts
Prompt:
Render return distribution histogram and scenario path chart on strategy detail, using saved simulation results or re-run with stored seed.

## Leaderboard Row Expanders
Prompt:
Add row expanders to reveal allocation summary and key risk warnings under each leaderboard entry.

## Metric Tooltips
Prompt:
Add tooltips for Sharpe, VaR, CVaR, drawdown, and probability of loss with concise definitions.

## Onboarding + Glossary
Prompt:
Create a first-run onboarding flow and a glossary drawer explaining metrics and assumptions with plain-language examples.

## Accessibility + Polish
Prompt:
Improve slider keyboard support, add focus-visible styles, audit dark-mode contrast, and enhance empty states with actionable next steps.
