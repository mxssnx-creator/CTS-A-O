#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
const out = "/workspace/screenshots/incremental-report";
mkdirSync(out, { recursive: true });
const expected = JSON.parse(
  gunzipSync(readFileSync("docs/sims/incremental-cycle-20261020.json.gz")),
);
const browser = await chromium.launch({
  executablePath:
    process.env.CTS_REPORT_CHROMIUM || "/workspace/scratch/1bcaeeb063ee/browser/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const results = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1366, 900],
    ["phone", 390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(pathToFileURL(resolve("docs/sims/incremental-cycle-20261020.html")).href);
    assert.equal(await page.locator("figure svg").count(), 6);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      true,
    );
    assert.ok(
      (await page.locator("body").innerText()).includes(
        `${expected.current.cycles.n} historische Kerzenabschlüsse`,
      ),
    );
    if (expected.checks.complete)
      assert.ok((await page.locator(".badge").innerText()).includes("Prüfplan abgeschlossen"));
    await page.screenshot({ path: `${out}/${name}-top.png` });
    await page.locator("figure").first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/${name}-charts.png` });
    await page.getByText("Provenienz und Messgrenzen", { exact: true }).click();
    assert.equal(await page.locator("details[open]").count(), 1);
    assert.ok(
      (await page.locator("details[open]").innerText()).includes(expected.current.sourceSha256),
    );
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByText("Vollständige Messdaten und Prüfprotokolle", { exact: true }).click(),
    ]);
    const file = `runs/incremental-report-${name}-download.gz`;
    await download.saveAs(file);
    assert.deepEqual(JSON.parse(gunzipSync(readFileSync(file))), expected);
    assert.deepEqual(errors, []);
    results.push({
      name,
      charts: 6,
      noOverflow: true,
      downloadExact: true,
      provenanceWorks: true,
      errors,
    });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  writeFileSync("runs/incremental-report-ui.json", JSON.stringify(results, null, 2));
}
