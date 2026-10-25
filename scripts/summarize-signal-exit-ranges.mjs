import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseConfigId } from '../src/core/pipeline/pipeline.ts';
import { laneOf } from '../src/core/indications/registry.ts';

const root = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
mkdirSync(out, { recursive: true });
const paths = [
  ['original control', 'docs/signals-own-grid-150h-20261024/receipts/last4'],
  ...['expanded-original', 'control-later', 'expanded-later'].map(id => [id, resolve(root, id)]),
];
const pfText = s => !s.n ? '–' : s.gl > 0 ? (s.gp / s.gl).toFixed(6) : s.gp > 0 ? 'No losses' : 'Flat';
const cases = paths.map(([id, dir]) => {
  const read = file => JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
  const c = read('coverage.json'), p = read('protocol.json'), x = read('execution-contexts.json');
  assert.equal(c.ok, true, `${id}: incomplete coverage`);
  assert.equal(c.exactTape.ok, true);
  assert.equal(c.account.unknownAllocations, 0);
  const exit = c.groups.find(g => g.dimension === 'strategyRange' && g.label === 'Exit');
  assert.ok(exit, `${id}: missing Exit group`);
  const groups = new Map();
  for (const row of x.rows.filter(r => r.kind === 'exit')) {
    const cfg = parseConfigId(row.cfg); assert.ok(cfg);
    const horizon = cfg.protect.hold * (laneOf(cfg.ind).tf ?? 15) / 60;
    for (const [dimension, key] of [['tactic', cfg.protect.exitSet ?? 'legacy'], ['horizon', `${horizon}h`]]) {
      const k = `${dimension}:${key}`;
      if (!groups.has(k)) groups.set(k, { dimension, key, n: 0, opened: 0, held: 0, gp: 0, gl: 0, configs: new Set() });
      const g = groups.get(k); g.n += row.fundedSettled; g.opened += row.fundedOpened;
      g.held += row.fundedOpen; g.gp += row.unitGp; g.gl += row.unitGl; g.configs.add(row.cfg);
    }
  }
  return { id, source: c.sourceSha256, window: c.window, settings: p.actualSettings.exitStrategy,
    exit, account: c.account, audit: c.audit, catalog: c.catalog,
    groups: [...groups.values()].map(g => ({ ...g, configs: g.configs.size, pf: pfText(g) })) };
});
writeFileSync(resolve(out, 'summary.json'), JSON.stringify({ cases }, null, 2) + '\n');
const lines = ['# Signal Exit range comparison', '',
  'Retrospective funded modeled execution after causal Base/holdout/Last-N gates. Larger configuration counts are correlated observations, not independent market trials. Original stops, Signal ceiling and fees remain unchanged.', '',
  '| Case | Exit configs | Positions opened / closed / held | Orders opened / settled / held | Exit PF | Whole-account PF | Equity loss drawdown |',
  '|---|---:|---:|---:|---:|---:|---:|'];
for (const c of cases) {
  const e = c.exit.execution, n = e.counts;
  lines.push(`| ${c.id} | ${c.exit.configs} | ${n.openedPositions} / ${n.closedPositions} / ${n.openPositions} | ${n.openedOrders} / ${n.settledOrders} / ${n.openOrders} | ${pfText(e)} | ${c.account.pf ?? '–'} | ${(c.account.equityMaxDdPct * 100).toFixed(4)}% |`);
}
for (const c of cases) {
  lines.push('', `## ${c.id}`, '', '| Group | Executed configs | Opened / settled / held orders | Unit PF |', '|---|---:|---:|---:|');
  for (const g of c.groups) lines.push(`| ${g.dimension}: ${g.key} | ${g.configs} | ${g.opened} / ${g.n} / ${g.held} | ${g.pf} |`);
  lines.push('', `Independent scalar comparisons: ${c.audit.comparisons.toLocaleString('en-US')}; all completed coverage audits passed.`);
}
writeFileSync(resolve(out, 'README.md'), lines.join('\n') + '\n');
console.log(JSON.stringify(cases.map(c => ({ id: c.id, exitPf: pfText(c.exit.execution), counts: c.exit.execution.counts }))));
