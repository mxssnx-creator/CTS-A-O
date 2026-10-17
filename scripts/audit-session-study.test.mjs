import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditSessionStudy, renderSessionStudyAudit } from './audit-session-study.mjs';

const H = 3_600_000;
function fixture({ n = 3, allLosing = false, unknownUnit = false, missingAllocations = false } = {}) {
  const symbols = Array.from({ length: 22 }, (_, i) => `T${i}-USDT`);
  const startT = 24 * H, endT = startT + 24 * H;
  const raw = { study: { id: 'synthetic-selection22', sourceSha256: 'a'.repeat(64), feedSha256: 'b'.repeat(64), protocolSha256: 'c'.repeat(64) },
    symbols, window: { startT, endT }, qualification: { noLossGateScore: 4 }, settings: { cost: .0015, live: { maxPositionX: .75, maxExposureX: 7 }, book: { balance: 10, sizing: { mode: 'equityPct', pct: .001 }, leverage: 10 } },
    basePairs: [{ pair: 'follow|test@m1', passed: true, tags: ['mc'] }],
    engine: { universe: symbols, baseEvaluated: 100, basePassed: 10, coverage: { expectedCombos: 100, evaluated: 100 }, mem: { computeLevel: 0, fallback: 0, aborts: 0 } },
    tapeAgg: { evalStats: { evaluated: 1000, passed: 100 } }, trades: [] };
  for (let i = 0; i < n; i++) {
    const sig = !allLosing && i === 2;
    const entryT = startT + (i >= n / 2 ? 13 * H : H) + i * 60_000;
    const unitR = allLosing ? -.01 : i === 0 ? .02 : i === 1 ? -.01 : .005;
    const mult = !allLosing && i === 0 ? 4 : 1;
    raw.trades.push({ cfg: sig ? 'follow|sig-ema-s@m1|trailing-only' : 'follow|test@m1|tp1|mc', kind: sig ? 'trailing-only' : 'trailing',
      sym: symbols[i % 3], side: sig ? -1 : 1, entryT, exitT: entryT + 60_000, r: unitR * mult, mult, vol: mult,
      ...(unknownUnit && i === 0 ? { unitR: null } : {}) });
  }
  const sizedOrders = raw.trades.map((x, closeIndex) => ({ ...x, closeIndex, unitR: x.unitR === null ? null : x.r / x.mult,
    unitNotional: 1, allocatedNotional: x.mult, sizedPnl: x.r }));
  const gpR = raw.trades.reduce((s, x) => s + Math.max(0, x.r / x.mult), 0);
  const glR = raw.trades.reduce((s, x) => s + Math.max(0, -x.r / x.mult), 0);
  const data = { study: raw.study, symbols, window: raw.window, checksOk: true,
    total: { caps: { on: true, maxPositionX: .75, maxExposureX: 7 }, fundedOrders: n, gpR, glR, net: raw.trades.reduce((s, x) => s + x.r, 0) },
    ...(!missingAllocations ? { sizedOrders } : {}) };
  return { raw, data };
}


// Explicit frozen policy provenance; tags alone cannot prove which Base rules ran.
function auditFixture(raw, data, options = {}) {
  const protocol = { id: raw.study.id, source: { sha256: raw.study.sourceSha256 },
    feed: { sha256: raw.study.feedSha256 }, symbols: raw.symbols,
    window: { tradeStartT: raw.window.startT, endT: raw.window.endT },
    actualSettings: { cost: .0015, live: { maxPositionX: .75, maxExposureX: 7 }, grid: { baseRanges: true, allSets: false } }, actualWf: { causalBase: true } };
  return auditSessionStudy(raw, data, { protocol, ...options });
}

