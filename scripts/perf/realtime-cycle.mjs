#!/usr/bin/env node
// Exact production foreground-cycle benchmark on a previously sealed public-history cohort. No venue calls.
import "../lib/core-test-offline-guard.cjs";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { barsFromCandles, headBars, resample } from "../../src/core/market/bars.ts";
import { CandleSeries } from "../../src/core/market/candle-series.ts";
import { makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { CoreRuntime, basePass } from "../../src/core/server/runtime.server.ts";
import { CoreDb } from "../../src/core/server/db.server.ts";
import { rangeMinTfOf, microIndRule } from "../../src/core/minimal-coord.ts";
import {
  buildTapes,
  baseAllowsTape,
  configEval,
  defaultWalkForward,
  kindExecutable,
  walkForward,
  tapeTrades,
} from "../../src/core/sim/walkforward.ts";
import { modeledUnitStatsOf } from "../../src/core/metrics/stats.ts";

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
const qualifiedIds = new Set(qualified.map((tp) => tp.id));
const qualifiedHistory = modeledUnitStatsOf(
  qualified.flatMap((tp) => tapeTrades(tp, 0, tp.n).map((t) => ({ ...t, mult: 1 }))),
  cut,
);
const sim = walkForward(universe, qualified, { ...wf, startT: cut - 6 * H, simH: 6 });
candidates = null;
for (const cache of universe.caches) cache.clear();
universe = null;
globalThis.gc?.();
let clock = cut + 2_000;
const originalNow = Date.now;
Date.now = () => clock;
const rt = new CoreRuntime(new CoreDb(":memory:"), settings, {
  market: "bingx",
  priceStream: null,
});
const scheduled = [];
const cycleMs = [],
  fastMs = [],
  workerMs = [],
  ticks = [],
  failures = [];
const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();
try {
  rt.wf = wf;
  rt.tapes = qualified;
  rt.sim = sim;
  rt.dirty = false;
  rt.settingsStale = false;
  rt.paperStepped = true;
  rt.status.source = "bingx";
  rt.status.state = "running";
  rt.status.symbols = protocol.symbols;
  rt.status.lastBarT = cut - M;
  rt.nextResearchAt = cut + (steps + 1) * M; // Keep the endpoint close inside the isolated foreground window.
  rt.schedule = (ms) => scheduled.push(ms); // Exercise cycle() exactly; caller supplies its serialized clock.
  rt.syncMarket = async () => true; // Candles below are the already received, finalized exchange payload.
  rt.fastArgs = {
    main: { protects: wf.protects, dcaFor: dcaOpt, floors: { ...floors, onlyIds: qualifiedIds } },
    sig: { protects: [], dcaFor: undefined, floors: { minSl: 0, minTrail: 0 } },
    coord: { protects: [], dcaFor: undefined, floors: { minSl: 0, minTrail: 0 } },
    exit: { protects: [], dcaFor: undefined, floors: { minSl: 0, minTrail: 0 } },
    adjust: null,
    bars: seedBars,
  };
  for (const sym of protocol.symbols) {
    const b = seedBars.find((b) => b.sym === sym && b.tfMin === 1);
    const builder = CandleSeries.builder(b.n, steps + 32);
    for (let i = 0; i < b.n; i++) builder.push(b.t[i], b.o[i], b.h[i], b.l[i], b.c[i], b.v[i]);
    rt.candles.set(sym, builder.done());
  }
  rt.stepPaper();
  assert.ok(rt.paper.selected.length > 0, "actual production seating must retain eligible configs");
  const selected = rt.paper.selected.length;
  const initialPositions = rt.paper.positions.length;
  const bootstrapStart = performance.now();
  await rt.prepareRealtime();
  const bootstrapMs = performance.now() - bootstrapStart;
  assert.equal(rt.fastReady, true, rt.status.fast?.error ?? "bootstrap failed");
  console.log(
    JSON.stringify({
      phase: "warm",
      earlierExecutedIds: ids.size,
      built: qualifiedIds.size,
      selected,
      initialPositions,
      candidateBuildMs,
      bootstrapMs,
    }),
  );
  loop.reset();
  for (let step = 1; step <= steps; step++) {
    const nextEnd = cut + step * M;
    clock = nextEnd + 2_000;
    for (const sym of protocol.symbols) {
      const b = all.find((b) => b.sym === sym && b.tfMin === 1);
      const i = b.t.findIndex((t) => t === nextEnd - M);
      assert.ok(i >= 0);
      const old = rt.candles.get(sym);
      rt.candles.set(
        sym,
        old.append(
          [{ t: b.t[i], o: b.o[i], h: b.h[i], l: b.l[i], c: b.c[i], v: b.v[i] }],
          old.n + 1,
          steps + 32,
        ),
      );
    }
    rt.status.lastBarT = nextEnd - M;
    await rt.cycle();
    cycleMs.push(rt.status.lastCycleMs);
    fastMs.push(rt.status.fast?.ms ?? NaN);
    workerMs.push(rt.status.fast?.workerMs ?? NaN);
    if (
      rt.status.error ||
      rt.status.fast?.phase === "error" ||
      rt.status.cycleKind !== "incremental"
    )
      failures.push({
        step,
        error: rt.status.error,
        fast: rt.status.fast,
        kind: rt.status.cycleKind,
      });
    if (failures.length) break;
    const tickStart = performance.now();
    await rt.tick();
    ticks.push(performance.now() - tickStart);
    assert.equal(rt.status.tick?.count, step, "each measured tick must actually finish");
    assert.equal(rt.status.tick?.error, null);
    assert.ok(
      rt.paper.positions.every((p) => Number.isFinite(p.mtm)),
      "every open mark is finite",
    );
    if (step % 5 === 0 || process.env.CTS_CORE_PROFILE_REALTIME === "1")
      console.log(
        JSON.stringify({
          step,
          ms: cycleMs.at(-1),
          workerMs: workerMs.at(-1),
          profile: rt.status.fast?.workerProfile,
          positions: rt.paper.positions.length,
        }),
      );
  }
  const foregroundLoop = { p99: loop.percentile(99) / 1e6, max: loop.max / 1e6 };
  loop.disable(); // The independent full-history oracle below is outside foreground latency.
  const dist = (values) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return {
      n: sorted.length,
      min: sorted[0],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)],
      max: sorted.at(-1),
      over500: values.filter((ms) => ms >= 500).length,
    };
  };
  // An independent full-history rebuild verifies the continued tapes, not just a timer over empty work.
  // Keep it outside all foreground measurements and preserve every losing close and both open directions.
  const oracleStart = performance.now();
  let exactTapes = 0,
    exactCloses = 0;
  if (!failures.length) {
    const full = buildTapes(
      makeUniverse(all.map((b) => headBars(b, clock - 2_000))),
      wf.protects,
      settings.cost,
      dcaOpt,
      pairs,
      settings.tactics,
      undefined,
      { ...floors, onlyIds: qualifiedIds },
    );
    assert.equal(full.length, rt.tapes.length);
    const actual = new Map(rt.tapes.map((tp) => [tp.id, tp]));
    for (const expected of full) {
      const got = actual.get(expected.id);
      assert.ok(got, expected.id);
      for (const col of [
        "n",
        "syms",
        "entryT",
        "exitT",
        "r",
        "entry",
        "exit",
        "symI",
        "side",
        "reason",
        "bars",
        "vol",
        "level",
        "gp",
        "gl",
        "rs",
        "r2",
        "open",
        "pending",
      ])
        assert.deepEqual(got[col], expected[col], `${expected.id} ${col}`);
      exactTapes++;
      exactCloses += expected.n;
    }
  }
  const oracleMs = performance.now() - oracleStart;
  const result = {
    classification:
      "Retrospective latency/correctness benchmark; finalized candles already received, no network/venue latency or profitability claim",
    sourceSha256,
    sourceManifest,
    harnessSha256,
    protocolSha256: digest(readFileSync(`${study}/protocol.json`)),
    feedSha256: protocol.feedSha256,
    symbols: protocol.symbols,
    timeframes: [1, 5, 15],
    cut,
    clock:
      "Causal recorded bar-close clock; intervals invoked only after the previous invocation completes",
    researchIntervalMs: (steps + 1) * M,
    researchDefaultMs: 300_000,
    historicalCohort: {
      earlierExecutedIds: ids.size,
      consideredBasePassed: base.qualified.length,
      qualifiedConfigs: qualified.length,
      seatedConfigs: selected,
      initialPositions,
      overlappingQualifiedHistory: qualifiedHistory,
      idsSha256: digest([...qualifiedIds].sort().join("\n")),
    },
    oracle: {
      exactTapes,
      exactCloses,
      ms: oracleMs,
      method:
        "Full-history independent tape rebuild; every numeric column, prefix, open and pending position exactly equal",
    },
    candidateBuildMs,
    bootstrapMs,
    failures,
    cycles: dist(cycleMs),
    fast: dist(fastMs),
    workers: dist(workerMs),
    ticks: dist(ticks),
    series: { cycleMs, fastMs, workerMs, ticks },
    loop: foregroundLoop,
    end: {
      positions: rt.paper.positions.length,
      closed: rt.paper.trades.length,
      computes: rt.status.computes,
    },
    budget: {
      targetMs: 500,
      passed: cycleMs.length === steps && failures.length === 0 && cycleMs.every((ms) => ms < 500),
      scope:
        "Warmed foreground including merge/gates/learning/paper; finalized bars already received, cold discovery/research and network/venue excluded",
    },
    scheduled: scheduled.length,
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
  };
  writeFileSync(arg("out", "runs/realtime-cycle-benchmark.json"), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      cycles: result.cycles,
      workers: result.workers,
      ticks: result.ticks,
      failures: failures.length,
    }),
  );
  assert.equal(failures.length, 0);
} finally {
  loop.disable();
  rt.dispose();
  Date.now = originalNow;
}
