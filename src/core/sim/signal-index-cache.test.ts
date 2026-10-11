// The signal acceptance record is built once per tape set, whatever array carries the set (10 Oct, performance): a copy of
// the same tape objects reuses the record without a rebuild on the main thread; a different set builds its own.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeTape, signalAcceptIndexGen } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";

const SIG = "sig-ema-cross-s@m15";
const SYM = "AAA-USDT";
const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 6);

function trade(cfg: string, r: number, k: number): Trade {
  return { cfg, sym: SYM, side: 1, entryT: T0 + k * H, exitT: T0 + (k + 1) * H, entry: 100, exit: 100 * (1 + r), r, reason: "tp", bars: 1, mfe: 0, mae: 0 };
}

function tapes() {
  const a = `follow|${SIG}|tp2|sl4|tr0|h32`;
  const b = `follow|${SIG}|tp3|sl6|tr0|h32`;
  return [
    makeTape(a, "follow", SIG, { tp: 0.02, sl: 0.04, trail: 0, hold: 32 }, "normal", [SYM], [trade(a, 0.01, 1)], [], []),
    makeTape(b, "follow", SIG, { tp: 0.03, sl: 0.06, trail: 0, hold: 32 }, "normal", [SYM], [trade(b, 0.05, 2)], [], []),
  ];
}

/** the record of a tape set, built to its end (in slices when it is large) */
function build(ts: ReturnType<typeof tapes>) {
  const it = signalAcceptIndexGen(ts);
  let step = it.next();
  while (!step.done) step = it.next();
  return step.value;
}

describe("the signal acceptance record is built once per tape set (10 Oct, performance)", () => {
  it("a copy of the same tape objects reuses the record, without a rebuild", () => {
    const ts = tapes();
    const first = build(ts);
    // a rebuild would be a new record instance: the copy must return the first one
    assert.equal(build(ts.slice()), first, "the copy is a hit: the same record instance");
  });

  it("a different set (one tape fewer) builds its own record", () => {
    const ts = tapes();
    const full = build(ts);
    assert.notEqual(build(ts.slice(0, 1)), full, "a different set gets its own record");
  });
});
