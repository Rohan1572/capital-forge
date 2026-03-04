type AIDebatePanelProps = {
  content: string;
};

export function AIDebatePanel({ content }: AIDebatePanelProps) {
  return (
    <section className="rounded-lg border border-zinc-800 p-4">
      <h2 className="text-lg font-medium">AI Debate Panel</h2>
      <p className="mt-2 text-sm text-zinc-300">{content}</p>
    </section>
  );
}
