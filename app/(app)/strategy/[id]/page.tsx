import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MetricLabel } from "@/components/MetricLabel";
import { RiskExplainerPanel } from "@/components/RiskExplainerPanel";
import { SimulationChart } from "@/components/SimulationChart";
import type { Allocation } from "@/lib/monteCarlo";

import type { SimulationMetrics } from "@/lib/metrics";
import type { ShockParameters } from "@/lib/shockEngine";
import { loadReplaySeries as loadStrategyReplaySeries } from "@/lib/replaySeries";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  parseShockModifiersSnapshot,
  parseSimulationAssumptionsSnapshot,
} from "@/lib/simulationAudit";

type StrategyPageProps = {
  params: Promise<{ id: string }>;
};

type AiRiskMeta = {
  model: string;
  latencyMs: number;
  cached?: boolean;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

type StrategyRecord = {
  id: string;
  createdAt: Date;
  allocation: unknown;
  metrics: unknown;
  assumptionsVersion?: string | null;
  assumptions?: unknown;
  seed?: number | null;
  shockId?: string | null;
  shockModifiers?: unknown;
  simulationResults?: unknown;
  simulationSeed?: number | null;
  simulationMode?: string | null;
  simulationShock?: unknown;
};

function formatPercent(value: number, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPercent(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

function formatMultiplier(value: number) {
  return `${value.toFixed(2)}x`;
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

function formatDate(value: Date) {
  return value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function formatAssetName(asset: string) {
  return asset.charAt(0).toUpperCase() + asset.slice(1);
}

function allocationSummary(allocation: Allocation) {
  return Object.entries(allocation)
    .map(([key, value]) => `${key}: ${value}%`)
    .join(" | ");
}

function parseShockSnapshot(value: unknown): ShockParameters | null {
  return parseShockModifiersSnapshot(value);
}

async function loadAiRiskSummary(allocation: Allocation, metrics: SimulationMetrics) {
  try {
    const headerStore = await headers();
    const host = headerStore.get("host") ?? "localhost:3000";
    const proto = headerStore.get("x-forwarded-proto") ?? "http";
    const response = await fetch(`${proto}://${host}/api/ai/risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allocation, metrics }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: {
        markdown?: string;
        meta?: AiRiskMeta;
      };
    };

    return {
      markdown: payload.data?.markdown ?? null,
      meta: payload.data?.meta ?? null,
    };
  } catch (error) {
    console.error("Failed to load AI risk summary", error);
    return null;
  }
}

function loadReplaySeries(strategy: StrategyRecord) {
  return loadStrategyReplaySeries(strategy);
}
function MetricRow({
  metric,
  label,
  value,
}: Readonly<{
  metric:
    | "sharpeRatio"
    | "maxDrawdown"
    | "valueAtRisk5"
    | "conditionalValueAtRisk95"
    | "probabilityOfLossOver30";
  label: string;
  value: string;
}>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2">
      <MetricLabel
        metric={metric}
        label={label}
        className="text-[11px] uppercase tracking-wide text-zinc-400"
      />
      <span className="text-sm font-medium text-zinc-100">{value}</span>
    </div>
  );
}

function AssumptionsCard({
  assumptions,
}: Readonly<{
  assumptions: ReturnType<typeof parseSimulationAssumptionsSnapshot>;
}>) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
      <h2 className="text-sm uppercase tracking-wide text-zinc-500">Assumptions Snapshot</h2>
      {assumptions ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(assumptions.assetReturnAssumptions).map(([asset, assumption]) => (
              <div key={asset} className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {formatAssetName(asset)}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-300">
                  <div>
                    <p className="text-zinc-500">Mean</p>
                    <p className="font-medium text-zinc-100">{formatPercent(assumption.mean)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Volatility</p>
                    <p className="font-medium text-zinc-100">
                      {formatPercent(assumption.volatility)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Crash Regime
            </p>
            <div className="mt-3 grid gap-3 text-sm text-zinc-200">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Probability</span>
                <span className="font-medium text-zinc-100">
                  {formatPercent(assumptions.simulationRegimes.crash.probability)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Volatility Multiplier</span>
                <span className="font-medium text-zinc-100">
                  {formatMultiplier(assumptions.simulationRegimes.crash.volatilityMultiplier)}
                </span>
              </div>
              <div className="space-y-2">
                <span className="block text-zinc-500">Crash Shocks</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(assumptions.simulationRegimes.crash.shocks).map(
                    ([asset, shock]) => (
                      <span
                        key={asset}
                        className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
                      >
                        {formatAssetName(asset)} {formatSignedPercent(shock)}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">No saved assumptions snapshot is available.</p>
      )}
    </article>
  );
}

function ShockContextCard({ shock }: Readonly<{ shock: ShockParameters | null }>) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
      <h2 className="text-sm uppercase tracking-wide text-zinc-500">Active Shock Context</h2>
      {shock ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-lg font-semibold text-zinc-100">{shock.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{shock.description}</p>
          </div>

          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Shock ID</dt>
              <dd className="font-medium text-zinc-100">{shock.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Mean Shift</dt>
              <dd className="font-medium text-zinc-100">{formatSignedPercent(shock.meanShift)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Volatility Multiplier</dt>
              <dd className="font-medium text-zinc-100">
                {formatMultiplier(shock.volatilityMultiplier)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Correlation Shift</dt>
              <dd className="font-medium text-zinc-100">
                {formatSignedPercent(shock.correlationShift)}
              </dd>
            </div>
          </dl>

          {shock.meanShiftByAsset ||
          shock.volatilityMultiplierByAsset ||
          shock.correlationShiftByAsset ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Asset Overrides
              </p>
              <div className="space-y-2 text-xs text-zinc-300">
                {shock.meanShiftByAsset ? (
                  <div>
                    <p className="text-zinc-500">Mean Shift</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(shock.meanShiftByAsset).map(([asset, value]) => (
                        <span
                          key={asset}
                          className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1"
                        >
                          {formatAssetName(asset)} {formatSignedPercent(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {shock.volatilityMultiplierByAsset ? (
                  <div>
                    <p className="text-zinc-500">Volatility Multiplier</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(shock.volatilityMultiplierByAsset).map(([asset, value]) => (
                        <span
                          key={asset}
                          className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1"
                        >
                          {formatAssetName(asset)} {formatMultiplier(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {shock.correlationShiftByAsset ? (
                  <div>
                    <p className="text-zinc-500">Correlation Shift</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(shock.correlationShiftByAsset).map(([asset, shifts]) => {
                        const entries = Object.entries(shifts ?? {});
                        return entries.map(([relatedAsset, value]) => (
                          <span
                            key={`${asset}-${relatedAsset}`}
                            className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1"
                          >
                            {formatAssetName(asset)} / {formatAssetName(relatedAsset)}{" "}
                            {formatSignedPercent(value)}
                          </span>
                        ));
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">
          No active shock is attached to this run. The strategy was replayed using the base
          assumptions snapshot.
        </p>
      )}
    </article>
  );
}

function MetricsSidebar({ metrics }: Readonly<{ metrics: SimulationMetrics }>) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
      <h2 className="text-sm uppercase tracking-wide text-zinc-500">Metrics at a Glance</h2>
      <div className="mt-4 space-y-2">
        <MetricRow
          metric="sharpeRatio"
          label="Sharpe Ratio"
          value={formatNumber(metrics.sharpeRatio)}
        />
        <MetricRow
          metric="maxDrawdown"
          label="Max Drawdown"
          value={formatPercent(metrics.maxDrawdown)}
        />
        <MetricRow
          metric="valueAtRisk5"
          label="VaR (5%)"
          value={formatPercent(metrics.valueAtRisk5)}
        />
        <MetricRow
          metric="conditionalValueAtRisk95"
          label="CVaR (95%)"
          value={formatPercent(metrics.conditionalValueAtRisk95)}
        />
        <MetricRow
          metric="probabilityOfLossOver30"
          label="Loss > 30%"
          value={formatPercent(metrics.probabilityOfLossOver30)}
        />
      </div>
    </article>
  );
}

export default async function StrategyPage({ params }: Readonly<StrategyPageProps>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const strategy = (await prisma.strategy.findFirst({
    where: {
      id,
      userId: user.id,
    },
  })) as StrategyRecord | null;

  if (!strategy) {
    notFound();
  }

  const allocation = strategy.allocation as Allocation;
  const metrics = strategy.metrics as SimulationMetrics;
  const aiRiskSummary = await loadAiRiskSummary(allocation, metrics);
  const { replaySeries, warning: replayWarning } = loadReplaySeries(strategy);
  const assumptionsSnapshot = parseSimulationAssumptionsSnapshot(strategy.assumptions);
  const shockContext = parseShockSnapshot(strategy.shockModifiers ?? strategy.simulationShock);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/strategies" className="transition hover:text-zinc-200">
              Strategies
            </Link>
          </li>
          <li className="text-zinc-600">/</li>
          <li className="text-zinc-200">Strategy Snapshot</li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Strategy Snapshot</h1>
          <p className="text-zinc-400">
            Simulation run on {formatDate(strategy.createdAt)} | ID {strategy.id}
          </p>
        </div>
        <Link
          href="/strategies"
          className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Back to History
        </Link>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="text-sm uppercase tracking-wide text-zinc-500">Allocation Mix</h2>
              <p className="mt-3 text-sm text-zinc-200">{allocationSummary(allocation)}</p>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="text-sm uppercase tracking-wide text-zinc-500">Run Context</h2>
              <div className="mt-3 grid gap-3 text-sm text-zinc-200">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Assumptions Version</span>
                  <span className="font-medium text-zinc-100">
                    {strategy.assumptionsVersion ?? "Legacy"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Seed</span>
                  <span className="font-medium text-zinc-100">
                    {strategy.seed ?? strategy.simulationSeed ?? "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Shock</span>
                  <span className="font-medium text-zinc-100">
                    {strategy.shockId ?? shockContext?.id ?? "None"}
                  </span>
                </div>
              </div>
            </article>
          </section>

          {replaySeries ? (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Return Distribution</h2>
                  <p className="text-sm text-zinc-400">
                    {replaySeries.sourceLabel} used to render the distribution histogram and
                    percentile projection.
                  </p>
                </div>
              </header>
              {replayWarning ? (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
                  {replayWarning}
                </div>
              ) : null}
              <div className="mt-6">
                <SimulationChart values={replaySeries.values} />
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">No replay data yet</h2>
                  <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                    This strategy was saved before replay artifacts were available. Run a fresh
                    simulation to capture the full distribution and projection charts.
                  </p>
                  {replayWarning ? (
                    <p className="mt-3 max-w-2xl rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-sm text-amber-100">
                      {replayWarning}
                    </p>
                  ) : null}
                </div>
                <Link
                  href="/simulate"
                  className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                >
                  Run simulation
                </Link>
              </div>
            </section>
          )}

          {aiRiskSummary?.markdown ? (
            <RiskExplainerPanel
              markdown={aiRiskSummary.markdown}
              meta={aiRiskSummary.meta ?? undefined}
            />
          ) : (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-300">
              AI risk summary is unavailable right now.
            </section>
          )}
        </div>

        <aside className="space-y-4 self-start xl:sticky xl:top-6">
          <MetricsSidebar metrics={metrics} />
          <AssumptionsCard assumptions={assumptionsSnapshot} />
          <ShockContextCard shock={shockContext} />
        </aside>
      </div>
    </>
  );
}
