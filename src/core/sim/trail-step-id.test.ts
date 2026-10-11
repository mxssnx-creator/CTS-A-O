// A trailing config's id carries its trail step and its trail-free switch when they differ from the defaults (a step of
// 1, trail-free off), so every existing id is unchanged. Two configs of one unit whose protects differ only by trailStep
// used to get one id: the tape builder dropped the second as a duplicate and the walk-forward traded one of the two.
// Each is now its own config: distinct ids, and both trade.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { configId, makeUniverse, parseConfigId } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { buildTapes } from "./walkforward.ts";
import type { Protect } from "../domain/types.ts";

const IND = "sig-ema-cross-m@m15";
const UNIT = `follow|${IND}`;
const base: Protect = { tp: 0.02, sl: 0.02, trail: 0.006, hold: 64 };
// the two protects of one signal unit that differ only by trailStep (1 and 0.5)
const twoSteps: Protect[] = [
  { ...base, trailStep: 1, trailFree: false },
  { ...base, trailStep: 0.5, trailFree: false },
];

describe("trail step and trail-free are part of a config's identity", () => {
  it("protects that differ only by trailStep get distinct ids", () => {
    const [a, b] = twoSteps.map((p) => configId("follow", IND, p));
    assert.notEqual(a, b);
    assert.equal(
      parseConfigId(b)?.protect.trailStep,
      0.5,
      "the id parses back to the step it carries",
    );
  });

  it("the trail-free switch is part of the id and parses back", () => {
    const free = configId("follow", IND, { ...base, trailFree: true });
    assert.notEqual(free, configId("follow", IND, base));
    assert.equal(parseConfigId(free)?.protect.trailFree, true);
  });

  it("the defaults (step 1, trail-free off) leave the id as it was", () => {
    assert.equal(configId("follow", IND, base), `follow|${IND}|tp2|sl2|tr0.6|h64`);
    assert.equal(
      configId("follow", IND, { ...base, trailStep: 1, trailFree: false }),
      configId("follow", IND, base),
    );
  });

  it("without a trail there is no trailing step to carry: the id is the plain one", () => {
    const plain = { tp: 0.02, sl: 0.02, trail: 0, hold: 64 };
    assert.equal(
      configId("follow", IND, { ...plain, trailStep: 0.5 }),
      configId("follow", IND, plain),
    );
  });
});

describe("the tape builder keeps both configs of a unit", () => {
  it("both trailing configs get a tape and both trade", () => {
    const candles = syntheticCandles("AAA", 15, 4000, 4000 * 900_000, 11);
    const u = makeUniverse([barsFromCandles("AAA", 15, candles)]);
    const tapes = buildTapes(u, twoSteps, 0.002, undefined, new Set([UNIT]));
    assert.equal(tapes.length, 2, "one tape per config (the second was dropped as a duplicate id)");
    assert.notEqual(tapes[0].id, tapes[1].id);
    assert.deepEqual(tapes.map((t) => t.protect.trailStep).sort(), [0.5, 1]);
    for (const t of tapes) assert.ok(t.n > 0, `${t.id} trades`);
  });
});
