export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitBucket = {
  hits: number[];
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((timestamp) => timestamp > windowStart);

  if (bucket.hits.length >= options.max) {
    const oldest = bucket.hits[0];
    const retryAfterMs = oldest ? Math.max(0, options.windowMs - (now - oldest)) : null;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: Math.max(0, options.max - bucket.hits.length),
    retryAfterMs: null,
  };
}
