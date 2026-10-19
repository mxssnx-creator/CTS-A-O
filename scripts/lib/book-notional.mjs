// Numerical USD precision for the simulated report book; this is not exchange lot/minimum-order validation.
// Frozen before evaluating normalized book results. Apply uniformly, regardless of return or strategy.
export const BOOK_NOTIONAL_EPS_USD = 1e-9;
export function normalizedBookNotional(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return { raw: value, notional: null, roundoffZeroed: false };
  return { raw: value, notional: value <= BOOK_NOTIONAL_EPS_USD ? 0 : value,
    roundoffZeroed: value > 0 && value <= BOOK_NOTIONAL_EPS_USD };
}
