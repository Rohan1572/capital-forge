import { type InputJsonValue } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma";

export type AiResponseLogKind = "risk" | "debate";

export type AiResponseLogPayload = {
  kind: AiResponseLogKind;
  strategyId?: string | null;
  metadata: Record<string, unknown>;
};

export async function recordAiResponseLog(payload: AiResponseLogPayload) {
  const strategyId = payload.strategyId?.trim();
  if (!strategyId) {
    return;
  }

  try {
    await prisma.aiResponseLog.create({
      data: {
        strategyId,
        kind: payload.kind,
        metadata: payload.metadata as InputJsonValue,
      },
    });
  } catch (error) {
    console.error("Failed to persist AI response log", error);
  }
}
