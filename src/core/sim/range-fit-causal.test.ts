import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, headBars } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { closePool, runOnWorkers } from "../server/pool.server.ts";
import { buildTapes, DEFAULT_RANGE_FIT, fittedRangeTps, floorsForPairs, universeSigma1m, type ConfigTape, type EntryFloors } from "./walkforward.ts";
import type { Protect } from "../domain/types.ts";

const M = 60_000;
const CUT = Date.UTC(2026, 9, 17, 12);
const PAIR = "follow|rsi-mom-14-20@m1";
const protects: Protect[] = [0.001, 0.003, 0.01, 0.03].map((tp) => ({ tp, sl: tp, trail: 0, hold: 32, tag: "mc" }));
function market(futureVol: number, tf = 1) {
  let price = 100;
  return barsFromCandles("AAA-USDT", tf, Array.from({ length: 600 }, (_, i) => {
    const open = price;
    price *= Math.exp((i % 2 ? 1 : -1) * (i < 300 ? 0.0003 : futureVol));
    return { t: CUT + (i - 300) * tf * M, o: open, h: Math.max(open, price), l: Math.min(open, price), c: price, v: 1 };
  }));
}
const targets = (bars: ReturnType<typeof market>, cutT?: number) =>
  [...fittedRangeTps("rsi-mom-14-20@m1", 1, protects, universeSigma1m([bars], cutT), DEFAULT_RANGE_FIT)!].sort();
const floors: EntryFloors = { minSl: 0, minTrail: 0, rangeFit: DEFAULT_RANGE_FIT, rangeFitCutT: CUT };
const ids = (tapes: readonly ConfigTape[]) => tapes.map((tape) => tape.id).sort();
after(() => closePool());

describe("causal range target fitting", () => {
  it("keeps target eligibility independent of poisoned future bars while preserving uncut behavior", () => {
    const quiet = market(0.0003), volatile = market(0.03);
    assert.deepEqual(targets(quiet, CUT), ["mc|0.001", "mc|0.003"]);
    assert.deepEqual(targets(volatile, CUT), targets(quiet, CUT));
    assert.deepEqual(targets(volatile), ["mc|0.01", "mc|0.03"], "the legacy uncut fit still measures the complete supplied universe");
    const pairs = new Set([PAIR]);
    const quietTapes = buildTapes(makeUniverse([quiet]), protects, 0.0015, undefined, pairs, undefined, undefined, floors);
    const futureTapes = buildTapes(makeUniverse([volatile]), protects, 0.0015, undefined, pairs, undefined, undefined, floors);
    assert.equal(quietTapes.length, 2, "fitting actually filters the configured execution grid");
    assert.deepEqual(ids(futureTapes), ids(quietTapes), "future outcomes cannot change which config identities are built");
    const uncut = buildTapes(makeUniverse([volatile]), protects, 0.0015, undefined, pairs, undefined, undefined, { ...floors, rangeFitCutT: undefined });
    assert.notDeepEqual(ids(uncut), ids(futureTapes), "the regression exercises actual candidate eligibility rather than only diagnostics");
  });

  it("fits only completed higher-timeframe candles and rejects an unknown fit boundary", () => {
    const bars = market(0.03, 5);
    const complete = universeSigma1m([headBars(bars, CUT)]);
    assert.equal(universeSigma1m([bars], CUT), complete, "the bar closing exactly at the cut is included");
    assert.equal(universeSigma1m([bars], CUT + 2 * M), complete, "the next five-minute candle is still incomplete");
    for (const invalid of [NaN, Infinity, -1]) assert.throws(() => universeSigma1m([bars], invalid), /finite nonnegative/);
  });

  it("preserves the explicit causal fit cut through pair partitioning and the real worker", async () => {
    const bars = market(0.03);
    const partition = floorsForPairs({ ...floors, pairTags: { [PAIR]: ["mc"], "follow|other@m1": [] } })([PAIR]);
    assert.equal(partition.rangeFitCutT, CUT);
    assert.deepEqual(partition.pairTags, { [PAIR]: ["mc"] });
    const local = buildTapes(makeUniverse([bars]), protects, 0.0015, undefined, new Set([PAIR]), undefined, undefined, partition);
    const [remote] = await runOnWorkers<{ tapes: ConfigTape[] }>([{ type: "tapes", bars: [bars], pairs: [PAIR], protects, cost: 0.0015, dcaOpt: null, adjust: null, floors: partition }], 1);
    assert.deepEqual(ids(remote.tapes), ids(local));
    assert.ok(remote.tapes.every((tape) => tape.protect.tp <= 0.003), "the worker must not use the future-volatility fit");
  });
});
