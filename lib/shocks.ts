import { prisma } from "@/lib/prisma";

export async function getActiveShock() {
  return prisma.shockEvent.findFirst({
    where: { active: true },
    orderBy: { weekStart: "desc" },
  });
}
