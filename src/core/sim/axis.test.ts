import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
import { buildTapes, defaultWalkForward } from "./walkforward.ts";
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
    assert.equal(r.trades[0].reason, "sl");
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
    assert.equal(t.level, 1);
    assert.equal(t.entry, 99);
    assert.ok(Math.abs(t.exit - 99.84) < 1e-9, `${t.exit}`);
    assert.ok(Math.abs(t.r - ((99.84 - 99) / 99 - 0.002)) < 1e-12);
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

  it("rungs fill before the stop; a later fill never loosens the stop", () => {
    const r = run([
      [100, 100.2, 99.8, 100],
      [100, 100, 97.9, 98.2], // both rungs (99, 98) fill, then the stop of the first (98.58)
    ]);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.reason, "sl");
    assert.equal(t.level, 2);
    assert.equal(t.vol, 2);
    assert.equal(t.entry, 98.5);
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
      assert.ok(t.level! >= 1 && t.level! <= 3);
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
