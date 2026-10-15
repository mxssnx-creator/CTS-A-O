#!/usr/bin/env node
// CTS-A Core v2 — hour-by-hour simulated trade run report for every strategy preset.
// Each run: 20h pre-calc before every hour, then 48h of simulated trading (walk-forward, honest).
//
//   node --experimental-strip-types scripts/core-hourly.mjs --cache <candles5m.json> [--tf 15] [--hours 48]
//        [--end 2026-09-26T00] [--presets a,b] [--patch '{"bots":["magnet"]}'] [--out docs/core-hourly]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DEFAULT_SETTINGS, PF_NO_LOSS, STRATEGY_PRESETS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { fetchHistory, fetchTickers, pickUniverse } from "../src/core/market/bingx.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward, walkForward } from "../src/core/sim/walkforward.ts";
import { walkForwardHourlyReport } from "./lib/walkforward-hourly-report.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const H = 3_600_000;
const tf = Number(arg("tf", 15));
const hours = Number(arg("hours", 48));

async function loadCandles() {
  const cache = arg("cache");
  if (cache && existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const syms = pickUniverse(await fetchTickers(), Number(arg("symbols", 40)));
  const out = {};
  for (const s of syms)
    out[s] = await fetchHistory(s, 5, Number(arg("days", 12)) * 288, { pauseMs: 100 });
  if (cache) writeFileSync(cache, JSON.stringify(out));
  return out;
}

const candles = await loadCandles();
let u = makeUniverse(
  Object.entries(candles).map(([s, c]) =>
    barsFromCandles(s, tf, resample(c, Number(arg("srctf", 5)), tf)),
  ),
);
const settings = { ...DEFAULT_SETTINGS, tfMin: tf };
const patch = JSON.parse(arg("patch", "{}"));
const base = { ...defaultWalkForward(settings), ...patch };
const tapes = buildTapes(u, base.protects, settings.cost, {
  protects: base.dcaProtects,
  dca: base.dca,
});
const endArg = arg("end");
const endT = endArg ? Date.parse(`${endArg}:00:00Z`) : Math.floor(u.nowT / H) * H;
const startT = endT - hours * H;

const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "–");
const pc = (x) => (Number.isFinite(x) ? `${f(x * 100, 0)}%` : "–");
const md = [];
const summary = [];
md.push(`# CTS-A Core v2 — hour-by-hour simulated runs`);
md.push("");
md.push(
  `${u.bars.length} symbols · ${tf}m bars · ${hours}h requested run ${new Date(startT).toISOString().slice(0, 13)}h → ${new Date(endT).toISOString().slice(0, 13)}h UTC · pre-calc ${base.preH}h · cost ${settings.cost * 100}% round trip · min PF ${base.gates.minPf} (neutral 1.0)`,
);
md.push(
  `Base tapes: ${tapes.length} (every indication × bot × protect × sub-strategy). Patch: \`${JSON.stringify(patch)}\``,
);
md.push("");
md.push(
  `Primary PF, net and counts use settled simulated one-unit net returns after costs. Open endpoint marks and size-weighted simulated results are separate diagnostics. GP/GL and net are percentage points. A no-loss PF uses the shared engine sentinel ${PF_NO_LOSS}, not an exact finite ratio. Exits at an hour boundary belong to the hour that just ended.`,
);
md.push("");

