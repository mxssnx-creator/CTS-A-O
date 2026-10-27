import assert from "node:assert/strict";

// Frozen catalog for the two compared studies. Matching the complete source key
// prevents overlapping names such as breakout and trend-breakout from merging.
export const RELATIONS = ["standalone", "trend", "breakout", "activity", "trend-breakout",
  "move-follow", "move-reverse", "trend-move-follow", "trend-move-reverse",
  "breakout-move-follow", "breakout-move-reverse", "trend-breakout-move-follow", "trend-breakout-move-reverse"];
const METHODS = ["edge-turn", "failed-break", "breakout", "mid-reclaim", "compression-break"];
const WINDOWS = [12, 24, 48];

export function relationCatalog(focus) {
  assert.ok(Array.isArray(focus));
  const wanted = new Map();
  for (const n of WINDOWS) for (const m of METHODS) for (const r of RELATIONS)
    wanted.set(`follow|low-range-${n}-${m}-${r}`, r);
  assert.equal(wanted.size, 195);
  assert.equal(focus.length, wanted.size);
  assert.equal(new Set(focus).size, focus.length, "duplicate source");
  for (const source of focus) assert.ok(wanted.has(source), `unexpected source ${source}`);
  return wanted;
}

export function relationOf(cfg, catalog, lane = 5) {
  assert.equal(typeof cfg, "string");
  const marker = `@m${lane}|`, at = cfg.indexOf(marker);
  assert.ok(at > 0 && cfg.indexOf(marker, at + marker.length) < 0, `wrong or missing lane: ${cfg}`);
  const r = catalog.get(cfg.slice(0, at));
  assert.ok(r, `unrecognized source: ${cfg}`);
  return r;
}

export const blankReturns = () => ({ settled: 0, wins: 0, losses: 0, flat: 0, gp: 0, gl: 0, cash: 0 });
export function recordReturn(out, tr) {
  assert.ok(tr.side === 1 || tr.side === -1, "invalid side");
  assert.ok(Number.isFinite(tr.allocatedNotional) && tr.allocatedNotional >= 0, "unknown allocation");
  if (tr.allocatedNotional === 0) return false;
  assert.ok(Number.isFinite(tr.unitR) && Number.isFinite(tr.sizedPnl), "unknown return or cash");
  out.settled++; out[tr.unitR > 0 ? "wins" : tr.unitR < 0 ? "losses" : "flat"]++;
  out.gp += Math.max(0, tr.unitR); out.gl += Math.max(0, -tr.unitR); out.cash += tr.sizedPnl;
  return true;
}
export function pf(gp, gl, n) {
  return !n ? null : gl > 0 ? gp / gl : gp > 0 ? "no-loss" : null;
}
export const finishReturns = (x) => ({ ...x, unitPf: pf(x.gp, x.gl, x.settled) });
export function assertNear(x, y) {
  assert.ok(Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-9 * Math.max(1, Math.abs(y)),
    `${x} != ${y}`);
}
