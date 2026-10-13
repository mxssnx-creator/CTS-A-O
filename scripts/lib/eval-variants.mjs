// Per-variant scores of an eval: a variant is one trade range × trail distance × hold time (the config id's own tokens),
// scored by its MINIMUM profit factor over the windows (operator, 13 Oct: "eval by min PF"). A window the variant
// trades in with PF below the floor, or does not trade in at all, counts as 0 — so it cannot pass on the others.
// Pure: the eval runner passes each window's trades; nothing here reads the engine.

const RANGE_TAGS = { mc: "Micro", mn: "Minimal", mp: "Minimal plus", sh: "Short", gn: "General", lg: "Long" };

/** range, trail distance (fraction of price), hold (hours) of a config id ("bot|ind@tf|tpX|slY|trZ|hN[|tag]") */
export function variantOf(cfg, baseTfMin = 15) {
  const parts = String(cfg).split("|");
  const tr = parts.find((p) => /^tr[0-9.]+$/.test(p));
  const h = parts.find((p) => /^h[0-9]+$/.test(p));
  const tag = parts.length > 0 && RANGE_TAGS[parts[parts.length - 1]] ? parts[parts.length - 1] : null;
  const lane = /@m(\d+)/.exec(parts[1] ?? "");
  const tf = lane ? Number(lane[1]) : baseTfMin;
  const hold = h ? Number(h.slice(1)) : NaN;
  // a signal config (its indication is a signal: "sig-…") is its own range, whatever lane it runs on
  const signal = /^sig-/.test((parts[1] ?? "").split("@")[0]);
  return {
    range: signal ? "Signals" : tag ? RANGE_TAGS[tag] : "Wide",
    // a signal's own variants: its pair (bot|sig-…), so no two signals are pooled (historic configs stay independent)
    pair: signal ? `${parts[0]}|${parts[1].split("@")[0]}` : "",
    trail: tr ? Number(tr.slice(2)) / 100 : NaN,
    hold: Number.isFinite(hold) ? (hold * tf) / 60 : NaN,
  };
}

/** profit factor of net returns: no loss → 9, no gain → 0 (as the eval's own pf) */
export function pfOf(rs) {
  let gp = 0;
  let gl = 0;
  for (const v of rs) (v > 0 ? (gp += v) : (gl -= v));
  return gl < 1e-12 ? (gp > 0 ? 9 : 0) : gp / gl;
}

/**
 * windows: [{ name, trades: [{ cfg, r }] }] — every window's trades (closed and marked-open ones of the window).
 * Signals are scored per pair (their own historic configs, never pooled). Returns the variants sorted by their minimum PF
 * (descending): { range, pair, trail, hold, minPf, pass, perWindow: [{ name,
 * n, pf }], n }. `floor` is the PF a variant must clear in every window to pass (default 1.2).
 */
export function variantScores(windows, { floor = 1.2, baseTfMin = 15 } = {}) {
  const by = new Map();
  for (const w of windows) {
    const groups = new Map();
    for (const t of w.trades) {
      const v = variantOf(t.cfg, baseTfMin);
      const key = `${v.range}|${v.pair}|${v.trail}|${v.hold}`;
      if (!groups.has(key)) groups.set(key, { v, rs: [] });
      groups.get(key).rs.push(t.r);
    }
    for (const [key, g] of groups) {
      if (!by.has(key)) by.set(key, { ...g.v, perWindow: [], n: 0 });
      const e = by.get(key);
      e.perWindow.push({ name: w.name, n: g.rs.length, pf: pfOf(g.rs) });
      e.n += g.rs.length;
    }
  }
  const out = [];
  for (const e of by.values()) {
    // a window the variant did not trade in counts as 0 (it cannot pass on the windows it traded)
    const seen = new Set(e.perWindow.map((p) => p.name));
    for (const w of windows) if (!seen.has(w.name)) e.perWindow.push({ name: w.name, n: 0, pf: 0 });
    const minPf = Math.min(...e.perWindow.map((p) => p.pf));
    out.push({ range: e.range, pair: e.pair, trail: e.trail, hold: e.hold, minPf, pass: minPf >= floor, perWindow: e.perWindow, n: e.n });
  }
  return out.sort(
    (a, b) => b.minPf - a.minPf || a.range.localeCompare(b.range) || a.pair.localeCompare(b.pair) || a.trail - b.trail || a.hold - b.hold,
  );
}
