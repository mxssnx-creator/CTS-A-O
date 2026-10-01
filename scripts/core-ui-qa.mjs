#!/usr/bin/env node
// UI check of every /v2 page on desktop and mobile: renders content, no uncaught errors or failed requests,
// no horizontal overflow on mobile, the connection selector switches every page to the selected connection and
// the event stream is connected. Screenshots go to screenshots/ui-qa/.
//
//   node scripts/core-ui-qa.mjs [--url http://127.0.0.1:8080] [--out screenshots/ui-qa]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const base = arg("url", "http://127.0.0.1:8080");
const out = arg("out", "screenshots/ui-qa");
mkdirSync(out, { recursive: true });

const PAGES = [
  "/v2",
  "/v2/stages",
  "/v2/results",
  "/v2/matrix",
  "/v2/statistics",
  "/v2/hourly",
  "/v2/compare",
  "/v2/presets",
  "/v2/trading",
  "/v2/market",
  "/v2/engine",
  "/v2/settings",
];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
for (const vp of VIEWPORTS) {
  // ignoreHTTPSErrors: third-party assets through a TLS-inspecting proxy are not the app's errors
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // a failed resource is judged by its URL below (third-party fonts / scripts through a proxy are not the app's)
    if (m.type() === "error" && !/^Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 400)}`);
  });
  const own = (u) => u.startsWith(base);
  page.on("response", (r) => {
    if (own(r.url()) && r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    // a stream closed by navigation is not a failure
    if (own(r.url()) && !/events/.test(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText ?? ""))
      errors.push(`failed ${r.url()} ${r.failure()?.errorText}`);
  });
  for (const p of PAGES) {
    errors.length = 0;
    const t0 = Date.now();
    await page.goto(base + p, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // data arrives by polling: wait until "Loading…" is gone (or 20 s)
    await page
      .waitForFunction(() => !document.body.innerText.includes("Loading…"), null, { timeout: 20_000 })
      .catch(() => {});
    // the connection list (every connection's runtime) and the page's data
    await page
      .waitForFunction(
        () => document.querySelectorAll('select[aria-label="Exchange connection"] option').length >= 3,
        null,
        { timeout: 30_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => ({
      text: document.body.innerText.length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      conn: document.querySelector('select[aria-label="Exchange connection"]')?.value ?? null,
      options: [...document.querySelectorAll('select[aria-label="Exchange connection"] option')].map((o) => o.value),
    }));
    const file = `${out}/${vp.name}${p.replace(/\//g, "_") || "_root"}.png`;
    await page.screenshot({ path: file, fullPage: false });
    results.push({
      viewport: vp.name,
      page: p,
      ms: Date.now() - t0,
      textChars: info.text,
      overflowPx: info.overflow,
      conn: info.conn,
      connOptions: info.options.length,
      errors: [...errors],
      ok: info.text > 200 && errors.length === 0 && (vp.name !== "mobile" || info.overflow <= 1) && info.options.length >= 3,
      screenshot: file,
    });
  }
  // switching the connection: the page shows the other connection's data, nothing breaks
  if (vp.name === "desktop") {
    errors.length = 0;
    await page.goto(base + "/v2/engine", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('select[aria-label="Exchange connection"] option[value="bingx-x01"]', { timeout: 30_000, state: "attached" });
    const before = await page.$eval('select[aria-label="Exchange connection"]', (s) => s.value);
    for (const c of ["bingx-x01", "bingx-vst-01", "bingx-vst-02", "bingx-x01", "bingx-vst-02"]) {
      await page.selectOption('select[aria-label="Exchange connection"]', c);
      await page.waitForTimeout(600);
    }
    await page.selectOption('select[aria-label="Exchange connection"]', "bingx-x01");
    await page.waitForTimeout(1500);
    const shown = await page.evaluate(() => document.body.innerText.includes("bingx-x01") || document.body.innerText.includes("X01"));
    const stored = await page.evaluate(() => localStorage.getItem("cts-v2-conn"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const afterReload = await page.$eval('select[aria-label="Exchange connection"]', (s) => s.value);
    await page.screenshot({ path: `${out}/desktop_switch.png` });
    results.push({
      viewport: "desktop",
      page: "connection switch",
      before,
      stored,
      afterReload,
      shown,
      errors: [...errors],
      ok: stored === "bingx-x01" && afterReload === "bingx-x01" && shown && errors.length === 0,
    });
    // the event stream reaches the page
    const sse = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const es = new EventSource("/api/core/events");
          const t = setTimeout(() => {
            es.close();
            resolve(0);
          }, 5000);
          let n = 0;
          es.addEventListener("core", () => {
            n++;
            if (n >= 3) {
              clearTimeout(t);
              es.close();
              resolve(n);
            }
          });
        }),
    );
    results.push({ viewport: "desktop", page: "event stream", events: sse, ok: sse >= 3 });
    await page.selectOption('select[aria-label="Exchange connection"]', "bingx-vst-02");
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
const bad = results.filter((r) => !r.ok);
for (const r of results)
  console.log(
    `${r.ok ? "ok  " : "FAIL"} ${r.viewport.padEnd(8)} ${String(r.page).padEnd(20)} ${r.ms ? `${r.ms} ms` : ""} ${r.overflowPx > 1 ? `overflow ${r.overflowPx}px ` : ""}${(r.errors ?? []).slice(0, 3).join(" | ")}`,
  );
console.log(`${results.length - bad.length}/${results.length} ok`);
process.exit(bad.length ? 1 : 0);
