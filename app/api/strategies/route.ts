import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("Failed to create strategy", error);
    return NextResponse.json({ error: "Unable to save strategy." }, { status: 500 });
  }
}

export async function GET() {
  try {
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
  } catch (error) {
    console.error("Failed to load strategies", error);
    return NextResponse.json({ error: "Unable to load strategies." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };
    const id = body.id?.trim();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.strategy.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete strategy", error);
    return NextResponse.json({ error: "Unable to delete strategy." }, { status: 500 });
  }
}
