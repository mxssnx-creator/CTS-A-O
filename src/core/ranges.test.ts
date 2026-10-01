import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import { MICRO_RANGE, MINIMAL_RANGE, RANGE_LABEL, SHORT_RANGE, rangeGateOf, rangeOfId } from "./minimal-coord.ts";
import { configId, kindOfId, laneProtect, parseConfigId } from "./pipeline/pipeline.ts";
import { controlTargets, entryCoidKind, isOwnCoid, liveTag, makeCoid } from "./server/live.ts";
import { fittedRangeTps, indHorizonBars, protectGrid, universeSigma1m } from "./sim/walkforward.ts";
import type { Bars, Protect } from "./domain/types.ts";

const grid = (extra: object) => ({ ...DEFAULT_SETTINGS.grid, holdH: [16], ...extra });

test("every range tags its cells: short sh, minimal mn, micro mc; the wide grid stays untagged", () => {
  const cells = protectGrid(15, grid({ short: SHORT_RANGE, minimal: MINIMAL_RANGE, micro: MICRO_RANGE }));
  const by = (t: string | undefined) => cells.filter((p) => p.tag === t).length;
  assert.ok(by("sh") > 0 && by("mn") > 0 && by("mc") > 0 && by(undefined) > 0);
  // the same distances in two ranges stay two configs (each range is tracked on its own)
  const sh = cells.find((p) => p.tag === "sh" && p.tp === 0.006 && p.trail === 0)!;
  const mn = cells.find((p) => p.tag === "mn" && p.tp === 0.006 && p.trail === 0)!;
  assert.ok(sh && mn);
  for (const p of [sh, mn]) {
    const id = configId("follow", "rsi-mom-14-20@m15", p);
    assert.equal(rangeOfId(id), p.tag);
    const back = parseConfigId(id)!;
    assert.equal(back.protect.tag, p.tag);
    assert.equal(kindOfId(id), "normal");
  }
  assert.equal(rangeOfId("follow|rsi|tp3|sl3|tr0|h16"), "");
  assert.equal(RANGE_LABEL[rangeOfId("follow|rsi|tp0.2|sl0.2|tr0|h16|mc|dca")], "Micro");
});

test("a range cell keeps its distances on every lane; a wide cell is lane-scaled", () => {
  const micro: Protect = { tp: 0.002, sl: 0.004, trail: 0, hold: 64, tag: "mc" };
  assert.deepEqual(laneProtect(micro, "rsi-mom-14-20@m1"), micro);
  assert.deepEqual(laneProtect(micro, "rsi-mom-14-20@m30"), micro);
  const wide: Protect = { tp: 0.03, sl: 0.03, trail: 0, hold: 64 };
  assert.notEqual(laneProtect(wide, "rsi-mom-14-20@m30").tp, wide.tp);
});

test("orders of each range carry their own tracking kind; a test run can use its own tag", () => {
  assert.equal(entryCoidKind("follow|x|tp0.2|sl0.2|tr0|h16|mc"), "U");
  assert.equal(entryCoidKind("follow|x|tp0.4|sl0.4|tr0|h16|mn"), "N");
  assert.equal(entryCoidKind("follow|x|tp0.8|sl0.8|tr0|h16|sh"), "H");
  assert.equal(entryCoidKind("follow|x|tp0.6|sl0.6|tr0|h16|mp"), "M");
  assert.equal(entryCoidKind("follow|x|tp3|sl3|tr0|h16"), "E");
  assert.equal(liveTag("bingx-vst-02", {}), "CTSBV2_");
  assert.equal(liveTag("bingx-vst-02", { CTS_CORE_LIVE_TAG: "ctsv2u_" }), "CTSV2U_");
  // an invalid tag falls back to the connection's own
  assert.equal(liveTag("bingx-vst-02", { CTS_CORE_LIVE_TAG: "bad tag" }), "CTSBV2_");
  const prev = process.env.CTS_CORE_LIVE_TAG;
  process.env.CTS_CORE_LIVE_TAG = "CTSV2U_";
  try {
    const c = makeCoid("bingx-vst-02", "U", 1);
    assert.ok(c.startsWith("CTSV2U_U"));
    assert.ok(isOwnCoid(c.toLowerCase(), "bingx-vst-02"));
    // the desk's own default tag is foreign to the test run, and the other way round
    assert.equal(isOwnCoid("CTSBV2_Eabc", "bingx-vst-02"), false);
  } finally {
    if (prev === undefined) delete process.env.CTS_CORE_LIVE_TAG;
    else process.env.CTS_CORE_LIVE_TAG = prev;
  }
  const cs = { notionalUsd: 50, ratio: 1, maxNotionalUsd: 200, maxPositions: 10, rebalancePct: 0.1 };
  const px = new Map([["SOL-USDT", 100]]);
  const lane = (cfg: string) => ({ cfg, sym: "SOL-USDT", side: 1 as const, vol: 1, sl: 0.01 });
  assert.equal(controlTargets([lane("follow|a|tp0.8|sl0.8|tr0|h16|sh")], px, cs).targets[0]?.cfg, "|sh");
  const mixed = controlTargets(
    [lane("follow|a|tp0.8|sl0.8|tr0|h16|sh"), lane("follow|b|tp0.4|sl0.4|tr0|h16|mn")],
    px,
    cs,
  ).targets;
  assert.equal(mixed[0]?.cfg, undefined);
});

