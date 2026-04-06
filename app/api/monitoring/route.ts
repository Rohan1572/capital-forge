import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildUserMonitoringReport } from "@/lib/monitoringReport";

function parseLookbackDays(value: string | null) {
  const parsed = Number.parseInt(value ?? "30", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }

  return Math.min(parsed, 90);
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const lookbackDays = parseLookbackDays(url.searchParams.get("days"));
    const report = await buildUserMonitoringReport(user.id, lookbackDays);

    return NextResponse.json({
      data: {
        ...report,
      },
    });
  } catch (error) {
    console.error("Failed to load monitoring summary", error);
    return NextResponse.json({ error: "Unable to load monitoring summary." }, { status: 500 });
  }
}
