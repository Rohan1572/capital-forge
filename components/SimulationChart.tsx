type SimulationChartProps = {
  values: number[];
};

export function SimulationChart({ values }: SimulationChartProps) {
  return (
    <section className="rounded-lg border border-zinc-800 p-4">
      <h2 className="text-lg font-medium">Simulation Chart</h2>
      <p className="mt-2 text-sm text-zinc-400">Chart placeholder with {values.length} samples.</p>
    </section>
  );
}
