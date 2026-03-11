import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { allocation?: unknown; metrics?: unknown };
  if (!body.allocation || !body.metrics) {
    return NextResponse.json({ error: "allocation and metrics are required" }, { status: 400 });
  }

  const strategy = await prisma.strategy.create({
    data: {
      userId: user.id,
      allocation: body.allocation,
      metrics: body.metrics,
    },
  });

  return NextResponse.json({ data: strategy }, { status: 201 });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const strategies = await prisma.strategy.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ data: strategies });
}
