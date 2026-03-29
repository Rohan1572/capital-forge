import { metricDefinitions, type MetricKey } from "@/lib/metricDefinitions";

type MetricLabelProps = {
  metric: MetricKey;
  label: string;
  className?: string;
};

export function MetricLabel({ metric, label, className }: MetricLabelProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <span>{label}</span>
      <span
        title={metricDefinitions[metric]}
        aria-label={metricDefinitions[metric]}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-zinc-700 text-[10px] font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
      >
        i
      </span>
    </span>
  );
}
