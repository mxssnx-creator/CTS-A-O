import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { studySha256, studyExactJson, readSessionStudy, validateFrozenSessionRuntime, validateFrozenSessionResult } from "./session-study.mjs";

function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), "cts-frozen-session-"));
  try {
    const source = "frozen strategy", feed = "frozen candles";
    writeFileSync(join(root, "strategy.ts"), source); writeFileSync(join(root, "feed.json"), feed);
    const files = [{ path: "strategy.ts", sha256: studySha256(source) }];
    const settings = { symbols: 2, forceSymbols: ["A-USDT", "B-USDT"], cost: 0.0015 }, wf = { preH: 6, simH: 24, longH: 6 };
    const p = { schema: "cts-session-study-v1", id: "holdout", symbols: settings.forceSymbols, actualSettings: settings, actualWf: wf, feed: { sha256: studySha256(feed) }, source: { files, sha256: studySha256(studyExactJson(files)), checkpoint: "verified-source" }, window: { evaluationFromT: 0, tradeStartT: 6 * 3_600_000, endT: 30 * 3_600_000, preH: 6, runH: 24 } };
    const file = join(root, "protocol.json"); writeFileSync(file, JSON.stringify(p));
    const rt = { settings: structuredClone(settings), wf: structuredClone(wf), status: { computes: 0 } };
    const raw = { symbols: [...settings.forceSymbols], window: { startT: p.window.tradeStartT, endT: p.window.endT }, engine: { universe: [...settings.forceSymbols], mem: { computeLevel: 0, fallback: 0, aborts: 0 }, coverage: { expectedCombos: 20, evaluated: 20 } }, trades: [], openEnd: [] };
    return fn({ root, file, p, rt, raw, feed: join(root, "feed.json") });
  } finally { rmSync(root, { recursive: true, force: true }); }
}
describe("frozen full-engine session study", () => {
  it("rejects every missing or mismatched frozen timing field before compute even when runtime equality would hold", () => fixture(({root,file,p,rt,feed}) => {
    for (const [key, value] of [["preH", 5], ["simH", 6], ["longH", 24]]) {
      for (const replacement of [value, null, undefined]) {
        const bad = structuredClone(p), actual = structuredClone(rt);
        if (replacement === undefined) { delete bad.actualWf[key]; delete actual.wf[key]; }
        else { bad.actualWf[key] = replacement; actual.wf[key] = replacement; }
        writeFileSync(file, JSON.stringify(bad));
        assert.throws(() => readSessionStudy(file, root), /timing differs/);
        assert.throws(() => validateFrozenSessionRuntime(actual, file, feed, p.window.evaluationFromT, p.window.endT, root), /timing differs/);
        assert.equal(actual.status.computes, 0);
      }
    }
  }));
  it("checks the actual normalized runtime before compute and records empty evidence honestly", () => fixture(({root,file,p,rt,raw,feed}) => {
    validateFrozenSessionRuntime(rt,file,feed,p.window.evaluationFromT,p.window.endT,root);
    const evidence = validateFrozenSessionResult(raw,file,root); assert.equal(evidence.id,"holdout"); assert.equal(raw.trades.length,0);
    rt.status.computes=1; assert.throws(()=>validateFrozenSessionRuntime(rt,file,feed,0,p.window.endT,root),/before compute/);
  }));
  it("rejects changed economic settings, time boundaries and feed bytes", () => fixture(({root,file,p,rt,feed}) => {
    rt.settings.cost=0.002; assert.throws(()=>validateFrozenSessionRuntime(rt,file,feed,0,p.window.endT,root),/settings differ/); rt.settings.cost=0.0015;
    assert.throws(()=>validateFrozenSessionRuntime(rt,file,feed,1,p.window.endT,root),/time boundary/);
    writeFileSync(feed,"different candles"); assert.throws(()=>validateFrozenSessionRuntime(rt,file,feed,0,p.window.endT,root),/feed differs/);
  }));
  it("rejects an incomplete symbol universe and memory fallback rather than calling them a full test", () => fixture(({root,file,raw}) => {
    raw.engine.universe.pop(); assert.throws(()=>validateFrozenSessionResult(raw,file,root),/exact frozen symbol/); raw.engine.universe=["A-USDT","B-USDT"];
    raw.engine.mem.computeLevel=1; assert.throws(()=>validateFrozenSessionResult(raw,file,root),/Degraded/); raw.engine.mem.computeLevel=0;
    raw.engine.mem.aborts=1; assert.throws(()=>validateFrozenSessionResult(raw,file,root),/Degraded/);
  }));
  it("rejects stale source and out-of-scope entries", () => fixture(({root,file,p,raw}) => {
    raw.trades=[{sym:"A-USDT",entryT:p.window.tradeStartT-1,exitT:p.window.endT}]; assert.throws(()=>validateFrozenSessionResult(raw,file,root),/outside/);
    raw.trades=[]; writeFileSync(join(root,"strategy.ts"),"changed"); assert.throws(()=>validateFrozenSessionResult(raw,file,root),/source changed/);
  }));
  it("rejects missing memory fields and incomplete processing counts", () => fixture(({root,file,raw}) => {
    delete raw.engine.mem.aborts;
    assert.throws(()=>validateFrozenSessionResult(raw,file,root),/unrecorded memory/);
    raw.engine.mem.aborts=0; raw.engine.coverage.evaluated=19;
    assert.throws(()=>validateFrozenSessionResult(raw,file,root),/complete processing coverage/);
    raw.engine.coverage.evaluated=20; delete raw.engine.coverage.expectedCombos;
    assert.throws(()=>validateFrozenSessionResult(raw,file,root),/complete processing coverage/);
  }));
  it("rejects a changed report funding size even when strategy settings are unchanged", () => fixture(({root,file,p,raw}) => {
    p.account={balance:10,leverage:10,sizing:{mode:"equityPct",pct:0.001}};
    writeFileSync(file,JSON.stringify(p));
    raw.settings={book:{...p.account,sizing:{mode:"equityPct",pct:0.02}}};
    assert.throws(()=>validateFrozenSessionResult(raw,file,root),/funding\/sizing differs/);
    raw.settings.book.sizing=p.account.sizing;
    assert.equal(validateFrozenSessionResult(raw,file,root).id,"holdout");
  }));
});
