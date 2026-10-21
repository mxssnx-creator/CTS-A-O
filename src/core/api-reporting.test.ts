import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

process.env.CTS_CORE_STATE = "off";
const { CoreDb } = await import("./server/db.server.ts");
const { CoreRuntime } = await import("./server/runtime.server.ts");
const { walkForward } = await import("./sim/walkforward.ts");
const { statsOf } = await import("./metrics/stats.ts");
const { CandleSeries } = await import("./market/candle-series.ts");
const { liveTag } = await import("./server/live.ts");
const { coreOverviewData, coreSimData, coreConnsData, coreStatisticsData, coreStatisticsInput, coreStatusData, connInput } = await import("./api-data.ts");
import type { Trade } from "./domain/types.ts";

type Any = any;
const H = 3_600_000, END = Math.floor(Date.now() / H) * H;
const G = globalThis as unknown as { __ctsCoreRuntime?: InstanceType<typeof CoreRuntime> };
let runtime: InstanceType<typeof CoreRuntime> | null = null;
afterEach(() => { runtime?.dispose(); runtime = null; delete G.__ctsCoreRuntime; });
function fixture() {
  const r = new CoreRuntime(new CoreDb(), { live: { enabled: false } }, { market: "synthetic", priceStream: null });
  runtime = r; r.stop(); G.__ctsCoreRuntime = r;
  const u = { bars: [], caches: [], startT: END - 4 * H, endT: END, splitT: END - 3 * H, nowT: END, baseTf: 60 } as never;
  r.sim = walkForward(u, [], { ...r.wf, simH: 3 });
  r.sim.trades = [0.0136, -0.068].map((value, i) => ({ cfg: "follow|rsi-mom-14-25@m15|tp1|sl1|tr0|h32|mn", sym: "QA-USDT", side: 1,
    entryT: END - 2 * H + i * 60_000, exitT: END - H + i * 60_000, entry: 100, exit: 100, r: value, mult: i ? 6.8 : 1,
    reason: i ? "sl" : "tp", bars: 1, mfe: 0, mae: 0, kind: "normal" })) as Trade[];
  r.sim.openAtEnd = []; r.sim.sizedStats = undefined;
  r.sim.stats = statsOf(r.sim.trades, END);
  return r;
}

test("Overview, lane and connection summaries normalize retained weighted records and retain PF provenance", async () => {
  const r = fixture();
  const overview = await coreOverviewData(connInput()) as Any;
  for (const row of [overview.sim.stats, overview.sim.byConfig[0], overview.lanes[0]]) {
    assert.equal(row.n, 2); assert.ok(Math.abs(row.pf - 1.36) < 1e-10); assert.equal(row.noLoss, false);
    assert.equal(row.pfBasis, "unit-net-returns"); assert.equal(row.unknownReturns, 0);
    assert.ok(Math.abs(row.gp - 1.36) < 1e-10); assert.equal(row.gl, 1);
  }
  assert.ok(Math.abs(overview.sim.sizedStats.pf - 0.2) < 1e-10);
  const conns = await coreConnsData() as Any;
  const conn = conns.conns.find((x: Any) => x.conn === conns.primary);
  assert.ok(Math.abs(conn.sim.pf - 1.36) < 1e-10); assert.equal(conn.sim.noLoss, false);
  assert.ok(Math.abs(r.sim!.stats.pf - 0.2) < 1e-10, "API reads preserve the retained sized archive");
});

test("unknown modeled losses preserve every close/count while whole primary summaries become unavailable", async () => {
  const r = fixture();
  r.sim!.trades = r.sim!.trades.map((t, i) => i ? { ...t, unitR: null } : t);
  const overview = await coreOverviewData(connInput()) as Any;
  const run = await coreSimData(connInput()) as Any;
  const conns = await coreConnsData() as Any;
  for (const row of [overview.sim.stats, overview.sim.byConfig[0], overview.lanes[0], run.sim.stats, conns.conns.find((x: Any) => x.conn === conns.primary).sim]) {
    assert.equal(row.n, 2); assert.equal(row.pf, null); assert.equal(row.net, null); assert.equal(row.gp, null); assert.equal(row.gl, null);
    assert.equal(row.noLoss, null); assert.equal(row.pfBasis, "unavailable"); assert.equal(row.unknownReturns, 1);
  }
  assert.equal(overview.sim.positions, 1); assert.equal(overview.lanes[0].positions, 1);
  assert.equal(run.sim.trades.length, 2); assert.equal(overview.sim.stable, null);
  assert.ok(Math.abs(overview.sim.sizedStats.pf - 0.2) < 1e-10);
});

