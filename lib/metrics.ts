export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  if (variance <= Number.EPSILON) return 0;
  return Math.sqrt(variance);
}

export type SimulationMetrics = {
  expectedReturn: number;
  standardDeviation: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk5: number;
  conditionalValueAtRisk95: number;
  probabilityOfLossOver30: number;
};

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;

  const clamped = Math.min(Math.max(p, 0), 1);
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * clamped;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function sharpeRatio(values: readonly number[], riskFreeRate = 0): number {
  if (values.length === 0) return 0;
  const volatility = standardDeviation(values);
  if (volatility <= Number.EPSILON) return 0;
  return (mean(values) - riskFreeRate) / volatility;
}

export function maxDrawdown(periodReturns: readonly number[]): number {
  if (periodReturns.length === 0) return 0;

  let wealth = 1;
  let peak = 1;
  let maxObservedDrawdown = 0;

  for (const periodReturn of periodReturns) {
    // A return at or below -100% is a total loss; going negative would make the
    // drawdown ratio exceed 1 and diverge.
    wealth *= Math.max(1 + periodReturn, 0);
    peak = Math.max(peak, wealth);

    if (peak <= 0) continue;

    const drawdown = (peak - wealth) / peak;
    if (Number.isFinite(drawdown)) {
      maxObservedDrawdown = Math.max(maxObservedDrawdown, drawdown);
    }
  }

  return Math.min(maxObservedDrawdown, 1);
}

export function valueAtRisk(values: readonly number[], percentileLevel = 0.05): number {
  return percentile(values, percentileLevel);
}

export function conditionalValueAtRisk(values: readonly number[], percentileLevel = 0.05): number {
  if (values.length === 0) return 0;
  const threshold = percentile(values, percentileLevel);
  const tailValues = values.filter((value) => value <= threshold);
  if (tailValues.length === 0) return threshold;
  return mean(tailValues);
}

export function probabilityOfLossOverThreshold(values: readonly number[], threshold = 0.3): number {
  if (values.length === 0) return 0;
  const losers = values.filter((value) => value < -Math.abs(threshold)).length;
  return losers / values.length;
}

export function computeSimulationMetrics(
  simulationResults: readonly number[],
  riskFreeRate = 0,
): SimulationMetrics {
  return {
    expectedReturn: mean(simulationResults),
    standardDeviation: standardDeviation(simulationResults),
    sharpeRatio: sharpeRatio(simulationResults, riskFreeRate),
    maxDrawdown: maxDrawdown(simulationResults),
    valueAtRisk5: valueAtRisk(simulationResults, 0.05),
    conditionalValueAtRisk95: conditionalValueAtRisk(simulationResults, 0.05),
    probabilityOfLossOver30: probabilityOfLossOverThreshold(simulationResults, 0.3),
  };
}
