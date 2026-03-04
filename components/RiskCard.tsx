type RiskCardProps = {
  label: string;
  value: string;
};

export function RiskCard({ label, value }: RiskCardProps) {
  return (
    <article className="rounded-lg border border-zinc-800 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </article>
  );
}
