import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StrategyMetrics = {
  expectedReturn?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  valueAtRisk5?: number;
  conditionalValueAtRisk95?: number;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  allocation: Record<string, unknown>;
  metrics: StrategyMetrics;
  createdAt: string;
  rank: number;
};

type UserSummary = {
  id: string;
  name: string | null;
  email: string;
};

type StrategyRow = {
  id: string;
  userId: string;
  allocation: unknown;
  metrics: unknown;
  createdAt: Date;
};

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getName(user: UserSummary): string {
  if (user.name && user.name.trim().length > 0) return user.name;
  const fallback = user.email.split("@")[0];
  return fallback || "Anonymous";
}

function compareStrategies(a: LeaderboardEntry, b: LeaderboardEntry) {
  const sharpeA = toNumber(a.metrics.sharpeRatio, -Infinity);
  const sharpeB = toNumber(b.metrics.sharpeRatio, -Infinity);
  if (sharpeA !== sharpeB) return sharpeB - sharpeA;

  const drawdownA = toNumber(a.metrics.maxDrawdown, Infinity);
  const drawdownB = toNumber(b.metrics.maxDrawdown, Infinity);
  if (drawdownA !== drawdownB) return drawdownA - drawdownB;

  const varA = toNumber(a.metrics.valueAtRisk5, Infinity);
  const varB = toNumber(b.metrics.valueAtRisk5, Infinity);
  if (varA !== varB) return varA - varB;

  return a.createdAt.localeCompare(b.createdAt);
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function buildMonthRange(monthParam: string | null): { start: Date; end: Date; label: string } {
  if (monthParam) {
    const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      const month = Number.parseInt(match[2], 10);
      if (Number.isFinite(year) && month >= 1 && month <= 12) {
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        return { start, end, label: monthParam };
      }
    }
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start, end, label };
}

function normalizeMetrics(metrics: unknown): StrategyMetrics {
  if (!metrics || typeof metrics !== "object") return {};
  const record = metrics as Record<string, unknown>;
  return {
    expectedReturn: toNumber(record.expectedReturn, 0),
    sharpeRatio: toNumber(record.sharpeRatio, 0),
    maxDrawdown: toNumber(record.maxDrawdown, 0),
    valueAtRisk5: toNumber(record.valueAtRisk5, 0),
    conditionalValueAtRisk95: toNumber(record.conditionalValueAtRisk95, 0),
  };
}

function normalizeAllocation(allocation: unknown): Record<string, unknown> {
  return allocation && typeof allocation === "object"
    ? (allocation as Record<string, unknown>)
    : {};
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get("pageSize"), 25), 100);
    const skip = (page - 1) * pageSize;
    const monthParam = url.searchParams.get("month");
    const monthRange = buildMonthRange(monthParam);

    const [total, strategies] = await Promise.all([
      prisma.strategy.count({
        where: {
          createdAt: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
        },
      }),
      prisma.strategy.findMany({
        orderBy: { createdAt: "desc" },
        where: {
          createdAt: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
        },
        skip,
        take: pageSize,
      }),
    ]);

    const typedStrategies = strategies as StrategyRow[];
    const userIds = [...new Set(typedStrategies.map((strategy) => strategy.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const usersById = new Map<string, UserSummary>(
      users.map((user: UserSummary) => [user.id, user] as const),
    );

    const entries: LeaderboardEntry[] = typedStrategies.map((strategy) => {
      const user = usersById.get(strategy.userId);
      return {
        id: strategy.id,

        name: user ? getName(user) : "Anonymous",
        allocation: normalizeAllocation(strategy.allocation),
        metrics: normalizeMetrics(strategy.metrics),
        createdAt: strategy.createdAt.toISOString(),
        rank: 0,
      };
    });

    entries.sort(compareStrategies);

    const ranked = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    await prisma.auditLog.create({
      data: {
        action: "leaderboard.fetch",
        metadata: {
          month: monthRange.label,
          page,
          pageSize,
          total,
        },
      },
    });

    return NextResponse.json({
      data: ranked,
      month: monthRange.label,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("Failed to load leaderboard", error);
    return NextResponse.json({ error: "Unable to load leaderboard." }, { status: 500 });
  }
}
