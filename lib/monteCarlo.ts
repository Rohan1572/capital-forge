import {
  assetReturnAssumptions,
  simulationRegimes,
  type AssetKey,
  type AssetReturnAssumptions,
  type SimulationRegimes,
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

type RandomSource = () => number;

function createSeededRandom(seed: number): RandomSource {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function resolveRandomSource(seed?: number): RandomSource {
  if (seed === undefined) {
    return Math.random;
  }

  return createSeededRandom(seed);
}

function nextRandomValue(random: RandomSource): number {
  const value = random();
  if (value <= 0) return Number.EPSILON;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

function sampleStandardNormal(random: RandomSource): number {
  let u = 0;
  let v = 0;

  while (u === 0) u = nextRandomValue(random);
  while (v === 0) v = nextRandomValue(random);

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateCorrelatedStandardNormals(cholesky: number[][], random: RandomSource): number[] {
  const size = cholesky.length;
  const independent = new Array<number>(size);
  const correlated = new Array<number>(size);

  for (let i = 0; i < size; i += 1) {
    independent[i] = sampleStandardNormal(random);
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
  seed?: number,
): number {
  const { mean, volatility } = assumptions[asset];
  const random = resolveRandomSource(seed);
  return mean + volatility * sampleStandardNormal(random);
}

export function generateYearlyAssetReturns(
  assumptions: AssetReturnAssumptions = assetReturnAssumptions,
  seed?: number,
): Record<AssetKey, number> {
  const { means, volatilities } = buildAssumptionArrays(assumptions);
  const random = resolveRandomSource(seed);
  const samples = generateCorrelatedStandardNormals(baseCholesky, random);

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
  regimes: SimulationRegimes = simulationRegimes,
  seed?: number,
): number[] {
  const weights = normalizeAllocation(allocation);
  const weightArray = new Array<number>(assetKeys.length);
  const { means, volatilities } = buildAssumptionArrays(assumptions);
  const crashConfig = regimes.crash;
  const crashProbability = Math.min(Math.max(crashConfig.probability, 0), 1);
  const crashVolatilityMultiplier = Math.max(crashConfig.volatilityMultiplier, 0);
  const crashShocks = crashConfig.shocks;

  for (let i = 0; i < assetKeys.length; i += 1) {
    weightArray[i] = weights[assetKeys[i]];
  }

  const outcomes = new Array<number>(MONTE_CARLO_ITERATIONS);
  const random = resolveRandomSource(seed);

  for (let iteration = 0; iteration < MONTE_CARLO_ITERATIONS; iteration += 1) {
    let portfolioReturn = 0;
    const isCrash = random() < crashProbability;
    const samples = generateCorrelatedStandardNormals(baseCholesky, random);

    for (let assetIndex = 0; assetIndex < assetKeys.length; assetIndex += 1) {
      const assetKey = assetKeys[assetIndex];
      const crashShock = isCrash ? crashShocks[assetKey] : undefined;
      const volatility =
        crashShock === undefined
          ? volatilities[assetIndex]
          : volatilities[assetIndex] * crashVolatilityMultiplier;
      portfolioReturn +=
        weightArray[assetIndex] *
        (means[assetIndex] + volatility * samples[assetIndex] + (crashShock ?? 0));
    }

    outcomes[iteration] = portfolioReturn;
  }

  return outcomes;
}

export function runMonteCarloSimulationWithShock(
  allocation: Allocation,
  shock: ShockParameters,
  baseAssumptions: AssetReturnAssumptions = assetReturnAssumptions,
  regimes: SimulationRegimes = simulationRegimes,
  seed?: number,
): number[] {
  const shockedAssumptions = applyShockToAssumptions(baseAssumptions, shock);
  return runMonteCarloSimulation(allocation, shockedAssumptions, regimes, seed);
}
