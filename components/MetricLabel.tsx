"use client";

import { useId, useState } from "react";
import { metricDefinitions, type MetricKey } from "@/lib/metricDefinitions";

type MetricLabelProps = Readonly<{
  metric: MetricKey;
  label: string;
  className?: string;
}>;

export function MetricLabel({ metric, label, className }: MetricLabelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <span>{label}</span>
      <span className="relative inline-flex">
        <button
          type="button"
          title={metricDefinitions[metric]}
          aria-label={`${label}: ${metricDefinitions[metric]}`}
          aria-describedby={isOpen ? tooltipId : undefined}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 focus-visible:border-amber-400 focus-visible:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 touch-manipulation"
        >
          i
        </button>
        {isOpen ? (
          <span
            id={tooltipId}
            role="tooltip"
            className="absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-xs leading-5 text-zinc-200 shadow-lg shadow-black/30"
          >
            {metricDefinitions[metric]}
          </span>
        ) : null}
      </span>
    </span>
  );
}
