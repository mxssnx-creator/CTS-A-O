// The per-range verdict of an eval lever against its baseline (scripts/eval-range-verdict.mjs), on the outputs of
// scripts/eval-gate.mjs ({ summary, windows, trades }).
//
// - Rows are the ranges as summary.funnel names them: a config's range tag, "sig-" indications are Signals, untagged
//   configs are Wide. With a kind (--kind axis) a range's orders of that kind are a row of their own ("Wide · axis"),
//   the range's row keeps the others.
// - Sample size is counted in events (distinct symbol × side × entry time), not orders: one bar fires many configs.
// - PF counts the orders still open at a window's end (marked, reason "open-end"); pfClosed is the closed ones only.
// - The span is cut by entry time at its split: D1a (choose) before it, D1b (judge) from it on; each window apart.
// - The decision rule (the PF-search protocol, 14 Oct), per range r for a lever L against the baseline b0 on the same
//   windows:
//   1. valid: in D1a and in D1b, r has ≥ 30 events and ≥ 40 % of b0's events (no PF gain from trading almost nothing);
//   2. choose: PF_D1a(L) ≥ PF_D1a(b0) + 0.05;
//   3. judge: PF_D1b(L) ≥ PF_D1b(b0) + 0.03, PF higher in ≥ 3 windows, and no window down by more than 0.2 (both
//      counting only the windows where both runs have ≥ 10 events);
//   a lever that passes 1-3 is kept for r. With the forward window F: r keeps it only if PF_F(L) ≥ PF_F(b0) with ≥ 30
//   events. A range "works" at PF ≥ 1.2 on D1a, D1b and F, ≥ 300 D1 events, ≥ 100 F orders and PF ≥ 1 in every window
//   with ≥ 10 events.
// - --matched-mirror (an invertSeats lever): the baseline's engine orders count only where the lever traded their
//   mirror; its Signals orders always count (signals are not inverted).
// - A run is valid only with no memory-fallback window and no short warm-up window (Micro and Minimal are not computed
//   in a fallback window): an invalid run gives no verdict, it is rerun.
//
// Pure: the reader passes each output; nothing here reads a file.

import { rangeOfId } from "../../src/core/minimal-coord.ts";
import { pfOf } from "./eval-variants.mjs";

const NAME = { "": "Wide", mc: "Micro", mn: "Minimal", mp: "Minimal plus", sh: "Short", gn: "General", lg: "Long" };
/** the ranges in the order the verdict prints them */
export const RANGE_ORDER = Object.freeze(["Micro", "Minimal", "Minimal plus", "Short", "General", "Long", "Wide", "Signals"]);

/** The rule's thresholds (the protocol's values: fixed before the grid, never re-tuned after D1b is read). */
export const RULE = Object.freeze({
  minEvents: 30,
  minShare: 0.4,
  choose: 0.05,
  judge: 0.03,
  winEvents: 10,
  winsMin: 3,
  maxFall: 0.2,
  fwdEvents: 30,
  target: 1.2,
  targetEvents: 300,
  targetFwdOrders: 100,
  targetWinPf: 1,
});
// (PF comparisons at a tolerance: 1.0 + 0.05 must pass at 1.05)
const EPS = 1e-9;

/** an order's row: its range as summary.funnel names it (scripts/eval-gate.mjs) */
export function rangeOf(cfg) {
  return (cfg.split("|")[1] ?? "").startsWith("sig-") ? "Signals" : (NAME[rangeOfId(cfg)] ?? "Wide");
}

/** a config id's strategy kind (src/core/pipeline/pipeline.ts kindOfId, without loading the engine) */
export function kindOf(cfg) {
  const core = cfg.replace(/\|(?:mp|mc|mn|sh|gn|lg)(?=\||$)/g, "");
  if (core.endsWith("|axis")) return "axis";
  if (core.endsWith("|dcaA")) return "dca-active";
  if (core.endsWith("|dca")) return "dca";
  return /\|tr0\|/.test(core) ? "normal" : "trailing";
}
export const KINDS = Object.freeze(["normal", "trailing", "dca", "dca-active", "axis"]);

