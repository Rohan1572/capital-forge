import { DbNull, type InputJsonValue } from "@prisma/client/runtime/client";
import { NextResponse } from "next/server";
import {
  SIMULATION_ASSUMPTIONS_VERSION,
  buildSimulationAssumptionsSnapshot,
} from "@/lib/simulationAudit";
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
      assumptionsVersion?: unknown;
      assumptions?: unknown;
      seed?: unknown;
      shockId?: unknown;
      shockModifiers?: unknown;
      simulationResults?: unknown;
      simulationSeed?: unknown;
      simulationMode?: unknown;
      simulationShock?: unknown;
    };
    if (!body.allocation || !body.metrics) {
      return NextResponse.json({ error: "allocation and metrics are required" }, { status: 400 });
    }

    const seed =
      typeof body.seed === "number" && Number.isInteger(body.seed)
        ? body.seed
        : typeof body.simulationSeed === "number" && Number.isInteger(body.simulationSeed)
          ? body.simulationSeed
          : null;
    const shockId =
      typeof body.shockId === "string" && body.shockId.trim() ? body.shockId.trim() : null;
    const assumptionsVersion =
      typeof body.assumptionsVersion === "string" && body.assumptionsVersion.trim()
        ? body.assumptionsVersion.trim()
        : SIMULATION_ASSUMPTIONS_VERSION;
    const assumptions =
      body.assumptions == null ? buildSimulationAssumptionsSnapshot() : body.assumptions;
    const shockModifiers =
      body.shockModifiers == null ? DbNull : (body.shockModifiers as InputJsonValue);
    const simulationShock =
      body.simulationShock == null ? DbNull : (body.simulationShock as InputJsonValue);

    const strategyData = {
      userId: user.id,
      allocation: body.allocation as InputJsonValue,
      metrics: body.metrics as InputJsonValue,
      assumptionsVersion,
      assumptions: assumptions as InputJsonValue,
      seed,
      shockId,
      shockModifiers,
      simulationResults:
        body.simulationResults == null ? DbNull : (body.simulationResults as InputJsonValue),
      simulationSeed: seed,
      simulationMode: typeof body.simulationMode === "string" ? body.simulationMode : null,
      simulationShock,
    };

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
          assumptionsVersion,
          seed,
          shockId,
          shockModifiers: body.shockModifiers ?? null,
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
