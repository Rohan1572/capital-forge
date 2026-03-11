import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import { buildDebateAgentPrompt } from "@/lib/aiPrompts";
import type { DebateAgentRole } from "@/lib/aiPrompts";

export type DebateAgentCall = {
  role: DebateAgentRole;
  prompt: string;
  response: string;
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
