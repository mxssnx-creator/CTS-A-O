#!/usr/bin/env node
// Bounded load verification. Synthetic prices and an injected callback; no exchange orders or profitability claim.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { closePool } from "../src/core/server/pool.server.ts";
import { DEFAULT_SETTINGS, MINIMAL_PLUS_RANGE } from "../src/core/config.ts";
import { MICRO_RANGE } from "../src/core/minimal-coord.ts";
import { INDICATION_KINDS } from "../src/core/domain/types.ts";
import { MICRO_CONFIG_IDS, INVERSE_MICRO_CONFIG_IDS } from "../src/core/indications/micro-family.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_LIVE = "0";
process.env.CTS_CORE_AUTOSTART = "0";
process.env.CTS_CORE_COMPARE = "0";
process.env.CTS_CORE_VARIANTS = "0";
process.env.CTS_CORE_SYNTHETIC_END = String(Date.UTC(2026, 9, 19));
const opt = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const out = resolve(opt("out", "runs/micro-stress-120"));
mkdirSync(out, { recursive: true });
const settings = {
  symbols: 120, historyDays: 2, tfDays: { 1: 2, 5: 2, 15: 2 }, tfs: [1, 5, 15], tfMin: 1,
  focus: [...MICRO_CONFIG_IDS, ...INVERSE_MICRO_CONFIG_IDS].map((id) => `follow|${id}`), pinned: [],
  disabledKinds: INDICATION_KINDS.filter((k) => k !== "micro" && k !== "inverse"),
  signals: { enabled: false }, exitStrategy: { enabled: false },
  toggles: { ...DEFAULT_SETTINGS.toggles, normal: true, trailing: true, exit: false,
    block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  grid: { ...DEFAULT_SETTINGS.grid, tp: [], general: false, long: false, minimal: false, short: false,
    minimalPlus: { ...MINIMAL_PLUS_RANGE, enabled: false, lastN: 50, minPf: 1.35 },
    micro: { ...MICRO_RANGE, tp: [0.002], slOfTp: [1, 2], trailOfTp: [0, 0.5], maxHoldMin: 60 } },
  live: { enabled: true, mode: "overall" },
};
const rt = new CoreRuntime(new CoreDb(":memory:"), settings, {
  market: "synthetic", priceStream: null, replay: true,
  evaluationFromT: Number(process.env.CTS_CORE_SYNTHETIC_END) - 12 * 3_600_000,
});
rt.updateSettings({}, { preH: 6, simH: 6, causalBase: true });
let active = 0, maxCompute = 0, nativeChecks = 0, kicks = 0, maxRssMb = 0;
const samples = [];
const original = rt.compute.bind(rt);
rt.compute = async (...args) => {
  maxCompute = Math.max(maxCompute, ++active);
  try { return await original(...args); } finally { active--; }
};
rt.liveOrdersActive = true;
rt.onLive = async () => { nativeChecks++; };
const started = performance.now();
const sample = () => {
  const rssMb = process.memoryUsage().rss / 1048576;
  maxRssMb = Math.max(maxRssMb, rssMb);
  samples.push({ ms: Math.round(performance.now() - started), rssMb, state: rt.status.state,
    computes: rt.status.computes, paperSteps: rt.status.paperSteps ?? 0, nativeChecks,
    progress: { ...rt.status.executionProgress } });
};
const watch = setInterval(sample, 1000);
let failure = null;
try {
  rt.start();
  const end = Date.now() + 600_000;
  let storm = false;
  while ((rt.status.paperSteps ?? 0) < 1 || rt.status.computes < 2) {
    if (Date.now() > end) throw new Error("120-symbol runtime did not finish its two queued computations");
    if (active && !storm) {
      storm = true;
      // All requests during the same compute must coalesce, never launch concurrent computes.
      for (let i = 0; i < 100; i++) { rt.kick(); kicks++; }
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.equal(rt.candles.size, 120);
  assert.equal(maxCompute, 1);
  assert.equal(kicks, 100);
  assert.ok(nativeChecks > 5, "execution kept progressing during the compute storm");
  assert.equal(rt.status.executionProgress?.intervalMs, 100);
  assert.equal(rt.status.errorsInRow, 0);
  assert.equal(rt.status.executionProgress?.error, null);
} catch (error) {
  failure = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  clearInterval(watch);
  rt.stop();
  await rt.liveSettled(2000);
  sample();
  const summary = { schema: "cts-micro-load-v1", source: "synthetic functional load, no exchange executions",
    scope: "120 symbols; all 616 Micro/mirror identities; 1/5/15m singles and combinations; four Micro protects; two real runtime computations; 100 coalesced kicks. Full four-range financial grid measured separately on 20 real symbols.",
    settings: rt.settings, wf: rt.wf, elapsedMs: performance.now() - started, maxRssMb,
    maxCompute, kicks, nativeChecks, computes: rt.status.computes, paperSteps: rt.status.paperSteps,
    symbols: rt.candles.size, progress: rt.status.executionProgress, status: rt.status, failure, samples };
  writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ out, elapsedMs: summary.elapsedMs, maxRssMb, maxCompute, kicks,
    nativeChecks, computes: summary.computes, symbols: summary.symbols, progress: summary.progress, failure }));
  rt.dispose();
  await closePool();
}
