// The per-range verdict of an eval lever (scripts/lib/eval-verdict.mjs) on synthetic eval-gate outputs: the rows by
// range and kind, events against orders, PF with the orders open at the end against pfClosed, the D1a / D1b cut by entry
// time, the matched-mirror baseline, and each step of the PF-search protocol's decision rule at its thresholds.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  forwardRow,
  judgeRow,
  kindOf,
  matchedKeep,
  mirrorOf,
  mirroredSeats,
  rangeOf,
  reduceRun,
  rowNames,
  rowOf,
  runProblems,
  sameFeed,
  sameWindows,
  targetRow,
} from "./eval-verdict.mjs";

const H = 3_600_000;
const T0 = Date.parse("2026-09-29T11:00:00Z");
const SPLIT = T0 + 120 * H;
const iso = (t) => new Date(t).toISOString();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

/** an eval-gate output ({ summary, windows, trades }) over D1's five 48 h windows */
function gateOut(trades, { memLevel = [], short = [], split = SPLIT } = {}) {
  const windows = Array.from({ length: 5 }, (_, k) => ({
    from: iso(T0 + k * 48 * H),
    to: iso(T0 + (k + 1) * 48 * H),
    runH: 48,
    warmup: { haveH: 142 + 48 * k, needH: 100, short: short.includes(k + 1), limitedLanes: [] },
    memLevel: memLevel[k] ?? 0,
  }));
  return {
    summary: {
      label: "t",
      span: { from: iso(T0), to: iso(T0 + 240 * H), split: iso(split) },
      memFallbackWindows: windows.filter((w) => w.memLevel > 0).length,
      warmupShortWindows: short,
      variants: [],
    },
    windows,
    trades,
  };
}
const order = (cfg, entryT, r, { sym = "AAA-USDT", side = 1, reason = r > 0 ? "tp" : "sl" } = {}) => ({ cfg, sym, side, entryT, entry: 1, exitT: entryT + H, exit: 1, r, reason });
const GN = (x) => `follow|${x}@m15|tp1|sl2|tr0|h64|gn`;

test("a config id's row and kind: its range tag, sig- indications as Signals, untagged as Wide (summary.funnel's names)", () => {
  assert.equal(rangeOf(GN("ema-21-55")), "General");
  assert.equal(rangeOf("revert|z-50-2.5@x4@m15|tp2.8|sl7|tr2.1|h192|mp"), "Minimal plus");
  assert.equal(rangeOf("follow|ema-21-55|tp1|sl2|tr0|h64"), "Wide");
  assert.equal(rangeOf("follow|sig-book-3@m5|tp1|sl2|tr0|h64|mn"), "Signals");
  assert.equal(kindOf("follow|ema-21-55|tp1|sl2|tr0|h64|ax-atr2|axis"), "axis");
  assert.equal(kindOf("follow|ema-21-55|tp1|sl2|tr0|h64|mn|dcaA"), "dca-active");
  assert.equal(kindOf("follow|ema-21-55|tp1|sl2|tr0|h64|dca"), "dca");
  assert.equal(kindOf(GN("ema-21-55")), "normal");
  assert.equal(kindOf("follow|ema-21-55@m15|tp1|sl2|tr0.5|h64|gn"), "trailing");
  assert.equal(mirrorOf(GN("a")), `revert|a@m15|tp1|sl2|tr0|h64|gn`);
  assert.equal(mirrorOf(`revert|a@m15|tp1|sl2|tr0|h64|gn`), GN("a"));
  assert.equal(mirrorOf("pulse|a|tp1|sl2|tr0|h64"), null);
});

