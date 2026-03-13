"use client";

import { useMemo, useState } from "react";
import { AllocationSlider } from "@/components/AllocationSlider";
import { AIDebatePanel } from "@/components/AIDebatePanel";
import { RiskExplainerPanel } from "@/components/RiskExplainerPanel";
import {
  SkeletonBlock,
  SkeletonGrid,
  SkeletonSection,
  SkeletonStack,
} from "@/components/LoadingSkeleton";
import { TTLCache, buildSimulationCacheKey } from "@/lib/cache";
import type { Allocation } from "@/lib/monteCarlo";
import { runMonteCarloSimulation, runMonteCarloSimulationWithShock } from "@/lib/monteCarlo";
import { SimulationChart } from "@/components/SimulationChart";
import { computeSimulationMetrics } from "@/lib/metrics";
import type { DebateAgentCall } from "@/lib/debateEngine";
import type { ShockParameters } from "@/lib/shockEngine";

const simulationCache = new TTLCache<number[]>({ ttlMs: 2 * 60 * 1000, maxSize: 20 });

const assetConfig: { key: keyof Allocation; label: string }[] = [
  { key: "equity", label: "Equity" },
  { key: "startups", label: "Startups" },
  { key: "bonds", label: "Bonds" },
  { key: "gold", label: "Gold" },
  { key: "crypto", label: "Crypto" },
  { key: "cash", label: "Cash" },
];

const defaultAllocation: Allocation = {
  equity: 30,
  startups: 20,
  bonds: 20,
  gold: 10,
  crypto: 10,
  cash: 10,
};

