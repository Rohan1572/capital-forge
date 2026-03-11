import { NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
  getSessionCookieOptions,
  verifyUserCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = await createSession(user.id);

  const response = NextResponse.json({ data: { id: user.id, email: user.email } }, { status: 200 });
  response.cookies.set(
    getSessionCookieName(),
    session.token,
    getSessionCookieOptions(session.expiresAt),
  );

  return response;
}
