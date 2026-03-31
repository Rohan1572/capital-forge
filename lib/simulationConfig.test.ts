import { describe, expect, it } from "vitest";
import {
  SIMULATION_CONFIG_VERSION,
  buildSimulationConfigMetadata,
  buildSimulationConfigSnapshot,
} from "./simulationConfig";

describe("simulationConfig", () => {
  it("exposes a versioned config snapshot", () => {
    const snapshot = buildSimulationConfigSnapshot();

    expect(snapshot.version).toBe(SIMULATION_CONFIG_VERSION);
    expect(snapshot.assetReturnAssumptions.equity.mean).toBeGreaterThan(0);
    expect(snapshot.simulationRegimes.crash.probability).toBeGreaterThan(0);
  });

  it("builds response metadata from persisted assumptions", () => {
    const metadata = buildSimulationConfigMetadata("2026-04-01", { example: true });

    expect(metadata.version).toBe(SIMULATION_CONFIG_VERSION);
    expect(metadata.assumptionsVersion).toBe("2026-04-01");
    expect(metadata.assumptions).toEqual({ example: true });
  });
});