/** a config's mirror (follow ↔ revert: the same entries on the other side; src/core/sim/walkforward.ts mirrorId) */
export function mirrorOf(cfg) {
  if (cfg.startsWith("follow|")) return `revert|${cfg.slice(7)}`;
  if (cfg.startsWith("revert|")) return `follow|${cfg.slice(7)}`;
  return null;
}

/**
 * Per window of an invertSeats run, the configs whose mirror it traded (the seats it inverted): --matched-mirror keeps a
 * baseline order of window k only when its config is among window k's, because an inverted entry exists only where
 * the mirror pair had a tape in that window's session.
 */
export function mirroredSeats(out) {
  const wins = out.windows.map((w) => ({ from: Date.parse(w.from), to: Date.parse(w.to) }));
  const seats = wins.map(() => new Set());
  for (const t of out.trades) {
    const k = windowIndex(wins, t.entryT);
    const m = mirrorOf(t.cfg);
    if (k >= 0 && m) seats[k].add(m);
  }
  return seats;
}

/**
 * The --matched-mirror filter of the baseline: an engine order of window k counts only when the inverted run traded its
 * config's mirror there; a Signals order always counts (wf.invertSeats inverts the engine seats only: the signals trade
 * as in the baseline, so the mirror sets name none of them).
 */
export function matchedKeep(seats) {
  return (t, k) => rangeOf(t.cfg) === "Signals" || (seats[k]?.has(t.cfg) ?? false);
}

function windowIndex(wins, t) {
  for (let k = 0; k < wins.length; k++) if (t >= wins[k].from && t < wins[k].to) return k;
  return -1;
}

/** why a run gives no verdict ([] = valid): a memory-fallback window, a short warm-up window */
export function runProblems(out) {
  const s = out.summary;
  return [
    ...((s.memFallbackWindows ?? 0) > 0 ? [`${s.memFallbackWindows} memory-fallback window(s)`] : []),
    ...((s.warmupShortWindows ?? []).length ? [`short warm-up in window(s) ${s.warmupShortWindows.join(", ")}`] : []),
  ];
}

/**
 * One eval-gate output reduced to what the verdict reads (the reader then drops the output: one file at a time).
 * Per row: orders, events, PF and pfClosed over the span (d1), its halves (d1a, d1b) and each window, the window's
 * flags (memLevel, short warm-up, unscored: the run did not compute the row's range there).
 * Options: kind (a kind's orders as rows of their own), keep(t, k) (count an order of window k only when true).
 * @param {{ summary: any, windows: any[], trades: any[] }} out
 */
