import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import {
  GENERAL_RANGE,
  LONG_RANGE,
  MICRO_RANGE,
  MINIMAL_RANGE,
  RANGE_LABEL,
  SHORT_RANGE,
  rangeGateOf,
  rangeMinTfOf,
  rangeOfId,
} from "./minimal-coord.ts";
import {
  baseRangeProtects,
  basePassTags,
  baseRangeCounts,
  baseSetsGates,
  rangeAppliesTo,
  configId,
  kindOfId,
  laneProtect,
  makeUniverse,
  parseConfigId,
} from "./pipeline/pipeline.ts";
import { controlTargets, entryCoidKind, isOwnCoid, liveTag, makeCoid } from "./server/live.ts";
import { buildTapes, fittedRangeTps, indHorizonBars, protectGrid, universeSigma1m } from "./sim/walkforward.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import type { Bars, Protect } from "./domain/types.ts";

const grid = (extra: object) => ({ ...DEFAULT_SETTINGS.grid, holdH: [16], ...extra });

test("the position-cost ranges: Minimal 4–8×, Short 8–14×, General 14–22× step 2, Long 22–32× step 2", () => {
  const mult = (r: { tp: readonly number[] }) => r.tp.map((x) => +(x / 0.002).toFixed(6));
  assert.deepEqual(mult(MINIMAL_RANGE), [4, 5, 6, 7, 8]);
  // a boundary multiple belongs to the lower range: no cell is computed twice
  assert.deepEqual(mult(SHORT_RANGE), [9, 10, 11, 12, 13, 14]);
  assert.deepEqual(mult(GENERAL_RANGE), [16, 18, 20, 22]);
  assert.deepEqual(mult(LONG_RANGE), [24, 26, 28, 30, 32]);
  // both trailing distances in every range
  for (const r of [MINIMAL_RANGE, SHORT_RANGE, GENERAL_RANGE, LONG_RANGE])
    assert.deepEqual([...r.trailOfTp], [0, 0.5, 0.75]);
  // the default grid builds the four ranges (the wide targets are covered by General and Long)
  assert.deepEqual(DEFAULT_SETTINGS.grid.tp, []);
  const cells = protectGrid(15, DEFAULT_SETTINGS.grid);
  const tags = new Set(cells.map((p) => p.tag ?? ""));
  assert.deepEqual([...tags].sort(), ["gn", "lg", "mn", "sh"]);
  const tps = new Map<string, Set<number>>();
  for (const p of cells) (tps.get(p.tag!) ?? tps.set(p.tag!, new Set()).get(p.tag!)!).add(p.tp);
  assert.equal(tps.get("mn")!.size + tps.get("sh")!.size + tps.get("gn")!.size + tps.get("lg")!.size, 20);
});

test("every range tags its cells: minimal mn, short sh, general gn, long lg, micro mc; the wide grid stays untagged", () => {
  const cells = protectGrid(15, grid({ tp: [0.03], micro: MICRO_RANGE }));
  const by = (t: string | undefined) => cells.filter((p) => p.tag === t).length;
  assert.ok(by("sh") > 0 && by("mn") > 0 && by("gn") > 0 && by("lg") > 0 && by("mc") > 0 && by(undefined) > 0);
  for (const tag of ["mn", "sh", "gn", "lg"]) {
    const p = cells.find((c) => c.tag === tag && c.trail === 0)!;
    const id = configId("follow", "rsi-mom-14-20@m15", p);
    assert.equal(rangeOfId(id), tag);
    const back = parseConfigId(id)!;
    assert.equal(back.protect.tag, tag);
    assert.equal(kindOfId(id), "normal");
    assert.equal(kindOfId(`${id}|dca`), "dca");
  }
  assert.equal(rangeOfId("follow|rsi|tp3|sl3|tr0|h16"), "");
  assert.equal(RANGE_LABEL[rangeOfId("follow|rsi|tp0.2|sl0.2|tr0|h16|mc|dca")], "Micro");
  assert.equal(RANGE_LABEL[rangeOfId("follow|rsi|tp3.2|sl3.2|tr0|h16|gn")], "General");
  assert.equal(RANGE_LABEL[rangeOfId("follow|rsi|tp6|sl6|tr0|h16|lg")], "Long");
});

