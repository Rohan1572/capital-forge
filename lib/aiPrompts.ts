import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";

export type RiskPromptInput = {
  allocation: Allocation;
  expectedReturn: number;
  sharpeRatio: number;
  valueAtRisk: number;
  maxDrawdown: number;
};

export function buildRiskPromptInput(
  allocation: Allocation,
  metrics: SimulationMetrics,
): RiskPromptInput {
  return {
    allocation,
    expectedReturn: metrics.expectedReturn,
    sharpeRatio: metrics.sharpeRatio,
    valueAtRisk: metrics.valueAtRisk5,
    maxDrawdown: metrics.maxDrawdown,
  };
}

export function buildRiskExplainerPrompt(input: RiskPromptInput): string {
  return [
    "You are a portfolio risk analyst.",
    "Use a professional tone suitable for an investment committee memo.",
    "Identify portfolio weaknesses using the provided metrics and allocation mix.",
    "Suggest specific allocation improvements with practical rationale.",
    "Clearly highlight downside risks, including tail-risk implications from VaR and drawdown.",
    "Respond in concise bullet points under these headings: Overall Assessment, Weaknesses, Allocation Improvements, Downside Risks.",
    `Allocation: ${JSON.stringify(input.allocation)}`,
    `Expected Return: ${input.expectedReturn}`,
    `Sharpe Ratio: ${input.sharpeRatio}`,
    `Value at Risk (95%): ${input.valueAtRisk}`,
    `Max Drawdown: ${input.maxDrawdown}`,
  ].join("\n");
}

export function buildRiskExplainerPromptFromMetrics(
  allocation: Allocation,
  metrics: SimulationMetrics,
): string {
  return buildRiskExplainerPrompt(buildRiskPromptInput(allocation, metrics));
}
