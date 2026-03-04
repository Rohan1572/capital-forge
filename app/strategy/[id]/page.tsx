type StrategyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-semibold">Strategy: {id}</h1>
      <p className="text-zinc-400">
        Detailed strategy metrics, history, and AI critique will appear here.
      </p>
    </main>
  );
}
