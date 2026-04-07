import type { Allocation } from "./monteCarlo";
import { runMonteCarloSimulation, runMonteCarloSimulationWithShock } from "./monteCarlo";
import { parseSimulationAssumptionsSnapshot, parseShockModifiersSnapshot } from "./simulationAudit";

type StrategyReplayInput = {
  allocation: unknown;
  assumptions?: unknown;
  seed?: number | null;
  shockId?: string | null;
  shockModifiers?: unknown;
  simulationResults?: unknown;
  simulationSeed?: number | null;
  simulationMode?: string | null;
  simulationShock?: unknown;
  assumptionsVersion?: string | null;
};

export type ReplaySeriesInfo = {
  values: number[];
  sourceLabel: string;
};

export type ReplaySeriesLoadResult = {
  replaySeries: ReplaySeriesInfo | null;
  warning: string | null;
};

function countInvalidEntries(values: readonly unknown[]) {
  let invalidCount = 0;

  for (const entry of values) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      invalidCount += 1;
    }
  }

  return invalidCount;
}

function parseSavedSimulationResults(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return null;

  const values = value.filter(
    (entry): entry is number => typeof entry === "number" && Number.isFinite(entry),
  );

  if (values.length === 0) {
    return {
      values,
      totalCount: value.length,
      invalidCount: value.length,
    };
  }

  return {
    values,
    totalCount: value.length,
    invalidCount: countInvalidEntries(value),
  };
}

function buildPartialResultsWarning(totalCount: number, invalidCount: number) {
  if (invalidCount <= 0) return null;

  const validCount = totalCount - invalidCount;
  const invalidLabel = invalidCount === 1 ? "entry" : "entries";
  const validLabel = validCount === 1 ? "outcome" : "outcomes";

  return `Saved simulation results contained ${invalidCount} invalid ${invalidLabel}. Showing ${validCount} valid ${validLabel} from the stored array.`;
}

function buildMalformedResultsWarning(hasSeed: boolean) {
  if (hasSeed) {
    return "Saved simulation results were malformed, so this page was replayed from the stored seed and assumptions snapshot instead.";
  }

  return "Saved simulation results were malformed and could not be replayed.";
}

function resolveSeed(strategy: StrategyReplayInput) {
  if (typeof strategy.seed === "number") {
    return strategy.seed;
  }

  if (typeof strategy.simulationSeed === "number") {
    return strategy.simulationSeed;
  }

  return null;
}

function resolveShock(strategy: StrategyReplayInput) {
  return parseShockModifiersSnapshot(strategy.shockModifiers ?? strategy.simulationShock);
}

export function loadReplaySeries(strategy: StrategyReplayInput): ReplaySeriesLoadResult {
  const savedResults = parseSavedSimulationResults(strategy.simulationResults);
  if (savedResults?.values.length) {
    const warning = buildPartialResultsWarning(savedResults.totalCount, savedResults.invalidCount);

    return {
      replaySeries: {
        values: savedResults.values,
        sourceLabel: warning ? "Partial saved simulation results" : "Saved simulation results",
      },
      warning,
    };
  }

  const seed = resolveSeed(strategy);
  const assumptions = parseSimulationAssumptionsSnapshot(strategy.assumptions);
  const shock = resolveShock(strategy);
  const assumptionsLabel = strategy.assumptionsVersion ?? "stored assumptions";
  const malformedWarning =
    Array.isArray(strategy.simulationResults) && strategy.simulationResults.length > 0
      ? buildMalformedResultsWarning(seed !== null)
      : null;

  if (seed === null) {
    return {
      replaySeries: null,
      warning: malformedWarning,
    };
  }

  const canUseShock =
    Boolean(shock) &&
    (strategy.shockId !== null ||
      strategy.simulationMode === "shocked" ||
      strategy.shockModifiers != null ||
      strategy.simulationShock != null);

  if (canUseShock && shock) {
    return {
      replaySeries: {
        values: runMonteCarloSimulationWithShock(
          strategy.allocation as Allocation,
          shock,
          assumptions?.assetReturnAssumptions,
          assumptions?.simulationRegimes,
          seed,
        ),
        sourceLabel: `Replayed from ${assumptionsLabel} with shock`,
      },
      warning: malformedWarning,
    };
  }

  return {
    replaySeries: {
      values: runMonteCarloSimulation(
        strategy.allocation as Allocation,
        assumptions?.assetReturnAssumptions,
        assumptions?.simulationRegimes,
        seed,
      ),
      sourceLabel: `Replayed from ${assumptionsLabel}`,
    },
    warning: malformedWarning,
  };
}
