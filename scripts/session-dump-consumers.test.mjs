import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readRangeStudyInputs } from './core-range-study.mjs';
import { causalTapeEvidenceFromFile } from './core-range-study-report.mjs';
import { blockComparisonEvidenceFromFiles } from './core-block-comparison.mjs';
import { rangeStudyEvidence } from './lib/range-study-evidence.mjs';
import { blockComparisonEvidence } from './lib/block-comparison-evidence.mjs';
import { writeSessionDump } from './lib/session-dump.mjs';
import { orderKey } from '../src/core/sizing.ts';

const H = 3_600_000, startT = 10 * H, endT = 16 * H;
const cfg = 'follow|rsi-14@m15|tp1|sl1|tr0|h32|sh';
const meta = { fold: 'development-1', arm: 'cap2', protocolSha256: 'a'.repeat(64), sourceSha256: 'b'.repeat(64) };
function fixture() {
  const trades = [
    { cfg, sym: 'A', side: 1, entryT: startT + 1, exitT: startT + H, r: 0.02, unitR: 0.01, mult: 2, vol: 2, kind: 'normal', reason: 'tp' },
    { cfg, sym: 'B', side: -1, entryT: startT + 2, exitT: startT + 2 * H, r: -0.01, unitR: -0.01, mult: 1, vol: 1, kind: 'normal', reason: 'sl' },
  ];
  const endpoint = { cfg, sym: 'A', side: 1, entryT: endT - H, entry: 100, mtmR: 0.03, unitR: 0.03, mult: 1, vol: 1, kind: 'normal' };
  const raw = {
    window: { startT, endT }, symbols: ['A', 'B'],
    settings: { evaluationFromT: 0, cost: 0.0015, wf: { causalBase: true }, block: { maxMult: 2 }, toggles: { block: true } },
    trades, openEnd: [endpoint],
    validation: [{ t: startT, real: [cfg], checks: [[cfg, 1, 2, 2, 0.02, 0.01]] }],
    tapeTrades: [{ id: cfg, trades: [
      ['A', 1, H, 2 * H, 0.02], ['A', 1, 3 * H, 4 * H, -0.01],
      ...trades.map((x) => [x.sym, x.side, x.entryT, x.exitT, x.unitR]),
    ] }],
    engine: { coverage: { complete: false, sets: [] }, mem: { computeLevel: 0 }, skips: {}, skipsByRange: {}, baseByRange: [], baseWhy: [] },
    stepsByRange: [{ t: startT, byRange: { sh: { tapes: 1, validated: 1, candidates: 2, taken: 2 } } }],
    frozenBlockComparison: { fold: meta.fold, arm: { id: meta.arm }, protocolSha256: meta.protocolSha256, sourceSha256: meta.sourceSha256, builtCatalog: [{ id: cfg, kind: 'normal' }] },
    signalProgress: { configs: [] },
  };
  const book = {
    window: raw.window,
    settings: { balance0: 10, leverage: 10, notional: 2, sizing: { mode: 'equityPct', pct: 0.02 }, caps: { on: true, maxPositionX: 0.75, maxExposureX: 7 } },
    sizedOrders: trades.map((x, closeIndex) => ({ closeIndex, key: orderKey(x), cfg, sym: x.sym, side: x.side, entryT: x.entryT, exitT: x.exitT,
      unitNotional: 2, volume: x.vol, allocatedNotional: 2 * x.vol, sizedReturn: x.r, sizedPnl: 2 * x.r })),
    sizedOpenOrders: [{ key: orderKey(endpoint), cfg, sym: endpoint.sym, side: endpoint.side, entryT: endpoint.entryT,
      unitNotional: 2, allocatedNotional: 2, volume: 1, sizedPnl: 0.06 }], total: { orders: 2, net: 0.02, balanceEnd: 10.02, equityEnd: 10.02, equityMaxDd: 0.02, equityMaxDdPct: 0.002, equityDdtMaxH: 1 },
    checks: [{ name: 'fixture activity', ok: true }], hours: [],
  };
  return { raw, book };
}

it('range and Block file consumers preserve trades, funding, validation and histories for flat and sidecar evidence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cts-session-consumers-'));
  try {
    const original = fixture(), fold = { id: meta.fold, tradeStartT: startT, endT, evaluationFromT: 0 };
    const p = { classification: 'fixture', symbols: original.raw.symbols, gates: { minPf: 1.1 } }, profile = { id: 'P0' };
    const universe = { configurations: [{ id: cfg, protect: { tag: 'sh' } }], settingsVersion: 'fixture', requestedCells: 1 };
    const expectedRange = rangeStudyEvidence(original.raw, original.book, p, fold, profile, universe);
    const expectedBlock = blockComparisonEvidence(original.raw, original.book, meta);
    let causal;
    for (const format of ['flat', 'chunked']) {
      const rawFile = join(dir, `${format}-raw.json`), bookFile = join(dir, `${format}-book.json`);
      if (format === 'flat') {
        await writeFile(rawFile, JSON.stringify(original.raw)); await writeFile(bookFile, JSON.stringify(original.book));
      } else {
        await writeSessionDump(rawFile, original.raw, { arrayFields: ['trades'], maxChunkBytes: 512 });
        await writeSessionDump(bookFile, original.book, { arrayFields: ['sizedOrders', 'sizedOpenOrders'], maxChunkBytes: 512 });
      }
      const input = await readRangeStudyInputs(rawFile, bookFile);
      assert.deepEqual(input.raw.data, original.raw);
      assert.deepEqual(input.book.data, original.book);
      assert.equal(input.raw.sha256, createHash('sha256').update(await readFile(rawFile)).digest('hex'));
      assert.equal(input.book.sha256, createHash('sha256').update(await readFile(bookFile)).digest('hex'));
      const range = rangeStudyEvidence(input.raw.data, input.book.data, p, fold, profile, universe);
      assert.deepEqual(range, expectedRange);
      assert.equal(range.virtualTrades.length, 2); assert.equal(range.fundedTrades.length, 2);
      assert.equal(range.initialValidationRecorded, true);
      assert.equal(range.endpoints.allocations.length, 1);
      assert.equal(range.endpoints.settledPfExcluded, true);
      const report = await causalTapeEvidenceFromFile(rawFile);
      assert.equal(report.raw.validation[0].checks.length, 1);
      assert.equal(report.evidence.shortForwardClosedOpportunities.length, 2);
      if (causal) assert.deepEqual(report.evidence, causal); else causal = report.evidence;
      const block = await blockComparisonEvidenceFromFiles(rawFile, bookFile, meta);
      assert.deepEqual(block, expectedBlock);
      assert.equal(block.total.n, 2); assert.equal(block.total.ownedCloses, 2); assert.equal(block.total.pf, 1);
      assert.equal(block.endpoints.allocations.length, 1);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
