import { describe, expect, it } from "vitest";
import { validateAllocation } from "./allocationValidation";

describe("validateAllocation", () => {
  it("accepts a complete allocation that totals 100", () => {
    const result = validateAllocation({
      equity: 30,
      startups: 20,
      bonds: 20,
      gold: 10,
      crypto: 10,
      cash: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.allocation.equity).toBe(30);
      expect(result.allocation.cash).toBe(10);
    }
  });

  it("rejects allocations that do not total 100", () => {
    const result = validateAllocation({
      equity: 30,
      startups: 20,
      bonds: 20,
      gold: 10,
      crypto: 10,
      cash: 5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("total 100%");
    }
  });

  it("rejects allocations with values outside the allowed range", () => {
    const result = validateAllocation({
      equity: 120,
      startups: -20,
      bonds: 0,
      gold: 0,
      crypto: 0,
      cash: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("between 0 and 100");
    }
  });

  it("rejects allocations with unsupported asset keys", () => {
    const result = validateAllocation({
      equity: 25,
      startups: 15,
      bonds: 25,
      gold: 15,
      crypto: 10,
      cash: 10,
      realEstate: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("unsupported asset keys");
    }
  });
});
