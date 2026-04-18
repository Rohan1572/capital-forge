import type { SimulationMetrics } from "./metrics";
import {
  buildStrategyCardSubtitle,
  buildStrategyDisplayLabel,
  formatStrategyDate,
} from "./strategyPresentation";

export type PortfolioStrategySnapshot = {
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

export type RecentSimulationRunSnapshot = {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  strategyId: string | null;
  assumptionsVersion: string | null;
  seed: number | null;
  shockId: string | null;
};

export type DashboardSnapshotState =
  | {
      state: "empty";
      title: string;
      description: string;
      actions: {
        primary: string;
        secondary: string;
      };
    }
  | {
      state: "ready";
      portfolio: {
        title: string;
        subtitle: string;
        topAllocations: ReadonlyArray<readonly [string, number]>;
        totalAllocation: number;
        strategyCount: number;
        assumptionsVersionLabel: string;
      };
      performance: {
        title: string;
        metrics: ReadonlyArray<{
          label: string;
          value: string;
          detail: string;
        }>;
      };
      activity: {
        title: string;
        latestRunName: string;
        latestRunStatus: string;
        latestRunLabel: string;
        seedLabel: string;
        strategyCount: number;
        runCount: number;
        relatedStrategyHref: string | null;
      };
    };

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

export function buildDashboardSnapshotState({
  latestStrategy,
  previousStrategy,
  latestRun,
  strategyCount,
  runCount,
}: Readonly<{
  latestStrategy: PortfolioStrategySnapshot | null;
  previousStrategy: PortfolioStrategySnapshot | null;
  latestRun: RecentSimulationRunSnapshot | null;
  strategyCount: number;
  runCount: number;
}>): DashboardSnapshotState {
  if (!latestStrategy) {
    return {
      state: "empty",
      title: "No portfolio snapshot yet",
      description:
        "Save a simulation to surface your latest allocation, performance metrics, and activity here.",
      actions: {
        primary: "Run your first simulation",
        secondary: "Browse strategy history",
      },
    };
  }

  const latestMetrics = getSimulationMetrics(latestStrategy);
  const previousMetrics = getSimulationMetrics(previousStrategy);
  const topAllocations = getTopAllocationEntries(latestStrategy.allocation);
  const totalAllocation = sumAllocation(latestStrategy.allocation);

  return {
    state: "ready",
    portfolio: {
      title: buildStrategyDisplayLabel(latestStrategy),
      subtitle: buildStrategyCardSubtitle(latestStrategy),
      topAllocations,
      totalAllocation,
      strategyCount,
      assumptionsVersionLabel: latestStrategy.assumptionsVersion
        ? latestStrategy.assumptionsVersion
        : "No assumptions version recorded",
    },
    performance: {
      title: "Recent Performance",
      metrics: latestMetrics
        ? [
            {
              label: "Expected Return",
              value: formatPercent(latestMetrics.expectedReturn),
              detail: metricDelta(
                latestMetrics.expectedReturn,
                previousMetrics?.expectedReturn ?? null,
                formatPercent,
              ),
            },
            {
              label: "Sharpe Ratio",
              value: formatNumber(latestMetrics.sharpeRatio),
              detail: metricDelta(
                latestMetrics.sharpeRatio,
                previousMetrics?.sharpeRatio ?? null,
                formatNumber,
              ),
            },
            {
              label: "Max Drawdown",
              value: formatPercent(latestMetrics.maxDrawdown),
              detail: metricDelta(
                latestMetrics.maxDrawdown,
                previousMetrics?.maxDrawdown ?? null,
                formatPercent,
                false,
              ),
            },
          ]
        : [
            {
              label: "Unavailable",
              value: "No metrics",
              detail: "Performance metrics are unavailable for this saved strategy.",
            },
          ],
    },
    activity: {
      title: "Recent Activity",
      latestRunName: latestRun?.name ?? "No simulation runs recorded yet.",
      latestRunStatus: latestRun?.status ?? "unavailable",
      latestRunLabel: latestRun
        ? formatStrategyDate(latestRun.createdAt)
        : "No recent run available.",
      seedLabel:
        latestRun && typeof latestRun.seed === "number"
          ? `Seed ${latestRun.seed}`
          : "Seed unavailable",
      strategyCount,
      runCount,
      relatedStrategyHref: latestRun?.strategyId ? `/strategy/${latestRun.strategyId}` : null,
    },
  };
}
