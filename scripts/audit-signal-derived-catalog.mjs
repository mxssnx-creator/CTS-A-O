// Verify enabled ladder identities against the complete tape inventory, including zero-execution cells.
import assert from 'node:assert/strict';
import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {signalSettings} from '../src/core/signal-config.ts';
import {signalCombos} from '../src/core/signals.ts';
import {configId,laneProtect} from '../src/core/pipeline/pipeline.ts';
import {parseSignalCoordinationId} from '../src/core/signal-coordination.ts';
import {signalCoordinationProtects} from '../src/core/server/runtime.server.ts';
import {adjustProtect} from '../src/core/adjust.ts';
import {capSignalProtect} from '../src/core/sim/trailing.ts';
import {dcaSnapshot} from '../src/core/sim/dca.ts';
import {axisVariants} from '../src/core/sim/walkforward.ts';

export function* signalDerivedCatalog({settings,wf,fastArgs}) {
  const sig=signalSettings(settings.signals);
  if(!sig.strategies.dca&&!sig.strategies.axis)return;
  const floors=fastArgs?.sig?.floors??{minSl:sig.minSl,minTrail:sig.minTrail};
  const feedback=fastArgs?.adjust;
  const combos=signalCombos(sig,settings.tfs);
  const coord=combos.some(c=>parseSignalCoordinationId(c.ind))?signalCoordinationProtects(settings.grid,settings.cost,sig.coordination.ranges,sig):[];
  for(const {bot,ind} of combos){
    const refs=parseSignalCoordinationId(ind)?coord:wf.dcaProtects;
    assert.ok(Array.isArray(refs)&&refs.length,'Missing materialized DCA protection grid');
    const adjusted=(p,kind)=>{
      const e=feedback?.[`${bot}|${ind}|${kind}`];
      const a=!p.tag?adjustProtect(adjustProtect(p,floors),e)
        :!e||((e.slMult??1)===1&&(e.trailMult??1)===1)?p
        :adjustProtect(p,{minSl:0,minTrail:0,slMult:e.slMult,trailMult:e.trailMult});
      return capSignalProtect(p.trailMax===undefined?{...a,trailMax:sig.trailMax}:a);
    };
    if(sig.strategies.dca)for(const ref of refs)for(const kind of ['dca','dca-active']){
      const protect={...adjusted(laneProtect(ref,ind),kind),dca:dcaSnapshot(wf.dca)};
      yield {id:configId(bot,ind,protect,kind),bot,ind,kind,protect};
    }
    if(sig.strategies.axis)for(const {p0,tag} of axisVariants(settings.axis,refs)){
      const identity=laneProtect(p0.trailMax===undefined?{...p0,trailMax:sig.trailMax}:p0,ind);
      const id=configId(bot,ind,identity,'axis').replace(/\|axis$/,`${tag}|axis`);
      yield {id,bot,ind,kind:'axis',protect:adjusted(identity,'axis')};
    }
  }
}

export async function auditSignalDerivedCatalog(dir){
  const protocol=JSON.parse(readFileSync(resolve(dir,'protocol.json')));
  const coverage=JSON.parse(readFileSync(resolve(dir,'coverage.json')));
  assert.equal(coverage.ok,true);
  const expected=new Map(),counts={};let requested=0;
  for(const row of signalDerivedCatalog({settings:protocol.actualSettings,wf:protocol.actualWf})){
    requested++;if(expected.has(row.id))continue;
    expected.set(row.id,row.kind);counts[row.kind]=(counts[row.kind]??0)+1;
  }
  const effective=expected.size,built={},extras={};
  for await(const line of createInterface({input:createReadStream(resolve(dir,'coverage.configs.jsonl')),crlfDelay:Infinity})){
    if(!line.trim())continue;
    const row=JSON.parse(line);
    if(!['dca','dca-active','axis'].includes(row.kind))continue;
    built[row.kind]=(built[row.kind]??0)+1;
    if(!expected.delete(row.id))extras[row.kind]=(extras[row.kind]??0)+1;
  }
  const result={schema:'cts-signal-derived-catalog-v1',ok:expected.size===0,protocolSha256:coverage.protocolSha256,sourceSha256:coverage.sourceSha256,
    basis:'Every enabled DCA, DCA Active and Axis build cell; execution toggles are separate from historical calculation. Zero-execution cells are retained.',
    requestedCells:requested,expectedEffectiveCells:effective,expectedByType:counts,builtByType:built,additionalBuiltByType:extras,
    missingConfiguredCells:expected.size,missingExamples:[...expected.keys()].slice(0,30)};
  writeFileSync(resolve(dir,'derived-catalog.json'),JSON.stringify(result,null,2)+'\n');
  assert.ok(result.ok,JSON.stringify(result));return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await auditSignalDerivedCatalog(resolve(process.argv[2]))));
