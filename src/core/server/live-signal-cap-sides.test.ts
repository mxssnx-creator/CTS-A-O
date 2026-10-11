// The live control's signal position cap (signalMaxPositions) counts each direction apart, as the simulation
// (positionsFull), the paper step and the pending entries do (docs/positive-coordinations.md, 6 Oct: "signal position
// cap per direction"). A book at the cap on long signal positions still admits a short signal position, and the reverse.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { controlTargets, type ControlContribution, type ControlSettings } from "./live.ts";

const SIG = "follow|sig-ema-cross-s@m15|x";
const prices = new Map(["AAA", "BBB", "CCC", "DDD"].map((x) => [`${x}-USDT`, 10] as const));
const sigLane = (n: number, sym: string, side: 1 | -1): ControlContribution => ({
  cfg: `${SIG}${n}`,
  sym,
  side,
  vol: 1,
  sl: 0.02,
});
const base: ControlSettings = {
  notionalUsd: 10,
  ratio: 1,
  maxNotionalUsd: 25,
  rebalancePct: 0.25,
  maxPositions: 0,
  signalMaxPositions: 1,
};
const keysOf = (r: { targets: Array<{ key: string }> }) => r.targets.map((t) => t.key).sort();
const capSkipsOf = (r: { skipped: Array<{ sym: string; why: string }> }) =>
  r.skipped.filter((x) => x.why === "max signal control positions (symbol × side)").map((x) => x.sym);

describe("live control: the signal position cap counts each direction apart", () => {
  it("fresh candidates: one long signal at the cap of 1 does not refuse a short signal", () => {
    const lanes = [sigLane(1, "AAA-USDT", 1), sigLane(2, "BBB-USDT", -1)];
    const r = controlTargets(lanes, prices, base);
    assert.deepEqual(keysOf(r), ["AAA-USDT|1", "BBB-USDT|-1"], JSON.stringify(r.skipped));
  });

  it("a book holding the cap on the long side admits a new short signal, and still refuses a second long", () => {
    const lanes = [sigLane(1, "AAA-USDT", 1), sigLane(2, "CCC-USDT", -1), sigLane(3, "DDD-USDT", 1)];
    const r = controlTargets(lanes, prices, { ...base, heldKeys: new Set(["AAA-USDT|1"]) });
    assert.deepEqual(keysOf(r), ["AAA-USDT|1", "CCC-USDT|-1"], JSON.stringify(r.skipped));
    assert.deepEqual(capSkipsOf(r), ["DDD-USDT"], JSON.stringify(r.skipped));
  });

  it("the reverse: a book holding the cap on the short side admits a new long signal", () => {
    const lanes = [sigLane(1, "AAA-USDT", -1), sigLane(2, "BBB-USDT", 1)];
    const r = controlTargets(lanes, prices, { ...base, heldKeys: new Set(["AAA-USDT|-1"]) });
    assert.deepEqual(keysOf(r), ["AAA-USDT|-1", "BBB-USDT|1"], JSON.stringify(r.skipped));
  });
});
