// The per-variant min-PF scores of an eval (scripts/lib/eval-variants.mjs): the variant ids, the minimum over windows,
// and a window the variant does not trade in counting as 0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { variantOf, variantScores, pfOf } from "./eval-variants.mjs";

const rth = (cfg) => {
  const { range, trail, hold } = variantOf(cfg);
  return { range, trail, hold };
};

test("a config id gives its range, trail distance and hold time in hours", () => {
  assert.deepEqual(rth("follow|rsi-mom-14-25@m15c|tp1.3|sl3.9|tr0|h96|sh"), { range: "Short", trail: 0, hold: 24 });
  assert.deepEqual(rth("revert|ema-21-55@m5|tp2|sl2|tr50|h48|mc"), { range: "Micro", trail: 0.5, hold: 4 });
  // a wide config (no range tag) on the base lane: 64 bars of 15 min = 16 h
  assert.deepEqual(rth("follow|ema-21-55|tp1|sl2|tr0|h64"), { range: "Wide", trail: 0, hold: 16 });
  // a signal config (no lane): the base lane's bars
  // a signal config is its own range "Signals" (no range tag), on the lane its id names
  assert.deepEqual(rth("follow|sig-ema-cross-s|tp1|sl2|tr0|h192"), { range: "Signals", trail: 0, hold: 48 });
  assert.deepEqual(rth("follow|sig-ema-cross-s@m15|tp1|sl2|tr50|h192"), { range: "Signals", trail: 0.5, hold: 48 });
});

test("pf: no loss is 9, no gain is 0, else gross profit over gross loss", () => {
  assert.equal(pfOf([1, 1]), 9);
  assert.equal(pfOf([-1]), 0);
  assert.equal(pfOf([2, -1]), 2);
});

test("the score is the minimum PF over the windows; a window with no trades counts as 0", () => {
  const cfgA = "follow|x|tp1|sl2|tr0|h64|gn";
  const windows = [
    { name: "D1a", trades: [{ cfg: cfgA, r: 0.03 }, { cfg: cfgA, r: -0.01 }] }, // PF 3
    { name: "D1b", trades: [{ cfg: cfgA, r: 0.02 }, { cfg: cfgA, r: -0.02 }] }, // PF 1
    { name: "H1", trades: [{ cfg: cfgA, r: 0.05 }] }, // PF 9
  ];
  const [v] = variantScores(windows);
  assert.equal(v.range, "General");
  assert.equal(v.minPf, 1);
  assert.equal(v.pass, false, "the weakest window is below the 1.2 floor");
  // a variant that does not trade in one window is 0 there
  const short = { name: "H2", trades: [] };
  const [w] = variantScores([...windows, short]);
  assert.equal(w.minPf, 0);
  assert.equal(w.perWindow.find((p) => p.name === "H2").n, 0);
});

test("variants are kept apart by range, trail and hold, and sorted by their minimum PF", () => {
  const windows = [
    { name: "D1a", trades: [{ cfg: "follow|x|tp1|sl2|tr0|h64|gn", r: 0.02 }, { cfg: "follow|x|tp1|sl2|tr50|h64|gn", r: -0.02 }, { cfg: "follow|x|tp1|sl2|tr0|h96|gn", r: 0.02 }] },
    { name: "D1b", trades: [{ cfg: "follow|x|tp1|sl2|tr0|h64|gn", r: 0.02 }, { cfg: "follow|x|tp1|sl2|tr50|h64|gn", r: -0.02 }, { cfg: "follow|x|tp1|sl2|tr0|h96|gn", r: 0.02 }] },
  ];
  const vs = variantScores(windows);
  assert.equal(vs.length, 3, "range × trail × hold");
  assert.equal(vs[0].minPf >= vs[1].minPf && vs[1].minPf >= vs[2].minPf, true);
  assert.deepEqual(vs.map((v) => [v.trail, v.hold]).sort(), [[0, 16], [0, 24], [0.5, 16]]);
});

test("two signals with the same trail and hold are two variants: a signal's historic configs are never pooled", () => {
  const windows = [
    { name: "D1a", trades: [{ cfg: "follow|sig-a@m15|tp1|sl2|tr50|h192", r: 0.03 }, { cfg: "follow|sig-b@m15|tp1|sl2|tr50|h192", r: -0.02 }] },
    { name: "D1b", trades: [{ cfg: "follow|sig-a@m15|tp1|sl2|tr50|h192", r: 0.03 }, { cfg: "follow|sig-b@m15|tp1|sl2|tr50|h192", r: -0.02 }] },
  ];
  const vs = variantScores(windows);
  assert.equal(vs.length, 2);
  assert.deepEqual(vs.map((v) => v.pair).sort(), ["follow|sig-a", "follow|sig-b"]);
  assert.equal(vs.find((v) => v.pair === "follow|sig-a").pass, true, "A's PF 9 in every window");
  assert.equal(vs.find((v) => v.pair === "follow|sig-b").pass, false, "B loses in every window");
});
