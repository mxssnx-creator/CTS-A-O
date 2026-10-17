import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_PROTECT } from "../config.ts";
import { makeTape, runSubset, walkForward } from "../sim/walkforward.ts";
import { executionRecordKey, liveRecords, ownedPaperExecutionRecords, postBaseExecutionRecords } from "../live-record.ts";
import { liveEntryOk, liveGroupGates, promotionGate, type PromotionWindow } from "../live-validation.ts";
import { liveReadiness } from "./live.server.ts";
import { orderKey } from "../sizing.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { fakeRt, lane as paperLane, rng, SimExchange } from "../test-support.ts";
import { stepLive, liveKv, type ExchangeClient } from "./live.server.ts";
import type { PromotedLaneProof } from "../live-promote.ts";
import { checkSettings } from "../settings-check.ts";

process.env.CTS_CORE_STATE = "off";
const H = 3_600_000;
const NOW = Date.now();
const CFG = "follow|rsi-mom-14-25@m15|tp2.6|sl3.9|tr0|h32";
const OTHER = "follow|rsi-mom-14-25@m5|tp2.6|sl3.9|tr0|h32|sh";
const SYM = "AAA-USDT";
const runtimes: CoreRuntime[] = [];
afterEach(() => { for (const r of runtimes.splice(0)) r.dispose(); process.env.CTS_CORE_LIVE = "0"; });
const close = (r: number, i: number, opts: Partial<Trade> = {}): Trade => ({
  cfg: CFG, sym: SYM, side: 1, entryT: NOW - H + i * 1000, exitT: NOW - 100_000 + i * 1000,
  entry: 100, exit: 100 * (1 + r), r, mult: 1, vol: 1, kind: "normal", reason: "time", bars: 1, mfe: 0, mae: 0, ...opts,
});
function fixture(path = ":memory:", n = 3) {
  const r = new CoreRuntime(new CoreDb(path), { gates: { minTrades: 1 }, live: { liveLastN: n, engineProofN: 0 } }, { market: "synthetic", priceStream: null });
  r.stop(); runtimes.push(r); return r;
}
function install(r: CoreRuntime, trades = [.02, -.01, .02].map((v, i) => close(v, i))) {
  r.tapes = [makeTape(CFG, "follow", "rsi-mom-14-25@m15", DEFAULT_PROTECT, "normal", [SYM],
    [.03, .03, .03].map((v, i) => close(v, i)), [], [])];
  const u = { bars: [], caches: [], startT: NOW - 24 * H, endT: NOW, splitT: NOW - 12 * H, nowT: NOW, baseTf: 15 } as never;
  r.sim = walkForward(u, [], { ...r.wf, simH: 24 });
  r.sim.trades = trades; r.sim.openAtEnd = [];
  const primary = runSubset(r.sim, () => true, 1.1); r.sim.stats = primary.stats; r.sim.stable = primary.stable;
  r.paper.selected = [CFG]; return r;
}
function owned(r: CoreRuntime, values: Array<number | null>, opts: { cfg?: string; sym?: string; side?: number; notional?: number | null; offset?: number; at?: number } = {}) {
  values.forEach((value, i) => r.db.run(
    "INSERT INTO paper_book_trades (cfg,sym,side,entry_t,exit_t,r,vol,reason,held_at,at,unit_r,owned_notional_usd) VALUES (?,?,?,?,?,?,1,'time',?,?,?,?)",
    opts.cfg ?? CFG, opts.sym ?? SYM, opts.side ?? 1, (opts.offset ?? 0) + i, (opts.at ?? NOW - 100_000) + i * 1000,
    value ?? -.1, NOW - H, NOW, value, opts.notional === undefined ? 20 : opts.notional,
  ));
}
const lane = { cfg: CFG, sym: SYM, side: 1 };

