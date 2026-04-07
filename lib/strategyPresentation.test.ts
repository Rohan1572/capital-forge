import { describe, expect, it } from "vitest";
import {
  buildStrategyCardSubtitle,
  buildStrategyDisplayLabel,
  buildStrategyExportPayload,
  formatStrategyExportFilename,
} from "./strategyPresentation";

describe("strategyPresentation", () => {
  const strategy = {
    id: "abcd1234efgh5678",
    createdAt: new Date("2026-04-07T12:00:00.000Z"),
    seed: 42,
    simulationSeed: 7,
    simulationMode: "shocked",
    shockId: "stress",
    allocation: {
      equity: 50,
      startups: 10,
      bonds: 10,
      gold: 10,
      crypto: 15,
      cash: 15,
    },
    metrics: {
      expectedReturn: 0.12,
      standardDeviation: 0.18,
      sharpeRatio: 1.4,
      valueAtRisk5: -0.11,
      conditionalValueAtRisk95: -0.16,
      maxDrawdown: -0.22,
      probabilityOfLossOver30: 0.08,
    },
  };

  it("builds a friendly label and subtitle", () => {
    expect(buildStrategyDisplayLabel(strategy)).toContain("Shocked run");
    expect(buildStrategyDisplayLabel(strategy)).toContain("Shock");
    expect(buildStrategyCardSubtitle(strategy)).toContain("Seed 42");
    expect(buildStrategyCardSubtitle(strategy)).toContain("abcd1234");
  });

  it("builds a compact export filename", () => {
    expect(formatStrategyExportFilename(strategy)).toBe("strategy-abcd1234.json");
  });

  it("includes the note in the export payload", () => {
    const payload = buildStrategyExportPayload({ strategy, note: "watch drawdown" });
    expect(payload.note).toBe("watch drawdown");
    expect(payload.strategy.id).toBe(strategy.id);
  });
});
