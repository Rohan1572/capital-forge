import { NextResponse } from "next/server";
import { buildGlobalMonitoringReport } from "@/lib/monitoringReport";

function isAuthorized(request: Request, secretName: string, headerName: string) {
  const secret = process.env[secretName];
  if (!secret) return false;
  return request.headers.get(headerName) === secret;
}

function parseLookbackDays(value: string | null) {
  const parsed = Number.parseInt(value ?? "30", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }

  return Math.min(parsed, 90);
}

export async function GET(request: Request) {
  if (!isAuthorized(request, "ADMIN_TRIGGER_SECRET", "x-admin-secret")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const lookbackDays = parseLookbackDays(url.searchParams.get("days"));
    const report = await buildGlobalMonitoringReport(lookbackDays);

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Failed to load admin monitoring summary", error);
    return NextResponse.json({ error: "Unable to load monitoring summary." }, { status: 500 });
  }
}
