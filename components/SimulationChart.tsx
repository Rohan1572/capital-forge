"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RiskCard } from "@/components/RiskCard";
import { computeSimulationMetrics } from "@/lib/metrics";

type SimulationChartProps = {
  values: number[];
};

type HistogramBin = {
  range: string;
  count: number;
};

type PathPoint = {
  step: number;
  optimistic: number;
  median: number;
  defensive: number;
};

const HISTOGRAM_BINS = 24;
const PATH_STEPS = 48;

function buildHistogram(values: number[], bins: number): HistogramBin[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (Math.abs(max - min) <= Number.EPSILON) {
    return [{ range: `${(min * 100).toFixed(1)}%`, count: values.length }];
  }

  const width = (max - min) / bins;
  const counts = Array.from({ length: bins }, () => 0);

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / width);
    const clampedIndex = Math.min(Math.max(rawIndex, 0), bins - 1);
    counts[clampedIndex] += 1;
  }

  return counts.map((count, index) => {
    const start = min + index * width;
    const end = start + width;
    return {
      range: `${(start * 100).toFixed(1)} to ${(end * 100).toFixed(1)}%`,
      count,
    };
  });
}

function buildPathSeries(values: number[], steps: number): PathPoint[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const optimisticIndex = Math.floor((sorted.length - 1) * 0.8);
  const medianIndex = Math.floor((sorted.length - 1) * 0.5);
  const defensiveIndex = Math.floor((sorted.length - 1) * 0.2);

  const optimisticReturn = sorted[optimisticIndex];
  const medianReturn = sorted[medianIndex];
  const defensiveReturn = sorted[defensiveIndex];

  const path: PathPoint[] = [];
  let optimisticWealth = 1;
  let medianWealth = 1;
  let defensiveWealth = 1;

  for (let step = 0; step <= steps; step += 1) {
    path.push({
      step,
      optimistic: (optimisticWealth - 1) * 100,
      median: (medianWealth - 1) * 100,
      defensive: (defensiveWealth - 1) * 100,
    });

    optimisticWealth *= 1 + optimisticReturn;
    medianWealth *= 1 + medianReturn;
    defensiveWealth *= 1 + defensiveReturn;
  }

  return path;
}

function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function SimulationChart({ values }: SimulationChartProps) {
  const metrics = useMemo(() => computeSimulationMetrics(values), [values]);
  const histogramData = useMemo(() => buildHistogram(values, HISTOGRAM_BINS), [values]);
  const pathData = useMemo(() => buildPathSeries(values, PATH_STEPS), [values]);

  return (
    <section className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Simulation Analytics
        </h2>
        <p className="text-sm text-zinc-400">
          Distribution view, trajectory scenarios, and risk statistics from{" "}
          {values.length.toLocaleString()} Monte Carlo outcomes.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RiskCard label="Expected Return" value={formatPercent(metrics.expectedReturn)} />
        <RiskCard label="Volatility (Std Dev)" value={formatPercent(metrics.standardDeviation)} />
        <RiskCard label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} />
        <RiskCard label="Max Drawdown" value={formatPercent(metrics.maxDrawdown)} />
        <RiskCard label="VaR (5%)" value={formatPercent(metrics.valueAtRisk5)} />
        <RiskCard label="Prob. Loss > 30%" value={formatPercent(metrics.probabilityOfLossOver30)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 lg:col-span-3">
          <h3 className="text-base font-medium text-zinc-100">Return Distribution Histogram</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Frequency of simulated one-period portfolio returns.
          </p>
          <div className="mt-4 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ left: 10, right: 10, top: 6, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="range" tick={{ fill: "#a1a1aa", fontSize: 11 }} interval={3} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    borderColor: "#3f3f46",
                    color: "#f4f4f5",
                  }}
                />
                <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 lg:col-span-2">
          <h3 className="text-base font-medium text-zinc-100">Scenario Path Projection</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Compounded optimistic/median/defensive outcomes from percentile returns.
          </p>
          <div className="mt-4 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pathData} margin={{ left: 8, right: 8, top: 6, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="step" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value === undefined ? "N/A" : `${value.toFixed(2)}%`
                  }
                  contentStyle={{
                    background: "#09090b",
                    borderColor: "#3f3f46",
                    color: "#f4f4f5",
                  }}
                />
                <Legend wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="optimistic"
                  name="Optimistic"
                  stroke="#22c55e"
                  dot={false}
                />
                <Line type="monotone" dataKey="median" name="Median" stroke="#60a5fa" dot={false} />
                <Line
                  type="monotone"
                  dataKey="defensive"
                  name="Defensive"
                  stroke="#f97316"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
