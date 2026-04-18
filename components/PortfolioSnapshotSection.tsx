import Link from "next/link";
import type { ReactNode } from "react";
import { StatePanel } from "./StatePanel";
import {
  buildStrategyCardSubtitle,
  buildStrategyDisplayLabel,
  formatStrategyDate,
} from "../lib/strategyPresentation";
import type { SimulationMetrics } from "../lib/metrics";

type PortfolioStrategySnapshot = {
  id: string;
  allocation: unknown;
  metrics: unknown;
  createdAt: Date;
  assumptionsVersion: string | null;
  seed: number | null;
  shockId: string | null;
  simulationMode: string | null;
  simulationSeed: number | null;
};

type RecentSimulationRunSnapshot = {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  strategyId: string | null;
  assumptionsVersion: string | null;
  seed: number | null;
  shockId: string | null;
};

type PortfolioSnapshotSectionProps = Readonly<{
  latestStrategy: PortfolioStrategySnapshot | null;
  previousStrategy: PortfolioStrategySnapshot | null;
  latestRun: RecentSimulationRunSnapshot | null;
  strategyCount: number;
  runCount: number;
}>;

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

function isAllocationRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSimulationMetrics(value: unknown): value is SimulationMetrics {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const metrics = value as Record<string, unknown>;

  return (
    typeof metrics.expectedReturn === "number" &&
    typeof metrics.standardDeviation === "number" &&
    typeof metrics.sharpeRatio === "number" &&
    typeof metrics.maxDrawdown === "number" &&
    typeof metrics.valueAtRisk5 === "number" &&
    typeof metrics.conditionalValueAtRisk95 === "number" &&
    typeof metrics.probabilityOfLossOver30 === "number"
  );
}

function getSimulationMetrics(strategy: PortfolioStrategySnapshot | null) {
  if (!strategy) {
    return null;
  }

  return isSimulationMetrics(strategy.metrics) ? strategy.metrics : null;
}

function sumAllocation(allocation: unknown) {
  if (!isAllocationRecord(allocation)) {
    return 0;
  }

  return Object.values(allocation).reduce((total: number, value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return total + value;
    }

    return total;
  }, 0);
}

function getTopAllocationEntries(allocation: unknown, take = 4) {
  if (!isAllocationRecord(allocation)) {
    return [];
  }

  return Object.entries(allocation)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .sort(([, left], [, right]) => (right as number) - (left as number))
    .slice(0, take)
    .map(([asset, value]) => [asset, value as number] as const);
}

function metricDelta(
  current: number,
  previous: number | null,
  formatter: (amount: number) => string,
  higherIsBetter = true,
) {
  if (previous === null) {
    return "No previous save to compare.";
  }

  const difference = current - previous;
  if (Math.abs(difference) < Number.EPSILON) {
    return "No change from the previous save.";
  }

  let direction: string;
  if (higherIsBetter) {
    direction = difference > 0 ? "up" : "down";
  } else {
    direction = difference < 0 ? "improved" : "weaker";
  }

  return `${direction} ${formatter(Math.abs(difference))} vs previous save`;
}

function MetricCard({
  label,
  value,
  detail,
}: Readonly<{
  label: string;
  value: string;
  detail: string;
}>) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function SnapshotActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/simulate"
        className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
      >
        Run simulation
      </Link>
      <Link
        href="/strategies"
        className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
      >
        View history
      </Link>
    </div>
  );
}

