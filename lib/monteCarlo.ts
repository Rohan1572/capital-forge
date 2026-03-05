import { assetReturnAssumptions, type AssetKey } from "@/lib/assetAssumptions";

export type Allocation = {
  equity: number;
  startups: number;
  bonds: number;
  gold: number;
  crypto: number;
  cash: number;
};

const MONTE_CARLO_ITERATIONS = 10_000;
const assetKeys = Object.keys(assetReturnAssumptions) as AssetKey[];

function sampleStandardNormal(): number {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateAssetYearlyReturn(asset: AssetKey): number {
  const { mean, volatility } = assetReturnAssumptions[asset];
  return mean + volatility * sampleStandardNormal();
}

export function generateYearlyAssetReturns(): Record<AssetKey, number> {
  return assetKeys.reduce<Record<AssetKey, number>>(
    (returns, key) => {
      returns[key] = generateAssetYearlyReturn(key);
      return returns;
    },
    {} as Record<AssetKey, number>,
  );
}

function normalizeAllocation(allocation: Allocation): Record<AssetKey, number> {
  const rawWeights = assetKeys.reduce<Record<AssetKey, number>>(
    (acc, key) => {
      acc[key] = Math.max(allocation[key], 0);
      return acc;
    },
    {} as Record<AssetKey, number>,
  );

  const totalWeight = assetKeys.reduce((sum, key) => sum + rawWeights[key], 0);

  if (totalWeight === 0) {
    const equalWeight = 1 / assetKeys.length;
    return assetKeys.reduce<Record<AssetKey, number>>(
      (acc, key) => {
        acc[key] = equalWeight;
        return acc;
      },
      {} as Record<AssetKey, number>,
    );
  }

  const divisor = totalWeight > 1 ? 100 : 1;
  const scaledTotal = totalWeight / divisor;

  return assetKeys.reduce<Record<AssetKey, number>>(
    (acc, key) => {
      acc[key] = rawWeights[key] / divisor / scaledTotal;
      return acc;
    },
    {} as Record<AssetKey, number>,
  );
}

export function runMonteCarloSimulation(allocation: Allocation): number[] {
  const weights = normalizeAllocation(allocation);
  const outcomes: number[] = [];

  for (let i = 0; i < MONTE_CARLO_ITERATIONS; i += 1) {
    const yearlyReturns = generateYearlyAssetReturns();

    const portfolioReturn = assetKeys.reduce((total, key) => {
      return total + weights[key] * yearlyReturns[key];
    }, 0);

    outcomes.push(portfolioReturn);
  }

  return outcomes;
}
