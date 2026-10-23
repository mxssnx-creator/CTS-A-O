import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { StratKind, Trade } from "./domain/types.ts";
import { configId, laneProtect, makeUniverse } from "./pipeline/pipeline.ts";
import { BaseConfigCounter } from "./base-config-counts.ts";
import { minPfOf } from "./minimal-coord.ts";
import { liveMinPfOf } from "./server/runtime.server.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { signalSettings } from "./signal-config.ts";
import { activeSignals, sigActiveKey } from "./signals.ts";
import { heldSignalProtect, signalHistProtects, signalHistValidationOf } from "./signal-hist.ts";
import { configEval, defaultWalkForward, execDecision, makeTape, selectAt, selectDurable, selectFixed, signalConfigEval, signalValidationOk, walkForward } from "./sim/walkforward.ts";
import { closePool, runOnWorkers } from "./server/pool.server.ts";

const H = 3_600_000, NOW = Date.UTC(2026, 9, 20, 12);
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
const options = { ...defaults, signalOwnBase: true, signalValidLastN: 25, validLastN: 0, lastN: 0,
  preGate: false, rangeGate: undefined, signalGuardN: 0, signalAccept: undefined, signalSideAccept: undefined, signalCluster: undefined,
  gates: { ...defaults.gates, minPf: 1.05, rangeMinPf: undefined, minTrades: 3, maxDdr: 0, maxDdtH: 1000, minGreen: 0, stableBlocks: 0, lossPrior: false, lastNFloor: 0 },
  toggles: { ...defaults.toggles, normal: true, trailing: true, dca: true, dcaActive: false, axis: true, block: false, blockActive: false } };
function own(cfg: string, sym: string, side: 1 | -1, pf: number, count = 75, end = NOW - H): Trade[] {
  return Array.from({ length: count }, (_, i) => { const r = i % 5 === 4 ? -0.01 : pf * 0.01 / 4;
    return { cfg, sym, side, entryT: end - (count - i) * H - 60_000, exitT: end - (count - i) * H,
      entry: 100, exit: 100 * (1 + side * r), r, mult: 1, reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0 }; });
}
after(() => closePool());

