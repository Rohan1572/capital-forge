import { NextResponse } from "next/server";
import { generateAndActivateWeeklyShock } from "@/lib/shockScheduler";

function isAuthorized(request: Request, secretName: string, headerName: string) {
  const secret = process.env[secretName];
  if (!secret) return false;
  return (
    request.headers.get(headerName) === secret ||
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

async function handleRequest(request: Request) {
  if (!isAuthorized(request, "CRON_SECRET", "x-cron-secret")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      weekLabel?: string;
      focus?: string;
      recentConditions?: string;
    };

    const result = await generateAndActivateWeeklyShock(body);
    return NextResponse.json({ data: { shock: result.shock, meta: result.meta } });
  } catch (error) {
    console.error("Failed to run weekly shock cron", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
