import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createSimulationRun } from "@/lib/simulationRun";
import { buildSimulationConfigMetadata } from "@/lib/simulationConfig";

function parseTake(url: string) {
  try {
    const parsed = new URL(url);
    const take = Number(parsed.searchParams.get("take") ?? "5");
    if (!Number.isFinite(take)) return 5;
    return Math.min(Math.max(Math.trunc(take), 1), 20);
  } catch {
    return 5;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const take = parseTake(request.url);
    const runs = await prisma.simulationRun.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({
      data: runs.map((run) => ({
        ...run,
        simulationConfig: buildSimulationConfigMetadata(run.assumptionsVersion, run.assumptions),
      })),
    });
  } catch (error) {
    console.error("Failed to load simulations", error);
    return NextResponse.json({ error: "Unable to load simulations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      strategyId?: unknown;
      name?: unknown;
      status?: unknown;
      assumptionsVersion?: unknown;
      assumptions?: unknown;
      seed?: unknown;
      shockId?: unknown;
      shockModifiers?: unknown;
      results?: unknown;
    };

    const strategyId =
      typeof body.strategyId === "string" && body.strategyId.trim() ? body.strategyId.trim() : null;

    if (!strategyId) {
      return NextResponse.json({ error: "strategyId is required" }, { status: 400 });
    }

    const run = await createSimulationRun({
      userId: user.id,
      strategyId,
      name:
        typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Saved strategy run",
      status:
        typeof body.status === "string" && body.status.trim() ? body.status.trim() : undefined,
      assumptionsVersion:
        typeof body.assumptionsVersion === "string" ? body.assumptionsVersion : null,
      assumptions: body.assumptions ?? null,
      seed: typeof body.seed === "number" && Number.isInteger(body.seed) ? body.seed : null,
      shockId: typeof body.shockId === "string" && body.shockId.trim() ? body.shockId.trim() : null,
      shockModifiers: body.shockModifiers ?? null,
      results: body.results ?? null,
    });

    return NextResponse.json(
      {
        data: {
          ...run,
          simulationConfig: buildSimulationConfigMetadata(run.assumptionsVersion, run.assumptions),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create simulation", error);
    return NextResponse.json({ error: "Unable to create simulation." }, { status: 500 });
  }
}
