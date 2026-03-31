import { AI_INPUT_COST_PER_1M_TOKENS, AI_OUTPUT_COST_PER_1M_TOKENS } from "./env";

export type AiUsageTokens = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export function estimateAiCostUsd(usage?: AiUsageTokens): number | null {
  if (!usage) return null;

  const inputTokens = typeof usage.inputTokens === "number" ? usage.inputTokens : 0;
  const outputTokens = typeof usage.outputTokens === "number" ? usage.outputTokens : 0;

  if (inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  const estimatedCost =
    (inputTokens / 1_000_000) * AI_INPUT_COST_PER_1M_TOKENS +
    (outputTokens / 1_000_000) * AI_OUTPUT_COST_PER_1M_TOKENS;

  return Number(estimatedCost.toFixed(6));
}
