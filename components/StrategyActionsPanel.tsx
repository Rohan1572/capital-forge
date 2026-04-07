"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import {
  buildStrategyDisplayLabel,
  buildStrategyExportPayload,
  formatStrategyExportFilename,
} from "@/lib/strategyPresentation";

type StrategyActionsStrategy = {
  id: string;
  createdAt: string;
  allocation: Allocation;
  metrics: SimulationMetrics;
  assumptionsVersion?: string | null;
  assumptions?: unknown;
  seed?: number | null;
  shockId?: string | null;
  shockModifiers?: unknown;
  simulationResults?: unknown;
  simulationSeed?: number | null;
  simulationMode?: string | null;
  simulationShock?: unknown;
};

type StrategyActionsPanelProps = Readonly<{
  strategy: StrategyActionsStrategy;
}>;

function downloadStrategy(strategy: StrategyActionsStrategy, note: string | null) {
  const payload = buildStrategyExportPayload({ strategy, note });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = formatStrategyExportFilename(strategy);
  anchor.click();
  URL.revokeObjectURL(url);
}

export function StrategyActionsPanel({ strategy }: StrategyActionsPanelProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const storageKey = `strategy-note:${strategy.id}`;
    const storedNote = globalThis.localStorage.getItem(storageKey);
    if (storedNote !== null) {
      setNote(storedNote);
      setSavedNote(storedNote);
    }
  }, [strategy.id]);

  function persistNote(nextNote: string) {
    const storageKey = `strategy-note:${strategy.id}`;
    globalThis.localStorage.setItem(storageKey, nextNote);
    setSavedNote(nextNote);
    setStatusMessage("Private note saved locally.");
  }

  async function handleClone() {
    if (isCloning) return;
    setIsCloning(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceStrategyId: strategy.id }),
      });

      if (!response.ok) {
        setStatusMessage("Unable to clone this strategy right now.");
        return;
      }

      const payload = (await response.json()) as { data?: { id?: string } };
      const clonedId = payload.data?.id;
      if (clonedId) {
        router.push(`/strategy/${clonedId}`);
      }
    } catch (error) {
      console.error("Failed to clone strategy", error);
      setStatusMessage("Unable to clone this strategy right now.");
    } finally {
      setIsCloning(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/strategies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: strategy.id }),
      });

      if (!response.ok) {
        setStatusMessage("Unable to delete this strategy right now.");
        return;
      }

      router.push("/strategies");
    } catch (error) {
      console.error("Failed to delete strategy", error);
      setStatusMessage("Unable to delete this strategy right now.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500">Workflow Tools</h2>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {buildStrategyDisplayLabel(strategy)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Use these tools to clone, export, or annotate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(strategy.id)}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          Copy ID
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1">
          {strategy.id}
        </span>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1">
          Seed {strategy.seed ?? strategy.simulationSeed ?? "Unavailable"}
        </span>
        {strategy.shockId ? (
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1">
            Shock {strategy.shockId}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => downloadStrategy(strategy, savedNote)}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => void handleClone()}
          disabled={isCloning}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCloning ? "Cloning..." : "Clone Strategy"}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:border-rose-400"
        >
          Delete
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <label
          className="block text-sm font-medium text-zinc-100"
          htmlFor={`strategy-note-${strategy.id}`}
        >
          <span className="block">Private note</span>
          <textarea
            id={`strategy-note-${strategy.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a quick annotation for yourself..."
            className="mt-2 min-h-28 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            Notes are stored locally in this browser and exported with the strategy snapshot.
          </p>
          <button
            type="button"
            onClick={() => persistNote(note)}
            className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
          >
            Save note
          </button>
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300">
          {statusMessage}
        </p>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
            <h3 className="text-xl font-semibold text-zinc-100">Confirm delete</h3>
            <p className="mt-2 text-sm text-zinc-400">
              This removes the strategy from your history. The action cannot be undone.
            </p>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200">
              <p className="font-medium text-zinc-100">{buildStrategyDisplayLabel(strategy)}</p>
              <p className="mt-1 text-zinc-400">{strategy.id}</p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete strategy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
