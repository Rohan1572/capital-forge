"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SkeletonBlock, SkeletonStack } from "@/components/LoadingSkeleton";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import { MetricLabel } from "@/components/MetricLabel";

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

    const bestSharpe = strategies.reduce(
      (best, current) => (current.metrics.sharpeRatio > best.metrics.sharpeRatio ? current : best),
      strategies[0],
    );
    const lowestDrawdown = strategies.reduce(
      (best, current) => (current.metrics.maxDrawdown < best.metrics.maxDrawdown ? current : best),
      strategies[0],
    );
    const lowestVar = strategies.reduce(
      (best, current) =>
        current.metrics.valueAtRisk5 > best.metrics.valueAtRisk5 ? current : best,
      strategies[0],
    );
    const lowestCvar = strategies.reduce(
      (best, current) =>
        current.metrics.conditionalValueAtRisk95 > best.metrics.conditionalValueAtRisk95
          ? current
          : best,
      strategies[0],
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
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Strategy History</h1>
          <p className="text-zinc-400">
            Review past simulations, compare risk metrics, and delete outdated strategies.
          </p>
        </div>
        <Link
          href="/simulate"
          className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
        >
          Run New Simulation
        </Link>
      </header>

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
            <p className="mt-2 text-lg font-semibold text-zinc-100">{comparison.bestSharpe.id}</p>
            <p className="mt-1 text-sm text-zinc-400">
              Sharpe {formatNumber(comparison.bestSharpe.metrics.sharpeRatio)}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h2 className="text-sm uppercase tracking-wide text-zinc-500">Lowest Drawdown</h2>
            <p className="mt-2 text-lg font-semibold text-zinc-100">
              {comparison.lowestDrawdown.id}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Drawdown {formatPercent(comparison.lowestDrawdown.metrics.maxDrawdown)}
            </p>
          </article>
        </section>
      ) : null}

      <section className="space-y-4">
        {strategies.map((strategy) => (
          <article
            key={strategy.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">{strategy.id}</h2>
                <p className="mt-1 text-sm text-zinc-400">Saved {formatDate(strategy.createdAt)}</p>
                <p className="mt-2 text-sm text-zinc-300">
                  {allocationSummary(strategy.allocation)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(strategy.id)}
                disabled={deletingId === strategy.id}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500"
              >
                {deletingId === strategy.id ? "Deleting..." : "Delete"}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricLabel metric="sharpeRatio" label="Sharpe" />
              <MetricLabel metric="maxDrawdown" label="Drawdown" />
              <MetricLabel metric="valueAtRisk5" label="VaR (5%)" />
              <MetricLabel metric="conditionalValueAtRisk95" label="CVaR (95%)" />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
