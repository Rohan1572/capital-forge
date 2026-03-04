export type ShockModifier = {
  meanShift: number;
  volatilityMultiplier: number;
};

export function applyShock(baseReturn: number, baseVolatility: number, shock: ShockModifier) {
  return {
    adjustedReturn: baseReturn + shock.meanShift,
    adjustedVolatility: baseVolatility * shock.volatilityMultiplier,
  };
}