export function reduceRun(out, { kind = "", keep = null } = {}) {
  const s = out.summary;
  const split = Date.parse(s.span.split);
  const wins = out.windows.map((w) => ({ from: Date.parse(w.from), to: Date.parse(w.to) }));
  const acc = new Map();
  const bucket = () => ({ orders: 0, ev: new Set(), gp: 0, gl: 0, cgp: 0, cgl: 0 });
  const accOf = (name, range) => {
    let a = acc.get(name);
    if (!a) acc.set(name, (a = { range, b: Array.from({ length: 3 + wins.length }, bucket) }));
    return a;
  };
  for (const t of out.trades) {
    const k = windowIndex(wins, t.entryT);
    if (k < 0 || (keep && !keep(t, k))) continue;
    const range = rangeOf(t.cfg);
    const a = accOf(kind && kindOf(t.cfg) === kind ? `${range} · ${kind}` : range, range);
    const ev = `${t.sym}|${t.side}|${t.entryT}`;
    const open = t.reason === "open-end";
    for (const x of [a.b[0], a.b[t.entryT < split ? 1 : 2], a.b[3 + k]]) {
      x.orders++;
      x.ev.add(ev);
      if (t.r > 0) x.gp += t.r;
      else x.gl -= t.r;
      if (!open) {
        if (t.r > 0) x.cgp += t.r;
        else x.cgl -= t.r;
      }
    }
  }
  // unscored: Micro under memory fallback level 1, Micro and Minimal under level 2, and a short warm-up window unless
  // the run scored it (--score-short: its variants of the range carry the window's status)
  const variants = s.variants ?? [];
  const scoredShort = (range, k) => variants.some((v) => v.range === range && v.perWindow?.[k] && v.perWindow[k].status !== "unscored");
  const unscored = (range, k) => {
    const w = out.windows[k];
    const lvl = w.memLevel ?? 0;
    if ((range === "Micro" && lvl >= 1) || (range === "Minimal" && lvl >= 2)) return true;
    return !!w.warmup?.short && !scoredShort(range, k);
  };
  const stat = (x) => ({ orders: x.orders, events: x.ev.size, pf: pfOf([x.gp, -x.gl]), pfClosed: pfOf([x.cgp, -x.cgl]) });
  const rows = {};
  for (const [name, a] of acc)
    rows[name] = {
      range: a.range,
      d1: stat(a.b[0]),
      d1a: stat(a.b[1]),
      d1b: stat(a.b[2]),
      windows: wins.map((_, k) => ({ ...stat(a.b[3 + k]), unscored: unscored(a.range, k) })),
    };
  return {
    label: s.label,
    span: { from: s.span.from, to: s.span.to, split: s.span.split },
    // the feed the run read (eval-gate: its size in bytes and its first bar; null in an output without them)
    feed: s.feed ?? null,
    feedStart: s.feedStart ?? null,
    windows: out.windows.map((w) => ({ from: w.from, to: w.to, memLevel: w.memLevel ?? 0, short: !!w.warmup?.short })),
    problems: runProblems(out),
    rows,
  };
}

/** the same span, split and windows (a verdict compares runs on the same windows only) */
export function sameWindows(a, b) {
  return (
    a.span.from === b.span.from &&
    a.span.to === b.span.to &&
    a.span.split === b.span.split &&
    a.windows.length === b.windows.length &&
    a.windows.every((w, k) => w.from === b.windows[k].from && w.to === b.windows[k].to)
  );
}

/** the same feed (size and first bar), where both runs record it: runs on different feeds are not compared */
export function sameFeed(a, b) {
  return (a.feed == null || b.feed == null || a.feed === b.feed) && (a.feedStart == null || b.feedStart == null || a.feedStart === b.feedStart);
}

const EMPTY = { orders: 0, events: 0, pf: 0, pfClosed: 0 };
/** a row of a reduced run; a range the run has no order in is an empty row */
export function rowOf(run, name) {
  return run.rows[name] ?? { range: name.split(" · ")[0], d1: EMPTY, d1a: EMPTY, d1b: EMPTY, windows: run.windows.map(() => ({ ...EMPTY, unscored: false })) };
}

