import { NextResponse } from "next/server";
import { rolloverLeaderboardSeason, setLeaderboardSeason } from "@/lib/leaderboardSeason";
import { buildLeaderboardCronResponse } from "@/lib/apiResponses";

function isAuthorized(request: Request, secretName: string, headerName: string) {
  const secret = process.env[secretName];
  if (!secret) return false;
  return (
    request.headers.get(headerName) === secret ||
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

async function handleRollover(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    month?: string;
  };

  const season = body.month
    ? await setLeaderboardSeason(body.month)
    : await rolloverLeaderboardSeason();
  return NextResponse.json(buildLeaderboardCronResponse(season.activeMonth));
}

async function handleRequest(request: Request) {
  if (!isAuthorized(request, "CRON_SECRET", "x-cron-secret")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await handleRollover(request);
  } catch (error) {
    console.error("Failed to run leaderboard month cron", error);
    return NextResponse.json({ error: "Unable to roll leaderboard season." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
