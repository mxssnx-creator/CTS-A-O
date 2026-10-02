#!/usr/bin/env node
// CTS-A-O — Block sweep on real market data: the engine computes the tapes once (N symbols, real BingX 1m data,
// optionally replayed H hours ago), then every Block variant runs the walk-forward on those same tapes (Real stage:
// types shared / additive / overall, Block Active and its minimum level, block count, ratio, volume steps, pause,
// sources), plus every TP range on its own. One JSON line per variant, a summary table at the end.
//
//   CTS_CORE_WORKERS=1 node --experimental-strip-types scripts/core-block-sweep.mjs --symbols 12 --pre 12 --run 24 \
//     [--end-ago 24] [--stage 1|2|3] [--best runs/blk/best.json] [--settings '{…}'] --out runs/blk/w0
import { writeFileSync } from "node:fs";

const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { walkForward } = await import("../src/core/sim/walkforward.ts");
const { rangeOfId, RANGE_LABEL } = await import("../src/core/minimal-coord.ts");
const { fetchHistory, fetchKlines } = await import("../src/core/market/bingx.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const symbols = Number(arg("symbols", 12));
const preH = Number(arg("pre", 12));
const runH = Number(arg("run", 24));
const endAgo = Number(arg("end-ago", 0));
const stage = Number(arg("stage", 1));
const out = arg("out", "runs/blk/sweep");
const settingsExtra = JSON.parse(arg("settings", "{}"));
const bestPath = arg("best", "");

// replay the market as it was `endAgo` hours ago (the same cut core-session.mjs uses: only bars closed by then)
const cutT = endAgo > 0 ? Math.floor(Date.now() / 3_600_000) * 3_600_000 - endAgo * 3_600_000 : 0;
const keep = (cs, tf) => cs.filter((c) => c.t + tf * 60_000 <= cutT);
const feed = cutT
  ? {
      history: async (sym, tf, bars, opt = {}) => keep(await fetchHistory(sym, tf, bars, { ...opt, nowT: cutT }), tf),
      klines: async (sym, tf, opt = {}) =>
        keep(await fetchKlines(sym, tf, { ...opt, endT: Math.min(opt.endT ?? cutT, cutT - 1), nowT: cutT }), tf),
    }
  : null;
const rt = new CoreRuntime(
  new CoreDb(":memory:"),
  { symbols, signals: { enabled: false }, ...settingsExtra },
  { market: "bingx", ...(feed ? { feed } : {}) },
);
rt.updateSettings({}, { preH, simH: runH });
const t0 = Date.now();
let rssMax = 0;
const rssT = setInterval(() => (rssMax = Math.max(rssMax, process.memoryUsage().rss)), 500);
rt.start();
while (rt.status.computes < 1) {
  if (rt.status.state === "error" && Date.now() - t0 > 900_000) throw new Error(rt.status.error ?? "engine error");
  await new Promise((r) => setTimeout(r, 1000));
}
rt.stop();
clearInterval(rssT);
const computeS = (Date.now() - t0) / 1000;
process.stderr.write(
  `tapes ${rt.tapes.length} · ${symbols} symbols · compute ${computeS.toFixed(0)} s · RSS max ${Math.round(rssMax / 1e6)} MB\n`,
);

const SRC4 = { config: false, overall: true, symbol: true, direction: true, indication: true, type: false };
const SRC_DEF = { config: true, overall: true, symbol: true, direction: true, indication: false, type: false };
const base = rt.wf;
function run(name, patch, tapes = rt.tapes) {
  const o = {
    ...base,
    ...(patch.wf ?? {}),
    toggles: { ...base.toggles, ...(patch.toggles ?? {}) },
    block: { ...base.block, ...(patch.block ?? {}) },
    gates: { ...base.gates, ...(patch.gates ?? {}) },
  };
  const t = Date.now();
  const sim = walkForward(rt.lastUniverse, tapes, o);
  const s = sim.stats;
  const tr = sim.trades;
  const vols = tr.map((x) => x.mult ?? 1);
  const raised = vols.filter((v) => v > 1 + 1e-9).length;
  const byRange = {};
  for (const x of tr) {
    const k = RANGE_LABEL[rangeOfId(x.cfg)];
    const a = (byRange[k] ??= { n: 0, gp: 0, gl: 0 });
    a.n++;
    if (x.r > 0) a.gp += x.r;
    else a.gl -= x.r;
  }
  const legs = {};
  for (const x of tr) for (const k of Object.keys(x.legs ?? {})) legs[k] = (legs[k] ?? 0) + 1;
  return {
    name,
    patch,
    n: s.n,
    pf: +s.pf.toFixed(3),
    gp: +s.gp.toFixed(3),
    gl: +s.gl.toFixed(3),
    net: +s.net.toFixed(2),
    wr: +s.wr.toFixed(3),
    mdd: +s.mdd.toFixed(2),
    ddt: +s.ddt.toFixed(1),
    gh: +s.gh.toFixed(3),
    avgVol: +(vols.reduce((a, v) => a + v, 0) / Math.max(1, vols.length)).toFixed(3),
    maxVol: +Math.max(1, ...vols).toFixed(3),
    raised,
    skipActive: sim.skips.blockActive ?? 0,
    skipNormalOff: sim.skips.normalOff ?? 0,
    legs,
    byRange: Object.fromEntries(
      Object.entries(byRange).map(([k, a]) => [
        k,
        { n: a.n, gp: +(a.gp * 100).toFixed(3), gl: +(a.gl * 100).toFixed(3), pf: +(a.gl > 1e-12 ? a.gp / a.gl : a.gp > 0 ? 99 : 0).toFixed(3) },
      ]),
    ),
    ms: Date.now() - t,
  };
}

const variants = [];
const add = (name, patch) => variants.push([name, patch]);
if (stage === 1) {
  // baselines
  add("no-block normal", { toggles: { block: false, blockActive: false, normal: true } });
  add("no-block default", { toggles: { block: false, blockActive: false } });
  // types × Active (off / min 1..3) × block count × ratio, sources overall+symbol+direction+indication
  for (const mode of ["shared", "additive", "overall"])
    for (const act of [0, 1, 2, 3])
      for (const maxLevel of [4, 6, 8])
        for (const ratio of [0.2, 0.35, 0.5])
          add(`${mode} act${act} L${maxLevel} r${ratio}`, {
            toggles: { block: true, blockActive: act > 0, normal: true },
            block: { mode, sources: SRC4, maxLevel, minActiveLevel: Math.max(1, act), ratio, maxMult: 2.5, steps: 0, pause: 0 },
          });
} else if (stage === 2) {
  // the best stage-1 configs × volume steps × pause × max multiple
  const best = JSON.parse(await import("node:fs").then((f) => f.readFileSync(bestPath, "utf8")));
  for (const b of best)
    for (const steps of [0, 3, 6])
      for (const pause of [0, 2, 4])
        for (const maxMult of [2, 2.5, 3])
          add(`${b.name} st${steps} p${pause} m${maxMult}`, {
            toggles: b.patch.toggles,
            block: { ...b.patch.block, steps, pause, maxMult },
          });
} else if (stage === 4) {
  // verification: exactly the variants of the --best file
  const best = JSON.parse(await import("node:fs").then((f) => f.readFileSync(bestPath, "utf8")));
  for (const b of best) add(b.name, b.patch);
} else if (stage === 5) {
  // max stack 8× for every type: the best config of each type × max multiple × volume steps × ratio
  add("no-block normal", { toggles: { block: false, blockActive: false, normal: true } });
  const best = [
    ["shared act1 L4", { mode: "shared", maxLevel: 4, minActiveLevel: 1 }],
    ["additive act1 L4", { mode: "additive", maxLevel: 4, minActiveLevel: 1 }],
    ["overall act2 L8", { mode: "overall", maxLevel: 8, minActiveLevel: 2 }],
  ];
  for (const [n, b] of best)
    for (const maxMult of [2, 4, 8])
      for (const steps of [0, 3, 7])
        for (const ratio of [0.5, 1])
          add(`${n} r${ratio} m${maxMult} st${steps}`, {
            toggles: { block: true, blockActive: true, normal: true },
            block: { ...b, sources: SRC4, ratio, maxMult, steps, pause: 0 },
          });
} else if (stage === 6) {
  // max drawdown ratio (DDR) gate thresholds on the default settings (0 = off)
  for (const maxDdr of [0, 3, 2, 1.5, 1, 0.75, 0.5]) add(`ddr ${maxDdr || "off"}`, { gates: { maxDdr } });
  add("ddr off, no block", { gates: { maxDdr: 0 }, toggles: { block: false, blockActive: false, normal: true } });
  add("ddr 1, no block", { gates: { maxDdr: 1 }, toggles: { block: false, blockActive: false, normal: true } });
} else if (stage === 7) {
  // high PF with many orders: seat caps (every evaluated config may trade), positions cap, coordination, stack
  const wfv = [
    ["seats 16 (default)", {}],
    ["seats 32", { portfolio: 32 }],
    ["seats unlimited", { portfolio: 0 }],
    ["seats unlimited, no lane minimum", { portfolio: 0, laneSeats: 0 }],
    ["seats unlimited, family seats", { portfolio: 0, familySeats: true, familyNeedsBase: false }],
    ["seats unlimited, positions unlimited", { portfolio: 0, maxPositions: 0 }],
    ["seats 32, positions unlimited", { portfolio: 32, maxPositions: 0 }],
  ];
  const coordv = [
    ["", null],
    [" · confirm off", { confirm: false }],
    [" · conflict on", { conflict: true }],
  ];
  for (const [wn, w] of wfv)
    for (const [cn, c] of coordv) {
      if (c && wn !== "seats 16 (default)" && wn !== "seats unlimited") continue;
      add(`${wn}${cn}`, { wf: { ...w, ...(c ? { coord: { ...base.coord, ...c } } : {}) } });
    }
  for (const [wn, w] of [["seats 16 (default)", {}], ["seats unlimited", { portfolio: 0 }]]) {
    add(`${wn} · stack 4×`, { wf: w, block: { maxMult: 4, steps: 3 } });
    add(`${wn} · stack 2×`, { wf: w, block: { maxMult: 2, steps: 1 } });
    add(`${wn} · Block off`, { wf: w, toggles: { block: false, blockActive: false, normal: true } });
  }
} else if (stage === 3) {
  // the best stage-2 configs × sources (overall group, default group, config alone) × Normal on/off
  const best = JSON.parse(await import("node:fs").then((f) => f.readFileSync(bestPath, "utf8")));
  for (const b of best)
    for (const [sn, src] of [
      ["osdi", SRC4],
      ["def", SRC_DEF],
      ["cfg", { config: true }],
      ["osdi+cfg", { ...SRC4, config: true }],
    ])
      for (const normal of [true, false])
        add(`${b.name} src:${sn} normal:${normal ? "on" : "off"}`, {
          toggles: { ...b.patch.toggles, normal },
          block: { ...b.patch.block, sources: src },
        });
}

const rows = [];
for (const [name, patch] of variants) {
  const r = run(name, patch);
  rows.push(r);
  process.stdout.write(JSON.stringify(r) + "\n");
}
// every TP range on its own (stages 1 and 4): the same tapes filtered by range tag, the default Block settings
const rangeRows = [];
if (stage === 1 || stage === 4)
  for (const tag of ["mn", "sh", "gn", "lg"]) {
    const tapes = rt.tapes.filter((t) => t.protect?.tag === tag);
    if (tapes.length) rangeRows.push(run(`range ${RANGE_LABEL[tag]}`, {}, tapes));
  }
writeFileSync(
  `${out}.json`,
  JSON.stringify(
    { symbols, preH, runH, endAgo, stage, computeS, rssMaxMb: Math.round(rssMax / 1e6), tapes: rt.tapes.length, rows, rangeRows },
    null,
    1,
  ),
);
process.stderr.write(`wrote ${out}.json: ${rows.length} variants\n`);
process.exit(0);
