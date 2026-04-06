import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionDeleteMany = vi.hoisted(() => vi.fn());
const aiResponseLogDeleteMany = vi.hoisted(() => vi.fn());
const simulationRunDeleteMany = vi.hoisted(() => vi.fn());
const auditLogDeleteMany = vi.hoisted(() => vi.fn());
const auditLogCreate = vi.hoisted(() => vi.fn());
const strategyFindMany = vi.hoisted(() => vi.fn());
const strategyDeleteMany = vi.hoisted(() => vi.fn());

vi.mock("./prisma", () => ({
  prisma: {
    session: {
      deleteMany: sessionDeleteMany,
    },
    aiResponseLog: {
      deleteMany: aiResponseLogDeleteMany,
    },
    simulationRun: {
      deleteMany: simulationRunDeleteMany,
    },
    auditLog: {
      deleteMany: auditLogDeleteMany,
      create: auditLogCreate,
    },
    strategy: {
      findMany: strategyFindMany,
      deleteMany: strategyDeleteMany,
    },
  },
}));

import { deleteSupportData, runRetentionSweep } from "./dataRetention";

describe("dataRetention", () => {
  beforeEach(() => {
    sessionDeleteMany.mockReset();
    aiResponseLogDeleteMany.mockReset();
    simulationRunDeleteMany.mockReset();
    auditLogDeleteMany.mockReset();
    auditLogCreate.mockReset();
    strategyFindMany.mockReset();
    strategyDeleteMany.mockReset();
  });

  it("purges stale data according to the retention policy", async () => {
    const now = new Date("2026-04-07T12:00:00.000Z");
    sessionDeleteMany.mockResolvedValue({ count: 2 });
    aiResponseLogDeleteMany.mockResolvedValue({ count: 4 });
    simulationRunDeleteMany.mockResolvedValue({ count: 6 });
    auditLogDeleteMany.mockResolvedValue({ count: 8 });
    auditLogCreate.mockResolvedValue({ id: "audit-1" });

    const summary = await runRetentionSweep(now);

    expect(summary).toEqual({
      expiredSessionsDeleted: 2,
      aiResponseLogsDeleted: 4,
      simulationRunsDeleted: 6,
      auditLogsDeleted: 8,
    });
    expect(sessionDeleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: {
          lt: new Date("2026-04-06T12:00:00.000Z"),
        },
      },
    });
    expect(aiResponseLogDeleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date("2026-01-07T12:00:00.000Z"),
        },
      },
    });
    expect(simulationRunDeleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date("2025-10-09T12:00:00.000Z"),
        },
      },
    });
    expect(auditLogDeleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date("2025-04-07T12:00:00.000Z"),
        },
      },
    });
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "retention.sweep",
        metadata: expect.objectContaining({
          retentionAction: "retention.sweep",
          retentionSummary: summary,
        }),
      }),
    });
  });

  it("deletes support-requested user data without removing audit history", async () => {
    strategyFindMany.mockResolvedValue([{ id: "strategy-1" }, { id: "strategy-2" }]);
    aiResponseLogDeleteMany.mockResolvedValue({ count: 3 });
    simulationRunDeleteMany.mockResolvedValue({ count: 5 });
    strategyDeleteMany.mockResolvedValue({ count: 2 });
    sessionDeleteMany.mockResolvedValue({ count: 1 });
    auditLogCreate.mockResolvedValue({ id: "audit-2" });

    const summary = await deleteSupportData({ userId: "user-1" });

    expect(strategyFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true },
    });
    expect(aiResponseLogDeleteMany).toHaveBeenCalledWith({
      where: {
        strategyId: {
          in: ["strategy-1", "strategy-2"],
        },
      },
    });
    expect(simulationRunDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(strategyDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(sessionDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(summary).toEqual({
      expiredSessionsDeleted: 1,
      aiResponseLogsDeleted: 3,
      simulationRunsDeleted: 5,
      auditLogsDeleted: 0,
      strategiesDeleted: 2,
    });
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "retention.explicit_delete",
        metadata: expect.objectContaining({
          retentionAction: "retention.explicit_delete",
          retentionTarget: {
            userId: "user-1",
            strategyId: null,
          },
        }),
      }),
    });
  });
});
