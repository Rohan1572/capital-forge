const monitoringUrl = process.env.MONITORING_URL ?? "http://localhost:3000/api/monitoring?days=30";
const sessionCookie = process.env.MONITORING_COOKIE ?? process.env.SESSION_COOKIE;

if (!sessionCookie) {
  throw new Error("MONITORING_COOKIE or SESSION_COOKIE is required");
}

const response = await fetch(monitoringUrl, {
  headers: {
    cookie: sessionCookie,
  },
});

if (!response.ok) {
  throw new Error(`Monitoring route returned ${response.status}`);
}

const payload = await response.json();
const data = payload?.data;

if (!data || typeof data !== "object" || Array.isArray(data)) {
  throw new Error("Monitoring route response did not include data");
}

const requiredNumbers = [
  ["simulationCount", data.simulationCount],
  ["aiResponseCount", data.aiResponseCount],
  ["totalAiEstimatedCostUsd", data.totalAiEstimatedCostUsd],
  ["totalAiTokens", data.totalAiTokens],
  ["lookbackDays", data.lookbackDays],
];

for (const [label, value] of requiredNumbers) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TypeError(`Monitoring route returned an invalid ${label}`);
  }
}

if (
  data.averageSimulationLatencyMs !== null &&
  typeof data.averageSimulationLatencyMs !== "number"
) {
  throw new Error("Monitoring route returned an invalid averageSimulationLatencyMs");
}

if (
  !data.aiResponseCountByKind ||
  typeof data.aiResponseCountByKind !== "object" ||
  Array.isArray(data.aiResponseCountByKind)
) {
  throw new Error("Monitoring route returned an invalid aiResponseCountByKind");
}

console.log("Monitoring route check passed.");
