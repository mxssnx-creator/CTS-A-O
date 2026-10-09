// Long and short run independently (operator: "always process long and short both and make sure it runs
// independently"): every simulator holds one position slot, so each direction runs on its own side-filtered signal
// and the results merge. A one-sided signal gives exactly the old result.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bothSides, mergeSideTrades, sideSignal, simulate, splitSides } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { makeUniverse, runCombo, allCombos } from "../pipeline/pipeline.ts";
import { DEFAULT_DCA, DEFAULT_SETTINGS } from "../config.ts";
import type { AxisConfig, Candle, Trade } from "../domain/types.ts";
import {
  activeSignalsAt,
  buildTapes,
  defaultWalkForward,
  hedgeSignalsAt,
  lastNOk,
  lastNSideOk,
  makeTape,
  OpenCounts,
  positionsFull,
  signalIndex,
} from "./walkforward.ts";
import { activeSignals, sigActiveKey, SignalGuard } from "../signals.ts";
import { SIGNAL_MIN_CLOSES, signalSettings } from "../signal-config.ts";
import { BlockBook, bookLevels, sourceKey } from "./block.ts";

const N = 40;
// a flat market (100 ± 0.3): nothing reaches a stop or target, positions run to their time exit
const flat: Candle[] = Array.from({ length: N }, (_, i) => ({
  t: i * 900_000,
  o: 100,
  h: 100.3,
  l: 99.7,
  c: 100,
  v: 1,
}));
const B = barsFromCandles("X", 15, flat);
const P = { tp: 0.05, sl: 0.05, trail: 0, hold: 10 };
/** +1 at bar 0, −1 at bar 2, +1 at 20, −1 at 22 */
const alt = () => {
  const s = new Int8Array(N);
  s[0] = 1;
  s[2] = -1;
  s[20] = 1;
  s[22] = -1;
  return s;
};
const overlaps = (ts: readonly Trade[]) =>
  ts.some((a) => a.side === 1 && ts.some((b) => b.side === -1 && a.entryT < b.exitT && b.entryT < a.exitT));
const merged = <R extends { trades: Trade[] }>(rs: R[]) => mergeSideTrades(rs.map((r) => r.trades));

describe("both sides: helpers", () => {
  it("sideSignal keeps one direction; splitSides runs a one-sided signal once, unchanged", () => {
    const s = alt();
    assert.deepEqual([...sideSignal(s, 1)].filter((x) => x).length, 2);
    assert.ok([...sideSignal(s, -1)].every((x) => x <= 0));
    const parts = splitSides(s);
    assert.equal(parts.length, 2);
    assert.ok(parts[0].every((x) => x >= 0) && parts[1].every((x) => x <= 0));
    const longOnly = sideSignal(s, 1);
    const one = splitSides(longOnly);
    assert.equal(one.length, 1);
    assert.equal(one[0], longOnly, "the very same signal (no copy): the old result bit for bit");
    assert.equal(splitSides(new Int8Array(5)).length, 1);
  });
});

describe("both sides: simulate", () => {
  it("one slot (old): an open long drops the short signal", () => {
    const r = simulate("c", B, alt(), P, { cost: 0.002 });
    assert.ok(!overlaps(r.trades));
    assert.ok(r.trades.every((t) => t.side === 1));
  });
  it("per side: long and short overlap on one config × symbol", () => {
    const rs = bothSides(alt(), (sg) => simulate("c", B, sg, P, { cost: 0.002 }));
    const ts = merged(rs);
    assert.equal(ts.length, 4);
    assert.ok(overlaps(ts));
    assert.deepEqual(
      ts.map((t) => t.side),
      [1, -1, 1, -1],
    );
    // merged in exit order
    for (let i = 1; i < ts.length; i++) assert.ok(ts[i].exitT >= ts[i - 1].exitT);
  });
  it("open / pending per side: a long open does not hide the short's pending entry", () => {
    const s = new Int8Array(N);
    s[N - 5] = 1;
    s[N - 1] = -1;
    const old = simulate("c", B, s, P, { cost: 0.002 });
    assert.ok(old.open && old.pending === 0, "old: the open long zeroed the pending short");
    const rs = bothSides(s, (sg) => simulate("c", B, sg, P, { cost: 0.002 }));
    assert.equal(rs.filter((r) => r.open).length, 1);
    assert.deepEqual(
      rs.map((r) => r.pending),
      [0, -1],
    );
  });
  it("a one-sided signal gives exactly the old result (long, short)", () => {
    for (const sd of [1, -1] as const) {
      const s = sideSignal(alt(), sd);
      const old = simulate("c", B, s, P, { cost: 0.002 });
      const rs = bothSides(s, (sg) => simulate("c", B, sg, P, { cost: 0.002 }));
      assert.equal(rs.length, 1);
      assert.deepEqual(rs[0], old);
    }
  });
});

