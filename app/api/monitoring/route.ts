import { NextResponse } from "next/server";
import { summarizeMonitoringData } from "@/lib/monitoring";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function parseLookbackDays(value: string | null) {
  const parsed = Number.parseInt(value ?? "30", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }

  return Math.min(parsed, 90);
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const lookbackDays = parseLookbackDays(url.searchParams.get("days"));
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const strategies = await prisma.strategy.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const strategyIds = strategies.map((strategy) => strategy.id);

    const [simulationRecords, aiRecords] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          userId: user.id,
          action: "strategy.create",
          createdAt: {
            gte: since,
          },
        },
        select: {
          createdAt: true,
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
              createdAt: true,
              metadata: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const summary = summarizeMonitoringData({
      simulationRecords: simulationRecords.map((record) => {
        const metadata = record.metadata as Record<string, unknown> | null;
        return {
          durationMs:
            typeof metadata?.simulationLatencyMs === "number" &&
            Number.isFinite(metadata.simulationLatencyMs)
              ? metadata.simulationLatencyMs
              : null,
        };
      }),
      aiRecords: aiRecords.map((record) => {
        const metadata = record.metadata as Record<string, unknown> | null;
        const usage = metadata?.usage as Record<string, unknown> | null;
        const totalTokens =
          typeof usage?.totalTokens === "number" && Number.isFinite(usage.totalTokens)
            ? usage.totalTokens
            : null;

        return {
          kind: record.kind,
          estimatedCostUsd:
            typeof metadata?.estimatedCostUsd === "number" &&
            Number.isFinite(metadata.estimatedCostUsd)
              ? metadata.estimatedCostUsd
              : null,
          totalTokens,
        };
      }),
    });

    return NextResponse.json({
      data: {
        ...summary,
        lookbackDays,
      },
    });
  } catch (error) {
    console.error("Failed to load monitoring summary", error);
    return NextResponse.json({ error: "Unable to load monitoring summary." }, { status: 500 });
  }
}
