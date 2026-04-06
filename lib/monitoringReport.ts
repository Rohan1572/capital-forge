import { prisma } from "./prisma";
import {
  buildMonitoringReport,
  summarizeMonitoringData,
  type MonitoringReport,
} from "./monitoring";

type MonitoringRecordShape = {
  durationMs: number | null;
};

type MonitoringAiRecordShape = {
  kind: string;
  estimatedCostUsd: number | null;
  totalTokens: number | null;
};

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapSimulationRecord(metadata: unknown): MonitoringRecordShape {
  const record = metadata as Record<string, unknown> | null;
  return {
    durationMs: toNumberOrNull(record?.simulationLatencyMs),
  };
}

function mapAiRecord(kind: string, metadata: unknown): MonitoringAiRecordShape {
  const record = metadata as Record<string, unknown> | null;
  const usage = record?.usage as Record<string, unknown> | null;
  return {
    kind,
    estimatedCostUsd: toNumberOrNull(record?.estimatedCostUsd),
    totalTokens: toNumberOrNull(usage?.totalTokens),
  };
}

async function loadUserMonitoringRecords(userId: string, since: Date) {
  const strategies = await prisma.strategy.findMany({
    where: { userId },
    select: { id: true },
  });
  const strategyIds = strategies.map((strategy) => strategy.id);

  const [simulationRecords, aiRecords] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        userId,
        action: "strategy.create",
        createdAt: {
          gte: since,
        },
      },
      select: {
        metadata: true,
      },
    }),
    strategyIds.length > 0
      ? prisma.aiResponseLog.findMany({
          where: {
            strategyId: { in: strategyIds },
            createdAt: {
              gte: since,
            },
          },
          select: {
            kind: true,
            metadata: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    simulationRecords: simulationRecords.map((record) => mapSimulationRecord(record.metadata)),
    aiRecords: aiRecords.map((record) => mapAiRecord(record.kind, record.metadata)),
  };
}

async function loadGlobalMonitoringRecords(since: Date) {
  const [simulationRecords, aiRecords] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: "strategy.create",
        createdAt: {
          gte: since,
        },
      },
      select: {
        metadata: true,
      },
    }),
    prisma.aiResponseLog.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      select: {
        kind: true,
        metadata: true,
      },
    }),
  ]);

  return {
    simulationRecords: simulationRecords.map((record) => mapSimulationRecord(record.metadata)),
    aiRecords: aiRecords.map((record) => mapAiRecord(record.kind, record.metadata)),
  };
}

function buildSince(lookbackDays: number) {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  return since;
}

export async function buildUserMonitoringReport(
  userId: string,
  lookbackDays: number,
): Promise<MonitoringReport> {
  const since = buildSince(lookbackDays);
  const records = await loadUserMonitoringRecords(userId, since);
  return buildMonitoringReport({
    summary: summarizeMonitoringData(records),
    lookbackDays,
  });
}

export async function buildGlobalMonitoringReport(lookbackDays: number): Promise<MonitoringReport> {
  const since = buildSince(lookbackDays);
  const records = await loadGlobalMonitoringRecords(since);
  return buildMonitoringReport({
    summary: summarizeMonitoringData(records),
    lookbackDays,
  });
}
