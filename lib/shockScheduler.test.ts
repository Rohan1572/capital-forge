import { describe, expect, it } from "vitest";
import { startOfWeekUTC } from "./shockScheduler";

describe("startOfWeekUTC", () => {
  it("normalizes a midweek date to Monday 00:00 UTC", () => {
    const value = startOfWeekUTC(new Date("2026-04-01T15:30:00Z"));

    expect(value.toISOString()).toBe("2026-03-30T00:00:00.000Z");
  });

  it("normalizes a Sunday date to the prior Monday 00:00 UTC", () => {
    const value = startOfWeekUTC(new Date("2026-04-05T02:00:00Z"));

    expect(value.toISOString()).toBe("2026-03-30T00:00:00.000Z");
  });
});
