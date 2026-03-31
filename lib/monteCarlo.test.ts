import { describe, expect, it } from "vitest";
import { simulationRegimes } from "./assetAssumptions";
import { baseCorrelationMatrix } from "./correlationMatrix";
import {
  computeSimulationMetrics,
  mean,
  probabilityOfLossOverThreshold,
  standardDeviation,
  valueAtRisk,
} from "./metrics";
import {
  generateYearlyAssetReturns,
  runMonteCarloSimulation,
  runMonteCarloSimulationWithShock,
} from "./monteCarlo";
import type { ShockParameters } from "./shockEngine";

const SAMPLE_SIZE = 20_000;

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
    const baseSeed = 1337;
    const equitySamples: number[] = [];
    const startupSamples: number[] = [];
    const bondSamples: number[] = [];

    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      const returns = generateYearlyAssetReturns(undefined, baseSeed + i);
      equitySamples.push(returns.equity);
      startupSamples.push(returns.startups);
      bondSamples.push(returns.bonds);
    }

    const equityStartupCorrelation = correlation(equitySamples, startupSamples);
    const equityBondCorrelation = correlation(equitySamples, bondSamples);

    expect(Math.abs(equityStartupCorrelation - baseCorrelationMatrix.equity.startups)).toBeLessThan(
      0.1,
    );
    expect(Math.abs(equityBondCorrelation - baseCorrelationMatrix.equity.bonds)).toBeLessThan(0.1);
  });

  it("shifts correlated asset returns upward when a positive shock is applied", () => {
    const shock: ShockParameters = {
      id: "positive-correlation-shock",
      title: "Positive Correlation Shock",
      description: "Raises cross-asset correlations for testing.",
      meanShift: 0,
      volatilityMultiplier: 1,
      correlationShift: 0.15,
    };

    const baseSeed = 4242;
    const baseEquitySamples: number[] = [];
    const baseStartupSamples: number[] = [];
    const shockedEquitySamples: number[] = [];
    const shockedStartupSamples: number[] = [];

    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      const seed = baseSeed + i;
      const baselineReturns = generateYearlyAssetReturns(undefined, seed);
      const shockedReturns = generateYearlyAssetReturns(undefined, seed, shock);

      baseEquitySamples.push(baselineReturns.equity);
      baseStartupSamples.push(baselineReturns.startups);
      shockedEquitySamples.push(shockedReturns.equity);
      shockedStartupSamples.push(shockedReturns.startups);
    }

    const baseCorrelationValue = correlation(baseEquitySamples, baseStartupSamples);
    const shockedCorrelationValue = correlation(shockedEquitySamples, shockedStartupSamples);

    expect(shockedCorrelationValue).toBeGreaterThan(baseCorrelationValue);
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

    const baselineOutcomes = runMonteCarloSimulation(
      allocation,
      undefined,
      {
        ...simulationRegimes,
        crash: { ...simulationRegimes.crash, probability: 0 },
      },
      4242,
    );

    const crashOutcomes = runMonteCarloSimulation(allocation, undefined, simulationRegimes, 4242);

    const baselineVar5 = valueAtRisk(baselineOutcomes, 0.05);
    const crashVar5 = valueAtRisk(crashOutcomes, 0.05);
    const baselineLoss30 = probabilityOfLossOverThreshold(baselineOutcomes, 0.3);
    const crashLoss30 = probabilityOfLossOverThreshold(crashOutcomes, 0.3);

    expect(crashVar5).toBeLessThan(baselineVar5);
    expect(crashLoss30).toBeGreaterThan(baselineLoss30);
  });
});

describe("runMonteCarloSimulationWithShock", () => {
  it("moves the core metrics when a downside shock is applied", () => {
    const allocation = {
      equity: 30,
      startups: 20,
      bonds: 20,
      gold: 10,
      crypto: 10,
      cash: 10,
    };

    const shock: ShockParameters = {
      id: "downside-shock",
      title: "Downside Shock",
      description: "A broad selloff with weaker returns and higher volatility.",
      meanShift: -0.08,
      volatilityMultiplier: 1.35,
      correlationShift: 0.15,
    };

    const baselineOutcomes = runMonteCarloSimulation(allocation, undefined, undefined, 4242);
    const shockedOutcomes = runMonteCarloSimulationWithShock(
      allocation,
      shock,
      undefined,
      undefined,
      4242,
    );

    const baselineMetrics = computeSimulationMetrics(baselineOutcomes);
    const shockedMetrics = computeSimulationMetrics(shockedOutcomes);

    expect(shockedMetrics.expectedReturn).toBeLessThan(baselineMetrics.expectedReturn);
    expect(shockedMetrics.standardDeviation).toBeGreaterThan(baselineMetrics.standardDeviation);
    expect(shockedMetrics.valueAtRisk5).toBeLessThan(baselineMetrics.valueAtRisk5);
    expect(shockedMetrics.conditionalValueAtRisk95).toBeLessThan(
      baselineMetrics.conditionalValueAtRisk95,
    );
  });
});
