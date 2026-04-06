"use client";

import { useEffect, useState } from "react";

type MonitoringSummary = {
  simulationCount: number;
  averageSimulationLatencyMs: number | null;
  totalSimulationLatencyMs: number | null;
  aiResponseCount: number;
  totalAiEstimatedCostUsd: number;
  totalAiTokens: number;
  aiResponseCountByKind: Record<string, number>;
  lookbackDays: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function MonitoringWidget({ days = 30 }: Readonly<{ days?: number }>) {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(`/api/monitoring?days=${days}`, {
          credentials: "include",
        });

        if (response.ok) {
          const payload = (await response.json()) as { data?: MonitoringSummary };
          if (active) {
            setSummary(payload.data ?? null);
          }
        } else {
          throw new Error("Failed to load monitoring summary.");
        }
      } catch (loadError) {
        console.error("Failed to load monitoring summary", loadError);
        if (active) {
          setError("Unable to load monitoring summary.");
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [days]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500">Monitoring</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Simulation latency and estimated AI cost over the last {days} days.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {summary === null ? (
        <div className="mt-4 space-y-3">
          <div className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-950/50" />
          <div className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-950/50" />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Simulation Latency</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {summary.averageSimulationLatencyMs === null
                ? "No runs"
                : `${summary.averageSimulationLatencyMs.toFixed(0)} ms`}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.simulationCount} tracked runs, {summary.totalSimulationLatencyMs ?? 0} ms
              total
            </p>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">AI Cost</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {formatCurrency(summary.totalAiEstimatedCostUsd)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.aiResponseCount} responses, {summary.totalAiTokens} tokens
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
