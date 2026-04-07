import { DbNull, type InputJsonValue } from "@prisma/client/runtime/client";
import { NextResponse } from "next/server";
import { RISK_FREE_RATE } from "@/lib/env";
import { validateAllocation } from "@/lib/allocationValidation";
import {
  SIMULATION_ASSUMPTIONS_VERSION,
  buildSimulationAssumptionsSnapshot,
} from "@/lib/simulationAudit";
import { computeSimulationMetrics } from "@/lib/metrics";
import { buildSimulationConfigMetadata } from "@/lib/simulationConfig";
import { createSimulationRun } from "@/lib/simulationRun";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { requireSameOrigin } from "@/lib/requestSecurity";

type StrategyPostBody = {
  sourceStrategyId?: unknown;
  allocation?: unknown;
  metrics?: unknown;
  assumptionsVersion?: unknown;
  assumptions?: unknown;
  seed?: unknown;
  shockId?: unknown;
  shockModifiers?: unknown;
  simulationLatencyMs?: unknown;
  simulationResults?: unknown;
  simulationSeed?: unknown;
  simulationMode?: unknown;
  simulationShock?: unknown;
};

function readTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function readSimulationResults(value: unknown) {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    ? (value as number[])
    : null;
}

function buildStrategyPayload(userId: string, body: StrategyPostBody) {
  if (!body.allocation || !body.metrics) {
    return {
      error: NextResponse.json({ error: "allocation and metrics are required" }, { status: 400 }),
    };
  }

  const allocationValidation = validateAllocation(body.allocation);
  if (!allocationValidation.ok) {
    return {
      error: NextResponse.json(
        { error: `Invalid allocation: ${allocationValidation.error}` },
        { status: 400 },
      ),
    };
  }

  const seed = readInteger(body.seed) ?? readInteger(body.simulationSeed);
  const shockId = readTrimmedString(body.shockId);
  const assumptionsVersion =
    readTrimmedString(body.assumptionsVersion) ?? SIMULATION_ASSUMPTIONS_VERSION;
  const assumptions = body.assumptions ?? buildSimulationAssumptionsSnapshot();
  const simulationResults = readSimulationResults(body.simulationResults);
  const metrics = simulationResults
    ? computeSimulationMetrics(simulationResults, RISK_FREE_RATE)
    : body.metrics;
  const shockModifiers =
    body.shockModifiers == null ? DbNull : (body.shockModifiers as InputJsonValue);
  const simulationLatencyMsValue = readInteger(body.simulationLatencyMs);
  const simulationLatencyMs =
    simulationLatencyMsValue == null ? null : Math.max(0, Math.round(simulationLatencyMsValue));
  const simulationShock =
    body.simulationShock == null ? DbNull : (body.simulationShock as InputJsonValue);
  const simulationMode = typeof body.simulationMode === "string" ? body.simulationMode : null;

  return {
    allocationValidation,
    assumptions,
    assumptionsVersion,
    metrics,
    seed,
    shockId,
    shockModifiers,
    simulationLatencyMs,
    simulationMode,
    strategyData: {
      userId,
      allocation: allocationValidation.allocation as InputJsonValue,
      metrics: metrics as InputJsonValue,
      assumptionsVersion,
      assumptions: assumptions as InputJsonValue,
      seed,
      shockId,
      shockModifiers,
      simulationResults:
        body.simulationResults == null ? DbNull : (body.simulationResults as InputJsonValue),
      simulationSeed: seed,
      simulationMode,
      simulationShock,
    },
  };
}

function buildStrategyRunName(simulationMode: string | null) {
  return `${simulationMode ?? "baseline"} strategy run`;
}

function buildClonedStrategyRunName() {
  return "cloned strategy run";
}

