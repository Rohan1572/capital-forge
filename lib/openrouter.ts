/**
 * OpenRouter access for the AI critique, debate, risk, and shock routes.
 *
 * Wraps the OpenRouter chat completions endpoint and normalises its response, so
 * the call sites deal only with prompt text and a `{ text, model, usage }`
 * result. OpenRouter reports usage as `prompt_tokens`/`completion_tokens` and
 * returns text at `choices[0].message.content`; both are mapped here onto the
 * shape the rest of the app already uses.
 *
 * The API key is validated here rather than in each route: a placeholder from
 * `.env.example` is non-empty, so a falsy check alone lets it reach OpenRouter,
 * come back as `401`, and be misread as an application bug.
 */

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Default model: free, supports strict `structured_outputs` (required by the
 * risk and shock routes), 262K context, and a 27B dense model sized for
 * analysis-quality reasoning rather than raw throughput.
 *
 * Note the free tier is capped at a small daily request budget, so this is a
 * development and low-traffic default. Swap `OPENROUTER_MODEL` for a paid slug
 * when the budget matters more than cost.
 */
export const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3.8-27b:free";

/** Where an operator obtains a key, referenced in configuration error messages. */
const KEY_HINT = "https://openrouter.ai/keys";

/**
 * Values that are clearly not real credentials, matched case-insensitively
 * against the trimmed key either exactly, as a prefix, or as a hyphen/dot
 * delimited segment (OpenRouter keys look like `sk-or-v1-...`, so a placeholder
 * can appear after the vendor prefix).
 */
const PLACEHOLDER_KEYS = new Set([
  "your-openrouter-api-key",
  "your-openrouter-key",
  "your-api-key",
  "your-key",
  "changeme",
  "change-me",
  "replace-me",
  "replaceme",
  "placeholder",
  "example",
  "todo",
  "none",
  "null",
  "undefined",
  "xxx",
]);

const PLACEHOLDER_SEGMENTS = new Set(["your", "your-api-key", "changeme", "placeholder", "todo"]);

const PLACEHOLDER_PREFIXES = ["your-", "your_", "sk-your", "sk-xxx", "sk-placeholder", "or-your"];

export type OpenRouterUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type OpenRouterConfig = {
  apiKey: string;
  model: string;
  /** Optional attribution headers, used by OpenRouter for its leaderboards. */
  siteUrl?: string;
  appTitle?: string;
  /** Routing policy: "deny" avoids providers that train on the prompt data. */
  dataCollection: "allow" | "deny";
};

export type OpenRouterConfigResult =
  | { ok: true; config: OpenRouterConfig }
  | { ok: false; error: string };

/**
 * Thrown when OpenRouter rejects a request. Carries the upstream status so an
 * API route can surface it instead of reporting an internal server error.
 */
export class OpenRouterUpstreamError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`OpenRouter request failed with status ${status}.`);
    this.name = "OpenRouterUpstreamError";
    this.status = status;
    this.detail = detail;
  }
}

export function isPlaceholderApiKey(apiKey: string): boolean {
  const normalized = apiKey.trim().toLowerCase();

  if (PLACEHOLDER_KEYS.has(normalized)) {
    return true;
  }

  if (PLACEHOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  // `sk-or-v1-your-key` and `sk-or-v1-your-api-key` keep the placeholder after
  // the vendor prefix, so the whole key will not match an exact or prefix rule.
  return normalized.split(/[-._]/).some((segment) => PLACEHOLDER_SEGMENTS.has(segment));
}

/**
 * Resolves the OpenRouter settings from the environment, reporting a
 * configuration error instead of calling OpenRouter with an unusable credential.
 */
export function resolveOpenRouterConfig(
  env: Record<string, string | undefined> = process.env,
): OpenRouterConfigResult {
  const apiKey = env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      error:
        "OPENROUTER_API_KEY is not configured. Add a real key to .env (see .env.example) and restart the dev server.",
    };
  }

  if (isPlaceholderApiKey(apiKey)) {
    return {
      ok: false,
      error: `OPENROUTER_API_KEY is still set to the placeholder value from .env.example. Replace it with a real key from ${KEY_HINT} and restart the dev server.`,
    };
  }

  const dataCollection = env.OPENROUTER_DATA_COLLECTION?.trim().toLowerCase();

  if (dataCollection && dataCollection !== "allow" && dataCollection !== "deny") {
    return {
      ok: false,
      error: `OPENROUTER_DATA_COLLECTION must be "allow" or "deny". Received "${env.OPENROUTER_DATA_COLLECTION?.trim() ?? ""}".`,
    };
  }

  return {
    ok: true,
    config: {
      apiKey,
      model: env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
      siteUrl: env.OPENROUTER_SITE_URL?.trim() || undefined,
      appTitle: env.OPENROUTER_APP_TITLE?.trim() || undefined,
      // Defaults to "allow": the free endpoints that back the default model do
      // not satisfy a "deny" data policy, so "deny" would leave no route.
      dataCollection: dataCollection === "deny" ? "deny" : "allow",
    },
  };
}

