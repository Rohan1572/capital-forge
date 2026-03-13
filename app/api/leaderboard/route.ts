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
  userId: string;
  name: string;
  metrics: StrategyMetrics;
  createdAt: string;
  rank: number;
};

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getName(user: { name: string | null; email: string }): string {
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get("pageSize"), 25), 100);
    const skip = (page - 1) * pageSize;

    const [total, strategies] = await Promise.all([
      prisma.strategy.count(),
      prisma.strategy.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    const entries: LeaderboardEntry[] = strategies.map((strategy) => ({
      id: strategy.id,
      userId: strategy.userId,
      name: getName(strategy.user),
      metrics: (strategy.metrics as StrategyMetrics) ?? {},
      createdAt: strategy.createdAt.toISOString(),
      rank: 0,
    }));

    entries.sort(compareStrategies);

    const ranked = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return NextResponse.json({
      data: ranked,
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
