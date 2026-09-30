import { describe, expect, it, vi, afterEach } from "vitest";
import {
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_API_URL,
  OpenRouterUpstreamError,
  callOpenRouter,
  describeOpenRouterError,
  describeRateLimit,
  isPlaceholderApiKey,
  resolveOpenRouterConfig,
  type OpenRouterConfig,
} from "./openrouter";

const config: OpenRouterConfig = {
  apiKey: "sk-or-v1-abc123",
  model: "qwen/qwen3.8-27b:free",
  dataCollection: "allow",
};

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function lastRequest(fetchSpy: ReturnType<typeof vi.spyOn>) {
  const [url, init] = fetchSpy.mock.calls.at(-1) as [string, RequestInit];
  return {
    url,
    body: JSON.parse(String(init.body)),
    headers: init.headers as Record<string, string>,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveOpenRouterConfig", () => {
  it("resolves the model and defaults", () => {
    const result = resolveOpenRouterConfig({ OPENROUTER_API_KEY: "sk-or-v1-abc123" });

    expect(result).toEqual({
      ok: true,
      config: {
        apiKey: "sk-or-v1-abc123",
        model: DEFAULT_OPENROUTER_MODEL,
        siteUrl: undefined,
        appTitle: undefined,
        dataCollection: "allow",
      },
    });
  });

  it("defaults to a model that supports structured outputs", () => {
    // The risk and shock routes send a strict JSON schema, so the default must
    // be a slug whose provider advertises `structured_outputs`.
    expect(DEFAULT_OPENROUTER_MODEL).toBe("qwen/qwen3.8-27b:free");
  });

  it("reads the model, attribution, and data policy settings", () => {
    const result = resolveOpenRouterConfig({
      OPENROUTER_API_KEY: " sk-or-v1-abc123 ",
      OPENROUTER_MODEL: "anthropic/claude-sonnet-4.6",
      OPENROUTER_SITE_URL: "https://capital-forge.test",
      OPENROUTER_APP_TITLE: "CapitalForge",
      OPENROUTER_DATA_COLLECTION: "allow",
    });

    expect(result).toEqual({
      ok: true,
      config: {
        apiKey: "sk-or-v1-abc123",
        model: "anthropic/claude-sonnet-4.6",
        siteUrl: "https://capital-forge.test",
        appTitle: "CapitalForge",
        dataCollection: "allow",
      },
    });
  });

  it("reports a configuration error when the key is missing", () => {
    const result = resolveOpenRouterConfig({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a configuration error");
    expect(result.error).toContain("OPENROUTER_API_KEY is not configured");
  });

  it("rejects a key that is only whitespace", () => {
    const result = resolveOpenRouterConfig({ OPENROUTER_API_KEY: "   " });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a configuration error");
    expect(result.error).toContain("not configured");
  });

  it("rejects the placeholder shipped in .env.example", () => {
    const result = resolveOpenRouterConfig({ OPENROUTER_API_KEY: "your-openrouter-api-key" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a configuration error");
    expect(result.error).toContain("placeholder");
    expect(result.error).toContain("https://openrouter.ai/keys");
  });

  it("rejects an invalid data collection policy", () => {
    const result = resolveOpenRouterConfig({
      OPENROUTER_API_KEY: "sk-or-v1-abc123",
      OPENROUTER_DATA_COLLECTION: "maybe",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a configuration error");
    expect(result.error).toContain("OPENROUTER_DATA_COLLECTION");
  });
});

describe("isPlaceholderApiKey", () => {
  it("flags known placeholders regardless of case and padding", () => {
    expect(isPlaceholderApiKey("Your-OpenRouter-API-Key")).toBe(true);
    expect(isPlaceholderApiKey("  sk-or-v1-your-key  ")).toBe(true);
    expect(isPlaceholderApiKey("changeme")).toBe(true);
  });

  it("accepts a realistic key", () => {
    expect(isPlaceholderApiKey("sk-or-v1-64b1234abc")).toBe(false);
  });
});

describe("callOpenRouter", () => {
  it("posts chat completions and normalises the response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      jsonResponse({
        model: "qwen/qwen3.8-27b:free",
        choices: [{ message: { role: "assistant", content: "Hello" } }],
        usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
      }),
    );

    try {
      const result = await callOpenRouter({
        config,
        label: "test",
        prompt: "hi",
        instructions: "be brief",
        jsonSchema: { name: "demo", schema: { type: "object" } },
      });

      const { url, body, headers } = lastRequest(fetchSpy);
      expect(url).toBe(OPENROUTER_API_URL);
      expect(headers.Authorization).toBe("Bearer sk-or-v1-abc123");
      expect(body.model).toBe("qwen/qwen3.8-27b:free");
      expect(body.messages).toEqual([
        { role: "system", content: "be brief" },
        { role: "user", content: "hi" },
      ]);
      expect(body.response_format).toEqual({
        type: "json_schema",
        json_schema: { name: "demo", strict: true, schema: { type: "object" } },
      });
      expect(body.provider).toEqual({ require_parameters: true, data_collection: "allow" });

      expect(result.text).toBe("Hello");
      expect(result.model).toBe("qwen/qwen3.8-27b:free");
      // prompt_tokens/completion_tokens map onto the shared usage shape.
      expect(result.usage).toEqual({ inputTokens: 11, outputTokens: 7, totalTokens: 18 });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("omits the system message and schema when there are no instructions", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ choices: [{ message: { content: "ok" } }] }));

    try {
      await callOpenRouter({ config, label: "test", prompt: "hi" });

      const { body } = lastRequest(fetchSpy);
      expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
      expect(body.response_format).toBeUndefined();
      expect(body.provider).toBeUndefined();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("sends the attribution headers when configured", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ choices: [{ message: { content: "ok" } }] }));

    try {
      await callOpenRouter({
        config: { ...config, siteUrl: "https://capital-forge.test", appTitle: "CapitalForge" },
        label: "test",
        prompt: "hi",
      });

      const { headers } = lastRequest(fetchSpy);
      expect(headers["HTTP-Referer"]).toBe("https://capital-forge.test");
      expect(headers["X-OpenRouter-Title"]).toBe("CapitalForge");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("treats a provider error inside a 200 response as an upstream failure", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ error: { message: "No endpoints" } }));

    try {
      await expect(callOpenRouter({ config, label: "test", prompt: "hi" })).rejects.toBeInstanceOf(
        OpenRouterUpstreamError,
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("throws when the response carries no message content", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ model: "qwen/qwen3.8-27b:free" }));

    try {
      await expect(callOpenRouter({ config, label: "test", prompt: "hi" })).rejects.toThrow(
        /missing output text/,
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("captures the provider rate-limit reset time on a 429", async () => {
    const resetAt = Date.now() + 4 * 60 * 60 * 1000;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response("rate limited", {
          status: 429,
          headers: { "x-ratelimit-reset": String(resetAt) },
        }),
    );

    try {
      await expect(callOpenRouter({ config, label: "test", prompt: "hi" })).rejects.toMatchObject({
        status: 429,
        retryAt: resetAt,
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("throws OpenRouterUpstreamError carrying the status", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("nope", { status: 401 }));

    try {
      await expect(callOpenRouter({ config, label: "test", prompt: "hi" })).rejects.toMatchObject({
        status: 401,
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe("describeRateLimit", () => {
  it("reports the real wait when the provider reports a reset time", () => {
    const retryAt = Date.now() + 4 * 60 * 60 * 1000;
    const result = describeRateLimit(retryAt, "AI insights");

    expect(result.retryAt).toBe(retryAt);
    expect(result.message).toMatch(/resets in about \d+ hours/);
  });

  it("reports minutes for a short throttle", () => {
    const result = describeRateLimit(Date.now() + 60_000, "AI insights");

    expect(result.message).toContain("minute");
    expect(result.message).not.toContain("hours");
  });

  it("says to try again when the provider gives no reset time", () => {
    const result = describeRateLimit(null, "AI insights");

    expect(result.retryAt).toBeNull();
    expect(result.message).toContain("try again shortly");
  });

  it("handles a reset time that has already passed", () => {
    const result = describeRateLimit(Date.now() - 1000, "AI insights");

    expect(result.message).toContain("available again now");
  });
});

describe("describeOpenRouterError", () => {
  it("treats a rejected key as a server configuration problem", () => {
    for (const status of [401, 403]) {
      const failure = describeOpenRouterError(status);
      expect(failure.status).toBe(503);
      expect(failure.error).toContain("OPENROUTER_API_KEY");
    }
  });

  it("keeps a provider rate limit retryable", () => {
    expect(describeOpenRouterError(429).status).toBe(429);
  });

  it("reports other provider failures as a bad gateway", () => {
    expect(describeOpenRouterError(500).status).toBe(502);
    expect(describeOpenRouterError(400).status).toBe(502);
  });
});
