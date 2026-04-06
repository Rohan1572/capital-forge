import { buildShockGeneratorPrompt } from "./aiPrompts";

type ShockModifiers = {
  meanShift: number;
  volatilityMultiplier: number;
  correlationShift: number;
  meanShiftByAsset?: Record<string, number>;
  volatilityMultiplierByAsset?: Record<string, number>;
  correlationShiftByAsset?: Record<string, number>;
};

export type ShockGenerationContext = {
  weekLabel?: string;
  focus?: string;
  recentConditions?: string;
};

export type GeneratedShock = {
  title: string;
  description: string;
  marketImpact: string[];
  modifiers: ShockModifiers;
};

export type ShockAiMeta = {
  model: string;
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type WeeklyShockResult = {
  shock: {
    id: string;
    title: string;
    description: string;
    marketImpact: unknown;
    modifiers: unknown;
    active: boolean;
    weekStart: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  meta: ShockAiMeta;
  weekStart: Date;
};

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

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

function parseShockPayload(raw: unknown): GeneratedShock {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("AI response was not an object.");
  }

  const record = raw as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.description !== "string") {
    throw new TypeError("AI response missing title or description.");
  }
  if (!Array.isArray(record.marketImpact)) {
    throw new TypeError("AI response missing marketImpact array.");
  }

  const marketImpact = record.marketImpact
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);

  if (marketImpact.length < 3) {
    throw new TypeError("AI response marketImpact requires at least 3 items.");
  }

  if (!record.modifiers || typeof record.modifiers !== "object") {
    throw new TypeError("AI response missing modifiers.");
  }

  return {
    title: record.title.trim(),
    description: record.description.trim(),
    marketImpact,
    modifiers: record.modifiers as ShockModifiers,
  };
}

export function startOfWeekUTC(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay();
  const diff = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

async function generateShock(context: ShockGenerationContext): Promise<{
  shock: GeneratedShock;
  meta: ShockAiMeta;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TypeError("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const prompt = buildShockGeneratorPrompt(context);
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
    throw new TypeError(`OpenAI shock request failed: ${response.status} ${errorBody}`);
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
    throw new TypeError("OpenAI response missing output text.");
  }

  return {
    shock: parseShockPayload(JSON.parse(outputText)),
    meta: {
      model: payload.model ?? model,
      latencyMs,
      usage: {
        inputTokens: payload.usage?.input_tokens,
        outputTokens: payload.usage?.output_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    },
  };
}

export async function generateAndActivateWeeklyShock(
  context: ShockGenerationContext = {},
  now = new Date(),
): Promise<WeeklyShockResult> {
  const { shock, meta } = await generateShock(context);
  const weekStart = startOfWeekUTC(now);
  const { prisma } = await import("./prisma");

  const [, created] = await prisma.$transaction([
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

  return {
    shock: created,
    meta,
    weekStart,
  };
}
