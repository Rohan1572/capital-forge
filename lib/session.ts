import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getSessionCookieName } from "./auth";

export type SessionUser = Pick<PrismaUser, "id" | "email" | "name" | "createdAt">;

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) return null;

  const session = (await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })) as (PrismaSession & { user: SessionUser }) | null;

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}
