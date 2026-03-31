"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SimulationRun = {
  id: string;
  strategyId: string | null;
  name: string;
  status: string;
  assumptionsVersion: string | null;
  seed: number | null;
  shockId: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type RecentSimulationRunsWidgetProps = Readonly<{
  take?: number;
}>;

export function RecentSimulationRunsWidget({ take = 5 }: RecentSimulationRunsWidgetProps) {
  const [runs, setRuns] = useState<SimulationRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(`/api/simulations?take=${take}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load runs.");
        }

        const payload = (await response.json()) as { data?: SimulationRun[] };
        if (active) {
          setRuns(payload.data ?? []);
        }
      } catch (loadError) {
        console.error("Failed to load recent simulation runs", loadError);
        if (active) {
          setError("Unable to load recent simulation runs.");
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [take]);

  const content = (() => {
    if (runs === null) {
      return (
        <div className="mt-4 space-y-3">
          <div className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-950/50" />
          <div className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-950/50" />
          <div className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-950/50" />
        </div>
      );
    }

    if (runs.length === 0) {
      return <p className="mt-4 text-sm text-zinc-400">No runs have been saved yet.</p>;
    }

    return (
      <ul className="mt-4 space-y-3">
        {runs.map((run) => (
          <li key={run.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">{run.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {run.strategyId ? `Strategy ${run.strategyId.slice(0, 8)}` : "Unlinked run"}
                  {run.assumptionsVersion ? (
                    <>
                      {"\u00B7"} {run.assumptionsVersion}
                    </>
                  ) : null}
                </p>
              </div>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
                {run.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span>{formatDate(run.createdAt)}</span>
              {typeof run.seed === "number" ? <span>Seed {run.seed}</span> : null}
              {run.shockId ? <span>Shock {run.shockId}</span> : null}
            </div>

            {run.strategyId ? (
              <div className="mt-3">
                <Link
                  href={`/strategy/${run.strategyId}`}
                  className="text-sm font-medium text-amber-100 transition hover:text-amber-50"
                >
                  Open strategy snapshot
                </Link>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500">Recent Simulation Runs</h2>
          <p className="mt-1 text-sm text-zinc-400">Latest saved runs linked to your strategies.</p>
        </div>
        <Link
          href="/strategies"
          className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          View all
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {content}
    </section>
  );
}
