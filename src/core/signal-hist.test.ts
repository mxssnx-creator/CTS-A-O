// A signal's historic trailing configs (signal-hist.ts): the move its own past entries reached (MFE), hand-computed;
// causal at the stage cut; on the 0.25 % grid; built, per pair, by the tape builder beside the shared configs.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  entryMfes,
  heldHistProtects,
  heldSignalProtect,
  HIST_MIN_TP,
  emptySignalHistDiagnostics,
  quantileSorted,
  signalHistProtects,
  signalHistProtectsGen,
  signalHistPassingRanges,
  signalHistHoldH,
  signalHistValidationOf,
  signalMfe,
} from "./signal-hist.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { closePool, runOnWorkers, type SignalHistReply } from "./server/pool.server.ts";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { SIGNAL_SOURCES } from "./signal-config.ts";
import { signalCoordinationId } from "./signal-coordination.ts";
import { DEFAULT_TACTICS } from "./config.ts";
import { signalProtects } from "./signals.ts";
import { configId, laneProtect, makeUniverse } from "./pipeline/pipeline.ts";
import { buildTapes } from "./sim/walkforward.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import type { Bars, Protect } from "./domain/types.ts";

const T0 = Date.UTC(2026, 8, 20);
const M15 = 15 * 60_000;

/** 15m bars from explicit (o, h, l, c) rows */
function rows(xs: ReadonlyArray<readonly [number, number, number, number]>): Bars {
  const n = xs.length;
  const b: Bars = {
    sym: "A-USDT",
    tfMin: 15,
    n,
    t: new Float64Array(n),
    o: new Float64Array(n),
    h: new Float64Array(n),
    l: new Float64Array(n),
    c: new Float64Array(n),
    v: new Float64Array(n).fill(1000),
  };
  xs.forEach(([o, h, l, c], i) => {
    b.t[i] = T0 + i * M15;
    b.o[i] = o;
    b.h[i] = h;
    b.l[i] = l;
    b.c[i] = c;
  });
  return b;
}

