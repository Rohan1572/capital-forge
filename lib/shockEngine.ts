import type { AssetKey, AssetReturnAssumptions } from "@/lib/assetAssumptions";
import { clampCorrelation, type CorrelationMatrix } from "@/lib/correlationMatrix";

export type CorrelationShiftMatrix = Partial<Record<AssetKey, Partial<Record<AssetKey, number>>>>;

export type ShockParameters = {
  id: string;
  title: string;
  description: string;
  meanShift: number;
  volatilityMultiplier: number;
  correlationShift: number;
  meanShiftByAsset?: Partial<Record<AssetKey, number>>;
  volatilityMultiplierByAsset?: Partial<Record<AssetKey, number>>;
  correlationShiftByAsset?: CorrelationShiftMatrix;
};

export function applyShockToAssumptions(
  baseAssumptions: AssetReturnAssumptions,
  shock: ShockParameters,
): AssetReturnAssumptions {
  const assetKeys = Object.keys(baseAssumptions) as AssetKey[];

  return assetKeys.reduce<AssetReturnAssumptions>((next, key) => {
    const base = baseAssumptions[key];
    const meanShift = shock.meanShift + (shock.meanShiftByAsset?.[key] ?? 0);
    const volatilityMultiplier =
      shock.volatilityMultiplier * (shock.volatilityMultiplierByAsset?.[key] ?? 1);

    next[key] = {
      mean: base.mean + meanShift,
      volatility: base.volatility * volatilityMultiplier,
    };

    return next;
  }, {} as AssetReturnAssumptions);
}

export function applyShockToCorrelation(
  baseCorrelation: CorrelationMatrix,
  shock: ShockParameters,
): CorrelationMatrix {
  const assetKeys = Object.keys(baseCorrelation) as AssetKey[];
  const updated: CorrelationMatrix = {} as CorrelationMatrix;

  assetKeys.forEach((rowKey) => {
    updated[rowKey] = {} as Record<AssetKey, number>;

    assetKeys.forEach((colKey) => {
      if (rowKey === colKey) {
        updated[rowKey][colKey] = 1;
        return;
      }

      const base = baseCorrelation[rowKey][colKey] ?? 0;
      const matrixShift = shock.correlationShiftByAsset?.[rowKey]?.[colKey] ?? 0;
      const shifted = base + shock.correlationShift + matrixShift;

      updated[rowKey][colKey] = clampCorrelation(shifted);
    });
  });

  return updated;
}
