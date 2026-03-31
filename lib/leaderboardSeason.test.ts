import { describe, expect, it } from "vitest";
import { buildLeaderboardMonthRange, getCurrentUtcMonthLabel } from "./leaderboardSeason";

describe("leaderboardSeason", () => {
  it("formats the current month label in UTC", () => {
    const label = getCurrentUtcMonthLabel(new Date(Date.UTC(2026, 3, 1)));
    expect(label).toBe("2026-04");
  });

  it("prefers a valid query month over the fallback month", () => {
    const range = buildLeaderboardMonthRange("2026-03", "2026-04");
    expect(range.label).toBe("2026-03");
    expect(range.start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("falls back to the active season month when the query month is missing", () => {
    const range = buildLeaderboardMonthRange(null, "2026-04");
    expect(range.label).toBe("2026-04");
  });
});
