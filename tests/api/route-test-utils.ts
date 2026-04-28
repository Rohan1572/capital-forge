const DEFAULT_BASE_URL = "https://capital-forge.test";

export function createJsonRequest(
  path: string,
  method: string,
  body?: unknown,
  headers: HeadersInit = {},
) {
  return new Request(new URL(path, DEFAULT_BASE_URL), {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function sameOriginHeaders(headers: HeadersInit = {}) {
  return {
    origin: DEFAULT_BASE_URL,
    ...headers,
  };
}

export function getBaseUrl() {
  return DEFAULT_BASE_URL;
}
