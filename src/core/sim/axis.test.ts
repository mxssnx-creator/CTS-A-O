import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  axisSpacing,
  deskLevels,
  deskSlDist,
  simulateAxis,
  simulateAxisDesk,
  snapTpRatio,
} from "./axis.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "../indications/cache.ts";
import type { AxisConfig, Candle } from "../domain/types.ts";
import { allCombos, makeUniverse } from "../pipeline/pipeline.ts";
import {
  buildTapes,
  defaultWalkForward,
  makeTape,
  markedOpenTrade,
  positionMult,
  positionVolume,
} from "./walkforward.ts";
import { DEFAULT_AXIS, DEFAULT_SETTINGS } from "../config.ts";
import { signalSettings } from "../signal-config.ts";

const mk = (rows: Array<[number, number, number, number]>): Candle[] =>
  rows.map(([o, h, l, c], i) => ({ t: i * 900_000, o, h, l, c, v: 1 }));
const P = { tp: 0.02, sl: 0.01, trail: 0, hold: 20 };
// the former fixed exits (target = the axis at the signal, stop beyond the last rung)
const AX = {
  levels: 2,
  spacing: 1,
  ratio: 1,
  minDisp: 0.35,
  maxDisp: 2.6,
  center: 50,
  exits: "fixed" as const,
};

describe("axis", () => {
  // axis at 100, ATR 1: price 98.5 is 1.5 ATR below → a long toward the axis
  const rows: Array<[number, number, number, number]> = [
    [98.5, 98.6, 98.4, 98.5], // signal bar
    [98.5, 98.6, 97.4, 97.6], // base at 98.5, rung at 97.5 fills
    [97.6, 100.2, 97.5, 100], // axis 100 reached (target)
  ];
  const b = barsFromCandles("X", 15, mk(rows));
  const center = new Float64Array([100, 100, 100]);
  const atr = new Float64Array([1, 1, 1]);

  it("ladders toward the axis and takes profit at the axis price, cost per leg", () => {
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0]), P, AX, center, atr, 0.002);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.kind, "axis");
    assert.equal(t.reason, "tp");
    assert.equal(t.vol, 2);
    assert.equal(t.exit, 100);
    const expect = (100 - 98.5) / 98.5 + (100 - 97.5) / 97.5 - 0.004;
    assert.ok(Math.abs(t.r - expect) < 1e-12, `${t.r} vs ${expect}`);
  });

  it("never trades away from the axis or outside the displacement band", () => {
    assert.equal(
      simulateAxis("c", b, new Int8Array([-1, 0, 0]), P, AX, center, atr, 0.002).trades.length,
      0,
      "short below the axis",
    );
    assert.equal(
      simulateAxis("c", b, new Int8Array([1, 0, 0]), P, { ...AX, maxDisp: 1 }, center, atr, 0.002)
        .trades.length,
      0,
      "too far",
    );
    assert.equal(
      simulateAxis("c", b, new Int8Array([1, 0, 0]), P, { ...AX, minDisp: 2 }, center, atr, 0.002)
        .trades.length,
      0,
      "too close",
    );
  });

  it("stops beyond the last rung", () => {
    const down = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 97.4, 97.6],
        [97.6, 97.6, 96, 96.2],
      ]),
    );
    const r = simulateAxis("c", down, new Int8Array([1, 0, 0]), P, AX, center, atr, 0.002);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 97.5 * 0.99) < 1e-9);
  });

  it("uses no future bars (trades on a prefix are identical)", () => {
    const full = barsFromCandles(
      "AAA",
      15,
      syntheticCandles("AAA", 15, 900, Date.UTC(2026, 8, 20)),
    );
    let seed = 9;
    const sig = new Int8Array(full.n).map(() =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32 < 0.5 ? 1 : -1,
    );
    const run = (n: number) => {
      const bb = {
        ...full,
        n,
        t: full.t.slice(0, n),
        o: full.o.slice(0, n),
        h: full.h.slice(0, n),
        l: full.l.slice(0, n),
        c: full.c.slice(0, n),
        v: full.v.slice(0, n),
      };
      const kk = new SeriesCache(bb);
      return simulateAxis(
        "c",
        bb,
        sig.slice(0, n),
        P,
        { ...AX, levels: 3, spacing: 0.7 },
        kk.ema(50),
        kk.atr(14),
        0,
      ).trades;
    };
    const a = run(900);
    const cut = 600;
    const b2 = run(cut);
    const closedBefore = a.filter((t) => t.exitT <= full.t[cut - 1]);
    assert.ok(a.length > 0);
    assert.deepEqual(b2.slice(0, closedBefore.length), closedBefore);
  });
});

