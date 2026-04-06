import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateAllocation } from "./allocationValidation";
import { buildSimulationAuditSnapshot } from "./simulationAudit";
import { RISK_FREE_RATE } from "./env";
import { computeSimulationMetrics } from "./metrics";
import { runMonteCarloSimulation, type Allocation } from "./monteCarlo";
import { createSimulationRun } from "./simulationRun";

const mocks = vi.hoisted(() => {
  const simulationRuns: unknown[] = [];
  const simulationRunCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    const run = {
      id: `run-${simulationRuns.length + 1}`,
      createdAt: new Date("2026-04-15T08:00:00.000Z"),
      updatedAt: new Date("2026-04-15T08:00:00.000Z"),
      ...data,
    };
    simulationRuns.push(run);
    return run;
  });

  return {
    simulationRuns,
    simulationRunCreate,
    prisma: {
      simulationRun: {
        create: simulationRunCreate,
      },
    },
  };
});

vi.mock("./prisma", () => ({
  prisma: mocks.prisma,
}));

function compareStrategies(
  a: {
    createdAt: Date;
    metrics: { sharpeRatio?: number; maxDrawdown?: number; valueAtRisk5?: number };
  },
  b: {
    createdAt: Date;
    metrics: { sharpeRatio?: number; maxDrawdown?: number; valueAtRisk5?: number };
  },
) {
  const sharpeA = typeof a.metrics.sharpeRatio === "number" ? a.metrics.sharpeRatio : -Infinity;
  const sharpeB = typeof b.metrics.sharpeRatio === "number" ? b.metrics.sharpeRatio : -Infinity;
  if (sharpeA !== sharpeB) return sharpeB - sharpeA;

  const drawdownA =
    typeof a.metrics.maxDrawdown === "number" ? a.metrics.maxDrawdown : Number.POSITIVE_INFINITY;
  const drawdownB =
    typeof b.metrics.maxDrawdown === "number" ? b.metrics.maxDrawdown : Number.POSITIVE_INFINITY;
  if (drawdownA !== drawdownB) return drawdownA - drawdownB;

  const varA =
    typeof a.metrics.valueAtRisk5 === "number" ? a.metrics.valueAtRisk5 : Number.POSITIVE_INFINITY;
  const varB =
    typeof b.metrics.valueAtRisk5 === "number" ? b.metrics.valueAtRisk5 : Number.POSITIVE_INFINITY;
  if (varA !== varB) return varA - varB;

  return a.createdAt.getTime() - b.createdAt.getTime();
}

function rankStrategies(
  strategies: Array<{
    id: string;
    userId: string;
    allocation: Allocation;
    metrics: {
      sharpeRatio: number;
      maxDrawdown: number;
      valueAtRisk5: number;
      conditionalValueAtRisk95: number;
      expectedReturn: number;
    };
    createdAt: Date;
  }>,
) {
  return [...strategies].sort(compareStrategies).map((strategy, index) => ({
    ...strategy,
    rank: index + 1,
  }));
}

describe("allocate -> simulate -> save -> rank", () => {
  beforeEach(() => {
    mocks.simulationRuns.splice(0);
    vi.clearAllMocks();
  });

  it("persists a simulated run and ranks it against an existing strategy", async () => {
    const allocation: Allocation = {
      equity: 30,
      startups: 20,
      bonds: 20,
      gold: 10,
      crypto: 10,
      cash: 10,
    };

    const allocationValidation = validateAllocation(allocation);
    expect(allocationValidation.ok).toBe(true);
    if (!allocationValidation.ok) {
      throw new Error(allocationValidation.error);
    }

    const seed = 4242;
    const simulationResults = runMonteCarloSimulation(
      allocationValidation.allocation,
      undefined,
      undefined,
      seed,
    );
    const metrics = computeSimulationMetrics(simulationResults, RISK_FREE_RATE);
    const auditSnapshot = buildSimulationAuditSnapshot(seed, null);

    const savedRun = await createSimulationRun({
      userId: "user-1",
      strategyId: "strategy-1",
      name: "baseline strategy run",
      status: "completed",
      assumptionsVersion: auditSnapshot.assumptionsVersion,
      assumptions: auditSnapshot.assumptions,
      seed: auditSnapshot.seed,
      shockId: auditSnapshot.shockId,
      shockModifiers: auditSnapshot.shockModifiers,
      results: simulationResults,
    });

    expect(savedRun).toHaveProperty("id");
    expect(mocks.simulationRunCreate).toHaveBeenCalledTimes(1);

    const savedStrategy = {
      id: "strategy-1",
      userId: "user-1",
      allocation: allocationValidation.allocation,
      metrics,
      createdAt: new Date("2026-04-15T08:00:00.000Z"),
    };
    const competitorStrategy = {
      id: "strategy-2",
      userId: "user-2",
      allocation: {
        equity: 25,
        startups: 10,
        bonds: 30,
        gold: 15,
        crypto: 5,
        cash: 15,
      },
      metrics: {
        ...metrics,
        sharpeRatio: metrics.sharpeRatio + 0.5,
        maxDrawdown: metrics.maxDrawdown * 0.8,
        valueAtRisk5: metrics.valueAtRisk5 * 0.9,
      },
      createdAt: new Date("2026-04-14T08:00:00.000Z"),
    };

    const ranked = rankStrategies([savedStrategy, competitorStrategy]);

    expect(ranked[0].id).toBe("strategy-2");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].id).toBe("strategy-1");
    expect(ranked[1].rank).toBe(2);
    expect(ranked[1].metrics.expectedReturn).toBe(metrics.expectedReturn);
  });
});
