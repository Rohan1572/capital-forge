import { NextResponse } from "next/server";
import { generateAndActivateWeeklyShock } from "@/lib/shockScheduler";

function isAuthorized(request: Request, secretName: string, headerName: string) {
  const secret = process.env[secretName];
  if (!secret) return false;
  return request.headers.get(headerName) === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request, "ADMIN_TRIGGER_SECRET", "x-admin-secret")) {
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
    console.error("Failed to run admin shock trigger", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
