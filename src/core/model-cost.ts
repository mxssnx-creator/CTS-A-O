/** Default per-side assumptions. Actual measured venue fees remain authoritative. */
import { DEFAULT_FEE_POLICY } from "./fee-policy.ts";
export const DEFAULT_MODEL_FEES = Object.freeze({ taker: DEFAULT_FEE_POLICY.taker,
  maker: DEFAULT_FEE_POLICY.maker, slippage: 0, slippageRatio: DEFAULT_FEE_POLICY.slippageFeeRatio,
  mode: "auto" as const, entry: "taker" as const, exit: "taker" as const });

export interface ModelFees {
  taker: number; maker: number; slippage: number; slippageRatio?: number;
  mode?: "auto" | "manual";
  entry?: "maker" | "taker";
  exit?: "maker" | "taker";
  slippageMode?: "ratio" | "absolute";
}

/** Modeled entry + exit roles, plus either a fee-ratio allowance or absolute slippage per side. */
export function roundTripCostFromFees(fees: Pick<ModelFees, "taker" | "slippage"> & Partial<ModelFees>): number {
  const entry = fees.entry ?? "taker", exit = fees.exit ?? "taker";
  if (![entry, exit].every(x => x === "maker" || x === "taker")) throw new RangeError("Invalid fee role");
  const rates = [fees[entry], fees[exit]];
  if (!rates.every(x => typeof x === "number" && Number.isFinite(x) && x >= 0) ||
      (fees.slippageRatio !== undefined && (!Number.isFinite(fees.slippageRatio) || fees.slippageRatio < 0)) ||
      !Number.isFinite(fees.slippage) || fees.slippage < 0) throw new RangeError("Invalid fee model");
  const slip=(rate:number)=>fees.slippageMode === "absolute" || fees.slippageRatio === undefined ? fees.slippage : rate*fees.slippageRatio;
  // Preserve the established arithmetic for equal roles, including existing default/config fingerprints.
  return rates[0]===rates[1] ? 2*(rates[0]!+slip(rates[0]!)) :
    (rates[0]!+slip(rates[0]!))+(rates[1]!+slip(rates[1]!));
}

/** Default modeled round-trip cost, as a fraction of notional. */
export const RT_COST = roundTripCostFromFees(DEFAULT_MODEL_FEES);

/** Validation bound, never a silent discount of exchange costs. */
export const MAX_MODEL_RT_COST = 1;
export function boundedModelCost(requested: number): number {
  if (!Number.isFinite(requested) || requested < 0 || requested > MAX_MODEL_RT_COST)
    throw new RangeError("modeled cost must be finite and between 0 and 1");
  return requested;
}

/** Frozen reference basis used by historical range multipliers and the dated bot-stability benchmark. */
/** PositionCost baseline used by range multiples and PF screening: 0.2% round trip. */
export const POSITION_COST_RT = 0.002;
/** PositionCost stress threshold used by PF screening: 0.4% round trip. */
export const POSITION_COST_STRESS_RT = POSITION_COST_RT * 2;

/** Remove only floating-point cancellation noise at modeled net breakeven; preserve all material losses. */
export function modeledPriceReturn(side: number, entry: number, exit: number, cost: number): number {
  const gross = side * (exit - entry) / entry;
  const net = gross - cost;
  const epsilon = 4 * Number.EPSILON * Math.max(1, Math.abs(exit / entry));
  return cost > 0 && Number.isFinite(net) && Math.abs(net) <= epsilon ? 0 : net;
}
