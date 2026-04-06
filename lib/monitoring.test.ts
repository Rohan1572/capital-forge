import { describe, expect, it } from "vitest";
import {
  buildMonitoringReport,
  evaluateMonitoringSummary,
  summarizeMonitoringData,
} from "./monitoring";

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

  it("flags latency and ai cost spikes", () => {
    const summary = summarizeMonitoringData({
      simulationRecords: [{ durationMs: 3200 }],
      aiRecords: [{ kind: "risk", estimatedCostUsd: 3.5, totalTokens: 1200 }],
    });

    const report = evaluateMonitoringSummary(summary);

    expect(report.status).toBe("critical");
    expect(report.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "simulation-latency",
          severity: "critical",
          metric: "averageSimulationLatencyMs",
        }),
        expect.objectContaining({
          key: "ai-cost",
          severity: "critical",
          metric: "totalAiEstimatedCostUsd",
        }),
      ]),
    );
  });

  it("builds a report with the requested lookback window", () => {
    const summary = summarizeMonitoringData({
      simulationRecords: [{ durationMs: 1200 }],
      aiRecords: [{ kind: "risk", estimatedCostUsd: 0.5, totalTokens: 1200 }],
    });

    const report = buildMonitoringReport({
      summary,
      lookbackDays: 14,
    });

    expect(report.lookbackDays).toBe(14);
    expect(report.status).toBe("healthy");
    expect(report.thresholds.averageSimulationLatencyWarningMs).toBeGreaterThan(0);
  });
});