describe("strict live promotion uses two settled independent evidence axes", () => {
  it("rejects winning raw candidate tapes when post-Base accepted returns lose; removes external volume once", () => {
    const r = install(fixture(":memory:", 2), [close(.016, 0, { mult: 2 }), close(-.01, 1)]);
    owned(r, [.02, -.01]);
    const gate = r.livePromotionGate(lane, NOW);
    assert.equal(gate.model?.pf, .8); assert.equal(gate.execution?.pf, 2);
    assert.equal(gate.state, "model-failed"); assert.equal(gate.ok, false);
    assert.equal(r.tapes[0].gp[3], .09, "unfiltered candidate wins remain diagnostic only");
  });

  it("requires owned execution even with sufficient winning post-Base results; nominal attributed lanes cannot prove funding", () => {
    const r = install(fixture());
    for (let i = 0; i < 3; i++) r.db.run("INSERT INTO live_lane_trades (id,exit_t,cfg,sym,side,entry_t,entry,exit,r,reason) VALUES (?,?,?,?,1,?,100,110,.1,'exit')",
      `nominal-${i}`, NOW - 1000 + i, CFG, SYM, NOW - H);
    const gate = r.livePromotionGate(lane, NOW);
    assert.equal(gate.model?.pf, 4); assert.equal(gate.execution?.n, 0);
    assert.equal(gate.state, "execution-insufficient"); assert.equal(liveEntryOk(gate, { ok: true, n: 25, pf: 4 }), false);
  });

  it("qualifies only the exact config, timeframe/range, symbol and direction with both complete positive windows", () => {
    const r = install(fixture()); owned(r, [.02, -.01, .02]);
    assert.equal(r.livePromotionGate(lane, NOW).ok, true);
    owned(r, [-.1, -.1, -.1], { side: -1 });
    r.settings.live.engineProofN = 3;
    assert.equal(r.engineProof(NOW)?.proven.size, 0, "pooled config diagnostic loses on the other side");
    assert.equal(r.livePromotionGate(lane, NOW).ok, true, "a losing sibling cannot veto exact winning evidence");
    for (const sibling of [{ ...lane, side: -1 }, { ...lane, sym: "BBB-USDT" }, { ...lane, cfg: OTHER }])
      assert.equal(r.livePromotionGate(sibling, NOW).ok, false);
    r.paper.selected = [];
    assert.equal(r.livePromotionGate(lane, NOW).state, "ineligible", "historic winners cannot override current selection");
  });

  it("a stale selected measurement config cannot promote outside its current Base-qualified pair/range", () => {
    const r = install(fixture()); owned(r, [.02, -.01, .02]);
    const pair = `follow|rsi-mom-14-25@m15`;
    r.wf.basePassed = new Set([pair]);
    r.wf.basePassedRanges = { [pair]: [""] };
    assert.equal(r.livePromotionGate(lane, NOW).ok, true);
    r.wf.basePassedRanges = { [pair]: ["mn"] };
    assert.equal(r.livePromotionGate(lane, NOW).state, "ineligible", "a winning sibling range cannot admit Wide");
    r.wf.basePassedRanges = { [pair]: [""] };
    r.wf.basePassed = new Set();
    assert.equal(r.livePromotionGate(lane, NOW).state, "ineligible", "diagnostic construction is not Base qualification");
  });

  it("retains unknown, zero and dust funding inside the chronological last-N window", () => {
    for (const notional of [null, 0, 1e-12]) {
      const r = install(fixture());
      owned(r, [.02, .02, .02]); owned(r, [-.01], { notional, offset: 10, at: NOW - 1000 });
      const gate = r.livePromotionGate(lane, NOW);
      assert.equal(gate.ok, false); assert.equal(gate.state, "unknown"); assert.equal(gate.execution?.unknown, 1);
      assert.equal(gate.execution?.n, 3, "unknown never disappears in favor of an older winning sample");
    }
  });

  it("does not use future closes or endpoint marks as settled promotion evidence", () => {
    const r = install(fixture(), [.02, -.01, .02].map((v, i) => close(v, i, { exitT: NOW + H + i })));
    owned(r, [.02, -.01, .02]);
    assert.equal(r.livePromotionGate(lane, NOW).state, "model-insufficient");
    r.sim!.trades = []; r.sim!.openAtEnd = [close(.1, 0)];
    assert.equal(r.livePromotionGate(lane, NOW).model?.n, 0);
    assert.match(liveReadiness(r.sim!, { source: "all" }, 1.1).why, /no settled/);
  });

  it("uses record versions and array identity caches without rescanning history on every live lane", () => {
    const r = install(fixture()); owned(r, [.02, -.01, .02]);
    assert.equal(r.livePromotionGate(lane, NOW).ok, true);
    const read = r.db.all.bind(r.db); let queries = 0;
    r.db.all = ((...args: Parameters<typeof read>) => { queries++; return read(...args); }) as typeof r.db.all;
    for (let i = 0; i < 100; i++) r.livePromotionGate(lane, NOW);
    assert.equal(queries, 0);
    owned(r, [null], { offset: 10, at: NOW - 1000 });
    assert.equal(r.livePromotionGate(lane, NOW).state, "unknown"); assert.equal(queries, 1);
  });

  it("recomputes a reference's CURRENT last N from its exact settled returns instead of clipping an aggregate PF", () => {
    const r = install(fixture(":memory:", 25), Array.from({ length: 25 }, (_, i) => close(.02, i)));
    const proof: PromotedLaneProof = { ...lane, side: 1, modelPf: 2, executionPf: 2, modelN: 30, executionN: 30,
      modelNoLoss: false, executionNoLoss: false, fromT: NOW - 100_000, toT: NOW - 1, asOf: NOW - 1,
      validUntilT: NOW + H, minN: 20, minPf: 1.2, proofId: "a".repeat(64), referenceId: "measured-demo",
      modelBasis: "unit-net-returns", executionBasis: "owned-net-returns", executionSource: "verified-venue", afterBase: true,
      executionCloses: Array.from({ length: 30 }, (_, i) => ({ id: `actual-${i}`, exitT: NOW - 30_000 + i * 1000, unitR: i < 5 ? .1 : -.01 })) };
    r.settings.live.promotedLanes = [proof];
    const roundtrip = JSON.parse(JSON.stringify(r.settings));
    assert.doesNotThrow(() => checkSettings(roundtrip));
    assert.deepEqual(roundtrip.live.promotedLanes, [proof]);
    r.db.kvSet("settings", roundtrip);
    const restored = new CoreRuntime(r.db, undefined, { market: "synthetic", priceStream: null });
    restored.stop(); runtimes.push(restored);
    assert.deepEqual(restored.settings.live.promotedLanes, [proof], "saved exact evidence survives runtime settings reload");
    assert.throws(() => checkSettings({ live: { ...r.settings.live, promotedLanes: [null] } } as never), /promoted lanes/);
    assert.throws(() => checkSettings({ live: { ...r.settings.live, promotedLanes: [{ ...proof, executionN: 31 }] } } as never), /promoted lanes/);
    const gate = r.livePromotionGate(lane, NOW);
    assert.equal(gate.model?.n, 25); assert.equal(gate.execution?.n, 25);
    assert.equal(gate.execution?.pf, 0); assert.equal(gate.state, "execution-failed");
    const clock = Date.now;
    try {
      Date.now = () => NOW;
      assert.equal(liveReadiness(r.sim!, r.settings.live, 1.1).ok, true);
      Date.now = () => proof.validUntilT + 1;
      assert.equal(liveReadiness(r.sim!, r.settings.live, 1.1).ok, false, "reference expiry invalidates the same cached readiness subset");
    } finally { Date.now = clock; }
  });
});

