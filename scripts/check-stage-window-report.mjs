import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const report=process.argv[2],output=process.argv[3];if(!report||!output)throw new Error('usage: check-stage-window-report.mjs REPORT_HTML QA_JSON');
const browser=await chromium.launch({...process.env.CTS_UI_BROWSER_EXECUTABLE?{executablePath:process.env.CTS_UI_BROWSER_EXECUTABLE}:{},headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(pathToFileURL(resolve(report)).href);await page.waitForFunction(()=>window.CTS_REPORT_READY,{timeout:90000});
let combinations=0,stageListings=0;
for(let range=0;range<3;range++){
 await page.selectOption('#range',String(range));
 for(const m of [15,25])for(const r of [15,25]){
  await page.selectOption('#mainN',String(m));await page.selectOption('#realN',String(r));
  for(const primary of [20,30,40,50])for(const secondary of [5,10,15,20,25]){
   await page.locator(`button[data-primary="${primary}"][data-secondary="${secondary}"]`).click();
   const actual=await page.evaluate(()=>({selection:window.CTS_REPORT_SELECTION,heat:document.querySelectorAll('#heatmap button').length,
    sweep:document.querySelectorAll('#sweep tr').length,stage:document.querySelectorAll('#stages tr').length,groups:document.querySelectorAll('#groups tr').length,
    sides:document.querySelectorAll('#sides tr').length,context:document.getElementById('page').textContent}));
   assert.equal(actual.selection.case,`${primary}|${secondary}|${m}|${r}`);assert.equal(actual.heat,20);assert.equal(actual.sweep,80);assert.equal(actual.stage,6);assert.equal(actual.groups,36);assert.equal(actual.sides,12);
   assert.match(actual.context,/4,800 contexts/);
   await page.selectOption('#listing','orders');
   for(const stage of ['main','inverseMain','real','inverseReal','active','inverseActive']){
    await page.selectOption('#orderStage',stage);
    const counts=await page.evaluate(({range,primary,secondary,m,r,stage})=>{const c=window.CTS_REPORT_DATA.datasets[range].results.cases.find(c=>c.basePrimaryN===primary&&c.baseSecondaryN===secondary&&c.mainSecondaryN===m&&c.realN===r);
     return{expected:c.stages[stage].openedOrders,label:document.getElementById('page').textContent};},{range,primary,secondary,m,r,stage});
    assert.equal(Number(counts.label.match(/^([\d,]+) /)[1].replaceAll(',','')),counts.expected);stageListings++;
   }
   await page.selectOption('#listing','contexts');combinations++;
  }
 }
 console.log('Verified range',range,'combinations',combinations,'stage listings',stageListings);
}
let sensitivityCases=0,sensitivityListings=0;
if(await page.evaluate(()=>!!window.CTS_REPORT_DATA.mainPrimarySensitivity))for(let study=0;study<6;study++){
 await page.selectOption('#sensStudy',String(study));
 for(let choice=0;choice<8;choice++){
  await page.selectOption('#sensCase',String(choice));
  for(const stage of ['main','inverseMain','real','inverseReal','active','inverseActive']){
   await page.selectOption('#sensStage',stage);
   const actual=await page.evaluate(({study,choice,stage})=>({expected:window.CTS_REPORT_DATA.mainPrimarySensitivity[study].results.cases[choice].stages[stage].openedOrders,
    label:document.getElementById('sensPage').textContent,selection:window.CTS_SENSITIVITY_SELECTION}),{study,choice,stage});
   assert.equal(actual.selection.study,study);assert.equal(actual.selection.caseIndex,choice);assert.equal(actual.selection.stage,stage);
   assert.equal(Number(actual.label.match(/^([\d,]+) /)[1].replaceAll(',','')),actual.expected);sensitivityListings++;
  }
  sensitivityCases++;
 }
}
await page.selectOption('#range','0');await page.selectOption('#mainN','15');await page.selectOption('#realN','15');await page.locator('button[data-primary="20"][data-secondary="15"]').click();
await page.fill('#search','BTC-USDT');assert.match(await page.textContent('#page'),/240 contexts/);await page.fill('#search','long');assert.match(await page.textContent('#page'),/2,400 contexts/);await page.fill('#search','');
await page.click('#next');assert.match(await page.textContent('#page'),/page 2\/96/);await page.click('#previous');
for(const metric of ['basePf','main','real','end','base','orders']){await page.selectOption('#metric',metric);assert.equal(await page.locator('#heatmap button').count(),20);}
for(const stage of ['main','real','active']){await page.selectOption('#chartStage',stage);assert.equal(await page.locator('#curve svg').count(),1);}
await page.selectOption('#metric','basePf');await page.evaluate(()=>scrollTo(0,0));mkdirSync('/workspace/screenshots',{recursive:true});await page.screenshot({path:'/workspace/screenshots/cts-stage-window-desktop.png',fullPage:false});
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/workspace/screenshots/cts-stage-window-mobile.png',fullPage:false});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page-wide horizontal overflow');assert.deepEqual(errors,[]);
const result={status:'pass',combinations,stageListings,contexts:14400,desktop:[1440,1100],mobile:[390,844],consoleErrors:errors,sensitivityCases,sensitivityListings,searchAndPagination:true,heatmapMetrics:6,holdComparisons:6,curveStages:3};
assert.equal(await page.locator('#holdFollowup tr').count(),6);
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await browser.close();
