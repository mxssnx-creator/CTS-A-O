import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.CTS_CORE_STATE = "off";
const { CoreDb } = await import("./db.server.ts");
const { CoreRuntime } = await import("./runtime.server.ts");
const { makeTape, walkForward, runSubset } = await import("../sim/walkforward.ts");
const { connInput, coreOverviewData, coreSimData, coreStatisticsData, coreStatisticsInput } = await import("../api-data.ts");
const { DEFAULT_PROTECT } = await import("../config.ts");
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const END = Math.floor(Date.now() / H) * H;
const CFG = "follow|rsi-mom-14-25@m15|tp1|sl1|tr0|h32";
const G = globalThis as unknown as { __ctsCoreRuntime?: InstanceType<typeof CoreRuntime> };
const runtimes: InstanceType<typeof CoreRuntime>[] = [];
afterEach(() => { for (const r of runtimes.splice(0)) r.dispose(); delete G.__ctsCoreRuntime; });
function fixture(path = ":memory:") {
  const r = new CoreRuntime(new CoreDb(path), { sizing: { mode: "fixed", pct: 0.02 }, live: { engineProofN: 2, engineProofPf: 1.1 } }, { market: "synthetic", priceStream: null });
  r.stop(); runtimes.push(r); G.__ctsCoreRuntime = r;
  return r;
}
const trade = (r: number, mult: number, i: number): Trade => ({
  cfg: CFG, sym: "AAA-USDT", side: 1, entryT: END - 2 * H + i * 60_000,
  exitT: END - H + 30 * 60_000 + i * 60_000, entry: 100, exit: 100 * (1 + r / mult), r, mult,
  reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0, kind: "normal", vol: mult,
});
function install(r: InstanceType<typeof CoreRuntime>, trades = [trade(0.016, 2, 0), trade(-0.01, 1, 1)]) {
  const tp = makeTape(CFG, "follow", "rsi-mom-14-25@m15", DEFAULT_PROTECT, "normal", ["AAA-USDT"], trades.map((t) => ({ ...t, r: t.r / t.mult!, mult: undefined })), [], []);
  const u = { bars: [], caches: [], startT: END - 4 * H, endT: END, splitT: END - 3 * H, nowT: END, baseTf: 60 } as never;
  const sim = walkForward(u, [], { ...r.wf, simH: 3 });
  sim.trades = trades; sim.openAtEnd = [];
  const primary = runSubset(sim, () => true, 1.1);
  sim.stats = primary.stats; sim.stable = primary.stable;
  r.tapes = [tp]; r.sim = sim;
  r.paper.startedAt = END - 3 * H;
  r.paper.positions = trades.map((t) => ({ ...t, entryI: 0, stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0,
    vol: t.mult!, level: 0, heldAt: t.entryT }));
  // This fixture explicitly declares funding measured at its synthetic position entries, independently of any
  // subsequently reconstructed paper.units sizing map. Real legacy held positions have no such declaration.
  r.db.kvSet("paperBook", { startedAt: r.paper.startedAt, selected: [CFG], positions: r.paper.positions,
    ownedEntryAllocations: trades.map((t) => [`${t.cfg}|${t.sym}|${t.side}|${t.entryT}`, { unitUsd: r.settings.paperNotional, vol: t.mult! }]) });
  (r as unknown as { restorePaperBook(): void }).restorePaperBook();
  return trades;
}
const step = (r: InstanceType<typeof CoreRuntime>) => (r as unknown as { stepPaper(): void }).stepPaper();
function book(r: InstanceType<typeof CoreRuntime>, i: number, unit: number | null, sized = unit ?? -1, cfg = CFG) {
  r.db.run("INSERT INTO paper_book_trades (cfg,sym,side,entry_t,exit_t,r,vol,reason,held_at,at,unit_r,owned_notional_usd) VALUES (?,?,1,?,?,?,?,?,?,?,?,20)",
    cfg, "AAA-USDT", 1000 + i, 2000 + i, sized, 2, "tp", 1000 + i, 2000 + i, unit);
}