describe("strict proof helpers fail closed", () => {
  const record = () => liveRecords([.02, -.01, .02].map((r, i) => ({ cfg: CFG, r, exitT: 100 + i }))).get(CFG)!;
  const verified = (): PromotionWindow => ({ source: "verified-venue", n: 3, pf: 2, unknown: 0,
    fromT: 100, toT: 102, validUntilT: 1000, noLoss: false, pfConvention: "ratio" });
  it("checks current N, nonfinite PF, unknowns, causal windows, explicit expiry and no-loss convention independently of callers", () => {
    assert.equal(promotionGate(record(), undefined, 0, 500, 3, 1.1, verified()).ok, true);
    for (const change of [{ n: 1 }, { pf: NaN }, { pf: Infinity }, { unknown: 1 }, { fromT: -1 },
      { toT: 501 }, { validUntilT: 499 }, { validUntilT: undefined }, { noLoss: true },
      { pfConvention: "no-loss-score" }, { source: "post-base-accepted" }]) {
      assert.equal(promotionGate(record(), undefined, 0, 500, 3, 1.1, { ...verified(), ...change } as PromotionWindow).ok, false, JSON.stringify(change));
    }
    assert.equal(promotionGate(record(), undefined, 0, 500, 25, 1.1, { ...verified(), n: 20 }).ok, false);
  });

  it("group windows preserve unknown returns rather than changing them to zero", () => {
    const unknown = liveRecords([.02, null, -.01].map((r, i) => ({ cfg: `${CFG}|sh`, r, exitT: i + 1 })));
    const group = liveGroupGates(unknown.values(), 0, 10, 3, 1.1).get("Short")!;
    assert.equal(group.ok, false); assert.equal(group.pf, null); assert.equal(group.unknown, 1);
    assert.equal(liveGroupGates(unknown.values(), 0, 10, 4, 1.1).get("Short")!.ok, false);
  });

  it("rejects malformed/overflowed local cumulative returns and invalid chronological records", () => {
    const malformed = { ...record(), gl: Float64Array.of(0, NaN, NaN, NaN) };
    const overflow = liveRecords([1e308, 1e308, -.01].map((r, i) => ({ cfg: CFG, r, exitT: 100 + i }))).get(CFG)!;
    const badTime = { ...record(), exitT: Float64Array.of(100, NaN, 102) };
    for (const local of [malformed, overflow, badTime]) {
      const g = promotionGate(local, record(), 0, 500, 3, 1.1);
      assert.equal(g.ok, false); assert.equal(g.state, "unknown"); assert.equal(g.model?.pf, null);
    }
    assert.equal(promotionGate(record(), record(), NaN, 500, 3, 1.1).ok, false);
  });

  it("canonical exact records retain unknown owned funding and normalize each external multiplier once", () => {
    const key = executionRecordKey(CFG, SYM, 1);
    const model = postBaseExecutionRecords([close(.016, 0, { mult: 2 }), close(-.01, 1)]).get(key)!;
    const owned = ownedPaperExecutionRecords([.02, null].map((unitR, i) => ({ cfg: CFG, sym: SYM, side: 1, exitT: NOW - i, unitR, ownedNotionalUsd: 20 }))).get(key)!;
    assert.equal(model.gp[2], .008); assert.equal(model.gl[2], .01);
    assert.equal(promotionGate(model, owned, 0, NOW, 2, 1.1).state, "unknown");
  });

  it("does not turn missing/invalid identity fields into winning short evidence or skip their recent unknowns", () => {
    const rows = [.02, .02, .02].map((unitR, i) => ({ cfg: CFG, sym: SYM, side: -1, exitT: 100 + i, unitR, ownedNotionalUsd: 20 }));
    for (const invalid of [{ side: 0 }, { side: NaN }, { sym: "" }, { cfg: "" }]) {
      const records = ownedPaperExecutionRecords([...rows, { ...rows[0], exitT: 200, ...invalid }]);
      const actual = records.get(executionRecordKey(CFG, SYM, -1));
      const g = promotionGate(record(), actual, 0, 500, 3, 1.1);
      assert.equal(g.ok, false); assert.equal(g.execution?.unknown, 1);
    }
  });

  it("newer local losing or unknown owned closes cannot be hidden by a still-valid old reference", () => {
    for (const unit of [-.01, null]) {
      const local = liveRecords([unit, unit, unit].map((r, i) => ({ cfg: CFG, r, exitT: 200 + i }))).get(CFG)!;
      for (const source of ["owned-paper", "verified-venue"] as const) {
        const g = promotionGate(record(), local, 0, 500, 3, 1.1, { ...verified(), source });
        assert.equal(g.ok, false); assert.equal(g.execution?.source, "owned-paper");
        assert.equal(g.referenceIgnored, "newer-local-owned-closes");
      }
    }
  });
});

