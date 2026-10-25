// Compare frozen Signal studies without mistaking a different sample for a PF regression.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function compareSignalRegression(before, after) {
  const checks = [];
  const check = (name, a, b) => {
    try {
      assert.notEqual(a, undefined, `Missing baseline ${name}`);
      assert.notEqual(b, undefined, `Missing replay ${name}`);
      assert.deepStrictEqual(b, a);
      checks.push({ name, ok: true });
    } catch {
      checks.push({ name, ok: false });
    }
  };
  for (const key of ['actualSettings', 'actualWf', 'window', 'symbols', 'feed'])
    check(`protocol.${key}`, before.protocol[key], after.protocol[key]);
  for (const key of ['window', 'symbols', 'catalog', 'hourly', 'groups', 'funding', 'settled',
    'ledger', 'account', 'entrySelection', 'exactTape', 'reportChecks'])
    check(`coverage.${key}`, before.coverage[key], after.coverage[key]);
  check('coverage.ok', true, after.coverage.ok);
  check('baseline.coverage.ok', true, before.coverage.ok);
  check('audit.comparisons', before.coverage.audit?.comparisons, after.coverage.audit?.comparisons);
  for (const key of ['basis', 'allBuiltConfigs', 'zeroExecutionConfigs', 'rows'])
    check(`execution.${key}`, before.execution[key], after.execution[key]);
  for (const key of ['ok', 'scope', 'total', 'reasons', 'examples'])
    check(`admission.${key}`, before.admission[key], after.admission[key]);
  return {
    schema: 'cts-signal-regression-v1', ok: checks.every(c => c.ok), checks,
    baselineSource: before.coverage.sourceSha256, replaySource: after.coverage.sourceSha256,
    scope: 'Identical frozen inputs; exact catalog, hourly gates, funded counts/returns, config execution and admission. Timing and source hashes are reported separately.',
    baseline: { account: before.coverage.account, engine: before.coverage.engine, audit: before.coverage.audit },
    replay: { account: after.coverage.account, engine: after.coverage.engine, audit: after.coverage.audit },
  };
}

function readCase(dir) {
  const read = file => JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
  return { protocol: read('protocol.json'), coverage: read('coverage.json'),
    execution: read('execution-contexts.json'), admission: read('admission-trace.json') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [before, after, output] = process.argv.slice(2);
  assert.ok(before && after && output, 'Usage: compare-signal-regression.mjs BEFORE_DIR AFTER_DIR OUTPUT_JSON');
  const report = compareSignalRegression(readCase(before), readCase(after));
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, checks: report.checks.length, failures: report.checks.filter(c => !c.ok) }));
  if (!report.ok) process.exitCode = 1;
}
