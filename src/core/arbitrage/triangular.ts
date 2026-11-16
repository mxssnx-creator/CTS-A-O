/**
 * Quote-only triangular research. This is deliberately not an order adapter: a positive
 * estimate is not a fill, and three sequential orders are not atomic. All three markets
 * must be on the same venue and have fresh, synchronized top-of-book data.
 */
export interface ArbitrageQuote {
  venue: string;
  symbol: string;
  base: string;
  quote: string;
  timestamp: number;
  bid: number;
  ask: number;
  /** Top-of-book quantities in base units. */
  bidSize: number;
  askSize: number;
  /** Taker fee charged once on acquired currency. */
  takerFee: number;
  quantityStep: number;
  minQuantity: number;
  minNotional: number;
}
export interface ArbitragePolicy {
  maxAgeMs: number;
  maxSkewMs: number;
  /** Adverse percentage applied to each individual leg's bid or ask. */
  slippage: number;
  /** Required net return over the initial amount, after all three fees and slippage. */
  minNetReturn: number;
}
export const DEFAULT_ARBITRAGE_POLICY: Readonly<ArbitragePolicy> = Object.freeze({
  maxAgeMs: 1000, maxSkewMs: 250, slippage: 0.0005, minNetReturn: 0.002,
});
export interface ArbitrageResearchSettings extends ArbitragePolicy {
  startAsset: string;
  startAmount: number;
}
/** Research defaults are cautious starting values, not estimates of future profits. */
export const DEFAULT_ARBITRAGE_RESEARCH: Readonly<ArbitrageResearchSettings> = Object.freeze({
  ...DEFAULT_ARBITRAGE_POLICY, startAsset: "USDT", startAmount: 100,
});
export interface ArbitrageLeg {
  symbol: string;
  from: string;
  to: string;
  side: "buy" | "sell";
  input: number;
  quantity: number;
  price: number;
  fee: number;
  output: number;
}
export interface ArbitragePlan {
  venue: string;
  startAsset: string;
  startAmount: number;
  endAmount: number;
  netReturn: number;
  legs: [ArbitrageLeg, ArbitrageLeg, ArbitrageLeg];
  /** This is a modeled quote estimate, not an execution result. */
  status: "quote-only";
}
type Edge = { market: ArbitrageQuote; from: string; to: string; side: "buy" | "sell" };
const pos = (x: number) => Number.isFinite(x) && x > 0;
const nonnegative = (x: number) => Number.isFinite(x) && x >= 0;
function validPolicy(p: ArbitragePolicy) {
  return nonnegative(p.maxAgeMs) && nonnegative(p.maxSkewMs) &&
    nonnegative(p.slippage) && p.slippage < 1 && nonnegative(p.minNetReturn);
}
function validQuote(q: ArbitrageQuote, now: number, p: ArbitragePolicy) {
  const text = (v: unknown): v is string => typeof v === "string" && v.trim() === v && v.length > 0 && !v.includes("\0");
  return text(q.venue) && text(q.symbol) && text(q.base) && text(q.quote) && q.base !== q.quote &&
    Number.isFinite(q.timestamp) && q.timestamp <= now && now - q.timestamp <= p.maxAgeMs &&
    pos(q.bid) && pos(q.ask) && q.bid <= q.ask && pos(q.bidSize) && pos(q.askSize) &&
    nonnegative(q.takerFee) && q.takerFee < 1 && pos(q.quantityStep) &&
    nonnegative(q.minQuantity) && nonnegative(q.minNotional);
}
function leg(edge: Edge, input: number, policy: ArbitragePolicy): ArbitrageLeg | null {
  const q = edge.market;
  const price = edge.side === "buy" ? q.ask * (1 + policy.slippage) : q.bid * (1 - policy.slippage);
  const available = edge.side === "buy" ? q.askSize : q.bidSize;
  const budget = edge.side === "buy" ? input / price : input;
  // Rounding down leaves dust outside the profit calculation. Check depth against the
  // actual submitted quantity, not the unrounded budget; never assume deeper liquidity.
  if (!pos(price) || !pos(budget)) return null;
  let quantity = Math.floor(budget / q.quantityStep) * q.quantityStep;
  if (quantity > budget) quantity = Math.max(0, quantity - q.quantityStep);
  if (quantity > available) return null;
  const notional = quantity * price;
  if (!pos(quantity) || quantity < q.minQuantity || notional < q.minNotional) return null;
  const acquired = edge.side === "buy" ? quantity : notional;
  const fee = acquired * q.takerFee;
  const output = acquired - fee;
  if (!pos(output)) return null;
  return { symbol: q.symbol, from: edge.from, to: edge.to, side: edge.side,
    input, quantity, price, fee, output };
}
/** Enumerate both directions of all distinct, same-venue 3-market currency cycles. */
export function findTriangularPlans(
  quotes: readonly ArbitrageQuote[], startAsset: string, startAmount: number, now: number,
  policy: ArbitragePolicy = DEFAULT_ARBITRAGE_POLICY,
): ArbitragePlan[] {
  if (!Array.isArray(quotes) || typeof startAsset !== "string" || !startAsset ||
      !pos(startAmount) || !Number.isFinite(now) || !policy || !validPolicy(policy)) return [];
  // Ambiguous symbols/pairs are excluded without poisoning unrelated venue packs.
  const valid = quotes.filter(q => q && typeof q === "object" && validQuote(q, now, policy));
  const symbols = new Map<string, number>(), pairs = new Map<string, number>();
  const symbolKey = (q: ArbitrageQuote) => `${q.venue}\0${q.symbol}`;
  const pairKey = (q: ArbitrageQuote) => `${q.venue}\0${[q.base, q.quote].sort().join("\0")}`;
  for (const q of valid) {
    const symbol = symbolKey(q), pair = pairKey(q);
    symbols.set(symbol, (symbols.get(symbol) ?? 0) + 1);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  const byVenue = new Map<string, Edge[]>();
  for (const market of valid) {
    if (symbols.get(symbolKey(market)) !== 1 || pairs.get(pairKey(market)) !== 1) continue;
    const edges = byVenue.get(market.venue) ?? [];
    edges.push({ market, from: market.base, to: market.quote, side: "sell" });
    edges.push({ market, from: market.quote, to: market.base, side: "buy" });
    byVenue.set(market.venue, edges);
  }
  const plans: ArbitragePlan[] = [];
  for (const [venue, edges] of byVenue) {
    const from = new Map<string, Edge[]>();
    for (const edge of edges) {
      const list = from.get(edge.from) ?? [];
      list.push(edge);
      from.set(edge.from, list);
    }
    // Ambiguous pairs were removed above, so there is at most one returning edge per asset.
    const returns = new Map(edges.filter(edge => edge.to === startAsset).map(edge => [edge.from, edge]));
    for (const a of from.get(startAsset) ?? []) for (const b of from.get(a.to) ?? []) {
      if (b.to === startAsset || b.to === a.to || b.market === a.market) continue;
      const c = returns.get(b.to);
      if (c && c.market !== a.market && c.market !== b.market) {
        const times = [a.market.timestamp, b.market.timestamp, c.market.timestamp];
        if (Math.max(...times) - Math.min(...times) > policy.maxSkewMs) continue;
        const x = leg(a, startAmount, policy);
        const y = x && leg(b, x.output, policy);
        const z = y && leg(c, y.output, policy);
        if (!x || !y || !z) continue;
        const netReturn = z.output / startAmount - 1;
        if (!Number.isFinite(netReturn) || netReturn < policy.minNetReturn) continue;
        plans.push({ venue, startAsset, startAmount, endAmount: z.output, netReturn,
          legs: [x, y, z], status: "quote-only" });
      }
    }
  }
  return plans.sort((a, b) => b.netReturn - a.netReturn ||
    a.legs.map(l => l.symbol).join("|").localeCompare(b.legs.map(l => l.symbol).join("|")));
}
