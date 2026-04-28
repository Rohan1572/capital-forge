import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJsonRequest, sameOriginHeaders, getBaseUrl } from "./route-test-utils";

const mocks = vi.hoisted(() => ({
  buildGlobalMonitoringReport: vi.fn(),
  buildMonitoringDelivery: vi.fn(),
  deleteSupportData: vi.fn(),
  rolloverLeaderboardSeason: vi.fn(),
  setLeaderboardSeason: vi.fn(),
  generateAndActivateWeeklyShock: vi.fn(),
}));

vi.mock("../../lib/monitoringReport", () => ({
  buildGlobalMonitoringReport: mocks.buildGlobalMonitoringReport,
}));

vi.mock("../../lib/monitoring", () => ({
  buildMonitoringDelivery: mocks.buildMonitoringDelivery,
}));

vi.mock("../../lib/dataRetention", () => ({
  deleteSupportData: mocks.deleteSupportData,
}));

vi.mock("../../lib/leaderboardSeason", () => ({
  rolloverLeaderboardSeason: mocks.rolloverLeaderboardSeason,
  setLeaderboardSeason: mocks.setLeaderboardSeason,
}));

vi.mock("../../lib/shockScheduler", () => ({
  generateAndActivateWeeklyShock: mocks.generateAndActivateWeeklyShock,
}));

import { GET as getAdminMonitoring } from "../../app/api/admin/monitoring/route";
import { POST as postAdminRetention } from "../../app/api/admin/retention/route";
import { POST as postAdminRollover } from "../../app/api/admin/leaderboard/rollover/route";
import { POST as postAdminShockTrigger } from "../../app/api/admin/shocks/trigger/route";

function resetMocks() {
  mocks.buildGlobalMonitoringReport.mockReset();
  mocks.buildMonitoringDelivery.mockReset();
  mocks.deleteSupportData.mockReset();
  mocks.rolloverLeaderboardSeason.mockReset();
  mocks.setLeaderboardSeason.mockReset();
  mocks.generateAndActivateWeeklyShock.mockReset();
}

const warningReport = {
  lookbackDays: 90,
  simulationCount: 3,
  averageSimulationLatencyMs: 1700,
  totalSimulationLatencyMs: 5100,
  aiResponseCount: 2,
  totalAiEstimatedCostUsd: 1.4,
  totalAiTokens: 1200,
  aiResponseCountByKind: {
    risk: 2,
  },
  status: "warning" as const,
  alerts: [
    {
      key: "simulation-latency" as const,
      severity: "warning" as const,
      metric: "averageSimulationLatencyMs" as const,
      actual: 1700,
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

describe("admin routes", () => {
  beforeEach(() => {
    resetMocks();
    process.env.ADMIN_TRIGGER_SECRET = "admin-secret";
  });

  it("returns an admin monitoring summary when authorized", async () => {
    mocks.buildGlobalMonitoringReport.mockResolvedValue(warningReport);
    mocks.buildMonitoringDelivery.mockReturnValue({
      status: "warning",
      headline: "Monitoring warning detected",
      summary: "Average simulation latency is elevated.",
      action: "Review the warning signals and confirm whether the trend is expected.",
      alertTitles: ["Simulation latency is elevated"],
    });

    const response = await getAdminMonitoring(
      new Request(`${getBaseUrl()}/api/admin/monitoring?days=180`, {
        headers: sameOriginHeaders({
          "x-admin-secret": "admin-secret",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        report: warningReport,
        delivery: expect.objectContaining({
          status: "warning",
          headline: "Monitoring warning detected",
        }),
        lookbackDays: 90,
        status: "warning",
        alerts: warningReport.alerts,
      }),
    });
    expect(mocks.buildGlobalMonitoringReport).toHaveBeenCalledWith(90);
    expect(mocks.buildMonitoringDelivery).toHaveBeenCalledWith(warningReport);
  });

  it("rejects unauthorized admin monitoring requests", async () => {
    const response = await getAdminMonitoring(
      new Request(`${getBaseUrl()}/api/admin/monitoring`, {
        headers: sameOriginHeaders(),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns a retention summary for support deletion requests", async () => {
    mocks.deleteSupportData.mockResolvedValue({
      expiredSessionsDeleted: 1,
      aiResponseLogsDeleted: 2,
      simulationRunsDeleted: 3,
      auditLogsDeleted: 0,
      strategiesDeleted: 4,
    });

    const response = await postAdminRetention(
      createJsonRequest(
        "/api/admin/retention",
        "POST",
        {
          userId: "user-1",
        },
        sameOriginHeaders({
          "x-admin-secret": "admin-secret",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        expiredSessionsDeleted: 1,
        aiResponseLogsDeleted: 2,
        simulationRunsDeleted: 3,
        auditLogsDeleted: 0,
        strategiesDeleted: 4,
      },
    });
    expect(mocks.deleteSupportData).toHaveBeenCalledWith({
      userId: "user-1",
      strategyId: undefined,
    });
  });

  it("rejects retention requests without a user or strategy target", async () => {
    const response = await postAdminRetention(
      createJsonRequest(
        "/api/admin/retention",
        "POST",
        {},
        sameOriginHeaders({
          "x-admin-secret": "admin-secret",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "userId or strategyId is required",
    });
    expect(mocks.deleteSupportData).not.toHaveBeenCalled();
  });

  it("rolls over the leaderboard season for a valid month", async () => {
    mocks.setLeaderboardSeason.mockResolvedValue({
      activeMonth: "2026-05",
    });

    const response = await postAdminRollover(
      createJsonRequest(
        "/api/admin/leaderboard/rollover",
        "POST",
        {
          month: "2026-05",
        },
        sameOriginHeaders({
          "x-admin-secret": "admin-secret",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        activeMonth: "2026-05",
      },
    });
    expect(mocks.setLeaderboardSeason).toHaveBeenCalledWith("2026-05");
    expect(mocks.rolloverLeaderboardSeason).not.toHaveBeenCalled();
  });

  it("returns a 500 when the leaderboard rollover receives an invalid month label", async () => {
    mocks.setLeaderboardSeason.mockRejectedValue(new Error("Invalid month label: 2026-5"));

    const response = await postAdminRollover(
      createJsonRequest(
        "/api/admin/leaderboard/rollover",
        "POST",
        {
          month: "2026-5",
        },
        sameOriginHeaders({
          "x-admin-secret": "admin-secret",
        }),
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to roll leaderboard season.",
    });
  });

  it("generates a weekly shock payload for the admin trigger route", async () => {
    mocks.generateAndActivateWeeklyShock.mockResolvedValue({
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
    });

    const response = await postAdminShockTrigger(
      createJsonRequest(
        "/api/admin/shocks/trigger",
        "POST",
        {
          weekLabel: "2026-W16",
          focus: "liquidity",
          recentConditions: "Credit spreads are widening.",
        },
        sameOriginHeaders({
          "x-admin-secret": "admin-secret",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        shock: expect.objectContaining({
          id: "shock-1",
          title: "Liquidity stress",
          active: true,
        }),
        meta: expect.objectContaining({
          model: "gpt-4.1-mini",
          latencyMs: 321,
        }),
      },
    });
    expect(mocks.generateAndActivateWeeklyShock).toHaveBeenCalledWith({
      weekLabel: "2026-W16",
      focus: "liquidity",
      recentConditions: "Credit spreads are widening.",
    });
  });
});
