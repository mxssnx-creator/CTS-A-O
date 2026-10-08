#!/usr/bin/env node
// Micro gross-edge scan (research, 8 Oct): every Micro indication (lanes 5m / 15m / 30m and their c variants) × bot ×
// exit cell, built by the engine's own tape builder on the engine's own candles (a read-only copy of a desk database).
//
// Exit cells: ATR cells (stop = sl × ATR(14), target = tpRatio × stop) and fixed cells (stop = k × target, trailing a
// share of the target). Each cell is built twice: at the round-trip cost (0.2 %) and at cost 0 (gross edge).
//
// Pre-screen on the training data only (20 Sep – 4 Oct): a cell survives when its net PF > 1 with at least --min-n
// closes. Survivors are then read on the two 12 h windows (rally 5 Oct 15:00 → 6 Oct 03:00; latest 7 Oct 12:00 → 8 Oct
// 00:00). The scan reports every cell it built; nothing is chosen for the desk here.
//
//   node --experimental-strip-types --no-warnings scripts/micro-scan.mjs --db <copy.sqlite> [--symbols 30]
//     [--combos 0] [--min-n 200] [--out docs/sims/micro-scan-2026-10-08/scan.md] [--csv cells.csv]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const dbPath = arg("db");
if (!dbPath) {
  console.error("usage: micro-scan.mjs --db <copy of a desk's core.sqlite> [--symbols N] [--combos N] [--min-n N] [--out file]");
  process.exit(2);
}
const symbolLimit = Number(arg("symbols", 0));
const comboLimit = Number(arg("combos", 0));
const minN = Number(arg("min-n", 200));
const outPath = arg("out", "");
const csvPath = arg("csv", "");
const COST = 0.002;
const H = 3_600_000;
const WINDOWS = {
  training: [Date.parse("2026-09-20T00:00:00Z"), Date.parse("2026-10-04T00:00:00Z")],
  rally: [Date.parse("2026-10-05T15:00:00Z"), Date.parse("2026-10-06T03:00:00Z")],
  latest: [Date.parse("2026-10-07T12:00:00Z"), Date.parse("2026-10-08T00:00:00Z")],
};

const { DatabaseSync } = await import("node:sqlite");
const { DEFAULT_SETTINGS } = await import("../src/core/config.ts");
const { makeUniverse, allCombos } = await import("../src/core/pipeline/pipeline.ts");
const { buildTapesGen } = await import("../src/core/sim/walkforward.ts");
const { laneOf } = await import("../src/core/indications/registry.ts");
const { isMicroInd } = await import("../src/core/indications/micro.ts");
const { barsFromCandles, resample } = await import("../src/core/market/bars.ts");

// ── candles: the base series (1 m) of every symbol in the copy, the lanes resampled from it ──
const db = new DatabaseSync(dbPath, { readOnly: true });
const from = WINDOWS.training[0] - 2 * 24 * H;
const to = WINDOWS.latest[1];
const rows = db.prepare("SELECT sym, t, o, h, l, c, v FROM candles WHERE t >= ? AND t < ? ORDER BY sym, t").all(from, to);
db.close();
const bySym = new Map();
for (const r of rows) {
  let a = bySym.get(r.sym);
  if (!a) bySym.set(r.sym, (a = []));
  a.push({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v });
}
let syms = [...bySym.keys()].sort();
if (symbolLimit > 0) syms = syms.slice(0, symbolLimit);
const LANES = [5, 15, 30];
const bars = [];
for (const sym of syms) {
  const cs = bySym.get(sym);
  for (const tf of LANES) bars.push(barsFromCandles(sym, tf, tf === 1 ? cs : resample(cs, 1, tf)));
}
const u = makeUniverse(bars);

