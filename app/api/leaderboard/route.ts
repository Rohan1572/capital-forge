import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StrategyMetrics = {
  expectedReturn?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  valueAtRisk5?: number;
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

export async function GET() {
  const strategies = await prisma.strategy.findMany({
    include: { user: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

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

  return NextResponse.json({ data: ranked });
}