function CurrentPortfolioCard({
  strategy,
  topAllocations,
  totalAllocation,
  strategyCount,
}: Readonly<{
  strategy: PortfolioStrategySnapshot;
  topAllocations: ReadonlyArray<readonly [string, number]>;
  totalAllocation: number;
  strategyCount: number;
}>) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Current Portfolio</p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-100">
            {buildStrategyDisplayLabel(strategy)}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">{buildStrategyCardSubtitle(strategy)}</p>
        </div>
        <Link
          href={`/strategy/${strategy.id}`}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          Open snapshot
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {topAllocations.map(([asset, value]) => (
          <span
            key={asset}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-200"
          >
            {asset} {value.toFixed(0)}%
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Allocation total</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{totalAllocation.toFixed(0)}%</p>
          <p className="mt-1 text-xs text-zinc-500">
            Saved {formatStrategyDate(strategy.createdAt)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Strategy count</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{strategyCount}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {strategy.assumptionsVersion
              ? strategy.assumptionsVersion
              : "No assumptions version recorded"}
          </p>
        </div>
      </div>
    </article>
  );
}

function RecentPerformanceCard({
  latestMetrics,
  previousMetrics,
}: Readonly<{
  latestMetrics: SimulationMetrics | null;
  previousMetrics: SimulationMetrics | null;
}>) {
  if (!latestMetrics) {
    return (
      <article className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Recent Performance</p>
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-400">
          Performance metrics are unavailable for this saved strategy.
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Recent Performance</p>
      <div className="mt-3 space-y-3">
        <MetricCard
          label="Expected Return"
          value={formatPercent(latestMetrics.expectedReturn)}
          detail={metricDelta(
            latestMetrics.expectedReturn,
            previousMetrics?.expectedReturn ?? null,
            formatPercent,
          )}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={formatNumber(latestMetrics.sharpeRatio)}
          detail={metricDelta(
            latestMetrics.sharpeRatio,
            previousMetrics?.sharpeRatio ?? null,
            formatNumber,
          )}
        />
        <MetricCard
          label="Max Drawdown"
          value={formatPercent(latestMetrics.maxDrawdown)}
          detail={metricDelta(
            latestMetrics.maxDrawdown,
            previousMetrics?.maxDrawdown ?? null,
            formatPercent,
            false,
          )}
        />
      </div>
    </article>
  );
}

function RecentActivityCard({
  latestRun,
  strategyCount,
  runCount,
}: Readonly<{
  latestRun: RecentSimulationRunSnapshot | null;
  strategyCount: number;
  runCount: number;
}>) {
  let activityBody: ReactNode;

  if (latestRun) {
    activityBody = (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">{latestRun.name}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {latestRun.strategyId
                ? `Strategy ${latestRun.strategyId.slice(0, 8)}`
                : "Unlinked run"}
              {latestRun.assumptionsVersion ? ` | ${latestRun.assumptionsVersion}` : ""}
            </p>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
            {latestRun.status}
          </span>
        </div>
        <p className="mt-3 text-xs text-zinc-500">{formatStrategyDate(latestRun.createdAt)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {typeof latestRun.seed === "number" ? `Seed ${latestRun.seed}` : "Seed unavailable"}
          {latestRun.shockId ? ` | Shock ${latestRun.shockId}` : ""}
        </p>
        {latestRun.strategyId ? (
          <div className="mt-3">
            <Link
              href={`/strategy/${latestRun.strategyId}`}
              className="text-sm font-medium text-amber-100 transition hover:text-amber-50"
            >
              Open related strategy
            </Link>
          </div>
        ) : null}
      </div>
    );
  } else {
    activityBody = (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-400">
        No simulation runs recorded yet.
      </div>
    );
  }

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Recent Activity</p>
      <div className="mt-3 space-y-3">
        {activityBody}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Saved strategies</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{strategyCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Recorded runs</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{runCount}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyPortfolioSnapshot() {
  return (
    <StatePanel
      tone="empty"
      title="No portfolio snapshot yet"
      description="Save a simulation to surface your latest allocation, performance metrics, and activity here."
      className="mt-5"
      actions={
        <>
          <Link
            href="/simulate"
            className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
          >
            Run your first simulation
          </Link>
          <Link
            href="/strategies"
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
          >
            Browse strategy history
          </Link>
        </>
      }
    />
  );
}

export function PortfolioSnapshotSection({
  latestStrategy,
  previousStrategy,
  latestRun,
  strategyCount,
  runCount,
}: PortfolioSnapshotSectionProps) {
  const latestMetrics = getSimulationMetrics(latestStrategy);
  const previousMetrics = getSimulationMetrics(previousStrategy);
  const topAllocations = latestStrategy ? getTopAllocationEntries(latestStrategy.allocation) : [];
  const totalAllocation = latestStrategy ? sumAllocation(latestStrategy.allocation) : 0;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500">Portfolio Snapshot</h2>
          <p className="mt-1 text-sm text-zinc-400">
            A quick read on your latest saved portfolio, recent performance, and most recent
            activity.
          </p>
        </div>
        <SnapshotActions />
      </div>

      {latestStrategy ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
          <CurrentPortfolioCard
            strategy={latestStrategy}
            topAllocations={topAllocations}
            totalAllocation={totalAllocation}
            strategyCount={strategyCount}
          />
          <RecentPerformanceCard latestMetrics={latestMetrics} previousMetrics={previousMetrics} />
          <RecentActivityCard
            latestRun={latestRun}
            strategyCount={strategyCount}
            runCount={runCount}
          />
        </div>
      ) : (
        <EmptyPortfolioSnapshot />
      )}
    </section>
  );
}