describe("both sides: DCA", () => {
  const PD = { tp: 0.05, sl: 0.05, trail: 0, hold: 10 };
  for (const active of [false, true]) {
    it(`${active ? "DCA Active" : "DCA"}: long and short ladders overlap; one-sided = old`, () => {
      // Active waits for the first level: a market that reaches ±2 % on bar 3 fills both ladders
      const bars = active
        ? barsFromCandles(
            "X",
            15,
            flat.map((c, i) => (i === 3 || i === 23 ? { ...c, h: 102.5, l: 97.5 } : c)),
          )
        : B;
      const old = simulateDca("d", bars, alt(), PD, DEFAULT_DCA, active, 0.002);
      assert.ok(!overlaps(old.trades));
      const ts = merged(bothSides(alt(), (sg) => simulateDca("d", bars, sg, PD, DEFAULT_DCA, active, 0.002)));
      assert.ok(overlaps(ts), JSON.stringify(ts.map((t) => [t.side, t.entryT, t.exitT])));
      for (const sd of [1, -1] as const) {
        const s = sideSignal(alt(), sd);
        assert.deepEqual(
          bothSides(s, (sg) => simulateDca("d", bars, sg, PD, DEFAULT_DCA, active, 0.002)),
          [simulateDca("d", bars, s, PD, DEFAULT_DCA, active, 0.002)],
        );
      }
    });
  }
});

describe("both sides: Axis", () => {
  // the axis moves: 110 (price below → long) for the first bars, then 90 (price above → short); ATR 5
  const center = new Float64Array(N).map((_, i) => (i % 20 < 2 ? 110 : 90));
  const atr = new Float64Array(N).fill(5);
  const PA = { tp: 0.05, sl: 0.01, trail: 0, hold: 10 };
  const REV: AxisConfig = { levels: 2, spacing: 1, ratio: 1, minDisp: 0.35, maxDisp: 2.6, center: 50, exits: "fixed" };
  const DESK: AxisConfig = { ...REV, mode: "desk", levels: 2 };
  it("revert: an open long no longer drops the short; one-sided = old", () => {
    const run = (s: Int8Array) => simulateAxis("a", B, s, PA, REV, center, atr, 0.002);
    assert.ok(!overlaps(run(alt()).trades));
    const ts = merged(bothSides(alt(), run));
    assert.ok(overlaps(ts), JSON.stringify(ts.map((t) => [t.side, t.entryT, t.exitT])));
    for (const sd of [1, -1] as const) {
      const s = sideSignal(alt(), sd);
      assert.deepEqual(bothSides(s, run), [run(s)]);
    }
  });
  it("desk: a busy lane no longer drops the other direction; one-sided = old", () => {
    const run = (s: Int8Array) => simulateAxisDesk("a", B, s, PA, DESK, center, atr, 0.002, 0, null);
    assert.ok(!overlaps(run(alt()).trades));
    const ts = merged(bothSides(alt(), run));
    assert.ok(overlaps(ts), JSON.stringify(ts.map((t) => [t.side, t.entryT, t.exitT])));
    for (const sd of [1, -1] as const) {
      const s = sideSignal(alt(), sd);
      assert.deepEqual(bothSides(s, run), [run(s)]);
    }
  });
});

