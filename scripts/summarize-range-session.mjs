// Compact evidence from a completed native replay; no strategy scoring or parameter changes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { readFundedSession } from './lib/session-funded-cohort.mjs';
import { readSessionDump, iterateSessionValidation, iterateSessionTapeTrades } from './lib/session-dump.mjs';
import { positionOrderCounts, positionOrderLedger } from '../src/core/positions.ts';
import { kindOfId, parseConfigId } from '../src/core/pipeline/pipeline.ts';
import { rangeOfId, RANGE_LABEL } from '../src/core/minimal-coord.ts';
import { modeledUnitReturn, settledHourT } from '../src/core/metrics/stats.ts';

const dir = process.argv[2], report = process.argv[3] ?? `${dir}/corrected-report/data.json`;
assert.ok(dir, 'SESSION_DIR [REPORT_JSON]');
const { raw, book, trades, funding } = await readFundedSession(`${dir}/raw.json`, report);
const allocations = await readSessionDump(report, { fields: ['sizedOpenOrders'] });
assert.ok(Array.isArray(allocations.sizedOpenOrders) || book.total.fundedCounts.openOrders === 0, 'Missing open allocation evidence');
const open = (allocations.sizedOpenOrders ?? []).filter(x => x.allocatedNotional > 1e-9);
assert.equal(open.length, book.total.fundedCounts.openOrders);
const typeOfCfg = cfg => kindOfId(cfg) === 'exit' ? `exit:${parseConfigId(cfg)?.protect.exitSet ?? 'historic'}` : kindOfId(cfg);
const range = cfg => kindOfId(cfg) === 'exit' ? 'Exit' : cfg.includes('|sig-') ? 'Signals' : RANGE_LABEL[rangeOfId(cfg)];
const counts = (closed, held) => positionOrderCounts(closed, held);
assert.deepEqual(counts(trades, open), Object.fromEntries(Object.entries(book.total.fundedCounts).filter(([k]) => k !== 'basis')));
const stat = rows => {
  let gp = 0, gl = 0;
  for (const x of rows) { const r = modeledUnitReturn(x); assert.ok(Number.isFinite(r)); gp += Math.max(0, r); gl += Math.max(0, -r); }
  return { closes: rows.length, gp, gl, pf: gl ? gp / gl : null, pfState: !rows.length ? 'empty' : !gl ? 'no-loss' : 'measured' };
};
const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`));
const coverage = new Map(), configCoverage = new Map();
let initial;
for await (const step of iterateSessionValidation(`${dir}/raw.json`)) {
  if (initial) break;
  initial = step.t;
  for (const [cfg, passed] of step.checks) {
    const key = `${range(cfg)}|${typeOfCfg(cfg)}`;
    const row = coverage.get(key) ?? { range: range(cfg), type: typeOfCfg(cfg), evaluated: 0, passed: 0, sampleAtLeast4: 0, anyContextAtLeast4: 0, exactContextsAtLeast4: 0, exactContexts: 0, unknownHistory: 0 };
    const side = parseConfigId(cfg)?.protect.exitSide;
    const contextSides = side === 1 || side === -1 ? [side] : [1, -1];
    row.exactContexts += protocol.symbols.length * contextSides.length;
    row.evaluated++; row.passed += +passed; coverage.set(key, row); configCoverage.set(cfg, { row, contextSides, seen: false });
  }
}
// Failed gate checks can short-circuit before reporting n. Count the archived scalar
// historical closes instead of treating that absent sample as zero.
const fromT = Math.max(protocol.window.evaluationFromT, initial - protocol.actualWf.longH * 3600000);
for await (const { id: cfg, trades: rows } of iterateSessionTapeTrades(`${dir}/raw.json`)) {
  const entry = configCoverage.get(cfg);
  if (!entry) continue;
  assert.equal(entry.seen, false, 'Duplicate scalar history');
  entry.seen = true;
  const history = rows.filter(x => x[3] >= fromT && x[3] < initial);
  entry.row.sampleAtLeast4 += +(history.length >= 4);
  const contexts = new Map();
  for (const x of history) {
    assert.ok(protocol.symbols.includes(x[0]) && entry.contextSides.includes(x[1]));
    const key = `${x[0]}|${x[1]}`; contexts.set(key, (contexts.get(key) ?? 0) + 1);
  }
  const enough = [...contexts.values()].filter(n => n >= 4).length;
  entry.row.exactContextsAtLeast4 += enough; entry.row.anyContextAtLeast4 += +(enough > 0);
}
for (const entry of configCoverage.values()) if (!entry.seen) entry.row.unknownHistory++;
const names = [...new Set([...trades, ...open].map(x => range(x.cfg)))];
const ranges = names.map(name => {
  const closed = trades.filter(x => range(x.cfg) === name), held = open.filter(x => range(x.cfg) === name);
  const ledger = positionOrderLedger(closed, held, raw.window.startT, raw.window.endT, 3600000);
  return { range: name, ...counts(closed, held), ...stat(closed),
    executedConfigs: new Set([...closed, ...held].map(x => x.cfg)).size,
    sources: new Set([...closed, ...held].map(x => x.cfg.split('|')[1])).size,
    protection: (() => {
      const parsed = [...new Set([...closed, ...held].map(x => x.cfg))].map(id => parseConfigId(id));
      assert.ok(parsed.every(Boolean), 'Unparsed executed configuration');
      const ps = parsed.map(x => x.protect), trails = ps.filter(x => x.trail > 0), targets = ps.filter(x => x.tp > 0);
      return { scope: 'Executed config identities including endpoint holdings; distances are configured fractions of price',
        minTp: targets.length ? targets.reduce((n, x) => Math.min(n, x.tp), Infinity) : null,
        maxSl: ps.length ? ps.reduce((n, x) => Math.max(n, x.sl), -Infinity) : null,
        maxSlToTp: targets.length ? targets.reduce((n, x) => Math.max(n, x.sl / x.tp), -Infinity) : null,
        minTrail: trails.length ? trails.reduce((n, x) => Math.min(n, x.trail), Infinity) : null };
    })(),
    symbols: new Set([...closed, ...held].map(x => x.sym)).size,
    types: [...new Set([...closed, ...held].map(x => typeOfCfg(x.cfg)))].map(type => {
      const a = closed.filter(x => typeOfCfg(x.cfg) === type), b = held.filter(x => typeOfCfg(x.cfg) === type);
      return { type, ...counts(a, b), ...stat(a) };
    }),
    hours: ledger.map((row, i) => ({ ...row, ...stat(closed.filter(x => settledHourT(x.exitT) === raw.window.startT + i * 3600000)) })),
    reported: book.ranges.find(x => x.key === name),
  };
});
const result = { schema: 'cts-range-detail-v1', sourceSha256: protocol.source.sha256,
  requestedRange: protocol.range, window: protocol.window, symbols: protocol.symbols,
  runSeconds: raw.runSeconds, computeMs: raw.engine.computeMs, peakRssMb: raw.engine.rssMaxMb, memory: raw.engine.mem, phases: raw.engine.phases, eventLoop: raw.engine.loop, funding, total: book.total,
  ranges, coverage: [...coverage.values()].map(x => ({ ...x, sampleAtLeast4Pct: 100 * x.sampleAtLeast4 / x.evaluated, anyContextAtLeast4Pct: 100 * x.anyContextAtLeast4 / x.evaluated, exactContextsAtLeast4Pct: 100 * x.exactContextsAtLeast4 / x.exactContexts })),
  coverageScope: 'Archived scalar closes in the initial 12h post-Base validation window; Pooled, any-context and exact config × symbol × direction Last-4 availability; exact denominator includes all configured symbols and eligible sides (side-specific Exit IDs exclude the opposite side). This is sample availability, not passing PF or a replacement for configured gates. Missing histories remain unknown.',
  base: { evaluated: raw.engine.baseEvaluated, passed: raw.engine.basePassed, ranges: raw.engine.baseByRange },
  configEval: book.evalStats, checks: book.checks, checksOk: book.checksOk,
  originalChecks: JSON.parse(readFileSync(`${dir}/report/data.json`)).checks,
  heatRangeCorrections: book.heat?.exitRangeCorrections ?? 0,
  hours: book.hours,
};
writeFileSync(process.argv[4] ?? `${dir}/details.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ range: result.requestedRange, checksOk: result.checksOk, counts: book.total.fundedCounts, pf: book.total.pf }));
