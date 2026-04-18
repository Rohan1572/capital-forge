import { describe, expect, it } from "vitest";
import { buildDashboardSnapshotState } from "../../lib/dashboardSnapshot";

describe("buildDashboardSnapshotState", () => {
  it("describes the populated dashboard snapshot state", () => {
    const state = buildDashboardSnapshotState({
      latestStrategy: {
        id: "strategy-12345",
        allocation: {
          Equities: 60,
          Bonds: 30,
          Cash: 10,
        },
        metrics: {
          expectedReturn: 0.14,
          standardDeviation: 0.09,
          sharpeRatio: 1.24,
          maxDrawdown: 0.12,
          valueAtRisk5: -0.08,
          conditionalValueAtRisk95: -0.11,
          probabilityOfLossOver30: 0.04,
        },
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        assumptionsVersion: "v3.2",
        seed: 42,
        shockId: null,
        simulationMode: "baseline",
        simulationSeed: 42,
      },
      previousStrategy: {
        id: "strategy-12344",
        allocation: {
          Equities: 55,
          Bonds: 35,
          Cash: 10,
        },
        metrics: {
          expectedReturn: 0.12,
          standardDeviation: 0.1,
          sharpeRatio: 1.18,
          maxDrawdown: 0.15,
          valueAtRisk5: -0.09,
          conditionalValueAtRisk95: -0.12,
          probabilityOfLossOver30: 0.05,
        },
        createdAt: new Date("2026-03-28T12:00:00.000Z"),
        assumptionsVersion: "v3.1",
        seed: 41,
        shockId: null,
        simulationMode: "baseline",
        simulationSeed: 41,
      },
      latestRun: {
        id: "run-12345",
        name: "April baseline run",
        status: "completed",
        createdAt: new Date("2026-04-01T13:00:00.000Z"),
        strategyId: "strategy-12345",
        assumptionsVersion: "v3.2",
        seed: 42,
        shockId: null,
      },
      strategyCount: 8,
      runCount: 12,
    });

    expect(state).toEqual(
      expect.objectContaining({
        state: "ready",
        portfolio: expect.objectContaining({
          title: expect.stringContaining("Baseline run"),
          subtitle: "Seed 42 | strategy",
          topAllocations: [
            ["Equities", 60],
            ["Bonds", 30],
            ["Cash", 10],
          ],
          totalAllocation: 100,
          strategyCount: 8,
          assumptionsVersionLabel: "v3.2",
        }),
        performance: expect.objectContaining({
          title: "Recent Performance",
          metrics: expect.arrayContaining([
            expect.objectContaining({
              label: "Expected Return",
              value: "14.00%",
              detail: "up 2.00% vs previous save",
            }),
            expect.objectContaining({
              label: "Sharpe Ratio",
              value: "1.240",
              detail: "up 0.060 vs previous save",
            }),
            expect.objectContaining({
              label: "Max Drawdown",
              value: "12.00%",
              detail: "improved 3.00% vs previous save",
            }),
          ]),
        }),
        activity: expect.objectContaining({
          title: "Recent Activity",
          latestRunName: "April baseline run",
          latestRunStatus: "completed",
          latestRunLabel: expect.stringContaining("Apr"),
          seedLabel: "Seed 42",
          strategyCount: 8,
          runCount: 12,
          relatedStrategyHref: "/strategy/strategy-12345",
        }),
      }),
    );
  });

  it("describes the empty dashboard snapshot state", () => {
    const state = buildDashboardSnapshotState({
      latestStrategy: null,
      previousStrategy: null,
      latestRun: null,
      strategyCount: 0,
      runCount: 0,
    });

    expect(state).toEqual(
      expect.objectContaining({
        state: "empty",
        title: "No portfolio snapshot yet",
        description:
          "Save a simulation to surface your latest allocation, performance metrics, and activity here.",
        actions: expect.objectContaining({
          primary: "Run your first simulation",
          secondary: "Browse strategy history",
        }),
      }),
    );
  });
});
