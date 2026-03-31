import { describe, expect, it } from "vitest";
import { summarizeMonitoringData } from "./monitoring";

describe("summarizeMonitoringData", () => {
  it("summarizes simulation latency and ai cost totals", () => {
    const summary = summarizeMonitoringData({
      simulationRecords: [{ durationMs: 1200 }, { durationMs: 800 }, { durationMs: null }],
      aiRecords: [
        { kind: "risk", estimatedCostUsd: 0.03, totalTokens: 1200 },
        { kind: "debate", estimatedCostUsd: 0.07, totalTokens: 2400 },
      ],
    });

    expect(summary.simulationCount).toBe(2);
    expect(summary.averageSimulationLatencyMs).toBe(1000);
    expect(summary.totalSimulationLatencyMs).toBe(2000);
    expect(summary.aiResponseCount).toBe(2);
    expect(summary.totalAiEstimatedCostUsd).toBe(0.1);
    expect(summary.totalAiTokens).toBe(3600);
    expect(summary.aiResponseCountByKind).toEqual({ risk: 1, debate: 1 });
  });
});
