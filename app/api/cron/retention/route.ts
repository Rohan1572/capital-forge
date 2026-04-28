import { NextResponse } from "next/server";
import { runRetentionSweep } from "../../../../lib/dataRetention";
import { buildRetentionSweepResponse } from "../../../../lib/apiResponses";

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
    const summary = await runRetentionSweep();
    return NextResponse.json(buildRetentionSweepResponse(summary));
  } catch (error) {
    console.error("Failed to run retention sweep cron", error);
    return NextResponse.json({ error: "Unable to run retention sweep." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
