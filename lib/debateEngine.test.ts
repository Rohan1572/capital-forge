import { describe, expect, it } from "vitest";
import { runDebateSequence } from "./debateEngine";
import type { Allocation } from "./monteCarlo";
import type { SimulationMetrics } from "./metrics";
import type { DebateAgentRole } from "./aiPrompts";

describe("runDebateSequence", () => {
  const allocation: Allocation = {
    equity: 35,
    startups: 20,
    bonds: 15,
    gold: 10,
    crypto: 10,
    cash: 10,
  };

  const metrics: SimulationMetrics = {
    expectedReturn: 0.12,
    standardDeviation: 0.2,
    sharpeRatio: 0.52,
    maxDrawdown: 0.26,
    valueAtRisk5: -0.17,
    probabilityOfLossOver30: 0.07,
  };

  it("calls agents sequentially and feeds prior statements forward", async () => {
    const prompts: string[] = [];
    const roles: DebateAgentRole[] = [];

    const result = await runDebateSequence({
      allocation,
      metrics,
      invokeAgent: async ({ role, prompt }) => {
        roles.push(role);
        prompts.push(prompt);
        return `Response from ${role}`;
      },
    });

    expect(roles).toEqual(["conservative", "growth", "risk"]);
    expect(prompts[0]).not.toContain("Previous Agent Statements:");
    expect(prompts[1]).toContain("Previous Agent Statements:");
    expect(prompts[1]).toContain("1. Response from conservative");
    expect(prompts[2]).toContain("1. Response from conservative");
    expect(prompts[2]).toContain("2. Response from growth");
    expect(result.statements).toEqual([
      "Response from conservative",
      "Response from growth",
      "Response from risk",
    ]);
  });

  it("respects a custom call order", async () => {
    const order: DebateAgentRole[] = ["risk", "conservative"];

    const result = await runDebateSequence({
      allocation,
      metrics,
      order,
      invokeAgent: async ({ role }) => `Reply from ${role}`,
    });

    expect(result.calls.map((call) => call.role)).toEqual(order);
  });
});
