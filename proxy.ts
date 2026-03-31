import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieName } from "@/lib/sessionCookie";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/leaderboard" || pathname.startsWith("/strategy/") || pathname === "/strategy"
  );
}

export function proxy(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(getSessionCookieName())?.value;
  if (sessionToken) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/leaderboard", "/strategy/:path*"],
};
