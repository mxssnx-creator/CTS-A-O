// Tapes (engine stage 2 input) benchmark on real candles, one thread: the time of `buildTapesGen` over every combo ×
// protect cell of the default grid, as a tapes worker runs it, and a digest of every tape (ids, exit and entry times,
// returns) — two builds of the code must print the same digest.
//
//   node --experimental-strip-types --no-warnings scripts/perf/tapes-bench.ts --db runs/x02-live2/core.sqlite \
//     [--desk runs/x02-desk.json] [--symbols 4] [--tf 15]
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { allCombos, makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { buildTapesGen, protectGrid } from "../../src/core/sim/walkforward.ts";
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
const combos = allCombos(s.focus ?? [], s.disabledKinds, s.tfs, 0);
const only = new Set(combos.map((c) => `${c.bot}|${c.ind}`));
const t0 = performance.now();
const gen = buildTapesGen(u, protects, s.cost, undefined, only, s.tactics, null, null);
let r = gen.next();
while (!r.done) r = gen.next();
const tapes = r.value;
const ms = performance.now() - t0;
const h = createHash("sha1");
let trades = 0;
for (const tp of tapes) {
  trades += tp.n;
  h.update(`${tp.id}|${tp.n}|`);
  h.update(Buffer.from(tp.exitT.buffer, tp.exitT.byteOffset, tp.exitT.byteLength));
  h.update(Buffer.from(tp.r.buffer, tp.r.byteOffset, tp.r.byteLength));
}
console.log(
  JSON.stringify({ hash: h.digest("hex").slice(0, 16), symbols: syms.length, series: u.bars.length, protects: protects.length, combos: only.size, tapes: tapes.length, trades, ms: Math.round(ms) }),
);
