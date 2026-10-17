import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditSessionStudy, auditSessionStudyFiles, renderSessionStudyAudit } from './audit-session-study.mjs';
import { mkdtemp, readFile, writeFile, appendFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeSessionDump } from './lib/session-dump.mjs';

const H = 3_600_000;
function fixture({ n = 3, allLosing = false, unknownUnit = false, missingAllocations = false } = {}) {
  const symbols = Array.from({ length: 22 }, (_, i) => `T${i}-USDT`);
  const startT = 24 * H, endT = startT + 24 * H;
  const raw = { study: { id: 'synthetic-selection22', sourceSha256: 'a'.repeat(64), feedSha256: 'b'.repeat(64), protocolSha256: 'c'.repeat(64) },
    symbols, window: { startT, endT }, qualification: { noLossGateScore: 4 }, settings: { book: { balance: 10, sizing: { mode: 'equityPct', pct: .001 }, leverage: 10 } },
    basePairs: [{ pair: 'follow|test@m1', passed: true, tags: ['mc'] }],
    engine: { universe: symbols, baseEvaluated: 100, basePassed: 10, coverage: { expectedCombos: 100, evaluated: 100 }, mem: { computeLevel: 0, fallback: 0, aborts: 0 } },
    tapeAgg: { evalStats: { evaluated: 1000, passed: 100 } }, trades: [] };
  for (let i = 0; i < n; i++) {
    const sig = !allLosing && i === 2;
    const entryT = startT + (i >= n / 2 ? 13 * H : H) + i * 60_000;
    const unitR = allLosing ? -.01 : i === 0 ? .02 : i === 1 ? -.01 : .005;
    const mult = !allLosing && i === 0 ? 4 : 1;
    raw.trades.push({ cfg: sig ? 'follow|sig-ema-s@m1|trailing-only' : 'follow|test@m1|tp1|mc', kind: sig ? 'trailing-only' : 'trailing',
      sym: symbols[i % 3], side: sig ? -1 : 1, entryT, exitT: entryT + 60_000, r: unitR * mult, mult,
      ...(unknownUnit && i === 0 ? { unitR: null } : {}) });
  }
  const sizedOrders = raw.trades.map((x, closeIndex) => ({ ...x, closeIndex, unitR: x.unitR === null ? null : x.r / x.mult,
    unitNotional: 1, allocatedNotional: x.mult, sizedPnl: x.r }));
  const gpR = raw.trades.reduce((s, x) => s + Math.max(0, x.r / x.mult), 0);
  const glR = raw.trades.reduce((s, x) => s + Math.max(0, -x.r / x.mult), 0);
  const data = { study: raw.study, symbols, window: raw.window, checksOk: true,
    total: { fundedOrders: n, gpR, glR, net: raw.trades.reduce((s, x) => s + x.r, 0) },
    ...(!missingAllocations ? { sizedOrders } : {}) };
  return { raw, data };
}