test("the range gate is off unless set, and never below 50 closes", () => {
  assert.equal(rangeGateOf({}), null);
  assert.equal(rangeGateOf({ rangeGate: { enabled: false, lastN: 50, minPf: 1.35 } }), null);
  assert.deepEqual(rangeGateOf({ rangeGate: { enabled: true, lastN: 20, minPf: 1.0 } }), { lastN: 50, minPf: 1.1 });
  assert.deepEqual(rangeGateOf({ rangeGate: { enabled: true, lastN: 80, minPf: 1.5 } }), { lastN: 80, minPf: 1.5 });
});

test("range cells are fitted to the indication's horizon and every range keeps coverage", () => {
  assert.equal(indHorizonBars("rsi-mom-14-20@m1"), 14);
  const protects: Protect[] = [
    ...[0.001, 0.002, 0.003, 0.004].map((tp) => ({ tp, sl: tp, trail: 0, hold: 64, tag: "mc" as const })),
    ...[0.006, 0.008, 0.01, 0.012].map((tp) => ({ tp, sl: tp, trail: 0, hold: 64, tag: "sh" as const })),
    { tp: 0.03, sl: 0.03, trail: 0, hold: 64 },
  ];
  const fit = { lo: 0.2, hi: 2.5, keep: 2 };
  // σ 0.1 %/min: a 1m 14-bar indication moves ≈ 0.37 %, a 30m one ≈ 2 %
  const fast = fittedRangeTps("rsi-mom-14-20@m1", 1, protects, 0.001, fit)!;
  const slow = fittedRangeTps("rsi-mom-14-20@m30", 30, protects, 0.001, fit)!;
  assert.ok(fast.has("mc|0.001") && fast.has("mc|0.004"));
  assert.ok(!slow.has("mc|0.001"));
  assert.ok(slow.has("sh|0.012") && slow.has("sh|0.006"));
  // coverage: the slow lane still keeps the two micro targets nearest to its band
  assert.equal([...slow].filter((k) => k.startsWith("mc|")).length, 2);
  assert.ok(slow.has("mc|0.004") && slow.has("mc|0.003"));
  assert.equal(fittedRangeTps("x", 1, protects, 0.001, null), null);
  // σ of a random walk with 0.1 % steps on a 1m series ≈ 0.001
  const n = 500;
  const c = new Float64Array(n);
  let x = 100;
  for (let i = 0; i < n; i++) c[i] = x *= i % 2 ? 1.001 : 1 / 1.001;
  const bars = { sym: "A", tfMin: 1, n, t: new Float64Array(n), o: c, h: c, l: c, c, v: c } as Bars;
  assert.ok(Math.abs(universeSigma1m([bars]) - 0.001) < 0.0001);
});

test("settings check: range gate, fit and seats are validated", async () => {
  const { checkSettings } = await import("./settings-check.ts");
  const g = (extra: object) => ({ grid: { ...DEFAULT_SETTINGS.grid, ...extra } });
  checkSettings(g({}));
  assert.throws(() => checkSettings(g({ rangeGate: { enabled: true, lastN: 20, minPf: 1.35 } })), /last N/);
  assert.throws(() => checkSettings(g({ rangeGate: { enabled: true, lastN: 50, minPf: 1.0 } })), /min PF/);
  assert.throws(() => checkSettings(g({ rangeFit: { enabled: true, lo: 2, hi: 1 } })), /low below high/);
  assert.throws(() => checkSettings(g({ rangeSeats: "yes" })), /range seats/);
  // the defaults: the gate and the fit are on
  assert.deepEqual(rangeGateOf(DEFAULT_SETTINGS.grid), { lastN: 50, minPf: 1.35 });
  assert.equal(DEFAULT_SETTINGS.grid.rangeFit?.enabled, true);
});

test("desk presets: measured on three windows, positive, valid settings, never the Live stage", async () => {
  const { DESK_PRESETS } = await import("./presets.desk.ts");
  const { RESEARCH_PRESETS } = await import("./presets.ts");
  const { checkSettings } = await import("./settings-check.ts");
  assert.ok(DESK_PRESETS.length >= 3);
  for (const p of DESK_PRESETS) {
    assert.ok(p.id.startsWith("desk-"), p.id);
    assert.equal("live" in p.settings, false, p.id);
    checkSettings(p.settings as never);
    assert.ok(p.metrics.pf >= 1.3, `${p.id} PF ${p.metrics.pf}`);
    assert.ok(p.metrics.net > 0, p.id);
    assert.equal(p.metrics.checks?.length, 3, p.id);
    assert.ok(RESEARCH_PRESETS.some((r) => r.id === p.id), `${p.id} listed`);
  }
  assert.ok(DESK_PRESETS.some((p) => p.id === "desk-low-drawdown"));
});
