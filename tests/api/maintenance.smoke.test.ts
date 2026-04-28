import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJsonRequest, sameOriginHeaders, getBaseUrl } from "./route-test-utils";

const mocks = vi.hoisted(() => ({
  buildGlobalMonitoringReport: vi.fn(),
  buildMonitoringDelivery: vi.fn(),
  deleteSupportData: vi.fn(),
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
  mocks.setLeaderboardSeason.mockReset();
  mocks.generateAndActivateWeeklyShock.mockReset();
}

describe("maintenance smoke routes", () => {
  beforeEach(() => {
    resetMocks();
    process.env.ADMIN_TRIGGER_SECRET = "admin-secret";
  });

  it("keeps the admin monitoring route reachable", async () => {
    mocks.buildGlobalMonitoringReport.mockResolvedValue({
      lookbackDays: 30,
      simulationCount: 0,
      averageSimulationLatencyMs: 0,
      totalSimulationLatencyMs: 0,
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
    });
    mocks.buildMonitoringDelivery.mockReturnValue({
      status: "healthy" as const,
      headline: "Monitoring is healthy",
      summary: "No warning conditions were detected.",
      action: "No action required.",
      alertTitles: [],
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
        status: "healthy",
        delivery: expect.objectContaining({
          status: "healthy",
        }),
      }),
    });
  });

  it("keeps the admin retention route reachable", async () => {
    mocks.deleteSupportData.mockResolvedValue({
      expiredSessionsDeleted: 1,
      aiResponseLogsDeleted: 2,
      simulationRunsDeleted: 3,
      auditLogsDeleted: 4,
      strategiesDeleted: 5,
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
      data: expect.objectContaining({
        expiredSessionsDeleted: 1,
        aiResponseLogsDeleted: 2,
      }),
    });
  });

  it("keeps the leaderboard rollover route reachable", async () => {
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
  });

  it("keeps the weekly shock trigger route reachable", async () => {
    mocks.generateAndActivateWeeklyShock.mockResolvedValue({
      shock: {
        id: "shock-1",
        title: "Liquidity stress",
        description: "A short, sharp liquidity event hits risk assets.",
        marketImpact: ["Spreads widen"],
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
      data: expect.objectContaining({
        shock: expect.objectContaining({
          id: "shock-1",
          active: true,
        }),
        meta: expect.objectContaining({
          model: "gpt-4.1-mini",
        }),
      }),
    });
  });
});
