import {
  assetReturnAssumptions,
  simulationRegimes,
  type AssetReturnAssumptions,
  type SimulationRegimes,
} from "@/lib/assetAssumptions";
import type { ShockParameters } from "@/lib/shockEngine";

export const SIMULATION_ASSUMPTIONS_VERSION = "2026-03-31";

export type SimulationAssumptionsSnapshot = {
  assetReturnAssumptions: AssetReturnAssumptions;
  simulationRegimes: SimulationRegimes;
};

export type SimulationAuditSnapshot = {
  assumptionsVersion: string;
  assumptions: SimulationAssumptionsSnapshot;
  seed: number | null;
  shockId: string | null;
  shockModifiers: ShockParameters | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function buildSimulationAssumptionsSnapshot(): SimulationAssumptionsSnapshot {
  return {
    assetReturnAssumptions,
    simulationRegimes,
  };
}

export function buildSimulationAuditSnapshot(
  seed: number,
  shockModifiers: ShockParameters | null,
): SimulationAuditSnapshot {
  return {
    assumptionsVersion: SIMULATION_ASSUMPTIONS_VERSION,
    assumptions: buildSimulationAssumptionsSnapshot(),
    seed,
    shockId: shockModifiers?.id ?? null,
    shockModifiers,
  };
}

export function parseSimulationAssumptionsSnapshot(
  value: unknown,
): SimulationAssumptionsSnapshot | null {
  if (!isRecord(value)) return null;

  const assumptions = value as {
    assetReturnAssumptions?: unknown;
    simulationRegimes?: unknown;
  };

  if (!isRecord(assumptions.assetReturnAssumptions) || !isRecord(assumptions.simulationRegimes)) {
    return null;
  }

  const assetKeys = Object.keys(assetReturnAssumptions) as (keyof AssetReturnAssumptions)[];
  for (const asset of assetKeys) {
    const candidate = assumptions.assetReturnAssumptions[asset];
    if (
      !isRecord(candidate) ||
      !isFiniteNumber(candidate.mean) ||
      !isFiniteNumber(candidate.volatility)
    ) {
      return null;
    }
  }

  const crash = (assumptions.simulationRegimes as Record<string, unknown>).crash;
  if (
    !isRecord(crash) ||
    !isFiniteNumber(crash.probability) ||
    !isFiniteNumber(crash.volatilityMultiplier)
  ) {
    return null;
  }

  if (!isRecord(crash.shocks)) return null;

  return assumptions as SimulationAssumptionsSnapshot;
}

export function parseShockModifiersSnapshot(value: unknown): ShockParameters | null {
  if (!isRecord(value)) return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    typeof record.description !== "string" ||
    !isFiniteNumber(record.meanShift) ||
    !isFiniteNumber(record.volatilityMultiplier) ||
    !isFiniteNumber(record.correlationShift)
  ) {
    return null;
  }

  return record as unknown as ShockParameters;
}
