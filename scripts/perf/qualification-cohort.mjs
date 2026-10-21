#!/usr/bin/env node
// Exact current qualification snapshot of a fixed previously post-Base reference cohort. No venue calls.
import "../lib/core-test-offline-guard.cjs";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { barsFromCandles, headBars, resample } from "../../src/core/market/bars.ts";
import { makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { basePass } from "../../src/core/server/runtime.server.ts";
import { rangeMinTfOf, microIndRule } from "../../src/core/minimal-coord.ts";
import {
  buildTapes,
  baseAllowsTape,
  configEval,
  configDirectionEval,
  defaultWalkForward,
  kindExecutable,
} from "../../src/core/sim/walkforward.ts";
import { profitFactor } from "../../src/core/metrics/stats.ts";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const H = 3_600_000,
  M = 60_000;
const digest = (v) => createHash("sha256").update(v).digest("hex");
const sourcePaths = [];
const visit = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory()) visit(path);
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) sourcePaths.push(path);
  }
};
visit("src/core");
const sourceManifest = Object.fromEntries(
  sourcePaths.sort().map((path) => [path, digest(readFileSync(path))]),
);
const sourceSha256 = digest(JSON.stringify(sourceManifest));
const harnessSha256 = digest(readFileSync(new URL(import.meta.url)));
const study = arg("study", "runs/inverse-20-24h-lowmem-final");
const protocol = JSON.parse(readFileSync(`${study}/protocol.json`));
const frozen = JSON.parse(readFileSync(`${study}/result.json`));
const executions = JSON.parse(gunzipSync(readFileSync(`${study}/executions.json.gz`)));
const feedBytes = readFileSync(arg("feed"));
assert.equal(digest(feedBytes), protocol.feedSha256);
let feed = JSON.parse(gunzipSync(feedBytes));
const steps = Number(arg("steps", 45));
const cut = protocol.startT + Number(arg("cut-hours", 12)) * H;
assert.ok(Number.isInteger(steps) && steps > 0 && steps <= 60 && cut + steps * M <= protocol.endT);
const settings = structuredClone(protocol.settings ?? DEFAULT_SETTINGS);
settings.live.enabled = false;
const base = basePass(frozen.qualifiedBaseRows, settings);
const wf = {
  ...defaultWalkForward(settings),
  ...protocol.wf,
  basePassed: new Set(base.qualified.map((r) => `${r.bot}|${r.ind}`)),
  basePassedRanges: base.qualifiedTags,
  basePassedTargets: base.qualifiedTps,
  baseWideLadderPairs: base.wideLadderPairs,
};
const ids = new Set(
  executions.settled.filter((t) => t.entryT < cut && t.exitT <= cut).map((t) => t.cfg),
);
assert.ok(ids.size > 0, "cohort identities require earlier settled post-Base execution evidence");
const pairs = new Set([...ids].map((id) => id.split("|").slice(0, 2).join("|")));
const floors = {
  minSl: settings.protectFloor.minSl,
  minTrail: settings.protectFloor.minTrail,
  pairTags: base.pairTags,
  pairTps: base.pairTps,
  rangeMinTf: rangeMinTfOf(settings.grid),
  microOwnInds: microIndRule(settings.grid),
  onlyIds: ids,
};
const dcaOpt = { protects: wf.dcaProtects, dca: wf.dca, axis: settings.axis };
const physicalStart = protocol.startT - 120 * H;
const all = protocol.symbols.flatMap((sym) =>
  [1, 5, 15].map((tf) => ({
    ...barsFromCandles(
      sym,
      tf,
      resample(
        feed.candles[`${sym}|1`].filter((c) => c.t >= physicalStart && c.t < cut + steps * M),
        1,
        tf,
      ),
    ),
    lanes: [1, 5, 15],
  })),
);
feed = null;
globalThis.gc?.();
const seedBars = all.map((b) => headBars(b, cut));
let universe = makeUniverse(seedBars);
const buildStart = performance.now();
let candidates = buildTapes(
  universe,
  wf.protects,
  settings.cost,
  dcaOpt,
  pairs,
  settings.tactics,
  undefined,
  floors,
);
const candidateBuildMs = performance.now() - buildStart;
const qualified = candidates.filter(
  (tp) =>
    baseAllowsTape(tp, wf) && kindExecutable(tp.kind, wf.toggles) && configEval(tp, cut, wf).ok,
);
assert.ok(qualified.length > 0, "do not benchmark an empty qualified cohort");
const byStrategy = {},
  byRange = {};
for (const tp of candidates) {
  const passed = qualified.includes(tp),
    tag = tp.protect.tag ?? "wide";
  for (const [map, key] of [
    [byStrategy, tp.kind],
    [byRange, tag],
  ]) {
    const row = (map[key] ??= { built: 0, evaluated: 0, passed: 0 });
    row.built++;
    row.evaluated++;
    if (passed) row.passed++;
  }
}
const configs = qualified.map((tp) => ({
  id: tp.id,
  kind: tp.kind,
  range: tp.protect.tag ?? "wide",
  selection: configEval(tp, cut, wf),
  directions: [1, -1].map((side) => {
    const ev = configDirectionEval(tp, cut, wf, side),
      requested = wf.rangeOpts?.[tp.protect.tag ?? "wide"]?.validLastN ?? wf.validLastN;
    const idx = [];
    for (let i = 0; i < tp.n; i++) if (tp.side[i] === side && tp.exitT[i] <= cut) idx.push(i);
    const own = idx.slice(-requested);
    let gp = 0,
      gl = 0;
    for (const i of own) {
      assert.ok(Number.isFinite(tp.r[i]));
      gp += Math.max(0, tp.r[i]);
      gl += Math.max(0, -tp.r[i]);
    }
    return {
      side,
      ok: ev.ok,
      ...(!ev.ok ? { fail: ev.fail } : {}),
      windowN: ev.n,
      windowPf: ev.pf,
      lastNRequested: requested,
      lastN: own.length,
      lastNPf: profitFactor(gp, gl),
      lastNGp: gp,
      lastNGl: gl,
      noLoss: gp > 0 && gl === 0,
      fromT: own.length ? tp.exitT[own[0]] : null,
      toT: own.length ? tp.exitT[own.at(-1)] : null,
    };
  }),
}));
const result = {
  sourceSha256,
  sourceManifest,
  harnessSha256,
  feedSha256: protocol.feedSha256,
  protocolSha256: digest(readFileSync(`${study}/protocol.json`)),
  cut,
  symbols: protocol.symbols,
  timeframes: [1, 5, 15],
  candidateBuildMs,
  classification:
    "Current re-evaluation of a fixed previously post-Base executed reference cohort; modeled config/direction windows overlap and are not owned funded execution or a portfolio PF",
  archivedBaseRowsConsidered: frozen.qualifiedBaseRows.length,
  basePairsPassed: base.qualified.length,
  earlierExecutedIds: ids.size,
  candidatesBuilt: candidates.length,
  configGateEvaluated: candidates.length,
  passedConfigs: configs.length,
  gateSettings: {
    validLastN: wf.validLastN,
    lastN: wf.lastN,
    longH: wf.longH,
    preH: wf.preH,
    gates: wf.gates,
  },
  byStrategy,
  byRange,
  configs,
};
writeFileSync(arg("out", "runs/qualification-current.json"), JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({
    passedConfigs: configs.length,
    evaluated: candidates.length,
    directions: configs.flatMap((x) => x.directions).filter((x) => x.ok).length,
    sourceSha256,
  }),
);
