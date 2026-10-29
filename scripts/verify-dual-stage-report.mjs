import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const file=process.argv[2];
if(!file)throw new Error('usage: verify-dual-stage-report.mjs REPORT_HTML [QA_JSON]');
const html=readFileSync(file,'utf8');
const packed=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1],script=/<script>([\s\S]*?)<\/script>/.exec(html)[1];
const initial={range:'2',baseN:'15',mainN:'15',search:'',listing:'contexts',orderStage:'main'};
const elements=new Map();
for(const id of [...Object.keys(initial),'data','scope','cards','finding','sweep','stages','groups','sides','audit','previous','next','page','listHead','listBody'])
 elements.set(id,{value:initial[id]??'',innerHTML:'',textContent:id==='data'?packed:'',disabled:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}});
const context=vm.createContext({document:{getElementById(id){assert.ok(elements.has(id),`unknown element ${id}`);return elements.get(id);}},Date});
vm.runInContext(script,context,{timeout:30000});
const data=vm.runInContext('DATA',context),run=s=>vm.runInContext(s,context,{timeout:30000});
assert.equal(data.length,3);let checked=0;
for(let index=0;index<3;index++)for(const b of [5,10,15,20,25])for(const m of [5,10,15,20,25]){
 elements.get('range').value=String(index);elements.get('baseN').value=String(b);elements.get('mainN').value=String(m);
 elements.get('listing').value='contexts';elements.get('search').value='';run('refresh()');
 assert.equal(run('filtered.length'),4800);assert.equal((elements.get('listBody').innerHTML.match(/<tr /g)||[]).length,75);
 assert.ok(elements.get('scope').innerHTML.includes(`Last-${b} Base secondary / Last-${m} Main secondary`));
 const c=data[index].results.cases.find(x=>x.baseSecondaryN===b&&x.mainSecondaryN===m);
 for(const name of ['main','inverseMain','real','inverseReal','active','inverseActive']){
  elements.get('listing').value='orders';elements.get('orderStage').value=name;run('page=0;renderList()');
  assert.equal(run('filtered.length'),c.stages[name].openedOrders,`${index} ${b} ${m} ${name}`);
  const stats=run('summarizeCohort(filtered,selected().d.contexts)');
  for(const k of ['openedPositions','closedPositions','openPositions','openedOrders','settledOrders','openOrders'])assert.equal(stats[k],c.stages[name][k]);
  for(const k of ['grossProfit','grossLoss'])assert.ok(Math.abs(stats[k]-c.stages[name][k])<1e-10);
 }
 checked++;
}
elements.get('range').value='2';elements.get('baseN').value='15';elements.get('mainN').value='15';elements.get('listing').value='contexts';elements.get('search').value='';run('refresh()');
const first=elements.get('listBody').innerHTML;elements.get('next').listeners.click();assert.notEqual(elements.get('listBody').innerHTML,first);assert.equal(run('page'),1);
elements.get('previous').listeners.click();assert.equal(run('page'),0);assert.equal(elements.get('listBody').innerHTML,first);
elements.get('search').value='BTC-USDT';elements.get('search').listeners.input();assert.equal(run('filtered.length'),240);assert.ok(elements.get('listBody').innerHTML.includes('BTC-USDT'));
elements.get('search').value='short';elements.get('search').listeners.input();assert.equal(run('filtered.length'),2400);
elements.get('listing').value='orders';elements.get('orderStage').value='main';run('page=0;renderList()');assert.ok(run('filtered.every(o=>o.side===-1)'));
elements.get('search').value='no-such-configuration';elements.get('search').listeners.input();assert.equal(run('filtered.length'),0);assert.ok(elements.get('listBody').innerHTML.includes('No orders'));
const output={status:'pass',controlHarness:'Node VM with DOM stubs; not a browser rendering test',checkedRangeWindowSelections:checked,checkedStageCohorts:checked*6,
 contexts:data.reduce((a,d)=>a+d.contexts.length,0),orderListingRows:data.reduce((a,d)=>a+d.orders.length,0),reportBytes:Buffer.byteLength(html),reportSha256:createHash('sha256').update(html).digest('hex')};
writeFileSync(process.argv[3]??`${file}.qa.json`,JSON.stringify(output,null,2)+'\n');
process.stdout.write(JSON.stringify(output,null,2)+'\n');
