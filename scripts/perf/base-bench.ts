// Base (engine stage 1) benchmark on real candles, one thread: the time and the CPU profile of `baseRuns` over the
// combos a compute sends to the workers, for a few symbols of a desk snapshot.
//
//   node --experimental-strip-types --no-warnings [--cpu-prof --cpu-prof-dir=DIR] scripts/perf/base-bench.ts \
//     --db runs/x02-live2/core.sqlite [--desk runs/x02-desk.json] [--symbols 4] [--combos 0 (all)]
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { allCombos, baseRangeProtects, baseRuns, makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { signalCombos } from "../../src/core/signals.ts";
import { signalSettings } from "../../src/core/signal-config.ts";
import { microIndRule, rangeMinTfOf } from "../../src/core/minimal-coord.ts";
import { barsFromCandles, resample } from "../../src/core/market/bars.ts";

const arg = (k: string, d?: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const desk = arg("desk") ? JSON.parse(fs.readFileSync(arg("desk")!, "utf8")) : {};
const ds = desk.settings ?? {};
const s = { ...DEFAULT_SETTINGS, ...ds, grid: { ...DEFAULT_SETTINGS.grid, ...(ds.grid ?? {}) } } as typeof DEFAULT_SETTINGS;
const db = new DatabaseSync(arg("db")!, { readOnly: true });
const syms = (db.prepare("select sym, count(*) n from candles group by sym order by n desc, sym").all() as Array<{ sym: string }>)
  .slice(0, Number(arg("symbols", "4")))
  .map((r) => r.sym);
const bars = [];
for (const sym of syms) {
  const cs = db.prepare("select t, o, h, l, c, v from candles where sym = ? order by t").all(sym) as never[];
  for (const tf of s.tfs ?? [s.tfMin]) {
    const c = tf === s.tfMin ? cs : resample(cs, s.tfMin, tf);
    const n = Math.round(((s.tfDays?.[String(tf)] ?? s.historyDays) * 24 * 60) / tf);
    bars.push(barsFromCandles(sym, tf, c.length > n ? c.slice(c.length - n) : c));
  }
}
const u = makeUniverse(bars);
const micro = microIndRule(s.grid);
let combos = [
  ...allCombos(s.focus ?? [], s.disabledKinds, s.tfs, micro ? (rangeMinTfOf(s.grid ?? {}).mc ?? 0) : 0),
  ...signalCombos(signalSettings(s.signals), s.tfs),
];
const cap = Number(arg("combos", "0"));
if (cap > 0) combos = combos.slice(0, cap);
const t0 = performance.now();
const runs = baseRuns(
  u,
  combos,
  s.cost,
  s.tactics,
  true,
  true,
  undefined,
  baseRangeProtects(s.grid, s.cost),
  rangeMinTfOf(s.grid),
  micro,
  s.gates,
);
const ms = performance.now() - t0;
let trades = 0;
for (const r of runs as Array<{ full?: { n?: number } }>) trades += r?.full?.n ?? 0;
// --hash: a digest of every run's result (ids, stats, per-symbol stats, open and pending) — two builds of the code
// must print the same digest
const hash = process.argv.includes("--hash")
  ? createHash("sha1").update(JSON.stringify(runs)).digest("hex").slice(0, 16)
  : undefined;
console.log(
  JSON.stringify({ hash, symbols: syms.length, series: u.bars.length, combos: combos.length, runs: runs.length, trades, ms: Math.round(ms) }),
);
