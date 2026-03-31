const ACTIVE_SCOPE = "global";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export function getCurrentUtcMonthLabel(referenceDate = new Date()) {
  return `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isMonthLabel(value: string): value is `${number}-${number}` {
  return /^\d{4}-\d{2}$/.test(value);
}

export function buildLeaderboardMonthRange(monthParam: string | null, fallbackMonth: string) {
  const monthLabel = monthParam && isMonthLabel(monthParam) ? monthParam : fallbackMonth;
  const [yearPart, monthPart] = monthLabel.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const fallback = getCurrentUtcMonthLabel();
    const [fallbackYearPart, fallbackMonthPart] = fallback.split("-");
    const fallbackYear = Number(fallbackYearPart);
    const fallbackMonthNumber = Number(fallbackMonthPart);
    return {
      start: new Date(Date.UTC(fallbackYear, fallbackMonthNumber - 1, 1)),
      end: new Date(Date.UTC(fallbackYear, fallbackMonthNumber, 1)),
      label: fallback,
    };
  }

  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
    label: monthLabel,
  };
}

export async function getLeaderboardSeason() {
  const prisma = await getPrisma();
  return prisma.leaderboardSeason.upsert({
    where: { scope: ACTIVE_SCOPE },
    create: {
      scope: ACTIVE_SCOPE,
      activeMonth: getCurrentUtcMonthLabel(),
    },
    update: {},
  });
}

export async function setLeaderboardSeason(monthLabel: string) {
  if (!isMonthLabel(monthLabel)) {
    throw new Error(`Invalid month label: ${monthLabel}`);
  }

  const prisma = await getPrisma();
  return prisma.leaderboardSeason.upsert({
    where: { scope: ACTIVE_SCOPE },
    create: {
      scope: ACTIVE_SCOPE,
      activeMonth: monthLabel,
    },
    update: {
      activeMonth: monthLabel,
    },
  });
}

export async function rolloverLeaderboardSeason(referenceDate = new Date()) {
  return setLeaderboardSeason(getCurrentUtcMonthLabel(referenceDate));
}
