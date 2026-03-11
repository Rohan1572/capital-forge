import { NextResponse } from "next/server";
import {
  createSession,
  createUser,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; name?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const user = await createUser({ email, password, name });
  const session = await createSession(user.id);

  const response = NextResponse.json(
    { data: { id: user.id, email: user.email, name: user.name } },
    { status: 201 },
  );

  response.cookies.set(
    getSessionCookieName(),
    session.token,
    getSessionCookieOptions(session.expiresAt),
  );

  return response;
}
