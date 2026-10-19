import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.CTS_CORE_STATE = "off";
const { CoreDb } = await import("./server/db.server.ts");
const { CoreRuntime, basePass } = await import("./server/runtime.server.ts");
const { DEFAULT_PROTECT } = await import("./config.ts");
const { statsOf } = await import("./metrics/stats.ts");
const { configId } = await import("./pipeline/pipeline.ts");
const { coreOverviewData, connInput } = await import("./api-data.ts");
import type { ComboRun } from "./pipeline/pipeline.ts";
import type { SettingsPatch } from "./config.ts";

const G = globalThis as unknown as { __ctsCoreRuntime?: InstanceType<typeof CoreRuntime> };
let current: InstanceType<typeof CoreRuntime> | null = null;
afterEach(() => { current?.dispose(); current = null; delete G.__ctsCoreRuntime; });
const stats = (pf: number) => statsOf(Array.from({ length: 20 }, (_, i) => ({
  entryT: 1000 + i * 10, exitT: 1001 + i * 10, r: i % 2 ? -0.01 : pf * 0.01,
})));
const row = (ind: string, pf: number, ranges?: Record<string, ReturnType<typeof stats>>): ComboRun => ({
  id: configId("follow", ind, DEFAULT_PROTECT), bot: "follow", ind, protect: DEFAULT_PROTECT,
  full: stats(pf), ranges, score: 0, bySym: {}, trades: [], open: [],
}) as unknown as ComboRun;
const fixture = (runs: ComboRun[], patch: SettingsPatch = {}) => {
  const r = new CoreRuntime(new CoreDb(":memory:"), {
    gates: { minPf: 1.05, minTrades: 3, maxDdr: 0, baseSetsMinPf: 1 }, ...patch,
  }, { market: "synthetic", priceStream: null });
  current = r; r.stop();
  r.pipeline = { s1: runs } as NonNullable<typeof r.pipeline>;
  G.__ctsCoreRuntime = r;
  return r;
};
const lanes = async () => (await coreOverviewData(connInput()) as unknown as {
  lanes: Array<{ lane: string; base: number; passed: number }>;
}).lanes.map(({ lane, base, passed }) => ({ lane, base, passed }));

describe("Overview lane Base qualification matches the engine", () => {
  it("holds Tactic Short, Medium and combined full identities to their own 1.1 floor", async () => {
    const runs = [row("tactic-trend-s@m5", 1.11), row("tactic-trend-m@m5", 1.08), row("tactic-trend-s@m5c", 1.08)];
    const r = fixture(runs);
    assert.equal(basePass(runs, r.settings).passed.length, 1);
    assert.deepEqual(await lanes(), [{ lane: "5m", base: 2, passed: 1 }, { lane: "5m+", base: 1, passed: 0 }]);
  });

  it("counts a valid own-range pass even when the default protect loses, subject to the actual lane floor", async () => {
    const runs = [row("ema-21-55@m15", 0.8, { sh: stats(1.3) }), row("ema-21-55@m5", 0.8, { sh: stats(1.3) })];
    const r = fixture(runs);
    assert.deepEqual(basePass(runs, r.settings).passed.map((r) => r.ind), ["ema-21-55@m15"]);
    assert.deepEqual(await lanes(), [{ lane: "5m", base: 1, passed: 0 }, { lane: "15m", base: 1, passed: 1 }]);
  });

  it("retains a stricter Base sets floor and does not substitute the looser stage floor", async () => {
    const runs = [row("ema-21-55@m15", 1.3), row("tactic-trend-s@m15", 1.3)];
    const r = fixture(runs, { gates: { minPf: 1.05, minTrades: 3, maxDdr: 0, baseSetsMinPf: 1.4 } });
    assert.equal(basePass(runs, r.settings).passed.length, 0);
    assert.deepEqual(await lanes(), [{ lane: "15m", base: 2, passed: 0 }]);
  });

  it("reports qualification rather than the additional failing pairs built by allSets measurement", async () => {
    const runs = [row("ema-21-55@m15", 0.8)];
    const r = fixture(runs, { grid: { allSets: true } });
    assert.equal(basePass(runs, r.settings).added, 1, "the runtime still builds this pair for measurement");
    assert.deepEqual(await lanes(), [{ lane: "15m", base: 1, passed: 0 }]);
    assert.equal(r.settings.grid.allSets, true);
  });

  it("uses actual Signal Base acceptance and never infers it from positive engine-style PF", async () => {
    const runs = [row("sig-ema-cross-s@m5", 0.8), row("sig-ema-cross-m@m5", 2)];
    const r = fixture(runs);
    r.wf.signalBasePassed = new Set(["follow|sig-ema-cross-s@m5"]);
    assert.deepEqual(await lanes(), [{ lane: "5m", base: 2, passed: 1 }]);
    r.wf.signalBasePassed = undefined;
    assert.deepEqual(await lanes(), [{ lane: "5m", base: 2, passed: 0 }], "unknown Signal acceptance stays unknown/unqualified");
  });

  it("retains the runtime's narrower full-pair admission from compute-specific applicability and family rules", async () => {
    const runs = [row("tactic-trend-s@m15", 1.3), row("tactic-trend-m@m15", 1.3)];
    const r = fixture(runs);
    r.wf.basePassed = new Set(["follow|tactic-trend-s@m15"]);
    assert.deepEqual(await lanes(), [{ lane: "15m", base: 2, passed: 1 }]);
  });

  it("reads cached results without recomputation, changing Focus or mutating settings/rows", async () => {
    const runs = [row("ema-21-55@m15", 1.06)];
    const r = fixture(runs, { focus: ["follow|rsi-14"], gates: { minPf: 1.3, minTrades: 3, maxDdr: 0, baseSetsMinPf: 1 } });
    const settings = JSON.stringify(r.settings), results = JSON.stringify(runs);
    r.compute = async () => { throw new Error("an API read must never recompute the market"); };
    assert.deepEqual(await lanes(), [{ lane: "15m", base: 1, passed: 1 }], "uses the Base sets floor on the computed population");
    assert.equal(JSON.stringify(r.settings), settings);
    assert.equal(JSON.stringify(runs), results);
  });
});