describe("both sides: the tape builders", () => {
  const candles = syntheticCandles("AAA", 15, 1500, 1500 * 900_000, 11);
  const u = makeUniverse([barsFromCandles("AAA", 15, candles)]);
  const LONG_HOLD = { tp: 0.08, sl: 0.08, trail: 0, hold: 200 };
  it("buildTapes and runCombo carry overlapping long and short positions of one config × symbol", () => {
    let found = 0;
    for (const c of allCombos().slice(0, 40)) {
      const tps = buildTapes(u, [LONG_HOLD], 0.002, undefined, new Set([`${c.bot}|${c.ind}`]));
      const tp = tps[0];
      if (!tp || tp.n < 4) continue;
      const ts: Trade[] = [];
      for (let i = 0; i < tp.n; i++)
        ts.push({ side: tp.side[i], entryT: tp.entryT[i], exitT: tp.exitT[i] } as Trade);
      if (!overlaps(ts)) continue;
      found++;
      // Base computes the same per-side result for the pair
      const run = runCombo(u, c.bot, c.ind, LONG_HOLD, 0.002, 1, null, true)!;
      assert.equal(run.trades.length, tp.n);
      assert.ok(overlaps(run.trades));
      if (found >= 2) break;
    }
    assert.ok(found > 0, "some combo trades both directions at once");
  });
});

describe("both sides: execution keys and caps", () => {
  it("dupe is per direction: a config's open long does not block its short", () => {
    const c = new OpenCounts();
    c.add({ cfg: "magnet|x|tp1", sym: "A", side: 1 }, 1);
    assert.equal(c.dupe("A", "magnet|x|tp1", 1), true);
    assert.equal(c.dupe("A", "magnet|x|tp1", -1), false);
    assert.equal(c.dupe("A", "magnet|x|tp1"), true);
  });
  it("the signals' position cap counts each direction apart; the engine's both together", () => {
    const sigCfg = "follow|sig-ema-cross-s|tp1";
    const c = new OpenCounts();
    c.add({ cfg: sigCfg, sym: "A", side: 1 }, 1);
    c.add({ cfg: sigCfg, sym: "B", side: 1 }, 1);
    assert.equal(c.positionsFull("C", 1, true, 2), true);
    assert.equal(c.positionsFull("C", -1, true, 2), false, "the shorts have their own 2");
    const open = [
      { cfg: sigCfg, sym: "A", side: 1 },
      { cfg: sigCfg, sym: "B", side: 1 },
    ];
    assert.equal(positionsFull(open, "C", 1, true, 2), true);
    assert.equal(positionsFull(open, "C", -1, true, 2), false);
    const e = new OpenCounts();
    e.add({ cfg: "magnet|x|tp1", sym: "A", side: 1 }, 1);
    e.add({ cfg: "magnet|x|tp1", sym: "B", side: 1 }, 1);
    assert.equal(e.positionsFull("C", -1, false, 2), true, "engine cap unchanged (pooled)");
  });
  it("the loss-cluster guard judges each direction on its own closes", () => {
    const g = new SignalGuard();
    const c = { enabled: true, windowMin: 60, minLosses: 3, lossShare: 0.6 };
    for (let i = 0; i < 4; i++) g.add(`k${i}`, -0.01, 1000 + i, -1);
    g.add("w", 0.01, 1005, 1);
    assert.equal(g.clustered(2000, c, -1), true);
    assert.equal(g.clustered(2000, c, 1), false, "losing shorts never pause the longs");
    assert.equal(g.clustered(2000, c), true, "side-less check still pools");
  });
  it("Block symbol / indication sources are per direction", () => {
    const b = new BlockBook();
    for (let i = 0; i < 3; i++) b.add({ sym: "A", side: -1, kind: "trend", r: 0.01 });
    const L = bookLevels(b, { sym: "A", side: 1, kind: "trend" }, 3);
    const S = bookLevels(b, { sym: "A", side: -1, kind: "trend" }, 3);
    assert.equal(L.symbol, 0);
    assert.equal(L.indication, 0);
    assert.equal(S.symbol, 3);
    assert.equal(S.indication, 3);
    assert.notEqual(sourceKey("symbol", { sym: "A", side: 1, kind: "" }), sourceKey("symbol", { sym: "A", side: -1, kind: "" }));
  });
});

