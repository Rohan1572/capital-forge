"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AllocationSlider } from "@/components/AllocationSlider";
import { AllocationDonutChart, type AllocationChartEntry } from "@/components/AllocationDonutChart";
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
import { computeSimulationMetrics, type SimulationMetrics } from "@/lib/metrics";
import { assetReturnAssumptions, simulationRegimes } from "@/lib/assetAssumptions";
import { baseCorrelationMatrix } from "@/lib/correlationMatrix";
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

const assetKeys = assetConfig.map((asset) => asset.key);
const correlationKeys = assetKeys;
const allocationColors: Record<keyof Allocation, string> = {
  equity: "#f59e0b",
  startups: "#60a5fa",
  bonds: "#34d399",
  gold: "#f97316",
  crypto: "#a78bfa",
  cash: "#f472b6",
};

const defaultAllocation: Allocation = {
  equity: 30,
  startups: 20,
  bonds: 20,
  gold: 10,
  crypto: 10,
  cash: 10,
};

const allocationPresets: Record<"Conservative" | "Balanced" | "Growth", Allocation> = {
  Conservative: {
    equity: 15,
    startups: 5,
    bonds: 40,
    gold: 15,
    crypto: 5,
    cash: 20,
  },
  Balanced: {
    equity: 25,
    startups: 10,
    bonds: 25,
    gold: 10,
    crypto: 10,
    cash: 20,
  },
  Growth: {
    equity: 40,
    startups: 20,
    bonds: 10,
    gold: 5,
    crypto: 15,
    cash: 10,
  },
};

type AllocationPresetName = keyof typeof allocationPresets;
type LockState = Record<keyof Allocation, boolean>;
type SimulationScenario = {
  label: string;
  outcomes: number[];
  metrics: SimulationMetrics;
};

type AiMeta = {
  model: string;
  latencyMs: number;
  cached?: boolean;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

type RiskAiResponse = {
  data?: {
    markdown?: string;
    meta?: AiMeta;
  };
};

type DebateAiMeta = AiMeta & {
  calls?: Array<{
    role: DebateAgentCall["role"];
    model: string;
    latencyMs: number;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  }>;
};

type DebateAiResponse = {
  data?: {
    calls?: DebateAgentCall[];
    meta?: DebateAiMeta;
  };
};

type SaveToastState = {
  strategyId: string;
};

function createSimulationSeed() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % 2_147_483_646 || 1;
}

const initialLockState: LockState = {
  equity: false,
  startups: false,
  bonds: false,
  gold: false,
  crypto: false,
  cash: false,
};

function clampPercentage(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function sumAllocation(allocation: Allocation, keys: readonly (keyof Allocation)[]) {
  return keys.reduce((total, key) => total + allocation[key], 0);
}

function distributePercentages(
  total: number,
  keys: readonly (keyof Allocation)[],
  basis: Allocation,
): Partial<Allocation> {
  if (keys.length === 0) return {};

  const positiveBasis = keys.map((key) => Math.max(basis[key], 0));
  const positiveTotal = positiveBasis.reduce((totalValue, value) => totalValue + value, 0);

  if (positiveTotal === 0) {
    const baseShare = Math.floor(total / keys.length);
    let remainder = total - baseShare * keys.length;
    const result: Partial<Allocation> = {};

    keys.forEach((key) => {
      result[key] = baseShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) {
        remainder -= 1;
      }
    });

    return result;
  }

  const rawShares = keys.map((key, index) => {
    const exact = (positiveBasis[index] / positiveTotal) * total;
    const base = Math.floor(exact);
    return {
      key,
      base,
      fraction: exact - base,
    };
  });

  const assigned = rawShares.reduce((totalValue, share) => totalValue + share.base, 0);
  let remainder = total - assigned;

  rawShares.sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; index < rawShares.length; index += 1) {
    if (remainder <= 0) break;
    rawShares[index].base += 1;
    remainder -= 1;
  }

  const result: Partial<Allocation> = {};
  rawShares.forEach((share) => {
    result[share.key] = share.base;
  });

  return result;
}

