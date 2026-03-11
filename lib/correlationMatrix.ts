import { assetReturnAssumptions, type AssetKey } from "@/lib/assetAssumptions";

export type CorrelationMatrix = Record<AssetKey, Record<AssetKey, number>>;

const assetKeys = Object.keys(assetReturnAssumptions) as AssetKey[];

function baseRow(values: Partial<Record<AssetKey, number>>): Record<AssetKey, number> {
  return assetKeys.reduce<Record<AssetKey, number>>(
    (row, key) => {
      row[key] = values[key] ?? 0;
      return row;
    },
    {} as Record<AssetKey, number>,
  );
}

export function clampCorrelation(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export const baseCorrelationMatrix: CorrelationMatrix = {
  equity: baseRow({
    equity: 1,
    startups: 0.6,
    bonds: -0.2,
    gold: -0.1,
    crypto: 0.3,
    cash: 0,
  }),
  startups: baseRow({
    equity: 0.6,
    startups: 1,
    bonds: -0.3,
    gold: -0.1,
    crypto: 0.35,
    cash: 0,
  }),
  bonds: baseRow({
    equity: -0.2,
    startups: -0.3,
    bonds: 1,
    gold: 0.1,
    crypto: -0.2,
    cash: 0.1,
  }),
  gold: baseRow({
    equity: -0.1,
    startups: -0.1,
    bonds: 0.1,
    gold: 1,
    crypto: 0.05,
    cash: 0,
  }),
  crypto: baseRow({
    equity: 0.3,
    startups: 0.35,
    bonds: -0.2,
    gold: 0.05,
    crypto: 1,
    cash: 0,
  }),
  cash: baseRow({
    equity: 0,
    startups: 0,
    bonds: 0.1,
    gold: 0,
    crypto: 0,
    cash: 1,
  }),
};