test("no-loss modeled score four stays distinct from a measured return ratio four", async () => {
  const r = fixture();
  r.sim!.trades = [r.sim!.trades[0]];
  const noLoss = await coreOverviewData(connInput()) as Any;
  assert.equal(noLoss.sim.stats.pf, 4); assert.equal(noLoss.sim.stats.noLoss, true); assert.equal(noLoss.lanes[0].noLoss, true);
  r.sim!.trades = [{ ...r.sim!.trades[0], r: 0.04, mult: 1 }, { ...r.sim!.trades[0], r: -0.01, mult: 1, entryT: END - H, exitT: END }];
  const measured = await coreOverviewData(connInput()) as Any;
  assert.equal(measured.sim.stats.pf, 4); assert.equal(measured.sim.stats.noLoss, false); assert.equal(measured.lanes[0].noLoss, false);
});

test("a flat measured live close retains actual notional for reconstructed drawdown and margin", async () => {
  const r = fixture();
  r.settings.sizing = { mode: "fixed", pct: 0.02 };
  r.settings.paperNotional = 5;
  r.settings.cost = 0;
  r.settings.live.leverage = 10;
  const entryT = END - H;
  const exitT = entryT + 3 * 60_000;
  const tag = liveTag(r.settings.live.connId);
  for (const [kind, at] of [["O", entryT], ["X", exitT]] as const) {
    const coid = `${tag}Uflat-${kind}`;
    r.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,at) VALUES (?,?,?,?,?,?,?,?,?)", coid, "owned-flat", "QA-FLAT-USDT", 1, kind, 1, 100, "ok", at);
    r.db.run("INSERT INTO live_fills (coid,sym,side,kind,qty,ref_px,fill_px,fee,fee_known,at) VALUES (?,?,?,?,?,?,?,?,?,?)", coid, "QA-FLAT-USDT", 1, kind, 1, 100, 100, 0, 1, at);
  }
  r.candles.set("QA-FLAT-USDT", CandleSeries.fromCandles([100, 90, 100, 100].map((price, i) => ({ t: entryT + i * 60_000, o: price, h: price, l: price, c: price, v: 1 }))));
  const result = await coreStatisticsData(coreStatisticsInput({ source: "live", hours: 6 })) as Any;
  assert.equal(result.closes.length, 1);
  assert.equal(result.closes[0].notional, 100);
  assert.equal(result.closes[0].r, 0);
  assert.equal(result.report.total.n, 1);
  assert.equal(result.report.total.usd, 0);
  assert.equal(result.report.timeline.marginMax, 10, "actual $100 notional, not the unrelated $5 paper setting");
  assert.equal(result.report.timeline.maxDd, 10, "the temporary 10% adverse mark uses the actual owned close notional");
  assert.equal(result.report.timeline.ordersMax, 1);
  assert.equal(result.report.timeline.positionsMax, 1);
  assert.equal(result.balanceFrom, "unavailable", "a ledger notional never invents an account equity baseline");
});

