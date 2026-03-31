import { describe, expect, it } from "vitest";
import { estimateAiCostUsd } from "./aiCost";

describe("estimateAiCostUsd", () => {
  it("returns null when usage is missing", () => {
    expect(estimateAiCostUsd()).toBeNull();
  });

  it("estimates a cost from token usage", () => {
    expect(
      estimateAiCostUsd({
        inputTokens: 1_500,
        outputTokens: 500,
      }),
    ).toBe(0);
  });
});
