#!/usr/bin/env node
// Render the native runtime report's embedded client in an isolated DOM stub.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const html = readFileSync(process.argv[2], "utf8");
const done = new Error("captured"); let summary;
const app = { set innerHTML(value) { summary = value; throw done; } };
const document = { documentElement: { dataset: {} }, querySelector: () => app, getElementById: () => app };
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
try { runInNewContext(script, { document, localStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }) }, { timeout: 2000 }); }
catch (error) { if (error !== done) throw error; }
assert.ok(summary);
assert.match(summary, /heatmap/i);
if (process.argv[3]) {
  const dir = process.argv[3];
  const audit = JSON.parse(readFileSync(`${dir}/audit.json`));
  const raw = JSON.parse(readFileSync(`${dir}/raw.json`));
  const report = JSON.parse(readFileSync(`${dir}/report/data.json`));
  const progression = JSON.parse(readFileSync(`${dir}/progression-audit.json`));
  const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`));
  assert.equal(progression.status, "passed");
  const evaluated = raw.tapeAgg.evalStats.evaluated.toLocaleString("en-US");
  const passed = raw.tapeAgg.evalStats.passed.toLocaleString("en-US");
  assert.ok(html.includes(`${passed} of ${evaluated} configurations validated`), "current run-start validation is displayed");
  assert.ok(html.includes(`on ${audit.total.closes} settled orders`), "current funded count is displayed");
  if (report.total.feasible === false)
    assert.ok(html.includes(`INFEASIBLE: modeled margin exceeded equity for ${report.total.marginOver.minutes} minutes`), "infeasible funding must be prominent");
  assert.ok(html.includes("Funded-model orders opened / settled / held"), "funded opening and holding counts must be displayed");
  assert.ok(html.includes("caps modeled round-trip cost at 0.15%"), "modeled cost ceiling must be visible");
  if (/binance/i.test(protocol.feed?.provider ?? ""))
    assert.ok(html.includes("live executor uses BingX"), "cross-venue feed limitation must be visible");
  assert.match(html, /Continuous post-Base progression/);
  assert.ok(html.includes(`Open all ${progression.configs.length.toLocaleString("en-US")} individual configuration progressions`));
} else {
  assert.ok(/1,?883/.test(summary), "audited funded count is displayed");
  assert.match(summary, /0\.08/);
  assert.match(html, /559 of 1,469 configurations validated/);
}
console.log("Runtime report client rendered the audited funded count, PF, and heatmap section.");