test("a run reduced per range: orders against events, PF with the open orders against pfClosed, D1a / D1b by entry time", () => {
  const MC = "follow|mc-fbo-48@m15c|tp1|sl3|tr0.75|h192|mc";
  const out = gateOut(
    [
      // one bar, three configs: three orders, one event
      order(GN("a"), T0 + 2 * H, 0.02),
      order(GN("b"), T0 + 2 * H, 0.02),
      order(GN("c"), T0 + 2 * H, -0.01),
      // still open at the window's end (marked): in PF, not in pfClosed
      order(GN("a"), T0 + 3 * H, -0.01, { sym: "BBB-USDT", reason: "open-end" }),
      // window 3 holds both halves: the split cuts by entry time
      order(GN("a"), SPLIT - H, -0.02),
      order(GN("a"), SPLIT, 0.03),
      // Micro in window 2, computed there under memory fallback level 1
      order(MC, T0 + 50 * H, 0.01),
      // Wide: an Axis order and a DCA order
      order("follow|ema-21-55|tp1|sl2|tr0|h64|ax-atr2|axis", T0 + 200 * H, 0.01),
      order("follow|ema-21-55|tp1|sl2|tr0|h64|dca", T0 + 201 * H, -0.01),
      // before the span: no window, not counted
      order(GN("a"), T0 - H, 0.5),
    ],
    { memLevel: [0, 1, 0, 0, 0] },
  );
  const run = reduceRun(out);
  assert.deepEqual(rowNames(run), ["Micro", "General", "Wide"]);
  const g = run.rows.General;
  assert.deepEqual([g.d1.orders, g.d1.events, g.d1a.orders, g.d1a.events, g.d1b.orders, g.d1b.events], [6, 4, 5, 3, 1, 1]);
  close(g.d1.pf, 0.07 / 0.04);
  close(g.d1.pfClosed, 0.07 / 0.03);
  close(g.d1a.pf, 1);
  close(g.d1a.pfClosed, 0.04 / 0.03);
  assert.equal(g.d1b.pf, 9, "no loss: PF 9 (scripts/lib/eval-variants.mjs pfOf)");
  assert.deepEqual(g.windows.map((w) => [w.orders, w.events]), [[4, 2], [0, 0], [2, 2], [0, 0], [0, 0]]);
  close(g.windows[0].pf, 2);
  close(g.windows[0].pfClosed, 4);
  close(g.windows[2].pf, 1.5);
  // the fallback window leaves Micro out (unscored), not General
  assert.deepEqual(run.rows.Micro.windows.map((w) => w.unscored), [false, true, false, false, false]);
  assert.ok(g.windows.every((w) => !w.unscored));
  assert.deepEqual(run.problems, ["1 memory-fallback window(s)"]);
  assert.equal(run.windows[1].memLevel, 1);
  assert.equal(run.rows.Wide.d1.orders, 2);
  // --kind axis: the Axis orders as a row of their own, after their range; the range's row keeps the others
  const byKind = reduceRun(out, { kind: "axis" });
  assert.deepEqual(rowNames(byKind), ["Micro", "General", "Wide", "Wide · axis"]);
  assert.equal(byKind.rows["Wide · axis"].range, "Wide");
  assert.equal(byKind.rows["Wide · axis"].d1.orders, 1);
  assert.equal(byKind.rows["Wide · axis"].d1.pf, 9);
  assert.equal(byKind.rows.Wide.d1.orders, 1);
  assert.equal(byKind.rows.Wide.d1.pf, 0);
  // a range without orders is an empty row; another split is not the same windows
  assert.deepEqual(rowOf(run, "Long").d1, { orders: 0, events: 0, pf: 0, pfClosed: 0 });
  assert.ok(sameWindows(run, reduceRun(gateOut([]))));
  assert.ok(!sameWindows(run, reduceRun(gateOut([], { split: SPLIT + H }))));
});

test("a run with a short warm-up window or a memory-fallback window gives no verdict (rerun)", () => {
  assert.deepEqual(runProblems(gateOut([])), []);
  assert.deepEqual(runProblems(gateOut([], { short: [1] })), ["short warm-up in window(s) 1"]);
  assert.deepEqual(runProblems(gateOut([], { memLevel: [0, 0, 2] })), ["1 memory-fallback window(s)"]);
  // the short window is unscored for every range
  const run = reduceRun(gateOut([order(GN("a"), T0 + H, 0.01)], { short: [1] }));
  assert.equal(run.rows.General.windows[0].unscored, true);
});

test("--matched-mirror: a baseline order counts only in a window where the inverted run traded its config's mirror", () => {
  const inv = gateOut([order(`revert|a@m15|tp1|sl2|tr0|h64|gn`, T0 + H, 0.01), order(`revert|b@m15|tp1|sl2|tr0|h64|gn`, T0 + 49 * H, 0.01)]);
  const seats = mirroredSeats(inv);
  assert.deepEqual(seats.map((s) => [...s]), [[GN("a")], [GN("b")], [], [], []]);
  const base = gateOut([order(GN("a"), T0 + 2 * H, 0.02), order(GN("b"), T0 + 3 * H, -0.01), order(GN("b"), T0 + 50 * H, 0.03), order(GN("a"), T0 + 51 * H, -0.04)]);
  const all = reduceRun(base).rows.General;
  const matched = reduceRun(base, { keep: (t, k) => seats[k].has(t.cfg) }).rows.General;
  assert.equal(all.d1.orders, 4);
  assert.equal(matched.d1.orders, 2);
  assert.deepEqual(matched.windows.map((w) => w.orders), [1, 1, 0, 0, 0]);
  assert.equal(matched.d1.pf, 9);
});