function rebalanceAllocation(
  current: Allocation,
  asset: keyof Allocation,
  requestedValue: number,
  locked: LockState,
  autoBalance: boolean,
): Allocation {
  const next: Allocation = {
    ...current,
    [asset]: clampPercentage(requestedValue),
  };

  if (!autoBalance) {
    return next;
  }

  const otherLockedKeys = assetKeys.filter((key) => locked[key] && key !== asset);
  const editableKeys = assetKeys.filter((key) => key !== asset && !locked[key]);
  const otherLockedTotal = sumAllocation(current, otherLockedKeys);
  const maxEditedValue = Math.max(0, 100 - otherLockedTotal);
  const adjustedEditedValue = Math.min(next[asset], maxEditedValue);
  next[asset] = adjustedEditedValue;

  const remaining = 100 - otherLockedTotal - adjustedEditedValue;
  if (editableKeys.length === 0) {
    next[asset] = maxEditedValue;
    return next;
  }

  if (remaining <= 0) {
    editableKeys.forEach((key) => {
      next[key] = 0;
    });
    return next;
  }

  const distribution = distributePercentages(remaining, editableKeys, current);
  editableKeys.forEach((key) => {
    next[key] = distribution[key] ?? 0;
  });

  return next;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCorrelation(value: number) {
  return value.toFixed(2);
}

function renderShockModifier(value: number | undefined) {
  if (typeof value !== "number") return "0.00";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

function formatSignedPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(2)} pp`;
}

function formatSignedNumber(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(3)}`;
}

