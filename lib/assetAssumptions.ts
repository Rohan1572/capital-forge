export type AssetKey = "equity" | "startups" | "bonds" | "gold" | "crypto" | "cash";

export type AssetReturnAssumption = {
  mean: number;
  volatility: number;
};

export type AssetReturnAssumptions = Record<AssetKey, AssetReturnAssumption>;

export type CrashRegime = {
  probability: number;
  volatilityMultiplier: number;
  shocks: Partial<Record<AssetKey, number>>;
};

export type SimulationRegimes = {
  crash: CrashRegime;
};

export const assetReturnAssumptions: AssetReturnAssumptions = {
  equity: { mean: 0.11, volatility: 0.18 },
  startups: { mean: 0.22, volatility: 0.45 },
  bonds: { mean: 0.06, volatility: 0.07 },
  gold: { mean: 0.05, volatility: 0.16 },
  crypto: { mean: 0.2, volatility: 0.65 },
  cash: { mean: 0.04, volatility: 0.01 },
};

export const simulationRegimes: SimulationRegimes = {
  crash: {
    probability: 0.04,
    volatilityMultiplier: 1.6,
    shocks: {
      equity: -0.25,
      startups: -0.45,
      crypto: -0.6,
    },
  },
};