describe("axis: managed exits (old desk handling)", () => {
  const center = new Float64Array([100, 100, 100, 100]);
  const atr = new Float64Array([1, 1, 1, 1]);
  const AXM = { levels: 1, spacing: 1, ratio: 1, minDisp: 0.35, maxDisp: 2.6, center: 50 };
  const cost = 0.002;

  it("target just past the axis, tightened toward it on the next closed bar; stop = min(step, target distance)", () => {
    // fill 98.5 (signal bar: axis 100, ATR 1): step 1, target max(100.25, 99.35) = 100.25, stop 97.5;
    // after bar 1: target tightens to max(100 + 0.2, 98.5 + 0.95) = 100.2
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 100.3, 98.4, 100.1],
        [100.1, 100.2, 100, 100.1],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0, 0]), P, AXM, center, atr, cost);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.reason, "tp");
    assert.ok(Math.abs(t.exit - 100.2) < 1e-9, `exit ${t.exit}`);
    assert.ok(Math.abs(t.r - ((100.2 - 98.5) / 98.5 - cost)) < 1e-12);
  });

  it("moves the stop to breakeven after 0.85 risk", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 99.5, 98.4, 99.4], // close 99.4 ≥ 98.5 + 0.85 → breakeven
        [99.4, 99.5, 98, 98.2], // back down: out at 98.5
        [98.2, 98.3, 98, 98.1],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0, 0]), P, AXM, center, atr, cost);
    // a breakeven exit is "be", not a stop-out (labelled "sl" it made Axis read as 232 stop-outs of 254)
    assert.equal(r.trades[0].reason, "be");
    assert.ok(Math.abs(r.trades[0].exit - 98.5) < 1e-9);
    assert.ok(Math.abs(r.trades[0].r + cost) < 1e-12, "breakeven pays only the cost");
  });

  it("the stop is never wider than the target distance (a loss is at most one step)", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 96, 96.2],
        [96.2, 96.3, 96, 96.1],
        [96.1, 96.2, 96, 96.1],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0, 0]), P, AXM, center, atr, cost);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 97.5) < 1e-9, `${r.trades[0].exit}`);
  });

  it("range types set the rung spacing", () => {
    assert.equal(axisSpacing("atr", 0.7, 100, 2), 1.4);
    assert.ok(Math.abs(axisSpacing("linear", 0.7, 100, 2) - (1.26 + 0.5)) < 1e-12);
    assert.ok(Math.abs(axisSpacing("geo", 0.7, 100, 2) - 0.875) < 1e-12);
    assert.ok(Math.abs(axisSpacing("fib", 0.7, 100, 2) - 1.618) < 1e-12);
  });
});

