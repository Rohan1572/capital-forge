import { NextResponse } from "next/server";
import { rolloverLeaderboardSeason, setLeaderboardSeason } from "@/lib/leaderboardSeason";

function isAuthorized(request: Request, secretName: string, headerName: string) {
  const secret = process.env[secretName];
  if (!secret) return false;
  return request.headers.get(headerName) === secret;
}

async function handleRollover(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    month?: string;
  };

  const season = body.month
    ? await setLeaderboardSeason(body.month)
    : await rolloverLeaderboardSeason();
  return NextResponse.json({
    data: {
      activeMonth: season.activeMonth,
    },
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request, "ADMIN_TRIGGER_SECRET", "x-admin-secret")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await handleRollover(request);
  } catch (error) {
    console.error("Failed to run leaderboard rollover admin action", error);
    return NextResponse.json({ error: "Unable to roll leaderboard season." }, { status: 500 });
  }
}
