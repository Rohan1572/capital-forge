import {
  assetReturnAssumptions,
  type AssetKey,
  type AssetReturnAssumptions,
} from "@/lib/assetAssumptions";
import { applyShockToAssumptions, type ShockParameters } from "@/lib/shockEngine";

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

function buildAssumptionArrays(assumptions: AssetReturnAssumptions) {
  const means = new Array<number>(assetKeys.length);
  const volatilities = new Array<number>(assetKeys.length);

  for (let i = 0; i < assetKeys.length; i += 1) {
    const key = assetKeys[i];
    means[i] = assumptions[key].mean;
    volatilities[i] = assumptions[key].volatility;
  }

  return { means, volatilities };
}

export function generateAssetYearlyReturn(
  asset: AssetKey,
  assumptions: AssetReturnAssumptions = assetReturnAssumptions,
): number {
  const { mean, volatility } = assumptions[asset];
  return mean + volatility * sampleStandardNormal();
}

export function generateYearlyAssetReturns(
  assumptions: AssetReturnAssumptions = assetReturnAssumptions,
): Record<AssetKey, number> {
  return assetKeys.reduce<Record<AssetKey, number>>(
    (returns, key) => {
      returns[key] = generateAssetYearlyReturn(key, assumptions);
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

export function runMonteCarloSimulation(
  allocation: Allocation,
  assumptions: AssetReturnAssumptions = assetReturnAssumptions,
): number[] {
  const weights = normalizeAllocation(allocation);
  const weightArray = new Array<number>(assetKeys.length);
  const { means, volatilities } = buildAssumptionArrays(assumptions);

  for (let i = 0; i < assetKeys.length; i += 1) {
    weightArray[i] = weights[assetKeys[i]];
  }

  const outcomes = new Array<number>(MONTE_CARLO_ITERATIONS);

  for (let iteration = 0; iteration < MONTE_CARLO_ITERATIONS; iteration += 1) {
    let portfolioReturn = 0;

    for (let assetIndex = 0; assetIndex < assetKeys.length; assetIndex += 1) {
      const sample = sampleStandardNormal();
      portfolioReturn +=
        weightArray[assetIndex] * (means[assetIndex] + volatilities[assetIndex] * sample);
    }

    outcomes[iteration] = portfolioReturn;
  }

  return outcomes;
}

export function runMonteCarloSimulationWithShock(
  allocation: Allocation,
  shock: ShockParameters,
  baseAssumptions: AssetReturnAssumptions = assetReturnAssumptions,
): number[] {
  const shockedAssumptions = applyShockToAssumptions(baseAssumptions, shock);
  return runMonteCarloSimulation(allocation, shockedAssumptions);
}
