const INVESTMENT_ADVICE_PATTERNS = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\bguaranteed\b/i,
  /\bguarantee\b/i,
  /\bshould\b/i,
  /\bmust\b/i,
  /\brecommend(?:s|ed|ing)?\b/i,
  /\bbest time to\b/i,
  /\bcall to action\b/i,
];

export type AiSafetyCheckResult = {
  flagged: boolean;
  matchedTerms: string[];
  disclaimer: string | null;
};

export function checkAiAdviceLanguage(text: string): AiSafetyCheckResult {
  const matchedTerms = INVESTMENT_ADVICE_PATTERNS.flatMap((pattern) => {
    const match = pattern.exec(text);
    return match ? [match[0].toLowerCase()] : [];
  });

  if (matchedTerms.length === 0) {
    return {
      flagged: false,
      matchedTerms: [],
      disclaimer: null,
    };
  }

  return {
    flagged: true,
    matchedTerms: [...new Set(matchedTerms)],
    disclaimer:
      "This response was replaced because it used investment-advice language. Review the simulation metrics and allocation context instead.",
  };
}

export function buildNeutralAiWarningMarkdown(): string {
  return [
    "### Safety Notice",
    "- This response was replaced because it used investment-advice language.",
    "- Review the simulation metrics and allocation context instead.",
  ].join("\n");
}

export function buildNeutralDebateResponse(): string {
  return [
    "Opening Statement",
    "- This response was replaced because it used investment-advice language.",
    "",
    "Counter Arguments",
    "- Review the simulation metrics and allocation context instead.",
    "",
    "Final Recommendation",
    "- Use the simulation output as analytical context, not trading advice.",
  ].join("\n");
}

export const AI_DISCLOSURE_TEXT =
  "AI output is informational only and does not constitute investment advice.";
