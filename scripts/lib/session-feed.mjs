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
