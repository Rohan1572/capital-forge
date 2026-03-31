import { describe, expect, it } from "vitest";
import {
  buildNeutralAiWarningMarkdown,
  buildNeutralDebateResponse,
  checkAiAdviceLanguage,
} from "./aiSafety";

describe("checkAiAdviceLanguage", () => {
  it("flags advice-like language", () => {
    const result = checkAiAdviceLanguage("You should buy now because returns are guaranteed.");

    expect(result.flagged).toBe(true);
    expect(result.matchedTerms).toEqual(expect.arrayContaining(["should", "buy", "guaranteed"]));
    expect(result.disclaimer).toContain("replaced");
  });

  it("allows neutral analytical language", () => {
    const result = checkAiAdviceLanguage("This analysis discusses risk, volatility, and drawdown.");

    expect(result.flagged).toBe(false);
    expect(result.matchedTerms).toEqual([]);
    expect(result.disclaimer).toBeNull();
  });
});

describe("neutral replacements", () => {
  it("builds a neutral warning markdown block", () => {
    expect(buildNeutralAiWarningMarkdown()).toContain("Safety Notice");
  });

  it("builds a neutral debate response", () => {
    expect(buildNeutralDebateResponse()).toContain("Opening Statement");
    expect(buildNeutralDebateResponse()).toContain("Final Recommendation");
  });

  it("renders the neutral warning and debate replacements as stable snapshots", () => {
    expect(buildNeutralAiWarningMarkdown()).toMatchInlineSnapshot(`
      "### Safety Notice
      - This response was replaced because it used investment-advice language.
      - Review the simulation metrics and allocation context instead."
    `);

    expect(buildNeutralDebateResponse()).toMatchInlineSnapshot(`
      "Opening Statement
      - This response was replaced because it used investment-advice language.

      Counter Arguments
      - Review the simulation metrics and allocation context instead.

      Final Recommendation
      - Use the simulation output as analytical context, not trading advice."
    `);
  });
});
