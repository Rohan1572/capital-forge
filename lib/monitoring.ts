export type MonitoringSimulationRecord = {
  durationMs: number | null;
};

export type MonitoringAiRecord = {
  kind: string;
  estimatedCostUsd: number | null;
  totalTokens: number | null;
};

export type MonitoringSummary = {
  simulationCount: number;
  averageSimulationLatencyMs: number | null;
  totalSimulationLatencyMs: number | null;
  aiResponseCount: number;
  totalAiEstimatedCostUsd: number;
  totalAiTokens: number;
  aiResponseCountByKind: Record<string, number>;
};

export type MonitoringAlertSeverity = "warning" | "critical";

export type MonitoringThresholds = {
  averageSimulationLatencyWarningMs: number;
  averageSimulationLatencyCriticalMs: number;
  totalAiEstimatedCostWarningUsd: number;
  totalAiEstimatedCostCriticalUsd: number;
};

export type MonitoringAlert = {
  key: "simulation-latency" | "ai-cost";
  severity: MonitoringAlertSeverity;
  metric: "averageSimulationLatencyMs" | "totalAiEstimatedCostUsd";
  actual: number;
  threshold: number;
  title: string;
  message: string;
  recommendation: string;
};

export type MonitoringReportStatus = "healthy" | "warning" | "critical";

export type MonitoringReport = MonitoringSummary & {
  lookbackDays: number;
  status: MonitoringReportStatus;
  alerts: MonitoringAlert[];
  thresholds: MonitoringThresholds;
};

export type MonitoringAssessment = Omit<MonitoringReport, "lookbackDays">;

export const DEFAULT_MONITORING_THRESHOLDS: MonitoringThresholds = {
  averageSimulationLatencyWarningMs: 1500,
  averageSimulationLatencyCriticalMs: 3000,
  totalAiEstimatedCostWarningUsd: 1,
  totalAiEstimatedCostCriticalUsd: 3,
};

function roundNumber(value: number): number {
  return Number(value.toFixed(2));
}

export function summarizeMonitoringData(input: {
  simulationRecords: MonitoringSimulationRecord[];
  aiRecords: MonitoringAiRecord[];
}): MonitoringSummary {
  const simulationLatencies = input.simulationRecords
    .map((record) => record.durationMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const aiCosts = input.aiRecords
    .map((record) => record.estimatedCostUsd)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const aiTokens = input.aiRecords
    .map((record) => record.totalTokens)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const totalSimulationLatencyMs = simulationLatencies.reduce((sum, value) => sum + value, 0);
  const totalAiEstimatedCostUsd = aiCosts.reduce((sum, value) => sum + value, 0);
  const totalAiTokens = aiTokens.reduce((sum, value) => sum + value, 0);

  return {
    simulationCount: simulationLatencies.length,
    averageSimulationLatencyMs:
      simulationLatencies.length > 0
        ? roundNumber(totalSimulationLatencyMs / simulationLatencies.length)
        : null,
    totalSimulationLatencyMs:
      simulationLatencies.length > 0 ? roundNumber(totalSimulationLatencyMs) : null,
    aiResponseCount: input.aiRecords.length,
    totalAiEstimatedCostUsd: roundNumber(totalAiEstimatedCostUsd),
    totalAiTokens,
    aiResponseCountByKind: input.aiRecords.reduce<Record<string, number>>((acc, record) => {
      acc[record.kind] = (acc[record.kind] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

function buildLatencyAlert(
  actual: number,
  threshold: number,
  severity: MonitoringAlertSeverity,
): MonitoringAlert {
  return {
    key: "simulation-latency",
    severity,
    metric: "averageSimulationLatencyMs",
    actual,
    threshold,
    title: "Simulation latency is elevated",
    message: `Average simulation latency is ${actual}ms, above the ${severity} threshold of ${threshold}ms.`,
    recommendation:
      "Review recent simulation regressions, infrastructure load, and any changes to the Monte Carlo path generation or persistence layer.",
  };
}

function buildCostAlert(
  actual: number,
  threshold: number,
  severity: MonitoringAlertSeverity,
): MonitoringAlert {
  return {
    key: "ai-cost",
    severity,
    metric: "totalAiEstimatedCostUsd",
    actual,
    threshold,
    title: "AI cost is elevated",
    message: `Total AI estimated cost is $${actual.toFixed(2)}, above the ${severity} threshold of $${threshold.toFixed(2)}.`,
    recommendation:
      "Check AI response volume, cache hit rate, and any prompt changes that may be increasing token usage or triggering more calls.",
  };
}

export function evaluateMonitoringSummary(
  summary: MonitoringSummary,
  thresholds: MonitoringThresholds = DEFAULT_MONITORING_THRESHOLDS,
): MonitoringAssessment {
  const alerts: MonitoringAlert[] = [];

  if (
    summary.averageSimulationLatencyMs !== null &&
    summary.averageSimulationLatencyMs >= thresholds.averageSimulationLatencyCriticalMs
  ) {
    alerts.push(
      buildLatencyAlert(
        summary.averageSimulationLatencyMs,
        thresholds.averageSimulationLatencyCriticalMs,
        "critical",
      ),
    );
  } else if (
    summary.averageSimulationLatencyMs !== null &&
    summary.averageSimulationLatencyMs >= thresholds.averageSimulationLatencyWarningMs
  ) {
    alerts.push(
      buildLatencyAlert(
        summary.averageSimulationLatencyMs,
        thresholds.averageSimulationLatencyWarningMs,
        "warning",
      ),
    );
  }

  if (summary.totalAiEstimatedCostUsd >= thresholds.totalAiEstimatedCostCriticalUsd) {
    alerts.push(
      buildCostAlert(
        summary.totalAiEstimatedCostUsd,
        thresholds.totalAiEstimatedCostCriticalUsd,
        "critical",
      ),
    );
  } else if (summary.totalAiEstimatedCostUsd >= thresholds.totalAiEstimatedCostWarningUsd) {
    alerts.push(
      buildCostAlert(
        summary.totalAiEstimatedCostUsd,
        thresholds.totalAiEstimatedCostWarningUsd,
        "warning",
      ),
    );
  }

  const hasCriticalAlert = alerts.some((alert) => alert.severity === "critical");
  const hasAnyAlert = alerts.length > 0;

  let status: MonitoringReportStatus = "healthy";
  if (hasCriticalAlert) {
    status = "critical";
  } else if (hasAnyAlert) {
    status = "warning";
  }

  return {
    ...summary,
    status,
    alerts,
    thresholds,
  };
}

export function buildMonitoringReport(params: {
  summary: MonitoringSummary;
  lookbackDays: number;
  thresholds?: MonitoringThresholds;
}): MonitoringReport {
  const report = evaluateMonitoringSummary(params.summary, params.thresholds);
  return {
    ...report,
    lookbackDays: params.lookbackDays,
  };
}
