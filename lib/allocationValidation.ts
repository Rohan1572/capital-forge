import { assetReturnAssumptions, type AssetKey } from "./assetAssumptions";
import type { Allocation } from "./monteCarlo";

const ALLOCATION_KEYS = Object.keys(assetReturnAssumptions) as AssetKey[];
const ALLOCATION_TOTAL_TARGET = 100;
const ALLOCATION_TOTAL_TOLERANCE = 1e-6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type AllocationValidationResult =
  | {
      ok: true;
      allocation: Allocation;
    }
  | {
      ok: false;
      error: string;
    };

export function validateAllocation(allocation: unknown): AllocationValidationResult {
  if (!isRecord(allocation)) {
    return { ok: false, error: "allocation must be an object." };
  }

  const missingKeys = ALLOCATION_KEYS.filter((key) => !Object.hasOwn(allocation, key));
  if (missingKeys.length > 0) {
    return {
      ok: false,
      error: `allocation must include: ${missingKeys.join(", ")}.`,
    };
  }

  const extraKeys = Object.keys(allocation).filter(
    (key) => !ALLOCATION_KEYS.includes(key as AssetKey),
  );
  if (extraKeys.length > 0) {
    return {
      ok: false,
      error: `allocation contains unsupported asset keys: ${extraKeys.join(", ")}.`,
    };
  }

  const parsedAllocation = {} as Allocation;
  let total = 0;

  for (const key of ALLOCATION_KEYS) {
    const value = allocation[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { ok: false, error: `allocation ${key} must be a finite number.` };
    }

    if (value < 0 || value > ALLOCATION_TOTAL_TARGET) {
      return {
        ok: false,
        error: `allocation ${key} must be between 0 and 100.`,
      };
    }

    parsedAllocation[key] = value;
    total += value;
  }

  if (Math.abs(total - ALLOCATION_TOTAL_TARGET) > ALLOCATION_TOTAL_TOLERANCE) {
    return {
      ok: false,
      error: `allocation must total 100%. Current total is ${total.toFixed(2)}%.`,
    };
  }

  return { ok: true, allocation: parsedAllocation };
}
