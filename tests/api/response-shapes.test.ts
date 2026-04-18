import { describe, expect, it } from "vitest";
import {
  buildLeaderboardResponse,
  buildLeaderboardCronResponse,
  buildMonitoringResponse,
  buildRetentionSweepResponse,
  buildWeeklyShockResponse,
} from "../../lib/apiResponses";

describe("api response shapes", () => {
  it("keeps the leaderboard payload aligned with the UI contract", () => {
    const payload = buildLeaderboardResponse({
      data: [
        {
          id: "strategy-1",
          name: "April Runner",
          allocation: {
            equity: 70,
            bonds: 20,
            cash: 10,
          },
          metrics: {
            expectedReturn: 0.12,
            sharpeRatio: 0.9,
            maxDrawdown: 0.18,
            valueAtRisk5: -0.08,
            conditionalValueAtRisk95: -0.11,
          },
          createdAt: "2026-04-01T00:00:00.000Z",
          rank: 1,
        },
      ],
      month: "2026-04",
      season: {
        activeMonth: "2026-04",
        currentMonth: "2026-04",
      },
      activeShock: {
        id: "shock-1",
        title: "Liquidity stress",
      },
      pagination: {
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        data: expect.any(Array),
        month: "2026-04",
        season: expect.objectContaining({
          activeMonth: "2026-04",
          currentMonth: "2026-04",
        }),
        activeShock: expect.objectContaining({
          id: "shock-1",
          title: "Liquidity stress",
        }),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          pageSize: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      }),
    );
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        id: "strategy-1",
        name: "April Runner",
        allocation: expect.objectContaining({
          equity: 70,
          bonds: 20,
          cash: 10,
        }),
        metrics: expect.objectContaining({
          expectedReturn: 0.12,
          sharpeRatio: 0.9,
          maxDrawdown: 0.18,
          valueAtRisk5: -0.08,
          conditionalValueAtRisk95: -0.11,
        }),
        createdAt: expect.any(String),
        rank: 1,
      }),
    );
  });

  it("keeps the monitoring payload aligned with the runbook checks", () => {
    const report = {
      lookbackDays: 30,
      simulationCount: 2,
      averageSimulationLatencyMs: 1600,
      totalSimulationLatencyMs: 3200,
      aiResponseCount: 1,
      totalAiEstimatedCostUsd: 1.25,
      totalAiTokens: 900,
      aiResponseCountByKind: {
        risk: 1,
      },
      status: "warning" as const,
      alerts: [
        {
          key: "simulation-latency" as const,
          severity: "warning" as const,
          metric: "averageSimulationLatencyMs" as const,
          actual: 1600,
          threshold: 1500,
          title: "Simulation latency is elevated",
          message: "Average simulation latency is elevated.",
          recommendation: "Review latency trends.",
        },
      ],
      thresholds: {
        averageSimulationLatencyWarningMs: 1500,
        averageSimulationLatencyCriticalMs: 3000,
        totalAiEstimatedCostWarningUsd: 1,
        totalAiEstimatedCostCriticalUsd: 3,
      },
    };
    const delivery = {
      status: "warning" as const,
      headline: "Monitoring warning detected",
      summary: "Average simulation latency is elevated.",
      action: "Review the warning signals and confirm whether the trend is expected.",
      alertTitles: ["Simulation latency is elevated"],
    };

    const payload = buildMonitoringResponse(report, delivery);

    expect(payload).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          report: expect.objectContaining({
            lookbackDays: 30,
            status: "warning",
          }),
          delivery: expect.objectContaining({
            status: "warning",
            headline: expect.any(String),
            summary: expect.any(String),
            action: expect.any(String),
            alertTitles: expect.any(Array),
          }),
          lookbackDays: 30,
          status: "warning",
          alerts: expect.any(Array),
          thresholds: expect.objectContaining({
            averageSimulationLatencyWarningMs: expect.any(Number),
            averageSimulationLatencyCriticalMs: expect.any(Number),
            totalAiEstimatedCostWarningUsd: expect.any(Number),
            totalAiEstimatedCostCriticalUsd: expect.any(Number),
          }),
          simulationCount: expect.any(Number),
          averageSimulationLatencyMs: expect.any(Number),
          totalSimulationLatencyMs: expect.any(Number),
          aiResponseCount: expect.any(Number),
          totalAiEstimatedCostUsd: expect.any(Number),
          totalAiTokens: expect.any(Number),
          aiResponseCountByKind: expect.objectContaining({
            risk: expect.any(Number),
          }),
        }),
      }),
    );
  });

  it("keeps the scheduled monitoring payload shape consistent", () => {
    const payload = buildMonitoringResponse(
      {
        lookbackDays: 14,
        simulationCount: 1,
        averageSimulationLatencyMs: 900,
        totalSimulationLatencyMs: 900,
        aiResponseCount: 0,
        totalAiEstimatedCostUsd: 0,
        totalAiTokens: 0,
        aiResponseCountByKind: {},
        status: "healthy" as const,
        alerts: [],
        thresholds: {
          averageSimulationLatencyWarningMs: 1500,
          averageSimulationLatencyCriticalMs: 3000,
          totalAiEstimatedCostWarningUsd: 1,
          totalAiEstimatedCostCriticalUsd: 3,
        },
      },
      {
        status: "healthy" as const,
        headline: "Monitoring is healthy",
        summary: "No warning conditions were detected across the last 14 days.",
        action: "No operator action required.",
        alertTitles: [],
      },
    );

    expect(payload.data).toEqual(
      expect.objectContaining({
        lookbackDays: 14,
        status: "healthy",
        alerts: [],
        delivery: expect.objectContaining({
          status: "healthy",
          alertTitles: [],
        }),
      }),
    );
  });

  it("keeps the cron payloads aligned with the operator workflows", () => {
    expect(buildLeaderboardCronResponse("2026-05")).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          activeMonth: "2026-05",
        }),
      }),
    );

    expect(
      buildRetentionSweepResponse({
        expiredSessionsDeleted: 2,
        aiResponseLogsDeleted: 4,
        simulationRunsDeleted: 6,
        auditLogsDeleted: 8,
      }),
    ).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          expiredSessionsDeleted: expect.any(Number),
          aiResponseLogsDeleted: expect.any(Number),
          simulationRunsDeleted: expect.any(Number),
          auditLogsDeleted: expect.any(Number),
        }),
      }),
    );

    const weeklyShockResponse = structuredClone(
      buildWeeklyShockResponse({
        shock: {
          id: "shock-1",
          title: "Liquidity stress",
          description: "A short, sharp liquidity event hits risk assets.",
          marketImpact: ["Spreads widen", "Equities gap down", "Funding costs rise"],
          modifiers: {
            meanShift: -0.1,
            volatilityMultiplier: 1.4,
            correlationShift: 0.2,
          },
          active: true,
          weekStart: new Date("2026-04-13T00:00:00.000Z"),
          createdAt: new Date("2026-04-13T00:00:00.000Z"),
          updatedAt: new Date("2026-04-13T00:00:00.000Z"),
        },
        meta: {
          model: "gpt-4.1-mini",
          latencyMs: 321,
          usage: {
            inputTokens: 100,
            outputTokens: 200,
            totalTokens: 300,
          },
        },
        weekStart: new Date("2026-04-13T00:00:00.000Z"),
      }),
    );

    const weeklyShockPayload = {
      data: {
        shock: {
          ...weeklyShockResponse.data.shock,
          weekStart: weeklyShockResponse.data.shock.weekStart.toISOString(),
          createdAt: weeklyShockResponse.data.shock.createdAt.toISOString(),
          updatedAt: weeklyShockResponse.data.shock.updatedAt.toISOString(),
        },
        meta: weeklyShockResponse.data.meta,
      },
    } as {
      data: {
        shock: {
          id: string;
          title: string;
          description: string;
          marketImpact: string[];
          modifiers: Record<string, unknown>;
          active: boolean;
          weekStart: string;
          createdAt: string;
          updatedAt: string;
        };
        meta: {
          model: string;
          latencyMs: number;
          usage?: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
          };
        };
      };
    };

    expect(weeklyShockPayload).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          shock: expect.objectContaining({
            id: "shock-1",
            title: "Liquidity stress",
            active: true,
            weekStart: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
          meta: expect.objectContaining({
            model: "gpt-4.1-mini",
            latencyMs: 321,
            usage: expect.objectContaining({
              totalTokens: 300,
            }),
          }),
        }),
      }),
    );
  });
});
