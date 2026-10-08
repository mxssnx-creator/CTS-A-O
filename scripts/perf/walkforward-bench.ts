// Walk-forward (engine stage 2 selection and the trades of each step) benchmark on real candles, one thread: the tapes
// of the default grid for a few symbols, then one walk-forward over them in fixed mode (as a desk runs it). Prints the
// time and a digest of the result (picks, orders, trades) — two builds of the code must print the same digest.
//
//   node --experimental-strip-types --no-warnings scripts/perf/walkforward-bench.ts --db runs/x02-live2/core.sqlite \
//     [--desk runs/x02-desk.json] [--symbols 4] [--simh 12] [--preh 24]
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { allCombos, makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { buildTapesGen, defaultWalkForward, protectGrid, walkForward } from "../../src/core/sim/walkforward.ts";
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
const protects = protectGrid(Number(arg("tf", "15")), s.grid, s.cost);
const only = new Set(allCombos(s.focus ?? [], s.disabledKinds, s.tfs, 0).map((c) => `${c.bot}|${c.ind}`));
const gen = buildTapesGen(u, protects, s.cost, undefined, only, s.tactics, null, null);
let r = gen.next();
while (!r.done) r = gen.next();
const tapes = r.value;
const o = {
  ...defaultWalkForward(s),
  mode: "fixed" as const,
  simH: Number(arg("simh", "12")),
  preH: Number(arg("preh", "24")),
  cost: s.cost,
};
const t0 = performance.now();
const res = walkForward(u, tapes, o as never);
const ms = performance.now() - t0;
const digest = createHash("sha1").update(JSON.stringify(res)).digest("hex").slice(0, 16);
console.log(
  JSON.stringify({ digest, symbols: syms.length, tapes: tapes.length, simH: o.simH, preH: o.preH, orders: (res as { trades?: unknown[] }).trades?.length ?? null, ms: Math.round(ms) }),
);
