"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SkeletonBlock, SkeletonStack } from "@/components/LoadingSkeleton";
import { MetricLabel } from "@/components/MetricLabel";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import {
  buildStrategyCardSubtitle,
  buildStrategyDisplayLabel,
  buildStrategyExportPayload,
  formatStrategyExportFilename,
} from "@/lib/strategyPresentation";

type StrategyRecord = {
  id: string;
  allocation: Allocation;
  metrics: SimulationMetrics;
  createdAt: string;
  assumptionsVersion?: string | null;
  seed?: number | null;
  shockId?: string | null;
  simulationMode?: string | null;
  simulationSeed?: number | null;
  simulationShock?: unknown;
  shockModifiers?: unknown;
  assumptions?: unknown;
};

type StrategyListResponse = {
  data?: StrategyRecord[];
};

type SortKey = "newest" | "oldest" | "bestSharpe" | "lowestDrawdown" | "highestReturn";

type MetricRow = {
  key: keyof SimulationMetrics;
  label: string;
  format: (value: number) => string;
};

const PAGE_SIZE = 20;

const metricRows: MetricRow[] = [
  { key: "expectedReturn", label: "Expected Return", format: formatPercent },
  { key: "standardDeviation", label: "Volatility", format: formatPercent },
  { key: "sharpeRatio", label: "Sharpe Ratio", format: formatNumber },
  { key: "maxDrawdown", label: "Max Drawdown", format: formatPercent },
  { key: "valueAtRisk5", label: "VaR (5%)", format: formatPercent },
  { key: "conditionalValueAtRisk95", label: "CVaR (95%)", format: formatPercent },
  {
    key: "probabilityOfLossOver30",
    label: "Loss > 30%",
    format: formatPercent,
  },
];

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function allocationSummary(allocation: Allocation) {
  return Object.entries(allocation)
    .map(([key, value]) => `${key}: ${value}%`)
    .join(" · ");
}

