// Evaluation measurement options: the loss prior (one virtual stop-out at the config's own stop in every evaluation
// PF) and the range gate's own floor and range list. Default off: the as-run gates are unchanged.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lastNOk, lastNSideOk, lossPriorOf, makeTape } from "./walkforward.ts";
import type { Protect, Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 1);
const tape = (rs: number[], p: Protect) =>
  makeTape(
    "follow|rsi-mom-14-20@m15|tp1|sl3|tr0|h32|sh",
    "follow",
    "rsi-mom-14-20@m15",
    p,
    "normal",
    ["AAA-USDT"],
    rs.map(
      (r, i) =>
        ({
          cfg: "x",
          sym: "AAA-USDT",
          side: 1,
          entryT: T0 + i * H,
          exitT: T0 + i * H + 30 * 60_000,
          entry: 100,
          exit: 100 * (1 + r),
          r,
          reason: r > 0 ? "tp" : "sl",
          bars: 2,
          mfe: 0,
          mae: 0,
          kind: "normal",
        }) as Trade,
    ),
    [],
    [],
  );
const now = T0 + 100 * H;

describe("evaluation: loss prior and the range gate's own floor", () => {
  it("off by default: a loss-free sample clears every PF gate", () => {
    const tp = tape([0.01, 0.01, 0.01, 0.01, 0.01], { tp: 0.01, sl: 0.03, trail: 0, hold: 32, tag: "sh" });
    assert.equal(lossPriorOf(tp, {}), 0);
    // last 75 with a floor of 5: judged on its 5 wins (PF_NO_LOSS)
    assert.equal(lastNOk(tp, now, 75, 1.35, 0, 0, 5, true), true);
  });

  it("the loss prior counts one stop-out at the config's own stop: 5 wins of 1 % against a 6 % stop fail", () => {
    const wide = tape([0.01, 0.01, 0.01, 0.01, 0.01], { tp: 0.01, sl: 0.06, trail: 0, hold: 32, tag: "sh" });
    const prior = lossPriorOf(wide, { lossPrior: true });
    assert.equal(prior, 0.06);
    // PF 0.05 / 0.06 < 1.05
    assert.equal(lastNOk(wide, now, 75, 1.05, 0, 0, 5, true, prior), false);
    assert.equal(lastNSideOk(wide, 1, now, 75, 1.05, 0, 0, 5, true, prior), false);
    // a tight stop pays little: PF 0.05 / 0.01 = 5
    const tight = tape([0.01, 0.01, 0.01, 0.01, 0.01], { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag: "sh" });
    assert.equal(lastNOk(tight, now, 75, 1.05, 0, 0, 5, true, lossPriorOf(tight, { lossPrior: true })), true);
  });

  it("a strict floor (0) needs the gate's whole sample", () => {
    const tp = tape([0.01, 0.01, 0.01, 0.01, 0.01], { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag: "sh" });
    assert.equal(lastNOk(tp, now, 75, 1.05, 0, 0, 0, true), false);
    assert.equal(lastNOk(tp, now, 5, 1.05, 0, 0, 0, true), true);
  });
});
