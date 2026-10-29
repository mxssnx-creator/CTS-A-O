#!/usr/bin/env node
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const file=process.argv[2],receipt=process.argv[3];if(!file||!receipt)throw new Error('usage: check-stage-expanded-report.mjs REPORT QA_JSON');
const browser=await chromium.launch({headless:true,executablePath:process.env.CTS_UI_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']}),
  page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(pathToFileURL(resolve(file)).href);await page.waitForFunction(()=>window.CTS_EXPANDED_READY,{timeout:90000});
const checked=await page.evaluate(()=>{
  const $=id=>document.getElementById(id),D=window.CTS_EXPANDED_DATA;let selections=0,variantSelections=0,orderRows=0;
  for(const d of D.datasets){if(d.audit.status!=='pass'||d.results.cases.length!==48608)throw Error('incomplete audited dataset');
    $('pricing').value=d.protocol.executionTfMin===1?'minute':'lane';$('range').value=d.protocol.range;$('pre').value=String(d.protocol.prehistoryHours);$('variant').value='direct';$('mainN').value='15';$('realN').value='15';
    for(const minimal of ['off','1p','1n','2p','2n','3p','3n']){$('minimal').value=minimal;window.CTS_EXPANDED_RENDER();
      for(const bp of d.protocol.basePolicies.filter(b=>(b.minimal?`${b.minimal.n}${b.minimal.polarity[0]}`:'off')===minimal)){
        const button=$('heatmap').querySelector(`button[data-long="${bp.long}"][data-short="${bp.short}"]`);button.click();
        const id=`${bp.id}|direct|15|15`,c=d.caseMap.get(id),s=d.results.summaries[c.main],listed=window.CTS_EXPANDED_LISTED('main');
        if(window.CTS_EXPANDED_SELECTION.case!==id||listed.length!==s.openedOrders)throw Error('wrong case/order lineage '+id);
        if($('heatmap').querySelectorAll('button:disabled').length!==6||$('groups').children.length!==12||$('stages').children.length!==4||$('sweep').children.length!==98)throw Error('missing independent rows');
        const keys=new Set();for(const x of listed){const k=JSON.stringify([x.c.cfg,x.c.sym,x.row[6],x.row[0]]);if(keys.has(k))throw Error('duplicate order ownership');keys.add(k);}orderRows+=listed.length;selections++;
      }
    }
    // All requested ongoing windows and negative combinations are independently selectable.
    $('minimal').value='off';window.CTS_EXPANDED_RENDER();
    for(const variant of ['direct',...d.protocol.negativePolicies.map(p=>p.id)])for(const m of [1,5,15,25])for(const r of [1,5,15,25]){
      $('variant').value=variant;$('mainN').value=String(m);$('realN').value=String(r);window.CTS_EXPANDED_RENDER();
      const c=d.caseMap.get(window.CTS_EXPANDED_SELECTION.case);for(const stage of ['main','real','active'])if(window.CTS_EXPANDED_LISTED(stage).length!==d.results.summaries[c[stage]].openedOrders)throw Error('variant linked to wrong economic stream');variantSelections++;
    }
  }
  return {datasets:D.datasets.length,selections,variantSelections,checkedListedOrders:orderRows,caseCoverage:D.datasets.reduce((s,d)=>s+d.results.cases.length,0)};
});
assert.equal(checked.datasets,12);assert.equal(checked.selections,1176);assert.equal(checked.variantSelections,5952);assert.equal(checked.caseCoverage,583296);
await page.selectOption('#pricing','lane');await page.selectOption('#range','mc');await page.selectOption('#pre','24');await page.selectOption('#minimal','off');await page.selectOption('#variant','direct');await page.selectOption('#mainN','15');await page.selectOption('#realN','15');await page.locator('button[data-long="40"][data-short="15"]').click();
await page.selectOption('#orderStage','main');await page.selectOption('#period','measured');
assert.equal(await page.evaluate(()=>window.CTS_EXPANDED_ORDER_COUNT),1534);
const listedSymbol=await page.evaluate(()=>window.CTS_EXPANDED_LISTED('main')[0].c.sym);
await page.fill('#orderSearch',listedSymbol);assert.ok(await page.evaluate(()=>window.CTS_EXPANDED_ORDER_COUNT)>0);
assert.ok(await page.evaluate(sym=>window.CTS_EXPANDED_LISTED('main').some(x=>x.c.sym===sym),listedSymbol));
const downloadPromise=page.waitForEvent('download');await page.click('#csv');const download=await downloadPromise;assert.match(download.suggestedFilename(),/CTS-A-O-40-15-off-main\.csv/);
await page.fill('#orderSearch','');await page.selectOption('#orderStage','active');assert.equal(await page.evaluate(()=>window.CTS_EXPANDED_ORDER_COUNT),0);await page.selectOption('#orderStage','main');
assert.ok(await page.locator('#orderNext').isEnabled());await page.click('#orderNext');assert.match(await page.locator('#orderCount').textContent(),/page 2/);await page.click('#orderPrev');
await page.fill('#contextSearch','BTC-USDT');assert.match(await page.locator('#contextCount').textContent(),/240 of 4,800/);await page.fill('#contextSearch','');
assert.match(await page.locator('#costEffect').textContent(),/gross price PF 1\.0892 → net PF 0\.6227/);
await page.selectOption('#pricing','minute');await page.evaluate(()=>window.scrollTo(0,0));
await page.screenshot({path:'/workspace/screenshots/cts-expanded-stage-desktop.png',fullPage:false});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/workspace/screenshots/cts-expanded-stage-mobile.png',fullPage:false});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'mobile document overflow');assert.deepEqual(errors,[]);
await browser.close();const result={status:'pass',...checked,desktop:[1440,1100],mobile:[390,844],csvDownload:true,search:true,pagination:true,consoleErrors:errors};
writeFileSync(receipt,JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify(result)+'\n');
