import { assetReturnAssumptions, type AssetKey } from "@/lib/assetAssumptions";

export type Allocation = {
  equity: number;
  startups: number;
  bonds: number;
  gold: number;
  crypto: number;
  cash: number;
};

const assetKeys = Object.keys(assetReturnAssumptions) as AssetKey[];

function sampleStandardNormal(): number {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
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

export function runMonteCarloSimulation(allocation: Allocation, paths = 10_000): number[] {
  const weights = normalizeAllocation(allocation);

  return Array.from({ length: paths }, () => {
    return assetKeys.reduce((portfolioReturn, key) => {
      const { mean, volatility } = assetReturnAssumptions[key];
      const sampledReturn = mean + volatility * sampleStandardNormal();
      return portfolioReturn + weights[key] * sampledReturn;
    }, 0);
  });
}
