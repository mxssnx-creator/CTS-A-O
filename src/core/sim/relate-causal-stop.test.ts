import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Protect, Side } from "../domain/types.ts";
import { barsFromCandles } from "../market/bars.ts";
import { simulate, simulateFrom, type SimOptions } from "./backtest.ts";
import { SimulationCursor } from "./cursor.ts";
import { extendTape } from "./tape-extend.ts";
import { appendTape } from "./tape-append.ts";
import { makeTape } from "./walkforward.ts";

const M = 60_000;
const cfg = "follow|ema-9-21@m1|tp1|sl5|tr0|h20|mc";
const p: Protect = { tp: .01, sl: .05, trail: 0, hold: 20, tag: "mc" };
type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

/** Reflect a long's OHLC path around 100 so the short path has exactly the same fractional returns. */
function candles(side: Side): Candle[] {
  const rows = [
    [100, 100.1, 99.9, 100],
    [100, 100.2, 99.9, 100],
    [100, 100.1, 99.2, 99.3], // reaches 0.75% but not the original 5% stop
    [100, 100.2, 98.5, 100], // the second entry must retain its own, wider stop
    [100, 101.2, 99.8, 100.8],
  ];
  return rows.map(([o, h, l, c], i) => side === 1
    ? { t: i * M, o, h, l, c, v: 1 }
    : { t: i * M, o: 200 - o, h: 200 - l, l: 200 - h, c: 200 - c, v: 1 });
}
const signals = (side: Side) => Int8Array.from([side, 0, side, 0, 0]);
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

