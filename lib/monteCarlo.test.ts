import { describe, expect, it, vi } from "vitest";
import { simulationRegimes } from "./assetAssumptions";
import { baseCorrelationMatrix } from "./correlationMatrix";
import { mean, probabilityOfLossOverThreshold, standardDeviation, valueAtRisk } from "./metrics";
import { generateYearlyAssetReturns, runMonteCarloSimulation } from "./monteCarlo";

const SAMPLE_SIZE = 20_000;

function createSeededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function withDeterministicRandom<T>(seed: number, run: () => T): T {
  const random = createSeededRandom(seed);
  const spy = vi.spyOn(Math, "random").mockImplementation(() => {
    const value = random();
    return value === 0 ? 1e-12 : value;
  });

  try {
    return run();
  } finally {
    spy.mockRestore();
  }
}

function correlation(valuesA: number[], valuesB: number[]): number {
  if (valuesA.length === 0 || valuesB.length === 0 || valuesA.length !== valuesB.length) {
    return 0;
  }

  const meanA = mean(valuesA);
  const meanB = mean(valuesB);
  let covariance = 0;

  for (let i = 0; i < valuesA.length; i += 1) {
    covariance += (valuesA[i] - meanA) * (valuesB[i] - meanB);
  }

  covariance /= valuesA.length;

  const stdA = standardDeviation(valuesA);
  const stdB = standardDeviation(valuesB);

  if (stdA === 0 || stdB === 0) {
    return 0;
  }

  return covariance / (stdA * stdB);
}

describe("generateYearlyAssetReturns", () => {
  it("produces returns that respect the base correlation matrix", () => {
    const equitySamples: number[] = [];
    const startupSamples: number[] = [];
    const bondSamples: number[] = [];

    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      const returns = generateYearlyAssetReturns();
      equitySamples.push(returns.equity);
      startupSamples.push(returns.startups);
      bondSamples.push(returns.bonds);
    }

    const equityStartupCorrelation = correlation(equitySamples, startupSamples);
    const equityBondCorrelation = correlation(equitySamples, bondSamples);

    expect(Math.abs(equityStartupCorrelation - baseCorrelationMatrix.equity.startups)).toBeLessThan(
      0.08,
    );
    expect(Math.abs(equityBondCorrelation - baseCorrelationMatrix.equity.bonds)).toBeLessThan(0.08);
  });
});

describe("runMonteCarloSimulation crash regime", () => {
  it("increases left-tail risk relative to baseline", () => {
    const allocation = {
      equity: 40,
      startups: 20,
      bonds: 10,
      gold: 10,
      crypto: 15,
      cash: 5,
    };

    const baselineOutcomes = withDeterministicRandom(4242, () =>
      runMonteCarloSimulation(allocation, undefined, {
        ...simulationRegimes,
        crash: { ...simulationRegimes.crash, probability: 0 },
      }),
    );

    const crashOutcomes = withDeterministicRandom(4242, () =>
      runMonteCarloSimulation(allocation, undefined, simulationRegimes),
    );

    const baselineVar5 = valueAtRisk(baselineOutcomes, 0.05);
    const crashVar5 = valueAtRisk(crashOutcomes, 0.05);
    const baselineLoss30 = probabilityOfLossOverThreshold(baselineOutcomes, 0.3);
    const crashLoss30 = probabilityOfLossOverThreshold(crashOutcomes, 0.3);

    expect(crashVar5).toBeLessThan(baselineVar5);
    expect(crashLoss30).toBeGreaterThan(baselineLoss30);
  });
});