/** a reduced row from [events, PF] per half and per window (one order per event) */
function row(d1a, d1b, wins) {
  const st = ([events, pf]) => ({ orders: events, events, pf, pfClosed: pf });
  return { range: "General", d1: st([d1a[0] + d1b[0], 1]), d1a: st(d1a), d1b: st(d1b), windows: wins.map((w) => ({ ...st(w), unscored: false })) };
}
const B0 = row([100, 1.0], [80, 0.9], [[30, 1.0], [30, 1.0], [30, 0.9], [30, 0.9], [30, 0.9]]);
// at every threshold exactly: 40 % of b0's events in each half, D1a +0.05, D1b +0.03, higher in 3 of 5, a fall of 0.19
const AT = { d1a: [40, 1.05], d1b: [32, 0.93], wins: [[20, 1.1], [20, 1.1], [20, 1.0], [20, 0.8], [20, 0.71]] };
const lever = (patch = {}) => {
  const x = { ...AT, ...patch };
  return row(x.d1a, x.d1b, x.wins);
};
const winsWith = (k, w) => AT.wins.map((x, i) => (i === k ? w : x));

test("the decision rule: valid (≥ 30 events, ≥ 40 % of b0's in both halves), choose (D1a +0.05), judge (D1b +0.03, 3 of 5 windows, no fall > 0.2)", () => {
  const at = judgeRow(B0, lever());
  assert.equal(at.verdict, "keep");
  assert.equal(at.keep, true);
  assert.equal(at.judge.windows.counted, 5);
  assert.equal(at.judge.windows.wins, 3);
  // 1. valid
  assert.equal(judgeRow(B0, lever({ d1a: [39, 1.05] })).verdict, "too few events", "39 < 40 % of 100");
  assert.equal(judgeRow(B0, lever({ d1b: [31, 0.93] })).verdict, "too few events", "31 < 40 % of 80");
  const thinBase = row([50, 1.0], [50, 0.9], B0.windows.map((w) => [w.events, w.pf]));
  assert.equal(judgeRow(thinBase, lever({ d1a: [29, 1.05] })).verdict, "too few events", "29 < 30");
  assert.equal(judgeRow(thinBase, lever({ d1a: [30, 1.05], d1b: [30, 0.93] })).verdict, "keep");
  // 2. choose
  assert.equal(judgeRow(B0, lever({ d1a: [40, 1.04] })).verdict, "not chosen");
  // 3. judge
  assert.equal(judgeRow(B0, lever({ d1b: [32, 0.92] })).verdict, "not kept");
  const two = judgeRow(B0, lever({ wins: winsWith(2, [20, 0.9]) }));
  assert.equal(two.verdict, "not kept", "an equal window is not higher: 2 of 5");
  assert.equal(two.judge.windows.wins, 2);
  const fall = judgeRow(B0, lever({ wins: winsWith(4, [20, 0.69]) }));
  assert.equal(fall.verdict, "not kept");
  assert.deepEqual(fall.judge.windows.falls, [4]);
  // a window with < 10 events in either run counts neither way (its fall is noise)
  const thin = judgeRow(B0, lever({ wins: winsWith(4, [9, 0.2]) }));
  assert.equal(thin.verdict, "keep");
  assert.equal(thin.judge.windows.counted, 4);
  assert.equal(judgeRow(B0, lever({ wins: winsWith(0, [9, 2]) })).verdict, "not kept", "3 higher needs 3 counted higher windows");
  // b0 without an event in a half: no comparison (the row is read against the target); an invalid run: rerun
  assert.equal(judgeRow(row([0, 0], [80, 0.9], B0.windows.map((w) => [w.events, w.pf])), lever()).verdict, "no baseline");
  const rerun = judgeRow(B0, lever(), { problems: ["1 memory-fallback window(s)"] });
  assert.deepEqual([rerun.verdict, rerun.keep], ["rerun", false]);
});

