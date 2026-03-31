import { NextResponse } from "next/server";
import { recordAiResponseLog } from "@/lib/aiResponseLog";
import { buildNeutralDebateResponse, checkAiAdviceLanguage } from "@/lib/aiSafety";
import { validateAllocation } from "@/lib/allocationValidation";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import { TTLCache, buildRiskCacheKey } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  parseDebateSections,
  runDebateSequence,
  type DebateAgentCall,
  type DebateSections,
} from "@/lib/debateEngine";

type DebateAiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

type DebateAiCallMeta = {
  role: DebateAgentCall["role"];
  model: string;
  latencyMs: number;
  usage?: DebateAiUsage;
};

type DebateAiMeta = {
  model: string;
  latencyMs: number;
  safetyNotice?: string | null;
  safetyMatchedTerms?: string[];
  usage?: DebateAiUsage;
  calls: DebateAiCallMeta[];
};

type DebateCacheEntry = {
  calls: DebateAgentCall[];
  sections: DebateSections[];
  meta?: DebateAiMeta;
};

const debateCache = new TTLCache<DebateCacheEntry>({ ttlMs: 5 * 60 * 1000, maxSize: 150 });
const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const rate = checkRateLimit(`ai:debate:${clientKey}`, { windowMs: 60_000, max: 6 });

  if (!rate.allowed) {
    const headers = new Headers();
    if (rate.retryAfterMs !== null) {
      headers.set("Retry-After", Math.ceil(rate.retryAfterMs / 1000).toString());
    }
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait and try again." },
      { status: 429, headers },
    );
  }

  try {
    const body = (await request.json()) as {
      allocation?: Allocation;
      metrics?: SimulationMetrics;
      strategyId?: string;
    };

    if (!body.allocation || !body.metrics) {
      return NextResponse.json({ error: "allocation and metrics are required" }, { status: 400 });
    }

    const allocationValidation = validateAllocation(body.allocation);
    if (!allocationValidation.ok) {
      return NextResponse.json(
        { error: `Invalid allocation: ${allocationValidation.error}` },
        { status: 400 },
      );
    }

    const allocation = allocationValidation.allocation;
    const cacheKey = buildRiskCacheKey(allocation, body.metrics);
    const cached = debateCache.get(cacheKey);
    if (cached) {
      await recordAiResponseLog({
        kind: "debate",
        strategyId: body.strategyId,
        metadata: {
          cached: true,
          ...(cached.meta ?? {}),
        },
      });
      return NextResponse.json({
        data: { calls: cached.calls, sections: cached.sections, meta: cached.meta, cached: true },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    const callMetas: DebateAiCallMeta[] = [];
    const usageTotals: DebateAiUsage = {};
    let hasUsage = false;
    const startTime = Date.now();

    const result = await runDebateSequence({
      allocation,
      metrics: body.metrics,
      invokeAgent: async ({ role, prompt }) => {
        const callStart = Date.now();
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            input: prompt,
            instructions:
              "Return concise bullet points under headings: Opening Statement, Counterpoints, Recommendation.",
            store: process.env.OPENAI_STORE_RESPONSES === "true",
          }),
        });

        const callLatencyMs = Date.now() - callStart;

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("OpenAI debate agent request failed", response.status, errorBody);
          throw new Error("OpenAI debate agent call failed.");
        }

        const payload = (await response.json()) as {
          output?: Array<{
            type: string;
            content?: Array<{ type: string; text?: string }>;
          }>;
          output_text?: string;
          model?: string;
          usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
        };

        const outputText =
          payload.output_text ??
          payload.output
            ?.find((item) => item.type === "message")
            ?.content?.find((part) => part.type === "output_text")?.text;

        if (!outputText) {
          throw new Error("OpenAI debate response missing output text.");
        }

        const callUsage = payload.usage
          ? {
              inputTokens: payload.usage.input_tokens,
              outputTokens: payload.usage.output_tokens,
              totalTokens: payload.usage.total_tokens,
            }
          : undefined;

        if (callUsage?.inputTokens || callUsage?.outputTokens || callUsage?.totalTokens) {
          hasUsage = true;
          usageTotals.inputTokens = (usageTotals.inputTokens ?? 0) + (callUsage.inputTokens ?? 0);
          usageTotals.outputTokens =
            (usageTotals.outputTokens ?? 0) + (callUsage.outputTokens ?? 0);
          usageTotals.totalTokens = (usageTotals.totalTokens ?? 0) + (callUsage.totalTokens ?? 0);
        }

        callMetas.push({
          role,
          model: payload.model ?? model,
          latencyMs: callLatencyMs,
          usage: callUsage,
        });

        return outputText;
      },
    });

    const rawResponses = result.calls.map((call) => call.response).join("\n\n");
    const safety = checkAiAdviceLanguage(rawResponses);
    const sanitizedCalls = safety.flagged
      ? result.calls.map((call) => ({
          ...call,
          response: buildNeutralDebateResponse(),
        }))
      : result.calls;
    const sections = sanitizedCalls.map((call) => parseDebateSections(call.response));
    const meta: DebateAiMeta = {
      model,
      latencyMs: Date.now() - startTime,
      safetyNotice: safety.disclaimer,
      safetyMatchedTerms: safety.matchedTerms.length > 0 ? safety.matchedTerms : undefined,
      usage: hasUsage ? usageTotals : undefined,
      calls: callMetas,
    };

    debateCache.set(cacheKey, { calls: sanitizedCalls, sections, meta });
    await recordAiResponseLog({
      kind: "debate",
      strategyId: body.strategyId,
      metadata: {
        cached: false,
        ...meta,
      },
    });

    return NextResponse.json({
      data: { calls: sanitizedCalls, sections, meta, cached: false },
    });
  } catch (error) {
    console.error("Failed to generate AI debate", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
