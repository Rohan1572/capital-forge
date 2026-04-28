import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJsonRequest, sameOriginHeaders, getBaseUrl } from "./route-test-utils";

const mocks = vi.hoisted(() => ({
  buildGlobalMonitoringReport: vi.fn(),
  runRetentionSweep: vi.fn(),
  rolloverLeaderboardSeason: vi.fn(),
  setLeaderboardSeason: vi.fn(),
  generateAndActivateWeeklyShock: vi.fn(),
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("../../lib/monitoringReport", () => ({
  buildGlobalMonitoringReport: mocks.buildGlobalMonitoringReport,
}));

vi.mock("../../lib/dataRetention", () => ({
  runRetentionSweep: mocks.runRetentionSweep,
}));

vi.mock("../../lib/leaderboardSeason", () => ({
  rolloverLeaderboardSeason: mocks.rolloverLeaderboardSeason,
  setLeaderboardSeason: mocks.setLeaderboardSeason,
}));

vi.mock("../../lib/shockScheduler", () => ({
  generateAndActivateWeeklyShock: mocks.generateAndActivateWeeklyShock,
}));

import {
  GET as getMonitoringCron,
  POST as postMonitoringCron,
} from "../../app/api/cron/monitoring/route";
import {
  GET as getRetentionCron,
  POST as postRetentionCron,
} from "../../app/api/cron/retention/route";
import {
  GET as getLeaderboardCron,
  POST as postLeaderboardCron,
} from "../../app/api/cron/leaderboard/monthly/route";
import { POST as postShockCron } from "../../app/api/cron/shocks/weekly/route";

function resetMocks() {
  mocks.buildGlobalMonitoringReport.mockReset();
  mocks.runRetentionSweep.mockReset();
  mocks.rolloverLeaderboardSeason.mockReset();
  mocks.setLeaderboardSeason.mockReset();
  mocks.generateAndActivateWeeklyShock.mockReset();
  mocks.prisma.auditLog.create.mockReset();
}

const monitoringReport = {
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

describe("cron routes", () => {
  beforeEach(() => {
    resetMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  it("returns a monitoring cron payload and records the alert when thresholds are crossed", async () => {
    mocks.buildGlobalMonitoringReport.mockResolvedValue(monitoringReport);
    mocks.prisma.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const response = await getMonitoringCron(
      new Request(`${getBaseUrl()}/api/cron/monitoring?days=120`, {
        headers: sameOriginHeaders({
          authorization: "Bearer cron-secret",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        report: monitoringReport,
        delivery: expect.objectContaining({
          status: "warning",
          alertTitles: ["Simulation latency is elevated"],
        }),
        lookbackDays: 30,
        status: "warning",
      }),
    });
    expect(mocks.buildGlobalMonitoringReport).toHaveBeenCalledWith(90);
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "monitoring.alert",
        metadata: expect.objectContaining({
          lookbackDays: 30,
          status: "warning",
          alertCount: 1,
        }),
      }),
    });
  });

  it("rejects unauthenticated monitoring cron requests", async () => {
    const response = await postMonitoringCron(
      new Request(`${getBaseUrl()}/api/cron/monitoring`, {
        headers: sameOriginHeaders(),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns a retention sweep summary for the cron job", async () => {
    mocks.runRetentionSweep.mockResolvedValue({
      expiredSessionsDeleted: 2,
      aiResponseLogsDeleted: 4,
      simulationRunsDeleted: 6,
      auditLogsDeleted: 8,
    });

    const response = await getRetentionCron(
      new Request(`${getBaseUrl()}/api/cron/retention`, {
        headers: sameOriginHeaders({
          authorization: "Bearer cron-secret",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        expiredSessionsDeleted: 2,
        aiResponseLogsDeleted: 4,
        simulationRunsDeleted: 6,
        auditLogsDeleted: 8,
      },
    });
    expect(mocks.runRetentionSweep).toHaveBeenCalledTimes(1);
  });

  it("returns a 500 when the retention sweep fails", async () => {
    mocks.runRetentionSweep.mockRejectedValue(new Error("database unavailable"));

    const response = await postRetentionCron(
      new Request(`${getBaseUrl()}/api/cron/retention`, {
        headers: sameOriginHeaders({
          authorization: "Bearer cron-secret",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to run retention sweep.",
    });
  });

  it("returns the current leaderboard month for the cron route", async () => {
    mocks.setLeaderboardSeason.mockResolvedValue({
      activeMonth: "2026-05",
    });

    const response = await postLeaderboardCron(
      createJsonRequest(
        "/api/cron/leaderboard/monthly",
        "POST",
        {
          month: "2026-05",
        },
        sameOriginHeaders({
          authorization: "Bearer cron-secret",
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

  it("returns a 500 when the leaderboard cron receives an invalid month", async () => {
    mocks.setLeaderboardSeason.mockRejectedValue(new Error("Invalid month label: 2026-5"));

    const response = await getLeaderboardCron(
      createJsonRequest(
        "/api/cron/leaderboard/monthly",
        "GET",
        undefined,
        sameOriginHeaders({
          authorization: "Bearer cron-secret",
        }),
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to roll leaderboard season.",
    });
  });

  it("returns a weekly shock payload for the cron route", async () => {
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

    const response = await postShockCron(
      createJsonRequest(
        "/api/cron/shocks/weekly",
        "POST",
        {
          weekLabel: "2026-W16",
          focus: "liquidity",
          recentConditions: "Credit spreads are widening.",
        },
        sameOriginHeaders({
          authorization: "Bearer cron-secret",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        shock: expect.objectContaining({
          id: "shock-1",
          title: "Liquidity stress",
          active: true,
        }),
        meta: expect.objectContaining({
          model: "gpt-4.1-mini",
          latencyMs: 321,
        }),
      }),
    });
    expect(mocks.generateAndActivateWeeklyShock).toHaveBeenCalledWith({
      weekLabel: "2026-W16",
      focus: "liquidity",
      recentConditions: "Credit spreads are widening.",
    });
  });
});