test("a range cell keeps its distances on every lane and its hold time; a wide cell is lane-scaled", () => {
  const micro: Protect = { tp: 0.002, sl: 0.004, trail: 0, hold: 64, tag: "mc" };
  assert.deepEqual(laneProtect(micro, "rsi-mom-14-20@m15"), micro);
  // 64 bars of 15m = 16 h: 960 bars on 1m, 32 bars on 30m — the distances stay the same
  assert.deepEqual(laneProtect(micro, "rsi-mom-14-20@m1"), { ...micro, hold: 960 });
  assert.deepEqual(laneProtect(micro, "rsi-mom-14-20@m30"), { ...micro, hold: 32 });
  // a General / Long target is never cut off after 64 minutes on a 1m lane
  for (const tag of ["gn", "lg"] as const) {
    const p: Protect = { tp: 0.05, sl: 0.025, trail: 0.025, hold: 96, tag };
    const one = laneProtect(p, "trend-st@m1c");
    assert.equal(one.hold, 96 * 15);
    assert.deepEqual({ ...one, hold: 96 }, p);
    assert.equal(laneProtect(p, "trend-st@m5").hold, 96 * 3);
  }
  const wide: Protect = { tp: 0.03, sl: 0.03, trail: 0, hold: 64 };
  assert.notEqual(laneProtect(wide, "rsi-mom-14-20@m30").tp, wide.tp);
});

test("orders of each range carry their own tracking kind; a test run can use its own tag", () => {
  assert.equal(entryCoidKind("follow|x|tp0.2|sl0.2|tr0|h16|mc"), "U");
  assert.equal(entryCoidKind("follow|x|tp0.4|sl0.4|tr0|h16|mn"), "N");
  assert.equal(entryCoidKind("follow|x|tp0.8|sl0.8|tr0|h16|sh"), "H");
  assert.equal(entryCoidKind("follow|x|tp0.6|sl0.6|tr0|h16|mp"), "M");
  assert.equal(entryCoidKind("follow|x|tp3.2|sl3.2|tr0|h16|gn"), "G");
  assert.equal(entryCoidKind("follow|x|tp6|sl6|tr0|h16|lg"), "L");
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
  assert.deepEqual(rangeGateOf({ rangeGate: { enabled: true, lastN: 20, minPf: 1.0 } }), { lastN: 50, minPf: 1.05 });
  assert.deepEqual(rangeGateOf({ rangeGate: { enabled: true, lastN: 50, minPf: 1.05 } }), { lastN: 50, minPf: 1.05 });
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
  // the defaults: the gate is on (small ranges only); the fit is off — every config possibility is computed
  assert.deepEqual(rangeGateOf(DEFAULT_SETTINGS.grid), { lastN: 50, minPf: 1.35 });
  assert.equal(DEFAULT_SETTINGS.grid.rangeFit?.enabled, false);
});

