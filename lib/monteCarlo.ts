export type Allocation = {
  equity: number;
  startups: number;
  bonds: number;
  gold: number;
  crypto: number;
  cash: number;
};

export function runMonteCarloSimulation(_allocation: Allocation, paths = 10_000): number[] {
  return Array.from({ length: paths }, () => 0);
}