function buildStrategyAuditMetadata(params: {
  strategyId: string;
  allocation: Record<string, unknown>;
  metrics: unknown;
  assumptionsVersion: string;
  seed: number | null;
  shockId: string | null;
  shockModifiers: unknown;
  simulationLatencyMs: number | null;
  simulationMode: string | null;
}) {
  return {
    strategyId: params.strategyId,
    allocation: params.allocation,
    metrics: params.metrics,
    assumptionsVersion: params.assumptionsVersion,
    seed: params.seed,
    shockId: params.shockId,
    shockModifiers: params.shockModifiers,
    simulationLatencyMs: params.simulationLatencyMs,
    simulationMode: params.simulationMode,
  };
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) {
      return originError;
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as StrategyPostBody;
    const sourceStrategyId = readTrimmedString(body.sourceStrategyId);

    if (sourceStrategyId) {
      const sourceStrategy = await prisma.strategy.findFirst({
        where: { id: sourceStrategyId, userId: user.id },
      });

      if (!sourceStrategy) {
        return NextResponse.json({ error: "Source strategy not found." }, { status: 404 });
      }

      const clonedStrategy = await prisma.strategy.create({
        data: {
          userId: user.id,
          allocation: sourceStrategy.allocation,
          metrics: sourceStrategy.metrics,
          assumptionsVersion: sourceStrategy.assumptionsVersion,
          assumptions: sourceStrategy.assumptions,
          seed: sourceStrategy.seed,
          shockId: sourceStrategy.shockId,
          shockModifiers: sourceStrategy.shockModifiers,
          simulationResults: sourceStrategy.simulationResults,
          simulationSeed: sourceStrategy.simulationSeed,
          simulationMode: sourceStrategy.simulationMode,
          simulationShock: sourceStrategy.simulationShock,
        },
      });

      try {
        await createSimulationRun({
          userId: user.id,
          strategyId: clonedStrategy.id,
          name: buildClonedStrategyRunName(),
          status: "completed",
          assumptionsVersion: sourceStrategy.assumptionsVersion,
          assumptions: sourceStrategy.assumptions,
          seed: sourceStrategy.seed,
          shockId: sourceStrategy.shockId,
          shockModifiers: sourceStrategy.shockModifiers ?? null,
          results: sourceStrategy.simulationResults ?? null,
        });
      } catch (runError) {
        console.error("Failed to persist cloned simulation run", runError);
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "strategy.clone",
          metadata: {
            sourceStrategyId,
            clonedStrategyId: clonedStrategy.id,
          },
        },
      });

      return NextResponse.json(
        {
          data: {
            ...clonedStrategy,
            simulationConfig: buildSimulationConfigMetadata(
              clonedStrategy.assumptionsVersion,
              clonedStrategy.assumptions,
            ),
          },
        },
        { status: 201 },
      );
    }

    const payload = buildStrategyPayload(user.id, body);
    if ("error" in payload) {
      return payload.error;
    }

    const strategy = await prisma.strategy.create({
      data: payload.strategyData,
    });

    try {
      await createSimulationRun({
        userId: user.id,
        strategyId: strategy.id,
        name: buildStrategyRunName(payload.simulationMode),
        status: "completed",
        assumptionsVersion: payload.assumptionsVersion,
        assumptions: payload.assumptions,
        seed: payload.seed,
        shockId: payload.shockId,
        shockModifiers: body.shockModifiers ?? null,
        results: body.simulationResults ?? null,
      });
    } catch (runError) {
      console.error("Failed to persist simulation run", runError);
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "strategy.create",
        metadata: buildStrategyAuditMetadata({
          strategyId: strategy.id,
          allocation: payload.allocationValidation.allocation,
          metrics: payload.metrics,
          assumptionsVersion: payload.assumptionsVersion,
          seed: payload.seed,
          shockId: payload.shockId,
          shockModifiers: body.shockModifiers ?? null,
          simulationLatencyMs: payload.simulationLatencyMs,
          simulationMode: payload.simulationMode,
        }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...strategy,
          simulationConfig: buildSimulationConfigMetadata(
            payload.assumptionsVersion,
            payload.assumptions,
          ),
        },
      },
      { status: 201 },
    );
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
    });

    return NextResponse.json({
      data: strategies.map((strategy) => ({
        ...strategy,
        simulationConfig: buildSimulationConfigMetadata(
          strategy.assumptionsVersion,
          strategy.assumptions,
        ),
      })),
    });
  } catch (error) {
    console.error("Failed to load strategies", error);
    return NextResponse.json({ error: "Unable to load strategies." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) {
      return originError;
    }
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