const summaryAt = md.length;
const PRESETS = STRATEGY_PRESETS;
const selected = arg("presets") ? arg("presets").split(",") : Object.keys(PRESETS);
for (const name of selected) {
  const p = PRESETS[name];
  const o = {
    ...base,
    ...p,
    toggles: { ...base.toggles, ...(p.toggles ?? {}) },
    startT,
    simH: hours,
  };
  const r = walkForward(u, tapes, o);
  const report = walkForwardHourlyReport(r);
  const s = report.stats;
  summary.push({
    name,
    ...s,
    basis: report.basis,
    returnUnits: report.returnUnits,
    startT: report.startT,
    endT: report.endT,
    byKind: report.byKind,
    hourly: report.hourly.map(({ t, stats }) => ({ t, ...stats })),
    endpointMarks: report.endpointMarks,
    withEndpointMarks: report.withEndpointMarks,
    sizedSimulation: report.sizedSimulation,
    skips: r.skips,
  });
  md.push(`## ${name}`);
  md.push("");
  md.push(
    `Toggles: ${Object.entries(o.toggles)
      .map(([k, v]) => `${k} ${v ? "on" : "off"}`)
      .join(" · ")}`,
  );
  md.push(
    `Actual simulated window: ${new Date(report.startT).toISOString()} → ${new Date(report.endT).toISOString()}.`,
  );
  if (s.pfBasis === "unavailable")
    md.push(
      `Primary return statistics unavailable: ${s.unknownReturns} of ${s.n} settled closes have unknown unit returns; no subset is substituted.`,
    );
  md.push(
    `**Settled total** n ${s.n} · WR ${pc(s.wr)} · return PF ${f(s.pf)}${s.noLoss ? " (no-loss sentinel)" : ""} · GP ${f(s.gp)} / GL ${f(s.gl)} · net ${f(s.net)}% · green active hours ${s.greenHours ?? "–"}/${s.hours ?? "–"} (${pc(s.gh)}) · worst hour ${f(s.worstHour)}% · MDD ${f(s.mdd)}% · DDT ${f(s.ddt, 1)}h`,
  );
  md.push(
    `Endpoint marks: n ${report.endpointMarks.n} · net ${f(report.endpointMarks.net)}%; settled + endpoint marks return PF ${f(report.withEndpointMarks.pf)}${report.withEndpointMarks.noLoss ? " (no-loss sentinel)" : ""} · n ${report.withEndpointMarks.n} · net ${f(report.withEndpointMarks.net)}%. Size-weighted simulated diagnostic: PF ${f(report.sizedSimulation.pf)}${report.sizedSimulation.noLoss ? " (no-loss sentinel)" : ""} · net ${f(report.sizedSimulation.net)}%.`,
  );
  md.push(
    `By kind: ${
      Object.entries(report.byKind)
        .map(
          ([k, v]) =>
            `${k} n${v.n} return PF ${f(v.pf)}${v.noLoss ? " (no-loss sentinel)" : ""} net ${f(v.net)}%`,
        )
        .join(" · ") || "–"
    }`,
  );
  md.push(
    `Skipped: ${
      Object.entries(r.skips)
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ") || "–"
    }`,
  );
  md.push("");
  md.push(
    "| hour (UTC) | closes | wins | losses | return PF | net % | cumulative % | normal | trailing | DCA | DCA active | Axis | avg Block level | avg DCA volume | real | skipped |",
  );
  md.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  let cum = 0;
  for (const { t, trades: xs, stats: hs, net } of report.hourly) {
    const kinds = { normal: 0, trailing: 0, dca: 0, "dca-active": 0, axis: 0 };
    let lvl = 0;
    let lvlN = 0;
    let legs = 0;
    let legN = 0;
    for (const x of xs) {
      const kind = x.kind ?? "normal";
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      if (x.kind === "dca" || x.kind === "dca-active") {
        legs += x.vol ?? 1;
        legN++;
      } else {
        lvl += x.level ?? 0;
        lvlN++;
      }
    }
    cum = Number.isFinite(cum) && Number.isFinite(net) ? cum + net : NaN;
    const step = r.steps.find((st) => st.t === t);
    md.push(
      `| ${new Date(t).toISOString().slice(5, 13).replace("T", " ")}:00 | ${hs.n} | ${hs.wins ?? "–"} | ${hs.losses ?? "–"} | ${hs.n ? f(hs.pf) + (hs.noLoss ? "*" : "") : "–"} | ${f(net)} | ${f(cum)} | ${kinds.normal} | ${kinds.trailing} | ${kinds.dca} | ${kinds["dca-active"]} | ${kinds.axis} | ${lvlN ? f(lvl / lvlN, 1) : "–"} | ${legN ? f(legs / legN, 1) : "–"} | ${step?.real.length ?? 0} | ${step?.skipped ?? 0} |`,
    );
  }
  md.push("");
  md.push(
    "PF marked with an asterisk is the shared no-loss sentinel, not a finite measured ratio.",
  );
  md.push("");
}

md.splice(
  summaryAt,
  0,
  "## Summary",
  "",
  "| preset | settled closes | WR | return PF | net % | green active hours | worst hour % | MDD % | DDT h |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...summary.map(
    (s) =>
      `| ${s.name} | ${s.n} | ${pc(s.wr)} | ${f(s.pf)}${s.noLoss ? "*" : ""} | ${f(s.net)} | ${s.greenHours ?? "–"}/${s.hours ?? "–"} | ${f(s.worstHour)} | ${f(s.mdd)} | ${f(s.ddt, 1)} |`,
  ),
  "",
);
const text = md.join("\n");
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, text);
  writeFileSync(
    `${out}.json`,
    JSON.stringify({ startT, endT, tf, symbols: u.bars.length, patch, summary }, null, 2),
  );
  console.error(`→ ${out}.md`);
} else console.log(text);
