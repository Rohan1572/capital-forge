import { prisma } from "./prisma";

export const DATA_RETENTION_POLICY = {
  sessionDeletionLagDays: 1,
  aiResponseLogRetentionDays: 90,
  simulationRunRetentionDays: 180,
  auditLogRetentionDays: 365,
} as const;

export type RetentionSweepSummary = {
  expiredSessionsDeleted: number;
  aiResponseLogsDeleted: number;
  simulationRunsDeleted: number;
  auditLogsDeleted: number;
};

export type ExplicitDeletionSummary = RetentionSweepSummary & {
  strategiesDeleted: number;
};

export type SupportDeletionTarget = {
  userId?: string | null;
  strategyId?: string | null;
};

function subtractDays(date: Date, days: number) {
  const cutoff = new Date(date);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

function toTrimmedId(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function buildRetentionAuditMetadata(params: {
  action: string;
  policy: typeof DATA_RETENTION_POLICY;
  summary: RetentionSweepSummary | ExplicitDeletionSummary;
  target?: SupportDeletionTarget;
}) {
  return {
    retentionAction: params.action,
    retentionPolicy: params.policy,
    retentionSummary: params.summary,
    retentionTarget: params.target ?? null,
  };
}

export async function runRetentionSweep(now = new Date()): Promise<RetentionSweepSummary> {
  const sessionCutoff = subtractDays(now, DATA_RETENTION_POLICY.sessionDeletionLagDays);
  const aiLogCutoff = subtractDays(now, DATA_RETENTION_POLICY.aiResponseLogRetentionDays);
  const simulationCutoff = subtractDays(now, DATA_RETENTION_POLICY.simulationRunRetentionDays);
  const auditCutoff = subtractDays(now, DATA_RETENTION_POLICY.auditLogRetentionDays);

  const [expiredSessions, aiResponseLogs, simulationRuns, auditLogs] = await Promise.all([
    prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: sessionCutoff,
        },
      },
    }),
    prisma.aiResponseLog.deleteMany({
      where: {
        createdAt: {
          lt: aiLogCutoff,
        },
      },
    }),
    prisma.simulationRun.deleteMany({
      where: {
        createdAt: {
          lt: simulationCutoff,
        },
      },
    }),
    prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: auditCutoff,
        },
      },
    }),
  ]);

  const summary: RetentionSweepSummary = {
    expiredSessionsDeleted: expiredSessions.count,
    aiResponseLogsDeleted: aiResponseLogs.count,
    simulationRunsDeleted: simulationRuns.count,
    auditLogsDeleted: auditLogs.count,
  };

  await prisma.auditLog
    .create({
      data: {
        action: "retention.sweep",
        metadata: buildRetentionAuditMetadata({
          action: "retention.sweep",
          policy: DATA_RETENTION_POLICY,
          summary,
        }),
      },
    })
    .catch((error) => {
      console.error("Failed to record retention sweep audit log", error);
    });

  return summary;
}

type SupportDeletionScope =
  | {
      kind: "user";
      userId: string;
    }
  | {
      kind: "strategy";
      strategyId: string;
    };

function resolveSupportDeletionScope(target: SupportDeletionTarget): SupportDeletionScope {
  const userId = toTrimmedId(target.userId);
  if (userId) {
    return { kind: "user", userId };
  }

  const strategyId = toTrimmedId(target.strategyId);
  if (strategyId) {
    return { kind: "strategy", strategyId };
  }

  throw new Error("userId or strategyId is required");
}

async function loadStrategyIds(scope: SupportDeletionScope) {
  if (scope.kind === "strategy") {
    return [scope.strategyId];
  }

  const strategies = await prisma.strategy.findMany({
    where: { userId: scope.userId },
    select: { id: true },
  });

  return strategies.map((strategy) => strategy.id);
}

async function deleteAiResponseLogs(strategyIds: string[]) {
  if (strategyIds.length === 0) {
    return { count: 0 };
  }

  return prisma.aiResponseLog.deleteMany({
    where: {
      strategyId: {
        in: strategyIds,
      },
    },
  });
}

async function deleteSimulationRuns(scope: SupportDeletionScope, strategyIds: string[]) {
  if (scope.kind === "user") {
    return prisma.simulationRun.deleteMany({
      where: {
        userId: scope.userId,
      },
    });
  }

  if (strategyIds.length === 0) {
    return { count: 0 };
  }

  return prisma.simulationRun.deleteMany({
    where: {
      strategyId: {
        in: strategyIds,
      },
    },
  });
}

async function deleteStrategies(scope: SupportDeletionScope, strategyIds: string[]) {
  if (scope.kind === "user") {
    return prisma.strategy.deleteMany({
      where: {
        userId: scope.userId,
      },
    });
  }

  return prisma.strategy.deleteMany({
    where: {
      id: {
        in: strategyIds,
      },
    },
  });
}

async function deleteSessions(scope: SupportDeletionScope) {
  if (scope.kind === "strategy") {
    return { count: 0 };
  }

  return prisma.session.deleteMany({
    where: {
      userId: scope.userId,
    },
  });
}

function getAuditUserId(scope: SupportDeletionScope) {
  if (scope.kind === "user") {
    return scope.userId;
  }

  return null;
}

function buildAuditTarget(scope: SupportDeletionScope): SupportDeletionTarget {
  if (scope.kind === "user") {
    return {
      userId: scope.userId,
      strategyId: null,
    };
  }

  return {
    userId: null,
    strategyId: scope.strategyId,
  };
}

export async function deleteSupportData(
  target: SupportDeletionTarget,
): Promise<ExplicitDeletionSummary> {
  const scope = resolveSupportDeletionScope(target);
  const strategyIds = await loadStrategyIds(scope);

  const [aiResponseLogsDeleted, simulationRunsDeleted, strategiesDeleted, expiredSessionsDeleted] =
    await Promise.all([
      deleteAiResponseLogs(strategyIds),
      deleteSimulationRuns(scope, strategyIds),
      deleteStrategies(scope, strategyIds),
      deleteSessions(scope),
    ]);

  const summary: ExplicitDeletionSummary = {
    expiredSessionsDeleted: expiredSessionsDeleted.count,
    aiResponseLogsDeleted: aiResponseLogsDeleted.count,
    simulationRunsDeleted: simulationRunsDeleted.count,
    auditLogsDeleted: 0,
    strategiesDeleted: strategiesDeleted.count,
  };

  await prisma.auditLog
    .create({
      data: {
        userId: getAuditUserId(scope),
        action: "retention.explicit_delete",
        metadata: buildRetentionAuditMetadata({
          action: "retention.explicit_delete",
          policy: DATA_RETENTION_POLICY,
          summary,
          target: buildAuditTarget(scope),
        }),
      },
    })
    .catch((error) => {
      console.error("Failed to record explicit retention audit log", error);
    });

  return summary;
}
