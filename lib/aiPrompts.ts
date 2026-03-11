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

export type ShockGeneratorContext = {
  weekLabel?: string;
  focus?: string;
  recentConditions?: string;
};

export function buildShockGeneratorPrompt(context: ShockGeneratorContext = {}): string {
  const contextLines = [
    context.weekLabel ? `Week Label: ${context.weekLabel}` : null,
    context.focus ? `Focus: ${context.focus}` : null,
    context.recentConditions ? `Recent Conditions: ${context.recentConditions}` : null,
  ].filter(Boolean);

  return [
    "You are a macro risk strategist creating a single weekly market shock scenario.",
    "Generate a shock that is plausible, specific, and clearly tied to macro/market dynamics.",
    "Return ONLY valid JSON with the exact keys listed below.",
    "Do not include markdown or extra commentary.",
    "",
    "Required JSON keys:",
    "- title: short shock name",
    "- description: 2-3 sentence narrative",
    "- marketImpact: 3-5 bullet points as an array of strings",
    "- modifiers: object with the following keys:",
    "  - meanShift: number between -0.20 and 0.20",
    "  - volatilityMultiplier: number between 0.60 and 2.00",
    "  - correlationShift: number between -0.50 and 0.50",
    "  - meanShiftByAsset: object with optional keys equity,startups,bonds,gold,crypto,cash",
    "  - volatilityMultiplierByAsset: object with optional keys equity,startups,bonds,gold,crypto,cash",
    "  - correlationShiftByAsset: object with optional keys equity,startups,bonds,gold,crypto,cash",
    "If a per-asset object is empty, return an empty object {}.",
    "",
    "Ensure modifiers are consistent with the narrative (e.g., recession lowers mean returns, raises volatility, and increases correlations).",
    ...contextLines,
  ].join("\n");
}

function topAllocatedAssets(allocation: Allocation, count = 2): [string, number][] {
  return Object.entries(allocation)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count);
}

export function buildRiskExplainerMarkdown(input: RiskPromptInput): string {
  const topAssets = topAllocatedAssets(input.allocation)
    .map(([asset, weight]) => `${asset} (${weight}%)`)
    .join(", ");

  const weaknesses: string[] = [];
  if (input.sharpeRatio < 0.5) {
    weaknesses.push(
      `Risk-adjusted performance is weak (Sharpe ${input.sharpeRatio.toFixed(2)}), indicating return quality may not justify volatility.`,
    );
  }
  if (input.valueAtRisk <= -0.2) {
    weaknesses.push(
      `Tail-loss profile is elevated (VaR 95% ${Math.abs(input.valueAtRisk * 100).toFixed(1)}%), suggesting meaningful downside in stress periods.`,
    );
  }
  if (input.maxDrawdown >= 0.3) {
    weaknesses.push(
      `Drawdown depth is high (max drawdown ${(input.maxDrawdown * 100).toFixed(1)}%), which can pressure risk tolerance and capital preservation.`,
    );
  }
  if (weaknesses.length === 0) {
    weaknesses.push(
      "No single metric is critically weak, but concentration and tail-risk management still require monitoring.",
    );
  }

  const improvements: string[] = [];
  const growthAllocation = input.allocation.startups + input.allocation.crypto;
  if (growthAllocation > 25) {
    improvements.push(
      "Reduce combined Startups/Crypto by 5-10% and reallocate to Bonds or Cash to improve downside protection.",
    );
  }
  if (input.allocation.bonds < 15 && input.maxDrawdown >= 0.25) {
    improvements.push(
      "Increase Bonds allocation to strengthen defensive ballast during adverse return regimes.",
    );
  }
  if (input.allocation.cash > 20 && input.expectedReturn < 0.1) {
    improvements.push(
      "Trim excess Cash and redeploy gradually into diversified risk assets to lift expected return.",
    );
  }
  if (improvements.length === 0) {
    improvements.push(
      "Keep core weights stable and rebalance quarterly to maintain target risk exposures.",
    );
  }

  const downsideRisks = [
    `Warning: Historical-style stress can exceed VaR assumptions; a 95% VaR of ${(input.valueAtRisk * 100).toFixed(1)}% still leaves 5% tail outcomes potentially worse.`,
    `Warning: A drawdown profile of ${(input.maxDrawdown * 100).toFixed(1)}% can force unfavorable de-risking if liquidity needs rise.`,
    `Warning: Current concentration in ${topAssets} may amplify correlation shocks during market dislocations.`,
  ];

  return [
    "### Overall Assessment",
    `- Expected return is ${(input.expectedReturn * 100).toFixed(2)}% with Sharpe ${input.sharpeRatio.toFixed(2)}.`,
    `- The portfolio currently tilts toward ${topAssets}.`,
    "",
    "### Weaknesses",
    ...weaknesses.map((item) => `- ${item}`),
    "",
    "### Allocation Improvements",
    ...improvements.map((item) => `- ${item}`),
    "",
    "### Downside Risks",
    ...downsideRisks.map((item) => `- ${item}`),
  ].join("\n");
}
