"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SkeletonBlock, SkeletonStack } from "@/components/LoadingSkeleton";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";

type StrategyRecord = {
  id: string;
  allocation: Allocation;
  metrics: SimulationMetrics;
  createdAt: string;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function allocationSummary(allocation: Allocation) {
  return Object.entries(allocation)
    .map(([key, value]) => `${key}: ${value}%`)
    .join(" · ");
}

export default function StrategyHistoryPage() {
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/strategies", { credentials: "include" });
        if (!response.ok) {
          setError("Unable to load strategy history.");
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { data: StrategyRecord[] };
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

  const comparison = useMemo(() => {
    if (strategies.length === 0) return null;

    const bestSharpe = strategies.reduce((best, current) =>
      current.metrics.sharpeRatio > best.metrics.sharpeRatio ? current : best,
    );
    const lowestDrawdown = strategies.reduce((best, current) =>
      current.metrics.maxDrawdown < best.metrics.maxDrawdown ? current : best,
    );
    const lowestVar = strategies.reduce((best, current) =>
      current.metrics.valueAtRisk5 > best.metrics.valueAtRisk5 ? current : best,
    );
    const lowestCvar = strategies.reduce((best, current) =>
      current.metrics.conditionalValueAtRisk95 > best.metrics.conditionalValueAtRisk95
        ? current
        : best,
    );

    return { bestSharpe, lowestDrawdown, lowestVar, lowestCvar };
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

      if (response.ok) {
        setStrategies((current) => current.filter((strategy) => strategy.id !== id));
      } else {
        setError("Unable to delete that strategy.");
      }
    } catch (err) {
      console.error("Failed to delete strategy", err);
      setError("Unable to delete that strategy.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Strategy History</h1>
          <p className="text-zinc-400">
            Review past simulations, compare risk metrics, and delete outdated strategies.
          </p>
        </div>
        <Link
          href="/simulate"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
        >
          Run new simulation
        </Link>
      </header>

      {isLoading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-sm text-zinc-300">Loading strategies...</p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
            </div>
            <SkeletonStack rows={5} />
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-6 text-rose-200">
          {error}
        </section>
      ) : null}

      {!isLoading && strategies.length === 0 ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-zinc-300">
          No saved strategies yet. Run a simulation to create one.
        </section>
      ) : null}

      {comparison ? (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase text-zinc-500">Best Sharpe</p>
            <p className="mt-2 text-lg font-semibold">
              {formatNumber(comparison.bestSharpe.metrics.sharpeRatio)}
            </p>
            <p className="text-xs text-zinc-400">{formatDate(comparison.bestSharpe.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase text-zinc-500">Lowest Drawdown</p>
            <p className="mt-2 text-lg font-semibold">
              {formatPercent(comparison.lowestDrawdown.metrics.maxDrawdown)}
            </p>
            <p className="text-xs text-zinc-400">
              {formatDate(comparison.lowestDrawdown.createdAt)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase text-zinc-500">Best VaR (5%)</p>
            <p className="mt-2 text-lg font-semibold">
              {formatPercent(comparison.lowestVar.metrics.valueAtRisk5)}
            </p>
            <p className="text-xs text-zinc-400">{formatDate(comparison.lowestVar.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase text-zinc-500">Best CVaR (95%)</p>
            <p className="mt-2 text-lg font-semibold">
              {formatPercent(comparison.lowestCvar.metrics.conditionalValueAtRisk95)}
            </p>
            <p className="text-xs text-zinc-400">{formatDate(comparison.lowestCvar.createdAt)}</p>
          </div>
        </section>
      ) : null}

      {strategies.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-200">
              <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Allocation</th>
                  <th className="px-4 py-3">Expected Return</th>
                  <th className="px-4 py-3">Sharpe</th>
                  <th className="px-4 py-3">Drawdown</th>
                  <th className="px-4 py-3">VaR (5%)</th>
                  <th className="px-4 py-3">CVaR (95%)</th>
                  <th className="px-4 py-3">Loss &gt; 30%</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {strategies.map((strategy) => (
                  <tr key={strategy.id}>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(strategy.createdAt)}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {allocationSummary(strategy.allocation)}
                    </td>
                    <td className="px-4 py-3">{formatPercent(strategy.metrics.expectedReturn)}</td>
                    <td className="px-4 py-3">{formatNumber(strategy.metrics.sharpeRatio)}</td>
                    <td className="px-4 py-3">{formatPercent(strategy.metrics.maxDrawdown)}</td>
                    <td className="px-4 py-3">{formatPercent(strategy.metrics.valueAtRisk5)}</td>
                    <td className="px-4 py-3">
                      {formatPercent(strategy.metrics.conditionalValueAtRisk95)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPercent(strategy.metrics.probabilityOfLossOver30)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(strategy.id)}
                        disabled={deletingId === strategy.id}
                        className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-200 transition disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
                      >
                        {deletingId === strategy.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
