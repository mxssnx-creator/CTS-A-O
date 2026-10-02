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
  rangeOfId,
} from "./minimal-coord.ts";
import { configId, kindOfId, laneProtect, parseConfigId } from "./pipeline/pipeline.ts";
import { controlTargets, entryCoidKind, isOwnCoid, liveTag, makeCoid } from "./server/live.ts";
import { fittedRangeTps, indHorizonBars, protectGrid, universeSigma1m } from "./sim/walkforward.ts";
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
