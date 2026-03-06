import { describe, expect, it } from "vitest";
import {
  buildRiskExplainerPrompt,
  buildRiskExplainerPromptFromMetrics,
  buildRiskPromptInput,
} from "./aiPrompts";
import type { Allocation } from "./monteCarlo";
import type { SimulationMetrics } from "./metrics";

describe("buildRiskPromptInput", () => {
  it("maps allocation and required risk metrics into prompt input", () => {
    const allocation: Allocation = {
      equity: 30,
      startups: 15,
      bonds: 25,
      gold: 10,
      crypto: 10,
      cash: 10,
    };

    const metrics: SimulationMetrics = {
      expectedReturn: 0.14,
      standardDeviation: 0.22,
      sharpeRatio: 0.63,
      maxDrawdown: 0.29,
      valueAtRisk5: -0.18,
      probabilityOfLossOver30: 0.08,
    };

    expect(buildRiskPromptInput(allocation, metrics)).toEqual({
      allocation,
      expectedReturn: 0.14,
      sharpeRatio: 0.63,
      valueAtRisk: -0.18,
      maxDrawdown: 0.29,
    });
  });
});

describe("buildRiskExplainerPrompt", () => {
  it("includes all required structured fields in the prompt text", () => {
    const prompt = buildRiskExplainerPrompt({
      allocation: {
        equity: 40,
        startups: 10,
        bonds: 20,
        gold: 10,
        crypto: 10,
        cash: 10,
      },
      expectedReturn: 0.12,
      sharpeRatio: 0.55,
      valueAtRisk: -0.16,
      maxDrawdown: 0.24,
    });

    expect(prompt).toContain("Allocation:");
    expect(prompt).toContain("Expected Return: 0.12");
    expect(prompt).toContain("Sharpe Ratio: 0.55");
    expect(prompt).toContain("Value at Risk (95%): -0.16");
    expect(prompt).toContain("Max Drawdown: 0.24");
  });
});

describe("buildRiskExplainerPromptFromMetrics", () => {
  it("builds the prompt from allocation and simulation metrics", () => {
    const allocation: Allocation = {
      equity: 25,
      startups: 15,
      bonds: 25,
      gold: 15,
      crypto: 10,
      cash: 10,
    };

    const metrics: SimulationMetrics = {
      expectedReturn: 0.1,
      standardDeviation: 0.2,
      sharpeRatio: 0.5,
      maxDrawdown: 0.2,
      valueAtRisk5: -0.12,
      probabilityOfLossOver30: 0.1,
    };

    const prompt = buildRiskExplainerPromptFromMetrics(allocation, metrics);
    expect(prompt).toContain("Expected Return: 0.1");
    expect(prompt).toContain("Sharpe Ratio: 0.5");
    expect(prompt).toContain("Value at Risk (95%): -0.12");
    expect(prompt).toContain("Max Drawdown: 0.2");
  });
});
