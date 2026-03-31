import {
  assetReturnAssumptions,
  simulationRegimes,
  type AssetReturnAssumptions,
  type SimulationRegimes,
} from "./assetAssumptions";

export const SIMULATION_CONFIG_VERSION = "2026-04-01";

export type SimulationConfigSnapshot = {
  version: string;
  assetReturnAssumptions: AssetReturnAssumptions;
  simulationRegimes: SimulationRegimes;
};

export type SimulationConfigMetadata = {
  version: string;
  assumptionsVersion: string | null;
  assumptions: unknown;
};

export function buildSimulationConfigSnapshot(): SimulationConfigSnapshot {
  return {
    version: SIMULATION_CONFIG_VERSION,
    assetReturnAssumptions,
    simulationRegimes,
  };
}

export function buildSimulationConfigMetadata(
  assumptionsVersion: string | null,
  assumptions: unknown,
): SimulationConfigMetadata {
  return {
    version: SIMULATION_CONFIG_VERSION,
    assumptionsVersion,
    assumptions,
  };
}
