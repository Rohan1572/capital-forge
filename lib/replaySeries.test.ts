import { beforeEach, describe, expect, it, vi } from "vitest";

const runMonteCarloSimulation = vi.hoisted(() => vi.fn());
const runMonteCarloSimulationWithShock = vi.hoisted(() => vi.fn());

vi.mock("./monteCarlo", () => ({
  runMonteCarloSimulation,
  runMonteCarloSimulationWithShock,
}));

import { loadReplaySeries } from "./replaySeries";

describe("loadReplaySeries", () => {
  beforeEach(() => {
    runMonteCarloSimulation.mockReset();
    runMonteCarloSimulationWithShock.mockReset();
    runMonteCarloSimulation.mockReturnValue([0.42, -0.18, 0.11]);
    runMonteCarloSimulationWithShock.mockReturnValue([0.21, -0.07, 0.04]);
  });

  it("keeps valid saved simulation results intact", () => {
    const result = loadReplaySeries({
      allocation: { equity: 35, bonds: 35, cash: 30 },
      simulationResults: [0.1, -0.2, 0.3],
    });

    expect(result).toEqual({
      replaySeries: {
        values: [0.1, -0.2, 0.3],
        sourceLabel: "Saved simulation results",
      },
      warning: null,
    });
    expect(runMonteCarloSimulation).not.toHaveBeenCalled();
    expect(runMonteCarloSimulationWithShock).not.toHaveBeenCalled();
  });

  it("surfaces partial saved simulation results instead of trimming them silently", () => {
    const result = loadReplaySeries({
      allocation: { equity: 35, bonds: 35, cash: 30 },
      simulationResults: [0.1, "bad", 0.3, null],
    });

    expect(result.replaySeries).toEqual({
      values: [0.1, 0.3],
      sourceLabel: "Partial saved simulation results",
    });
    expect(result.warning).toContain("2 invalid entries");
    expect(result.warning).toContain("2 valid outcomes");
    expect(runMonteCarloSimulation).not.toHaveBeenCalled();
    expect(runMonteCarloSimulationWithShock).not.toHaveBeenCalled();
  });

  it("replays from the stored seed when saved results are malformed", () => {
    const result = loadReplaySeries({
      allocation: { equity: 35, bonds: 35, cash: 30 },
      assumptionsVersion: "2026-03-31",
      seed: 123,
      simulationResults: ["bad", undefined],
    });

    expect(result.replaySeries).toEqual({
      values: [0.42, -0.18, 0.11],
      sourceLabel: "Replayed from 2026-03-31",
    });
    expect(result.warning).toContain("malformed");
    expect(runMonteCarloSimulation).toHaveBeenCalledTimes(1);
    expect(runMonteCarloSimulation).toHaveBeenCalledWith(
      { equity: 35, bonds: 35, cash: 30 },
      undefined,
      undefined,
      123,
    );
    expect(runMonteCarloSimulationWithShock).not.toHaveBeenCalled();
  });

  it("reports malformed results when no seed is available", () => {
    const result = loadReplaySeries({
      allocation: { equity: 35, bonds: 35, cash: 30 },
      simulationResults: ["bad", undefined],
    });

    expect(result.replaySeries).toBeNull();
    expect(result.warning).toContain("malformed");
    expect(runMonteCarloSimulation).not.toHaveBeenCalled();
    expect(runMonteCarloSimulationWithShock).not.toHaveBeenCalled();
  });
});