describe("axis: desk mode (Stable-02 ladder)", () => {
  // axis 100, ATR 1, atr range, spacing 1 → long rungs at 99 / 98; slDist(1, 1, 0.7) = 0.42, TP = 2 × 0.42
  const DK: AxisConfig = {
    levels: 2,
    spacing: 1,
    ratio: 1,
    minDisp: 0.35,
    maxDisp: 2.6,
    center: 50,
    mode: "desk",
    range: "atr",
    slAtr: 0.7,
    tpRatio: 2,
  };
  const flat = (n: number, v: number) => new Float64Array(n).fill(v);
  const sig1 = (n: number, s = 1) => {
    const x = new Int8Array(n);
    x[0] = s;
    return x;
  };
  const run = (
    rows: Array<[number, number, number, number]>,
    ax: Partial<AxisConfig> = {},
    opt: { atr?: Float64Array; side?: number; floor?: { minSl: number; minTrail: number } } = {},
  ) => {
    const b = barsFromCandles("X", 15, mk(rows));
    return simulateAxisDesk(
      "c",
      b,
      sig1(b.n, opt.side ?? 1),
      P,
      { ...DK, ...ax },
      flat(b.n, 100),
      opt.atr ?? flat(b.n, 1),
      0.002,
      0,
      opt.floor,
    );
  };

  it("desk helpers: slDist, TP ratio snap, SL ≤ TP ÷ ratio", () => {
    assert.equal(deskSlDist(1, 1, 0.7), 0.42);
    assert.equal(deskSlDist(1, 10, 0.2), 0.35);
    assert.equal(deskSlDist(1, 10, 0.7), 0.7);
    assert.equal(snapTpRatio(2.25), 2.2);
    assert.equal(snapTpRatio(9), 3);
    const lv = deskLevels(100, 1, 5, 4, 2);
    assert.equal(lv.tp, 104);
    assert.equal(lv.sl, 98, "stop capped at the target distance ÷ ratio");
    const sh = deskLevels(100, -1, 1, 2, 2);
    assert.equal(sh.sl, 101);
    assert.equal(sh.tp, 98);
  });

  it("a rung fills when a bar trades through it (at the rung price), target = ratio × stop", () => {
    const r = run([
      [100, 100.2, 99.8, 100], // signal
      [100, 100.1, 98.9, 99.2], // rung 99 fills; stop 98.58, target 99.84 (no target on the fill bar)
      [99.2, 99.9, 99.1, 99.8], // target
    ]);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.kind, "axis");
    assert.equal(t.reason, "tp");
    assert.equal(t.level, 0);
    assert.equal(t.entry, 99);
    assert.ok(Math.abs(t.exit - 99.84) < 1e-9, `${t.exit}`);
    assert.ok(Math.abs(t.r - ((99.84 - 99) / 99 - 0.002)) < 1e-12);
  });

  it("a signal with the price already through the rungs enters once, not the whole ladder at the next open", () => {
    // axis 100, rungs 99 / 98 (levels 2, spacing 1); the signal bar closes at 97.5 — beyond both rungs
    const r = run(
      [
        [98, 98.2, 97.4, 97.5], // signal, price below every rung
        [97.5, 97.8, 97.3, 97.6], // the next bar: one entry at the close 97.5, not two at its open
        [97.6, 98.6, 97.5, 98.5],
      ],
      { levels: 2 },
    );
    assert.equal(r.trades.length, 0);
    assert.equal(r.open?.w, 1, "one unit: the rungs the price stood beyond collapsed into one entry");
    assert.equal(r.open?.entry, 97.5);
  });

  it("a bar that opens beyond a rung fills it at the open", () => {
    const r = run([
      [100, 100.2, 99.8, 100],
      [98.7, 98.9, 98.65, 98.8],
    ]);
    assert.equal(r.trades.length, 0);
    assert.ok(r.open);
    assert.equal(r.open!.entry, 98.7);
    assert.ok(Math.abs(r.open!.stop - (98.7 - 0.42)) < 1e-9);
    assert.ok(Math.abs(r.open!.target - (98.7 + 0.84)) < 1e-9);
  });

  it("short rungs rest above the axis", () => {
    const r = run(
      [
        [100, 100.2, 99.8, 100],
        [100, 101.1, 99.9, 100.8], // rung 101 fills
        [100.8, 100.9, 100.2, 100.3], // target 101 − 0.84 = 100.16 not reached
      ],
      {},
      { side: -1 },
    );
    assert.equal(r.open?.side, -1);
    assert.equal(r.open?.entry, 101);
    assert.ok(Math.abs(r.open!.stop - 101.42) < 1e-9);
  });

  it("no signal, no ladder", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100, 100, 98, 99],
        [99, 99, 97, 98],
      ]),
    );
    const r = simulateAxisDesk("c", b, new Int8Array(2), P, DK, flat(2, 100), flat(2, 1), 0);
    assert.equal(r.trades.length, 0);
    assert.equal(r.open, null);
    assert.equal(r.pending, 0);
  });

  it("unfilled rungs expire after the expiry bars", () => {
    const rows: Array<[number, number, number, number]> = [
      [100, 100.2, 99.8, 100],
      [100, 100.2, 99.5, 100],
      [100, 100.2, 99.5, 100],
      [100, 100.1, 98.9, 99.2], // would fill 99
    ];
    const gone = run(rows, { expiry: 2 });
    assert.equal(gone.open, null, "rungs rest on bars 1–2 only");
    assert.equal(gone.trades.length, 0);
    const kept = run(rows, { expiry: 3 });
    assert.equal(kept.open?.entry, 99);
  });

  it("a rung beyond the stop in force never fills: the stop goes first (no phantom fill below the exit)", () => {
    const r = run([
      [100, 100.2, 99.8, 100],
      [100, 100, 97.9, 98.2], // rung 99 fills; its stop (98.58) is above rung 98 → stop first, 98 cancelled
    ]);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.reason, "sl");
    assert.equal(t.level, 0);
    assert.equal(t.vol, 1);
    assert.equal(t.entry, 99);
    assert.ok(Math.abs(t.exit - 98.58) < 1e-9, `${t.exit}`);
  });

  it("each closed bar tightens the stop (never loosens) and never reduces the target", () => {
    const rows: Array<[number, number, number, number]> = [
      [100, 100.2, 99.8, 100],
      [100, 100, 98.9, 99.2], // fill 99: stop 98.58, target 99.84
      [99.2, 99.5, 99.0, 99.3], // ATR 3: SL 1.05 → wider levels: stop stays, target widens to 101.1
      [99.3, 99.5, 99.0, 99.3], // ATR 0.5: SL 0.35 → stop tightens to 98.65, target stays 101.1
      [99.3, 99.5, 99.0, 99.3], // ATR 3 again: stop stays 98.65
    ];
    const atr = new Float64Array([1, 1, 3, 0.5, 3]);
    const at = (n: number) => run(rows.slice(0, n), {}, { atr: atr.slice(0, n) }).open!;
    assert.ok(Math.abs(at(3).stop - 98.58) < 1e-9);
    assert.ok(Math.abs(at(3).target - 101.1) < 1e-9, `${at(3).target}`);
    assert.ok(Math.abs(at(4).stop - 98.65) < 1e-9, `${at(4).stop}`);
    assert.ok(Math.abs(at(4).target - 101.1) < 1e-9);
    assert.ok(Math.abs(at(5).stop - 98.65) < 1e-9);
  });

  it("stop floors (protectFloor / minSl) widen the desk stop, the target follows at its ratio", () => {
    const r = run(
      [
        [100, 100.2, 99.8, 100],
        [100, 100.1, 98.9, 99.2],
      ],
      {},
      { floor: { minSl: 0.01, minTrail: 0 } },
    );
    // SL = max(0.42, 1 % of the rung price 99) = 0.99, TP = 2 × 0.99
    assert.ok(Math.abs(r.open!.stop - 98.01) < 1e-9, `${r.open!.stop}`);
    assert.ok(Math.abs(r.open!.target - 100.98) < 1e-9);
  });

  it("hybrid: the Stable-02 trail follows the close once the move reaches 0.95 × stop distance", () => {
    const r = run(
      [
        [100, 100.2, 99.8, 100],
        [100, 100.1, 98.9, 99.2], // fill 99, stop 98.58 (0.42)
        [99.2, 99.7, 99.1, 99.6], // move 0.6 ≥ 0.399 → stop 99.6 − 0.42 = 99.18
        [99.6, 99.6, 99.1, 99.3], // trail exit at 99.18
      ],
      { hybrid: true, trailPct: 0.8 },
    );
    assert.equal(r.trades[0].reason, "trail");
    assert.ok(Math.abs(r.trades[0].exit - 99.18) < 1e-9, `${r.trades[0].exit}`);
    // off: the same path keeps the desk stop
    assert.ok(
      run([
        [100, 100.2, 99.8, 100],
        [100, 100.1, 98.9, 99.2],
        [99.2, 99.7, 99.1, 99.6],
        [99.6, 99.6, 99.1, 99.3],
      ]).open,
    );
  });

  it("hybrid: the trail keeps the gap it armed with (regression: it shrank to the close and exited at ~−cost)", () => {
    const bars: Array<[number, number, number, number]> = [
      [100, 100.2, 99.8, 100],
      [100, 100.1, 98.9, 99.2], // fill 99, stop 98.58 (0.42)
      [99.2, 99.7, 99.1, 99.6], // armed: stop 99.6 − 0.42 = 99.18
      [99.6, 99.8, 99.55, 99.75], // gap held: 99.75 − 0.42 = 99.33 (shrunk: 99.75 − 0.18 = 99.57); target 99.84
      [99.75, 99.75, 99.45, 99.6], // a 0.3 pullback stays above 99.33
    ];
    const r = run(bars, { hybrid: true, trailPct: 0.8 });
    assert.equal(r.trades.length, 0, `exited at ${r.trades[0]?.exit} (${r.trades[0]?.reason})`);
    assert.ok(Math.abs(r.open!.stop - 99.33) < 1e-9, `${r.open!.stop}`);
  });

  it("volume range: ATR × (1.15 − min(vol × 8, 0.45)), vol = ATR ÷ price ÷ 1.6", () => {
    assert.ok(Math.abs(axisSpacing("volume", 0.7, 100, 2) - 2 * 1.05) < 1e-12);
    assert.ok(Math.abs(axisSpacing("volume", 0.7, 10, 1) - 0.7) < 1e-12, "capped at 0.45");
    // desk ladder with the volume range: rung at 100 − 1.15 + 0.05 = 98.9 (vol 1/100/1.6)
    const r = run(
      [
        [100, 100.2, 99.8, 100],
        [100, 100, 98.85, 99],
      ],
      { range: "volume" },
    );
    assert.ok(Math.abs(r.open!.entry - (100 - 1 * (1.15 - 0.05))) < 1e-9, `${r.open?.entry}`);
  });

  it("no look-ahead: bars after a cut never change what was decided before it; SL ≤ TP ÷ ratio holds", () => {
    const full = barsFromCandles(
      "AAA",
      15,
      syntheticCandles("AAA", 15, 900, Date.UTC(2026, 8, 20)),
    );
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const sig = new Int8Array(full.n).map(() => {
      const x = rnd();
      return x < 0.1 ? 1 : x < 0.2 ? -1 : 0;
    });
    const cut = 600;
    const variant = (k: number) => {
      // the same bars up to the cut, a different future after it
      const f = (a: Float64Array) => a.map((v, i) => (i < cut ? v : v * k));
      return { ...full, o: f(full.o), h: f(full.h), l: f(full.l), c: f(full.c) };
    };
    const sim = (bb: typeof full, n = bb.n) => {
      const b2 = {
        ...bb,
        n,
        t: bb.t.slice(0, n),
        o: bb.o.slice(0, n),
        h: bb.h.slice(0, n),
        l: bb.l.slice(0, n),
        c: bb.c.slice(0, n),
        v: bb.v.slice(0, n),
      };
      const kk = new SeriesCache(b2);
      return simulateAxisDesk(
        "c",
        b2,
        sig.slice(0, n),
        P,
        { ...DK, levels: 3, spacing: 0.7, hybrid: true },
        kk.ema(50),
        kk.atr(14),
        0.001,
      );
    };
    const a = sim(full);
    const b = sim(variant(1.07));
    const pre = sim(full, cut);
    assert.ok(a.trades.length > 5, `${a.trades.length} trades`);
    const before = (xs: typeof a.trades) => xs.filter((t) => t.exitT <= full.t[cut - 1]);
    assert.deepEqual(before(b.trades), before(a.trades));
    assert.deepEqual(pre.trades, before(a.trades));
    for (const t of a.trades) {
      assert.ok(t.level! >= 0 && t.level! <= 2);
      assert.ok(t.exit > 0 && Number.isFinite(t.r));
    }
    if (pre.open) {
      const o = pre.open;
      const slD = o.side * (o.entry - o.stop);
      assert.ok(slD <= Math.abs(o.target - o.entry) / 2 + 1e-9, "SL ≤ TP ÷ ratio");
    }
  });
});

