import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Allocation } from "@/lib/monteCarlo";
import { runMonteCarloSimulation, runMonteCarloSimulationWithShock } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import type { ShockParameters } from "@/lib/shockEngine";
import { RiskExplainerPanel } from "@/components/RiskExplainerPanel";
import { MetricLabel } from "@/components/MetricLabel";
import { SimulationChart } from "@/components/SimulationChart";
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

type StrategyReplayInfo = {
  values: number[];
  sourceLabel: string;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

function formatDate(value: Date) {
  return value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function allocationSummary(allocation: Allocation) {
  return Object.entries(allocation)
    .map(([key, value]) => `${key}: ${value}%`)
    .join(" | ");
}

function parseSimulationResults(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const numbers = value.filter(
    (entry): entry is number => typeof entry === "number" && Number.isFinite(entry),
  );
  return numbers.length > 0 ? numbers : null;
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

function loadReplaySeries(strategy: {
  allocation: unknown;
  assumptionsVersion?: string | null;
  assumptions?: unknown;
  seed?: number | null;
  shockId?: string | null;
  shockModifiers?: unknown;
  simulationResults?: unknown;
  simulationSeed?: number | null;
  simulationMode?: string | null;
  simulationShock?: unknown;
}): StrategyReplayInfo | null {
  const savedResults = parseSimulationResults(strategy.simulationResults);
  if (savedResults) {
    return {
      values: savedResults,
      sourceLabel: "Saved simulation results",
    };
  }

  const allocation = strategy.allocation as Allocation;
  const assumptions = parseSimulationAssumptionsSnapshot(strategy.assumptions);
  const seed =
    typeof strategy.seed === "number"
      ? strategy.seed
      : typeof strategy.simulationSeed === "number"
        ? strategy.simulationSeed
        : null;
  if (seed === null) return null;

  const shock = parseShockSnapshot(strategy.shockModifiers ?? strategy.simulationShock);
  const assumptionsLabel = strategy.assumptionsVersion ?? "stored assumptions";
  const canUseShock =
    Boolean(shock) &&
    (strategy.shockId !== null ||
      strategy.simulationMode === "shocked" ||
      strategy.shockModifiers != null ||
      strategy.simulationShock != null);

  if (canUseShock && shock) {
    return {
      values: runMonteCarloSimulationWithShock(
        allocation,
        shock,
        assumptions?.assetReturnAssumptions,
        assumptions?.simulationRegimes,
        seed,
      ),
      sourceLabel: `Replayed from ${assumptionsLabel} with shock`,
    };
  }

  return {
    values: runMonteCarloSimulation(
      allocation,
      assumptions?.assetReturnAssumptions,
      assumptions?.simulationRegimes,
      seed,
    ),
    sourceLabel: `Replayed from ${assumptionsLabel}`,
  };
}

export default async function StrategyPage({ params }: StrategyPageProps) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <>
        <h1 className="text-3xl font-semibold">Strategy Details</h1>
        <p className="text-zinc-400">You must be signed in to view this strategy.</p>
      </>
    );
  }

  const { id } = await params;
  const strategy = await prisma.strategy.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!strategy) {
    notFound();
  }

  const allocation = strategy.allocation as Allocation;
  const metrics = strategy.metrics as SimulationMetrics;
  const aiRiskSummary = await loadAiRiskSummary(allocation, metrics);
  const replaySeries = loadReplaySeries(strategy);

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

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Strategy Snapshot</h1>
        <p className="text-zinc-400">
          Simulation run on {formatDate(strategy.createdAt)} | ID {strategy.id}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500">Allocation Mix</h2>
          <p className="mt-3 text-sm text-zinc-200">{allocationSummary(allocation)}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500">Key Metrics</h2>
          <div className="mt-3 grid gap-3 text-sm text-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Expected Return</span>
              <span>{formatPercent(metrics.expectedReturn)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Volatility</span>
              <span>{formatPercent(metrics.standardDeviation)}</span>
            </div>
            <div className="flex items-center justify-between">
              <MetricLabel metric="sharpeRatio" label="Sharpe Ratio" className="text-zinc-400" />
              <span>{formatNumber(metrics.sharpeRatio)}</span>
            </div>
            <div className="flex items-center justify-between">
              <MetricLabel metric="maxDrawdown" label="Max Drawdown" className="text-zinc-400" />
              <span>{formatPercent(metrics.maxDrawdown)}</span>
            </div>
            <div className="flex items-center justify-between">
              <MetricLabel metric="valueAtRisk5" label="VaR (5%)" className="text-zinc-400" />
              <span>{formatPercent(metrics.valueAtRisk5)}</span>
            </div>
            <div className="flex items-center justify-between">
              <MetricLabel
                metric="conditionalValueAtRisk95"
                label="CVaR (95%)"
                className="text-zinc-400"
              />
              <span>{formatPercent(metrics.conditionalValueAtRisk95)}</span>
            </div>
            <div className="flex items-center justify-between">
              <MetricLabel
                metric="probabilityOfLossOver30"
                label="Loss &gt; 30%"
                className="text-zinc-400"
              />
              <span>{formatPercent(metrics.probabilityOfLossOver30)}</span>
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
                {replaySeries.sourceLabel} used to render the distribution histogram and scenario
                path.
              </p>
            </div>
          </header>
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
                simulation to capture the full distribution and path charts.
              </p>
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
    </>
  );
}