export type OpenRouterJsonSchema = {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
};

export type OpenRouterRequest = {
  config: OpenRouterConfig;
  /** Operator-facing label used in server logs, e.g. "risk explainer". */
  label: string;
  prompt: string;
  instructions?: string;
  jsonSchema?: OpenRouterJsonSchema;
};

export type OpenRouterResult = {
  text: string;
  model: string;
  usage: OpenRouterUsage;
  latencyMs: number;
};

function buildHeaders(config: OpenRouterConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.siteUrl) {
    headers["HTTP-Referer"] = config.siteUrl;
  }

  if (config.appTitle) {
    headers["X-OpenRouter-Title"] = config.appTitle;
  }

  return headers;
}

function buildBody(request: OpenRouterRequest): Record<string, unknown> {
  const { config, prompt, instructions, jsonSchema } = request;

  return {
    model: config.model,
    messages: [
      ...(instructions ? [{ role: "system", content: instructions }] : []),
      { role: "user", content: prompt },
    ],
    ...(jsonSchema
      ? {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: jsonSchema.name,
              ...(jsonSchema.description ? { description: jsonSchema.description } : {}),
              strict: true,
              schema: jsonSchema.schema,
            },
          },
          // Without require_parameters OpenRouter may route to a provider that
          // silently ignores `response_format`, making structured output a guess.
          provider: {
            require_parameters: true,
            data_collection: config.dataCollection,
          },
        }
      : {}),
  };
}

type OpenRouterPayload = {
  model?: string;
  error?: { message?: string };
  choices?: Array<{ message?: { content?: string | null }; error?: { message?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

/**
 * Calls OpenRouter and returns the output text with normalised usage. Throws
 * {@link OpenRouterUpstreamError} for provider-side failures so callers can map
 * the status themselves.
 */
export async function callOpenRouter(request: OpenRouterRequest): Promise<OpenRouterResult> {
  const { config, label } = request;
  const startTime = Date.now();

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify(buildBody(request)),
  });
  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const detail = await response.text();
    console.error(`OpenRouter ${label} request failed`, response.status, detail);
    throw new OpenRouterUpstreamError(response.status, detail);
  }

  const payload = (await response.json()) as OpenRouterPayload;

  // OpenRouter can report a provider-level failure inside a 200 response.
  const inlineError = payload.error?.message ?? payload.choices?.[0]?.error?.message;
  if (inlineError) {
    console.error(`OpenRouter ${label} returned an error`, inlineError);
    throw new OpenRouterUpstreamError(502, inlineError);
  }

  const text = payload.choices?.[0]?.message?.content;

  if (!text) {
    throw new TypeError(`OpenRouter ${label} response missing output text.`);
  }

  return {
    text,
    model: payload.model ?? config.model,
    usage: {
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
      totalTokens: payload.usage?.total_tokens,
    },
    latencyMs,
  };
}

export type OpenRouterFailureResponse = {
  status: number;
  error: string;
};

/**
 * Maps an OpenRouter HTTP status onto the status and message the client should
 * see. A rejected key is a server configuration problem (503), not a broken
 * route (500), and a provider rate limit (429) should stay retryable.
 */
export function describeOpenRouterError(status: number): OpenRouterFailureResponse {
  if (status === 401 || status === 403) {
    return {
      status: 503,
      error:
        "OpenRouter rejected the configured API key. Verify OPENROUTER_API_KEY in .env and restart the dev server.",
    };
  }

  if (status === 429) {
    return {
      status: 429,
      error: "OpenRouter is rate limiting requests. Please wait and try again.",
    };
  }

  return {
    status: 502,
    error: "OpenRouter returned an error. Please try again.",
  };
}