describe("axis: tapes per mode", () => {
  it("desk mode builds its own tagged sets beside the revert mode", () => {
    const u = makeUniverse([
      barsFromCandles("A-USDT", 15, syntheticCandles("A", 15, 700, Date.UTC(2026, 8, 20))),
    ]);
    const wf = defaultWalkForward({ ...DEFAULT_SETTINGS, tfMin: 15 });
    const only = new Set(
      allCombos()
        .slice(0, 3)
        .map((c) => `${c.bot}|${c.ind}`),
    );
    const axisIds = (axis: typeof DEFAULT_AXIS) =>
      buildTapes(u, [], 0.001, { protects: wf.dcaProtects, dca: wf.dca, axis }, only)
        .filter((t) => t.kind === "axis")
        .map((t) => t.id);
    assert.equal(DEFAULT_AXIS.mode, "revert");
    const rev = axisIds(DEFAULT_AXIS);
    assert.ok(rev.length > 0 && rev.every((id) => id.includes("|ax-")), rev[0]);
    const desk = buildTapes(
      u,
      [],
      0.001,
      {
        protects: wf.dcaProtects,
        dca: wf.dca,
        axis: { ...DEFAULT_AXIS, mode: "desk", ranges: ["atr", "volume"], hybrid: true },
      },
      only,
      null,
      null,
      { minSl: 0.005, minTrail: 0.005 },
    ).filter((t) => t.kind === "axis");
    assert.equal(desk.length, rev.length / 2, "2 ranges × 2 depths per pair");
    assert.ok(
      desk.every((t) => /\|axd-(atr|volume)[23]h\|/.test(t.id)),
      desk[0]?.id,
    );
    // open desk positions carry a concrete stop; one still behind the entry is at least the floor away
    for (const t of desk)
      for (const o of t.open) {
        assert.ok(Number.isFinite(o.stop) && Number.isFinite(o.target));
        const d = o.side * (o.entry - o.stop);
        assert.ok(d <= 0 || d >= 0.005 * o.entry - 1e-9, `${d}`);
      }
  });
});

