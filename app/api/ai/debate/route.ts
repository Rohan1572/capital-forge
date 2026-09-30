import { NextResponse } from "next/server";
import { estimateAiCostUsd } from "@/lib/aiCost";
import { recordAiResponseLog } from "@/lib/aiResponseLog";
import {
  OpenRouterUpstreamError,
  callOpenRouter,
  describeOpenRouterError,
  resolveOpenRouterConfig,
} from "@/lib/openrouter";
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
  estimatedCostUsd: number | null;
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
      const cachedMeta = {
        ...cached.meta,
        estimatedCostUsd: estimateAiCostUsd(cached.meta?.usage),
      };
      await recordAiResponseLog({
        kind: "debate",
        strategyId: body.strategyId,
        metadata: {
          cached: true,
          ...cachedMeta,
        },
      });
      return NextResponse.json({
        data: { calls: cached.calls, sections: cached.sections, meta: cachedMeta, cached: true },
      });
    }

    const openRouterConfig = resolveOpenRouterConfig();
    if (!openRouterConfig.ok) {
      return NextResponse.json({ error: openRouterConfig.error }, { status: 503 });
    }

    const callMetas: DebateAiCallMeta[] = [];
    const usageTotals: DebateAiUsage = {};
    let hasUsage = false;
    const startTime = Date.now();

    const result = await runDebateSequence({
      allocation,
      metrics: body.metrics,
      invokeAgent: async ({ role, prompt }) => {
        const call = await callOpenRouter({
          config: openRouterConfig.config,
          label: `debate agent (${role})`,
          prompt,
          instructions:
            "Return concise bullet points under headings: Opening Statement, Counterpoints, Recommendation.",
        });

        if (call.usage.inputTokens || call.usage.outputTokens || call.usage.totalTokens) {
          hasUsage = true;
          usageTotals.inputTokens = (usageTotals.inputTokens ?? 0) + (call.usage.inputTokens ?? 0);
          usageTotals.outputTokens =
            (usageTotals.outputTokens ?? 0) + (call.usage.outputTokens ?? 0);
          usageTotals.totalTokens = (usageTotals.totalTokens ?? 0) + (call.usage.totalTokens ?? 0);
        }

        callMetas.push({
          role,
          model: call.model,
          latencyMs: call.latencyMs,
          usage: call.usage,
        });

        return call.text;
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
      model: callMetas[0]?.model ?? openRouterConfig.config.model,
      latencyMs: Date.now() - startTime,
      estimatedCostUsd: estimateAiCostUsd(usageTotals),
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
    if (error instanceof OpenRouterUpstreamError) {
      const failure = describeOpenRouterError(error.status);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }

    console.error("Failed to generate AI debate", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
