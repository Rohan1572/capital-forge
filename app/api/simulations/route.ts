import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const runs = await prisma.simulationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ data: runs });
  } catch (error) {
    console.error("Failed to load simulations", error);
    return NextResponse.json({ error: "Unable to load simulations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("Failed to create simulation", error);
    return NextResponse.json({ error: "Unable to create simulation." }, { status: 500 });
  }
}
