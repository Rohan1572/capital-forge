import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { createPasswordResetToken } from "@/lib/passwordRecovery";
import { isValidEmail } from "@/lib/auth";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({
      data: {
        message: "If that email address exists, a reset link is ready.",
        resetLink: null,
      },
    });
  }

  const token = createPasswordResetToken({
    userId: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
  });

  return NextResponse.json({
    data: {
      message: "Recovery link generated.",
      resetLink: `/reset-password?token=${encodeURIComponent(token)}`,
    },
  });
}
