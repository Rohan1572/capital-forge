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
    "Evaluate the strategy and provide concise, practical improvements.",
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
