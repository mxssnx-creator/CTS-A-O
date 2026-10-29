import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { ExitConfigSet, Protect } from "../domain/types.ts";
import { barsFromCandles } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { makeTape, walkForward } from "../sim/walkforward.ts";
import { configId, makeUniverse } from "../pipeline/pipeline.ts";
import { simulate } from "../sim/backtest.ts";
import { createExitProtection } from "../sim/exit-protection.ts";
import { RT_COST } from "../model-cost.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime, type PaperBook } from "./runtime.server.ts";
import { TickMathBook } from "./tick-math.ts";
import { orderKey } from "../sizing.ts";

const M = 60_000;
const T0 = Date.UTC(2026, 9, 17);
const COST = RT_COST;
const runtimes: CoreRuntime[] = [];
type Position = PaperBook["positions"][number];

const candle = (t: number, px = 100) => ({ t, o: px, h: px, l: px, c: px, v: 1 });
function runtime() {
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    {
      symbols: 1,
      cost: COST,
      live: { enabled: false },
    } as never,
    { market: "synthetic", priceStream: null },
  );
  runtimes.push(rt);
  return rt;
}
function position(p: Protect, side: 1 | -1, sym = "X-USDT"): Position {
  return {
    cfg: configId("follow", "ema-9-21@m1", p),
    sym,
    side,
    entryT: T0,
    entryI: 1,
    entry: 100,
    stop: 100 * (1 - side * p.sl),
    target: 100 * (1 + side * p.tp),
    peak: 100,
    trailOn: false,
    trail: p.trail,
    trailDist: p.trail,
    mtm: -COST,
    exitProtection: createExitProtection(p, 100, COST),
  };
}
const setPrice = (rt: CoreRuntime, sym: string, px: number) =>
  rt.candles.set(sym, CandleSeries.fromCandles([candle(Date.now() - M, px)]));
const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

afterEach(async () => {
  for (const rt of runtimes) rt.dispose();
  await Promise.all(runtimes.map((rt) => rt.backtestsSettled()));
  runtimes.length = 0;
  mock.timers.reset();
});

