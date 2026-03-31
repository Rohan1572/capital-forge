import { beforeEach, describe, expect, it, vi } from "vitest";

const simulationRunCreate = vi.hoisted(() => vi.fn());

vi.mock("./prisma", () => ({
  prisma: {
    simulationRun: {
      create: simulationRunCreate,
    },
  },
}));

import { createSimulationRun } from "./simulationRun";

describe("createSimulationRun", () => {
  beforeEach(() => {
    simulationRunCreate.mockReset();
    simulationRunCreate.mockResolvedValue({ id: "run-1" });
  });

  it("persists a linked simulation run", async () => {
    await createSimulationRun({
      userId: "user-1",
      strategyId: "strategy-1",
      name: "Baseline strategy run",
      status: "completed",
      assumptionsVersion: "2026-03-31",
      assumptions: { sample: true },
      seed: 123,
      shockId: "shock-1",
      shockModifiers: { meanShift: -0.05 },
      results: [0.1, -0.2, 0.3],
    });

    expect(simulationRunCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        strategyId: "strategy-1",
        name: "Baseline strategy run",
        status: "completed",
        assumptionsVersion: "2026-03-31",
        assumptions: { sample: true },
        seed: 123,
        shockId: "shock-1",
        shockModifiers: { meanShift: -0.05 },
        results: [0.1, -0.2, 0.3],
      },
    });
  });
});
