import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Candle, Protect } from "../domain/types.ts";
import { barsFromCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { closePool, runOnWorkers } from "../server/pool.server.ts";
import {
  buildTapes,
  DEFAULT_RANGE_FIT,
  fittedRangeTps,
  floorsForPairs,
  universeSigma1m,
  type ConfigTape,
  type EntryFloors,
} from "./walkforward.ts";

const M = 60_000;
const CUT = Date.UTC(2026, 9, 17, 12);
const PAIR = "follow|rsi-mom-14-20@m1";
const protects: Protect[] = [0.001, 0.003, 0.01, 0.03].map((tp) => ({
  tp,
  sl: tp,
  trail: 0,
  hold: 32,
  tag: "mc",
}));
function candles(futureVol: number, tf = 1): Candle[] {
  let price = 100;
  return Array.from({ length: 600 }, (_, i) => {
    const open = price;
    price *= Math.exp((i % 2 ? 1 : -1) * (i < 300 ? 0.0003 : futureVol));
    return {
      t: CUT + (i - 300) * tf * M,
      o: open,
      h: Math.max(open, price),
      l: Math.min(open, price),
      c: price,
      v: 1,
    };
  });
}
const market = (futureVol: number) => barsFromCandles("AAA-USDT", 1, candles(futureVol));
const targets = (bars: ReturnType<typeof market>, cutT?: number) =>
  [
    ...fittedRangeTps(
      "rsi-mom-14-20@m1",
      1,
      protects,
      universeSigma1m([bars], cutT),
      DEFAULT_RANGE_FIT,
    )!,
  ].sort();
const floors: EntryFloors = {
  minSl: 0,
  minTrail: 0,
  rangeFit: DEFAULT_RANGE_FIT,
  rangeFitCutT: CUT,
};
const ids = (tapes: readonly ConfigTape[]) => tapes.map((tape) => tape.id).sort();
after(() => closePool());

describe("causal range target fitting", () => {
  it("keeps eligible config identities independent of poisoned future volatility", () => {
    const quiet = market(0.0003),
      volatile = market(0.03);
    assert.deepEqual(targets(quiet, CUT), ["mc|0.001", "mc|0.003"]);
    assert.deepEqual(targets(volatile, CUT), targets(quiet, CUT));
    assert.deepEqual(
      targets(volatile),
      ["mc|0.01", "mc|0.03"],
      "an omitted cut preserves whole-input fitting",
    );
    const pairs = new Set([PAIR]);
    const build = (bars: ReturnType<typeof market>, f: EntryFloors) =>
      buildTapes(makeUniverse([bars]), protects, 0.0015, undefined, pairs, undefined, undefined, f);
    const quietTapes = build(quiet, floors),
      futureTapes = build(volatile, floors);
    assert.equal(quietTapes.length, 2, "fitting filters the actual configured execution grid");
    assert.deepEqual(ids(futureTapes), ids(quietTapes));
    assert.notDeepEqual(
      ids(build(volatile, { ...floors, rangeFitCutT: undefined })),
      ids(futureTapes),
    );
    assert.equal(
      DEFAULT_SETTINGS.grid.rangeFit?.enabled,
      false,
      "the production default remains off",
    );
    const unfitted = { ...floors, rangeFit: null };
    assert.equal(build(quiet, unfitted).length, protects.length);
    assert.deepEqual(
      ids(build(volatile, unfitted)),
      ids(build(quiet, unfitted)),
      "disabled fitting keeps every configured target",
    );
  });

  it("excludes an incomplete five-minute candle and includes it exactly at its close", () => {
    const cs = candles(0.03, 5),
      bars = barsFromCandles("AAA-USDT", 5, cs);
    // Independent explicit prefixes: no headBars() in the expected boundary calculation.
    const historical = universeSigma1m([barsFromCandles("AAA-USDT", 5, cs.slice(0, 300))]);
    const firstFutureClosed = universeSigma1m([barsFromCandles("AAA-USDT", 5, cs.slice(0, 301))]);
    assert.notEqual(
      firstFutureClosed,
      historical,
      "the first future candle changes measured volatility",
    );
    assert.equal(
      universeSigma1m([bars], CUT),
      historical,
      "the last historical candle closes exactly at CUT",
    );
    assert.equal(
      universeSigma1m([bars], CUT + 5 * M - 1),
      historical,
      "a candle opened before the cut is still incomplete",
    );
    assert.equal(universeSigma1m([bars], CUT + 5 * M), firstFutureClosed);
    for (const invalid of [NaN, Infinity, -1])
      assert.throws(() => universeSigma1m([bars], invalid), /finite nonnegative/);
  });

  it("preserves the fit cut through pair partitioning and the real worker", async () => {
    const bars = market(0.03);
    const partition = floorsForPairs({
      ...floors,
      pairTags: { [PAIR]: ["mc"], "follow|other@m1": [] },
    })([PAIR]);
    assert.equal(partition.rangeFitCutT, CUT);
    assert.deepEqual(partition.pairTags, { [PAIR]: ["mc"] });
    const local = buildTapes(
      makeUniverse([bars]),
      protects,
      0.0015,
      undefined,
      new Set([PAIR]),
      undefined,
      undefined,
      partition,
    );
    const [remote] = await runOnWorkers<{ tapes: ConfigTape[] }>(
      [
        {
          type: "tapes",
          bars: [bars],
          pairs: [PAIR],
          protects,
          cost: 0.0015,
          dcaOpt: null,
          adjust: null,
          floors: partition,
        },
      ],
      1,
    );
    assert.deepEqual(ids(remote.tapes), ids(local));
    assert.ok(
      remote.tapes.length > 0 && remote.tapes.every((tape) => tape.protect.tp <= 0.003),
      "the worker cannot select targets using future volatility",
    );
  });
});
