"use client";

import { useEffect, useState } from "react";

type LeaderboardMetrics = {
  expectedReturn?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  valueAtRisk5?: number;
};

type LeaderboardEntry = {
  id: string;
  userId: string;
  name: string;
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

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/leaderboard?page=${pagination.page}&pageSize=${pagination.pageSize}`,
      );
      if (!response.ok) {
        setError("Unable to load leaderboard.");
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as {
        data: LeaderboardEntry[];
        pagination: Pagination;
      };
      setEntries(payload.data ?? []);
      if (payload.pagination) {
        setPagination((current) => ({
          ...current,
          ...payload.pagination,
        }));
      }
      setIsLoading(false);
    }

    load();
  }, [pagination.page, pagination.pageSize]);

  function setPage(nextPage: number) {
    setPagination((current) => ({
      ...current,
      page: Math.min(Math.max(nextPage, 1), current.totalPages),
    }));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold">Leaderboard</h1>
        <p className="text-zinc-400">
          Competitive rankings based on Sharpe ratio and downside risk.
        </p>
      </header>

      {isLoading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-sm text-zinc-300">Loading leaderboard...</p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-6 text-rose-200">
          {error}
        </section>
      ) : null}

      {!isLoading && entries.length === 0 ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-zinc-300">
          No strategies have been ranked yet.
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
                  <th className="px-4 py-3">Sharpe</th>
                  <th className="px-4 py-3">Expected Return</th>
                  <th className="px-4 py-3">Drawdown</th>
                  <th className="px-4 py-3">VaR (5%)</th>
                  <th className="px-4 py-3">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-zinc-300">#{entry.rank}</td>
                    <td className="px-4 py-3 text-zinc-100">{entry.name}</td>
                    <td className="px-4 py-3">{formatNumber(entry.metrics.sharpeRatio)}</td>
                    <td className="px-4 py-3">{formatPercent(entry.metrics.expectedReturn)}</td>
                    <td className="px-4 py-3">{formatPercent(entry.metrics.maxDrawdown)}</td>
                    <td className="px-4 py-3">{formatPercent(entry.metrics.valueAtRisk5)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
            <p>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
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
    </main>
  );
}
