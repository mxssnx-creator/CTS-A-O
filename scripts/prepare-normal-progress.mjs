// Freeze broad ordinary processing before scoring; this never changes live/default settings.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DEFAULT_SETTINGS } from '../src/core/config.ts';
import { allCombos } from '../src/core/pipeline/pipeline.ts';
import { INDICATION_BY_ID, laneOf } from '../src/core/indications/registry.ts';
import { INDICATION_KINDS } from '../src/core/domain/types.ts';
import { CoreRuntime } from '../src/core/server/runtime.server.ts';
import { CoreDb } from '../src/core/server/db.server.ts';
import { sessionStudySourceFiles, studySha256, studyExactJson, studyCanonical } from './lib/session-study.mjs';
process.env.CTS_CORE_STATE = 'off'; process.env.CTS_CORE_AUTOSTART = '0'; process.env.CTS_CORE_LIVE = '0';
const root = resolve(process.argv[2] ?? 'runs/normal-progress-20261025');
const family = process.argv[3] ?? 'all';
const holdMin = Number(process.argv[4] ?? 0), offsetH = Number(process.argv[5] ?? 0);
assert.ok([0,15,30,60].includes(holdMin) && [0,12].includes(offsetH));
assert.ok(family === 'all' || INDICATION_KINDS.includes(family));
assert.ok(!existsSync(resolve(root, 'protocol.json')), 'Preserve prior attempts');
const ref = JSON.parse(readFileSync('docs/signals-own-grid-150h-20261024/receipts/last4/protocol.json'));
for (const key of ['evaluationFromT','tradeStartT','endT']) ref.window[key] += offsetH*3_600_000;
ref.liveSinceT=ref.window.tradeStartT;
const seed = structuredClone(DEFAULT_SETTINGS);
Object.assign(seed, { symbols: 12, forceSymbols: ref.symbols, symbolRank: 'market', focus: [], pinned: [],
  disabledKinds: family === 'all' ? [] : INDICATION_KINDS.filter(x => x !== family),
  historyDays: 8, tfDays: {1:8,5:8,15:8,30:8}, tfs:[1,5,15,30], tfMin:1, paperBalance:10 });
seed.signals.enabled = false; seed.signals.coordination.enabled = false; seed.live.enabled = false;
seed.sizing = {...seed.sizing, mode:'equityPct', pct:0.001};
seed.toggles = Object.fromEntries(Object.keys(seed.toggles).map(k => [k, true]));
seed.exitStrategy = {...seed.exitStrategy, enabled:true, timeframes:[1,5,15,30]};
// Explicit test-only activation of the optional Wide and Minimal Plus grids.
seed.grid.tp = [0.03,0.05,0.08];
if(holdMin) for(const key of ['minimal','short']) seed.grid[key].maxHoldMin=holdMin;
const plus = seed.grid.minimalPlus;
plus.enabled = true;
plus.cells = plus.tp.flatMap(tp => plus.slOfTp.flatMap(k => plus.trailOfTp.map(tr => ({
  tp, sl:+Math.max(plus.minSl,tp*k).toFixed(6), trail:tr ? +Math.max(plus.minTrail,tp*tr).toFixed(6) : 0,
}))));
const make = (settings, wf = {}) => {
  const db = new CoreDb(':memory:');
  const rt = new CoreRuntime(db, {symbols:12,signals:{enabled:false}}, {market:'bingx',replay:true,priceStream:null,
    evaluationFromT:ref.window.evaluationFromT, replayPreloadAll:true,
    feed:{history:async()=>[],klines:async()=>[],tickers:async()=>[]} });
  rt.updateSettings(settings); rt.updateSettings({}, {preH:150,simH:12,...wf,causalBase:true,recordValidation:true});
  rt.wf = {...rt.wf,longH:100};
  const out = {settings:studyCanonical(rt.settings),wf:studyCanonical(rt.wf)};
  rt.dispose(); db.db.close(); return out;
};
const first=make(seed), actual=make(first.settings,first.wf), check=make(actual.settings,actual.wf);
assert.equal(studyExactJson(actual),studyExactJson(check),'Runtime reload drift');
assert.equal(actual.settings.signals.enabled,false);
const combos=allCombos(actual.settings.focus,actual.settings.disabledKinds,actual.settings.tfs);
const inventory={};
for(const c of combos){const k=INDICATION_BY_ID.get(laneOf(c.ind).base)?.kind??'no-indication';inventory[k]=(inventory[k]??0)+1;}
if(family==='all') for(const k of INDICATION_KINDS) assert.ok(inventory[k]>0,`Missing family ${k}`);
const files=sessionStudySourceFiles();
const source={files,sha256:studySha256(studyExactJson(files)),checkpoint:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
const protocol={...ref,id:`normal-progress-${family}-hold${holdMin}-offset${offsetH}`,createdAt:new Date().toISOString(),source,
  actualSettings:actual.settings,actualWf:actual.wf,account:{balance:10,leverage:10,sizing:actual.settings.sizing},
  policy:{scope:'Ordinary only; all ordinary indication families/bots/lanes and protection types enabled, Signals off',family,
    inventory,combos:combos.length,holdMin,offsetH,optionalRanges:'Wide 3/5/8%; Minimal Plus complete configured TP × SL × trailing cells',
    calculation:'Native minute prices, 150h available history, ordinary 100h selection, Exit 150h fitting, 12h trading. Hourly bins are reporting only.',
    gates:'Unchanged production PF, sample, Last-N and risk gates. Base-qualified execution is the primary cohort.',
    evidence:'Retrospective offline model. Isolated-family results, if run, are separate accounts and cannot be summed into a shared account.'}};
mkdirSync(root,{recursive:true});
for(const [name,data]of [['desk.json',actual],['protocol.json',protocol]])writeFileSync(resolve(root,name),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({root,family,combos:combos.length,inventory,sourceSha256:source.sha256}));
