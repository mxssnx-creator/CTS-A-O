// Compact evidence from a completed native replay; no strategy scoring or parameter changes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { readFundedSession } from './lib/session-funded-cohort.mjs';
import { readSessionDump, iterateSessionValidation } from './lib/session-dump.mjs';
import { positionOrderCounts, positionOrderLedger } from '../src/core/positions.ts';
import { kindOfId } from '../src/core/pipeline/pipeline.ts';
import { rangeOfId, RANGE_LABEL } from '../src/core/minimal-coord.ts';
import { modeledUnitReturn, settledHourT } from '../src/core/metrics/stats.ts';

const dir = process.argv[2], report = process.argv[3] ?? `${dir}/corrected-report/data.json`;
assert.ok(dir, 'SESSION_DIR [REPORT_JSON]');
const { raw, book, trades, funding } = await readFundedSession(`${dir}/raw.json`, report);
const allocations = await readSessionDump(`${dir}/report/data.json`, { fields: ['sizedOpenOrders'] });
assert.ok(Array.isArray(allocations.sizedOpenOrders) || book.total.fundedCounts.openOrders === 0, 'Missing open allocation evidence');
const open = (allocations.sizedOpenOrders ?? []).filter(x => x.allocatedNotional > 1e-9);
assert.equal(open.length, book.total.fundedCounts.openOrders);
const range = cfg => kindOfId(cfg) === 'exit' ? 'Exit' : cfg.includes('|sig-') ? 'Signals' : RANGE_LABEL[rangeOfId(cfg)];
const counts = (closed, held) => positionOrderCounts(closed, held);
assert.deepEqual(counts(trades, open), Object.fromEntries(Object.entries(book.total.fundedCounts).filter(([k]) => k !== 'basis')));
const stat = rows => {
  let gp = 0, gl = 0;
  for (const x of rows) { const r = modeledUnitReturn(x); assert.ok(Number.isFinite(r)); gp += Math.max(0, r); gl += Math.max(0, -r); }
  return { closes: rows.length, gp, gl, pf: gl ? gp / gl : null, pfState: !rows.length ? 'empty' : !gl ? 'no-loss' : 'measured' };
};
const coverage = new Map();
let initial;
for await (const step of iterateSessionValidation(`${dir}/raw.json`)) {
  if (initial) break;
  initial = step.t;
  for (const [cfg, passed, n] of step.checks) {
    const key = `${range(cfg)}|${kindOfId(cfg)}`;
    const row = coverage.get(key) ?? { range: range(cfg), type: kindOfId(cfg), evaluated: 0, passed: 0, sampleAtLeast4: 0 };
    row.evaluated++; row.passed += +passed; row.sampleAtLeast4 += +(n >= 4); coverage.set(key, row);
  }
}
const names = [...new Set([...trades, ...open].map(x => range(x.cfg)))];
const ranges = names.map(name => {
  const closed = trades.filter(x => range(x.cfg) === name), held = open.filter(x => range(x.cfg) === name);
  const ledger = positionOrderLedger(closed, held, raw.window.startT, raw.window.endT, 3600000);
  return { range: name, ...counts(closed, held), ...stat(closed),
    executedConfigs: new Set([...closed, ...held].map(x => x.cfg)).size,
    symbols: new Set([...closed, ...held].map(x => x.sym)).size,
    types: [...new Set([...closed, ...held].map(x => kindOfId(x.cfg)))].map(type => {
      const a = closed.filter(x => kindOfId(x.cfg) === type), b = held.filter(x => kindOfId(x.cfg) === type);
      return { type, ...counts(a, b), ...stat(a) };
    }),
    hours: ledger.map((row, i) => ({ ...row, ...stat(closed.filter(x => settledHourT(x.exitT) === raw.window.startT + i * 3600000)) })),
    reported: book.ranges.find(x => x.key === name),
  };
});
const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`));
const result = { schema: 'cts-range-detail-v1', sourceSha256: protocol.source.sha256,
  requestedRange: protocol.range, window: protocol.window, symbols: protocol.symbols,
  runSeconds: raw.runSeconds, computeMs: raw.engine.computeMs, funding, total: book.total,
  ranges, coverage: [...coverage.values()].map(x => ({ ...x, sampleAtLeast4Pct: 100 * x.sampleAtLeast4 / x.evaluated })),
  coverageScope: 'Initial post-Base config validation sample; Last-4 availability diagnostic, not exact symbol/direction readiness or a replacement for configured gates.',
  base: { evaluated: raw.engine.baseEvaluated, passed: raw.engine.basePassed, ranges: raw.engine.baseByRange },
  configEval: book.evalStats, checks: book.checks, checksOk: book.checksOk,
  originalChecks: JSON.parse(readFileSync(`${dir}/report/data.json`)).checks,
  heatRangeCorrections: book.heat?.exitRangeCorrections ?? 0,
  hours: book.hours,
};
writeFileSync(`${dir}/details.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ range: result.requestedRange, checksOk: result.checksOk, counts: book.total.fundedCounts, pf: book.total.pf }));
