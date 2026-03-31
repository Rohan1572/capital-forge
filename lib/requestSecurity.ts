import { NextResponse } from "next/server";

function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function requireSameOrigin(request: Request) {
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expectedOrigin = new URL(request.url).origin;
  if (requestOrigin !== expectedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
