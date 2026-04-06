"use client";

import { useEffect, useRef, useState } from "react";
import { type ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Legend, Pie, PieChart, Tooltip } from "recharts";

export type AllocationChartEntry = {
  label: string;
  value: number;
  color: string;
  locked?: boolean;
};

type AllocationDonutChartProps = Readonly<{
  entries: readonly AllocationChartEntry[];
}>;

const CHART_COLORS = ["#f59e0b", "#60a5fa", "#34d399", "#f97316", "#a78bfa", "#f472b6"];

type ChartSize = {
  width: number;
  height: number;
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatTooltipValue(value: ValueType | undefined) {
  if (typeof value === "number") {
    return `${value.toFixed(1)}%`;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
}

function useChartSize<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [containerRef, size] as const;
}

export function AllocationDonutChart({ entries }: AllocationDonutChartProps) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const [chartRef, chartSize] = useChartSize<HTMLDivElement>();
  const chartData = entries.map((entry, index) => ({
    ...entry,
    fill: entry.color ?? CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Live Allocation Mix</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Real-time view of portfolio weights while you adjust sliders.
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
          Total {formatPercent(total)}
        </span>
      </div>

      <div ref={chartRef} className="mt-4 h-[280px] w-full">
        {chartSize ? (
          <PieChart width={chartSize.width} height={chartSize.height}>
            <Tooltip
              formatter={formatTooltipValue}
              contentStyle={{
                background: "#09090b",
                borderColor: "#3f3f46",
                color: "#f4f4f5",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={44}
              wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={64}
              outerRadius={100}
              paddingAngle={2}
              stroke="#09090b"
              strokeWidth={2}
            ></Pie>
          </PieChart>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className="text-zinc-100">{entry.label}</span>
              {entry.locked ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-100">
                  Locked
                </span>
              ) : null}
            </div>
            <span className="text-zinc-300 tabular-nums">{entry.value.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
