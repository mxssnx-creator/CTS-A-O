// Offline report QA: source search, paged full-order data, downloads and desktop/mobile layout.
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const file=resolve(process.argv[2]??'docs/sims/inverse-20-symbol-20261020.html');
const browser=await chromium.launch({...(process.env.CTS_REPORT_CHROMIUM?{executablePath:process.env.CTS_REPORT_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];mkdirSync('/workspace/screenshots/inverse-report',{recursive:true});
try{for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['phone',{width:390,height:844}]]){
 const p=await browser.newPage({viewport});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('file://'+file);await p.locator('h1').waitFor();assert.equal(await p.locator('svg').count()>=9,true);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 const n=await p.locator('#run-select option').count();for(let i=0;i<n;i++){
 await p.locator('#run-select').selectOption(String(i));assert.equal(await p.locator('.run:visible').count(),1);assert.equal(await p.locator('.run:visible .sources tbody tr').count(),114);
 const order=p.locator('.run:visible .order-view');await order.locator('summary').click();
 await p.waitForFunction(()=>document.querySelector('.run:not([hidden]) .order-page').textContent.includes('Gesamt'));
 const total=await order.locator('.order-data').evaluate(e=>JSON.parse(e.textContent).rows.length);
 assert.equal(await order.locator('tbody tr').count(),Math.min(100,total));
 if(total>100){const first=await order.locator('tbody tr').first().textContent();await order.locator('.order-next').click();assert.notEqual(await order.locator('tbody tr').first().textContent(),first);await order.locator('.order-prev').click();assert.equal(await order.locator('tbody tr').first().textContent(),first);}
 await order.locator('.order-search').fill('BTC');
 const matching=await order.locator('.order-data').evaluate(e=>JSON.parse(e.textContent).rows.filter(r=>r.join(' ').toLowerCase().includes('btc')).length);
 assert.equal(await order.locator('tbody tr').count(),Math.min(100,matching));
 await order.locator('.order-search').fill('');
 const orderDownload=p.waitForEvent('download');await order.locator('.order-download').click();await orderDownload;
 await order.locator('summary').click();
 }
 await p.locator('#run-select').selectOption('0');
 await p.evaluate(()=>scrollTo(0,0));
 await p.screenshot({path:`/workspace/screenshots/inverse-report/${name}-top.png`});
 await p.locator('.run:visible .charts').scrollIntoViewIfNeeded();await p.screenshot({path:`/workspace/screenshots/inverse-report/${name}-charts.png`});
 const details=p.locator('.run:visible details').filter({hasText:'Alle 114 Indikationen'});await details.locator('summary').click();await details.locator('input').fill('rsi2-turn');assert.equal(await details.locator('tbody tr:visible').count(),6);
 const downloaded=p.waitForEvent('download');await p.locator('#download').click();await downloaded;
 assert.deepEqual(errors,[]);results.push({name,studies:n,svg:await p.locator('svg').count(),noOverflow:true,sourceSearch:true,download:true,orderPagination:true,orderSearch:true,orderDownload:true,errors});await p.close();
 }writeFileSync('runs/inverse-report-ui.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
