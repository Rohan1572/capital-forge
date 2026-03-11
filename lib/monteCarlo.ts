import {
  assetReturnAssumptions,
  type AssetKey,
  type AssetReturnAssumptions,
} from "@/lib/assetAssumptions";
import {
  baseCorrelationMatrix,
  clampCorrelation,
  type CorrelationMatrix,
} from "@/lib/correlationMatrix";
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

function buildCorrelationArray(correlation: CorrelationMatrix): number[][] {
  const size = assetKeys.length;
  const matrix = new Array<number[]>(size);

  for (let i = 0; i < size; i += 1) {
    const row = new Array<number>(size);
    const key = assetKeys[i];

    for (let j = 0; j < size; j += 1) {
      const otherKey = assetKeys[j];
      const value = correlation[key]?.[otherKey] ?? (i === j ? 1 : 0);
      row[j] = i === j ? 1 : clampCorrelation(value);
    }

    matrix[i] = row;
  }

  return matrix;
}

function choleskyDecomposition(matrix: number[][]): number[][] {
  const size = matrix.length;
  const lower = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const epsilon = 1e-12;

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = 0;

      for (let k = 0; k < j; k += 1) {
        sum += lower[i][k] * lower[j][k];
      }

      if (i === j) {
        const diag = matrix[i][i] - sum;
        lower[i][j] = Math.sqrt(Math.max(diag, 0));
        if (lower[i][j] < epsilon) {
          lower[i][j] = 0;
        }
      } else if (lower[j][j] === 0) {
        lower[i][j] = 0;
      } else {
        lower[i][j] = (matrix[i][j] - sum) / lower[j][j];
      }
    }
  }

  return lower;
}

const baseCorrelationArray = buildCorrelationArray(baseCorrelationMatrix);
const baseCholesky = choleskyDecomposition(baseCorrelationArray);

function sampleStandardNormal(): number {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateCorrelatedStandardNormals(cholesky: number[][]): number[] {
  const size = cholesky.length;
  const independent = new Array<number>(size);
  const correlated = new Array<number>(size);

  for (let i = 0; i < size; i += 1) {
    independent[i] = sampleStandardNormal();
  }

  for (let i = 0; i < size; i += 1) {
    let sum = 0;
    for (let j = 0; j <= i; j += 1) {
      sum += cholesky[i][j] * independent[j];
    }
    correlated[i] = sum;
  }

  return correlated;
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
  const { means, volatilities } = buildAssumptionArrays(assumptions);
  const samples = generateCorrelatedStandardNormals(baseCholesky);

  return assetKeys.reduce<Record<AssetKey, number>>(
    (returns, key, index) => {
      returns[key] = means[index] + volatilities[index] * samples[index];
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
    const samples = generateCorrelatedStandardNormals(baseCholesky);

    for (let assetIndex = 0; assetIndex < assetKeys.length; assetIndex += 1) {
      portfolioReturn +=
        weightArray[assetIndex] *
        (means[assetIndex] + volatilities[assetIndex] * samples[assetIndex]);
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