describe("native live boundary preserves held protection without unproven growth", () => {
  it("blocks missing promotion evidence, prevents resizing a held share upward, and still closes it", async () => {
    process.env.CTS_CORE_LIVE = "1";
    const { rt } = fakeRt(new CoreDb());
    (rt as unknown as { engineProof: () => unknown }).engineProof = () => ({ proven: new Set(), judged: 1, n: 25, minPf: 1.2 });
    rt.paper.positions = [paperLane(CFG, "S0-USDT", 1, 10)];
    const ex = new SimExchange(rng(17));
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    const before = (await ex.book()).positions.filter((p) => p.qty > 0).reduce((q, p) => q + p.qty, 0);
    assert.ok(before > 0);
    (rt as unknown as { livePromotionGate: unknown }).livePromotionGate = undefined;
    rt.paper.positions[0].vol = 10;
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    assert.equal((await ex.book()).positions.filter((p) => p.qty > 0).reduce((q, p) => q + p.qty, 0), before);
    const control = liveKv<{ actions: Array<{ msg?: string }>; protection?: { stops: number } }>(rt.db, "controlStatus");
    assert.ok(control?.actions.some((a) => a.msg?.includes("lacks current promotion proof")));
    assert.ok((await ex.book()).orders.some((o) => o.type?.includes("STOP")), "held protection remains");
    rt.paper.positions = [];
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    assert.equal((await ex.book()).positions.filter((p) => p.qty > 0).length, 0);
    process.env.CTS_CORE_LIVE = "0";
  });
});

