// The per-variant min-PF scores of an eval (scripts/lib/eval-variants.mjs): the variant ids read from the config ids, the
// minimum over windows, a window the variant does not trade in counting as 0, and a window the run did not compute
// (memory fallback, short warm-up) as unscored.
import { test } from "node:test";
import assert from "node:assert/strict";
import { variantOf, variantScores, pfOf } from "./eval-variants.mjs";

const rth = (cfg) => {
  const { range, trail, hold, atr } = variantOf(cfg);
  return { range, trail, hold, atr };
};

test("a config id gives its range, trail distance and hold time in hours", () => {
  assert.deepEqual(rth("follow|rsi-mom-14-25@m15c|tp1.3|sl3.9|tr0|h96|sh"), { range: "Short", trail: 0, hold: 24, atr: "" });
  assert.deepEqual(rth("revert|ema-21-55@m5|tp2|sl2|tr50|h48|mc"), { range: "Micro", trail: 0.5, hold: 4, atr: "" });
  // a wide config (no range tag) on the base lane: 64 bars of 15 min = 16 h
  assert.deepEqual(rth("follow|ema-21-55|tp1|sl2|tr0|h64"), { range: "Wide", trail: 0, hold: 16, atr: "" });
});

test("a trail distance reads as a fraction without float noise (112 % of an id is 0.0112, not 0.011200000000000002)", () => {
  assert.equal(rth("follow|x@m15|tp2|sl2|tr1.12|h64|gn").trail, 0.0112);
  assert.equal(rth("follow|x@m15|tp2|sl2|tr0.0|h64|gn").trail, 0);
});

test("a range tag before a DCA or Axis suffix still names the range", () => {
  assert.equal(rth("revert|ema-21-55@m5|tp2|sl2|tr0|h48|mc|dcaA").range, "Micro");
  assert.equal(rth("revert|ema-21-55@m5|tp2|sl2|tr0|h48|sh|ax-atr3|axis").range, "Short");
  assert.equal(rth("revert|ema-21-55@m5|tp2|sl2|tr0|h48|gn|axd-atr3h|axis").range, "General");
  assert.equal(rth("follow|ema-21-55@m15|tp2|sl2|tr0|h48|lg|dca").range, "Long");
});

test("an inherited object key is not a range tag", () => {
  assert.equal(rth("follow|ema-21-55@m15|tp2|sl2|tr0|h48|constructor").range, "Wide");
  assert.equal(rth("follow|ema-21-55@m15|tp2|sl2|tr0|h48|toString").range, "Wide");
});

test("a signal's lanes are its own variants: two lanes of one signal are not pooled", () => {
  const a = variantOf("follow|sig-a-s@m5|tp1|sl2|tr0|h576");
  const b = variantOf("follow|sig-a-s@m15|tp1|sl2|tr0|h192");
  assert.equal(a.range, "Signals");
  assert.notEqual(a.pair, b.pair);
  assert.equal(a.hold, 48);
  assert.equal(b.hold, 48);
});

test("ATR protects keep their atr token: ATR variants do not merge with each other or with pct variants", () => {
  const t08 = rth("follow|x@m15|tp2|sl2|tr0.8|h64|atr2x2t0.8");
  const t24 = rth("follow|x@m15|tp2|sl2|tr0.8|h64|atr2x2t2.4");
  const pct = rth("follow|x@m15|tp2|sl2|tr0.8|h64");
  assert.notEqual(t08.atr, t24.atr);
  assert.notEqual(t08.atr, pct.atr);
  const vs = variantScores([
    { name: "W1", trades: [{ cfg: "follow|x@m15|tp2|sl2|tr0.8|h64|atr2x2t0.8", r: 0.01 }, { cfg: "follow|x@m15|tp2|sl2|tr0.8|h64|atr2x2t2.4", r: -0.01 }] },
  ]);
  assert.equal(vs.length, 2, "two ATR variants stay apart");
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
  assert.equal(v.status, "fail", "the weakest window is below the 1.2 floor");
  const [w] = variantScores([...windows, { name: "H2", trades: [] }]);
  assert.equal(w.minPf, 0);
  assert.equal(w.perWindow.find((p) => p.name === "H2").n, 0);
  assert.equal(w.perWindow.find((p) => p.name === "H2").status, "fail");
});

