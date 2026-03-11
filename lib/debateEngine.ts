import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import { buildDebateAgentPrompt } from "@/lib/aiPrompts";
import type { DebateAgentRole } from "@/lib/aiPrompts";

export type DebateAgentCall = {
  role: DebateAgentRole;
  prompt: string;
  response: string;
};

export type DebateSections = {
  openingStatements: string[];
  counterArguments: string[];
  finalRecommendation: string[];
};

export type DebateSequenceResult = {
  statements: string[];
  calls: DebateAgentCall[];
};

export type DebateSequenceInput = {
  allocation: Allocation;
  metrics: SimulationMetrics;
  order?: DebateAgentRole[];
  invokeAgent: (payload: { role: DebateAgentRole; prompt: string }) => Promise<string>;
};

const DEFAULT_ORDER: DebateAgentRole[] = ["conservative", "growth", "risk"];

const SECTION_LABELS = {
  opening: /opening statements?|opening statement/i,
  counter: /counter arguments?|counterpoints?/i,
  recommendation: /final recommendation|recommendation/i,
};

function normalizeLine(line: string): string {
  return line
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

export function parseDebateSections(text: string): DebateSections {
  const sections: DebateSections = {
    openingStatements: [],
    counterArguments: [],
    finalRecommendation: [],
  };

  const lines = text.split("\n").map((line) => line.trim());
  let current: keyof DebateSections | null = null;

  for (const line of lines) {
    if (!line) continue;

    if (SECTION_LABELS.opening.test(line)) {
      current = "openingStatements";
      continue;
    }
    if (SECTION_LABELS.counter.test(line)) {
      current = "counterArguments";
      continue;
    }
    if (SECTION_LABELS.recommendation.test(line)) {
      current = "finalRecommendation";
      continue;
    }

    const cleaned = normalizeLine(line);
    if (!cleaned) continue;

    if (!current) {
      sections.openingStatements.push(cleaned);
      continue;
    }

    sections[current].push(cleaned);
  }

  return sections;
}

export async function runDebateSequence(input: DebateSequenceInput): Promise<DebateSequenceResult> {
  const order = input.order?.length ? input.order : DEFAULT_ORDER;
  const statements: string[] = [];
  const calls: DebateAgentCall[] = [];

  for (const role of order) {
    const prompt = buildDebateAgentPrompt({
      role,
      allocation: input.allocation,
      metrics: input.metrics,
      priorStatements: statements,
    });

    const response = (await input.invokeAgent({ role, prompt })).trim();
    statements.push(response);
    calls.push({ role, prompt, response });
  }

  return { statements, calls };
}