// ── combos: every Micro indication on every lane (c variants included) with the bots given (default follow and
// revert, the two bots that take a stretch's direction or its fade; the other eight paired with the same indications
// trade the same stretches on other rules and are measured separately) ──
const botList = arg("bots", "follow,revert").split(",").filter(Boolean);
let combos = allCombos(undefined, undefined, LANES, 0).filter((c) => isMicroInd(laneOf(c.ind).base) && botList.includes(c.bot));
if (comboLimit > 0) combos = combos.slice(0, comboLimit);

// ── exit cells: tagged Micro, so no lane scaling and no global stop floor touch them ──
// ATR cells: stop = sl × ATR(14) in {1, 1.5, 2, 3}, target = tpRatio × stop in {1, 1.5, 2, 3} (the targets 1.5 and 2
// ATR at a 1 ATR stop among them). Fixed cells: target tp in {0.3, 0.6, 1.2} %, stop k × target in {1.75, 3.5} with a
// trail of 0 or half the target: the gross range the Micro table lacks (its targets are 0.1–0.4 % net).
const protects = [];
for (const sl of [1, 1.5, 2, 3])
  for (const tpRatio of [1, 1.5, 2, 3])
    protects.push({ tp: 0.01, sl: 0.01, trail: 0, hold: 24, atr: { sl, tpRatio }, tag: "mc" });
for (const tp of [0.003, 0.006, 0.012])
  for (const k of [1.75, 3.5])
    for (const share of [0, 0.5])
      protects.push({ tp, sl: tp * k, trail: share * tp, hold: 24, tag: "mc" });

/** the exit cell's name, read from its distances (an ATR cell: its stop and target multiples) */
function cellLabel(p) {
  if (p.atr) return `atr sl${p.atr.sl} t${p.atr.tpRatio}`;
  return `fixed tp${p.tp} sl×${(p.sl / p.tp).toFixed(2)} tr${(p.trail / p.tp).toFixed(1)}`;
}

/** The closes of one tape in a window (by entry): n, and the profit factor of r in percent. */
function statsIn(tp, [a, b]) {
  let n = 0;
  let gp = 0;
  let gl = 0;
  for (let i = 0; i < tp.n; i++) {
    const t = tp.entryT[i];
    if (t < a || t >= b) continue;
    const r = tp.r[i] * 100;
    n++;
    if (r > 0) gp += r;
    else gl -= r;
  }
  return { n, pf: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0 };
}

