import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { getPasswordDigest, verifyPasswordResetToken } from "@/lib/passwordRecovery";
import { getSessionCookieName, updateUserPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const body = (await request.json()) as { token?: string; newPassword?: string };
  const token = body.token ?? "";
  const newPassword = body.newPassword ?? "";

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const payload = verifyPasswordResetToken(token);
  if (!payload) {
    return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (user?.email !== payload.email) {
    return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
  }

  if (getPasswordDigest(user.passwordHash) !== payload.passwordDigest) {
    return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(getSessionCookieName())?.value;

  await updateUserPassword(user.id, newPassword);
  await prisma.session.deleteMany({
    where: currentToken ? { userId: user.id, token: { not: currentToken } } : { userId: user.id },
  });

  return NextResponse.json({ data: { ok: true } });
}
