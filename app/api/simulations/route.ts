import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const runs = await prisma.simulationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ data: runs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const run = await prisma.simulationRun.create({
    data: {
      name: body.name.trim(),
    },
  });

  return NextResponse.json({ data: run }, { status: 201 });
}
