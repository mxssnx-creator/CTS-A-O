// The runtime's candles as the scripts read them (memory, 14 Oct: rt.candles holds a CandleSeries per symbol —
// src/core/market/candle-series.ts, columns, no length or index access). Each helper takes either shape: a Candle[]
// runs the code the scripts had inline, a series the same loops on its columns.

/** the last close (undefined without bars) */
export function lastCloseOf(cs) {
  if (!cs) return undefined;
  if (Array.isArray(cs)) return cs.at(-1)?.c;
  return cs.n ? cs.c[cs.n - 1] : undefined;
}

/** the close of the bar opening exactly at t, the latest of equal times (binary search; undefined when none) */
export function closeAtExact(cs, t) {
  const arr = Array.isArray(cs);
  const n = arr ? cs.length : cs.n;
  const tAt = arr ? (i) => cs[i].t : (i) => cs.t[i];
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (tAt(mid) <= t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && tAt(lo - 1) === t) return arr ? cs[lo - 1].c : cs.c[lo - 1];
  return undefined;
}

/** [t, close] of every bar with a ≤ t ≤ b, in order (a full scan, as the session's report has always read them) */
export function closesIn(cs, a, b) {
  const out = [];
  if (Array.isArray(cs)) {
    for (const c of cs) if (c.t >= a && c.t <= b) out.push([c.t, c.c]);
    return out;
  }
  for (let i = 0; i < cs.n; i++) if (cs.t[i] >= a && cs.t[i] <= b) out.push([cs.t[i], cs.c[i]]);
  return out;
}