describe("both sides: active signals per direction", () => {
  const sig = { ...signalSettings(undefined), count: 0, minTrades: 1, rank: "drawdown" as const, minBlockShare: 0, validate: false };
  it("activeSignals ranks long and short apart (sides); a pooled record activates both", () => {
    const st = (net: number) => ({ n: SIGNAL_MIN_CLOSES, net, pf: net > 0 ? 2 : 0.5 });
    const a = activeSignals(
      [{ bot: "follow", ind: "sig-a", bySym: { A: { ...st(1), sides: { "1": st(3), "-1": st(-2) } } } }],
      sig,
    );
    assert.deepEqual([...a], [sigActiveKey("follow", "sig-a", "A", 1)]);
    const pooled = activeSignals([{ bot: "follow", ind: "sig-a", bySym: { A: st(1) } }], sig);
    assert.deepEqual(new Set(pooled), new Set([sigActiveKey("follow", "sig-a", "A", 1), sigActiveKey("follow", "sig-a", "A", -1)]));
  });
  it("activeSignalsAt / hedge keys carry the direction", () => {
    const H = 3_600_000;
    const trs: Trade[] = [];
    // thirteen hours of closes: the twelve before the hour 13 buckets (the buckets before t close completely) are judged
    for (let h = 0; h < SIGNAL_MIN_CLOSES + 1; h++) {
      trs.push({ cfg: "follow|sig-a|x", sym: "A", side: 1, entryT: h * H, exitT: h * H + 1000, entry: 1, exit: 1, r: 0.01, reason: "tp", bars: 1, mfe: 0, mae: 0 });
      trs.push({ cfg: "follow|sig-a|x", sym: "A", side: -1, entryT: h * H, exitT: h * H + 2000, entry: 1, exit: 1, r: -0.01, reason: "sl", bars: 1, mfe: 0, mae: 0 });
    }
    const tp = makeTape("follow|sig-a|x", "follow", "sig-a", { tp: 0.01, sl: 0.01, trail: 0, hold: 4 }, "normal", ["A"], trs, [], []);
    const idx = signalIndex([tp]);
    assert.equal(idx.length, 2);
    const act = activeSignalsAt(idx, (SIGNAL_MIN_CLOSES + 1) * H, sig, 24);
    assert.deepEqual([...act], [sigActiveKey("follow", "sig-a", "A", 1)], "the losing short is not active");
    const hedge = hedgeSignalsAt(idx, (SIGNAL_MIN_CLOSES + 1) * H, new Set([1, 2, 3]), 24, { minN: 1, minPf: 1 });
    assert.deepEqual([...hedge], [sigActiveKey("follow", "sig-a", "A", 1)]);
  });
});

describe("both sides: last-N per direction", () => {
  const H = 3_600_000;
  const mk = (rs: Array<[number, number]>) =>
    makeTape(
      "c",
      "magnet",
      "x",
      { tp: 0.01, sl: 0.01, trail: 0, hold: 4 },
      "normal",
      ["A"],
      rs.map(([side, r], i) => ({ cfg: "c", sym: "A", side, entryT: i * H, exitT: i * H + 1000, entry: 1, exit: 1, r, reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0 }) as Trade),
      [],
      [],
    );
  it("judges the entry's own side: winning longs do not carry losing shorts", () => {
    const rs: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) rs.push([1, 0.02], [-1, -0.01]);
    const tp = mk(rs);
    const t = 30 * H;
    assert.equal(lastNOk(tp, t, 6, 1.2), true, "pooled: the longs carry it");
    assert.equal(lastNSideOk(tp, 1, t, 6, 1.2), true);
    assert.equal(lastNSideOk(tp, -1, t, 6, 1.2), false);
  });
  it("a one-sided tape gives exactly lastNOk", () => {
    const rs: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [-1, i % 3 ? 0.01 : -0.015]);
    const tp = mk(rs);
    for (const n of [3, 6, 12, 20])
      for (const minPf of [0.5, 1, 1.5, 3])
        for (const floor of [0, 4])
          assert.equal(
            lastNSideOk(tp, -1, 30 * H, n, minPf, 2, 1, floor),
            lastNOk(tp, 30 * H, n, minPf, 2, 1, floor),
          );
  });
  it("the default symbol gate is per direction", () => {
    assert.equal(defaultWalkForward(DEFAULT_SETTINGS).symGate, "provenSide");
  });
});