test("desk presets: measured on three windows, positive, valid settings, never the Live stage", async () => {
  const { DESK_PRESETS } = await import("./presets.desk.ts");
  const { ALL_RESEARCH_PRESETS: RESEARCH_PRESETS } = await import("./presets.ts");
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

test("demo probe: the best range tapes per range are seated beside the picks, at most N per range", async () => {
  const { probePicks, withProbe } = await import("./sim/walkforward.ts");
  const H = 3_600_000;
  const T = Date.UTC(2026, 9, 1);
  const tape = (id: string, tag: Protect["tag"], r: number) => {
    const n = 3;
    const exitT = new Float64Array([T - 3 * H, T - 2 * H, T - H]);
    const gp = new Float64Array(n + 1);
    const gl = new Float64Array(n + 1);
    const rs = new Float64Array(n + 1);
    for (let i = 1; i <= n; i++) {
      gp[i] = gp[i - 1] + Math.max(0, r);
      gl[i] = gl[i - 1] + Math.max(0, -r);
      rs[i] = rs[i - 1] + r;
    }
    return { id, protect: { tp: 0.002, sl: 0.002, trail: 0, hold: 64, ...(tag ? { tag } : {}) }, n, exitT, gp, gl, rs } as never;
  };
  const tapes = [
    tape("a|mc", "mc", 0.01),
    tape("b|mc", "mc", -0.01),
    tape("c|mc", "mc", 0.005),
    tape("d|mn", "mn", -0.02),
    tape("e|wide", undefined, 0.05),
  ];
  const o = { probe: { perRange: 2 }, longH: 24, preH: 12 };
  const xs = probePicks(tapes, T, o as never, new Set());
  assert.deepEqual(
    xs.map((x) => x.id),
    ["a|mc", "c|mc", "d|mn"],
  );
  // already picked tapes are not doubled; without the probe nothing is added
  assert.deepEqual(
    probePicks(tapes, T, o as never, new Set(["a|mc"])).map((x) => x.id),
    ["c|mc", "b|mc", "d|mn"],
  );
  const base = { picks: [], eligible: 0 };
  assert.equal(withProbe(base, tapes, T, { probe: null } as never), base);
  assert.equal(withProbe(base, tapes, T, { ...o } as never).picks.length, 3);
});

test("the probe is refused on mainnet and dropped when a runtime trades mainnet", async () => {
  const { CoreRuntime, setProbe } = await import("./server/runtime.server.ts");
  const { CoreDb } = await import("./server/db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { live: { ...DEFAULT_SETTINGS.live, connId: "bingx-vst-02" } }, { market: "synthetic" });
  setProbe(rt, 5);
  assert.deepEqual(rt.wf.probe, { perRange: 5 });
  rt.updateSettings({ symbols: rt.settings.symbols });
  assert.deepEqual(rt.wf.probe, { perRange: 5 }, "kept across a settings change");
  rt.updateSettings({ live: { ...rt.settings.live, connId: "bingx-x01" } });
  assert.equal(rt.wf.probe, null);
  assert.throws(() => setProbe(rt, 5), /demo/);
  rt.stop();
});

test("heatmap probe: one seat per protect cell (TP × SL × trailing), a cell without closes included", async () => {
  const { probePicks } = await import("./sim/walkforward.ts");
  const { setProbe, CoreRuntime } = await import("./server/runtime.server.ts");
  const { CoreDb } = await import("./server/db.server.ts");
  const H = 3_600_000;
  const T = Date.UTC(2026, 9, 1);
  const tape = (id: string, p: { tp: number; sl: number; trail: number }, rs0: number[]) => {
    const n = rs0.length;
    const exitT = new Float64Array(rs0.map((_, i) => T - (n - i) * H));
    const gp = new Float64Array(n + 1);
    const gl = new Float64Array(n + 1);
    const rs = new Float64Array(n + 1);
    rs0.forEach((r, i) => {
      gp[i + 1] = gp[i] + Math.max(0, r);
      gl[i + 1] = gl[i] + Math.max(0, -r);
      rs[i + 1] = rs[i] + r;
    });
    return { id, kind: "normal", ind: "ema-9-21@m15", protect: { ...p, hold: 64 }, n, exitT, gp, gl, rs } as never;
  };
  const c1 = { tp: 0.01, sl: 0.005, trail: 0 };
  const c2 = { tp: 0.02, sl: 0.04, trail: 0.01 };
  const c3 = { tp: 0.08, sl: 0.24, trail: 0 };
  const tapes = [
    tape("x1", c1, [0.01, -0.005]),
    tape("y1", c1, [0.02, 0.01]),
    tape("x2", c2, [-0.03]),
    tape("x3", c3, []), // no close yet: still seated, so the cell trades
  ];
  const o = { probe: { perRange: 0, perCell: 1 }, longH: 24, preH: 12 };
  assert.deepEqual(
    probePicks(tapes, T, o as never, new Set()).map((x) => x.id).sort(),
    ["x2", "x3", "y1"],
  );
  // other lanes (scaled distances) and DCA / Axis tapes are not heatmap cells
  const off = [
    { ...(tape("m1", c1, [0.05]) as object), ind: "ema-9-21@m1" },
    { ...(tape("d1", c1, [0.05]) as object), kind: "dca" },
  ];
  assert.deepEqual(
    probePicks([...tapes, ...off] as never, T, o as never, new Set()).map((x) => x.id).sort(),
    ["x2", "x3", "y1"],
  );
  // demo only
  const rt = new CoreRuntime(new CoreDb(":memory:"), { live: { ...DEFAULT_SETTINGS.live, connId: "bingx-vst-02" } }, { market: "synthetic" });
  setProbe(rt, 0, 1);
  assert.deepEqual(rt.wf.probe, { perRange: 0, perCell: 1 });
  rt.updateSettings({ live: { ...rt.settings.live, connId: "bingx-x01" } });
  assert.equal(rt.wf.probe, null);
  rt.stop();
});

test("General and Long trade on 15m lanes and slower by default; every range can set its shortest lane", () => {
  assert.deepEqual(rangeMinTfOf({ short: SHORT_RANGE, general: GENERAL_RANGE, long: LONG_RANGE }), { sh: 15, gn: 15, lg: 15 });
  assert.deepEqual(rangeMinTfOf({ general: { ...GENERAL_RANGE, minTf: 0 }, short: { ...SHORT_RANGE, minTf: 5 } }), { sh: 5 });
  assert.deepEqual(rangeMinTfOf({ general: false, long: false }), {});
  const t0 = Date.UTC(2026, 8, 20);
  const u = makeUniverse([
    barsFromCandles("A-USDT", 1, syntheticCandles("A", 1, 600, t0)),
    barsFromCandles("A-USDT", 15, syntheticCandles("A", 15, 200, t0)),
  ]);
  const protects: Protect[] = [
    { tp: 0.016, sl: 0.016, trail: 0, hold: 64, tag: "sh" },
    { tp: 0.04, sl: 0.02, trail: 0, hold: 64, tag: "gn" },
    { tp: 0.06, sl: 0.03, trail: 0, hold: 64, tag: "lg" },
  ];
  const only = new Set(["follow|rsi-mom-14-20@m1", "follow|rsi-mom-14-20@m15"]);
  const floors = { minSl: 0, minTrail: 0, rangeMinTf: { gn: 15, lg: 15 } };
  const got = buildTapes(u, protects, 0.002, undefined, only, null, undefined, floors).map((t) => `${t.ind} ${t.protect.tag}`);
  assert.deepEqual(got.sort(), [
    "rsi-mom-14-20@m1 sh",
    "rsi-mom-14-20@m15 gn",
    "rsi-mom-14-20@m15 lg",
    "rsi-mom-14-20@m15 sh",
  ]);
  // without the setting every lane carries every range
  assert.equal(buildTapes(u, protects, 0.002, undefined, only, null, undefined, { minSl: 0, minTrail: 0 }).length, 6);
});

test("Base, one middle cell per range (baseBest off): each enabled range against that range's own min PF", () => {
  // with baseBest off only the small ranges get their own Base cell (Short / General / Long: the default protect)
  const ps = baseRangeProtects({ holdH: [16], baseBest: false, minimal: MINIMAL_RANGE, short: SHORT_RANGE, general: GENERAL_RANGE, long: false });
  assert.deepEqual(
    ps.map((p) => p.tag),
    ["mn"],
  );
  assert.deepEqual(
    baseRangeProtects({ holdH: [16], baseBest: false, minimal: MINIMAL_RANGE, short: { ...SHORT_RANGE, ownBase: true } }).map((p) => p.tag),
    ["mn", "sh"],
  );
  const mn = ps[0];
  // the middle TP and the middle stop ratio, no trail, 16 h in 15m bars
  assert.equal(mn.tp, 0.012);
  assert.equal(mn.sl, 0.018);
  assert.equal(mn.trail, 0);
  assert.equal(mn.hold, 64);
  const st = (pf: number) => ({ n: 40, pf, net: 5, mdd: 1 }) as never;
  const g = { minPf: 1.05, minTrades: 10, rangeMinPf: { minimal: 1.08, general: 1.12, long: 1.18 } };
  // default fails, Minimal passes at its own minimum, General misses its stricter one
  assert.deepEqual(basePassTags({ full: st(0.9), ranges: { mn: st(1.1), gn: st(1.1) } }, g), ["mn"]);
  assert.deepEqual(basePassTags({ full: st(1.2), ranges: { mn: st(1.0), gn: st(1.2) } }, g), ["", "gn"]);
  assert.deepEqual(basePassTags({ full: st(1.0) }, g), []);
  // a range without its own cell passes with the default protect
  assert.deepEqual(basePassTags({ full: st(1.2), ranges: { mn: st(1.0) } }, g, ["mn", "sh", "gn"]), ["", "sh", "gn"]);
  assert.deepEqual(basePassTags({ full: st(0.9), ranges: { mn: st(1.2) } }, g, ["mn", "sh", "gn"]), ["mn"]);
  // …but against its own range minimum: a default cell at PF 1.10 clears the stage (1.05) and Short (no minimum
  // of its own), not General (1.12) or Long (1.18)
  assert.deepEqual(basePassTags({ full: st(1.1) }, g, ["sh", "gn", "lg"]), ["", "sh"]);
});

test("Base at every config of every range (default): each target × stop, ranges on their own cells", () => {
  const ps = baseRangeProtects({ holdH: [16], minimal: MINIMAL_RANGE, short: SHORT_RANGE, general: GENERAL_RANGE, long: LONG_RANGE });
  const n = (r: { tp: readonly number[]; slOfTp: readonly number[] }) => new Set(r.tp).size * new Set(r.slOfTp).size;
  const count = (t: string) => ps.filter((p) => p.tag === t).length;
  assert.equal(count("mn"), n(MINIMAL_RANGE));
  assert.equal(count("sh"), n(SHORT_RANGE), "Short gets its own cells");
  assert.equal(count("gn"), n(GENERAL_RANGE));
  assert.equal(count("lg"), n(LONG_RANGE));
  assert.ok(ps.every((p) => p.trail === 0 && p.hold === 64));
  // a range can stay on the default protect, or on its middle cell
  assert.equal(baseRangeProtects({ holdH: [16], short: { ...SHORT_RANGE, ownBase: false } }).length, 0);
  assert.equal(baseRangeProtects({ holdH: [16], short: { ...SHORT_RANGE, baseBest: false, ownBase: true } }).length, 1);
});

test("a range's Base result is its best cell by net", () => {
  const g = { minPf: 1.05, minTrades: 10 };
  const best = { n: 40, pf: 1.3, net: 4, mdd: 1 };
  // the selection itself is rangeBaseStats; the pass decision then reads that one result
  assert.deepEqual(basePassTags({ full: { n: 40, pf: 0.8, net: -3, mdd: 2 } as never, ranges: { sh: best as never } }, g), ["sh"]);
});

test("sets per range after the Base PF evaluation: the counts agree with the Base gate, with each range's PF", () => {
  const st = (pf: number) => ({ n: 40, pf, net: pf > 1 ? 5 : -5, mdd: 1 }) as never;
  const g = { minPf: 1.05, minTrades: 10, rangeMinPf: { minimal: 1.08, general: 1.12, long: 1.18 } };
  const tags = ["mn", "sh", "gn", "lg"];
  const runs = [
    { ind: "rsi-mom-14-20@m15", full: st(0.9), ranges: { mn: st(1.1), gn: st(1.1) } },
    { ind: "rsi-mom-14-20@m15", full: st(1.2), ranges: { mn: st(1.0), gn: st(1.2) } },
    { ind: "rsi-mom-14-20@m15", full: st(1.0) },
    { ind: "rsi-mom-14-20@m15", full: st(1.1) },
  ];
  const rows = baseRangeCounts(runs, g, tags);
  assert.deepEqual(
    rows.map((r) => r.tag),
    ["", ...tags],
  );
  for (const r of rows) {
    const expect = runs.filter((x) => basePassTags(x, g, tags).includes(r.tag)).length;
    assert.equal(r.passed, expect, `range "${r.tag}": ${r.passed} passed, the gate says ${expect}`);
    assert.equal(r.evaluated, runs.length);
  }
  const by = Object.fromEntries(rows.map((r) => [r.tag, r]));
  assert.equal(by.mn.minPf, 1.08);
  assert.equal(by.lg.minPf, 1.18);
  // Wide: 1.2 and 1.1 pass (median of the passed is the upper middle), Long none
  assert.equal(by[""].passed, 2);
  assert.equal(by[""].pfPassedMedian, 1.2);
  assert.equal(by.lg.passed, 1);
  assert.equal(by.lg.pfPassedMedian, 1.2);
});

test("sets per range after Base count only the pairs a range builds sets for; a range that is off evaluates none", () => {
  const st = (pf: number) => ({ n: 40, pf, net: pf > 1 ? 5 : -5, mdd: 1 }) as never;
  const g = { minPf: 1.05, minTrades: 10 };
  const runs = [
    { ind: "rsi-mom-14-20@m1", full: st(1.2) }, // 1m lane: too fast for Short (15m+)
    { ind: "rsi-mom-14-20@m15", full: st(1.2) },
    { ind: "mc-burst-3@m1", full: st(1.3), ranges: { mc: st(1.3) } }, // a Micro indication: Micro only
  ];
  const o = { enabled: (t: string) => t !== "gn", minTf: { sh: 15 }, microOwnInds: true };
  const rows = baseRangeCounts(runs, g, ["mc", "sh", "gn"], (ind, tag) => rangeAppliesTo(ind, tag, o));
  const by = Object.fromEntries(rows.map((r) => [r.tag, r]));
  assert.equal(by[""].evaluated, 2, "Wide: the two engine indications");
  assert.equal(by.mc.evaluated, 1, "Micro: its own indication only");
  assert.equal(by.sh.evaluated, 1, "Short: the 15m lane only");
  assert.equal(by.gn.evaluated, 0, "General off");
  assert.equal(by.gn.passed, 0);
  // a plain indication takes the base timeframe
  assert.equal(rangeAppliesTo("rsi-mom-14-20", "sh", { ...o, baseTf: 1 }), false);
});

test("a pair computes only the cells of the ranges it passed; a pair without Base tags computes every cell", () => {
  const t0 = Date.UTC(2026, 8, 20);
  const u = makeUniverse([barsFromCandles("A-USDT", 15, syntheticCandles("A", 15, 200, t0))]);
  const protects: Protect[] = [
    { tp: 0.026, sl: 0.039, trail: 0, hold: 32 },
    { tp: 0.012, sl: 0.012, trail: 0, hold: 64, tag: "mn" },
    { tp: 0.04, sl: 0.02, trail: 0, hold: 64, tag: "gn" },
  ];
  const pair = "follow|rsi-mom-14-20@m15";
  const tags = (floors: object) =>
    buildTapes(u, protects, 0.002, undefined, new Set([pair]), null, undefined, { minSl: 0, minTrail: 0, ...floors })
      .map((t) => t.protect.tag ?? "")
      .sort();
  assert.deepEqual(tags({ pairTags: { [pair]: ["mn"] } }), ["mn"]);
  assert.deepEqual(tags({ pairTags: { [pair]: ["", "gn"] } }), ["", "gn"]);
  assert.deepEqual(tags({ pairTags: { other: ["mn"] } }), ["", "gn", "mn"]);
});

test("a held config keeps its own tape, not every cell of its range", () => {
  const t0 = Date.UTC(2026, 8, 20);
  const u = makeUniverse([barsFromCandles("A-USDT", 15, syntheticCandles("A", 15, 200, t0))]);
  const protects: Protect[] = [
    { tp: 0.012, sl: 0.012, trail: 0, hold: 64, tag: "mn" },
    { tp: 0.04, sl: 0.02, trail: 0, hold: 64, tag: "gn" },
    { tp: 0.05, sl: 0.025, trail: 0, hold: 64, tag: "gn" },
  ];
  const pair = "follow|rsi-mom-14-20@m15";
  const build = (floors: object) =>
    buildTapes(u, protects, 0.002, undefined, new Set([pair]), null, undefined, { minSl: 0, minTrail: 0, ...floors }).map((t) => t.id);
  // the pair passed Base in Minimal only; one General config is held by the paper book
  const all = build({});
  const heldId = all.find((id) => id.includes("|gn") && id.includes("tp4"))!;
  const got = build({ pairTags: { [pair]: ["mn"] }, heldIds: new Set([heldId]) });
  assert.deepEqual(
    got.sort(),
    [...all.filter((id) => id.includes("|mn")), heldId].sort(),
    "the Minimal cells and exactly the held General config",
  );
  // without the held id the General cells are gone
  assert.deepEqual(build({ pairTags: { [pair]: ["mn"] } }).filter((id) => id.includes("|gn")), []);
});

test("Base sets floor: a lower floor computes more pairs' sets; the stage gate is unchanged without it", () => {
  const st = (pf: number, net: number) => ({ n: 40, pf, net, mdd: 1 }) as never;
  const g = { ...DEFAULT_SETTINGS.gates, minPf: 1.05, minTrades: 10, rangeMinPf: { long: 1.18 } };
  assert.equal(baseSetsGates(g), g, "unset: the stage gates");
  const wide = baseSetsGates({ ...g, baseSetsMinPf: 0.9 });
  assert.equal(wide.minPf, 0.9);
  assert.equal(wide.rangeMinPf, undefined, "one floor for every range");
  // PF 0.95 (net negative) computes its sets under a 0.9 floor, not under the stage gate
  assert.deepEqual(basePassTags({ full: st(0.95, -2) }, wide, ["sh", "lg"]), ["", "sh", "lg"]);
  assert.deepEqual(basePassTags({ full: st(0.95, -2) }, g, ["sh", "lg"]), []);
  // at the stage gate a positive net is still required
  assert.deepEqual(basePassTags({ full: st(1.1, -1) }, g, ["sh"]), []);
});

test("a Micro indication passing only at the default cell has no set: it does not pass Base (no validated pair without sets)", () => {
  const st = (pf: number) => ({ n: 40, pf, net: pf > 1 ? 5 : -5, mdd: 1 }) as never;
  const g = { minPf: 1.05, minTrades: 10 };
  const o = { enabled: () => true, minTf: {}, microOwnInds: true };
  const tagsOf = (r: { ind: string; full: never; ranges?: Record<string, never> }) =>
    basePassTags(r, g, ["mc", "sh"]).filter((t) => rangeAppliesTo(r.ind, t, o));
  // default cell passes, Micro's own cell fails: the Micro indication builds only Micro sets → no pass
  assert.deepEqual(tagsOf({ ind: "mc-rsi2-5@m15", full: st(1.3), ranges: { mc: st(0.8) } }), []);
  // its own Micro cell passes → Micro only
  assert.deepEqual(tagsOf({ ind: "mc-rsi2-5@m15", full: st(1.3), ranges: { mc: st(1.2) } }), ["mc"]);
  // an engine indication keeps Wide and its ranges, never Micro
  assert.deepEqual(tagsOf({ ind: "rsi-mom-14-20@m15", full: st(1.3) }), ["", "sh"]);
});