describe("Signals PF 1.5, own Strategy Base and independent TP/SL", () => {
  it("retains stricter floors from history through native admission and every ranking mode", () => {
    for (const ind of ["sig-ema-cross-s@m1", "sig-ema-cross-m@m30", "sig-coord-v2-test@m15"]) {
      assert.equal(minPfOf({ minPf: 1.05 }, undefined, ind), 1.5);
      assert.equal(minPfOf({ minPf: 1.8 }, undefined, ind), 1.8);
      assert.equal(minPfOf({ minPf: 1.05, rangeMinPf: { short: 1.9 } }, "sh", ind), 1.5, "a borrowed protection tag cannot replace the Signals range floor");
      assert.equal(minPfOf({ minPf: 1.9, rangeMinPf: { short: 1.1 } }, "sh", ind), 1.9, "an explicit global floor still applies");
      assert.equal(liveMinPfOf({ gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.05 }, live: { ...DEFAULT_SETTINGS.live, liveMinPf: 1.1 } }, undefined, ind), 1.5);
    }
    assert.equal(minPfOf({ minPf: 1.05, rangeMinPf: { short: 1.9 } }, "sh", "ema-cross"), 1.9, "ordinary strategies retain their own range floor");
    assert.equal(signalHistValidationOf(0.002, { ...DEFAULT_SETTINGS.gates, minPf: 1.05 }).minPf, 1.5);
    for (const rank of ["net", "drawdown", "lowdd"] as const) {
      const s = signalSettings({ rank, minBlockShare: 0, minTrades: 3 });
      const row = (pf: number) => ({ bot: "follow", ind: "sig-ema-cross-s@m15", kind: "normal", cfg: "own", bySym: { A: { n: 75, pf, net: 1, dd: 0.1, recentN: 25, recentNet: 1 } } });
      assert.equal(activeSignals([row(1.49)], s).size, 0);
      assert.equal(activeSignals([row(1.5)], s).size, 2);
    }
  });
  for (const range of ["s", "m"]) for (const tf of [1, 5, 15, 30])
    for (const kind of ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis"] as StratKind[])
      it(`${range}/${tf}m/${kind}: own PF floor and Last-25 survive Base, selectors and admission`, () => {
        const ind = `sig-ema-cross-${range}@m${tf}`;
        const protect = { tp: kind === "trailing-only" ? 0 : 0.03, sl: 0.02, trail: kind === "normal" ? 0 : 0.01, hold: 192, trailMax: 0.03, ...(kind === "trailing-only" ? { trailOnly: true } : {}) };
        const cfg = configId("follow", ind, protect, kind);
        const tp = makeTape(cfg, "follow", ind, protect, kind, ["A", "A", "B", "B"], [...own(cfg, "A", 1, 1.6), ...own(cfg, "A", -1, 1.4), ...own(cfg, "B", 1, 1.4)], [], []);
        const o = { ...options, toggles: { ...options.toggles, dcaActive: kind === "dca-active" }, signalActive: new Set(["A", "B"].flatMap(sym => [1,-1].map(side => sigActiveKey("follow", ind, sym, side, kind, cfg)))) };
        const ev = configEval(tp, NOW, o);
        assert.equal(ev.ok, true); assert.equal(ev.n, 75); assert.ok(ev.pf >= 1.5);
        assert.equal(ev.candidate?.n, 225); assert.ok(ev.candidate!.pf < 1.5, "unfiltered history is preserved separately and cannot dilute an own winner");
        assert.equal(signalConfigEval(tp, NOW, o, "A", 1).ok, true);
        for (const [sym, side] of [["A", -1], ["B", 1], ["B", -1]] as const) {
          assert.equal(signalConfigEval(tp, NOW, o, sym, side).ok, false);
          assert.equal(execDecision(tp, NOW, o, { sym, side }).ok, false);
          assert.equal(signalValidationOk(tp, NOW, o, sym, side), false);
        }
        assert.equal(execDecision(tp, NOW, o, { sym: "A", side: 1 }).ok, true);
        assert.equal(signalValidationOk(tp, NOW, o, "A", 1), true);
        const mirrored = makeTape(cfg, "follow", ind, protect, kind, ["A"], [...own(cfg, "A", -1, 1.6), ...own(cfg, "A", 1, 1.4)], [], []);
        assert.equal(signalConfigEval(mirrored, NOW, o, "A", -1).ok, true);
        assert.equal(execDecision(mirrored, NOW, o, { sym: "A", side: -1 }).ok, true, "a separately qualified Short reaches execution too");
        assert.equal(execDecision(mirrored, NOW, o, { sym: "A", side: 1 }).ok, false);
        for (const picks of [selectAt([tp], NOW, o).picks, selectFixed([tp], NOW, o).picks, selectDurable([tp], NOW, o, new Set([cfg])).picks]) assert.deepEqual(picks.map(x => x.id), [cfg]);
        const older = own(cfg, "A", 1, 8, 75, NOW - 30 * H), recent = own(cfg, "A", 1, 1.4, 25);
        const stale = makeTape(cfg, "follow", ind, protect, kind, ["A"], [...older, ...recent, ...own(cfg, "A", 1, 8, 75, NOW + 100 * H)], [], []);
        assert.equal(signalConfigEval(stale, NOW, o, "A", 1).ok, false, "old or future winners cannot replace a failing own Last-25");
        assert.equal(selectFixed([stale], NOW, o).picks.length, 0);
        assert.equal(execDecision(stale, NOW, o, { sym: "A", side: 1 }).ok, false);
      });
  it("Base configured-cell counts judge the same own symbol/direction history and Last-N", () => {
    const ind = "sig-ema-cross-s@m15", cfg = "follow|" + ind + "|own", p = { tp: 0.03, sl: 0.02, trail: 0, hold: 192 };
    const counter = new BaseConfigCounter({ gates: options.gates, signalLastN: options.signalValidLastN, cost: 0.002, cutT: NOW, fromT: NOW - 336 * H });
    counter.record("follow", ind, p, "normal", [...own(cfg, "A", 1, 1.6), ...own(cfg, "B", 1, 1.4)]);
    counter.record("follow", ind, p, "normal", own(cfg, "B", 1, 1.4));
    const row = counter.rows()[0]; assert.equal(row.minPf, 1.5); assert.equal(row.floorPf, 1.5); assert.equal(row.passed, 1); assert.equal(row.evaluated, 2);
  });
  it("admits every qualified independent set on twelve symbols, three sources, four protections and all Signal lanes/types", () => {
    const symbols = Array.from({length:12}, (_,i) => `S${i}-USDT`);
    const tapes = ["ema-cross","macd-cross","rsi-reversal"].flatMap(source => [0,1,2,3].flatMap(variant => ["s","m"].flatMap(range => [1,5,15,30].flatMap(tf =>
      (["normal","trailing","trailing-only","dca","dca-active","axis"] as StratKind[]).map(kind => {
        const ind = `sig-${source}-${range}@m${tf}`;
        const p = {tp:kind === "trailing-only" ? 0 : 0.015+variant*0.005, sl:0.012+variant*0.003, trail:kind === "normal" ? 0 : 0.005+variant*0.002, hold:192, trailMax:0.03, ...(kind === "trailing-only" ? {trailOnly:true} : {})};
        const cfg = configId("follow",ind,p,kind);
        const rows = symbols.flatMap(sym => ([1,-1] as const).flatMap(side => [
          ...own(cfg,sym,side,sym === symbols[0] && side === -1 ? 1.4 : 1.6),
          {cfg,sym,side,entryT:NOW+5*60_000,exitT:NOW+10*60_000,entry:100,exit:100*(1+side*0.004),r:0.004,mult:1,reason:"tp" as const,bars:1,mfe:0,mae:0}
        ]));
        return makeTape(cfg,"follow",ind,p,kind,symbols,rows,[],[]);
      })))));
    assert.equal(tapes.length,576);assert.equal(new Set(tapes.map(t=>t.id)).size,576);
    const u = {bars:[],caches:[],startT:NOW-100*H,endT:NOW+H,splitT:NOW,nowT:NOW+H,baseTf:1} as never;
    let total = 0;
    for (const active of [false,true]) {
      const subset = tapes.filter(t => (t.kind === "dca-active") === active);
      const o = {...options,startT:NOW,simH:1,stepH:1,symGate:undefined,signalSourceGate:undefined,recordValidation:true,
        coord:{...options.coord,enabled:false,confirm:false,conflict:false,hourLock:0,cooldown:"off" as const},
        signalRank:signalSettings({count:0,minBlockShare:0,minTrades:3,validate:false}),
        signalBasePassed:new Set(subset.map(t => `${t.bot}|${t.ind}`)),toggles:{...options.toggles,dcaActive:active}};
      const run = walkForward(u,subset,o);
      assert.equal(run.steps[0].checks?.length,subset.length);
      assert.equal(run.steps[0].checks?.filter(c => c[1]).length,subset.length);
      assert.equal(run.trades.length,subset.length*23,`one weak own short cannot borrow any of the other 23 contexts: ${JSON.stringify({funnel:run.signalFunnel,skips:run.skips})}`);
      assert.equal(run.trades.some(t => t.sym === symbols[0] && t.side === -1),false);
      assert.equal(new Set(run.trades.map(t => t.cfg)).size,subset.length);
      assert.equal(new Set(run.trades.map(t => t.sym)).size,12);
      assert.deepEqual(new Set(run.trades.map(t => t.side)),new Set([1,-1]));
      for (const tr of run.trades) assert.ok(signalConfigEval(subset.find(t => t.id === tr.cfg)!,tr.entryT,o,tr.sym,tr.side).ok);
      total += run.trades.length;
    }
    assert.equal(total,13248,"576 independent protection sets each admit their own 23 qualified symbol/direction entries");
  });
  it("records every independent Signal config in the Strategy Base step report, including failures", () => {
    const ind = "sig-ema-cross-s@m15";
    const tapes = ["normal", "trailing", "trailing-only"].flatMap((kind) => [1.6, 1.4].map(pf => {
      const p = { tp: kind === "trailing-only" ? 0 : 0.03, sl: pf === 1.6 ? 0.02 : 0.021, trail: kind === "normal" ? 0 : 0.01, hold: 192, trailMax: 0.03, ...(kind === "trailing-only" ? { trailOnly: true } : {}) };
      const id = configId("follow", ind, p, kind as StratKind);
      return makeTape(id, "follow", ind, p, kind as StratKind, ["A"], own(id, "A", 1, pf), [], []);
    }));
    const u = { bars: [], caches: [], startT: NOW - 336 * H, endT: NOW + H, splitT: NOW, nowT: NOW + H, baseTf: 60 } as never;
    const run = walkForward(u, tapes, { ...options, startT: NOW, simH: 1, stepH: 1, recordValidation: true, signalRank: signalSettings({ minBlockShare: 0, minTrades: 3 }), signalBasePassed: new Set([`follow|${ind}`]) });
    const checks = run.steps[0].checks!;
    assert.equal(checks.length, 6); assert.equal(checks.filter(x => x[1]).length, 3);
    assert.deepEqual(new Set(checks.map(x => x[0])), new Set(tapes.map(t => t.id)));
    for (const [id, ok, n, pf] of checks) {
      const ev = configEval(tapes.find(t => t.id === id)!, NOW, options);
      assert.equal(ok, Number(ev.ok)); assert.equal(n, ev.n); assert.equal(pf, ev.pf);
    }
  });
  it("fits independent historic TP/SL with zero trailing and restores held pure TP/SL IDs", async () => {
    const bars = [3, 5].map((seed) => barsFromCandles(`${seed}-USDT`, 15, syntheticCandles(`${seed}-USDT`, 15, 3000, NOW, seed)));
    const u = makeUniverse(bars), pair = "follow|sig-ema-cross-s@m15";
    const sig = signalSettings({ hist: { enabled: true, lookbackH: 0, minN: 5, quantiles: [0.5], slOfTp: [1,2], trailOfTp: [0.5] }, filter: { trendH: 0, volFloor: 0 } });
    const local = signalHistProtects(u, [pair], sig, null, u.nowT);
    assert.ok(local[pair].some(p => p.trail === 0)); assert.ok(local[pair].some(p => p.trail > 0));
    for (const p of local[pair].filter(p => p.trail === 0)) {
      const cfg = configId("follow", pair.split("|")[1], laneProtect(p, pair.split("|")[1]));
      const held = heldSignalProtect(cfg); assert.ok(held); assert.equal(held.protect.trail, 0);
      assert.equal(configId("follow", pair.split("|")[1], laneProtect(held.protect, pair.split("|")[1])), cfg);
    }
    const [remote] = await runOnWorkers<{ pairProtects: Record<string, typeof local[string]> }>([{ type: "signal-hist", bars, pairs: [pair], sig, tactics: null, cutT: u.nowT }], 2);
    assert.deepEqual(remote.pairProtects, local);
  });
});
