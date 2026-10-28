import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, resample, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import type { Trade } from "../domain/types.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import {
  buildTapes,
  defaultWalkForward,
  packTapes,
  makeTape,
  walkForward,
  type WalkForwardResult,
} from "../sim/walkforward.ts";
import { runOnWorkers, retireOwnedIdleWorkers } from "./pool.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

describe("background Real worker", () => {
  it("matches every full-history result, loss, feed and validation field on 20 symbols and 1/5/15m", async () => {
    const bars = Array.from({ length: 20 }, (_, i) => `S${i}`).flatMap((sym) => {
      const candles = syntheticCandles(sym, 1, 7200, 7200 * 60_000);
      return [1, 5, 15].map((tf) => ({
        ...barsFromCandles(sym, tf, resample(candles, 1, tf)),
        lanes: [1, 5, 15],
      }));
    });
    const u = makeUniverse(bars);
    const pairs = new Set(
      ["trend-ema", "inverse-known-trend-ema"].flatMap((ind) =>
        [1, 5, 15].map((tf) => `follow|${ind}@m${tf}`),
      ),
    );
    const protects = [
      { tp: 0.009, sl: 0.006, trail: 0, hold: 24 },
      { tp: 0.015, sl: 0.009, trail: 0.004, hold: 36 },
    ];
    // Planted unit-return tapes exercise nonempty passing and losing observations through the unchanged
    // default gates. This fixture tests transport/math parity; its returns are not market-performance evidence.
    const tapes = buildTapes(u, protects, DEFAULT_SETTINGS.cost, undefined, pairs).map((tp) => {
      const trades: Trade[] = [];
      for (let hour = 0; hour < 72; hour++)
        for (let s = 0; s < tp.syms.length; s++)
          for (const side of [-1, 1] as const) {
            const entryT = u.nowT - (72 - hour) * 3_600_000 + s * 60_000;
            const gross = hour % 5 ? tp.protect.tp : -tp.protect.sl;
            trades.push({
              cfg: tp.id,
              sym: tp.syms[s],
              side,
              entryT,
              exitT: entryT + 300_000,
              entry: 100,
              exit: 100 * (1 + side * gross),
              r: gross - DEFAULT_SETTINGS.cost,
              mult: 1,
              reason: gross > 0 ? "tp" : "sl",
              bars: 5,
              mfe: 0,
              mae: 0,
            });
          }
      return makeTape(tp.id, tp.bot, tp.ind, tp.protect, tp.kind, tp.syms, trades, [], []);
    });
    const wf = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: 6, longH: 72, simH: 6, validLastN: 0, rangeGate: undefined };
    const expected = walkForward(u, tapes, wf);
    const owner = {};
    try {
      const [reply] = await runOnWorkers<{ sim: WalkForwardResult }>(
        [{ type: "research-real", nowT: u.nowT, baseTf: u.baseTf, packed: packTapes(tapes), wf }],
        1,
        30_000,
        undefined,
        false,
        undefined,
        owner,
      );
      assert.ok(
        expected.feed.length > 0,
        "nonempty candidate and loss history is compared even when gates refuse entries",
      );
      assert.deepEqual(reply.sim, expected);
    } finally {
      await retireOwnedIdleWorkers(owner);
    }
  });

  it("runtime routes live research through the worker and preserves the exact result", async () => {
    const u = makeUniverse([
      barsFromCandles("A", 1, syntheticCandles("A", 1, 1200, 1200 * 60_000)),
    ]);
    const wf = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: 6, simH: 6 };
    const rt = new CoreRuntime(new CoreDb(":memory:"), {}, { market: "bingx", priceStream: null });
    try {
      const hooks = rt as unknown as {
        gen: number;
        researchSimulation(
          input: typeof u,
          t: never[],
          w: typeof wf,
          g: number,
          p: (n: number) => void,
        ): Promise<WalkForwardResult>;
      };
      let steps = 0;
      const result = await hooks.researchSimulation(u, [], wf, hooks.gen, () => {
        steps++;
      });
      assert.deepEqual(result, walkForward(u, [], wf));
      assert.ok(steps > 0);
      assert.match(rt.status.phases.Simulation.slowest ?? "", /owned worker/);
    } finally {
      rt.dispose();
    }
  });
});
