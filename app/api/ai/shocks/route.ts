import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { generateAndActivateWeeklyShock } from "@/lib/shockScheduler";

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const rate = checkRateLimit(`ai:shock:${clientKey}`, { windowMs: 60_000, max: 4 });

  if (!rate.allowed) {
    const headers = new Headers();
    if (rate.retryAfterMs !== null) {
      headers.set("Retry-After", Math.ceil(rate.retryAfterMs / 1000).toString());
    }
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait and try again." },
      { status: 429, headers },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      weekLabel?: string;
      focus?: string;
      recentConditions?: string;
    };

    const result = await generateAndActivateWeeklyShock(body);

    return NextResponse.json({
      data: {
        shock: result.shock,
        meta: result.meta,
      },
    });
  } catch (error) {
    console.error("Failed to generate weekly shock", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