/** the rows of the runs, in RANGE_ORDER (a kind's row after its range) */
export function rowNames(...runs) {
  const names = new Set(runs.flatMap((r) => (r ? Object.keys(r.rows) : [])));
  const rank = (n) => {
    const i = RANGE_ORDER.indexOf(n.split(" · ")[0]);
    return (i < 0 ? RANGE_ORDER.length : i) * 2 + (n.includes(" · ") ? 1 : 0);
  };
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * The decision rule for one row: the lever's row `v` against the baseline's row `b` (same windows), steps 1-3.
 * verdict: "keep" | "too few events" | "not chosen" | "not kept" | "no baseline" (b0 has no event in a half: the
 * comparison is empty, the row is read against the target only) | "rerun" (a run is not valid).
 */
export function judgeRow(b, v, { problems = [], rule = RULE } = {}) {
  const half = (h) => {
    const need = Math.max(rule.minEvents, rule.minShare * b[h].events);
    return { events: v[h].events, base: b[h].events, need, ok: v[h].events >= rule.minEvents && v[h].events >= rule.minShare * b[h].events };
  };
  const valid = { d1a: half("d1a"), d1b: half("d1b") };
  valid.ok = valid.d1a.ok && valid.d1b.ok;
  const choose = { pf: v.d1a.pf, base: b.d1a.pf, need: b.d1a.pf + rule.choose, ok: v.d1a.pf + EPS >= b.d1a.pf + rule.choose };
  const counted = [];
  for (let k = 0; k < v.windows.length; k++) {
    const x = v.windows[k];
    const y = b.windows[k];
    if (x.unscored || y.unscored || x.events < rule.winEvents || y.events < rule.winEvents) continue;
    counted.push({ k, pf: x.pf, base: y.pf, higher: x.pf > y.pf + EPS, fall: y.pf - x.pf });
  }
  const wins = counted.filter((x) => x.higher).length;
  const falls = counted.filter((x) => x.fall > rule.maxFall + EPS).map((x) => x.k);
  const judge = {
    d1b: { pf: v.d1b.pf, base: b.d1b.pf, need: b.d1b.pf + rule.judge, ok: v.d1b.pf + EPS >= b.d1b.pf + rule.judge },
    windows: { counted: counted.length, wins, falls, worstFall: counted.length ? Math.max(...counted.map((x) => x.fall)) : null, ok: wins >= rule.winsMin && falls.length === 0 },
  };
  judge.ok = judge.d1b.ok && judge.windows.ok;
  const noBase = b.d1a.events === 0 || b.d1b.events === 0;
  const keep = !problems.length && !noBase && valid.ok && choose.ok && judge.ok;
  const verdict = problems.length
    ? "rerun"
    : noBase
      ? "no baseline"
      : !valid.ok
        ? "too few events"
        : !choose.ok
          ? "not chosen"
          : !judge.ok
            ? "not kept"
            : "keep";
  return { verdict, keep, valid, choose, judge };
}

/** Step 6: on the forward window F, the lever keeps its place only if PF_F(L) ≥ PF_F(b0) with ≥ 30 events. */
export function forwardRow(fb, fv, { problems = [], rule = RULE } = {}) {
  const ok = !problems.length && fv.d1.events >= rule.fwdEvents && fv.d1.pf + EPS >= fb.d1.pf;
  return { ok, pf: fv.d1.pf, base: fb.d1.pf, events: fv.d1.events, problems };
}

/**
 * Step 7, the target ("works"): PF ≥ 1.2 on D1a, D1b and F, ≥ 300 D1 events, ≥ 100 F orders, PF ≥ 1 in every window
 * with ≥ 10 events (D1's and F's). Without F only the D1 part is judged (ok stays false: F decides). `problems`: the
 * runs' (D1's and F's pair): any of them and ok is false (an invalid run never "works"); the checks are still read.
 */
export function targetRow(v, fv = null, { rule = RULE, problems = [] } = {}) {
  const thinOk = (ws) => ws.every((w) => w.unscored || w.events < rule.winEvents || w.pf + EPS >= rule.targetWinPf);
  const checks = {
    d1a: v.d1a.pf + EPS >= rule.target,
    d1b: v.d1b.pf + EPS >= rule.target,
    events: v.d1.events >= rule.targetEvents,
    windows: thinOk(v.windows),
    ...(fv ? { f: fv.d1.pf + EPS >= rule.target, fOrders: fv.d1.orders >= rule.targetFwdOrders, fWindows: thinOk(fv.windows) } : {}),
  };
  const d1 = checks.d1a && checks.d1b && checks.events && checks.windows;
  return { ok: !problems.length && !!fv && Object.values(checks).every(Boolean), d1, forward: !!fv, checks, problems };
}
