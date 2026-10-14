// The replayed feed of a session (scripts/core-session.mjs --feed): the engine reads its own timeframe through it
// (tfMin: history and klines; it resamples the lanes itself) and the 1-hour bars of the universe ranking
// (rankUniverse "volatility1h", the default symbolRank: the last closed 1 h bars of every pool symbol), never a bar
// after the cut. The rest of a feed (other timeframes, the bars after the cut) is left out before the session starts:
// the 120-symbol feed held all of it for the whole session (0.1–0.3 GB of heap through the compute peak).

/** the timeframe the universe ranking reads (minutes) */
export const RANK_TF = 60;

/** the first index whose bar opens at or after t (bars sorted by open time) */
export function lowerBound(cs, t) {
  let lo = 0;
  let hi = cs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cs[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Keeps, of every "SYM|tf" key in `candles`, the timeframes in `keepTfs` and of those the bars that closed by the cut
 * (t + tf ≤ cutT: the bound the replay's reads apply); the other keys are deleted. Mutates `candles`; returns the
 * number of bars left out.
 */
export function pruneFeed(candles, cutT, keepTfs) {
  const keep = new Set(keepTfs);
  let dropped = 0;
  for (const key of Object.keys(candles)) {
    const tf = Number(key.split("|")[1]);
    const cs = candles[key];
    if (!keep.has(tf)) {
      dropped += cs.length;
      delete candles[key];
      continue;
    }
    const to = lowerBound(cs, cutT - tf * 60_000 + 1);
    if (to < cs.length) {
      dropped += cs.length - to;
      candles[key] = cs.slice(0, to);
    }
  }
  return dropped;
}

/**
 * The feed's bars of one key as columns (memory, 14 Oct: the runtime holds its candles as columns, so a store of objects
 * beside them would hold every bar twice). Called after pruneFeed in a replay; the recorded format is unchanged (a
 * series writes itself as its bars).
 */
export async function columnarStore(candles) {
  const { CandleSeries } = await import("../../src/core/market/candle-series.ts");
  for (const key of Object.keys(candles)) if (Array.isArray(candles[key])) candles[key] = CandleSeries.fromCandles(candles[key]);
  return candles;
}

/**
 * The replay's read of one key (bars with t in [startT, endT] and t + tf ≤ nowT, the last `limit`), on an array or a
 * series, with Array.prototype.slice's exact semantics (a NaN limit: everything; a fractional one truncates; 0 or less:
 * nothing).
 */
export function readStored(all, tf, { startT = 0, endT = Infinity, nowT = Infinity, limit = Infinity } = {}) {
  if (!all) return [];
  if (Array.isArray(all)) {
    const from = lowerBound(all, startT);
    const to = lowerBound(all, Math.min(endT, nowT - tf * 60_000) + 1);
    const cs = to > from ? all.slice(from, to) : [];
    return cs.slice(Math.max(0, cs.length - limit));
  }
  const from = all.lowerBound(startT);
  const to = all.lowerBound(Math.min(endT, nowT - tf * 60_000) + 1);
  const len = to > from ? to - from : 0;
  let st = Math.max(0, len - limit);
  st = Number.isNaN(st) ? 0 : Math.min(len, Math.trunc(st));
  return all.toCandles(from + st, from + len);
}
