import type { ShockParameters } from "@/lib/shockEngine";

export type WeeklyShock = ShockParameters & {
  weekStart: string;
  active: boolean;
};

export const weeklyShocks: WeeklyShock[] = [
  {
    id: "week-6-2026-recession",
    title: "Credit Crunch Recession",
    description:
      "A rapid tightening in credit markets sparks a broad economic slowdown. Earnings expectations reset lower as defaults rise across leveraged sectors.",
    meanShift: -0.06,
    volatilityMultiplier: 1.35,
    correlationShift: 0.2,
    meanShiftByAsset: {
      equity: -0.03,
      startups: -0.08,
      bonds: 0.01,
      gold: 0.01,
      crypto: -0.05,
      cash: 0,
    },
    volatilityMultiplierByAsset: {
      equity: 1.2,
      startups: 1.45,
      bonds: 1.05,
      gold: 1.05,
      crypto: 1.4,
      cash: 1,
    },
    correlationShiftByAsset: {
      equity: { startups: 0.15, crypto: 0.1 },
      startups: { equity: 0.15 },
      crypto: { equity: 0.1 },
    },
    weekStart: "2026-03-09",
    active: true,
  },
];

export function getActiveShock(date: Date = new Date()): WeeklyShock | null {
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  const activeShock = weeklyShocks.find((shock) => shock.active);
  if (activeShock) {
    return activeShock;
  }

  return (
    weeklyShocks.find((shock) => {
      const [year, month, day] = shock.weekStart.split("-").map(Number);
      const start = Date.UTC(year, month - 1, day);
      const end = start + 7 * 24 * 60 * 60 * 1000;
      return target >= start && target < end;
    }) ?? null
  );
}
