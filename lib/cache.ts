import type { SimulationMetrics } from "@/lib/metrics";

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheOptions = {
  ttlMs?: number;
  maxSize?: number;
};

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttlMs: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
    this.maxSize = options.maxSize ?? 100;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export function buildSimulationCacheKey(allocation: Record<string, number>): string {
  const orderedKeys = Object.keys(allocation).sort();
  return orderedKeys.map((key) => `${key}:${allocation[key]}`).join("|");
}

export function buildRiskCacheKey(
  allocation: Record<string, number>,
  metrics: SimulationMetrics,
): string {
  return [
    buildSimulationCacheKey(allocation),
    `exp:${metrics.expectedReturn}`,
    `std:${metrics.standardDeviation}`,
    `sharpe:${metrics.sharpeRatio}`,
    `draw:${metrics.maxDrawdown}`,
    `var:${metrics.valueAtRisk5}`,
    `loss30:${metrics.probabilityOfLossOver30}`,
  ].join("|");
}
