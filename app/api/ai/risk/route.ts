import { NextResponse } from "next/server";
import { buildRiskExplainerPrompt, buildRiskPromptInput } from "@/lib/aiPrompts";
import { estimateAiCostUsd } from "@/lib/aiCost";
import {
  OpenRouterUpstreamError,
  callOpenRouter,
  describeOpenRouterError,
  resolveOpenRouterConfig,
} from "@/lib/openrouter";
import { recordAiResponseLog } from "@/lib/aiResponseLog";
import { buildNeutralAiWarningMarkdown, checkAiAdviceLanguage } from "@/lib/aiSafety";
import { validateAllocation } from "@/lib/allocationValidation";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import { TTLCache, buildRiskCacheKey } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rateLimit";

type RiskExplainerJson = {
  overallAssessment: string[];
  weaknesses: string[];
  allocationImprovements: string[];
  downsideRisks: string[];
};

type RiskAiMeta = {
  model: string;
  latencyMs: number;
  estimatedCostUsd: number | null;
  safetyNotice?: string | null;
  safetyMatchedTerms?: string[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

type RiskCacheEntry = {
  markdown: string;
  meta?: RiskAiMeta;
};

const riskCache = new TTLCache<RiskCacheEntry>({ ttlMs: 5 * 60 * 1000, maxSize: 200 });

function buildRiskSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["overallAssessment", "weaknesses", "allocationImprovements", "downsideRisks"],
    properties: {
      overallAssessment: {
        type: "array",
        minItems: 2,
        items: { type: "string" },
      },
      weaknesses: {
        type: "array",
        minItems: 1,
        items: { type: "string" },
      },
      allocationImprovements: {
        type: "array",
        minItems: 1,
        items: { type: "string" },
      },
      downsideRisks: {
        type: "array",
        minItems: 2,
        items: { type: "string" },
      },
    },
  } as const;
}

function parseRiskExplainerJson(raw: unknown): RiskExplainerJson {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("AI response was not an object.");
  }
  const record = raw as Record<string, unknown>;
  const readArray = (key: keyof RiskExplainerJson, minItems: number): string[] => {
    const value = record[key];
    if (!Array.isArray(value)) {
      throw new TypeError(`AI response missing ${String(key)} array.`);
    }
    const items = value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
    if (items.length < minItems) {
      throw new TypeError(`AI response ${String(key)} requires at least ${minItems} items.`);
    }
    return items;
  };

  return {
    overallAssessment: readArray("overallAssessment", 2),
    weaknesses: readArray("weaknesses", 1),
    allocationImprovements: readArray("allocationImprovements", 1),
    downsideRisks: readArray("downsideRisks", 2),
  };
}

function buildRiskMarkdown(payload: RiskExplainerJson): string {
  return [
    "### Overall Assessment",
    ...payload.overallAssessment.map((item) => `- ${item}`),
    "",
    "### Weaknesses",
    ...payload.weaknesses.map((item) => `- ${item}`),
    "",
    "### Allocation Improvements",
    ...payload.allocationImprovements.map((item) => `- ${item}`),
    "",
    "### Downside Risks",
    ...payload.downsideRisks.map((item) => `- ${item}`),
  ].join("\n");
}

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const rate = checkRateLimit(`ai:risk:${clientKey}`, { windowMs: 60_000, max: 8 });

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
    const cached = riskCache.get(cacheKey);
    if (cached) {
      const cachedMeta = {
        ...cached.meta,
        estimatedCostUsd: estimateAiCostUsd(cached.meta?.usage),
      };
      await recordAiResponseLog({
        kind: "risk",
        strategyId: body.strategyId,
        metadata: {
          cached: true,
          ...cachedMeta,
        },
      });
      return NextResponse.json({
        data: { markdown: cached.markdown, meta: cachedMeta, cached: true },
      });
    }

    const promptInput = buildRiskPromptInput(allocation, body.metrics);
    const openRouterConfig = resolveOpenRouterConfig();
    if (!openRouterConfig.ok) {
      return NextResponse.json({ error: openRouterConfig.error }, { status: 503 });
    }

    const instructions = [
      "Return only JSON that matches the provided schema.",
      "Do not include markdown, prose outside the JSON, or additional keys.",
    ].join(" ");
    const prompt = buildRiskExplainerPrompt(promptInput);

    const result = await callOpenRouter({
      config: openRouterConfig.config,
      label: "risk explainer",
      prompt,
      instructions,
      jsonSchema: {
        name: "risk_explainer",
        description:
          "Portfolio risk explainer with headings mapped to bullet arrays for markdown rendering.",
        schema: buildRiskSchema(),
      },
    });

    const json = parseRiskExplainerJson(JSON.parse(result.text));
    const markdown = buildRiskMarkdown(json);
    const safety = checkAiAdviceLanguage(markdown);
    const responseMarkdown = safety.flagged ? buildNeutralAiWarningMarkdown() : markdown;
    const meta: RiskAiMeta = {
      model: result.model,
      latencyMs: result.latencyMs,
      estimatedCostUsd: estimateAiCostUsd(result.usage),
      safetyNotice: safety.disclaimer,
      safetyMatchedTerms: safety.matchedTerms.length > 0 ? safety.matchedTerms : undefined,
      usage: result.usage,
    };

    riskCache.set(cacheKey, { markdown: responseMarkdown, meta });
    await recordAiResponseLog({
      kind: "risk",
      strategyId: body.strategyId,
      metadata: {
        cached: false,
        ...meta,
      },
    });

    return NextResponse.json({ data: { markdown: responseMarkdown, meta, cached: false } });
  } catch (error) {
    if (error instanceof OpenRouterUpstreamError) {
      const failure = describeOpenRouterError(error.status);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }

    console.error("Failed to generate AI risk explainer", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
