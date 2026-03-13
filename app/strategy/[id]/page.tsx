import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import { RiskExplainerPanel } from "@/components/RiskExplainerPanel";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type StrategyPageProps = {
  params: Promise<{ id: string }>;
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

    const payload = (await response.json()) as { data?: { markdown?: string } };
    return payload.data?.markdown ?? null;
  } catch (error) {
    console.error("Failed to load AI risk summary", error);
    return null;
  }
}

export default async function StrategyPage({ params }: StrategyPageProps) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-12">
        <h1 className="text-3xl font-semibold">Strategy Details</h1>
        <p className="text-zinc-400">You must be signed in to view this strategy.</p>
      </main>
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
  const aiRiskMarkdown = await loadAiRiskSummary(allocation, metrics);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12">
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
              <span className="text-zinc-400">Sharpe Ratio</span>
              <span>{formatNumber(metrics.sharpeRatio)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Max Drawdown</span>
              <span>{formatPercent(metrics.maxDrawdown)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">VaR (5%)</span>
              <span>{formatPercent(metrics.valueAtRisk5)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">CVaR (95%)</span>
              <span>{formatPercent(metrics.conditionalValueAtRisk95)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Loss &gt; 30%</span>
              <span>{formatPercent(metrics.probabilityOfLossOver30)}</span>
            </div>
          </div>
        </article>
      </section>

      {aiRiskMarkdown ? (
        <RiskExplainerPanel markdown={aiRiskMarkdown} />
      ) : (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-300">
          AI risk summary is unavailable right now.
        </section>
      )}
    </main>
  );
}