describe("signal historic trailing configs", () => {
  it("applies the independent PF floor of each coordinator exit range", () => {
    assert.deepEqual(signalHistPassingRanges(1.3, 1.1), [undefined], "classic Signals keep their untagged floor");
    assert.deepEqual(
      signalHistPassingRanges(1.3, 1.1, { sh: 1.05, gn: 1.25, lg: 1.35 }),
      ["sh", "gn"],
      "only the ranges whose own PF floor passes receive the historic config",
    );
    assert.deepEqual(signalHistPassingRanges(1.3, 1.1, {}), [], "no enabled coordinator ranges means no tagged history");
    assert.deepEqual(signalHistPassingRanges(1.02, 1.1, { sh: 1.05, gn: 1.25, lg: 1.35 }), []);
  });

  it("tags historic coordinator configs only for ranges that clear their own PF floor", () => {
    const b = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 3000, Date.UTC(2026, 9, 1), 3),
    );
    const u = makeUniverse([b]);
    const ind =
      signalCoordinationId(
        SIGNAL_SOURCES.slice(0, 3).map((source) => source.name),
        0.65,
        3,
        1,
      ) + "@m15";
    const pair = "follow|" + ind;
    const sig = {
      ...DEFAULT_SIGNALS,
      hist: { ...DEFAULT_SIGNALS.hist, lookbackH: 0, minN: 1 },
    };
    const diagnostics = emptySignalHistDiagnostics();
    const gen = signalHistProtectsGen(
      u,
      [pair],
      sig,
      DEFAULT_TACTICS,
      u.nowT,
      {
        cost: 0.002,
        minPf: 0,
        minTrades: 1,
        maxDdr: 1000,
        rangeMinPf: { sh: 0, gn: 1e9, lg: 1e9 },
      },
      diagnostics,
    );
    let result = gen.next();
    while (!result.done) result = gen.next();
    const configs = result.value[pair] ?? [];
    assert.ok(configs.length > 0, "permissive Short floor admits calculated historic configs");
    assert.ok(configs.every((protect) => protect.tag === "sh"));
    assert.equal(diagnostics.qualified, configs.length);

    const disabledDiagnostics = emptySignalHistDiagnostics();
    const disabledGen = signalHistProtectsGen(
      u,
      [pair],
      sig,
      DEFAULT_TACTICS,
      u.nowT,
      { cost: 0.002, minPf: 0, minTrades: 1, maxDdr: 1000, rangeMinPf: {} },
      disabledDiagnostics,
    );
    let disabledResult = disabledGen.next();
    while (!disabledResult.done) disabledResult = disabledGen.next();
    assert.deepEqual(disabledResult.value[pair] ?? [], [], "disabled coordinator ranges never fall back to untagged configs");
    assert.equal(disabledDiagnostics.qualified, 0);
  });

  it("the MFE of each entry: from the next bar's open over the hold, long on highs, short on lows (hand-computed)", () => {
    const b = rows([
      [100, 101, 99, 100], // 0: long signal
      [100, 103, 99.5, 102], // 1: entry at 100, high 103
      [102, 104, 101, 103], // 2: high 104 → MFE 4 %
      [103, 103.5, 98, 99], // 3: past a 2-bar hold
      [99, 99.5, 97, 98], // 4: short signal on bar 3 → entry 99
      [98, 98.5, 95, 96], // 5: low 95 → 1 − 95 / 99
      [96, 97, 96, 97],
    ]);
    const sig = new Int8Array([1, 0, 0, -1, 0, 0, 0]);
    const m = entryMfes(b, sig, 2, Infinity);
    assert.equal(m.length, 2);
    assert.ok(Math.abs(m[0] - 0.04) < 1e-12, `${m[0]}`);
    assert.ok(Math.abs(m[1] - (1 - 95 / 99)) < 1e-12, `${m[1]}`);
    // causal: an entry whose hold has not closed by the cut is not read (bar 5 closes at T0 + 6 × 15 min)
    assert.equal(entryMfes(b, sig, 2, T0 + 6 * M15 - 1).length, 1);
    assert.equal(entryMfes(b, sig, 2, T0 + 6 * M15).length, 2);
    // a move that never goes the entry's way: MFE 0
    assert.deepEqual(
      entryMfes(
        rows([
          [100, 100, 99, 99],
          [99, 99, 98, 98],
          [98, 98, 97, 97],
          [97, 97, 96, 96],
        ]),
        new Int8Array([1, 0, 0, 0]),
        2,
        Infinity,
      ),
      [0],
    );
  });

  it("quantiles interpolate between neighbours", () => {
    assert.equal(quantileSorted([1, 2, 3, 4, 5], 0.5), 3);
    assert.equal(quantileSorted([1, 2, 3, 4], 0.5), 2.5);
    assert.equal(quantileSorted([0, 10], 0.75), 7.5);
    assert.ok(Number.isNaN(quantileSorted([], 0.5)));
  });

  it("caps the historic hold to one quarter of the available minimal sample", () => {
    assert.equal(signalHistHoldH(48, 6, 15), 1.5);
    assert.equal(signalHistHoldH(48, 6, 1), 1.5, "faster lanes retain the same wall-clock hold");
    assert.equal(signalHistHoldH(6, 48, 15), 6, "a configured short hold is not lengthened");
    assert.equal(signalHistHoldH(48, 0.25, 15), 0.5, "at least two bars are needed for a hold");
  });

  it("each signal gets targets at its MFE quantiles on the 0.25 % grid, every trail × stop, the floors held", () => {
    const sym = (s: string, seed: number) =>
      barsFromCandles(s, 15, syntheticCandles(s, 15, 3000, Date.UTC(2026, 9, 1), seed));
    const u = makeUniverse([sym("A-USDT", 3), sym("B-USDT", 5)]);
    const sig = signalSettings({ enabled: true });
    const pair = "follow|sig-ema-cross-s@m15";
    const cut = u.nowT;
    const out = signalHistProtects(u, [pair], sig, null, cut);
    const ps = out[pair];
    assert.ok(ps?.length, "configs of its own");
    // the MFE quantiles, by hand from the same entries
    const mfe = signalMfe(
      u,
      "follow",
      "sig-ema-cross-s@m15",
      sig.holdH,
      null,
      cut,
      sig.filter,
    ).sort((a, b) => a - b);
    assert.ok(mfe.length >= sig.hist.minN);
    const grid = (x: number) => +(Math.round(x / 0.0025) * 0.0025).toFixed(4);
    const tps = [
      ...new Set(
        sig.hist.quantiles.map((q) => Math.max(HIST_MIN_TP, grid(quantileSorted(mfe, q)))),
      ),
    ];
    assert.deepEqual([...new Set(ps.map((p) => p.tp))].sort(), tps.sort());
    for (const p of ps) {
      assert.ok(p.trail > 0, "every historic config trails");
      assert.ok(p.sl >= sig.minSl && p.trail >= sig.minTrail);
      assert.equal(+(p.tp / 0.0025).toFixed(6) % 1, 0, `${p.tp} on the grid`);
      assert.equal(p.hold, Math.round((sig.holdH * 60) / 15));
    }
    // up to quantiles × trails × stops per signal
    assert.ok(
      ps.length <= sig.hist.quantiles.length * sig.hist.trailOfTp.length * sig.hist.slOfTp.length,
    );
    // too few historic entries: none; switched off: none
    assert.deepEqual(
      signalHistProtects(u, [pair], { ...sig, hist: { ...sig.hist, minN: 1_000_000 } }, null, cut),
      {},
    );
    assert.deepEqual(
      signalHistProtects(u, [pair], { ...sig, hist: { ...sig.hist, enabled: false } }, null, cut),
      {},
    );
    const diagnostics = emptySignalHistDiagnostics();
    const gated = signalHistProtectsGen(u, [pair], sig, null, cut, {
      cost: 0.002,
      minPf: 1e9,
      minTrades: 3,
      maxDdr: 0,
    }, diagnostics);
    let result = gated.next();
    while (!result.done) result = gated.next();
    assert.deepEqual(result.value, {}, "each custom config must clear its own historical PF gate");
    assert.ok(diagnostics.evaluated > 0);
    assert.equal(diagnostics.qualified, 0);
    assert.equal(diagnostics.pfRejected, diagnostics.evaluated);
    // nothing before the cut, nothing to learn from
    assert.deepEqual(signalHistProtects(u, [pair], sig, null, u.bars[0].t[0]), {});
  });

  it("historic preparation retains stage PF and stricter custom floors on local and worker paths", async () => {
    // A deterministic threshold fixture, not a strategy search: both single-protect configs have enough closes.
    // The same nonzero cost applies to the measured tape and both historical preparation paths.
    const cost = 0.0001;
    const bars = [3, 5].map((seed) => barsFromCandles(`${seed}-USDT`, 15,
      syntheticCandles(`${seed}-USDT`, 15, 600, Date.UTC(2026, 9, 1), seed)));
    const u = makeUniverse(bars);
    const sig = signalSettings({ enabled: true, holdH: 1, filter: { trendH: 0, volFloor: 0 },
      hist: { ...DEFAULT_SIGNALS.hist, quantiles: [0.5], slOfTp: [1], trailOfTp: [0.5] } });
    const low = "follow|sig-rsi-mid-s@m15";
    const middle = "follow|sig-donchian-s@m15";
    const pairs = [low, middle];
    const candidates = signalHistProtects(u, pairs, sig, null, u.nowT);
    const pfOf = (pair: string) => {
      const [tp] = buildTapes(u, candidates[pair], cost, undefined, new Set([pair]), null, undefined,
        { minSl: sig.minSl, minTrail: sig.minTrail });
      assert.ok(tp && tp.n >= Math.max(sig.hist.minN, DEFAULT_SETTINGS.gates.minTrades));
      return tp.gp[tp.n] / tp.gl[tp.n];
    };
    const lowPf = pfOf(low), middlePf = pfOf(middle);
    assert.ok(lowPf > 1 && lowPf < 1.1, `boundary fixture PF ${lowPf}`);
    assert.ok(middlePf > 1.1 && middlePf < 1.3, `stricter-floor fixture PF ${middlePf}`);
    const stage = signalHistValidationOf(cost, { ...DEFAULT_SETTINGS.gates, minPf: 1.1, baseSetsMinPf: 1, maxDdr: 0 });
    const stricter = signalHistValidationOf(cost, { ...DEFAULT_SETTINGS.gates, minPf: 1.1, baseSetsMinPf: 1.3, maxDdr: 0 });
    assert.equal(stage.minPf, 1.1);
    assert.equal(stricter.minPf, 1.3);
    assert.equal(signalHistValidationOf(cost, { ...DEFAULT_SETTINGS.gates, minPf: 1.5, baseSetsMinPf: 1.3 }).minPf, 1.5);
    const oldPrefilter = signalHistProtects(u, pairs, sig, null, u.nowT, { ...stage, minPf: 1 });
    assert.deepEqual(Object.keys(oldPrefilter).sort(), [...pairs].sort(), "the former engine Wide floor admitted both");
    try {
      for (const validation of [stage, stricter]) {
        const local = signalHistProtects(u, pairs, sig, null, u.nowT, validation);
        assert.deepEqual(Object.keys(local), validation.minPf === 1.1 ? [middle] : []);
        const [remote] = await runOnWorkers<SignalHistReply>([{ type: "signal-hist", bars, pairs, sig,
          tactics: null, cutT: u.nowT, validation }], 1, 60_000);
        assert.deepEqual(remote.pairProtects, local, "workers enforce the identical serialized validation contract");
        assert.ok((remote.diagnostics?.pfRejected ?? 0) >= 1);
      }
    } finally { await closePool(); }
  });

  it("the tape builder builds a pair's own configs for that pair only, each its own tape", () => {
    const sym = (s: string, seed: number) =>
      barsFromCandles(s, 15, syntheticCandles(s, 15, 1500, Date.UTC(2026, 9, 1), seed));
    const u = makeUniverse([sym("A-USDT", 3)]);
    const shared: Protect[] = [{ tp: 0.03, sl: 0.06, trail: 0, hold: 192 }];
    const own: Protect[] = [{ tp: 0.0125, sl: 0.0125, trail: 0.005, hold: 192 }];
    const a = "follow|sig-ema-cross-s@m15";
    const b = "follow|sig-donchian-s@m15";
    const tapes = buildTapes(u, shared, 0.002, undefined, new Set([a, b]), null, undefined, {
      minSl: 0,
      minTrail: 0,
      pairProtects: { [a]: own },
    });
    const ids = (pair: string) =>
      tapes
        .filter((t) => `${t.bot}|${t.ind}` === pair)
        .map((t) => t.protect.tp)
        .sort();
    assert.deepEqual(ids(a), [0.0125, 0.03]);
    assert.deepEqual(ids(b), [0.03]);
  });

  it("deactivates a signal trail that falls under the minimum after lane scaling", () => {
    const b = barsFromCandles("A-USDT", 1, syntheticCandles("A", 1, 600, Date.UTC(2026, 9, 1), 31));
    const u = makeUniverse([b]);
    const pair = "follow|sig-ema-cross-s@m1";
    const buildStats = new Map();
    const tapes = buildTapes(
      u,
      [{ tp: 0.03, sl: 0.06, trail: 0.01, hold: 192 }],
      0.002,
      undefined,
      new Set([pair]),
      null,
      undefined,
      { minSl: 0, minTrail: 0.005, buildStats },
    );
    assert.deepEqual(tapes, [], "lane-scaled trail is omitted instead of widened to 0.5 %");
    assert.equal(buildStats.get("sig-ema-cross-s@m1||trailing")?.skip.trailTooShort, 1);
  });

  it("a held historic config rebuilds exactly its own id (its open position keeps its tape)", () => {
    // the sub-15m lanes apply the soft floor: the held reference is found by inverting it, not by dividing by √(tf/15)
    for (const ind of [
      "sig-ema-cross-s@m1",
      "sig-ema-cross-s@m5",
      "sig-ema-cross-s@m15",
      "sig-ema-cross-s@m30",
    ]) {
      const ref: Protect = { tp: 0.0175, sl: 0.035, trail: 0.0075, hold: 192 };
      const id = configId("follow", ind, laneProtect(ref, ind));
      const h = heldSignalProtect(id);
      assert.ok(h, id);
      assert.equal(h.pair, `follow|${ind}`);
      assert.equal(configId("follow", ind, laneProtect(h.protect, ind)), id);
    }
    // a plain (untrailed) config, an ATR one or a range cell is not a historic config
    assert.equal(
      heldSignalProtect(
        configId("follow", "sig-ema-cross-s@m15", { tp: 0.03, sl: 0.06, trail: 0, hold: 192 }),
      ),
      null,
    );
  });

  it("only a historic config with an open position is rebuilt; a seated one and the standard configs are not (no pile-up)", () => {
    const sig = signalSettings({ enabled: true });
    const ind = "sig-ema-cross-s@m15";
    const pair = `follow|${ind}`;
    const hist: Protect = { tp: 0.0175, sl: 0.035, trail: 0.0075, hold: 192 };
    const histId = configId("follow", ind, laneProtect(hist, ind));
    const std = signalProtects(sig).find((p) => p.trail > 0)!;
    const stdId = configId("follow", ind, laneProtect(std, ind));
    // the standard trailing config parses as a historic one too: it is never re-added
    assert.ok(heldSignalProtect(stdId));
    const out = heldHistProtects([histId, histId, stdId], new Set([pair]), signalProtects(sig));
    assert.deepEqual(
      out,
      { [pair]: [hist] },
      "the open historic config once, the standard one never",
    );
    // a pair no longer a signal pair: nothing
    assert.deepEqual(heldHistProtects([histId], new Set(), signalProtects(sig)), {});
  });

  it("on by default beside the 77 percent configs and nine Trailing only sets", () => {
    assert.equal(DEFAULT_SIGNALS.hist.enabled, true);
    assert.equal(signalProtects(signalSettings({ enabled: true })).length, 86);
  });
});