// Each chunk of combos is built at the round-trip cost and at cost 0, summarized, and dropped: the tapes of all
// combos together would not fit in memory.
const CHUNK = Number(arg("chunk", 24));
const t0 = Date.now();
const cells = [];
let built = 0;
for (let i = 0; i < combos.length; i += CHUNK) {
  const only = new Set(combos.slice(i, i + CHUNK).map((c) => `${c.bot}|${c.ind}`));
  const buildAt = (cost) => {
    const g = buildTapesGen(u, protects, cost, undefined, only, null, null, null);
    let step;
    do step = g.next();
    while (!step.done);
    return step.value;
  };
  const net = buildAt(COST);
  const grossById = new Map(buildAt(0).map((tp) => [tp.id, tp]));
  for (const tp of net) {
    const tr = statsIn(tp, WINDOWS.training);
    built++;
    if (tr.n === 0) continue;
    const g = grossById.get(tp.id);
    cells.push({
      id: tp.id,
      bot: tp.bot,
      ind: tp.ind,
      cell: cellLabel(tp.protect),
      trainingN: tr.n,
      trainingNet: tr.pf,
      trainingGross: g ? statsIn(g, WINDOWS.training).pf : NaN,
      rally: statsIn(tp, WINDOWS.rally),
      latest: statsIn(tp, WINDOWS.latest),
      rallyGross: g ? statsIn(g, WINDOWS.rally) : null,
      latestGross: g ? statsIn(g, WINDOWS.latest) : null,
    });
  }
  process.stderr.write(`  combos ${Math.min(i + CHUNK, combos.length)}/${combos.length} · ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
}
process.stderr.write(
  `micro-scan: ${syms.length} symbols · ${combos.length} Micro combos (bots ${botList.join("/")}, lanes ${LANES.join("/")}) · ` +
    `${protects.length} exit cells · ${built} tapes built at net and gross cost\n`,
);

const survivors = cells.filter((c) => c.trainingN >= minN && c.trainingNet > 1);
survivors.sort((a, b) => b.trainingNet - a.trainingNet);
const fmt = (x) => (Number.isFinite(x) ? x.toFixed(2) : x === Infinity ? "∞" : "–");

const lines = [];
lines.push(`# Micro gross-edge scan (8 Oct)`);
lines.push("");
lines.push(
  `${syms.length} symbols · ${combos.length} Micro combos (bots ${botList.join(", ")}; lanes 5m / 15m / 30m with their c variants) · ` +
    `${protects.length} exit cells · cost 0.2 % (net) and 0 (gross) · pre-screen: net PF > 1 with ≥ ${minN} closes on the training data (20 Sep – 4 Oct).`,
);
lines.push("");
lines.push(`Cells that pass the pre-screen: ${survivors.length} of ${cells.length} with at least one training close.`);
lines.push("");
lines.push("| indication | bot | exit cell | training n | training PF net | training PF gross | rally n · PF net | latest n · PF net |");
lines.push("|---|---|---|---:|---:|---:|---:|---:|");
for (const c of survivors.slice(0, 60))
  lines.push(
    `| ${c.ind} | ${c.bot} | ${c.cell} | ${c.trainingN} | ${fmt(c.trainingNet)} | ${fmt(c.trainingGross)} | ` +
      `${c.rally.n} · ${fmt(c.rally.pf)} | ${c.latest.n} · ${fmt(c.latest.pf)} |`,
  );
lines.push("");
// the best gross PF of every exit cell over every indication: where a Micro edge would show before costs
lines.push("## Best gross PF per exit cell (training, any indication)");
lines.push("");
lines.push(`| exit cell | cells with ≥ ${minN} closes | best training PF gross | indication | bot |`);
lines.push("|---|---:|---:|---|---|");
const byCell = new Map();
for (const c of cells) {
  if (c.trainingN < minN || !Number.isFinite(c.trainingGross)) continue;
  const x = byCell.get(c.cell) ?? { n: 0, best: -Infinity, ind: "", bot: "" };
  x.n++;
  if (c.trainingGross > x.best) Object.assign(x, { best: c.trainingGross, ind: c.ind, bot: c.bot });
  byCell.set(c.cell, x);
}
for (const [k, x] of [...byCell.entries()].sort((a, b) => b[1].best - a[1].best))
  lines.push(`| ${k} | ${x.n} | ${fmt(x.best)} | ${x.ind} | ${x.bot} |`);
lines.push("");
lines.push(`(scan wall time ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
if (csvPath) {
  // every cell built, one row each: the training, rally and latest closes and PF (net, and gross where built)
  const head = ["indication", "bot", "exit_cell", "train_n", "train_pf_net", "train_pf_gross", "rally_n", "rally_pf_net", "latest_n", "latest_pf_net", "rally_pf_gross", "latest_pf_gross"];
  const num = (x) => (Number.isFinite(x) ? x.toFixed(4) : x === Infinity ? "inf" : "");
  const rows = cells.map((c) =>
    [c.ind, c.bot, c.cell, c.trainingN, num(c.trainingNet), num(c.trainingGross), c.rally.n, num(c.rally.pf), c.latest.n, num(c.latest.pf),
      c.rallyGross ? num(c.rallyGross.pf) : "", c.latestGross ? num(c.latestGross.pf) : ""].join(","),
  );
  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(csvPath, [head.join(","), ...rows].join("\n") + "\n");
}
const md = lines.join("\n") + "\n";
if (outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md);
}
process.stdout.write(md);
