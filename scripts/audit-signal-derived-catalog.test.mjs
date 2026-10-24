import assert from 'node:assert/strict';
import {it} from 'node:test';
import {signalDerivedCatalog,auditSignalDerivedCatalog} from './audit-signal-derived-catalog.mjs';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DEFAULT_SETTINGS} from '../src/core/config.ts';
import {defaultWalkForward,buildTapes} from '../src/core/sim/walkforward.ts';
import {signalSettings} from '../src/core/signal-config.ts';
import {signalCombos} from '../src/core/signals.ts';
import {makeUniverse} from '../src/core/pipeline/pipeline.ts';
import {barsFromCandles,syntheticCandles} from '../src/core/market/bars.ts';
import {signalCoordinationProtects} from '../src/core/server/runtime.server.ts';
it('matches every enabled ladder build identity/protection across source and coordinator lanes',()=>{
  for(const tf of [1,15]){
    const sig=signalSettings({sourcesMode:'allow',sources:{'ema-cross':true,'rsi-reversal':true,'macd-cross':true},ranges:{short:true,medium:false},lanes:[tf],hist:{enabled:false},strategies:{dca:true,axis:true}});
    const settings={...DEFAULT_SETTINGS,signals:sig,tfs:[tf]},wf=defaultWalkForward(settings);
    const expected=[...signalDerivedCatalog({settings,wf})];
    const u=makeUniverse([barsFromCandles('TEST-USDT',tf,syntheticCandles('TEST-USDT',tf,400,200*3600000))]);
    const combos=signalCombos(sig,[tf]);
    for(const c of [combos[0],combos.find(x=>x.ind.includes('sig-coord-'))]){
      assert.ok(c);
      const refs=c.ind.includes('sig-coord-')?signalCoordinationProtects(settings.grid,settings.cost,sig.coordination.ranges,sig):wf.dcaProtects;
      const actual=buildTapes(u,[],settings.cost,{protects:refs,dca:wf.dca,axis:settings.axis},new Set([`${c.bot}|${c.ind}`]),null,null,{minSl:sig.minSl,minTrail:sig.minTrail,signalTrailMax:sig.trailMax});
      assert.deepEqual(new Map(expected.filter(r=>r.ind===c.ind).map(r=>[r.id,r.protect])),new Map(actual.map(r=>[r.id,r.protect])),c.ind);
      assert.deepEqual(new Set(actual.map(r=>r.kind)),new Set(['dca','dca-active','axis']));
    }
  }
});
it('does not invent ladders when those historical strategy sets are disabled',()=>{
  const settings={...DEFAULT_SETTINGS,signals:signalSettings({strategies:{dca:false,axis:false}})};
  assert.deepEqual([...signalDerivedCatalog({settings,wf:defaultWalkForward(settings)})],[]);
});
it('fails and records missing enabled ladder cells instead of certifying a partial catalog',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'cts-derived-audit-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const settings={...DEFAULT_SETTINGS,signals:signalSettings({sourcesMode:'allow',sources:{'ema-cross':true},ranges:{short:true,medium:false},lanes:[15],strategies:{dca:true,axis:false}}),tfs:[15]};
  const wf=defaultWalkForward(settings),rows=[...new Map([...signalDerivedCatalog({settings,wf})].map(r=>[r.id,r])).values()];
  assert.ok(rows.length>1);
  writeFileSync(join(dir,'protocol.json'),JSON.stringify({actualSettings:settings,actualWf:wf}));
  writeFileSync(join(dir,'coverage.json'),JSON.stringify({ok:true,sourceSha256:'test-source',protocolSha256:'test-protocol'}));
  const write=xs=>writeFileSync(join(dir,'coverage.configs.jsonl'),xs.map(x=>JSON.stringify(x)).join('\n')+'\n');
  write(rows.slice(1));await assert.rejects(()=>auditSignalDerivedCatalog(dir));
  const failure=JSON.parse(readFileSync(join(dir,'derived-catalog.json')));assert.equal(failure.ok,false);assert.equal(failure.missingConfiguredCells,1);
  write(rows);const complete=await auditSignalDerivedCatalog(dir);assert.equal(complete.ok,true);assert.equal(complete.missingConfiguredCells,0);
});