function paperFixture() {
  const r = fixture(), xs = r.sim!.trades;
  for (const t of xs) r.db.run("INSERT INTO paper_trades (cfg,sym,side,entry_t,exit_t,entry,exit,r,unit_r,pnl,reason,first_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    t.cfg,t.sym,t.side,t.entryT,t.exitT,t.entry,t.exit!,t.r,t.r/t.mult!,t.r*100,t.reason,t.entryT);
  return { r, xs };
}
function bookRow(r: InstanceType<typeof CoreRuntime>, t: Trade, patch: Record<string, unknown> = {}) {
  const x = { cfg:t.cfg,sym:t.sym,side:t.side,entry_t:t.entryT,exit_t:t.exitT,r:t.r,unit_r:t.r/(t.mult??1),reason:t.reason,owned_notional_usd:100*(t.mult??1),vol:t.mult??1,mult:t.mult??1,...patch };
  if (typeof patch.unit_r === "number" && !("r" in patch)) x.r = patch.unit_r * (t.mult ?? 1);
  r.db.run("INSERT INTO paper_book_trades (cfg,sym,side,entry_t,exit_t,r,unit_r,reason,owned_notional_usd,vol,mult) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    x.cfg as string,x.sym as string,x.side as number,x.entry_t as number,x.exit_t as number,x.r as number,x.unit_r as number,x.reason as string,x.owned_notional_usd as number|null,x.vol as number|null,x.mult as number|null);
}
const paperStats = () => coreStatisticsData(coreStatisticsInput({ source: "paper-history", hours: 6 })) as Promise<Any>;

for (const [name, patch] of [
  ["legacy allocation NULL", { owned_notional_usd:null }],
  ["zero allocation", { owned_notional_usd:0 }],
  ["dust allocation", { owned_notional_usd:1e-9 }],
  ["different settled exit (including a partial-close timestamp)", { exit_t:END-H+1 }],
  ["different entry timestamp", { entry_t:END-2*H-1 }],
  ["different config/type", { cfg:"follow|rsi-mom-14-25@m15|tp0|sl1|tr1|h32|mn|to" }],
  ["different symbol", { sym:"OTHER-USDT" }],
  ["different direction", { side:-1 }],
  ["dropped bookkeeping row", { reason:"dropped" }],
] as const) test(`recorded paper history cannot certify a losing close from ${name}`, async () => {
  const { r, xs } = paperFixture(); bookRow(r,xs[0]); bookRow(r,xs[1],patch);
  const result = await paperStats();
  assert.equal(result.report.total.n,2); assert.equal(result.report.total.pf,null); assert.equal(result.report.total.unknownReturns,1);
  assert.equal(result.paperEvidence.verifiedOwnership,1); assert.equal(result.paperEvidence.unknownOwnership,1);
  assert.ok(Math.abs(result.paperEvidence.recordedReturns.pf-1.36)<1e-10);
  assert.ok(Math.abs(result.report.total.cashPf-.2)<1e-10); assert.ok(Math.abs(result.report.total.usd+5.44)<1e-10);
  assert.equal(r.db.get<{n:number}>("SELECT COUNT(*) AS n FROM paper_trades")?.n,2);
});

test("a missing paper allocation cannot disappear from the current sample to qualify older wins", async () => {
  const { r, xs } = paperFixture(); bookRow(r,xs[0]);
  const result = await paperStats();
  assert.equal(result.report.total.n,2); assert.equal(result.report.total.pf,null);
  assert.equal(result.paperEvidence.unknownOwnership,1);
  assert.equal(result.paperEvidence.recordedReturns.n,2);
  assert.ok(Math.abs(result.paperEvidence.recordedReturns.pf-1.36)<1e-10);
  assert.ok(Math.abs(result.report.total.usd+5.44)<1e-10);
});

test("paper ownership proof requires an exact unique settled identity and does not duplicate matching history", async () => {
  const { r, xs } = paperFixture(); bookRow(r,xs[0]); bookRow(r,xs[1]);
  assert.throws(()=>bookRow(r,xs[1]), /UNIQUE constraint/);
  bookRow(r,xs[1],{ side:-1 });
  const result = await paperStats();
  assert.equal(result.report.total.n,2); assert.ok(Math.abs(result.report.total.pf-1.36)<1e-10);
  assert.deepEqual([result.paperEvidence.verifiedOwnership,result.paperEvidence.unknownOwnership],[2,0]);
  assert.equal(result.report.total.noLoss,false);
});

test("known nominal returns cannot replace missing owned-book unit evidence", async () => {
  const { r, xs } = paperFixture(); bookRow(r,xs[0]); bookRow(r,xs[1],{ unit_r:null });
  const result = await paperStats();
  assert.equal(result.report.total.n,2); assert.equal(result.report.total.pf,null); assert.equal(result.report.total.unknownReturns,1);
  assert.deepEqual([result.paperEvidence.verifiedOwnership,result.paperEvidence.unknownOwnership],[2,0]);
  assert.ok(Math.abs(result.paperEvidence.recordedReturns.pf-1.36)<1e-10);
  assert.equal(result.paperEvidence.cashBasis,"recorded-paper-history");
});

test("owned unit PF uses the held book return while nominal unit and cash history remain separate", async () => {
  const { r, xs } = paperFixture(); bookRow(r,xs[0]); bookRow(r,xs[1],{ unit_r:-0.02 });
  const result = await paperStats();
  assert.equal(result.report.total.n,2); assert.ok(Math.abs(result.report.total.pf-.68)<1e-10);
  assert.ok(Math.abs(result.paperEvidence.recordedReturns.pf-1.36)<1e-10);
  assert.ok(Math.abs(result.report.total.cashPf-.2)<1e-10); assert.ok(Math.abs(result.report.total.usd+5.44)<1e-10);
  assert.equal(result.paperEvidence.cashBasis,"recorded-paper-history");
});

test("strict promotion evidence is exposed unchanged, separate from raw Base and paper-deactivation summaries", async () => {
  const r=fixture();
  const window = { n:2,pf:1.36,unknown:0,fromT:END-H,toT:END,noLoss:false,pfConvention:"ratio" as const };
  r.status.livePromotion={at:END,evidenceBasis:"settled-post-base-and-owned-execution",qualified:0,insufficient:1,unknown:0,failed:0,ineligible:0,verifiedVenue:0,nominalAttribution:"unverified-not-promotion-proof",lanes:[{
    cfg:r.sim!.trades[0].cfg,sym:"QA-USDT",side:1,required:true,ok:false,n:2,pf:null,minN:20,minPf:1.1,state:"execution-insufficient",unknown:0,
    model:{...window,source:"post-base-accepted"}, execution:{...window,source:"owned-paper",pf:null},
  }]};
  const response=await coreStatusData(connInput()) as Any;
  assert.deepEqual(response.livePromotion,r.status.livePromotion);
  assert.equal(response.livePromotion.lanes[0].model.noLoss,false);
  assert.equal(response.livePromotion.lanes[0].execution.pf,null);
});


test("forward paper source uses actual held return and allocation without rewritten nominal cash", async () => {
  const { r, xs } = paperFixture();
  bookRow(r, xs[0]); bookRow(r, xs[1], { unit_r: -0.02 });
  const result = await coreStatisticsData(coreStatisticsInput({ source: "paper", hours: 6 })) as Any;
  assert.equal(result.report.total.n, 2);
  assert.ok(Math.abs(result.report.total.pf - 0.68) < 1e-10);
  assert.ok(Math.abs(result.report.total.usd - (1.36 - 13.6)) < 1e-10);
  assert.equal(result.paperEvidence.cashBasis, "owned-paper-forward");
  assert.equal(result.sourceLabel, "paper book forward record (virtual)");
});

test("forward paper retains a settled unknown-return close in the full sample", async () => {
  const { r, xs } = paperFixture();
  bookRow(r, xs[0]); bookRow(r, xs[1], { r: null, unit_r: null });
  const result = await coreStatisticsData(coreStatisticsInput({ source: "paper", hours: 6 })) as Any;
  assert.equal(result.report.total.n, 2);
  assert.equal(result.report.total.pf, null);
  assert.equal(result.report.total.unknownReturns, 1);
});


test("forward cash retains a close with missing volume as unknown and never reprices it", async () => {
  const {r,xs}=paperFixture(); bookRow(r,xs[0]); bookRow(r,xs[1],{vol:null});
  const stats=()=>coreStatisticsData(coreStatisticsInput({source:"paper",hours:6})) as Promise<Any>;
  const first=await stats(); assert.equal(first.report.total.n,2); assert.equal(first.report.total.cashPf,null);
  r.settings.paperNotional=999; r.settings.sizing={mode:"equityPct",pct:.9};
  const second=await stats(); assert.deepEqual(second.report.total,first.report.total);
});
