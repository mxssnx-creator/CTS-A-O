/**
 * Symbol-major assembly order for pooled config history. Exact timestamp ties retain this order in
 * makeTape, so replay and runtime must traverse the same symbol universe before its long/short cases.
 * Keep each symbol's direction order as supplied (splitSides supplies long before short).
 */
export function symbolDirections<S, D>(
  symbols: readonly S[],
  directionsOf: (symbol: S) => readonly D[],
): Array<{ symbol: S; direction: D }> {
  const out: Array<{ symbol: S; direction: D }> = [];
  for (const symbol of symbols)
    for (const direction of directionsOf(symbol)) out.push({ symbol, direction });
  return out;
}
