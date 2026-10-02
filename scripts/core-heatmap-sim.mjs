#!/usr/bin/env node
// CTS-A-O — heatmap simulation: TP × SL ratio × trailing cells on real BingX data (12 symbols, the 15m reference
// lane, so every target is exact). The engine computes the tapes once per window, then per cell:
//   base  every tape of the cell (every indication × every symbol) over the window: closes, PF, net, win rate
//   wf    the Real-stage walk-forward with the heatmap probe (the best tape of every cell seated, Block off)
// One JSON per window; scripts/core-heatmap.mjs pools the windows with the live run into the HTML heatmap.
//
//   CTS_CORE_WORKERS=1 node --experimental-strip-types scripts/core-heatmap-sim.mjs --settings runs/hm/heatmap.json \
//     --end-ago 24 --out runs/hm/sim-w24
import { readFileSync, writeFileSync } from "node:fs";

const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { walkForward } = await import("../src/core/sim/walkforward.ts");
const { fetchHistory, fetchKlines } = await import("../src/core/market/bingx.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const preH = Number(arg("pre", 12));
const runH = Number(arg("run", 24));
const endAgo = Number(arg("end-ago", 0));
const out = arg("out", "runs/hm/sim");
const sArg = arg("settings", "{}");
const settings = JSON.parse(sArg.trim().startsWith("{") ? sArg : readFileSync(sArg, "utf8"));
delete settings.live;

const cutT = endAgo > 0 ? Math.floor(Date.now() / 3_600_000) * 3_600_000 - endAgo * 3_600_000 : 0;
const keep = (cs, tf) => cs.filter((c) => c.t + tf * 60_000 <= cutT);
const feed = cutT
  ? {
      history: async (sym, tf, bars, opt = {}) => keep(await fetchHistory(sym, tf, bars, { ...opt, nowT: cutT }), tf),
      klines: async (sym, tf, opt = {}) =>
        keep(await fetchKlines(sym, tf, { ...opt, endT: Math.min(opt.endT ?? cutT, cutT - 1), nowT: cutT }), tf),
    }
  : null;
const rt = new CoreRuntime(new CoreDb(":memory:"), settings, { market: "bingx", ...(feed ? { feed } : {}) });
rt.updateSettings({}, { preH, simH: runH, validLastN: 0 });
const t0 = Date.now();
rt.start();
while (rt.status.computes < 1) {
  if (rt.status.state === "error" && Date.now() - t0 > 900_000) throw new Error(rt.status.error ?? "engine error");
  await new Promise((r) => setTimeout(r, 1000));
}
rt.stop();
const sim = rt.sim;
const a = sim.startT;
const b = sim.endT;
const lb = (xs, n, t) => {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (xs[m] < t) lo = m + 1;
    else hi = m;
  }
  return lo;
};
// cell of a protect: TP %, SL ÷ TP, trailing ÷ TP (as the grid built it)
const cellOf = (p) => {
  const tp = +(p.tp * 100).toFixed(2);
  const sl = +(Math.round((p.sl / p.tp) * 4) / 4).toFixed(2);
  const tr = p.trail > 0 ? +(Math.round((p.trail / p.tp) * 4) / 4).toFixed(2) : 0;
  return `${tp}|${sl}|${tr}`;
};
const acc = () => ({ tapes: 0, n: 0, w: 0, gp: 0, gl: 0 });
const base = {};
// the heatmap cells are the plain and trailing configs (DCA / Axis tapes carry their own protects)
const { laneOf } = await import("../src/core/indications/registry.ts");
const cellTapes = rt.tapes.filter(
  (t) => (t.kind === "normal" || t.kind === "trailing") && (laneOf(t.ind).tf ?? 15) === 15,
);
for (const tp of cellTapes) {
  const k = cellOf(tp.protect);
  const x = (base[k] ??= acc());
  x.tapes++;
  const i0 = lb(tp.exitT, tp.n, a);
  const i1 = lb(tp.exitT, tp.n, b + 1);
  x.n += i1 - i0;
  x.gp += tp.gp[i1] - tp.gp[i0];
  x.gl += tp.gl[i1] - tp.gl[i0];
  for (let i = i0; i < i1; i++) if (tp.rs[i + 1] - tp.rs[i] > 0) x.w++;
}
// walk-forward with the heatmap probe: every cell's best tape seated, Block off
const byId = new Map(cellTapes.map((t) => [t.id, t]));
const o = { ...rt.wf, probe: { perRange: 0, perCell: 1 }, toggles: { ...rt.wf.toggles, block: false, blockActive: false } };
const wfSim = walkForward(rt.lastUniverse, cellTapes, o);
const wf = {};
for (const t of wfSim.trades) {
  const tp = byId.get(t.cfg);
  if (!tp) continue;
  const x = (wf[cellOf(tp.protect)] ??= acc());
  x.n++;
  if (t.r > 0) {
    x.w++;
    x.gp += t.r;
  } else x.gl -= t.r;
}
writeFileSync(
  `${out}.json`,
  JSON.stringify({
    endAgo,
    startT: a,
    endT: b,
    symbols: rt.status.symbols,
    tapes: cellTapes.length,
    computeS: (Date.now() - t0) / 1000,
    base,
    wf,
  }),
);
process.stderr.write(`wrote ${out}.json: ${rt.tapes.length} tapes, ${Object.keys(base).length} cells\n`);
process.exit(0);
