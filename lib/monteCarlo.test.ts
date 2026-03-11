import { describe, expect, it } from "vitest";
import { baseCorrelationMatrix } from "./correlationMatrix";
import { mean, standardDeviation } from "./metrics";
import { generateYearlyAssetReturns } from "./monteCarlo";

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
