import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJsonRequest } from "./route-test-utils";

const mocks = vi.hoisted(() => ({
  recordAiResponseLog: vi.fn().mockResolvedValue(undefined),
}));

// Keeps the Prisma-backed logging module (and therefore DATABASE_URL) out of
// this suite; the AI routes only need it to persist usage metadata.
vi.mock("../../lib/aiResponseLog", () => ({
  recordAiResponseLog: mocks.recordAiResponseLog,
}));

import { POST as postAiDebate } from "../../app/api/ai/debate/route";
import { POST as postAiRisk } from "../../app/api/ai/risk/route";
import { DEFAULT_OPENROUTER_MODEL, OPENROUTER_API_URL } from "../../lib/openrouter";

const validAllocation = {
  equity: 30,
  startups: 20,
  bonds: 20,
  gold: 10,
  crypto: 10,
  cash: 10,
};

const validMetrics = {
  expectedReturn: 0.09,
  sharpeRatio: 0.8,
  maxDrawdown: 0.15,
  valueAtRisk5: -0.07,
  conditionalValueAtRisk95: -0.1,
};

function request(path: string) {
  return createJsonRequest(path, "POST", {
    allocation: validAllocation,
    metrics: validMetrics,
    strategyId: "strategy-1",
  });
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// A fresh Response per call: the debate runs three agents sequentially and a
// body can only be consumed once.
function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      error: { message: "Incorrect API key provided", code: "invalid_api_key" },
    }),
    { status: 401 },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI routes with a placeholder OPENROUTER_API_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "your-openrouter-api-key");
  });

  it("fails fast with a configuration error instead of calling the provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const riskResponse = await postAiRisk(request("/api/ai/risk"));
      expect(riskResponse.status).toBe(503);
      await expect(riskResponse.json()).resolves.toEqual({
        error: expect.stringContaining("OPENROUTER_API_KEY"),
      });

      const debateResponse = await postAiDebate(request("/api/ai/debate"));
      expect(debateResponse.status).toBe(503);
      await expect(debateResponse.json()).resolves.toEqual({
        error: expect.stringContaining("OPENROUTER_API_KEY"),
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe("AI routes when OpenRouter rejects the key", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-not-a-real-key");
  });

  it("surfaces a 503 configuration error rather than a generic 500", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => unauthorizedResponse());

    try {
      const riskResponse = await postAiRisk(request("/api/ai/risk"));
      expect(riskResponse.status).toBe(503);
      await expect(riskResponse.json()).resolves.toEqual({
        error: expect.stringContaining("OpenRouter rejected the configured API key"),
      });

      const debateResponse = await postAiDebate(request("/api/ai/debate"));
      expect(debateResponse.status).toBe(503);
      await expect(debateResponse.json()).resolves.toEqual({
        error: expect.stringContaining("OpenRouter rejected the configured API key"),
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("posts to the OpenRouter chat completions endpoint with the OpenRouter body shape", async () => {
    const riskPayload = {
      overallAssessment: ["Balanced growth.", "Watch the equity weight."],
      weaknesses: ["Equity concentration."],
      allocationImprovements: ["Trim equity by 5%."],
      downsideRisks: ["A rate shock.", "A liquidity squeeze."],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      jsonResponse({
        model: DEFAULT_OPENROUTER_MODEL,
        choices: [{ message: { role: "assistant", content: JSON.stringify(riskPayload) } }],
        usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
      }),
    );

    try {
      const response = await postAiRisk(request("/api/ai/risk"));
      expect(response.status).toBe(200);

      const payload = await response.json();
      expect(payload.data.meta.model).toBe(DEFAULT_OPENROUTER_MODEL);
      expect(payload.data.meta.usage).toEqual({
        inputTokens: 120,
        outputTokens: 40,
        totalTokens: 160,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];

      expect(url).toBe(OPENROUTER_API_URL);

      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.model).toBe(DEFAULT_OPENROUTER_MODEL);
      expect(body.messages).toEqual(
        expect.arrayContaining([expect.objectContaining({ role: "user" })]),
      );
      expect(body.response_format.type).toBe("json_schema");
      expect(body.response_format.json_schema.name).toBe("risk_explainer");
      expect(body.provider).toEqual({ require_parameters: true, data_collection: "allow" });
      // Chat completions has no Responses-API equivalents.
      expect(body.input).toBeUndefined();
      expect(body.text).toBeUndefined();
      expect(body.store).toBeUndefined();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
