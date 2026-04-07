export type MetricKey =
  | "expectedReturn"
  | "standardDeviation"
  | "sharpeRatio"
  | "valueAtRisk5"
  | "conditionalValueAtRisk95"
  | "maxDrawdown"
  | "probabilityOfLossOver30";

export const metricDefinitions: Record<MetricKey, string> = {
  expectedReturn: "Average simulated return across all outcomes.",
  standardDeviation: "Spread of outcomes around the mean return.",
  sharpeRatio: "Return earned per unit of volatility. Higher is better.",
  valueAtRisk5: "Estimated loss threshold for the worst 5% of outcomes.",
  conditionalValueAtRisk95: "Average loss in the worst 5% of outcomes.",
  maxDrawdown: "Largest peak-to-trough decline during the simulated path.",
  probabilityOfLossOver30: "Chance the portfolio loses more than 30% over the horizon.",
};