describe("durable paper proof uses verified unit returns", () => {
  it("writes both records from known execution multipliers, preserving cash and immutable evidence across restart/conflict", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-paper-unit-"));
    try {
      const path = join(dir, "core.sqlite"), r = fixture(path), trades = install(r);
      step(r);
      const rows = r.db.all<{ r: number; unit_r: number; pnl: number }>("SELECT r,unit_r,pnl FROM paper_trades ORDER BY entry_t");
      assert.equal(rows.length, 2);
      assert.deepEqual(rows.map((x) => x.r), [0.016, -0.01]);
      assert.deepEqual(rows.map((x) => x.unit_r), [0.008, -0.01]);
      assert.ok(Math.abs(rows.reduce((n, x) => n + x.pnl, 0) - 0.006 * r.settings.paperNotional) < 1e-9);
      assert.deepEqual(r.db.all<{ unit_r: number }>("SELECT unit_r FROM paper_book_trades ORDER BY entry_t").map((x) => x.unit_r), [0.008, -0.01]);
      assert.equal(r.engineProof(END)?.proven.size, 0, "sized PF 1.6 cannot prove true PF 0.8");
      // A pre-upgrade row cannot be guessed/backfilled on a repeated simulation or conflict.
      r.db.run("UPDATE paper_trades SET unit_r=NULL WHERE entry_t=?", trades[0].entryT);
      (r as unknown as { paperTradesWritten: unknown }).paperTradesWritten = null;
      r.sim!.trades[0] = { ...trades[0], mult: 4 };
      step(r);
      assert.equal(r.db.get<{ unit_r: number | null }>("SELECT unit_r FROM paper_trades WHERE entry_t=?", trades[0].entryT)?.unit_r, null);
      const reopened = fixture(path);
      assert.deepEqual(reopened.db.all("SELECT r,unit_r,pnl FROM paper_trades ORDER BY entry_t"), r.db.all("SELECT r,unit_r,pnl FROM paper_trades ORDER BY entry_t"));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("keeps recent unknowns inside last N instead of qualifying older wins, then recovers after known closes replace them", () => {
    const r = fixture();
    book(r, 0, 0.02); book(r, 1, 0.02); book(r, 2, null);
    (r as unknown as { proofMemo: unknown }).proofMemo = {
      key: `2|1.1|${r.db.version("paper_book_trades")}|${r.db.version("live_lane_trades")}`,
      out: { proven: new Set([CFG]), judged: 1, n: 2, minPf: 1.1 },
    };
    let proof = r.engineProof(10_000)!;
    assert.equal(proof.proven.size, 0); assert.equal(proof.unknown, 1); assert.equal(proof.unknownConfigs, 1);
    book(r, 3, 0.02);
    assert.equal(r.engineProof(10_000)!.proven.size, 0, "interleaved known win cannot skip the unknown");
    book(r, 4, 0.02);
    proof = r.engineProof(10_000)!;
    assert.deepEqual([...proof.proven], [CFG]); assert.equal(proof.unknown, 0);
    assert.equal(r.status.engineProof?.pfBasis, "unit-net-returns");
    r.settings.live.engineProofN = 0; r.engineProof();
    assert.equal(r.status.engineProof, undefined);
    r.settings.live.engineProofN = 2; r.engineProof(10_000);
    const restored = r.status.engineProof as { proven: number } | undefined;
    assert.equal(restored?.proven, 1, "reenabling a memoized proof restores visible provenance");
  });

  it("nominal attributed exchange rows cannot replace unknown owned-paper funding evidence", () => {
    const r = fixture(); book(r, 0, null); book(r, 1, null);
    for (let i = 0; i < 2; i++) r.db.run("INSERT INTO live_lane_trades (id,exit_t,cfg,sym,side,entry_t,entry,exit,r,reason) VALUES (?,?,?,?,1,?,100,102,0.02,'exit')", `lane${i}`, 3000 + i, CFG, "AAA-USDT", 1000 + i);
    const proof = r.engineProof(10_000)!;
    assert.deepEqual([...proof.proven], []); assert.equal(proof.unknown, 2);
  });
});

describe("actual API primary return basis", () => {
  it("reports sim/paper PF 0.8 while cash remains sized, without any market recomputation", async () => {
    const r = fixture(); install(r); step(r);
    r.compute = async () => { throw new Error("API must not recompute"); };
    const sim = await coreStatisticsData(coreStatisticsInput({ source: "sim" })) as unknown as { report: { total: { pf: number } } };
    const paper = await coreStatisticsData(coreStatisticsInput({ source: "paper" })) as typeof sim;
    assert.equal(sim.report.total.pf, 0.8); assert.equal(paper.report.total.pf, 0.8);
    const before = JSON.stringify(r.sim);
    r.sim!.stats = { ...r.sim!.stats, pf: 1.6, pfBasis: undefined };
    r.sim!.sizedStats = undefined;
    r.sim!.hourly = [{ t: END - H, n: 2, net: 0.6, pf: 1.6 }];
    r.sim!.byConfig = [{ id: CFG, n: 2, net: 0.6, pf: 1.6 }];
    r.sim!.stable = true;
    const cached = await coreSimData(connInput()) as unknown as { sim: { stats: { pf: number }; sizedStats: { pf: number }; hourly: Array<{ pf: number }>; byConfig: Array<{ pf: number }>; stable: boolean } };
    assert.equal(cached.sim.stats.pf, 0.8); assert.equal(cached.sim.sizedStats.pf, 1.6);
    assert.equal(cached.sim.hourly[0].pf, 0.8); assert.equal(cached.sim.byConfig[0].pf, 0.8); assert.equal(cached.sim.stable, false);
    assert.equal(r.sim!.stats.pf, 1.6, "read leaves cached sized summary untouched");
    assert.ok(before);
    r.db.run("UPDATE paper_trades SET unit_r=NULL WHERE r < 0");
    const stillOwned = await coreStatisticsData(coreStatisticsInput({ source: "paper" })) as unknown as { report: { total: { pf: number } } };
    assert.equal(stillOwned.report.total.pf, .8, "known owned-book returns are independent of nominal history metadata");
    r.db.run("UPDATE paper_book_trades SET unit_r=NULL WHERE r < 0");
    const unknown = await coreStatisticsData(coreStatisticsInput({ source: "paper" })) as unknown as { report: { total: { pf: number | null; unknownReturns: number; pfBasis: string } } };
    assert.equal(unknown.report.total.pf, null); assert.equal(unknown.report.total.unknownReturns, 1);
    const overview = await coreOverviewData(connInput()) as unknown as { paper: { trades: { gp: number | null; unknownReturns: number } } };
    assert.equal(overview.paper.trades.gp, null); assert.equal(overview.paper.trades.unknownReturns, 1);
  });

  it("marks aggregate legacy preset and run archives unavailable instead of reusing sized PF", async () => {
    const r = fixture(); install(r);
    r.db.kvSet("presetSims", { startT: END - 3 * H, endT: END, presets: {
      legacy: { stats: { n: 2, pf: 1.6, gp: 1.6, gl: 1, net: 0.6 }, hourly: [{ t: END - H, n: 2, pf: 1.6, net: 0.6 }], byKind: { normal: { n: 2, pf: 1.6 } }, stable: true },
      verified: { stats: { n: 2, pf: 0.8, pfBasis: "unit-net-returns", unknownReturns: 0 }, hourly: [] },
    } });
    r.db.run("INSERT INTO sim_runs (at,pf,net,opts) VALUES (?,1.6,0.6,'{}')", END);
    (r as unknown as { persistSim(sim: typeof r.sim): void }).persistSim(r.sim);
    const out = await coreSimData(connInput()) as unknown as {
      presets: { presets: Record<string, { stats: { pf: number | null; pfBasis: string }; sizedStats: { pf: number }; hourly: unknown[]; stable: boolean }> };
      runs: Array<{ pf: number | null; pfBasis: string; sizedPf?: number }>;
    };
    assert.equal(out.presets.presets.legacy.stats.pf, null); assert.equal(out.presets.presets.legacy.stats.pfBasis, "unavailable");
    assert.equal(out.presets.presets.legacy.sizedStats.pf, 1.6); assert.deepEqual(out.presets.presets.legacy.hourly, []); assert.equal(out.presets.presets.legacy.stable, false);
    assert.equal(out.presets.presets.verified.stats.pf, 0.8);
    assert.equal(out.runs[0].pfBasis, "unit-net-returns"); assert.equal(out.runs[0].pf, 0.8);
    assert.equal(out.runs[1].pf, null); assert.equal(out.runs[1].sizedPf, 1.6);
  });
});
