"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SkeletonBlock, SkeletonStack } from "@/components/LoadingSkeleton";
import { MetricLabel } from "@/components/MetricLabel";

type LeaderboardMetrics = {
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
  metrics: LeaderboardMetrics;
  createdAt: string;
  rank: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ActiveShockSummary = {
  id: string;
  title: string;
};

type LeaderboardSeasonSummary = {
  activeMonth: string;
  currentMonth: string;
};

function formatPercent(value?: number) {
  if (typeof value !== "number") return "--";
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value?: number) {
  if (typeof value !== "number") return "--";
  return value.toFixed(3);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getAllocationEntries(allocation: Record<string, unknown>) {
  return Object.entries(allocation)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .sort(([, a], [, b]) => (b as number) - (a as number)) as Array<[string, number]>;
}

function buildRiskWarnings(entry: LeaderboardEntry) {
  const warnings: string[] = [];
  const metrics = entry.metrics;
  const allocation = getAllocationEntries(entry.allocation);
  const topWeights = allocation.slice(0, 2).reduce((sum, [, value]) => sum + value, 0);

  if (typeof metrics.sharpeRatio === "number" && metrics.sharpeRatio < 0.5) {
    warnings.push(`Sharpe ratio is weak at ${metrics.sharpeRatio.toFixed(2)}.`);
  }
  if (typeof metrics.maxDrawdown === "number" && metrics.maxDrawdown >= 0.3) {
    warnings.push(`Drawdown is elevated at ${formatPercent(metrics.maxDrawdown)}.`);
  }
  if (typeof metrics.valueAtRisk5 === "number" && metrics.valueAtRisk5 <= -0.2) {
    warnings.push(`VaR (5%) shows meaningful downside at ${formatPercent(metrics.valueAtRisk5)}.`);
  }
  if (
    typeof metrics.conditionalValueAtRisk95 === "number" &&
    metrics.conditionalValueAtRisk95 <= -0.25
  ) {
    warnings.push(
      `CVaR (95%) indicates severe tail losses at ${formatPercent(metrics.conditionalValueAtRisk95)}.`,
    );
  }
  if (topWeights >= 60) {
    warnings.push(`Top two allocations account for ${topWeights.toFixed(0)}% of capital.`);
  }
  if (warnings.length === 0) {
    warnings.push("No critical warning flags detected from the current metrics.");
  }

  return warnings.slice(0, 4);
}

function toMonthLabel(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getCurrentMonthLabel() {
  return toMonthLabel(new Date());
}

function isMonthLabel(value: string): value is `${number}-${number}` {
  return /^\d{4}-\d{2}$/.test(value);
}

function shiftMonth(monthLabel: string, offset: number) {
  if (!isMonthLabel(monthLabel)) return getCurrentMonthLabel();

  const [yearPart, monthPart] = monthLabel.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getCurrentMonthLabel();
  }

  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return toMonthLabel(shifted);
}

function toMonthHeaderLabel(monthLabel: string) {
  const parsed = new Date(`${monthLabel}-01T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return monthLabel;
  return parsed.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function LeaderboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });
  const [activeShock, setActiveShock] = useState<ActiveShockSummary | null>(null);
  const [season, setSeason] = useState<LeaderboardSeasonSummary | null>(null);
  const [month, setMonth] = useState<string | null>(() => {
    const initial = searchParams.get("month");
    return initial && isMonthLabel(initial) ? initial : null;
  });

  useEffect(() => {
    const urlMonth = searchParams.get("month");
    const normalizedMonth = urlMonth && isMonthLabel(urlMonth) ? urlMonth : null;
    setMonth((current) => (current === normalizedMonth ? current : normalizedMonth));
  }, [searchParams]);

  const effectiveMonth = month ?? season?.activeMonth ?? getCurrentMonthLabel();
  const monthLabel = toMonthHeaderLabel(effectiveMonth);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      setActiveShock(null);

      try {
        const queryMonth = month ? `&month=${month}` : "";
        const response = await fetch(
          `/api/leaderboard?page=${pagination.page}&pageSize=${pagination.pageSize}${queryMonth}`,
        );
        if (!response.ok) {
          setError("Unable to load leaderboard.");
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as {
          data: LeaderboardEntry[];
          pagination: Pagination;
          activeShock?: ActiveShockSummary | null;
          season?: LeaderboardSeasonSummary | null;
          month?: string;
        };
        setEntries(payload.data ?? []);
        setSeason(payload.season ?? null);
        setActiveShock(payload.activeShock ?? null);
        setExpandedId(null);
        if (payload.pagination) {
          setPagination((current) => ({
            ...current,
            ...payload.pagination,
          }));
        }
      } catch (err) {
        console.error("Failed to load leaderboard", err);
        setError("Unable to load leaderboard.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [month, pagination.page, pagination.pageSize]);

  function setPage(nextPage: number) {
    setPagination((current) => ({
      ...current,
      page: Math.min(Math.max(nextPage, 1), current.totalPages),
    }));
  }

  function updateMonth(nextMonth: string) {
    const safeMonth = isMonthLabel(nextMonth) ? nextMonth : null;
    setMonth(safeMonth);
    setExpandedId(null);
    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    const params = new URLSearchParams(searchParams.toString());
    if (safeMonth) {
      params.set("month", safeMonth);
    } else {
      params.delete("month");
    }
    router.replace(params.toString() ? `?${params.toString()}` : "/leaderboard", { scroll: false });
  }

  function handlePreviousMonth() {
    updateMonth(shiftMonth(effectiveMonth, -1));
  }

  function handleNextMonth() {
    updateMonth(shiftMonth(effectiveMonth, 1));
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <>
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Leaderboard</h1>
            <p className="text-zinc-400">
              Competitive rankings based on Sharpe ratio and downside risk.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-right">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Active Season</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {season?.activeMonth ? toMonthHeaderLabel(season.activeMonth) : monthLabel}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Current cycle{season?.activeMonth ? `: ${season.activeMonth}` : ""}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-left">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Viewing Month</p>
              <p className="mt-1 text-sm font-medium text-amber-100">{monthLabel}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {month ? "Filtered leaderboard view" : "Using the active season"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-left">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Shock Context</p>
              {activeShock ? (
                <>
                  <p className="mt-1 text-sm font-medium text-amber-100">{activeShock.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">Shock ID {activeShock.id}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">No active shock at the moment.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="text-zinc-500">Month</span>
            <input
              type="month"
              value={month ?? effectiveMonth}
              onChange={(event) => updateMonth(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/60"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
            >
              Previous month
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
            >
              Next month
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-sm text-zinc-300">Loading leaderboard...</p>
          <div className="mt-4 space-y-4">
            <SkeletonBlock className="h-14" />
            <SkeletonStack rows={6} />
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-6 text-rose-200">
          {error}
        </section>
      ) : null}

      {!isLoading && entries.length === 0 ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-zinc-300">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">No leaderboard entries yet</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Run a simulation and save it to enter the rankings. Scores update after your
                strategies are stored.
              </p>
            </div>
            <Link
              href="/simulate"
              className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              Run a simulation
            </Link>
          </div>
        </section>
      ) : null}

      {entries.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-200">
              <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">
                    <MetricLabel metric="sharpeRatio" label="Sharpe" />
                  </th>
                  <th className="px-4 py-3">Expected Return</th>
                  <th className="px-4 py-3">
                    <MetricLabel metric="maxDrawdown" label="Drawdown" />
                  </th>
                  <th className="px-4 py-3">
                    <MetricLabel metric="valueAtRisk5" label="VaR (5%)" />
                  </th>
                  <th className="px-4 py-3">
                    <MetricLabel metric="conditionalValueAtRisk95" label="CVaR (95%)" />
                  </th>
                  <th className="px-4 py-3">Last Update</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {entries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const allocationEntries = getAllocationEntries(entry.allocation);
                  const warnings = buildRiskWarnings(entry);

                  return (
                    <Fragment key={entry.id}>
                      <tr className={isExpanded ? "bg-zinc-950/30" : undefined}>
                        <td className="px-4 py-3 text-zinc-300">#{entry.rank}</td>
                        <td className="px-4 py-3 text-zinc-100">{entry.name}</td>
                        <td className="px-4 py-3">{formatNumber(entry.metrics.sharpeRatio)}</td>
                        <td className="px-4 py-3">{formatPercent(entry.metrics.expectedReturn)}</td>
                        <td className="px-4 py-3">{formatPercent(entry.metrics.maxDrawdown)}</td>
                        <td className="px-4 py-3">{formatPercent(entry.metrics.valueAtRisk5)}</td>
                        <td className="px-4 py-3">
                          {formatPercent(entry.metrics.conditionalValueAtRisk95)}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{formatDate(entry.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(entry.id)}
                            aria-expanded={isExpanded}
                            className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                          >
                            {isExpanded ? "Hide details" : "Show details"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr key={`${entry.id}-details`} className="bg-zinc-950/40">
                          <td className="px-4 pb-5 pt-0" colSpan={9}>
                            <div className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:grid-cols-2">
                              <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Allocation Summary
                                </h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {allocationEntries.length > 0 ? (
                                    allocationEntries.map(([asset, value]) => (
                                      <span
                                        key={asset}
                                        className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200"
                                      >
                                        {asset}: {value}%
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-sm text-zinc-400">
                                      No allocation data available.
                                    </span>
                                  )}
                                </div>
                              </section>

                              <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Key Risk Warnings
                                </h3>
                                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                                  {warnings.map((warning) => (
                                    <li
                                      key={warning}
                                      className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2"
                                    >
                                      {warning}
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
            <p>
              Page {pagination.page} of {pagination.totalPages}
              {"\u00B7"} {pagination.total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
