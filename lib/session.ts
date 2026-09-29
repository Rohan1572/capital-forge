import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getSessionCookieName } from "./auth";
import type { User } from "./generated/prisma/client";

export type SessionUser = Pick<User, "id" | "email" | "name" | "createdAt">;

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, email: true, name: true, createdAt: true } },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}
