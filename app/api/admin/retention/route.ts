import { NextResponse } from "next/server";
import { deleteSupportData } from "../../../../lib/dataRetention";

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
      userId?: string;
      strategyId?: string;
    };

    if (!body.userId?.trim() && !body.strategyId?.trim()) {
      return NextResponse.json({ error: "userId or strategyId is required" }, { status: 400 });
    }

    const summary = await deleteSupportData({
      userId: body.userId,
      strategyId: body.strategyId,
    });

    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error("Failed to run retention admin deletion", error);
    return NextResponse.json({ error: "Unable to delete retention data." }, { status: 500 });
  }
}
