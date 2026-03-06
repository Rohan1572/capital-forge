"use client";

import { useMemo, type ReactNode } from "react";

type RiskExplainerPanelProps = {
  markdown: string;
};

const warningKeywords = ["warning", "risk", "drawdown", "var", "tail", "loss", "downside"];

function extractRiskWarnings(markdown: string): string[] {
  const warnings = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2))
    .filter((line) => warningKeywords.some((keyword) => line.toLowerCase().includes(keyword)));

  return [...new Set(warnings)].slice(0, 3);
}

function renderMarkdownBlocks(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${key++}`} className="list-disc space-y-2 pl-5 text-sm text-zinc-200">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h-${key++}`} className="mt-4 text-base font-semibold text-zinc-100 first:mt-0">
          {line.slice(4)}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      continue;
    }

    flushList();
    elements.push(
      <p key={`p-${key++}`} className="text-sm text-zinc-300">
        {line}
      </p>,
    );
  }

  flushList();
  return elements;
}

export function RiskExplainerPanel({ markdown }: RiskExplainerPanelProps) {
  const warnings = useMemo(() => extractRiskWarnings(markdown), [markdown]);
  const markdownBlocks = useMemo(() => renderMarkdownBlocks(markdown), [markdown]);

  return (
    <section className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100">AI Risk Explainer</h2>
        <p className="text-sm text-zinc-400">
          Structured portfolio critique with emphasis on downside scenarios.
        </p>
      </header>

      {warnings.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {warnings.map((warning) => (
            <article
              key={warning}
              className="rounded-lg border border-amber-500/50 bg-amber-950/30 p-3"
            >
              <p className="text-xs uppercase tracking-[0.12em] text-amber-300">Risk Warning</p>
              <p className="mt-2 text-sm text-amber-100">{warning}</p>
            </article>
          ))}
        </div>
      ) : null}

      <article className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        {markdownBlocks}
      </article>
    </section>
  );
}