describe("historic signal configs: the lookback (hist.lookbackH)", () => {
  // a flat 15 m series of 400 bars with three long entries (bars 10, 100, 300); each entry's hold is 4 bars and lies
  // before the cut at bar 380, so every entry is a complete historic entry
  const T0 = Date.UTC(2026, 9, 1);
  const mk = (): Bars => {
    const n = 400;
    const t = new Float64Array(n);
    const o = new Float64Array(n).fill(100);
    const h = new Float64Array(n).fill(101);
    const l = new Float64Array(n).fill(99);
    const c = new Float64Array(n).fill(100);
    for (let i = 0; i < n; i++) t[i] = T0 + i * 15 * 60_000;
    return { sym: "A-USDT", tfMin: 15, n, t, o, h, l, c, v: new Float64Array(n) };
  };
  const sig = (): Int8Array => {
    const s = new Int8Array(400);
    s[10] = 1;
    s[100] = 1;
    s[300] = 1;
    return s;
  };
  const cutT = T0 + 380 * 15 * 60_000;

  it("without a lookback every complete historic entry counts (the default, unchanged)", () => {
    assert.equal(entryMfes(mk(), sig(), 4, cutT).length, 3);
  });

  it("with a lookback only entries made at or after its start count: 96 h is the last few days, not the whole history", () => {
    const b = mk();
    // the window's start 96 h before the cut is bar 380 − 384 < 0: every entry is inside it
    assert.equal(entryMfes(b, sig(), 4, cutT, [], cutT - 96 * 3_600_000).length, 3);
    // a start after bars 10 and 100: only the entry at bar 300 remains
    assert.equal(entryMfes(b, sig(), 4, cutT, [], b.t[200]).length, 1);
    // a start after every entry: none
    assert.equal(entryMfes(b, sig(), 4, cutT, [], b.t[350]).length, 0);
  });
});
