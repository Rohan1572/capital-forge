import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/requestSecurity";
import {
  deleteUserAccount,
  deleteUserSessions,
  getSessionClearCookieOptions,
  getSessionCookieName,
  verifyPassword,
} from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { currentPassword?: string; confirmEmail?: string };
  const currentPassword = body.currentPassword ?? "";
  const confirmEmail = body.confirmEmail?.trim().toLowerCase() ?? "";

  if (confirmEmail !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Type your email address exactly to confirm deletion." },
      { status: 400 },
    );
  }

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
  if (!userRecord) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isPasswordValid = await verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  await deleteUserSessions(user.id);
  await deleteUserAccount(user.id);

  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(getSessionCookieName(), "", getSessionClearCookieOptions());

  return response;
}
