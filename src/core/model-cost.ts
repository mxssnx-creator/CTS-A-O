/** Default per-side assumptions. Actual measured venue fees remain authoritative. */
export const DEFAULT_MODEL_FEES = Object.freeze({ taker: 0.0005, maker: 0.0002, slippage: 0.00025 });

/** The system's modeled round-trip cost: two taker fees plus two slippage allowances. */
export function roundTripCostFromFees(fees: { taker: number; slippage: number }): number {
  return 2 * (fees.taker + fees.slippage);
}

/** Default modeled round-trip cost, as a fraction of notional. */
export const RT_COST = roundTripCostFromFees(DEFAULT_MODEL_FEES);

/** Frozen reference basis used by historical range multipliers and the dated bot-stability benchmark. */
/** PositionCost baseline used by range multiples and PF screening: 0.2% round trip. */
export const POSITION_COST_RT = 0.002;
/** PositionCost stress threshold used by PF screening: 0.4% round trip. */
export const POSITION_COST_STRESS_RT = POSITION_COST_RT * 2;
