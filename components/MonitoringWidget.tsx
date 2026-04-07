"use client";

import { useCallback, useEffect, useState } from "react";
import { StatePanel } from "@/components/StatePanel";

type MonitoringAlert = {
  key: "simulation-latency" | "ai-cost";
  severity: "warning" | "critical";
  title: string;
  message: string;
  recommendation: string;
};

type MonitoringReport = {
  simulationCount: number;
  averageSimulationLatencyMs: number | null;
  totalSimulationLatencyMs: number | null;
  aiResponseCount: number;
  totalAiEstimatedCostUsd: number;
  totalAiTokens: number;
  aiResponseCountByKind: Record<string, number>;
  lookbackDays: number;
  status: "healthy" | "warning" | "critical";
  alerts: MonitoringAlert[];
};

type MonitoringDelivery = {
  status: MonitoringReport["status"];
  headline: string;
  summary: string;
  action: string;
  alertTitles: string[];
};

type MonitoringPayload = {
  report?: MonitoringReport;
  delivery?: MonitoringDelivery;
} & Partial<MonitoringReport>;

type MonitoringResponse = {
  data?: MonitoringPayload;
};

type MonitoringStatus = MonitoringReport["status"] | "loading";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(value: Date | null) {
  if (!value) return "Not refreshed yet";

  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClassName(status: MonitoringStatus) {
  if (status === "loading") {
    return "border-zinc-700 bg-zinc-950/60 text-zinc-300";
  }

  if (status === "critical") {
    return "border-rose-500/40 bg-rose-950/30 text-rose-100";
  }

  if (status === "warning") {
    return "border-amber-500/40 bg-amber-950/30 text-amber-100";
  }

  return "border-emerald-500/40 bg-emerald-950/30 text-emerald-100";
}

function alertClassName(severity: MonitoringAlert["severity"]) {
  return severity === "critical"
    ? "border-rose-500/30 bg-rose-950/20 text-rose-100"
    : "border-amber-500/30 bg-amber-950/20 text-amber-100";
}

function getDeliveryHeadline(status: MonitoringReport["status"]) {
  if (status === "critical") return "Critical monitoring conditions detected";
  if (status === "warning") return "Monitoring warning detected";
  return "Monitoring is healthy";
}

function getDeliverySummary(report: MonitoringReport) {
  if (report.status === "healthy") {
    return `No warning conditions were detected across the last ${report.lookbackDays} days.`;
  }

  return "One or more monitoring thresholds were crossed.";
}

function getDeliveryAction(status: MonitoringReport["status"]) {
  if (status === "critical") {
    return "Investigate latency and AI cost drivers before the next scheduled run.";
  }

  if (status === "warning") {
    return "Review the warning signals and confirm whether the trend is expected.";
  }

  return "No operator action required.";
}

function normalizeReport(payload: MonitoringPayload | null): MonitoringReport | null {
  if (!payload) return null;
  if (payload.report) return payload.report;

  if (
    typeof payload.simulationCount === "number" &&
    typeof payload.aiResponseCount === "number" &&
    typeof payload.totalAiEstimatedCostUsd === "number" &&
    typeof payload.totalAiTokens === "number" &&
    typeof payload.lookbackDays === "number" &&
    typeof payload.status === "string" &&
    Array.isArray(payload.alerts)
  ) {
    return payload as MonitoringReport;
  }

  return null;
}

function normalizeDelivery(payload: MonitoringPayload | null, report: MonitoringReport | null) {
  if (!payload) return null;
  if (payload.delivery) return payload.delivery;
  if (!report) return null;

  return {
    status: report.status,
    headline: getDeliveryHeadline(report.status),
    summary: getDeliverySummary(report),
    action: getDeliveryAction(report.status),
    alertTitles: report.alerts.map((alert) => alert.title),
  };
}

async function fetchMonitoringSummary(days: number): Promise<MonitoringPayload | null> {
  const response = await fetch(`/api/monitoring?days=${days}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load monitoring summary.");
  }

  const payload = (await response.json()) as MonitoringResponse;
  return payload.data ?? null;
}

type MonitoringWidgetProps = Readonly<{ days?: number }>;

function MonitoringStatusPill({ status }: Readonly<{ status: MonitoringStatus }>) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${statusClassName(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

function MonitoringRefreshButton({
  isRefreshing,
  onClick,
}: Readonly<{
  isRefreshing: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRefreshing}
      className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isRefreshing ? "Refreshing..." : "Refresh"}
    </button>
  );
}

function MonitoringErrorBanner({ error }: Readonly<{ error: string | null }>) {
  if (!error) return null;

  return (
    <StatePanel
      tone="error"
      title="Unable to load monitoring summary"
      description={error}
      className="mt-4"
    />
  );
}

function MonitoringDeliveryPanel({ delivery }: Readonly<{ delivery: MonitoringDelivery | null }>) {
  if (!delivery) return null;

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="text-sm font-semibold text-zinc-100">{delivery.headline}</p>
      <p className="mt-1 text-sm text-zinc-300">{delivery.summary}</p>
      <p className="mt-2 text-sm text-zinc-400">{delivery.action}</p>
    </div>
  );
}

function MonitoringLoadingState() {
  return (
    <StatePanel
      tone="loading"
      title="Loading monitoring summary"
      description="Fetching simulation latency and AI cost data for the selected window."
      className="mt-4"
    >
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-950/50" />
        <div className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-950/50" />
      </div>
    </StatePanel>
  );
}

function MonitoringReportCards({ report }: Readonly<{ report: MonitoringReport }>) {
  const alertSummary = report.alerts.slice(0, 2);
  const remainingAlertCount = Math.max(report.alerts.length - alertSummary.length, 0);

  return (
    <>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Simulation Latency</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {report.averageSimulationLatencyMs === null
              ? "No runs"
              : `${report.averageSimulationLatencyMs.toFixed(0)} ms`}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {report.simulationCount} tracked runs, {report.totalSimulationLatencyMs ?? 0} ms total
          </p>
        </article>

        <article className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">AI Cost</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {formatCurrency(report.totalAiEstimatedCostUsd)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {report.aiResponseCount} responses, {report.totalAiTokens} tokens
          </p>
        </article>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">Alert Summary</h3>
          <span className="text-xs text-zinc-500">{report.alerts.length} alerts</span>
        </div>

        {report.alerts.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">No active alerts.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {alertSummary.map((alert) => (
              <li
                key={alert.key}
                className={`rounded-lg border p-3 text-sm ${alertClassName(alert.severity)}`}
              >
                <p className="font-medium">{alert.title}</p>
                <p className="mt-1 text-sm text-zinc-300">{alert.message}</p>
                <p className="mt-2 text-sm text-zinc-400">{alert.recommendation}</p>
              </li>
            ))}
            {remainingAlertCount > 0 ? (
              <li className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-400">
                +{remainingAlertCount} more alert{remainingAlertCount === 1 ? "" : "s"} in the full
                report.
              </li>
            ) : null}
          </ul>
        )}
      </div>

      {report.alerts.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {report.alerts.map((alert) => (
            <span
              key={alert.key}
              className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300"
            >
              {alert.title}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function MonitoringWidget({ days = 30 }: MonitoringWidgetProps) {
  const [report, setReport] = useState<MonitoringReport | null>(null);
  const [delivery, setDelivery] = useState<MonitoringDelivery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const shouldShowLoadingState = report === null && error === null;

  const refreshMonitoringSummary = useCallback(
    async (shouldApplyState: () => boolean = () => true) => {
      setIsRefreshing(true);
      setError(null);

      try {
        const payload = await fetchMonitoringSummary(days);
        const nextReport = normalizeReport(payload);
        const nextDelivery = normalizeDelivery(payload, nextReport);

        if (shouldApplyState()) {
          setReport(nextReport);
          setDelivery(nextDelivery);
          setLastRefreshedAt(new Date());
        }
      } catch (loadError) {
        console.error("Failed to load monitoring summary", loadError);
        if (shouldApplyState()) {
          setError("Unable to load monitoring summary.");
        }
      } finally {
        if (shouldApplyState()) {
          setIsRefreshing(false);
        }
      }
    },
    [days],
  );

  useEffect(() => {
    let active = true;

    void refreshMonitoringSummary(() => active);

    return () => {
      active = false;
    };
  }, [refreshMonitoringSummary]);

  return (
    <section
      aria-busy={shouldShowLoadingState ? "true" : undefined}
      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500">Monitoring</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Simulation latency and estimated AI cost over the last {days} days.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MonitoringStatusPill status={report?.status ?? "loading"} />
          <MonitoringRefreshButton
            isRefreshing={isRefreshing}
            onClick={() => {
              void refreshMonitoringSummary(() => true);
            }}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Last refreshed: {formatTimestamp(lastRefreshedAt)}
      </p>

      <MonitoringErrorBanner error={error} />
      <MonitoringDeliveryPanel delivery={delivery} />
      {shouldShowLoadingState ? <MonitoringLoadingState /> : null}
      {report ? <MonitoringReportCards report={report} /> : null}
    </section>
  );
}