export default function SimulatePage() {
  const [allocation, setAllocation] = useState<Allocation>(defaultAllocation);
  const [simulationResults, setSimulationResults] = useState<number[] | null>(null);
  const [aiRiskMarkdown, setAiRiskMarkdown] = useState<string | null>(null);
  const [aiDebateCalls, setAiDebateCalls] = useState<DebateAgentCall[] | null>(null);
  const [activeShock, setActiveShock] = useState<ShockParameters | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAllocation = useMemo(() => {
    return Object.values(allocation).reduce((sum, value) => sum + value, 0);
  }, [allocation]);

  const allocationDelta = 100 - totalAllocation;
  const isAllocationValid = totalAllocation === 100;

  function handleSliderChange(asset: keyof Allocation, value: number) {
    setAllocation((current) => ({
      ...current,
      [asset]: value,
    }));
  }

  async function handleRunSimulation() {
    if (!isAllocationValid || isSimulating) return;

    setIsSimulating(true);
    setError(null);
    setAiDebateCalls(null);
    setActiveShock(null);

    // Yield once so the loading state paints before CPU-heavy simulation work starts.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    try {
      let shockForRun: ShockParameters | null = null;
      const shockResponse = await fetch("/api/shocks/active");
      if (shockResponse.ok) {
        const payload = (await shockResponse.json()) as {
          data?: {
            shock?: {
              id: string;
              title: string;
              description: string;
              modifiers?: {
                meanShift: number;
                volatilityMultiplier: number;
                correlationShift: number;
                meanShiftByAsset?: Record<string, number>;
                volatilityMultiplierByAsset?: Record<string, number>;
                correlationShiftByAsset?: Record<string, Record<string, number>>;
              };
            } | null;
          };
        };
        const shock = payload.data?.shock ?? null;
        const modifiers = shock?.modifiers;
        if (shock && modifiers) {
          shockForRun = {
            id: shock.id,
            title: shock.title,
            description: shock.description,
            meanShift: modifiers.meanShift,
            volatilityMultiplier: modifiers.volatilityMultiplier,
            correlationShift: modifiers.correlationShift,
            meanShiftByAsset: modifiers.meanShiftByAsset as ShockParameters["meanShiftByAsset"],
            volatilityMultiplierByAsset:
              modifiers.volatilityMultiplierByAsset as ShockParameters["volatilityMultiplierByAsset"],
            correlationShiftByAsset:
              modifiers.correlationShiftByAsset as ShockParameters["correlationShiftByAsset"],
          };
          setActiveShock(shockForRun);
        } else {
          setActiveShock(null);
        }
      }

      const cacheKey = [
        buildSimulationCacheKey(allocation),
        `shock:${shockForRun?.id ?? "none"}`,
      ].join("|");
      const cached = simulationCache.get(cacheKey);
      const outcomes =
        cached ??
        (shockForRun
          ? runMonteCarloSimulationWithShock(allocation, shockForRun)
          : runMonteCarloSimulation(allocation));
      if (!cached) {
        simulationCache.set(cacheKey, outcomes);
      }

      const metrics = computeSimulationMetrics(outcomes);

      const [aiRiskResponse, aiDebateResponse, saveResponse] = await Promise.all([
        fetch("/api/ai/risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation, metrics }),
        }),
        fetch("/api/ai/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation, metrics }),
        }),
        fetch("/api/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            allocation,
            metrics,
          }),
        }),
      ]);

      let errorMessage: string | null = null;
      if (!saveResponse.ok) {
        errorMessage = "Simulation saved locally, but the strategy could not be stored.";
      }

      if (aiRiskResponse.ok) {
        const payload = (await aiRiskResponse.json()) as { data?: { markdown?: string } };
        setAiRiskMarkdown(payload.data?.markdown ?? null);
      } else if (aiRiskResponse.status === 429) {
        setAiRiskMarkdown(null);
        errorMessage ??= "AI insights are rate limited. Please wait a minute and try again.";
      } else {
        setAiRiskMarkdown(null);
        errorMessage ??= "AI insights are unavailable right now.";
      }

      if (aiDebateResponse.ok) {
        const payload = (await aiDebateResponse.json()) as { data?: { calls?: DebateAgentCall[] } };
        setAiDebateCalls(payload.data?.calls ?? null);
      } else if (aiDebateResponse.status === 429) {
        setAiDebateCalls(null);
        errorMessage ??= "AI debate insights are rate limited. Please wait a minute and try again.";
      } else {
        setAiDebateCalls(null);
        errorMessage ??= "AI debate insights are unavailable right now.";
      }

      setError(errorMessage);
      setSimulationResults(outcomes);
    } catch (err) {
      console.error("Simulation failed", err);
      setError("Simulation failed. Please try again.");
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Portfolio Allocation</h1>
        <p className="text-zinc-400">
          Set allocation percentages across assets. Your total allocation must equal exactly 100%.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {assetConfig.map((asset) => (
            <AllocationSlider
              key={asset.key}
              label={asset.label}
              value={allocation[asset.key]}
              onChange={(value) => handleSliderChange(asset.key, value)}
            />
          ))}
        </div>
      </section>

      <section
        className={`rounded-xl border p-4 ${
          isAllocationValid
            ? "border-emerald-500/50 bg-emerald-950/30"
            : "border-rose-500/50 bg-rose-950/30"
        }`}
      >
        <p className="text-sm text-zinc-300">Total allocation: {totalAllocation}%</p>
        <p className={`mt-1 text-sm ${isAllocationValid ? "text-emerald-300" : "text-rose-300"}`}>
          {isAllocationValid
            ? "Allocation is valid. Total is exactly 100%."
            : allocationDelta > 0
              ? `Add ${allocationDelta}% to reach 100%.`
              : `Reduce allocation by ${Math.abs(allocationDelta)}% to reach 100%.`}
        </p>
      </section>

      <button
        type="button"
        disabled={!isAllocationValid || isSimulating}
        onClick={handleRunSimulation}
        className="w-fit rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        {isSimulating ? "Running Simulation..." : "Run Simulation"}
      </button>

      {error ? (
        <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error}
        </section>
      ) : null}

      {isSimulating ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-sm text-zinc-300">Simulating 10,000 market paths...</p>
          <div className="mt-4 space-y-4">
            <SkeletonBlock className="h-56 w-full" />
            <SkeletonGrid>
              <SkeletonSection title="Risk Summary" />
              <SkeletonSection title="Portfolio Risks" />
            </SkeletonGrid>
            <SkeletonStack rows={3} />
          </div>
        </section>
      ) : null}

      {simulationResults ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Simulation Results</h2>
              <p className="text-sm text-zinc-400">
                {activeShock
                  ? "Simulated with active weekly shock adjustments."
                  : "Simulated with baseline assumptions."}
              </p>
            </div>
            {activeShock ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                Weekly Shock Active
              </div>
            ) : null}
          </header>

          {activeShock ? (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/20 p-4">
              <p className="text-sm font-semibold text-amber-100">{activeShock.title}</p>
              <p className="mt-1 text-sm text-amber-200">{activeShock.description}</p>
            </div>
          ) : null}

          <div className="mt-6">
            <SimulationChart values={simulationResults} />
          </div>
        </section>
      ) : null}
      {aiRiskMarkdown ? <RiskExplainerPanel markdown={aiRiskMarkdown} /> : null}
      {aiDebateCalls ? <AIDebatePanel calls={aiDebateCalls} /> : null}
    </main>
  );
}
