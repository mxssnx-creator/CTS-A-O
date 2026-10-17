// Exercise each real evaluation CLI with a tiny recorded-session child. The same
// closed losses and endpoint marks must survive both storage formats.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const dumpModule = new URL('./lib/session-dump.mjs', import.meta.url).href;
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cts-eval-sidecar-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const feed = join(dir, 'feed.json'), session = join(dir, 'session.mjs'), admission = join(dir, 'admission.cjs');
  // These children only write a tiny recorded fixture. Keep this loader test
  // independent of current host pressure; mem-admission.test verifies real gates.
  writeFileSync(admission, `const fs=require('node:fs'),read=fs.readFileSync;
fs.readFileSync=function(path,...args){
if(path==='/proc/meminfo')return 'MemAvailable: 33554432 kB\\n';
if(path==='/proc/self/cgroup')return '';
return read.call(this,path,...args);};require('node:module').syncBuiltinESMExports();`);
  writeFileSync(feed, JSON.stringify({ tickers: [], candles: { 'TEST-USDT|1': [{ t: Date.parse('2026-09-01T00:00:00Z'), o: 100 }] } }));
  writeFileSync(session, `import {writeFile} from 'node:fs/promises';
import {writeSessionDump} from ${JSON.stringify(dumpModule)};
const arg=k=>process.argv[process.argv.indexOf('--'+k)+1], H=3600000;
const endT=Date.parse(arg('end-at')),startT=endT-Number(arg('run'))*H;
const cfg='follow|ema-21-55@m15|tp1|sl2|tr0|h64|sh';
const trades=[{cfg,sym:'TEST-USDT',side:1,entryT:startT+60000,exitT:startT+120000,entry:100,exit:102.2,r:.04,mult:2,vol:2,reason:'tp',kind:'normal'},
{cfg,sym:'TEST-USDT',side:-1,entryT:startT+H+60000,exitT:startT+H+120000,entry:100,exit:100.8,r:-.01,mult:1,vol:1,reason:'sl',kind:'normal'}];
const raw={settings:{cost:.002},window:{startT,endT},trades,
openEnd:[{cfg,sym:'TEST-USDT',side:-1,entryT:endT-60000,entry:100,mtmR:-.005,mult:1,vol:1}],
basePairs:[{pair:'follow|ema-21-55@m15',passed:true,tags:['sh'],pf:2,n:20}],engine:{mem:{computeLevel:0},baseByRange:[],baseWhy:[]},funnel:{counts:null},
tapeTrades:[{id:cfg,trades:trades.map(x=>[x.sym,x.side,x.entryT,x.exitT,x.r/x.mult])}],
validation:[{t:startT,real:[cfg],checks:[[cfg,1,20,2,.02,.01]]}]};
if(process.env.CTS_CONSUMER_CHUNKED==='1') await writeSessionDump(arg('dump'),raw,{maxChunkBytes:1024,arrayFields:['trades']});
else await writeFile(arg('dump'),JSON.stringify(raw));
`);
  return { dir, feed, session, admission };
}
function run(f, script, args, chunked) {
  const out = spawnSync(process.execPath, ['--require', f.admission, '--experimental-strip-types', '--no-warnings', join(here, script), ...args], {
    cwd: f.dir, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, CTS_EVAL_SESSION: f.session, CTS_CONSUMER_CHUNKED: chunked ? '1' : '0', CTS_EVAL_RESERVE_MB: '0', CTS_EVAL_KILL_BELOW_MB: '0' },
  });
  assert.equal(out.status, 0, out.stderr + out.stdout);
  return out;
}

test('eval-gate reads flat and chunked session cohorts with identical losses, marks, and PF', (t) => {
  const outputs = [];
  for (const chunked of [false, true]) {
    const f = fixture(t);
    run(f, 'eval-gate.mjs', ['--label', 'cohort', '--feed', f.feed, '--jobs', '1', '--expect-mb', '1', '--from', '2026-10-01T00:00:00Z', '--to', '2026-10-01T02:00:00Z'], chunked);
    const out = JSON.parse(readFileSync(join(f.dir, 'runs/eval/gate/cohort.json'), 'utf8'));
    assert.equal(out.trades.length, 3);
    assert.deepEqual(out.trades.map(x => x.r), [.02, -.01, -.005]);
    assert.ok(Math.abs(out.summary.pf.d1 - 4 / 3) < 1e-12);
    assert.equal(out.windows[0].openAtEnd, 1);
    assert.deepEqual(readdirSync(join(f.dir, 'runs/eval/gate/dumps')), [], 'temporary chunks must be cleaned with their header');
    outputs.push(out.trades);
  }
  assert.deepEqual(outputs[0], outputs[1]);
});

test('eval-families reads every flat/chunked window and retains endpoint losses', (t) => {
  const outputs = [];
  for (const chunked of [false, true]) {
    const f = fixture(t);
    run(f, 'eval-families.mjs', ['--only', 'eng follow sh', '--limit', '1', '--jobs', '1', '--feed', f.feed], chunked);
    const out = JSON.parse(readFileSync(join(f.dir, 'runs/eval/eng_follow_sh.json'), 'utf8'));
    assert.equal(out.trades, 15);
    assert.equal(out.primary.n, 15);
    assert.ok(Math.abs(out.primary.pf - 4 / 3) < 1e-12);
    assert.equal(out.rows.filter(x => x[8] === 'open-end').length, 5);
    assert.equal(out.rows.filter(x => x[7] < 0).length, 10);
    assert.deepEqual(readdirSync(join(f.dir, 'runs/eval/dumps')), []);
    outputs.push(out.rows);
  }
  assert.deepEqual(outputs[0], outputs[1]);
});

test('positive-types actual CLI reports the same two settled trades from flat/chunked dumps', (t) => {
  const outputs = [];
  for (const chunked of [false, true]) {
    const f = fixture(t);
    mkdirSync(join(f.dir, 'runs/eval'), { recursive: true });
    writeFileSync(join(f.dir, 'runs/eval/family.json'), JSON.stringify({ label: 'eng follow sh', stress: { available: true }, pfBasis: 'unit-net-returns', stats: { pf02: 2, trades: 100 } }));
    run(f, 'sim-positive-types.mjs', ['--feed', f.feed, '--end-at', '2026-10-01T02:00:00Z', '--run', '2', '--out', join(f.dir, 'report')], chunked);
    const text = readFileSync(join(f.dir, 'report/README.md'), 'utf8').replace(/wall \d+ s/g, 'wall TIME s');
    assert.match(text, /2 settled trades/);
    assert.match(text, /return PF 2\.00/);
    outputs.push(text.replace(/Generated .*? · /, 'Generated DATE · '));
  }
  assert.equal(outputs[0], outputs[1]);
});
