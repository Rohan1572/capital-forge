import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { isValidEmail, updateUserProfile, verifyPassword } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type ProfileUpdateBody = {
  name?: string;
  email?: string;
  currentPassword?: string;
};

async function ensureEmailCanBeUpdated(userId: string, currentPassword: string, nextEmail: string) {
  if (!currentPassword) {
    return NextResponse.json(
      { error: "Current password is required to change email." },
      { status: 400 },
    );
  }

  const userRecord = await prisma.user.findUnique({ where: { id: userId } });
  if (!userRecord) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isPasswordValid = await verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
  if (existing && existing.id !== userId) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  return null;
}

export async function PATCH(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as ProfileUpdateBody;
  const nextName = typeof body.name === "string" ? body.name.trim() || null : null;
  const nextEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : user.email;
  const currentPassword = body.currentPassword ?? "";
  const shouldChangeEmail = nextEmail !== user.email;

  if (shouldChangeEmail && !isValidEmail(nextEmail)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  if (nextName === user.name && !shouldChangeEmail) {
    return NextResponse.json({ error: "No changes were provided." }, { status: 400 });
  }

  if (shouldChangeEmail) {
    const validationError = await ensureEmailCanBeUpdated(user.id, currentPassword, nextEmail);
    if (validationError) {
      return validationError;
    }
  }

  const updated = await updateUserProfile(user.id, {
    name: nextName,
    email: nextEmail,
  });

  return NextResponse.json({ data: updated });
}
