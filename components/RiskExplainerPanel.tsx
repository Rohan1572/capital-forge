"use client";

import { useMemo, type ReactNode } from "react";
import { AiDisclaimerBanner } from "@/components/AiDisclaimerBanner";
import { AI_DISCLOSURE_TEXT } from "@/lib/aiSafety";

type RiskExplainerPanelProps = {
  markdown: string;
  meta?: {
    model: string;
    latencyMs: number;
    cached?: boolean;
    safetyNotice?: string | null;
    safetyMatchedTerms?: string[];
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  };
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

export function RiskExplainerPanel({ markdown, meta }: RiskExplainerPanelProps) {
  const warnings = useMemo(() => extractRiskWarnings(markdown), [markdown]);
  const markdownBlocks = useMemo(() => renderMarkdownBlocks(markdown), [markdown]);

  return (
    <section className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
      <header className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">AI Risk Explainer</h2>
        <p className="text-sm text-zinc-400">
          Structured portfolio critique with emphasis on downside scenarios.
        </p>
        <AiDisclaimerBanner message={AI_DISCLOSURE_TEXT} />
        {meta ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-zinc-300">
              Model: {meta.model}
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-zinc-300">
              Latency: {meta.latencyMs}ms
            </span>
            {meta.cached ? (
              <span className="rounded-full border border-cyan-500/40 bg-cyan-950/30 px-2.5 py-1 text-cyan-200">
                Cached
              </span>
            ) : null}
            {meta.usage?.totalTokens ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-zinc-300">
                Tokens: {meta.usage.totalTokens}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {meta?.safetyNotice ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100">
          <p className="font-semibold text-amber-200">Content filtered</p>
          <p className="mt-2">{meta.safetyNotice}</p>
          {meta.safetyMatchedTerms?.length ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Flagged terms: {meta.safetyMatchedTerms.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

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