describe("axis: signal strategy sets", () => {
  it("Axis per range: a pair that passed Minimal gets Minimal-tagged desk ladders with targets inside Minimal's band", async () => {
    const { protectGrid, axisRangeVariants } = await import("./walkforward.ts");
    const { rangeOfId, kindOfId } = await Promise.all([import("../minimal-coord.ts"), import("../pipeline/pipeline.ts")]).then(
      ([m, p]) => ({ rangeOfId: m.rangeOfId, kindOfId: p.kindOfId }),
    );
    const u = makeUniverse([
      barsFromCandles("A-USDT", 15, syntheticCandles("A", 15, 700, Date.UTC(2026, 8, 20))),
    ]);
    const wf = defaultWalkForward({ ...DEFAULT_SETTINGS, tfMin: 15 });
    const grid = protectGrid(15, DEFAULT_SETTINGS.grid, 0.002);
    const combo = allCombos()[0];
    const key = `${combo.bot}|${combo.ind}`;
    const axis = { ...DEFAULT_AXIS, perRange: true, ranges: ["atr", "fib"] as AxisConfig["ranges"] };
    // the variants: one per spacing type, the stop band = Minimal's targets ÷ tpRatio
    const vs = axisRangeVariants(axis, grid, ["mn"]);
    assert.equal(vs.length, 2);
    const mnTps = grid.filter((p) => p.tag === "mn").map((p) => p.tp);
    const ratio = snapTpRatio(axis.tpRatio ?? 2.2);
    assert.ok(Math.abs(vs[0].maxSl - Math.max(...mnTps) / ratio) < 1e-6, `${vs[0].maxSl}`);
    assert.ok(Math.abs(vs[0].minSl - Math.min(...mnTps) / ratio) < 1e-6, `${vs[0].minSl}`);
    const build = (tags: string[]) =>
      buildTapes(u, grid, 0.002, { protects: wf.dcaProtects, dca: wf.dca, axis }, new Set([key]), null, null, {
        minSl: 0.005,
        minTrail: 0.005,
        pairTags: { [key]: tags },
      } as never);
    const onlyMn = build(["mn"]);
    const ax = onlyMn.filter((t) => t.kind === "axis");
    assert.ok(ax.length === 2, ax.map((t) => t.id).join(" "));
    for (const t of ax) {
      assert.equal(rangeOfId(t.id), "mn", t.id);
      assert.equal(kindOfId(t.id), "axis");
      assert.equal(t.protect.tag, "mn");
      for (let i = 0; i < t.n; i++) assert.ok(Number.isFinite(t.r[i]));
    }
    // no Wide pass: no Wide (untagged) Axis or DCA ladders
    assert.equal(onlyMn.filter((t) => (t.kind === "axis" || t.kind.startsWith("dca")) && !t.protect.tag).length, 0);
    // with Wide passed as well, the Wide ladders come back beside the Minimal ones
    const both = build(["", "mn"]);
    assert.ok(both.some((t) => t.kind === "axis" && !t.protect.tag));
    assert.ok(both.some((t) => t.kind === "dca" && !t.protect.tag));
    assert.equal(both.filter((t) => t.kind === "axis" && t.protect.tag === "mn").length, 2);
  });

  it("noDca builds the Axis sets without the DCA sets; signals run Normal + Trailing by default", () => {
    const u = makeUniverse([
      barsFromCandles("A-USDT", 15, syntheticCandles("A", 15, 700, Date.UTC(2026, 8, 20))),
    ]);
    const wf = defaultWalkForward({ ...DEFAULT_SETTINGS, tfMin: 15 });
    const only = new Set(
      allCombos()
        .slice(0, 2)
        .map((c) => `${c.bot}|${c.ind}`),
    );
    const kinds = (noDca: boolean) =>
      new Set(
        buildTapes(
          u,
          [],
          0.001,
          { protects: wf.dcaProtects, dca: wf.dca, axis: DEFAULT_AXIS, noDca },
          only,
        ).map((t) => t.kind),
      );
    assert.deepEqual([...kinds(false)].sort(), ["axis", "dca", "dca-active"]);
    assert.deepEqual([...kinds(true)], ["axis"]);
    assert.deepEqual(signalSettings({}).strategies, { dca: false, axis: false });
    assert.deepEqual(signalSettings({ strategies: { dca: false, axis: true } }).strategies, {
      dca: false,
      axis: true,
    });
  });
});

