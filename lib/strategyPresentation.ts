import type { Allocation } from "./monteCarlo";
import type { SimulationMetrics } from "./metrics";

export type StrategyPresentationRecord = {
  id: string;
  createdAt: Date | string;
  simulationMode?: string | null;
  shockId?: string | null;
  simulationSeed?: number | null;
  seed?: number | null;
};

export function formatStrategyDate(value: Date | string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildStrategyDisplayLabel(strategy: StrategyPresentationRecord) {
  const mode = strategy.simulationMode === "shocked" ? "Shocked" : "Baseline";
  const shock = strategy.shockId ? " | Shock" : "";
  return `${mode} run | ${formatStrategyDate(strategy.createdAt)}${shock}`;
}

export function buildStrategyCardSubtitle(strategy: StrategyPresentationRecord) {
  const seed = strategy.seed ?? strategy.simulationSeed;
  const seedLabel = typeof seed === "number" ? `Seed ${seed}` : "Seed unavailable";
  return `${seedLabel} | ${strategy.id.slice(0, 8)}`;
}

export function formatStrategyExportFilename(strategy: StrategyPresentationRecord) {
  return `strategy-${strategy.id.slice(0, 8)}.json`;
}

export function buildStrategyExportPayload(params: {
  strategy: StrategyPresentationRecord & {
    allocation: Allocation;
    metrics: SimulationMetrics;
    assumptionsVersion?: string | null;
    assumptions?: unknown;
    shockModifiers?: unknown;
    simulationResults?: unknown;
    simulationShock?: unknown;
  };
  note?: string | null;
}) {
  return {
    exportedAt: new Date().toISOString(),
    note: params.note ?? null,
    strategy: params.strategy,
  };
}