export default function SimulatePage() {
  const [allocation, setAllocation] = useState<Allocation>(defaultAllocation);
  const [lockedAssets, setLockedAssets] = useState<LockState>(initialLockState);
  const [autoBalance, setAutoBalance] = useState(true);
  const [compareWithShock, setCompareWithShock] = useState(true);
  const [simulationResults, setSimulationResults] = useState<number[] | null>(null);
  const [simulationComparison, setSimulationComparison] = useState<{
    baseline: SimulationScenario;
    shocked: SimulationScenario | null;
  } | null>(null);
  const [aiRiskMarkdown, setAiRiskMarkdown] = useState<string | null>(null);
  const [aiRiskMeta, setAiRiskMeta] = useState<AiMeta | null>(null);
  const [aiDebateCalls, setAiDebateCalls] = useState<DebateAgentCall[] | null>(null);
  const [aiDebateMeta, setAiDebateMeta] = useState<DebateAiMeta | null>(null);
  const [activeShock, setActiveShock] = useState<ShockParameters | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<SaveToastState | null>(null);

  useEffect(() => {
    if (!saveToast) return;

    const timer = window.setTimeout(() => {
      setSaveToast(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [saveToast]);

  const totalAllocation = useMemo(() => {
    return Object.values(allocation).reduce((sum, value) => sum + value, 0);
  }, [allocation]);

  const allocationChartEntries = useMemo<AllocationChartEntry[]>(() => {
    return assetConfig.map((asset) => ({
      label: asset.label,
      value: allocation[asset.key],
      color: allocationColors[asset.key],
      locked: lockedAssets[asset.key],
    }));
  }, [allocation, lockedAssets]);

  const allocationDelta = 100 - totalAllocation;
  const isAllocationValid = totalAllocation === 100;

  function handleSliderChange(asset: keyof Allocation, value: number) {
    setAllocation((current) =>
      rebalanceAllocation(current, asset, value, lockedAssets, autoBalance),
    );
  }

  function handlePresetChange(preset: AllocationPresetName) {
    setAllocation({ ...allocationPresets[preset] });
    setError(null);
  }

  function handleToggleLock(asset: keyof Allocation) {
    setLockedAssets((current) => ({
      ...current,
      [asset]: !current[asset],
    }));
  }

  function handleToggleAutoBalance() {
    setAutoBalance((current) => !current);
  }

  function handleToggleCompareWithShock() {
    setCompareWithShock((current) => !current);
  }

  function handleResetAllocation() {
    setAllocation({ ...defaultAllocation });
    setLockedAssets({ ...initialLockState });
    setAutoBalance(true);
  }

  async function handleRunSimulation() {
    if (!isAllocationValid || isSimulating) return;

    setIsSimulating(true);
    setError(null);
    setSaveToast(null);
    setAiDebateCalls(null);
    setAiDebateMeta(null);
    setActiveShock(null);

    // Yield once so the loading state paints before CPU-heavy simulation work starts.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    try {
      const runSeed = createSimulationSeed();
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

      const baselineCacheKey = [
        buildSimulationCacheKey(allocation),
        "seed",
        runSeed,
        "shock:none",
      ].join("|");
      const baselineCached = simulationCache.get(baselineCacheKey);
      const baselineOutcomes =
        baselineCached ?? runMonteCarloSimulation(allocation, undefined, undefined, runSeed);
      if (!baselineCached) {
        simulationCache.set(baselineCacheKey, baselineOutcomes);
      }

      const shouldCompareWithShock = compareWithShock && Boolean(shockForRun);
      const shockedOutcomes =
        shouldCompareWithShock && shockForRun
          ? (() => {
              const shockCacheKey = [
                buildSimulationCacheKey(allocation),
                `seed:${runSeed}`,
                `shock:${shockForRun.id}`,
              ].join("|");
              const cached = simulationCache.get(shockCacheKey);
              const nextOutcomes =
                cached ??
                runMonteCarloSimulationWithShock(
                  allocation,
                  shockForRun,
                  undefined,
                  undefined,
                  runSeed,
                );
              if (!cached) {
                simulationCache.set(shockCacheKey, nextOutcomes);
              }
              return nextOutcomes;
            })()
          : null;

      const baselineScenario: SimulationScenario = {
        label: "Baseline",
        outcomes: baselineOutcomes,
        metrics: computeSimulationMetrics(baselineOutcomes),
      };
      const shockedScenario: SimulationScenario | null = shockedOutcomes
        ? {
            label: `Active shock: ${shockForRun?.title ?? "Enabled"}`,
            outcomes: shockedOutcomes,
            metrics: computeSimulationMetrics(shockedOutcomes),
          }
        : null;

      const selectedScenario = shockedScenario ?? baselineScenario;
      const metrics = selectedScenario.metrics;

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
            simulationResults: selectedScenario.outcomes,
            simulationSeed: runSeed,
            simulationMode: shockedScenario ? "shocked" : "baseline",
            simulationShock: shockedScenario && shockForRun ? shockForRun : null,
          }),
        }),
      ]);

      let errorMessage: string | null = null;
      let savedStrategyId: string | null = null;
      if (!saveResponse.ok) {
        errorMessage = "Simulation saved locally, but the strategy could not be stored.";
      } else {
        const savePayload = (await saveResponse.json()) as { data?: { id?: string } };
        savedStrategyId = savePayload.data?.id ?? null;
      }

      if (aiRiskResponse.ok) {
        const payload = (await aiRiskResponse.json()) as RiskAiResponse;
        setAiRiskMarkdown(payload.data?.markdown ?? null);
        setAiRiskMeta(payload.data?.meta ?? null);
      } else if (aiRiskResponse.status === 429) {
        setAiRiskMarkdown(null);
        setAiRiskMeta(null);
        errorMessage ??= "AI insights are rate limited. Please wait a minute and try again.";
      } else {
        setAiRiskMarkdown(null);
        setAiRiskMeta(null);
        errorMessage ??= "AI insights are unavailable right now.";
      }

      if (aiDebateResponse.ok) {
        const payload = (await aiDebateResponse.json()) as DebateAiResponse;
        setAiDebateCalls(payload.data?.calls ?? null);
        setAiDebateMeta(payload.data?.meta ?? null);
      } else if (aiDebateResponse.status === 429) {
        setAiDebateCalls(null);
        setAiDebateMeta(null);
        errorMessage ??= "AI debate insights are rate limited. Please wait a minute and try again.";
      } else {
        setAiDebateCalls(null);
        setAiDebateMeta(null);
        errorMessage ??= "AI debate insights are unavailable right now.";
      }

      setError(errorMessage);
      setSimulationResults(selectedScenario.outcomes);
      setSimulationComparison({
        baseline: baselineScenario,
        shocked: shockedScenario,
      });
      if (savedStrategyId) {
        setSaveToast({ strategyId: savedStrategyId });
      }
    } catch (err) {
      console.error("Simulation failed", err);
      setError("Simulation failed. Please try again.");
      setAiRiskMeta(null);
      setAiDebateMeta(null);
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Portfolio Allocation</h1>
        <p className="text-zinc-400">
          Set allocation percentages across assets. Your total allocation must equal exactly 100%.
        </p>
      </header>

      <details className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">
          Assumptions
        </summary>
        <div className="mt-5 grid gap-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Means and Volatilities
            </h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-950/80 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Mean</th>
                    <th className="px-4 py-3">Volatility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950/40 text-zinc-200">
                  {assetKeys.map((asset) => (
                    <tr key={asset}>
                      <td className="px-4 py-3 capitalize">{asset}</td>
                      <td className="px-4 py-3">
                        {formatPercent(assetReturnAssumptions[asset].mean)}
                      </td>
                      <td className="px-4 py-3">
                        {formatPercent(assetReturnAssumptions[asset].volatility)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Correlation Matrix
            </h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-950/80 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    {correlationKeys.map((asset) => (
                      <th key={asset} className="px-4 py-3 capitalize">
                        {asset}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950/40 text-zinc-200">
                  {correlationKeys.map((rowKey) => (
                    <tr key={rowKey}>
                      <td className="px-4 py-3 capitalize text-zinc-100">{rowKey}</td>
                      {correlationKeys.map((colKey) => (
                        <td key={colKey} className="px-4 py-3 tabular-nums">
                          {formatCorrelation(baseCorrelationMatrix[rowKey][colKey])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Crash Regime
              </h2>
              <dl className="mt-3 grid gap-2 text-sm text-zinc-200">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Probability</dt>
                  <dd>{formatPercent(simulationRegimes.crash.probability)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Volatility multiplier</dt>
                  <dd>{simulationRegimes.crash.volatilityMultiplier.toFixed(2)}x</dd>
                </div>
                <div>
                  <dt className="text-zinc-400">Crash shocks</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {assetKeys.map((asset) => {
                      const shock = simulationRegimes.crash.shocks[asset];
                      if (typeof shock !== "number") return null;
                      return (
                        <span
                          key={asset}
                          className="rounded-full border border-rose-500/30 bg-rose-950/30 px-3 py-1 text-xs text-rose-200"
                        >
                          {asset}: {formatPercent(shock)}
                        </span>
                      );
                    })}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Shock Modifiers
              </h2>
              {activeShock ? (
                <div className="mt-3 space-y-3 text-sm text-zinc-200">
                  <div>
                    <p className="font-medium text-zinc-100">{activeShock.title}</p>
                    <p className="mt-1 text-zinc-400">{activeShock.description}</p>
                  </div>
                  <dl className="grid gap-2">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-zinc-400">Mean shift</dt>
                      <dd>{renderShockModifier(activeShock.meanShift)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-zinc-400">Volatility multiplier</dt>
                      <dd>{activeShock.volatilityMultiplier.toFixed(2)}x</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-zinc-400">Correlation shift</dt>
                      <dd>{renderShockModifier(activeShock.correlationShift)}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">
                  No active shock is loaded yet. Run a simulation to populate the current shock
                  modifiers.
                </p>
              )}
            </article>
          </section>
        </div>
      </details>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Presets</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Start with a conservative, balanced, or growth-oriented mix.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(allocationPresets) as AllocationPresetName[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-amber-400/60 hover:text-amber-100"
              >
                {preset}
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetAllocation}
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToggleAutoBalance}
            aria-pressed={autoBalance}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              autoBalance
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            Auto-balance: {autoBalance ? "On" : "Off"}
          </button>
          <p className="text-sm text-zinc-500">
            {autoBalance
              ? "Unlocked assets will redistribute automatically to keep the total at 100%."
              : "Manual edits are freeform until the total reaches 100%."}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
          <button
            type="button"
            onClick={handleToggleCompareWithShock}
            aria-pressed={compareWithShock}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              compareWithShock
                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            Compare with active shock: {compareWithShock ? "On" : "Off"}
          </button>
          <p className="text-sm text-zinc-500">
            {compareWithShock
              ? "The next run will compute baseline and shocked outcomes side by side."
              : "The next run will use the baseline scenario only."}
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-4 md:grid-cols-2">
            {assetConfig.map((asset) => (
              <AllocationSlider
                key={asset.key}
                label={asset.label}
                value={allocation[asset.key]}
                locked={lockedAssets[asset.key]}
                onChange={(value) => handleSliderChange(asset.key, value)}
                onToggleLock={() => handleToggleLock(asset.key)}
              />
            ))}
          </div>

          <AllocationDonutChart entries={allocationChartEntries} />
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
        <p className="mt-2 text-xs text-zinc-400">
          Locked assets: {assetKeys.filter((key) => lockedAssets[key]).length}/{assetKeys.length}
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

      {simulationComparison?.shocked ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Shock Comparison</h2>
              <p className="text-sm text-zinc-400">
                Baseline assumptions compared against the active shock.
              </p>
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-200">
              {simulationComparison.shocked.label}
            </div>
          </header>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {[
              {
                label: "Expected Return",
                baseline: simulationComparison.baseline.metrics.expectedReturn,
                shocked: simulationComparison.shocked.metrics.expectedReturn,
                formatter: formatSignedPercent,
              },
              {
                label: "Sharpe Ratio",
                baseline: simulationComparison.baseline.metrics.sharpeRatio,
                shocked: simulationComparison.shocked.metrics.sharpeRatio,
                formatter: formatSignedNumber,
              },
              {
                label: "Max Drawdown",
                baseline: simulationComparison.baseline.metrics.maxDrawdown,
                shocked: simulationComparison.shocked.metrics.maxDrawdown,
                formatter: formatSignedPercent,
              },
              {
                label: "VaR (5%)",
                baseline: simulationComparison.baseline.metrics.valueAtRisk5,
                shocked: simulationComparison.shocked.metrics.valueAtRisk5,
                formatter: formatSignedPercent,
              },
            ].map((metric) => {
              const delta = metric.shocked - metric.baseline;
              return (
                <article
                  key={metric.label}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-zinc-500">{metric.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-zinc-100">
                        {metric.formatter(metric.shocked)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Baseline {metric.formatter(metric.baseline)}
                      </p>
                    </div>
                    <p className={delta >= 0 ? "text-emerald-300" : "text-rose-300"}>
                      {metric.formatter(delta)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-950/80 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3">Baseline</th>
                    <th className="px-4 py-3">Shock</th>
                    <th className="px-4 py-3">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950/40 text-zinc-200">
                  {[
                    {
                      label: "Expected Return",
                      baseline: simulationComparison.baseline.metrics.expectedReturn,
                      shocked: simulationComparison.shocked.metrics.expectedReturn,
                      formatter: formatPercent,
                      deltaFormatter: formatSignedPercent,
                    },
                    {
                      label: "Standard Deviation",
                      baseline: simulationComparison.baseline.metrics.standardDeviation,
                      shocked: simulationComparison.shocked.metrics.standardDeviation,
                      formatter: formatPercent,
                      deltaFormatter: formatSignedPercent,
                    },
                    {
                      label: "Sharpe Ratio",
                      baseline: simulationComparison.baseline.metrics.sharpeRatio,
                      shocked: simulationComparison.shocked.metrics.sharpeRatio,
                      formatter: (value: number) => value.toFixed(3),
                      deltaFormatter: formatSignedNumber,
                    },
                    {
                      label: "Max Drawdown",
                      baseline: simulationComparison.baseline.metrics.maxDrawdown,
                      shocked: simulationComparison.shocked.metrics.maxDrawdown,
                      formatter: formatPercent,
                      deltaFormatter: formatSignedPercent,
                    },
                    {
                      label: "VaR (5%)",
                      baseline: simulationComparison.baseline.metrics.valueAtRisk5,
                      shocked: simulationComparison.shocked.metrics.valueAtRisk5,
                      formatter: formatPercent,
                      deltaFormatter: formatSignedPercent,
                    },
                    {
                      label: "CVaR (95%)",
                      baseline: simulationComparison.baseline.metrics.conditionalValueAtRisk95,
                      shocked: simulationComparison.shocked.metrics.conditionalValueAtRisk95,
                      formatter: formatPercent,
                      deltaFormatter: formatSignedPercent,
                    },
                  ].map((row) => {
                    const delta = row.shocked - row.baseline;
                    return (
                      <tr key={row.label}>
                        <td className="px-4 py-3 font-medium text-zinc-100">{row.label}</td>
                        <td className="px-4 py-3">{row.formatter(row.baseline)}</td>
                        <td className="px-4 py-3">{row.formatter(row.shocked)}</td>
                        <td
                          className={`px-4 py-3 ${
                            delta >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {row.deltaFormatter(delta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
      {aiRiskMarkdown ? (
        <RiskExplainerPanel markdown={aiRiskMarkdown} meta={aiRiskMeta ?? undefined} />
      ) : null}
      {aiDebateCalls ? (
        <AIDebatePanel calls={aiDebateCalls} meta={aiDebateMeta ?? undefined} />
      ) : null}

      {saveToast ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(100%-2.5rem,24rem)] rounded-xl border border-emerald-400/30 bg-emerald-950/95 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-100">Strategy saved successfully</p>
              <p className="mt-1 text-sm text-emerald-200/80">
                Your run is available in strategy history.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaveToast(null)}
              className="rounded-full border border-emerald-400/30 px-2 py-1 text-xs text-emerald-100 transition hover:border-emerald-300"
              aria-label="Dismiss save notification"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={`/strategy/${saveToast.strategyId}`}
              className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-100 transition hover:border-emerald-300"
            >
              Open strategy detail
            </Link>
            <span className="text-xs text-emerald-200/70">ID {saveToast.strategyId}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