describe('frozen session independent audit', () => {
  it('keeps funded unit PF, weighted cash, cohorts, directions and every hour separate', () => {
    const { raw, data } = fixture();
    const a = auditFixture(raw, data);
    assert.equal(a.checksOk, true);
    assert.equal(a.total.closes, 3);
    assert.equal(a.total.entryGroups, 3);
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

  it('counts same-onset protection copies separately from distinct entry events', () => {
    const { raw, data } = fixture();
    for (const rows of [raw.trades, data.sizedOrders]) {
      Object.assign(rows[1], { sym: rows[0].sym, side: rows[0].side, entryT: rows[0].entryT, exitT: rows[0].exitT });
    }
    const a = auditFixture(raw, data);
    assert.equal(a.checksOk, true);
    assert.equal(a.total.closes, 3);
    assert.equal(a.total.entryGroups, 2);
    assert.equal(a.cohorts.find((x) => x.key === 'Engine').entryGroups, 1);
    assert.match(renderSessionStudyAudit(a), /do not establish statistical independence/);
  });

  it('never treats zero allocations as funded performance or permits duplicate allocation joins', () => {
    const { raw, data } = fixture();
    data.sizedOrders[0].allocatedNotional = 0; data.sizedOrders[0].unitNotional = 0; data.sizedOrders[0].sizedPnl = 0;
    Object.assign(data.total, { fundedOrders: 2, gpR: .005, glR: .01, net: -.005 });
    const a = auditFixture(raw, data);
    assert.equal(a.total.closes, 2); assert.equal(a.total.exactPf, .5); assert.equal(a.account.zeroAllocations, 1);
    assert.equal(a.checksOk, true);
    data.sizedOrders[1].closeIndex = 0;
    assert.throws(() => auditFixture(raw, data), /identity.*mismatched/);
  });

  it('preserves missing unit or allocation evidence as unknown and prevents pruning', () => {
    const unknown = fixture({ unknownUnit: true });
    const a = auditFixture(unknown.raw, unknown.data, { purpose: 'selection' });
    assert.equal(a.total.state, 'unknown'); assert.equal(a.total.exactPf, null); assert.equal(a.total.closes, 3);
    assert.equal(a.checksOk, false); assert.equal(a.pruning.assessmentAllowed, false);
    const missing = fixture({ missingAllocations: true });
    const b = auditFixture(missing.raw, missing.data, { purpose: 'selection' });
    assert.equal(b.total.state, 'unknown'); assert.equal(b.total.closes, null);
    assert.equal(b.checksOk, false); assert.equal(b.provenance.missingAllocationRows, true);
  });

  it('cannot use a passing sibling Base range to certify a tagged executed protection', () => {
    const { raw, data } = fixture();
    raw.basePairs[0].tags = ['mn'];
    const wrongRange = auditFixture(raw, data);
    assert.equal(wrongRange.eligibility.base.fundedEngineMembership.passed, 2);
    assert.equal(wrongRange.eligibility.base.fundedEngineMembership.taggedRangesFailed, 2);
    assert.equal(wrongRange.checksOk, false);
    delete raw.basePairs[0].tags;
    const missing = auditFixture(raw, data);
    assert.equal(missing.eligibility.base.fundedEngineMembership.taggedRangesUnknown, 2);
    assert.equal(missing.checksOk, false);
  });

  it('rejects invented funding and mismatched volume without scoring those wins', () => {
    for (const mutate of [
      (a) => { a.unitNotional = 0; a.sizedPnl = 0; },
      (a) => { a.allocatedNotional = 2; },
      (a) => { a.unitNotional = -1; },
      (_a, tr) => { tr.vol = 0; },
    ]) {
      const { raw, data } = fixture();
      mutate(data.sizedOrders[0], raw.trades[0]);
      const a = auditFixture(raw, data);
      assert.equal(a.checksOk, false);
      assert.equal(a.total.state, 'unknown');
      assert.equal(a.total.exactPf, null);
      assert.equal(a.pruning.assessmentAllowed, false);
    }
  });

  it('rejects changed report caps, cost and contradictory persisted unit returns', () => {
    for (const mutate of [
      (_raw, data) => { data.total.caps.maxExposureX = 0; },
      (_raw, data) => { data.total.caps.on = false; },
      (raw) => { raw.settings.live.maxPositionX = 0; },
      (raw) => { raw.settings.cost = .002; },
      (raw, data) => { raw.trades[0].unitR = .04; data.sizedOrders[0].unitR = .04; data.total.gpR += .02; },
    ]) {
      const { raw, data } = fixture(); mutate(raw, data);
      const a = auditFixture(raw, data);
      assert.equal(a.checksOk, false);
      assert.equal(a.pruning.assessmentAllowed, false);
    }
  });

  it('fails certification for missing telemetry, coverage, report checks or causal range policy', () => {
    for (const mutate of [
      (raw) => { raw.engine.universe = raw.symbols.slice(1); },
      (raw) => { delete raw.engine.mem.aborts; },
      (raw) => { raw.engine.mem.fallback = 1; },
      (raw) => { raw.engine.coverage.evaluated--; },
      (_raw, data) => { data.checksOk = false; },
    ]) {
      const { raw, data } = fixture(); mutate(raw, data);
      const a = auditFixture(raw, data, { purpose: 'selection' });
      assert.equal(a.checksOk, false);
      assert.equal(a.pruning.assessmentAllowed, false);
    }
    const { raw, data } = fixture();
    assert.equal(auditSessionStudy(raw, data).checksOk, false);
    for (const policy of [
      { actualSettings: { grid: { baseRanges: false, allSets: false } }, actualWf: { causalBase: true } },
      { actualSettings: { grid: { baseRanges: true, allSets: true } }, actualWf: { causalBase: true } },
      { actualSettings: { grid: { baseRanges: true, allSets: false } }, actualWf: { causalBase: false } },
    ]) assert.equal(auditFixture(raw, data, { protocol: policy }).checksOk, false);
  });

  it('proposes only adequately sampled persistent losing cells after the completed 22x24 selection audit', () => {
    const { raw, data } = fixture({ n: 60, allLosing: true });
    const dev = auditFixture(raw, data, { purpose: 'development' });
    assert.equal(dev.pruning.candidates.length, 0);
    const selection = auditFixture(raw, data, { purpose: 'selection' });
    assert.equal(selection.checksOk, true); assert.equal(selection.pruning.assessmentAllowed, true);
    assert.equal(selection.pruning.candidates.length, 1);
    assert.equal(selection.pruning.candidates[0].closes, 60); assert.equal(selection.pruning.candidates[0].symbols, 3);
    const thin = fixture({ n: 49, allLosing: true });
    assert.equal(auditFixture(thin.raw, thin.data, { purpose: 'selection' }).pruning.candidates.length, 0);
    data.study = { ...data.study, sourceSha256: 'different' };
    assert.equal(auditFixture(raw, data, { purpose: 'selection' }).pruning.candidates.length, 0);
  });
});
