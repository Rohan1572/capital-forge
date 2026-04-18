import type { MonitoringDelivery, MonitoringReport } from "./monitoring";
import type { RetentionSweepSummary } from "./dataRetention";
import type { WeeklyShockResult } from "./shockScheduler";

export type LeaderboardActiveShockSummary = {
  id: string;
  title: string;
};

export type LeaderboardSeasonSummary = {
  activeMonth: string;
  currentMonth: string;
};

export type LeaderboardPaginationSummary = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type LeaderboardResponsePayload = {
  data: Array<Record<string, unknown>>;
  month: string;
  season: LeaderboardSeasonSummary;
  activeShock: LeaderboardActiveShockSummary | null;
  pagination: LeaderboardPaginationSummary;
};

export function buildLeaderboardResponse(payload: LeaderboardResponsePayload) {
  return payload;
}

export function buildMonitoringResponse(report: MonitoringReport, delivery: MonitoringDelivery) {
  return {
    data: {
      report,
      delivery,
      ...report,
    },
  };
}

export function buildLeaderboardCronResponse(activeMonth: string) {
  return {
    data: {
      activeMonth,
    },
  };
}

export function buildRetentionSweepResponse(summary: RetentionSweepSummary) {
  return {
    data: summary,
  };
}

export function buildWeeklyShockResponse(result: WeeklyShockResult) {
  return {
    data: {
      shock: result.shock,
      meta: result.meta,
    },
  };
}
