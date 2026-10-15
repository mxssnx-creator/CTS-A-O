#!/usr/bin/env node
// CTS-A Core v2 — strategy comparison on repeated 2-day walk-forward runs (20h pre-calc before each hour).
//
//   node --experimental-strip-types scripts/core-compare.mjs --cache <candles.json> [--tf 15] [--warm 8] [--out docs/core-compare]
//   --presets a,b,c   limit to presets · --variants '<json array of option patches>'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DEFAULT_SETTINGS, STRATEGY_PRESETS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { fetchHistory, fetchTickers, pickUniverse } from "../src/core/market/bingx.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward, walkForward } from "../src/core/sim/walkforward.ts";
import {
  comparisonAggregate,
  comparisonPfText,
  comparisonRunReport,
} from "./lib/walkforward-comparison-report.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const H = 3_600_000;
const tf = Number(arg("tf", 15));
const warmDays = Number(arg("warm", 8));

async function loadCandles() {
  const cache = arg("cache");
  if (cache && existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const syms = pickUniverse(await fetchTickers(), Number(arg("symbols", 40)));
  const out = {};
  for (const s of syms)
    out[s] = await fetchHistory(s, 5, Number(arg("days", 30)) * 288, { pauseMs: 100 });
  if (cache) writeFileSync(cache, JSON.stringify(out));
  return out;
}

const candles = await loadCandles();
const u = makeUniverse(
  Object.entries(candles).map(([s, c]) =>
    barsFromCandles(s, tf, resample(c, Number(arg("srctf", 5)), tf)),
  ),
);
const settings = { ...DEFAULT_SETTINGS, tfMin: tf };
const base = defaultWalkForward(settings);
const t0 = performance.now();
const tapes = buildTapes(u, base.protects, settings.cost, {
  protects: base.dcaProtects,
  dca: base.dca,
});
console.error(
  `Base tapes: ${tapes.length} (${u.bars.length} symbols, ${tf}m) in ${Math.round(performance.now() - t0)} ms`,
);

const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const pc = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : "–");
console.error(
  "Primary statistics: settled one-unit simulated net returns after costs. Sized simulation and endpoint marks are separate diagnostics; no-loss PF is the shared engine score.",
);
const PRESETS = STRATEGY_PRESETS;
const selected = arg("presets") ? arg("presets").split(",") : Object.keys(PRESETS);
const variants = JSON.parse(arg("variants", "[{}]"));
const rows = [];
for (const name of selected) {
  for (const v of variants) {
    const p = PRESETS[name];
    const all = [];
    const runs = [];
    for (let st = u.startT + warmDays * 24 * H; st + 48 * H <= u.nowT; st += 48 * H) {
      const o = {
        ...base,
        ...v,
        ...p,
        toggles: { ...base.toggles, ...(p.toggles ?? {}) },
        startT: Math.floor(st / H) * H,
      };
      const r = walkForward(u, tapes, o);
      const report = comparisonRunReport(r);
      all.push(...report.trades);
      runs.push(report.detail);
    }
    const s = comparisonAggregate(all, runs);
    const row = {
      preset: name,
      variant: v,
      ...s,
    };
    rows.push(row);
    console.log(
      `${name.padEnd(24)} ${JSON.stringify(v).padEnd(26)} settled runs ${row.positiveRuns ?? "–"}/${row.runs} positive (${row.unavailableRuns} unavailable) | n ${String(s.n).padStart(5)} (${f2(row.perDay)}/day) return PF ${comparisonPfText(s)} net ${f2(s.net)}% green hours ${pc(s.gh)} worst hr ${f2(s.worstHour)}% DDT ${f2(s.ddt)}h | sized simulated PF ${comparisonPfText(s.sizedSimulation)} net ${f2(s.sizedSimulation.net)}% · ${row.withEndpointMarksStableRuns ?? "–"} stable incl endpoint marks`,
    );
  }
}
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    `${out}.json`,
    JSON.stringify(
      { at: new Date().toISOString(), tf, symbols: u.bars.length, tapes: tapes.length, rows },
      null,
      2,
    ),
  );
}
