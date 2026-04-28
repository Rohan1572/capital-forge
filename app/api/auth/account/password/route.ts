import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSameOrigin } from "../../../../../lib/requestSecurity";
import { getSessionCookieName, updateUserPassword, verifyPassword } from "../../../../../lib/auth";
import { getSessionUser } from "../../../../../lib/session";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(getSessionCookieName())?.value;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
  if (!userRecord) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isPasswordValid = await verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  await updateUserPassword(user.id, newPassword);
  await prisma.session.deleteMany({
    where: currentToken ? { userId: user.id, token: { not: currentToken } } : { userId: user.id },
  });

  return NextResponse.json({ data: { ok: true } });
}
