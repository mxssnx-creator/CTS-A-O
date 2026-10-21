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
    exitProtection: createExitProtection(p, 100),
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
    assert.equal(p.hitPx, p.stop);
    close(p.mtm, (p.stop - p.entry) / p.entry - COST);
    close(rt.paper.equity, p.mtm * rt.settings.paperNotional);
    assert.equal(Object.keys(rt.db.kvGet<Record<string, unknown>>("stopHits") ?? {}).length, 1);
  });
});
