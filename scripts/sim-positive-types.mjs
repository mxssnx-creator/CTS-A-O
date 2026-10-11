#!/usr/bin/env node
// The 12-hour test trade simulation of the families with a positive D1 profit factor (runs/eval/*.json, PF at 0.2 % > 1):
// one causal session (6 h pre-calculated, 12 h simulated) with every positive family on, then the trades by hour and by
// family. The window ends at the last closed hour of the feed (2026-10-11T12:00Z by default), so it runs partly after the
// freeze: it is a test of the positive types, not a holdout verdict.
//
//   node --experimental-strip-types scripts/sim-positive-types.mjs [--end-at 2026-10-11T12:00:00Z] [--pre 6] [--run 12]
//        [--feed runs/eval/feed.json] [--min-pf 1] [--min-trades 1] [--out docs/sims/positive-types-12h-2026-10-11]
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const END = arg("end-at", "2026-10-11T12:00:00Z");
const PRE = arg("pre", "6");
const RUN = arg("run", "12");
const FEED = arg("feed", "runs/eval/feed.json");
const MIN_PF = Number(arg("min-pf", "1"));
const MIN_TRADES = Number(arg("min-trades", "1"));
const OUT = arg("out", "docs/sims/positive-types-12h-2026-10-11");
const DUMP = join("runs", "sim12h", "positive-types.json");

// 1. the positive families from the D1 evaluation
const fams = readdirSync("runs/eval")
  .filter((f) => f.endsWith(".json") && f !== "feed.json")
  .map((f) => JSON.parse(readFileSync(join("runs/eval", f), "utf8")))
  .filter((x) => x.stats && x.stats.pf02 > MIN_PF && x.stats.trades >= MIN_TRADES)
  .sort((a, b) => b.stats.pf02 - a.stats.pf02);
if (!fams.length) {
  console.log("no family has a positive D1 PF: nothing to simulate");
  process.exit(0);
}
const labels = fams.map((f) => f.label);
console.log(`positive families (D1 PF at 0.2% > ${MIN_PF}, ≥ ${MIN_TRADES} trades): ${labels.length}`);

// 2. one causal session with all of them on: 6 h pre, 12 h run, the windows ending at END
mkdirSync(join("runs", "sim12h"), { recursive: true });
const env = { ...process.env, CTS_CORE_FAMILY: labels.join(";"), CTS_CORE_VARIANTS: "0", CTS_CORE_COMPARE: "0", CTS_CORE_WORKERS: "2", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" };
const t0 = Date.now();
const r = spawnSync(process.execPath, [
  "--max-old-space-size=3072", "--experimental-strip-types", "--no-warnings", "scripts/core-session.mjs",
  "--feed", FEED, "--end-at", END, "--pre", PRE, "--run", RUN, "--symbols", "60",
  "--signals", labels.some((l) => l.startsWith("sig ")) ? "on" : "off",
  "--toggles", JSON.stringify({ dca: false, dcaActive: false, block: false, blockActive: false, axis: false }),
  "--dump", DUMP, "--dump-only", "--quiet",
], { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0 || !existsSync(DUMP)) {
  console.error(`session failed (exit ${r.status}): ${(r.stderr || "").slice(-400)}`);
  process.exit(1);
}
const sec = (Date.now() - t0) / 1000;

// 3. the trades: by family, and by the hour they exited
const { botStatsFromRows, botFamilyOf } = await import("../src/core/bot-stats.ts");
const raw = JSON.parse(readFileSync(DUMP, "utf8"));
const trades = raw.trades ?? [];
const rows = trades.map((t) => ({ id: `${t.cfg}|${t.sym}|${t.side}|${t.entryT}`, cfg: t.cfg, sym: t.sym, side: t.side, entry: t.entry, exit: t.exit, exit_t: t.exitT, r: t.r, reason: t.reason }));
const fam = botStatsFromRows(rows).families;
const pf = (xs) => {
  let gp = 0, gl = 0;
  for (const v of xs) (v > 0 ? (gp += v) : (gl -= v));
  return gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl;
};
const f2 = (x) => (x === Infinity ? "∞" : x.toFixed(2));
const hourKey = (t) => Math.floor(t / 3_600_000) * 3_600_000;
const byHour = new Map();
for (const t of trades) (byHour.get(hourKey(t.exitT)) ?? byHour.set(hourKey(t.exitT), []).get(hourKey(t.exitT))).push(t.r);
const hours = [...byHour.keys()].sort((a, b) => a - b);

const lines = [];
lines.push(`# Positive-PF types: 12-hour test simulation (${END} window, ${PRE} h pre, ${RUN} h run)`);
lines.push("");
lines.push(`Generated ${new Date().toISOString()} · ${labels.length} positive families (D1 PF at 0.2 % > ${MIN_PF}) · ${trades.length} trades · wall ${sec.toFixed(0)} s.`);
lines.push("");
lines.push("This is a test simulation, not a holdout verdict: the families were chosen on D1, and the window overlaps the freeze (2026-10-11T11:03Z). Trades are not judged against the criteria; the report's own coverage checks do not apply to a filtered run.");
lines.push("");
lines.push(`**Overall:** PF ${f2(pf(trades.map((t) => t.r)))} at the stored cost · net ${(100 * trades.reduce((a, t) => a + t.r, 0)).toFixed(2)} % of notional (sum of trade returns).`);
lines.push("");
lines.push("## By family");
lines.push("");
lines.push("| family | D1 PF 0.2 % | D1 trades | 12 h trades | 12 h PF | 12 h net % |");
lines.push("|---|---:|---:|---:|---:|---:|");
for (const f of fams) {
  const xs = trades.filter((t) => botFamilyOf(t.cfg) === f.label);
  const net = xs.reduce((a, t) => a + t.r, 0) * 100;
  lines.push(`| ${f.label} | ${f2(f.stats.pf02)} | ${f.stats.trades} | ${xs.length} | ${xs.length ? f2(pf(xs.map((t) => t.r))) : "–"} | ${net.toFixed(2)} |`);
}
lines.push("");
lines.push("## By hour (exit hour, UTC)");
lines.push("");
lines.push("| hour | trades | PF | net % |");
lines.push("|---|---:|---:|---:|");
for (const h of hours) {
  const xs = byHour.get(h);
  lines.push(`| ${new Date(h).toISOString().slice(0, 13)}:00 | ${xs.length} | ${f2(pf(xs))} | ${(100 * xs.reduce((a, b) => a + b, 0)).toFixed(2)} |`);
}
lines.push("");
lines.push("## Families by 12-hour statistics (botStats)");
lines.push("");
lines.push("| family | trades | events | PF 0.2 % | PF 0.4 % | expectancy % | SQN | verdict |");
lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
for (const x of fam) lines.push(`| ${x.family} | ${x.trades} | ${x.events} | ${f2(x.pf02)} | ${f2(x.pf04)} | ${(100 * x.expectancy).toFixed(2)} | ${x.sqn.toFixed(2)} | ${x.verdict} |`);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "README.md"), lines.join("\n") + "\n");
console.log(`wrote ${OUT}/README.md: ${trades.length} trades in ${hours.length} hours, overall PF ${f2(pf(trades.map((t) => t.r)))}`);