test("forward (F: PF ≥ b0's with ≥ 30 events) and the target (PF ≥ 1.2 on D1a, D1b and F, 300 D1 events, 100 F orders, no window < 1)", () => {
  const f = (events, pf) => row([0, 0], [0, 0], [[events, pf]]);
  const asD1 = (r, events, pf) => ({ ...r, d1: { orders: events, events, pf, pfClosed: pf } });
  assert.equal(forwardRow(asD1(f(40, 1), 40, 1), asD1(f(30, 1), 30, 1)).ok, true);
  assert.equal(forwardRow(asD1(f(40, 1), 40, 1), asD1(f(29, 1.5), 29, 1.5)).ok, false, "29 events");
  assert.equal(forwardRow(asD1(f(40, 1), 40, 1), asD1(f(40, 0.99), 40, 0.99)).ok, false);
  assert.equal(forwardRow(asD1(f(40, 1), 40, 1), asD1(f(40, 1.5), 40, 1.5), { problems: ["x"] }).ok, false);
  const v = row([150, 1.2], [150, 1.25], [[60, 1.3], [60, 1], [60, 1.2], [60, 1.4], [9, 0.5]]);
  const fv = asD1(f(100, 1.2), 100, 1.2);
  assert.deepEqual(targetRow(v, fv), {
    ok: true,
    d1: true,
    forward: true,
    checks: { d1a: true, d1b: true, events: true, windows: true, f: true, fOrders: true, fWindows: true },
    problems: [],
  });
  assert.equal(targetRow(v, null).ok, false, "without F the target is not reached");
  assert.equal(targetRow(v, null).d1, true);
  assert.equal(targetRow(v, asD1(f(99, 1.2), 99, 1.2)).checks.fOrders, false);
  const low = row([150, 1.2], [150, 1.25], [[60, 1.3], [10, 0.99], [60, 1.2], [60, 1.4], [60, 1.2]]);
  assert.equal(targetRow(low, fv).checks.windows, false, "a window with 10 events at PF 0.99");
  assert.equal(targetRow(row([150, 1.2], [149, 1.25], v.windows.map((w) => [w.events, w.pf])), fv).checks.events, false, "299 events");
});

test("no \"works\" from an invalid run: targetRow takes the runs' problems (the forward pair's among them)", () => {
  const v = row([150, 1.2], [150, 1.25], [[60, 1.3], [60, 1], [60, 1.2], [60, 1.4], [60, 1.2]]);
  const fv = { ...row([0, 0], [0, 0], [[100, 1.2]]), d1: { orders: 100, events: 100, pf: 1.2, pfClosed: 1.2 } };
  assert.equal(targetRow(v, fv).ok, true);
  const bad = targetRow(v, fv, { problems: ["fwd: 1 memory-fallback window(s)"] });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.problems, ["fwd: 1 memory-fallback window(s)"]);
  assert.equal(bad.d1, true, "the D1 checks are still read");
});

test("--matched-mirror keeps the baseline's Signals orders whatever the inverted run traded (signals are never inverted)", () => {
  const SIG = "follow|sig-book-3@m5|tp1|sl2|tr0|h64";
  const inv = gateOut([order(`revert|a@m15|tp1|sl2|tr0|h64|gn`, T0 + H, 0.01)]);
  const keep = matchedKeep(mirroredSeats(inv));
  const base = gateOut([order(GN("a"), T0 + 2 * H, 0.02), order(GN("b"), T0 + 3 * H, -0.01), order(SIG, T0 + 4 * H, 0.01), order(SIG, T0 + 100 * H, -0.02)]);
  const run = reduceRun(base, { keep });
  assert.equal(run.rows.General.d1.orders, 1);
  assert.equal(run.rows.Signals.d1.orders, 2);
});

test("a run carries its feed (size and start); runs on different feeds are not compared", () => {
  const on = (feed, feedStart) => {
    const o = gateOut([]);
    o.summary.feed = feed;
    o.summary.feedStart = feedStart;
    return reduceRun(o);
  };
  const a = on(318_000_000, "2026-09-19T00:00:00.000Z");
  assert.deepEqual([a.feed, a.feedStart], [318_000_000, "2026-09-19T00:00:00.000Z"]);
  assert.ok(sameFeed(a, on(318_000_000, "2026-09-19T00:00:00.000Z")));
  assert.ok(!sameFeed(a, on(640_000_000, "2026-09-19T00:00:00.000Z")), "another size");
  assert.ok(!sameFeed(a, on(318_000_000, "2026-09-20T00:00:00.000Z")), "another start");
  // an output without the fields (older evals) is not refused for them
  assert.ok(sameFeed(a, reduceRun(gateOut([]))));
});
