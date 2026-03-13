import { NextResponse } from "next/server";
import { buildShockGeneratorPrompt } from "@/lib/aiPrompts";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

type ShockModifiers = {
  meanShift: number;
  volatilityMultiplier: number;
  correlationShift: number;
  meanShiftByAsset?: Record<string, number>;
  volatilityMultiplierByAsset?: Record<string, number>;
  correlationShiftByAsset?: Record<string, number>;
};

type ShockPayload = {
  title: string;
  description: string;
  marketImpact: string[];
  modifiers: ShockModifiers;
};

type ShockAiMeta = {
  model: string;
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip") || "unknown";
}

function startOfWeekUTC(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay();
  const diff = (day + 6) % 7; // Monday start
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

function buildShockSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "description", "marketImpact", "modifiers"],
    properties: {
      title: { type: "string", minLength: 3 },
      description: { type: "string", minLength: 20 },
      marketImpact: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string" },
      },
      modifiers: {
        type: "object",
        additionalProperties: false,
        required: ["meanShift", "volatilityMultiplier", "correlationShift"],
        properties: {
          meanShift: { type: "number", minimum: -0.2, maximum: 0.2 },
          volatilityMultiplier: { type: "number", minimum: 0.6, maximum: 2 },
          correlationShift: { type: "number", minimum: -0.5, maximum: 0.5 },
          meanShiftByAsset: { type: "object", additionalProperties: { type: "number" } },
          volatilityMultiplierByAsset: { type: "object", additionalProperties: { type: "number" } },
          correlationShiftByAsset: { type: "object", additionalProperties: { type: "number" } },
        },
      },
    },
  } as const;
}

function parseShockPayload(raw: unknown): ShockPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI response was not an object.");
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.description !== "string") {
    throw new Error("AI response missing title or description.");
  }
  if (!Array.isArray(record.marketImpact)) {
    throw new Error("AI response missing marketImpact array.");
  }
  const marketImpact = record.marketImpact
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  if (marketImpact.length < 3) {
    throw new Error("AI response marketImpact requires at least 3 items.");
  }
  if (!record.modifiers || typeof record.modifiers !== "object") {
    throw new Error("AI response missing modifiers.");
  }
  const modifiers = record.modifiers as ShockModifiers;
  return {
    title: record.title.trim(),
    description: record.description.trim(),
    marketImpact,
    modifiers,
  };
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const rate = checkRateLimit(`ai:shock:${clientKey}`, { windowMs: 60_000, max: 4 });

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
    const body = (await request.json().catch(() => ({}))) as {
      weekLabel?: string;
      focus?: string;
      recentConditions?: string;
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    const prompt = buildShockGeneratorPrompt(body);
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
        text: {
          format: {
            type: "json_schema",
            name: "weekly_shock",
            description: "Weekly macro shock scenario with market impact bullets and modifiers.",
            strict: true,
            schema: buildShockSchema(),
          },
        },
        store: process.env.OPENAI_STORE_RESPONSES === "true",
      }),
    });
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI shock request failed", response.status, errorBody);
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

    const shock = parseShockPayload(JSON.parse(outputText));
    const weekStart = startOfWeekUTC(new Date());

    const [created] = await prisma.$transaction([
      prisma.shockEvent.updateMany({ data: { active: false }, where: { active: true } }),
      prisma.shockEvent.create({
        data: {
          title: shock.title,
          description: shock.description,
          marketImpact: shock.marketImpact,
          modifiers: shock.modifiers,
          active: true,
          weekStart,
        },
      }),
    ]);

    const meta: ShockAiMeta = {
      model: payload.model ?? model,
      latencyMs,
      usage: {
        inputTokens: payload.usage?.input_tokens,
        outputTokens: payload.usage?.output_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    };

    return NextResponse.json({
      data: {
        shock: created,
        meta,
      },
    });
  } catch (error) {
    console.error("Failed to generate weekly shock", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
