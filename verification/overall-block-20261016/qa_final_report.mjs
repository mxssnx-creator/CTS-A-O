import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = '/workspace/scratch/18f0ba5d9c08/CTS-A-O-block-ui-private';
const reportDir = '/tmp/cts-overall-block-final-cp10-20261016';
const out = '/workspace/screenshots/cts-ao-qa/overall-block-report-20261016/final-cp10-2aeb1cf9';
const resultPath = '/tmp/cts-block-report-final-cp10-ui-qa-20261016-2aeb1cf9.json';
const executablePath = '/workspace/scratch/18f0ba5d9c08/cts-browser-runtime/unpacked/chromium';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = {
  'index.html': '2aeb1cf9717a2d46f04bdc62400a5609c501b6d2d14f589e57890ff6fccd7da8',
  'report-manifest.json': '783b7385d15fb59b708fa379787f51173f4f2ab309ecf5b9b830593cb493d8b1',
  'report-data.json': '0dca0b5ddf60784ef51a793807407d19f6d8d17e885de1760dd68fb3c7ce2564',
  'comparison.csv': '2429dbeff08b6d1186f58cf036c1727572f0ebd8ff8d2211b9b853123215fc90',
  'hourly.csv': '4976d0bc1a56714f99523838f121c6d38f784e3c39406474b90e33642179e04c',
  'all-close-slices.csv': '445b77adacc7bf396251343e72c0735820be5d785280c0abbdae68a03607334f',
};
const receipts = {
  '/tmp/cts-block-report-final-cp10-run-20261016.json': 'ee07325f851503799980928ef8db355418a8fdb4b631fb6869e71f1971024fbc',
  '/tmp/cts-block-report-final-cp10-validation-20261016.json': 'e410949c2c267c7b3120280756fe63977860ddcf106490cc52b94121af1977c9',
};
const snapshots = () => Object.fromEntries(Object.keys(expected).map(name => {
  const bytes = readFileSync(reportDir + '/' + name);
  return [name, { bytes: bytes.length, sha256: digest(bytes) }];
}));
assert.deepEqual(readdirSync(reportDir).sort(), Object.keys(expected).sort());
const before = snapshots();
for (const [name, sha] of Object.entries(expected)) assert.equal(before[name].sha256, sha);
for (const [path, sha] of Object.entries(receipts)) assert.equal(digest(readFileSync(path)), sha);
const html = reportDir + '/index.html';
const htmlText = readFileSync(html, 'utf8');
const embedded = JSON.parse(/<script type="application\/json" id="csv-downloads">([\s\S]*?)<\/script>/.exec(htmlText)[1]);
const manifest = JSON.parse(readFileSync(reportDir + '/report-manifest.json'));
const data = JSON.parse(readFileSync(reportDir + '/report-data.json'));
assert.equal(data.provisional, false);
assert.deepEqual(data.unfinishedOfflineStages, []);
assert.deepEqual(data.failedOrBlockedOfflineStages, []);
assert.ok(data.performanceArms.every(arm => arm.passesEveryDeclaredFold === false));
assert.equal(data.studyBoundaries.signalActivity.failedCaptureCount, 20);
const report = {
  schema: 'cts-block-final-cp10-standalone-html-ui-qa-v1',
  at: new Date().toISOString(), basis: 'File-only standalone final report; no app server, build, source edit, venue call, or live account action.',
  sourceCheckpoint: manifest.sourceCheckpoint, sourceFreezeSha256: manifest.sourceFreezeSha256,
  sourceTree: data.releaseStatus.sourceTree, sourceSha256: manifest.sourceSha256, protocolSha256: manifest.protocolSha256,
  inputsBefore: before, verifiedReceipts: receipts, viewports: [], downloads: [], screenshots: [],
  consoleErrors: [], pageErrors: [], requestFailures: [], blockedExternal: [], externalRequests: [],
  financialScope: { provisional: false, qualifiedProfiles: 0, signalActivityFailedCaptures: 20, independentRangesQualified: false, noProfitGuarantee: true },
  privateServerStarted: false, allocatedServerPorts: [], browserClosed: false, ok: false,
};
mkdirSync(out, { recursive: false });
const { chromium } = await import(pathToFileURL(root + '/node_modules/playwright/index.mjs'));
let browser;
try {
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-component-update', '--host-resolver-rules=MAP * ~NOTFOUND'] });
  for (const [name, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport: size, acceptDownloads: true });
    await context.route('**/*', route => {
      if (/^https?:/.test(route.request().url())) {
        report.blockedExternal.push({ viewport: name, url: route.request().url() });
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ viewport: name, text: message.text() }); });
    page.on('pageerror', error => report.pageErrors.push({ viewport: name, message: error.message }));
    page.on('request', request => { if (/^https?:/.test(request.url())) report.externalRequests.push({ viewport: name, url: request.url() }); });
    page.on('requestfailed', request => report.requestFailures.push({ viewport: name, url: request.url(), error: request.failure()?.errorText }));
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    const body = await page.locator('body').innerText();
    assert.match(body, /Corrected research report · offline checks complete · X02 venue blocked/);
    assert.doesNotMatch(body, /Provisional report ·|offline verification pending/);
    assert.match(body, /Signal execution not established\. No venue execution proof\./);
    assert.match(body, /0 Block arms meet the full frozen retrospective policy across both declared folds\./);
    assert.match(body, /The Signal execution activity check failed in 20\/20 captures/);
    assert.match(body, /does not establish independent Micro, Minimum and Short range qualification systemwide/);
    const overflow = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
    const initialOverflow = await overflow();
    assert.ok(initialOverflow <= 1);
    const overview = out + '/' + name + '-overview.png';
    await page.screenshot({ path: overview });
    report.screenshots.push(overview);
    const details = page.locator('details');
    const expanded = [];
    assert.equal(await details.count(), 4);
    for (let i = 0; i < await details.count(); i++) {
      const detail = details.nth(i), summary = detail.locator('summary');
      const label = await summary.innerText();
      await summary.click();
      assert.equal(await detail.getAttribute('open'), '');
      expanded.push(label);
    }
    const tables = page.locator('table');
    const tableRows = [];
    for (let i = 0; i < await tables.count(); i++) tableRows.push(await tables.nth(i).locator('tbody tr').count());
    assert.deepEqual(tableRows, [2, 20, 120, 20, 16, 8]);
    const baselineRows = tables.nth(0).locator('tbody tr');
    const secondBaselineCells = await baselineRows.nth(1).locator('td').allInnerTexts();
    assert.ok(Number(secondBaselineCells[4].replaceAll(',', '')) > 0);
    assert.equal(Number(secondBaselineCells[5].replaceAll(',', '')), 0);
    const regular = page.locator('tr').filter({ has: page.getByText('full-core-regular', { exact: true }) });
    const slow = page.locator('tr').filter({ has: page.getByText('full-core-slow', { exact: true }) });
    const venue = page.locator('tr').filter({ has: page.getByText('x02-vst-venue', { exact: true }) });
    assert.match(await regular.innerText(), /passed/);
    assert.match(await slow.innerText(), /passed/);
    assert.match(await venue.innerText(), /blocked/);
    assert.equal(await page.locator('[data-download]').count(), 3);
    for (const button of await page.locator('[data-download]').all()) {
      const filename = await button.getAttribute('data-download');
      const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
      assert.equal(download.suggestedFilename(), filename);
      assert.equal(await download.failure(), null);
      const actual = readFileSync(await download.path()), physical = readFileSync(reportDir + '/' + filename), decoded = Buffer.from(embedded[filename], 'base64');
      assert.ok(actual.equals(physical));
      assert.ok(actual.equals(decoded));
      assert.equal(digest(actual), expected[filename]);
      report.downloads.push({ viewport: name, filename, bytes: actual.length, sha256: digest(actual), exactPhysicalBytes: true, exactEmbeddedBytes: true });
    }
    await regular.scrollIntoViewIfNeeded();
    const verification = out + '/' + name + '-offline-verification.png';
    await page.screenshot({ path: verification });
    report.screenshots.push(verification);
    const expandedOverflow = await overflow();
    assert.ok(expandedOverflow <= 1);
    report.viewports.push({ name, width: size.width, height: size.height, tableRows, expandedSections: expanded, initialOverflowPx: initialOverflow, expandedOverflowPx: expandedOverflow, finalHeader: true, regularPassed: true, slowPassed: true, venueBlocked: true, noQualifiedProfilesVisible: true, signalFailureVisible: true, secondBaselineLongSlices: Number(secondBaselineCells[4].replaceAll(',', '')), secondBaselineLongReturnPf: 0 });
    await context.close();
  }
  assert.equal(report.downloads.length, 6);
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.externalRequests, []);
  assert.deepEqual(report.blockedExternal, []);
  assert.deepEqual(report.requestFailures, []);
  report.ok = true;
} catch (error) {
  report.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  report.browserClosed = true;
  report.inputsAfter = snapshots();
  report.allSixInputsUnchanged = JSON.stringify(report.inputsAfter) === JSON.stringify(before);
  if (!report.allSixInputsUnchanged) { report.ok = false; process.exitCode = 1; }
  report.completedAt = new Date().toISOString();
  writeFileSync(resultPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ resultPath, ok: report.ok, viewports: report.viewports.length, downloads: report.downloads.length, screenshots: report.screenshots, error: report.error ?? null }));
}
