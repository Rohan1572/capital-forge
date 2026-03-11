import { NextResponse } from "next/server";
import { buildRiskExplainerMarkdown, buildRiskPromptInput } from "@/lib/aiPrompts";
import type { Allocation } from "@/lib/monteCarlo";
import type { SimulationMetrics } from "@/lib/metrics";
import { TTLCache, buildRiskCacheKey } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rateLimit";

const riskCache = new TTLCache<string>({ ttlMs: 5 * 60 * 1000, maxSize: 200 });

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
      return NextResponse.json({ data: { markdown: cached, cached: true } });
    }

    const promptInput = buildRiskPromptInput(body.allocation, body.metrics);
    const markdown = buildRiskExplainerMarkdown(promptInput);

    riskCache.set(cacheKey, markdown);

    return NextResponse.json({ data: { markdown, cached: false } });
  } catch (error) {
    console.error("Failed to generate AI risk explainer", error);
    return NextResponse.json({ error: "Unable to generate AI response." }, { status: 500 });
  }
}
