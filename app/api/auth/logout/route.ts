import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, getSessionClearCookieOptions, getSessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", getSessionClearCookieOptions());

  return response;
}
