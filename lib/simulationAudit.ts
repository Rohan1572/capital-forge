import {
  type AssetReturnAssumption,
  type AssetReturnAssumptions,
  type SimulationRegimes,
} from "./assetAssumptions";
import type { ShockParameters } from "./shockEngine";
import {
  buildSimulationConfigSnapshot,
  SIMULATION_CONFIG_VERSION,
  type SimulationConfigSnapshot,
} from "./simulationConfig";

export const SIMULATION_ASSUMPTIONS_VERSION = SIMULATION_CONFIG_VERSION;

export type SimulationAssumptionsSnapshot = {
  assetReturnAssumptions: AssetReturnAssumptions;
  simulationRegimes: SimulationConfigSnapshot["simulationRegimes"];
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

function parseAssetReturnAssumption(value: unknown): AssetReturnAssumption | null {
  if (!isRecord(value) || !isFiniteNumber(value.mean) || !isFiniteNumber(value.volatility)) {
    return null;
  }

  return {
    mean: value.mean,
    volatility: value.volatility,
  };
}

export function buildSimulationAssumptionsSnapshot(): SimulationAssumptionsSnapshot {
  const snapshot = buildSimulationConfigSnapshot();
  return {
    assetReturnAssumptions: snapshot.assetReturnAssumptions,
    simulationRegimes: snapshot.simulationRegimes,
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

  const assumptions = value;

  if (!isRecord(assumptions.assetReturnAssumptions) || !isRecord(assumptions.simulationRegimes)) {
    return null;
  }

  const equity = parseAssetReturnAssumption(assumptions.assetReturnAssumptions.equity);
  const startups = parseAssetReturnAssumption(assumptions.assetReturnAssumptions.startups);
  const bonds = parseAssetReturnAssumption(assumptions.assetReturnAssumptions.bonds);
  const gold = parseAssetReturnAssumption(assumptions.assetReturnAssumptions.gold);
  const crypto = parseAssetReturnAssumption(assumptions.assetReturnAssumptions.crypto);
  const cash = parseAssetReturnAssumption(assumptions.assetReturnAssumptions.cash);

  if (!equity || !startups || !bonds || !gold || !crypto || !cash) {
    return null;
  }

  const crash = assumptions.simulationRegimes;
  if (
    !isRecord(crash) ||
    !isFiniteNumber(crash.probability) ||
    !isFiniteNumber(crash.volatilityMultiplier)
  ) {
    return null;
  }

  if (!isRecord(crash.shocks)) return null;

  return {
    assetReturnAssumptions: {
      equity,
      startups,
      bonds,
      gold,
      crypto,
      cash,
    },
    simulationRegimes: {
      crash: {
        probability: crash.probability,
        volatilityMultiplier: crash.volatilityMultiplier,
        shocks: crash.shocks as SimulationRegimes["crash"]["shocks"],
      },
    },
  };
}

function isNumericRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every(isFiniteNumber);
}

function isNestedNumericRecord(value: unknown): value is Record<string, Record<string, number>> {
  return isRecord(value) && Object.values(value).every(isNumericRecord);
}

export function parseShockModifiersSnapshot(value: unknown): ShockParameters | null {
  if (!isRecord(value)) return null;

  const record = value;
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

  const meanShiftByAsset = isNumericRecord(record.meanShiftByAsset)
    ? record.meanShiftByAsset
    : undefined;
  const volatilityMultiplierByAsset = isNumericRecord(record.volatilityMultiplierByAsset)
    ? record.volatilityMultiplierByAsset
    : undefined;
  const correlationShiftByAsset = isNestedNumericRecord(record.correlationShiftByAsset)
    ? record.correlationShiftByAsset
    : undefined;

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    meanShift: record.meanShift,
    volatilityMultiplier: record.volatilityMultiplier,
    correlationShift: record.correlationShift,
    meanShiftByAsset,
    volatilityMultiplierByAsset,
    correlationShiftByAsset,
  };
}
