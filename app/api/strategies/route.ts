import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      allocation?: unknown;
      metrics?: unknown;
      simulationResults?: unknown;
      simulationSeed?: unknown;
      simulationMode?: unknown;
      simulationShock?: unknown;
    };
    if (!body.allocation || !body.metrics) {
      return NextResponse.json({ error: "allocation and metrics are required" }, { status: 400 });
    }

    const strategyData = {
      userId: user.id,
      allocation: body.allocation,
      metrics: body.metrics,
      simulationResults: body.simulationResults ?? null,
      simulationSeed:
        typeof body.simulationSeed === "number" && Number.isInteger(body.simulationSeed)
          ? body.simulationSeed
          : null,
      simulationMode: typeof body.simulationMode === "string" ? body.simulationMode : null,
      simulationShock: body.simulationShock ?? null,
    } as unknown as Parameters<typeof prisma.strategy.create>[0]["data"];

    const strategy = await prisma.strategy.create({
      data: strategyData,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "strategy.create",
        metadata: {
          strategyId: strategy.id,
          allocation: body.allocation,
          metrics: body.metrics,
          simulationSeed:
            typeof body.simulationSeed === "number" && Number.isInteger(body.simulationSeed)
              ? body.simulationSeed
              : null,
          simulationMode: typeof body.simulationMode === "string" ? body.simulationMode : null,
        },
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

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "strategy.delete",
        metadata: {
          strategyId: id,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete strategy", error);
    return NextResponse.json({ error: "Unable to delete strategy." }, { status: 500 });
  }
}