describe("completed protection bars through the actual runtime tick", () => {
  it("persists each direction's first observed stop gap without closing its wider sibling", async () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    const rt = runtime();
    const narrow: Protect = { tp: .05, sl: .02, trail: 0, hold: 10 };
    const wide: Protect = { ...narrow, sl: .04 };
    const positions = [position(narrow, 1, "L-USDT"), position(wide, 1, "L-USDT"),
      position(narrow, -1, "S-USDT"), position(wide, -1, "S-USDT")];
    rt.paper.positions = positions;
    rt.paper.units = new Map(positions.map(p => [orderKey(p), rt.settings.paperNotional]));
    for (const sym of ["L-USDT", "S-USDT"]) setPrice(rt, sym, 100);
    await rt.tick();
    mock.timers.tick(M);
    setPrice(rt, "L-USDT", 97); setPrice(rt, "S-USDT", 103);
    await rt.tick();
    for (const [index, side, quote] of [[0, 1, 97], [2, -1, 103]] as const) {
      const p = positions[index];
      assert.equal(p.hitPx, quote); assert.ok(p.stopHit);
      assert.equal(positions[index + 1].stopHit, undefined);
      const candles = [candle(T0), candle(T0 + M), candle(T0 + 2 * M, quote)];
      const expected = simulate(p.cfg, barsFromCandles(p.sym, 1, candles),
        Int8Array.of(side, 0, 0), narrow, { cost: COST }).trades[0];
      assert.equal(expected.exit, quote); close(p.mtm, expected.r);
    }
    const hits = rt.db.kvGet<Record<string, { px: number }>>("stopHits")!;
    assert.equal(Object.keys(hits).length, 2);
    assert.deepEqual(Object.values(hits).map(x => x.px).sort((a, b) => a - b), [97, 103]);
    mock.timers.tick(1);
    setPrice(rt, "L-USDT", 95); setPrice(rt, "S-USDT", 105);
    await rt.tick();
    assert.deepEqual(positions.map(p => p.hitPx), [97, 95, 103, 105]);
    assert.equal(Object.keys(rt.db.kvGet<Record<string, unknown>>("stopHits")!).length, 4);
    close(rt.paper.equity, positions.reduce((sum, p) => sum + p.mtm * rt.settings.paperNotional, 0));
  });
  it("publishes and persists a flat-price time exit between computes using the position's captured deadline", async () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    const rt = runtime(), protect: Protect = { tp: .05, sl: .02, trail: 0, hold: 15, maxHoldMin: 15 };
    const held = { ...position(protect, 1), holdEndT: T0 + 15 * M, executionTfMin: 1 };
    rt.paper.positions = [held]; setPrice(rt, held.sym, 100);
    await rt.tick(); assert.equal(held.stopHit, undefined);
    mock.timers.tick(15 * M); setPrice(rt, held.sym, 100);
    await rt.tick();
    assert.equal(held.stopHit, T0 + 15 * M); assert.equal(held.hitPx, 100); assert.equal(held.hitReason, "time");
    const hits = rt.db.kvGet<Record<string, { at: number; reason?: string }>>("stopHits")!;
    assert.equal(Object.values(hits)[0]?.at, T0 + 15 * M); assert.equal(Object.values(hits)[0]?.reason, "time");
  });
  it("publishes sliced ticker marks, Exit state and equity together", async () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    const rt = runtime();
    rt.settings.sizing = { mode: "fixed", pct: 0.002 };
    const protect: Protect = { tp: 0.2, sl: 0.2, trail: 0.02, hold: 100,
      exitType: "historic", exitSet: "trailing" };
    // Below the worker threshold, but above the local generator's 128-position yield.
    const positions = Array.from({ length: 200 }, (_, i) => ({
      ...position(protect, i % 2 ? -1 : 1), cfg: `${position(protect, 1).cfg}|owned${i}`,
    }));
    rt.paper.positions = positions;
    rt.paper.units = new Map(positions.map(p => [orderKey(p), rt.settings.paperNotional]));
    setPrice(rt, "X-USDT", 100);
    await rt.tick();
    for (const px of [102, 103]) {
      const before = structuredClone(positions);
      const equity = rt.paper.equity;
      mock.timers.tick(M);
      setPrice(rt, "X-USDT", px);
      const pending = rt.tick();
      try {
        assert.deepEqual(positions, before, "a partial local tick must not expose mixed marks or nested Exit state");
        assert.equal(rt.paper.equity, equity);
        assert.deepEqual(rt.runAudit().checks.filter(c => !c.ok), []);
      } finally {
        await pending;
      }
      const reference = new TickMathBook(before,
        new Float64Array(positions.length).fill(rt.settings.paperNotional), COST, 1, false);
      const expected = reference.advance({ "X-USDT": px }, Date.now());
      assert.deepEqual(positions, before, "the complete tick retains exact scalar protection and return math");
      close(rt.paper.equity, expected.open);
      assert.deepEqual(rt.runAudit().checks.filter(c => !c.ok), []);
    }
  });

  it("discards an interrupted local tick even when a new paper book reuses the position array", async () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    const rt = runtime();
    rt.settings.sizing = { mode: "fixed", pct: 0.002 };
    const protect: Protect = { tp: 0.2, sl: 0.2, trail: 0.02, hold: 100,
      exitType: "historic", exitSet: "trailing" };
    const positions = Array.from({ length: 200 }, (_, i) => ({
      ...position(protect, 1), cfg: `${position(protect, 1).cfg}|owned${i}`,
    }));
    rt.paper.positions = positions;
    rt.paper.units = new Map(positions.map(p => [orderKey(p), rt.settings.paperNotional]));
    setPrice(rt, "X-USDT", 100);
    await rt.tick();
    const before = structuredClone(positions), equity = rt.paper.equity;
    mock.timers.tick(M);
    setPrice(rt, "X-USDT", 102);
    const pending = rt.tick();
    const partial = (rt as unknown as { tickMemo: { math: unknown } }).tickMemo;
    rt.paper = { ...rt.paper };
    await pending;
    assert.deepEqual(positions, before, "superseded work cannot publish protection or marks");
    assert.equal(rt.paper.equity, equity);
    assert.equal(partial.math, null, "partial cached sums must be discarded");
    await rt.tick();
    assert.equal(positions[0].exitProtection?.samples, 1, "recovery advances the completed bar exactly once");
    assert.equal(positions.at(-1)!.exitProtection?.samples, 1);
    assert.deepEqual(rt.runAudit().checks.filter(c => !c.ok), []);
  });

  it("retains held marks when a symbol has no current quote, including the first frame", async () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    const rt = runtime();
    rt.settings.sizing = { mode: "fixed", pct: 0.002 };
    const protect: Protect = { tp: 0.2, sl: 0.2, trail: 0, hold: 100 };
    const held = position(protect, 1, "UNQUOTED-USDT"), quoted = position(protect, -1, "QUOTED-USDT");
    held.mtm = -0.02;
    rt.paper.positions = [held, quoted];
    rt.paper.units = new Map([held, quoted].map(p => [orderKey(p), rt.settings.paperNotional]));
    setPrice(rt, quoted.sym, 99);
    await rt.tick();
    assert.equal(held.mtm, -0.02, "a missing quote cannot erase the prior loss mark");
    close(rt.paper.equity, (held.mtm + quoted.mtm) * rt.settings.paperNotional);
    assert.deepEqual(rt.runAudit().checks.filter(c => !c.ok), []);
    setPrice(rt, held.sym, 98);
    await rt.tick();
    const mark = held.mtm;
    rt.candles.delete(held.sym);
    setPrice(rt, quoted.sym, 101);
    await rt.tick();
    assert.equal(held.mtm, mark);
    close(rt.paper.equity, (held.mtm + quoted.mtm) * rt.settings.paperNotional);
    assert.deepEqual(rt.runAudit().checks.filter(c => !c.ok), []);
  });

  it("preserves trailing changes made after each paper yield through atomic book publication on both sides", () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    for (const side of [1, -1] as const) {
      const rt = runtime(),
        protect: Protect = { tp: 0.2, sl: 0.05, trail: 0.01, hold: 100 };
      const old = position(protect, side);
      const b = barsFromCandles(
        old.sym,
        1,
        Array.from({ length: 120 }, (_, i) => candle(T0 - (120 - i) * M)),
      );
      const u = makeUniverse([b]);
      rt.sim = walkForward(u, [], rt.wf);
      rt.tapes = [
        makeTape(
          old.cfg,
          "follow",
          "ema-9-21@m1",
          protect,
          "trailing",
          [old.sym],
          [],
          [{ ...old }],
          [],
        ),
      ];
      rt.paper.positions = [old];
      rt.paper.selected = [old.cfg];
      const hooks = rt as unknown as {
        lastSelection: { picks: never[]; eligible: number };
        stepPaperGen(f: {
          opens: Map<string, readonly Position[]>;
          t: number;
        }): Generator<number, void>;
      };
      hooks.lastSelection = { picks: [], eligible: 1 };
      let yields = 0;
      for (const _ of hooks.stepPaperGen({ opens: new Map([[old.cfg, [{ ...old }]]]), t: T0 })) {
        yields++;
        old.stop += side * 0.01;
        old.peak += side * 0.02;
        old.trailOn = true;
        old.tkBar = yields;
        old.tkHi = 102;
        old.tkLo = 98;
      }
      assert.ok(yields > 3);
      assert.equal(rt.paper.positions.length, 1);
      const next = rt.paper.positions[0];
      assert.equal(next.stop, old.stop);
      assert.equal(next.peak, old.peak);
      assert.equal(next.trailOn, true);
      assert.equal(next.tkBar, old.tkBar);
    }
  });

  it("advances all Exit tactics on flat bars, preserves idle Normal marks, and crosses the causal adjusted TP", async () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    for (const side of [1, -1] as const) {
      const rt = runtime();
      const protects = (["static-sl", "adaptive-sl", "trailing"] as ExitConfigSet[]).map(
        (set): Protect => ({
          tp: 0.1,
          sl: 0.2,
          trail: set === "trailing" ? 0.03 : 0,
          hold: 100,
          exitType: "historic",
          exitSet: set,
          exitSide: side,
        }),
      );
      const positions = protects.map((p) => position(p, side));
      const slower = position(protects[0], side);
      slower.cfg = configId("follow", "ema-9-21@m5", protects[0]);
      const ordinary = position({ tp: 0.2, sl: 0.2, trail: 0, hold: 100 }, 1, "NORMAL-USDT");
      let normalReads = 0;
      Object.defineProperty(ordinary, "entry", {
        get: () => {
          normalReads++;
          return 100;
        },
      });
      rt.paper.positions = [...positions, slower, ordinary];
      setPrice(rt, "X-USDT", 100);
      setPrice(rt, "NORMAL-USDT", 100);
      await rt.tick();
      normalReads = 0;
      let protectedReads = 0;
      Object.defineProperty(positions[0], "entry", {
        get: () => {
          protectedReads++;
          return 100;
        },
      });
      const flat = [candle(T0 - M)];
      for (let completed = 1; completed <= 4; completed++) {
        mock.timers.tick(M);
        flat.push(candle(T0 + (completed - 1) * M));
        await rt.tick();
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          const expected = simulate(
            p.cfg,
            barsFromCandles(p.sym, 1, flat),
            Int8Array.from(flat, (_, j) => (j === 0 ? side : 0)),
            protects[i],
            { cost: COST },
          ).open!;
          assert.equal(p.exitProtection?.samples, completed);
          assert.equal(p.target, expected.target);
          assert.equal(p.stop, expected.stop);
          assert.equal(p.trailDist, expected.trailDist ?? 0);
          assert.deepEqual(p.exitProtection, expected.exitProtection);
        }
        assert.equal(
          slower.exitProtection?.samples,
          0,
          "a 1m deadline cannot advance its 5m sibling",
        );
        const state = positions.map((p) => JSON.stringify(p.exitProtection));
        protectedReads = 0;
        for (let tick = 0; tick < 10; tick++) await rt.tick();
        assert.equal(
          protectedReads,
          0,
          "a cached future boundary skips every position until it is due",
        );
        assert.deepEqual(
          positions.map((p) => JSON.stringify(p.exitProtection)),
          state,
          "repeated ticks in the same lane bar cannot process it twice",
        );
      }
      assert.equal(
        normalReads,
        0,
        "a pure fixed Normal group retains the unchanged-price fast path",
      );
      assert.equal(ordinary.mtm, -COST);
      close(rt.paper.equity, -COST * rt.settings.paperNotional * rt.paper.positions.length);
      const moved = 100 + side * 9;
      mock.timers.tick(10);
      setPrice(rt, "X-USDT", moved);
      await rt.tick();
      const forward = [
        ...flat,
        { t: T0 + 4 * M, o: 100, h: Math.max(100, moved), l: Math.min(100, moved), c: moved, v: 1 },
      ];
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const expected = simulate(
          p.cfg,
          barsFromCandles(p.sym, 1, forward),
          Int8Array.from(forward, (_, j) => (j === 0 ? side : 0)),
          protects[i],
          { cost: COST },
        );
        assert.equal(expected.trades.length, 1);
        assert.ok(p.stopHit, "the actual runtime tick detects the adjusted TP crossing");
        assert.equal(p.hitPx, expected.trades[0].exit);
        assert.equal(p.mtm, expected.trades[0].r);
      }
      const hits = Object.values(rt.db.kvGet<Record<string, { px: number }>>("stopHits") ?? {});
      assert.equal(hits.length, positions.length, "each independent close is persisted once");
      assert.ok(hits.every((hit) => hit.px === positions[0].hitPx));
      assert.equal(slower.stopHit, undefined, "the slower lane retains its own unchanged target");
      close(
        rt.paper.equity,
        rt.paper.positions.reduce((n, p) => n + p.mtm * rt.settings.paperNotional, 0),
      );
      rt.dispose();
      // Keep the second direction's synthetic entry and simulation bars aligned with the mocked wall clock.
      if (side === 1) {
        mock.timers.reset();
        mock.timers.enable({ apis: ["Date"], now: T0 });
      }
    }
  });

  it("ratchets an ordinary trailing peak at an unchanged-price boundary before a later reversal", async () => {
    mock.timers.enable({ apis: ["Date"], now: T0 });
    const rt = runtime();
    const p = position({ tp: 0.3, sl: 0.2, trail: 0.03, hold: 100 }, 1);
    rt.paper.positions = [p];
    setPrice(rt, p.sym, 100);
    await rt.tick();
    mock.timers.tick(M / 2);
    setPrice(rt, p.sym, 108);
    await rt.tick();
    assert.equal(p.stop, 80, "an incomplete bar cannot ratchet its observed high");
    mock.timers.tick(M / 2);
    await rt.tick();
    close(p.stop, 108 * 0.97);
    assert.equal(p.trailOn, true);
    assert.equal(p.target, 130);
    const before = JSON.stringify(p);
    await rt.tick();
    assert.equal(JSON.stringify(p), before, "the completed peak is applied once");
    mock.timers.tick(1);
    setPrice(rt, p.sym, 103);
    await rt.tick();
    assert.ok(p.stopHit);
    assert.equal(p.hitPx, 103, "the first observed quote beyond the stop is the conservative paper mark");
    close(p.mtm, (103 - p.entry) / p.entry - COST);
    close(rt.paper.equity, p.mtm * rt.settings.paperNotional);
    assert.equal(Object.keys(rt.db.kvGet<Record<string, unknown>>("stopHits") ?? {}).length, 1);
  });
});
