import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildLeaderboardMonthRange,
  getLeaderboardSeason,
  getCurrentUtcMonthLabel,
} from "@/lib/leaderboardSeason";
import { getActiveShock } from "@/lib/shocks";

type StrategyMetrics = {
  expectedReturn: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  valueAtRisk5: number | null;
  conditionalValueAtRisk95: number | null;
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

type ActiveShockSummary = {
  id: string;
  title: string;
};

type LeaderboardSeasonSummary = {
  activeMonth: string;
  currentMonth: string;
};

function toMetricNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getName(user: UserSummary): string {
  if (user.name && user.name.trim().length > 0) return user.name;
  const fallback = user.email.split("@")[0];
  return fallback || "Anonymous";
}

function compareStrategies(a: LeaderboardEntry, b: LeaderboardEntry) {
  const sharpeA = a.metrics.sharpeRatio ?? -Infinity;
  const sharpeB = b.metrics.sharpeRatio ?? -Infinity;
  if (sharpeA !== sharpeB) return sharpeB - sharpeA;

  const drawdownA = a.metrics.maxDrawdown ?? Infinity;
  const drawdownB = b.metrics.maxDrawdown ?? Infinity;
  if (drawdownA !== drawdownB) return drawdownA - drawdownB;

  const varA = a.metrics.valueAtRisk5 ?? Infinity;
  const varB = b.metrics.valueAtRisk5 ?? Infinity;
  if (varA !== varB) return varA - varB;

  if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
  return a.id.localeCompare(b.id);
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeMetrics(metrics: unknown): StrategyMetrics {
  if (!metrics || typeof metrics !== "object") {
    return {
      expectedReturn: null,
      sharpeRatio: null,
      maxDrawdown: null,
      valueAtRisk5: null,
      conditionalValueAtRisk95: null,
    };
  }

  const record = metrics as Record<string, unknown>;
  return {
    expectedReturn: toMetricNumber(record.expectedReturn),
    sharpeRatio: toMetricNumber(record.sharpeRatio),
    maxDrawdown: toMetricNumber(record.maxDrawdown),
    valueAtRisk5: toMetricNumber(record.valueAtRisk5),
    conditionalValueAtRisk95: toMetricNumber(record.conditionalValueAtRisk95),
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
    const [season, activeShock] = await Promise.all([
      getLeaderboardSeason(),
      getActiveShock().catch(() => null),
    ]);
    const monthRange = buildLeaderboardMonthRange(monthParam, season.activeMonth);

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

    const sortedEntries = entries.toSorted(compareStrategies);
    const ranked = sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
    const pagedRanked = ranked.slice(skip, skip + pageSize);

    await prisma.auditLog.create({
      data: {
        action: "leaderboard.fetch",
        metadata: {
          month: monthRange.label,
          page,
          pageSize,
          total,
          activeShockId: activeShock?.id ?? null,
          activeMonth: season.activeMonth,
        },
      },
    });

    const activeShockSummary: ActiveShockSummary | null = activeShock
      ? {
          id: activeShock.id,
          title: activeShock.title,
        }
      : null;

    const seasonSummary: LeaderboardSeasonSummary = {
      activeMonth: season.activeMonth,
      currentMonth: getCurrentUtcMonthLabel(),
    };

    return NextResponse.json({
      data: pagedRanked,
      month: monthRange.label,
      season: seasonSummary,
      activeShock: activeShockSummary,
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