describe("axis: conservative intrabar order (a stop the bar reaches goes before a rung at or beyond it)", () => {
  const P1 = { tp: 0.01, sl: 0.01, trail: 0, hold: 50 };
  const REV = {
    levels: 2,
    spacing: 0.7,
    ratio: 1,
    minDisp: 0.35,
    maxDisp: 2.6,
    center: 50,
    range: "atr" as const,
    exits: "managed" as const,
  };
  const flat = (n: number, v: number) => new Float64Array(n).fill(v);
  const sig1 = (n: number, s = 1) => {
    const x = new Int8Array(n);
    x[0] = s;
    return x;
  };
  const near = (a: number, b: number, msg = "") =>
    assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b} ${msg}`);

  it("revert: a bar through the stop and the rung at it stops out (no phantom rung, no loosened stop)", () => {
    // base 99 (axis 99.6, ATR 1): step 0.7, stop 98.3, rung 98.3; bar 2 trades down to 98.25, then the market rallies
    const rows: Array<[number, number, number, number]> = [
      [99, 99.1, 98.9, 99],
      [99, 99.05, 98.95, 99],
      [99, 99.0, 98.25, 98.4],
      [98.4, 98.9, 98.3, 98.8],
      [98.8, 99.9, 98.7, 99.8],
    ];
    const b = barsFromCandles("X", 15, mk(rows));
    const run = (levels: number) =>
      simulateAxis("c", b, sig1(b.n), P1, { ...REV, levels }, flat(b.n, 99.6), flat(b.n, 1), 0.001)
        .trades;
    const one = run(1);
    const two = run(2);
    assert.equal(two.length, 1);
    assert.equal(two[0].reason, "sl");
    near(two[0].exit, 98.3);
    near(two[0].entry, 99);
    assert.equal(two[0].vol, 1, "the rung at the stop never filled");
    assert.equal(two[0].level, 0);
    near(two[0].r, (98.3 - 99) / 99 - 0.001);
    assert.deepEqual(two, one, "a rung at the stop changes nothing");
  });

  it("revert: the axis-100 repro stops out at 98.3 instead of holding a phantom second leg", () => {
    const rows: Array<[number, number, number, number]> = [
      [99, 99.1, 98.9, 99],
      [99, 99.05, 98.95, 99],
      [99, 99.0, 98.2, 98.4],
      [98.4, 98.6, 98.3, 98.5],
      [98.5, 98.6, 98.4, 98.5],
    ];
    const b = barsFromCandles("X", 15, mk(rows));
    const r = simulateAxis("c", b, sig1(b.n), P1, REV, flat(b.n, 100), flat(b.n, 1), 0.001);
    assert.equal(r.trades.length, 1);
    assert.equal(r.trades[0].reason, "sl");
    near(r.trades[0].exit, 98.3);
    assert.equal(r.trades[0].vol, 1);
    assert.equal(r.open, null);
  });

  it("revert fixed exits: rungs above the stop still fill on the stop bar, exit at the stop below them", () => {
    // fixed: stop beyond the last rung (97.5 × 0.99), so the rung (97.5) fills on the way to the stop
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 96, 96.2],
        [96.2, 96.3, 96, 96.1],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0]), P, AX, flat(3, 100), flat(3, 1), 0.002);
    assert.equal(r.trades[0].reason, "sl");
    assert.equal(r.trades[0].vol, 2);
    near(r.trades[0].exit, 97.5 * 0.99);
    assert.ok(r.trades[0].exit < 97.5, "never an exit above a fill of the same bar");
  });

  const DK: AxisConfig = {
    levels: 3,
    spacing: 0.7,
    ratio: 1,
    minDisp: 0.35,
    maxDisp: 2.6,
    center: 50,
    mode: "desk",
    range: "atr",
    slAtr: 0.7,
    tpRatio: 2.2,
  };
  const desk = (
    rows: Array<[number, number, number, number]>,
    side = 1,
    floor?: { minSl: number; minTrail: number },
  ) => {
    const b = barsFromCandles("X", 15, mk(rows));
    return simulateAxisDesk(
      "c",
      b,
      sig1(b.n, side),
      P1,
      DK,
      flat(b.n, 100),
      flat(b.n, 1),
      0.001,
      0,
      floor,
    );
  };

  it("desk: rung 2 beyond the first fill's stop never fills; the trade exits at that stop", () => {
    // rungs 99.3 / 98.6 / 97.9, SL 0.35 → after the 99.3 fill the stop is 98.95, inside rung 2
    const r = desk([
      [100.5, 100.6, 100.4, 100.5],
      [100.4, 100.4, 99.2, 99.3],
      [99.2, 99.3, 98.5, 98.6],
      [98.6, 98.7, 98.5, 98.6],
    ]);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.reason, "sl");
    near(t.entry, 99.3);
    near(t.exit, 98.95);
    assert.equal(t.vol, 1);
    assert.equal(t.level, 0);
    near(t.r, (98.95 - 99.3) / 99.3 - 0.001);
    assert.equal(r.open, null, "the unfilled rungs went with the position");
  });

  it("desk short: the mirror image", () => {
    const r = desk(
      [
        [99.5, 99.6, 99.4, 99.5],
        [99.6, 100.8, 99.6, 100.7],
        [100.8, 101.5, 100.7, 101.4],
        [101.4, 101.5, 101.3, 101.4],
      ],
      -1,
    );
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.reason, "sl");
    near(t.entry, 100.7);
    near(t.exit, 101.05);
    assert.equal(t.vol, 1);
    near(t.r, (100.7 - 101.05) / 100.7 - 0.001);
  });

  it("desk: rungs on the same bar as the first fill cannot fill beyond its stop either", () => {
    // one bar from above the axis through 99.3, 98.6 and 97.9: the 99.3 fill's stop (98.95) goes first
    const r = desk([
      [100.5, 100.6, 100.4, 100.5],
      [100.4, 100.4, 97.8, 98],
    ]);
    assert.equal(r.trades.length, 1);
    assert.equal(r.trades[0].vol, 1);
    near(r.trades[0].exit, 98.95);
  });

  it("desk: a rung above the stop fills on the stop bar and exits at the stop in force before it (below the fill)", () => {
    // minSl 1.5 %: SL ≈ 1.49 > spacing, so rungs 2 and 3 (98.6, 97.9) rest above the 99.3 fill's stop (97.81)
    const r = desk(
      [
        [100.5, 100.6, 100.4, 100.5],
        [100.4, 100.4, 99.2, 99.3],
        [99.2, 99.3, 97.7, 97.8],
        [97.8, 97.9, 97.7, 97.8],
      ],
      1,
      { minSl: 0.015, minTrail: 0 },
    );
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.reason, "sl");
    assert.equal(t.vol, 3, "98.6 and 97.9 filled on the way down");
    const stop = 99.3 - 0.015 * 99.3;
    near(t.exit, stop);
    assert.ok(t.exit < 97.9, "the exit is never better than a fill of the same bar");
    near(
      t.r,
      (stop - 99.3) / 99.3 + (stop - 98.6) / 98.6 + (stop - 97.9) / 97.9 - 3 * 0.001,
    );
  });
});

describe("axis: ladder weight on open positions (paper / live volume)", () => {
  const flat = (n: number, v: number) => new Float64Array(n).fill(v);
  const P1 = { tp: 0.01, sl: 0.01, trail: 0, hold: 50 };

  it("desk: an open two-rung ladder carries w = 2 and a per-unit mark; paper volume = Block multiple × w", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100.5, 100.6, 100.4, 100.5],
        [100.4, 100.4, 99.2, 99.3], // 99.3 fills, stop 97.81 (minSl 1.5 %)
        [99.2, 99.3, 98.5, 98.9], // 98.6 fills above the stop
      ]),
    );
    const ax: AxisConfig = {
      levels: 3,
      spacing: 0.7,
      ratio: 1,
      minDisp: 0.35,
      maxDisp: 2.6,
      center: 50,
      mode: "desk",
      range: "atr",
      slAtr: 0.7,
      tpRatio: 2.2,
    };
    const r = simulateAxisDesk(
      "c",
      b,
      new Int8Array([1, 0, 0]),
      P1,
      ax,
      flat(3, 100),
      flat(3, 1),
      0.001,
      0,
      { minSl: 0.015, minTrail: 0 },
    );
    assert.equal(r.trades.length, 0);
    const op = r.open!;
    assert.ok(op);
    assert.equal(op.w, 2);
    assert.ok(Math.abs(op.entry - 98.95) < 1e-9);
    const ladder = (98.9 - 99.3) / 99.3 - 0.001 + (98.9 - 98.6) / 98.6 - 0.001;
    assert.ok(Math.abs(op.mtm * 2 - ladder) < 1e-12, "mtm is per unit (the ladder's result ÷ its weight)");
    // the tape's marked-open order carries the whole ladder, as a closed Axis order does (r and vol include w)
    const tp = makeTape("c", "momentum" as never, "i", P1, "axis", ["X"], [], [op], []);
    const mo = markedOpenTrade(tp, op, 1);
    assert.equal(mo.vol, 2);
    assert.ok(Math.abs(mo.r - ladder) < 1e-12);
    // paper: volume = execution multiple × ladder weight; the multiple is recovered for held positions and closes
    assert.equal(positionVolume(1.5, op), 3);
    assert.equal(positionVolume(1.5, {}), 1.5);
    assert.equal(positionMult({ vol: 3, w: 2 }), 1.5);
    assert.equal(positionMult({ vol: 1.5 }), 1.5);
    // $ at the mark: per-unit mtm × paper volume = ladder result × multiple (not doubled)
    assert.ok(Math.abs(op.mtm * positionVolume(1.5, op) - ladder * 1.5) < 1e-12);
  });

  it("revert: a position still open at the last close is returned (stop, target, weight, per-unit mark)", () => {
    const AXF = {
      levels: 2,
      spacing: 1,
      ratio: 1,
      minDisp: 0.35,
      maxDisp: 2.6,
      center: 50,
      exits: "fixed" as const,
    };
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 97.4, 97.6], // base 98.5, rung 97.5 fills
        [97.6, 98, 97.5, 97.9],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0]), P, AXF, flat(3, 100), flat(3, 1), 0.002);
    assert.equal(r.trades.length, 0);
    const op = r.open!;
    assert.ok(op, "revert returns its open position");
    assert.equal(op.w, 2);
    assert.equal(op.side, 1);
    assert.equal(op.entryI, 1);
    assert.equal(op.entry, 98);
    assert.ok(Math.abs(op.stop - 97.5 * 0.99) < 1e-9);
    assert.equal(op.target, 100);
    const ladder = (97.9 - 98.5) / 98.5 - 0.002 + (97.9 - 97.5) / 97.5 - 0.002;
    assert.ok(Math.abs(op.mtm * 2 - ladder) < 1e-12);
    // a single leg: w = 1, marked from its fill
    const b1 = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 98, 98.2],
        [98.2, 98.4, 98.1, 97.9],
      ]),
    );
    const one = simulateAxis(
      "c",
      b1,
      new Int8Array([1, 0, 0]),
      P,
      { ...AXF, levels: 1 },
      flat(3, 100),
      flat(3, 1),
      0.002,
    );
    assert.equal(one.open?.w, 1);
    assert.ok(Math.abs(one.open!.mtm - ((97.9 - 98.5) / 98.5 - 0.002)) < 1e-12);
  });

  it("revert tapes carry their open positions (paper holds them, live mirrors them)", () => {
    const candles = syntheticCandles("A", 15, 700, Date.UTC(2026, 8, 20));
    const wf = defaultWalkForward({ ...DEFAULT_SETTINGS, tfMin: 15 });
    const only = new Set(
      allCombos()
        .slice(0, 3)
        .map((c) => `${c.bot}|${c.ind}`),
    );
    const revert = (cs: Candle[]) =>
      buildTapes(
        makeUniverse([barsFromCandles("A-USDT", 15, cs)]),
        [],
        0.001,
        { protects: wf.dcaProtects, dca: wf.dca, axis: DEFAULT_AXIS },
        only,
      ).filter((t) => t.kind === "axis");
    // the latest revert trade of the full run that lasted ≥ 3 bars, cut 2 bars after its entry: open at the cut's
    // last close (no look-ahead: the prefix run takes the same entry)
    const full = revert(candles);
    const last = full
      .flatMap((t) => Array.from({ length: t.n }, (_, i) => ({ t, i })))
      .filter((x) => x.t.bars[x.i] >= 3)
      .sort((a, b) => b.t.entryT[b.i] - a.t.entryT[a.i])[0];
    assert.ok(last, "a revert trade lasting ≥ 3 bars");
    const entryT = last.t.entryT[last.i];
    const cut = candles.findIndex((c) => c.t === entryT) + 2;
    const pre = revert(candles.slice(0, cut));
    const same = pre.find((t) => t.id === last.t.id);
    assert.ok(same, last.t.id);
    const op = same.open.find((o) => o.entryT === entryT);
    assert.ok(op, `revert position entered ${entryT} not carried open on its tape`);
    assert.ok(Number.isFinite(op.stop) && Number.isFinite(op.target) && Number.isFinite(op.mtm));
    assert.equal(op.side, last.t.side[last.i]);
    assert.ok((op.w ?? 0) >= 1);
    assert.ok(op.side * (op.target - op.entry) > 0, "target ahead of the entry");
  });
});

describe("axis: golden outputs (skipping flat, signal-free bars must not change a trade)", () => {
  // deterministic inputs: synthetic bars, a sparse signal (≈ 4 % of bars), axis = 20-bar mean of the close, ATR =
  // 14-bar mean range; each Axis mode / exit style runs on the same tape
  const b = barsFromCandles("GOLD", 15, syntheticCandles("GOLD", 15, 2400, Date.UTC(2026, 8, 20)));
  const center = new Float64Array(b.n);
  const atr = new Float64Array(b.n);
  for (let i = 0; i < b.n; i++) {
    let sc = 0;
    let sr = 0;
    for (let j = Math.max(0, i - 19); j <= i; j++) sc += b.c[j];
    center[i] = sc / (i - Math.max(0, i - 19) + 1);
    for (let j = Math.max(0, i - 13); j <= i; j++) sr += b.h[j] - b.l[j];
    atr[i] = Math.max(sr / (i - Math.max(0, i - 13) + 1), 1e-6);
  }
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const sig = new Int8Array(b.n);
  for (let i = 0; i < b.n; i++) if (rnd() < 0.04) sig[i] = rnd() < 0.5 ? 1 : -1;
  const digest = (r: unknown) => createHash("sha256").update(JSON.stringify(r)).digest("hex");
  const CASES: Array<[string, () => unknown]> = [
    ["revert, managed exits", () => simulateAxis("g", b, sig, P, { ...AX, range: "atr", exits: "managed" }, center, atr, 0.002, 0)],
    ["revert, fixed exits, cooldown 4", () => simulateAxis("g", b, sig, P, { ...AX, range: "geo", exits: "fixed" }, center, atr, 0.002, 4)],
    [
      "desk, atr ladder",
      () => simulateAxisDesk("g", b, sig, P, { ...AX, mode: "desk", range: "atr", slAtr: 0.7, tpRatio: 2, levels: 3, expiry: 6 }, center, atr, 0.002, 0),
    ],
    [
      "desk, linear ladder, hybrid trail",
      () =>
        simulateAxisDesk(
          "g",
          b,
          sig,
          P,
          { ...AX, mode: "desk", range: "linear", slAtr: 0.7, tpRatio: 2.2, levels: 4, expiry: 9, hybrid: true },
          center,
          atr,
          0.002,
          2,
          { minSl: 0.002, minTrail: 0.001 },
        ),
    ],
  ];
  // the digests of the simulator before the skip over flat bars existed (recorded on the unchanged code)
  const GOLDEN: Record<string, string> = {
    "revert, managed exits": "0f730aaef357788a25b94e3cea3a2185d583fbf367071028f22a4b04fa3a0c13",
    "revert, fixed exits, cooldown 4": "685f48ec9c7fadf05d36635895fd85a7fa2ca7d116257b0ddef4787214c9c22c",
    "desk, atr ladder": "958735f39916705177d4645b03c3b530fe27aacccf0b589e1e1bffd4b844794c",
    "desk, linear ladder, hybrid trail": "63811e6ac7da3f62515e6e8bafe3f6650151e55d55193d4b0ed9e8b2c0e400cb",
  };
  it("every case reproduces its recorded digest", () => {
    const got: Record<string, string> = {};
    for (const [name, run] of CASES) got[name] = digest(run());
    assert.deepEqual(got, GOLDEN);
  });
  it("the cases trade (the golden set is not vacuous)", () => {
    for (const [name, run] of CASES) {
      const r = run() as { trades: unknown[]; open: unknown };
      assert.ok(r.trades.length + (r.open ? 1 : 0) > 0, `${name} traded nothing`);
    }
  });
});
