"use client";

import { useMemo, useState } from "react";
import { AllocationSlider } from "@/components/AllocationSlider";
import { RiskExplainerPanel } from "@/components/RiskExplainerPanel";
import {
  SkeletonBlock,
  SkeletonGrid,
  SkeletonSection,
  SkeletonStack,
} from "@/components/LoadingSkeleton";
import { TTLCache, buildSimulationCacheKey } from "@/lib/cache";
import type { Allocation } from "@/lib/monteCarlo";
import { runMonteCarloSimulation } from "@/lib/monteCarlo";
import { SimulationChart } from "@/components/SimulationChart";
import { computeSimulationMetrics } from "@/lib/metrics";

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

    // Yield once so the loading state paints before CPU-heavy simulation work starts.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    try {
      const cacheKey = buildSimulationCacheKey(allocation);
      const cached = simulationCache.get(cacheKey);
      const outcomes = cached ?? runMonteCarloSimulation(allocation);
      if (!cached) {
        simulationCache.set(cacheKey, outcomes);
      }

      const metrics = computeSimulationMetrics(outcomes);

      const [aiResponse, saveResponse] = await Promise.all([
        fetch("/api/ai/risk", {
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

      if (!saveResponse.ok) {
        setError("Simulation saved locally, but the strategy could not be stored.");
      }

      if (aiResponse.ok) {
        const payload = (await aiResponse.json()) as { data?: { markdown?: string } };
        setAiRiskMarkdown(payload.data?.markdown ?? null);
      } else if (aiResponse.status === 429) {
        setAiRiskMarkdown(null);
        setError("AI insights are rate limited. Please wait a minute and try again.");
      } else {
        setAiRiskMarkdown(null);
        setError("AI insights are unavailable right now.");
      }

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

      {simulationResults ? <SimulationChart values={simulationResults} /> : null}
      {aiRiskMarkdown ? <RiskExplainerPanel markdown={aiRiskMarkdown} /> : null}
    </main>
  );
}