function sortStrategies(strategies: StrategyRecord[], sortKey: SortKey) {
  const next = [...strategies];

  switch (sortKey) {
    case "oldest":
      return next.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    case "bestSharpe":
      return next.sort((a, b) => b.metrics.sharpeRatio - a.metrics.sharpeRatio);
    case "lowestDrawdown":
      return next.sort((a, b) => a.metrics.maxDrawdown - b.metrics.maxDrawdown);
    case "highestReturn":
      return next.sort((a, b) => b.metrics.expectedReturn - a.metrics.expectedReturn);
    case "newest":
    default:
      return next.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
}

function filterStrategies(strategies: StrategyRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return strategies;

  return strategies.filter((strategy) => {
    const haystack = [
      strategy.id,
      strategy.assumptionsVersion ?? "",
      strategy.shockId ?? "",
      strategy.simulationMode ?? "",
      buildStrategyDisplayLabel(strategy),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

function downloadStrategyExport(strategy: StrategyRecord) {
  const payload = buildStrategyExportPayload({ strategy });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = formatStrategyExportFilename(strategy);
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricValue({ value }: Readonly<{ value: string }>) {
  return <span className="font-medium text-zinc-100">{value}</span>;
}

function StrategyDeleteDialog({
  strategy,
  onCancel,
  onConfirm,
  isDeleting,
}: Readonly<{
  strategy: StrategyRecord;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
        <h2 className="text-xl font-semibold text-zinc-100">Delete strategy?</h2>
        <p className="mt-2 text-sm text-zinc-400">
          This will permanently remove the saved strategy and its history entry.
        </p>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200">
          <p className="font-medium text-zinc-100">{buildStrategyDisplayLabel(strategy)}</p>
          <p className="mt-1 text-zinc-400">{strategy.id}</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StrategyHistoryPage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StrategyRecord | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/strategies", { credentials: "include" });
        if (!response.ok) {
          setError("Unable to load strategy history.");
          return;
        }

        const payload = (await response.json()) as StrategyListResponse;
        setStrategies(payload.data ?? []);
      } catch (err) {
        console.error("Failed to load strategies", err);
        setError("Unable to load strategy history.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, sortKey]);

  const filteredStrategies = useMemo(() => {
    return sortStrategies(filterStrategies(strategies, query), sortKey);
  }, [strategies, query, sortKey]);

  const visibleStrategies = useMemo(() => {
    return filteredStrategies.slice(0, visibleCount);
  }, [filteredStrategies, visibleCount]);

  const comparison = useMemo(() => {
    if (strategies.length === 0) return null;

    const bestSharpe = strategies.reduce(
      (best, current) => (current.metrics.sharpeRatio > best.metrics.sharpeRatio ? current : best),
      strategies[0],
    );
    const lowestDrawdown = strategies.reduce(
      (best, current) => (current.metrics.maxDrawdown < best.metrics.maxDrawdown ? current : best),
      strategies[0],
    );
    return { bestSharpe, lowestDrawdown };
  }, [strategies]);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch("/api/strategies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        setError("Unable to delete that strategy.");
        return;
      }

      setStrategies((current) => current.filter((strategy) => strategy.id !== id));
      setPendingDelete(null);
    } catch (err) {
      console.error("Failed to delete strategy", err);
      setError("Unable to delete that strategy.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClone(strategy: StrategyRecord) {
    if (cloningId) return;
    setCloningId(strategy.id);
    setError(null);

    try {
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceStrategyId: strategy.id }),
      });

      if (!response.ok) {
        setError("Unable to clone that strategy.");
        return;
      }

      const payload = (await response.json()) as { data?: { id?: string } };
      const clonedId = payload.data?.id;
      if (clonedId) {
        router.push(`/strategy/${clonedId}`);
      }
    } catch (err) {
      console.error("Failed to clone strategy", err);
      setError("Unable to clone that strategy.");
    } finally {
      setCloningId(null);
    }
  }

  const hasMore = visibleCount < filteredStrategies.length;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Strategy History</h1>
          <p className="text-zinc-400">
            Review past simulations, compare risk metrics, and jump into any saved strategy.
          </p>
        </div>
        <Link
          href="/simulate"
          className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
        >
          Run New Simulation
        </Link>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[16rem] flex-1">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by date, seed, shock, mode, or ID"
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
            />
          </label>

          <label className="w-full min-w-[12rem] max-w-[16rem]">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Sort</span>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="bestSharpe">Best Sharpe</option>
              <option value="lowestDrawdown">Lowest drawdown</option>
              <option value="highestReturn">Highest return</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Showing {visibleStrategies.length} of {filteredStrategies.length} filtered strategies.
        </p>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error}
        </section>
      ) : null}

      {isLoading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-sm text-zinc-300">Loading strategy history...</p>
          <div className="mt-4 space-y-4">
            <SkeletonBlock className="h-40" />
            <SkeletonStack rows={4} />
          </div>
        </section>
      ) : null}

      {!isLoading && strategies.length === 0 ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-zinc-300">
          <h2 className="text-lg font-semibold text-zinc-100">No saved strategies yet</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Run a simulation and save it to track the full history of your portfolio experiments.
          </p>
        </section>
      ) : null}

      {comparison ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h2 className="text-sm uppercase tracking-wide text-zinc-500">Best Sharpe Ratio</h2>
            <p className="mt-2 text-lg font-semibold text-zinc-100">
              {buildStrategyDisplayLabel(comparison.bestSharpe)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {buildStrategyCardSubtitle(comparison.bestSharpe)}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {metricRows.map((row) => (
                <div key={row.key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <MetricLabel metric={row.key} label={row.label} />
                  <MetricValue value={row.format(comparison.bestSharpe.metrics[row.key])} />
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h2 className="text-sm uppercase tracking-wide text-zinc-500">Lowest Drawdown</h2>
            <p className="mt-2 text-lg font-semibold text-zinc-100">
              {buildStrategyDisplayLabel(comparison.lowestDrawdown)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {buildStrategyCardSubtitle(comparison.lowestDrawdown)}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {metricRows.map((row) => (
                <div key={row.key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <MetricLabel metric={row.key} label={row.label} />
                  <MetricValue value={row.format(comparison.lowestDrawdown.metrics[row.key])} />
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="space-y-4">
        {visibleStrategies.map((strategy) => (
          <article
            key={strategy.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {buildStrategyDisplayLabel(strategy)}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">{buildStrategyCardSubtitle(strategy)}</p>
                <p className="mt-2 text-sm text-zinc-300">
                  {allocationSummary(strategy.allocation)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1">
                    Saved {formatDate(strategy.createdAt)}
                  </span>
                  {strategy.assumptionsVersion ? (
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1">
                      {strategy.assumptionsVersion}
                    </span>
                  ) : null}
                  {strategy.shockId ? (
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1">
                      Shock {strategy.shockId}
                    </span>
                  ) : null}
                  {strategy.simulationMode ? (
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1">
                      {strategy.simulationMode}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/strategy/${strategy.id}`}
                  className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
                >
                  Open detail
                </Link>
                <button
                  type="button"
                  onClick={() => downloadStrategyExport(strategy)}
                  className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => void handleClone(strategy)}
                  disabled={cloningId === strategy.id}
                  className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cloningId === strategy.id ? "Cloning..." : "Clone"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(strategy)}
                  disabled={deletingId === strategy.id}
                  className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metricRows.map((row) => (
                <div key={row.key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <MetricLabel metric={row.key} label={row.label} />
                  <p className="mt-1 text-sm font-medium text-zinc-100">
                    {row.format(strategy.metrics[row.key])}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
          >
            Load more
          </button>
        </div>
      ) : null}

      {pendingDelete ? (
        <StrategyDeleteDialog
          strategy={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleDelete(pendingDelete.id)}
          isDeleting={deletingId === pendingDelete.id}
        />
      ) : null}
    </>
  );
}