test("a window the run did not compute for the range is unscored, not 0 and not a pass", () => {
  // memory fallback at level 1: Micro was left out of D1b; a Micro variant has no trades there, which is not a zero
  const cfgM = "revert|ema-21-55@m5|tp2|sl2|tr0|h48|mc";
  const windows = [
    { name: "D1a", trades: [{ cfg: cfgM, r: 0.02 }, { cfg: cfgM, r: 0.02 }] },
    { name: "D1b", trades: [], uncomputed: ["Micro"] },
  ];
  const [v] = variantScores(windows);
  assert.equal(v.range, "Micro");
  assert.equal(v.status, "unscored");
  assert.equal(v.pass, false);
  assert.equal(v.perWindow.find((p) => p.name === "D1b").status, "unscored");
  assert.equal(v.perWindow.find((p) => p.name === "D1b").pf, null);
  // a General variant in the same run is scored on every window (not uncomputed for General)
  const cfgG = "follow|x|tp1|sl2|tr0|h64|gn";
  const g = variantScores([...windows, { name: "H1", trades: [{ cfg: cfgG, r: 0.02 }] }]).find((x) => x.range === "General");
  assert.equal(g.status, "fail", "General has no unscored window");
});

test("the minimum trade count is an option, off by default", () => {
  const cfg = "follow|x|tp1|sl2|tr0|h64|gn";
  const windows = [{ name: "D1a", trades: [{ cfg, r: 0.02 }] }, { name: "D1b", trades: [{ cfg, r: 0.02 }] }];
  assert.equal(variantScores(windows)[0].pass, true, "one winning trade per window passes with no guard");
  const [g] = variantScores(windows, { minN: 5 });
  assert.equal(g.pass, false, "with minN 5 a thin window does not pass");
  assert.equal(g.perWindow[0].status, "fail");
});

test("variants are kept apart by range, trail, hold and atr, and sorted by their minimum PF", () => {
  const windows = [
    { name: "D1a", trades: [{ cfg: "follow|x|tp1|sl2|tr0|h64|gn", r: 0.02 }, { cfg: "follow|x|tp1|sl2|tr50|h64|gn", r: -0.02 }, { cfg: "follow|x|tp1|sl2|tr0|h96|gn", r: 0.02 }] },
    { name: "D1b", trades: [{ cfg: "follow|x|tp1|sl2|tr0|h64|gn", r: 0.02 }, { cfg: "follow|x|tp1|sl2|tr50|h64|gn", r: -0.02 }, { cfg: "follow|x|tp1|sl2|tr0|h96|gn", r: 0.02 }] },
  ];
  const vs = variantScores(windows);
  assert.equal(vs.length, 3, "range × trail × hold");
  assert.ok(vs[0].minPf >= vs[1].minPf && vs[1].minPf >= vs[2].minPf);
  assert.deepEqual(vs.map((v) => [v.trail, v.hold]).sort(), [[0, 16], [0, 24], [0.5, 16]]);
});

test("two signals with the same trail and hold are two variants: a signal's historic configs are never pooled", () => {
  const windows = [
    { name: "D1a", trades: [{ cfg: "follow|sig-a@m15|tp1|sl2|tr50|h192", r: 0.03 }, { cfg: "follow|sig-b@m15|tp1|sl2|tr50|h192", r: -0.02 }] },
    { name: "D1b", trades: [{ cfg: "follow|sig-a@m15|tp1|sl2|tr50|h192", r: 0.03 }, { cfg: "follow|sig-b@m15|tp1|sl2|tr50|h192", r: -0.02 }] },
  ];
  const vs = variantScores(windows);
  assert.equal(vs.length, 2);
  assert.deepEqual(vs.map((v) => v.pair).sort(), ["follow|sig-a@m15", "follow|sig-b@m15"]);
  assert.equal(vs.find((v) => v.pair === "follow|sig-a@m15").pass, true, "A's PF 9 in every window");
  assert.equal(vs.find((v) => v.pair === "follow|sig-b@m15").pass, false, "B loses in every window");
});