describe("paper entry allocation provenance", () => {
  it("a lower explicit Live PF cannot relax the post-Base range floor for paper entries", () => {
    const t = Math.floor(Date.now() / H) * H, cfg = `${CFG}|mn`;
    const r = install(fixture(), [.006, -.01, .006].map((v, i) => close(v, i, {
      cfg, entryT: t - 2 * H + i * 1000, exitT: t - H + i * 1000,
    })));
    r.settings.gates.rangeMinPf = { ...r.settings.gates.rangeMinPf, minimal: 1.35 };
    r.settings.live.liveMinPf = 1.1;
    r.wf.rangeGate = undefined;
    r.db.kvSet("liveSince", t - 3 * H);
    const raw = Array.from({ length: 30 }, (_, i) => close(.02, i, {
      cfg, entryT: t - 3 * H + i * 60_000, exitT: t - 2 * H + i * 60_000,
    }));
    const open = { cfg, sym: SYM, side: 1, entryI: 0, entryT: t, entry: 100,
      stop: 96.1, target: 102.6, peak: 100, trailOn: false, mtm: 0 } as OpenPosition;
    r.tapes = [makeTape(cfg, "follow", "rsi-mom-14-25@m15", { ...DEFAULT_PROTECT, tag: "mn" }, "normal", [SYM], raw, [open], [])];
    (r as unknown as { stepPaper(): void }).stepPaper();
    assert.equal(r.paper.positions.length, 0, "PF 1.2 does not clear the exact Minimal floor of 1.35");
    assert.equal(r.status.paperSkips?.liveValidation, 1, JSON.stringify(r.status.paperSkips));
    assert.equal(r.status.liveValidation?.paused, 1);
  });

  it("continues eligible paper learning before live proof and freezes only the newly measured allocation", () => {
    const r = install(fixture(), []), t = Math.floor(Date.now() / H) * H;
    const raw = Array.from({ length: 30 }, (_, i) => close(.02, i, { entryT: t - 3 * H + i * 60_000, exitT: t - 2 * H + i * 60_000 }));
    const open = { cfg: CFG, sym: SYM, side: 1, entryI: 0, entryT: t, entry: 100,
      stop: 96.1, target: 102.6, peak: 100, trailOn: false, mtm: 0 } as OpenPosition;
    r.tapes = [makeTape(CFG, "follow", "rsi-mom-14-25@m15", DEFAULT_PROTECT, "normal", [SYM], raw, [open], [])];
    (r as unknown as { stepPaper(): void }).stepPaper();
    assert.equal(r.paper.positions.length, 1, JSON.stringify(r.status.paperSkips));
    assert.equal(r.livePromotionGate(lane, NOW).ok, false, "paper learning is not live promotion");
    const adopted = r.db.kvGet<{ ownedEntryAllocations: Array<[string, { unitUsd: number; vol: number }]> }>("paperBook")!;
    assert.equal(adopted.ownedEntryAllocations.length, 1);
    const unit = adopted.ownedEntryAllocations[0][1].unitUsd;
    assert.ok(unit > 0);
    r.settings.paperBalance *= 10;
    (r as unknown as { stepPaper(): void }).stepPaper();
    assert.equal(r.db.kvGet<typeof adopted>("paperBook")!.ownedEntryAllocations[0][1].unitUsd, unit,
      "a recomputed cash/sizing unit never rewrites measured entry funding");
  });

  it("persists frozen known adoption allocation across restart, excludes legacy/recomputed units and unconfirmed growth", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-owned-proof-"));
    try {
      for (const [name, allocation, positionVol, closeVol, expected] of [
        ["known", { unitUsd: 20, vol: 2 }, 2, 2, 40],
        ["partial", { unitUsd: 20, vol: 2 }, 1, 1, 20],
        ["growth", { unitUsd: 20, vol: 1 }, 2, 2, null],
        ["dust", { unitUsd: 1e-12, vol: 1 }, 1, 1, null],
        ["legacy", undefined, 1, 1, null],
      ] as const) {
        const path = join(dir, `${name}.sqlite`), first = fixture(path, 1);
        const tr = close(.02, 0, { mult: closeVol, vol: closeVol, r: .02 * closeVol });
        const p = { ...tr, entryI: 0, stop: 99, target: 103, peak: 100, trailOn: false, mtm: 0, vol: positionVol } as OpenPosition & { vol: number };
        first.db.kvSet("paperBook", { startedAt: NOW - 24 * H, selected: [CFG], positions: [p],
          ownedEntryAllocations: allocation ? [[orderKey(p), allocation]] : [] });
        const restored = install(fixture(path, 1), [tr]);
        // A newly reconstructed sizing map must not invent old entry funding.
        restored.paper.units = new Map([[orderKey(p), 9999]]);
        (restored as unknown as { stepPaper(): void }).stepPaper();
        const row = restored.db.get<{ owned_notional_usd: number | null; r: number; unit_r: number }>("SELECT owned_notional_usd,r,unit_r FROM paper_book_trades");
        assert.ok(row, name); assert.equal(row.owned_notional_usd, expected, name);
        assert.equal(row.r, tr.r); assert.equal(row.unit_r, .02);
        const reopened = new CoreDb(path);
        try { assert.equal(reopened.get<{ owned_notional_usd: number | null }>("SELECT owned_notional_usd FROM paper_book_trades")?.owned_notional_usd, expected); }
        finally { reopened.db.close(); }
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
