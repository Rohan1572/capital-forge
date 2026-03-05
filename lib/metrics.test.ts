import { describe, expect, it } from "vitest";
import {
  computeSimulationMetrics,
  maxDrawdown,
  mean,
  percentile,
  probabilityOfLossOverThreshold,
  sharpeRatio,
  standardDeviation,
  valueAtRisk,
} from "./metrics";

describe("mean", () => {
  it("returns 0 for empty input", () => {
    expect(mean([])).toBe(0);
  });

  it("computes the arithmetic average", () => {
    expect(mean([0.1, 0.2, -0.1])).toBeCloseTo(0.0666666667, 10);
  });
});

describe("standardDeviation", () => {
  it("returns 0 for empty input", () => {
    expect(standardDeviation([])).toBe(0);
  });

  it("returns 0 when all values are equal", () => {
    expect(standardDeviation([0.1, 0.1, 0.1])).toBeCloseTo(0, 12);
  });

  it("computes population standard deviation", () => {
    expect(standardDeviation([1, 2, 3])).toBeCloseTo(Math.sqrt(2 / 3), 10);
  });
});

describe("percentile", () => {
  it("clamps percentile boundaries", () => {
    const values = [4, 1, 3, 2];
    expect(percentile(values, -1)).toBe(1);
    expect(percentile(values, 2)).toBe(4);
  });

  it("linearly interpolates between surrounding points", () => {
    expect(percentile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75, 10);
  });
});

describe("sharpeRatio", () => {
  it("returns 0 for empty input", () => {
    expect(sharpeRatio([])).toBe(0);
  });

  it("returns 0 when volatility is 0", () => {
    expect(sharpeRatio([0.05, 0.05, 0.05], 0.01)).toBeCloseTo(0, 12);
  });

  it("computes sharpe ratio using risk-free adjustment", () => {
    expect(sharpeRatio([0.1, 0.2, 0], 0.02)).toBeCloseTo(0.9797958971, 10);
  });
});

describe("maxDrawdown", () => {
  it("returns 0 for empty input", () => {
    expect(maxDrawdown([])).toBe(0);
  });

  it("computes drawdown from cumulative return path", () => {
    const returns = [0.1, -0.2, 0.05, -0.3, 0.4];
    expect(maxDrawdown(returns)).toBeCloseTo(0.412, 10);
  });
});

describe("valueAtRisk", () => {
  it("returns 5th percentile threshold by default", () => {
    expect(valueAtRisk([-0.4, -0.2, -0.1, 0.1, 0.3])).toBeCloseTo(-0.36, 10);
  });
});

describe("probabilityOfLossOverThreshold", () => {
  it("returns 0 for empty input", () => {
    expect(probabilityOfLossOverThreshold([])).toBe(0);
  });

  it("counts only losses strictly greater than threshold", () => {
    expect(probabilityOfLossOverThreshold([-0.31, -0.3, -0.5, 0.2], 0.3)).toBe(0.5);
  });
});

describe("computeSimulationMetrics", () => {
  it("aggregates all requested metrics", () => {
    const metrics = computeSimulationMetrics([0.1, -0.4, 0.2, -0.1, 0.5], 0);

    expect(metrics.expectedReturn).toBeCloseTo(0.06, 10);
    expect(metrics.standardDeviation).toBeCloseTo(0.3006659276, 10);
    expect(metrics.sharpeRatio).toBeCloseTo(0.1995570316, 10);
    expect(metrics.maxDrawdown).toBeCloseTo(0.4, 10);
    expect(metrics.valueAtRisk5).toBeCloseTo(-0.34, 10);
    expect(metrics.probabilityOfLossOver30).toBeCloseTo(0.2, 10);
  });
});