describe("causal entry-specific stop simulation", () => {
  for (const side of [1, -1] as Side[]) {
    it(`${side === 1 ? "long" : "short"}: a tightened first entry exits early and allows a distinct later entry`, () => {
      const bars = barsFromCandles("AAA-USDT", 1, candles(side));
      const sig = signals(side);
      const events: Array<{ signalCloseT: number; entryT: number; side: Side; stopDistance: number }> = [];
      const opt: SimOptions = { cost: .0015, entryStopLimit: (x) => {
        events.push({ signalCloseT: x.signalCloseT, entryT: x.entryT, side: x.side, stopDistance: x.stopDistance });
        return x.entryT === M ? .0075 : undefined;
      } };
      const plain = simulate(cfg, bars, sig, p, { cost: .0015 });
      const capped = simulate(cfg, bars, sig, p, opt);
      assert.equal(plain.trades.length, 1, "the old stop keeps the first position open over the second signal");
      assert.equal(capped.trades.length, 2, "the earlier real stop allows the later signal to enter");
      assert.deepEqual(events, [
        { signalCloseT: M, entryT: M, side, stopDistance: .05 },
        { signalCloseT: 3 * M, entryT: 3 * M, side, stopDistance: .05 },
      ]);
      near(capped.trades[0].exit, 100 * (1 - side * .0075));
      near(capped.trades[0].r, -.0075 - .0015);
      assert.equal(capped.trades[0].reason, "sl");
      assert.equal(capped.trades[0].entryStopMax, .0075);
      assert.equal(capped.trades[0].exitT, 3 * M);
      assert.equal(capped.trades[1].entryT, 3 * M);
      assert.equal(capped.trades[1].reason, "tp");
      assert.equal(capped.trades[1].entryStopMax, undefined);
      near(capped.trades[1].exit, 100 * (1 + side * .01));
      near(capped.trades[1].r, .01 - .0015);
      assert.equal(p.sl, .05, "one entry cannot mutate the config or another entry");
    });

    it(`${side === 1 ? "long" : "short"}: a held entry keeps its own stop after a restart and a policy edit`, () => {
      const rows = candles(side), sig = signals(side);
      const first = simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows.slice(0, 2)), sig.slice(0, 2), p,
        { cost: .0015, entryStopLimit: () => .0075 });
      assert.equal(first.state.inPos, true);
      assert.equal(first.state.entryStopMax, .0075);
      assert.deepEqual(first.state.entryStopOwner, { cfg, sym: "AAA-USDT", side, entryT: M });
      assert.equal(first.open?.entryStopMax, .0075);
      near(first.state.stop, 100 * (1 - side * .0075));
      let calls = 0;
      const resumed = simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, p,
        { cost: .0015, entryStopLimit: () => { calls++; return undefined; } }, JSON.parse(JSON.stringify(first.state)));
      assert.equal(calls, 1, "the changed callback is invoked for the next entry, not the held one");
      assert.equal(resumed.trades.length, 2);
      near(resumed.trades[0].exit, 100 * (1 - side * .0075));
      assert.equal(resumed.trades[0].entryStopMax, .0075);
      near(resumed.trades[1].exit, 100 * (1 + side * .01));
      assert.equal(resumed.trades[1].entryStopMax, undefined);
      assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, p, { cost: .0015 },
        { ...first.state, stop: 100 * (1 - side * .02) }), /captured stop limit/);
      assert.throws(() => simulateFrom(`${cfg}|different`, barsFromCandles("AAA-USDT", 1, rows), sig, p,
        { cost: .0015 }, first.state), /captured stop owner/);
      assert.throws(() => simulateFrom(cfg, barsFromCandles("BBB-USDT", 1, rows), sig, p,
        { cost: .0015 }, first.state), /captured stop owner/);
      assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, p,
        { cost: .0015 }, { ...first.state, entryStopOwner: undefined }), /captured stop owner/);
      assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, p,
        { cost: .0015 }, { ...first.state, entryStopOwner: { ...first.state.entryStopOwner!, side: (side * -1) as Side } }),
      /captured stop owner/);
      assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, p,
        { cost: .0015 }, { ...first.state, entryStopOwner: { ...first.state.entryStopOwner!, entryT: 2 * M } }),
      /captured stop owner/);
    });

    it(`${side === 1 ? "long" : "short"}: every supported setting is measured from the original entry`, () => {
      for (const limit of [.0025, .005, .0075, .01, .0125, .015]) {
        const extreme = 100 * (1 - side * (limit + .001));
        const entryBar = side === 1
          ? { t: M, o: 100, h: 100.1, l: extreme, c: 100, v: 1 }
          : { t: M, o: 100, h: extreme, l: 99.9, c: 100, v: 1 };
        const bars = barsFromCandles("AAA-USDT", 1, [
          { t: 0, o: 100, h: 100.1, l: 99.9, c: 100, v: 1 }, entryBar,
        ]);
        const result = simulate(cfg, bars, Int8Array.from([side, 0]), p,
          { cost: .0015, entryStopLimit: () => limit });
        assert.equal(result.trades.length, 1);
        near(result.trades[0].exit, 100 * (1 - side * limit));
        near(result.trades[0].r, -limit - .0015);
        assert.equal(result.trades[0].entryStopMax, limit);
      }
    });

    it(`${side === 1 ? "long" : "short"}: a trailing stop keeps ratcheting after the capped entry`, () => {
      const prices = [
        [100, 100.1, 99.9, 100], [100, 102, 99.9, 101.5], [100.5, 100.7, 100.4, 100.6],
      ];
      const rows = prices.map(([o, h, l, c], i) => side === 1
        ? { t: i * M, o, h, l, c, v: 1 }
        : { t: i * M, o: 200 - o, h: 200 - l, l: 200 - h, c: 200 - c, v: 1 });
      const result = simulate(cfg, barsFromCandles("AAA-USDT", 1, rows), Int8Array.from([side, 0, 0]),
        { ...p, tp: .2, trail: .01 }, { cost: .0015, entryStopLimit: () => .0075 });
      assert.equal(result.trades[0].reason, "trail");
      near(result.trades[0].exit, 100 + side * .5);
      near(result.trades[0].r, .005 - .0015);
      assert.equal(result.trades[0].entryStopMax, .0075);
    });

    it(`${side === 1 ? "long" : "short"}: gaps through the stop fill at the worse open, not at the cap`, () => {
      const reflect = (value: number) => side === 1 ? value : 200 - value;
      const rows = [
        { t: 0, o: 100, h: 100.1, l: 99.9, c: 100, v: 1 },
        { t: M, o: 100, h: 100.1, l: 99.9, c: 100, v: 1 },
        side === 1
          ? { t: 2 * M, o: 98, h: 98.1, l: 97.9, c: 98, v: 1 }
          : { t: 2 * M, o: 102, h: 102.1, l: 101.9, c: 102, v: 1 },
      ];
      const result = simulate(cfg, barsFromCandles("AAA-USDT", 1, rows), Int8Array.from([side, 0, 0]), p,
        { cost: .0015, entryStopLimit: () => .0075 });
      near(result.trades[0].exit, reflect(98));
      near(result.trades[0].r, -.02 - .0015);
      assert.equal(result.trades[0].entryStopMax, .0075);
    });

    it(`${side === 1 ? "long" : "short"}: a separate Historic Exit keeps its own stop and close time`, () => {
      const bars = barsFromCandles("AAA-USDT", 1, candles(side));
      const sig = Int8Array.from([side, 0, 0, 0, 0]);
      const normal = simulate(cfg, bars, sig, { ...p, tp: .2 },
        { cost: .0015, entryStopLimit: () => .0075 });
      const exit = simulate(`${cfg}|independent-exit`, bars, sig,
        { ...p, tp: .2, exitType: "historic", exitSet: "static-sl" },
        { cost: .0015, entryStopLimit: () => .015 });
      assert.equal(normal.trades[0].exitT, 3 * M);
      near(normal.trades[0].exit, 100 * (1 - side * .0075));
      assert.equal(exit.trades[0].exitT, 4 * M);
      near(exit.trades[0].exit, 100 * (1 - side * .015));
      assert.notEqual(normal.trades[0].cfg, exit.trades[0].cfg);
    });
  }

  it("never widens a tighter existing stop and agrees with the optimized sink path", () => {
    const bars = barsFromCandles("AAA-USDT", 1, candles(1));
    const sig = signals(1);
    const narrow = { ...p, sl: .005 };
    const source = simulate(cfg, bars, sig, narrow, { cost: .0015 });
    const capped = simulate(cfg, bars, sig, narrow, { cost: .0015, entryStopLimit: () => .0075 });
    assert.deepEqual(capped.trades.map(({ entryStopMax: _limit, ...trade }) => trade), source.trades);
    assert.ok(capped.trades.every((trade) => trade.entryStopMax === .0075));
    near(capped.trades[0].exit, 99.5);
    const sink: Array<[number, number, number]> = [];
    const sinkResult = simulate(cfg, bars, sig, p, { cost: .0015, fixedPathScope: {},
      entryStopLimit: (x) => x.entryT === M ? .0075 : undefined,
      sink: (r, entryT, exitT) => sink.push([r, entryT, exitT]) });
    const ordinary = simulate(cfg, bars, sig, p, { cost: .0015,
      entryStopLimit: (x) => x.entryT === M ? .0075 : undefined });
    assert.deepEqual(sinkResult.trades, []);
    assert.deepEqual(sink, ordinary.trades.map((t) => [t.r, t.entryT, t.exitT]));
  });

  it("caps the resolved ATR stop at entry without changing the ATR target or historic Exit anchors", () => {
    const bars = barsFromCandles("AAA-USDT", 1, candles(1));
    const sig = Int8Array.from([1, 0, 0, 0, 0]);
    const atrProtect: Protect = { ...p, atr: { sl: 1, tpRatio: 2 } };
    let resolved = 0;
    const atr = simulate(cfg, bars, sig, atrProtect, { cost: .0015, atr: new Float64Array(bars.n).fill(2),
      entryStopLimit: (entry) => { resolved = entry.stopDistance; return .0075; } });
    assert.ok(resolved > .02, "the callback sees the actual entry-time ATR stop, not its nominal placeholder");
    near(atr.trades[0].exit, 99.25);
    const historic: Protect = { ...p, tp: .2, trail: .02, exitType: "historic", exitSet: "trailing" };
    const held = simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, candles(1).slice(0, 2)), sig.slice(0, 2),
      historic, { cost: .0015, entryStopLimit: () => .0075 });
    assert.ok(held.open);
    near(held.state.stop, 99.25);
    near(held.state.exitProtection!.baseSl, .05);
    near(held.state.exitProtection!.baseTp, .2);
  });

  it("keeps a restored Historic Exit's protection state and owned position in sync after JSON persistence", () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({ t: i * M, o: 100, h: 100.1, l: 99.9, c: 100, v: 1 }));
    const sig = Int8Array.from([1, 0, 0, 0]);
    const historic: Protect = { ...p, tp: .2, trail: .02, exitType: "historic", exitSet: "trailing" };
    const before = simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows.slice(0, 2)), sig.slice(0, 2), historic,
      { cost: .0015, entryStopLimit: () => .0075 });
    assert.equal(before.state.exitProtection?.samples, 1);
    const saved = JSON.parse(JSON.stringify(before.state));
    const after = simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, historic, { cost: .0015 }, saved);
    assert.equal(after.state.exitProtection?.samples, 3);
    assert.equal(after.state.exitPosition?.exitProtection?.samples, 3);
    assert.deepEqual(after.open?.exitProtection, after.state.exitPosition?.exitProtection);
    assert.equal(after.open?.entryStopMax, .0075);
    const changedHistory = JSON.parse(JSON.stringify(before.state));
    changedHistory.exitPosition.exitProtection.samples++;
    assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, historic,
      { cost: .0015 }, changedHistory), /position and protection state disagree/);
    const changedStop = JSON.parse(JSON.stringify(before.state));
    changedStop.exitPosition.stop = 95;
    assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, historic,
      { cost: .0015 }, changedStop), /position and protection state disagree/);
    const changedExtra = JSON.parse(JSON.stringify(before.state));
    changedExtra.exitPosition.exitProtection.futureField = 1;
    assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, historic,
      { cost: .0015 }, changedExtra), /position and protection state disagree/);
  });

  it("refuses to discard captured stop provenance when a compact tape cannot encode it", () => {
    const rows = candles(1), sig = signals(1), bars = barsFromCandles("AAA-USDT", 1, rows);
    const closed = simulate(cfg, bars, sig, p, { cost: .0015, entryStopLimit: () => .0075 });
    assert.throws(() => makeTape(cfg, "follow", "ema-9-21@m1", p, "normal", ["AAA-USDT"], closed.trades, [], []),
      /cannot retain per-entry stop-limit provenance/);
    const held = simulate(cfg, barsFromCandles("AAA-USDT", 1, rows.slice(0, 2)), sig.slice(0, 2), p,
      { cost: .0015, entryStopLimit: () => .0075 });
    const open = held.open;
    assert.ok(open);
    assert.throws(() => makeTape(cfg, "follow", "ema-9-21@m1", p, "normal", ["AAA-USDT"], [], [open], []),
      /cannot retain per-entry stop-limit provenance/);
    const legacyTape = makeTape(cfg, "follow", "ema-9-21@m1", p, "normal", ["AAA-USDT"], [], [], []);
    legacyTape.open = [open];
    assert.throws(() => extendTape(legacyTape, { runs: new Map() }, {} as never, .0015),
      /cannot retain per-entry stop-limit provenance/);
    const cleanTape = makeTape(cfg, "follow", "ema-9-21@m1", p, "normal", ["AAA-USDT"], [], [], []);
    assert.throws(() => appendTape(legacyTape, cleanTape), /cannot retain per-entry stop-limit provenance/);
    assert.throws(() => appendTape(cleanTape, legacyTape), /cannot retain per-entry stop-limit provenance/);
  });

  it("a continuing cursor cannot attach a captured stop to a different configuration", () => {
    const rows = candles(1), sig = signals(1), cursor = new SimulationCursor();
    const first = simulate(cfg, barsFromCandles("AAA-USDT", 1, rows.slice(0, 2)), sig.slice(0, 2), p,
      { cost: .0015, cursor, entryStopLimit: () => .0075 });
    assert.ok(first.open);
    assert.equal(first.open.entryStopMax, .0075);
    assert.throws(() => simulate(`${cfg}|different`, barsFromCandles("AAA-USDT", 1, rows), sig, p,
      { cost: .0015, cursor }), /captured stop owner/);
  });

  it("incremental candle delivery reproduces the same capped closes and re-entry once each", () => {
    const rows = candles(1), sig = signals(1), cursor = new SimulationCursor();
    const stop = (entry: { readonly entryT: number }) => entry.entryT === M ? .0075 : undefined;
    const incremental = [2, 3, rows.length].flatMap((n) => simulate(cfg,
      barsFromCandles("AAA-USDT", 1, rows.slice(0, n)), sig.slice(0, n), p,
      { cost: .0015, cursor, entryStopLimit: stop }).trades);
    const full = simulate(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, p,
      { cost: .0015, entryStopLimit: stop });
    assert.equal(incremental.length, 2);
    assert.deepEqual(incremental, full.trades);
  });

  it("rejects a widened trailing substate even when the saved top-level stop is still valid", () => {
    const rows = candles(1), sig = signals(1), trailing = { ...p, tp: .2, trail: .02 };
    const first = simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows.slice(0, 2)), sig.slice(0, 2), trailing,
      { cost: .0015, entryStopLimit: () => .0075 });
    assert.ok(first.state.trailPosition);
    const broken = JSON.parse(JSON.stringify(first.state));
    broken.trailPosition.stop = 95;
    assert.throws(() => simulateFrom(cfg, barsFromCandles("AAA-USDT", 1, rows), sig, trailing,
      { cost: .0015 }, broken), /trailing position and captured stop disagree/);
  });

  it("rejects invalid stop limits instead of manufacturing a trade or silently widening protection", () => {
    const bars = barsFromCandles("AAA-USDT", 1, candles(1));
    for (const invalid of [NaN, Infinity, 0, -1, 1, 1.5])
      assert.throws(() => simulate(cfg, bars, signals(1), p, { cost: .0015, entryStopLimit: () => invalid }),
        /entry stop limit/);
  });
});
