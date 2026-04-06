import { MetricLabel } from "@/components/MetricLabel";
import type { MetricKey } from "@/lib/metricDefinitions";

type RiskCardProps = Readonly<{
  label: string;
  value: string;
  metric?: MetricKey;
}>;

export function RiskCard({ label, value, metric }: RiskCardProps) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
        {metric ? <MetricLabel metric={metric} label={label} /> : label}
      </p>
      <p className="mt-2 text-xl font-semibold text-zinc-100">{value}</p>
    </article>
  );
}
