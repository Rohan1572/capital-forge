import { NextResponse } from "next/server";
import { buildRiskExplainerPrompt, buildRiskPromptInput } from "@/lib/aiPrompts";
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

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

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
    throw new Error("AI response was not an object.");
  }
  const record = raw as Record<string, unknown>;
  const readArray = (key: keyof RiskExplainerJson, minItems: number): string[] => {
    const value = record[key];
    if (!Array.isArray(value)) {
      throw new Error(`AI response missing ${String(key)} array.`);
    }
    const items = value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
    if (items.length < minItems) {
      throw new Error(`AI response ${String(key)} requires at least ${minItems} items.`);
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
    };

    if (!body.allocation || !body.metrics) {
      return NextResponse.json({ error: "allocation and metrics are required" }, { status: 400 });
    }

    const cacheKey = buildRiskCacheKey(body.allocation, body.metrics);
    const cached = riskCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        data: { markdown: cached.markdown, meta: cached.meta, cached: true },
      });
    }

    const promptInput = buildRiskPromptInput(body.allocation, body.metrics);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    const instructions = [
      "Return only JSON that matches the provided schema.",
      "Do not include markdown, prose outside the JSON, or additional keys.",
    ].join(" ");
    const prompt = buildRiskExplainerPrompt(promptInput);

    const startTime = Date.now();
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        instructions,
        text: {
          format: {
            type: "json_schema",
            name: "risk_explainer",
            description:
              "Portfolio risk explainer with headings mapped to bullet arrays for markdown rendering.",
            strict: true,
            schema: buildRiskSchema(),
          },
        },
        store: process.env.OPENAI_STORE_RESPONSES === "true",
      }),
    });
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI risk explainer request failed", response.status, errorBody);
      return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
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
      throw new Error("OpenAI response missing output text.");
    }

    const json = parseRiskExplainerJson(JSON.parse(outputText));
    const markdown = buildRiskMarkdown(json);
    const meta: RiskAiMeta = {
      model: payload.model ?? model,
      latencyMs,
      usage: {
        inputTokens: payload.usage?.input_tokens,
        outputTokens: payload.usage?.output_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    };

    riskCache.set(cacheKey, { markdown, meta });

    return NextResponse.json({ data: { markdown, meta, cached: false } });
  } catch (error) {
    console.error("Failed to generate AI risk explainer", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
