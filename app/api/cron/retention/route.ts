import { NextResponse } from "next/server";
import { runRetentionSweep } from "@/lib/dataRetention";

function isAuthorized(request: Request, secretName: string, headerName: string) {
  const secret = process.env[secretName];
  if (!secret) return false;
  return request.headers.get(headerName) === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request, "CRON_SECRET", "x-cron-secret")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runRetentionSweep();
    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error("Failed to run retention sweep cron", error);
    return NextResponse.json({ error: "Unable to run retention sweep." }, { status: 500 });
  }
}