describe('frozen session independent audit', () => {
  it('rejects unloaded trade and allocation placeholders as incomplete evidence', () => {
    const { raw, data } = fixture();
    assert.throws(() => auditSessionStudy({ ...raw, arraySidecars: { trades: {} } }, data), /Load execution and allocation sidecars/);
    assert.throws(() => auditSessionStudy(raw, { ...data, arraySidecars: { sizedOrders: {} } }), /Load execution and allocation sidecars/);
  });
  it('reconciles legacy and chunked files identically and verifies unloaded history chunks', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cts-study-audit-chunks-'));
    try {
      const { raw, data } = fixture();
      raw.tapeTrades = [{ id: raw.trades[0].cfg, trades: [[1, 2, .02], [3, 4, -.01]] }];
      raw.validation = [{ t: raw.window.startT, checks: [{ id: raw.trades[0].cfg, pass: true }] }];
      const legacy = join(dir, 'legacy.json'), chunked = join(dir, 'chunked.json'), report = join(dir, 'data.json'), allocationChunks = join(dir, 'allocation.json');
      await writeFile(legacy, JSON.stringify(raw)); await writeFile(report, JSON.stringify(data));
      await writeSessionDump(chunked, raw, { maxChunkBytes: 1024, arrayFields: ['trades'] });
      const a = await auditSessionStudyFiles(legacy, report), b = await auditSessionStudyFiles(chunked, report);
      assert.equal(a.checksOk, true); assert.equal(b.checksOk, true);
      assert.deepEqual(a.total, b.total); assert.deepEqual(a.cohorts, b.cohorts); assert.deepEqual(a.hours, b.hours);
      assert.equal(a.provenance.inputSha256.allocationReport, b.provenance.inputSha256.allocationReport);
      await writeSessionDump(allocationChunks, data, { maxChunkBytes: 1024, arrayFields: ['sizedOrders'] });
      const c = await auditSessionStudyFiles(chunked, allocationChunks);
      assert.deepEqual(a.total, c.total); assert.deepEqual(a.cohorts, c.cohorts); assert.deepEqual(a.hours, c.hours);
      const manifest = JSON.parse(await readFile(chunked, 'utf8'));
      await appendFile(join(dir, manifest.validationSidecar.chunks[0].path), ' ');
      await assert.rejects(auditSessionStudyFiles(chunked, report), /byte size mismatch/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('keeps funded unit PF, weighted cash, cohorts, directions and every hour separate', () => {
    const { raw, data } = fixture();
    const a = auditSessionStudy(raw, data);
    assert.equal(a.checksOk, true);
    assert.equal(a.total.closes, 3);
    assert.equal(a.total.exactPf, 2.5);
    assert.equal(a.total.sizedPfDiagnostic, 8.5);
    assert.equal(a.cohorts.find((x) => x.key === 'Engine').exactPf, 2);
    const sig = a.cohorts.find((x) => x.key === 'Signals');
    assert.equal(sig.state, 'no-loss'); assert.equal(sig.exactPf, null); assert.equal(sig.noLossGateScore, 4);
    assert.equal(a.byDirection.find((x) => x.key === 'Short').closes, 1);
    assert.equal(a.hours.length, 24);
    assert.equal(a.hours.filter((x) => x.combined.state === 'empty').length, 22);
    assert.equal(a.eligibility.configRunStart.evaluated, 1000);
    assert.match(renderSessionStudyAudit(a), /no losses \(gate score 4; exact ratio unavailable\)/);
    assert.equal(a.pruning.assessmentAllowed, false);
  });

  it('never treats zero allocations as funded performance or permits duplicate allocation joins', () => {
    const { raw, data } = fixture();
    data.sizedOrders[0].allocatedNotional = 0; data.sizedOrders[0].unitNotional = 0; data.sizedOrders[0].sizedPnl = 0;
    data.total = { fundedOrders: 2, gpR: .005, glR: .01, net: -.005 };
    const a = auditSessionStudy(raw, data);
    assert.equal(a.total.closes, 2); assert.equal(a.total.exactPf, .5); assert.equal(a.account.zeroAllocations, 1);
    assert.equal(a.checksOk, true);
    data.sizedOrders[1].closeIndex = 0;
    assert.throws(() => auditSessionStudy(raw, data), /identity.*mismatched/);
  });

  it('preserves missing unit or allocation evidence as unknown and prevents pruning', () => {
    const unknown = fixture({ unknownUnit: true });
    const a = auditSessionStudy(unknown.raw, unknown.data, { purpose: 'selection' });
    assert.equal(a.total.state, 'unknown'); assert.equal(a.total.exactPf, null); assert.equal(a.total.closes, 3);
    assert.equal(a.checksOk, false); assert.equal(a.pruning.assessmentAllowed, false);
    const missing = fixture({ missingAllocations: true });
    const b = auditSessionStudy(missing.raw, missing.data, { purpose: 'selection' });
    assert.equal(b.total.state, 'unknown'); assert.equal(b.total.closes, null);
    assert.equal(b.checksOk, false); assert.equal(b.provenance.missingAllocationRows, true);
  });

  it('proposes only adequately sampled persistent losing cells after the completed 22x24 selection audit', () => {
    const { raw, data } = fixture({ n: 60, allLosing: true });
    const dev = auditSessionStudy(raw, data, { purpose: 'development' });
    assert.equal(dev.pruning.candidates.length, 0);
    const selection = auditSessionStudy(raw, data, { purpose: 'selection' });
    assert.equal(selection.checksOk, true); assert.equal(selection.pruning.assessmentAllowed, true);
    assert.equal(selection.pruning.candidates.length, 1);
    assert.equal(selection.pruning.candidates[0].closes, 60); assert.equal(selection.pruning.candidates[0].symbols, 3);
    const thin = fixture({ n: 49, allLosing: true });
    assert.equal(auditSessionStudy(thin.raw, thin.data, { purpose: 'selection' }).pruning.candidates.length, 0);
    data.study = { ...data.study, sourceSha256: 'different' };
    assert.equal(auditSessionStudy(raw, data, { purpose: 'selection' }).pruning.candidates.length, 0);
  });
});
