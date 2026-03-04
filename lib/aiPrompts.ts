import type { Allocation } from "@/lib/monteCarlo";

type RiskPromptInput = {
  allocation: Allocation;
  expectedReturn: number;
  sharpeRatio: number;
  valueAtRisk: number;
  maxDrawdown: number;
};

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
