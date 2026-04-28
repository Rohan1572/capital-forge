import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { buildGlobalMonitoringReport } from "../../../../lib/monitoringReport";
import { buildMonitoringDelivery } from "../../../../lib/monitoring";
import { buildMonitoringResponse } from "../../../../lib/apiResponses";

function isAuthorized(request: Request, secretName: string, headerName: string) {
  const secret = process.env[secretName];
  if (!secret) return false;
  return (
    request.headers.get(headerName) === secret ||
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

function parseLookbackDays(value: string | null) {
  const parsed = Number.parseInt(value ?? "30", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }

  return Math.min(parsed, 90);
}

async function recordMonitoringAlert(
  report: Awaited<ReturnType<typeof buildGlobalMonitoringReport>>,
) {
  if (report.status === "healthy") {
    return;
  }

  const delivery = buildMonitoringDelivery(report);

  await prisma.auditLog
    .create({
      data: {
        action: "monitoring.alert",
        metadata: {
          lookbackDays: report.lookbackDays,
          status: report.status,
          delivery,
          alertCount: report.alerts.length,
          alerts: report.alerts.map((alert) => ({
            key: alert.key,
            severity: alert.severity,
            metric: alert.metric,
            actual: alert.actual,
            threshold: alert.threshold,
          })),
          thresholds: report.thresholds,
          summary: {
            simulationCount: report.simulationCount,
            averageSimulationLatencyMs: report.averageSimulationLatencyMs,
            aiResponseCount: report.aiResponseCount,
            totalAiEstimatedCostUsd: report.totalAiEstimatedCostUsd,
          },
        },
      },
    })
    .catch((error) => {
      console.error("Failed to record monitoring alert audit log", error);
    });
}

async function handleRequest(request: Request) {
  if (!isAuthorized(request, "CRON_SECRET", "x-cron-secret")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const lookbackDays = parseLookbackDays(url.searchParams.get("days"));
    const report = await buildGlobalMonitoringReport(lookbackDays);
    const delivery = buildMonitoringDelivery(report);

    await recordMonitoringAlert(report);

    return NextResponse.json(buildMonitoringResponse(report, delivery));
  } catch (error) {
    console.error("Failed to run monitoring cron", error);
    return NextResponse.json({ error: "Unable to run monitoring summary." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
