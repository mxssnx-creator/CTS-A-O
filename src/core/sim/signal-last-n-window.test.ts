// The signal execution window at the default settings (D7). A signal's seat validation reads its own last
// signalValidLastN closes (25); its entry gate reads min(lastN, signalValidLastN), which is the last 15 closes at the
// default lastN 15. Pinned on execDecision, so the comment, the defaults and the clamp cannot drift apart silently.
// A 25-close entry window is a variant to measure, not the default: it needs a measured comparison first.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, execDecision, makeTape, type ConfigTape } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const E = Date.UTC(2026, 8, 20, 12);
const IND = "sig-ema-cross-s@m15";
const SIG = `follow|${IND}|tp1|sl1|tr0|h32`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const CTX = { sym: "AAA-USDT", side: 1, book: null };

/** Closes of the signal, oldest first; the last one closes an hour before the entry E (one close per hour). */
function signalTape(rs: number[]): ConfigTape {
  const trades = rs.map((r, i) => {
    const entryT = E - (rs.length - i) * H;
    return {
      cfg: SIG,
      sym: "AAA-USDT",
      side: 1,
      entryT,
      exitT: entryT + 30 * 60_000,
      entry: 100,
      exit: 100 * (1 + r),
      r,
      reason: r > 0 ? "tp" : "sl",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind: "normal",
    } as Trade;
  });
  return makeTape(SIG, "follow", IND, P, "normal", ["AAA-USDT"], trades, [], []);
}

// the newest 15 closes lose 9 of 15 (PF 0.67 < 1.1): the entry window of 15 refuses; the last 25 (PF 6.2) passes
const ENTRY_CASE = [...Array(10).fill(0.05), ...Array(9).fill(-0.01), ...Array(6).fill(0.01)];
// the last 25 lose (PF 0.27 < 1.1); the newest 15 alone (14 wins, 1 loss, PF 14) would pass
const VALID_CASE = [...Array(10).fill(-0.05), ...Array(14).fill(0.01), -0.01];

describe("signal execution window at the default settings (D7)", () => {
  const o = defaultWalkForward(DEFAULT_SETTINGS);

  it("defaults: lastN 15, validLastN 15, signalValidLastN 25 — the entry window is min(lastN, 25) = 15", () => {
    assert.equal(o.lastN, 15);
    assert.equal(o.validLastN, 15);
    assert.equal(o.signalValidLastN, 25);
    assert.equal(Math.min(o.lastN, o.signalValidLastN ?? o.lastN), 15);
  });

  it("entry: a default signal enters on the last 15 closes, not on its last 25", () => {
    assert.deepEqual(execDecision(signalTape(ENTRY_CASE), E, o, CTX), { ok: false, why: "lastN" });
    // the entry window follows the engine's lastN while it is below 25: at lastN 25 the same tape enters
    assert.equal(execDecision(signalTape(ENTRY_CASE), E, { ...o, lastN: 25 }, CTX).ok, true);
  });

  it("validation: a signal's seat validation reads its own last 25 closes", () => {
    assert.deepEqual(execDecision(signalTape(VALID_CASE), E, o, CTX), { ok: false, why: "signalValid" });
    // on the newest 15 alone the same signal would pass validation (the window is 25, not 15)
    assert.notDeepEqual(
      execDecision(signalTape(VALID_CASE), E, { ...o, signalValidLastN: 15 }, CTX),
      { ok: false, why: "signalValid" },
    );
  });

  it("a range's own validLastN never changes a signal's validation (operator rule 2)", () => {
    const withRange = { ...o, rangeCoord: { gn: { validLastN: 5 } } };
    assert.deepEqual(execDecision(signalTape(VALID_CASE), E, withRange, CTX), { ok: false, why: "signalValid" });
  });
});
