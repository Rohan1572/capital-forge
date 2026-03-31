import { DbNull, type InputJsonValue } from "@prisma/client/runtime/client";
import { prisma } from "./prisma";

export type SimulationRunInput = {
  userId: string;
  strategyId?: string | null;
  name: string;
  status?: string;
  assumptionsVersion: string | null;
  assumptions: unknown;
  seed: number | null;
  shockId: string | null;
  shockModifiers: unknown;
  results: unknown;
};

export async function createSimulationRun(input: SimulationRunInput) {
  return prisma.simulationRun.create({
    data: {
      userId: input.userId,
      strategyId: input.strategyId ?? null,
      name: input.name.trim(),
      status: input.status ?? "completed",
      assumptionsVersion: input.assumptionsVersion,
      assumptions: input.assumptions == null ? DbNull : (input.assumptions as InputJsonValue),
      seed: input.seed,
      shockId: input.shockId,
      shockModifiers:
        input.shockModifiers == null ? DbNull : (input.shockModifiers as InputJsonValue),
      results: input.results == null ? DbNull : (input.results as InputJsonValue),
    },
  });
}
