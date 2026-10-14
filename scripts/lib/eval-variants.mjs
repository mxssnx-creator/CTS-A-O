// Per-variant scores of an eval (operator, 13 Oct: "eval by min PF"). A variant is one trade range × trail distance ×
// hold time × ATR protect, read from the config id's own tokens; a signal's variants are its own pair (its lanes apart,
// never pooled). Score = the MINIMUM profit factor over the windows.
//
// A window the variant trades in with PF below the floor counts as its PF; a window it does not trade in counts as 0 (it
// cannot pass on the others). A window the run did not compute for that range (memory fallback: Micro, or Micro and
// Minimal, left out; a short warm-up) is "unscored", never 0: the variant is then not a pass or a fail for that window.
//
// Trail distance: the id's tr token is the activation distance (configId encodes tr, not trailStep or trailFree; see
// docs/positive-coordinations.md). An ATR protect keeps its atr token in the variant key, so ATR variants never merge
// with each other or with pct variants that share the nominal tr value.
//
// Pure: the eval runner passes each window's trades; nothing here reads the engine.

const RANGE_TAGS = Object.freeze({ mc: "Micro", mn: "Minimal", mp: "Minimal plus", sh: "Short", gn: "General", lg: "Long" });

/**
 * range, trail distance (fraction of price), hold (hours), atr protect ("" or the atr token), pair (signals only), of a
 * config id ("bot|ind@tf|tpX|slY|trZ|hN[|range][|kind…]"). The range tag may sit before a DCA / Axis suffix.
 */
export function variantOf(cfg, baseTfMin = 15) {
  const parts = String(cfg).split("|");
  const tr = parts.find((p) => /^tr[0-9.]+$/.test(p));
  const h = parts.find((p) => /^h[0-9]+$/.test(p));
  const tagTok = parts.slice(2).find((p) => Object.hasOwn(RANGE_TAGS, p));
  const lane = /@m(\d+)/.exec(parts[1] ?? "");
  const tf = lane ? Number(lane[1]) : baseTfMin;
  const hold = h ? Number(h.slice(1)) : NaN;
  const atrTok = parts.slice(2).find((p) => /^atr/.test(p)) ?? "";
  // a signal config (its indication is a signal: "sig-…") is its own range, whatever lane it runs on
  const signal = /^sig-/.test((parts[1] ?? "").split("@")[0]);
  return {
    range: signal ? "Signals" : tagTok ? RANGE_TAGS[tagTok] : "Wide",
    // a signal's own variants: its pair with its lane, so two lanes of one signal are two variants
    pair: signal ? `${parts[0]}|${parts[1]}` : "",
    // (rounded: the id's percent divided by 100 carries float noise, 0.011200000000000002, which would split one variant)
    trail: tr ? +(Number(tr.slice(2)) / 100).toFixed(6) : NaN,
    hold: Number.isFinite(hold) ? (hold * tf) / 60 : NaN,
    atr: atrTok,
  };
}

/** profit factor of net returns: no loss → 9, no gain → 0 (as the eval's own pf) */
export function pfOf(rs) {
  let gp = 0;
  let gl = 0;
  for (const v of rs) {
    if (v > 0) gp += v;
    else gl -= v;
  }
  return gl < 1e-12 ? (gp > 0 ? 9 : 0) : gp / gl;
}

/**
 * windows: [{ name, trades: [{ cfg, r }], uncomputed?: [range names the run did not compute in this window] }].
 * Options: floor (PF every window must clear, default 1.2), minN (trades a window needs before its PF counts; default 0 =
 * no guard, an operator choice), baseTfMin.
 * Returns the variants sorted by minimum PF (descending): { range, pair, trail, hold, atr, status, minPf, pass,
 * perWindow: [{ name, n, pf, status }], n }. status: "pass" | "fail" | "unscored" (a window not computed for the range).
 */
export function variantScores(windows, { floor = 1.2, minN = 0, baseTfMin = 15 } = {}) {
  const by = new Map();
  for (const w of windows) {
    const groups = new Map();
    for (const t of w.trades) {
      const v = variantOf(t.cfg, baseTfMin);
      const key = `${v.range}|${v.pair}|${v.trail}|${v.hold}|${v.atr}`;
      if (!groups.has(key)) groups.set(key, { v, rs: [] });
      groups.get(key).rs.push(t.r);
    }
    for (const [key, g] of groups) {
      if (!by.has(key)) by.set(key, { ...g.v, windows: new Map(), n: 0 });
      const e = by.get(key);
      e.windows.set(w.name, { n: g.rs.length, pf: pfOf(g.rs) });
      e.n += g.rs.length;
    }
  }
  const out = [];
  for (const e of by.values()) {
    const per = windows.map((w) => {
      // not computed for this range in this window: unscored, whatever the trades say
      if ((w.uncomputed ?? []).includes(e.range)) return { name: w.name, n: 0, pf: null, status: "unscored" };
      const x = e.windows.get(w.name) ?? { n: 0, pf: 0 };
      // a window the variant did not trade in counts as 0; a thin window (fewer trades than minN) does not pass
      const thin = minN > 0 && x.n < minN;
      return { name: w.name, n: x.n, pf: x.pf, status: thin ? "fail" : x.pf >= floor ? "pass" : "fail" };
    });
    const scored = per.filter((p) => p.status !== "unscored");
    const minPf = scored.length ? Math.min(...scored.map((p) => p.pf)) : NaN;
    const unscored = per.some((p) => p.status === "unscored");
    const pass = !unscored && scored.length > 0 && per.every((p) => p.status === "pass");
    out.push({
      range: e.range,
      pair: e.pair,
      trail: e.trail,
      hold: e.hold,
      atr: e.atr,
      status: pass ? "pass" : unscored ? "unscored" : "fail",
      minPf,
      pass,
      perWindow: per,
      n: e.n,
    });
  }
  return out.sort(
    (a, b) =>
      (Number.isFinite(b.minPf) ? b.minPf : -1) - (Number.isFinite(a.minPf) ? a.minPf : -1) ||
      a.range.localeCompare(b.range) ||
      a.pair.localeCompare(b.pair) ||
      a.trail - b.trail ||
      a.hold - b.hold ||
      a.atr.localeCompare(b.atr),
  );
}
