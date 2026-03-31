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
