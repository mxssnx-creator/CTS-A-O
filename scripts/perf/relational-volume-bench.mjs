// Synthetic parity and timing for a fixed run's position-volume policy.
// node --experimental-strip-types --no-warnings scripts/perf/relational-volume-bench.mjs raw|prepared neutral|weighted
import {createHash} from 'node:crypto';import {relationalVolumeFactor,prepareRelationalVolumeFactor,DEFAULT_RELATIONAL_VOLUME} from '../../shared/cts-volume/ratios.ts';
const mode=process.argv[2]??'raw',policy=process.argv[3]??'neutral';if(!['raw','prepared'].includes(mode)||!['neutral','weighted'].includes(policy))throw Error('invalid fixture');
const settings=policy==='neutral'?DEFAULT_RELATIONAL_VOLUME:{overall:1.2,indicationTypes:{tactic:2},strategies:{axis:.5},ranges:{micro:1.5},symbols:{'sol-usdt':.5}};
const contexts=Array.from({length:30},(_,i)=>({indicationType:i%2?'tactic':'rsi',strategy:i%3?'normal':'axis',range:i%2?'micro':'short',symbol:i%3?'BTC-USDT':'SOL-USDT'}));
const prepared=prepareRelationalVolumeFactor(settings),h=createHash('sha256'),start=performance.now();let total=0;
for(let i=0;i<200000;i++){const ctx=contexts[i%contexts.length],x=mode==='raw'?relationalVolumeFactor(settings,ctx):prepared?prepared(ctx):1;total+=x;h.update(x.toPrecision(16)+';');}
console.log(JSON.stringify({mode,policy,calls:200000,ms:Math.round(performance.now()-start),total,sha256:h.digest('hex')}));
