#!/usr/bin/env node
// CTS-A-O — an independent evaluation of a desk's configuration over a historic window: the engine computes the
// window from scratch on real BingX data (pre-historic + simulated hours, every config possibility), then the
// Real-stage book is split by strategy type, range, indication family and signal source: closes, PF, net, win
// rate, green hours. Groups with at least --min-n closes and PF below --off-pf are proposed off, as a settings
// patch (toggles, grid ranges, disabledKinds, signal sources) for the desk.
//
//   node --experimental-strip-types scripts/core-eval-configs.mjs --settings runs/x01/x01.json \
//     [--pre 20] [--run 24] [--min-n 10] [--off-pf 1.0] --out runs/x01/eval
import { readFileSync, writeFileSync } from "node:fs";

const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { kindOfInd } = await import("../src/core/sim/walkforward.ts");
const { isSignalInd, laneOf } = await import("../src/core/indications/registry.ts");
const { rangeOfId, RANGE_LABEL } = await import("../src/core/minimal-coord.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const settingsPath = arg("settings");
if (!settingsPath) throw new Error("--settings is required");
const patch = JSON.parse(readFileSync(settingsPath, "utf8"));
const preH = Number(arg("pre", 20));
const runH = Number(arg("run", 24));
const minN = Number(arg("min-n", 10));
const offPf = Number(arg("off-pf", 1.0));
const out = arg("out", "runs/eval");

const rt = new CoreRuntime(new CoreDb(":memory:"), { ...patch, live: { ...(patch.live ?? {}), enabled: false } }, { market: "bingx" });
rt.updateSettings({}, { preH, simH: runH });
const t0 = Date.now();
rt.start();
while (rt.status.computes < 1) {
  if (rt.status.state === "error" && Date.now() - t0 > 900_000) throw new Error(rt.status.error ?? "engine error");
  await new Promise((r) => setTimeout(r, 1000));
}
rt.stop();
const sim = rt.sim;
if (!sim) throw new Error("no simulated run");
const H = 3_600_000;
const acc = () => ({ n: 0, w: 0, gp: 0, gl: 0, hours: new Map() });
const groups = { type: {}, range: {}, indication: {}, signal: {}, symbol: {} };
const all = acc();
const add = (g, k, x) => {
  const a = (g[k] ??= acc());
  for (const t of [a]) {
    t.n++;
    if (x.r > 0) {
      t.w++;
      t.gp += x.r;
    } else t.gl -= x.r;
    const h = Math.floor(x.exitT / H);
    t.hours.set(h, (t.hours.get(h) ?? 0) + x.r);
  }
};
for (const x of sim.trades) {
  const ind = x.cfg.split("|")[1] ?? "";
  add(groups, "_", x);
  add(groups.type, x.kind ?? "normal", x);
  const r = rangeOfId(x.cfg);
  add(groups.range, r ? RANGE_LABEL[r] : "Wide", x);
  // a signal source trades a short and a medium lane (…-s / …-m); it is switched per source, both lanes together
  if (isSignalInd(ind)) add(groups.signal, laneOf(ind).base.slice(4).replace(/-[sm]$/, ""), x);
  else add(groups.indication, kindOfInd(ind), x);
  add(groups.symbol, x.sym, x);
}
const fin = (a) => {
  const pf = a.gl > 1e-12 ? a.gp / a.gl : a.gp > 0 ? 99 : 0;
  const hs = [...a.hours.values()];
  return {
    n: a.n,
    pf: +pf.toFixed(3),
    net: +((a.gp - a.gl) * 100).toFixed(3),
    wr: +(a.n ? a.w / a.n : 0).toFixed(3),
    greenHours: +(hs.length ? hs.filter((v) => v > 0).length / hs.length : 0).toFixed(3),
    hours: hs.length,
  };
};
// the selection funnel: what was evaluated, what passed, what traded, and how many configs were open at once
const traded = new Map();
const evs = [];
for (const x of sim.trades) {
  traded.set(x.cfg, (traded.get(x.cfg) ?? 0) + 1);
  if (x.entryT != null) evs.push([x.entryT, 1], [x.exitT, -1]);
}
evs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
let openNow = 0;
let openMax = 0;
for (const [, d] of evs) openMax = Math.max(openMax, (openNow += d));
const perCfg = [...traded.values()].sort((a, b) => a - b);
const funnel = {
  baseEvaluated: rt.status.baseEvaluated ?? null,
  basePassed: rt.status.basePassed ?? null,
  mainPairs: rt.status.mainPairs ?? null,
  tapes: rt.tapes.length,
  tradedConfigs: traded.size,
  tradesPerConfigMedian: perCfg.length ? perCfg[Math.floor(perCfg.length / 2)] : 0,
  tradesPerConfigMax: perCfg.length ? perCfg[perCfg.length - 1] : 0,
  openPositionsMax: openMax,
  gates: rt.settings.gates,
  wf: { validLastN: rt.wf.validLastN, lastN: rt.wf.lastN, portfolio: rt.wf.portfolio, familySeats: rt.wf.familySeats },
};
const res = { window: { startT: sim.startT, endT: sim.endT }, funnel, all: fin(groups._ ?? all), groups: {} };
for (const [g, m] of Object.entries(groups)) {
  if (g === "_") continue;
  res.groups[g] = Object.fromEntries(Object.entries(m).map(([k, a]) => [k, fin(a)]));
}
// the patch: losing groups with enough closes go off
const off = (m) => Object.entries(m).filter(([, v]) => v.n >= minN && v.pf < offPf).map(([k]) => k);
const settings = {};
const typeKey = { normal: "normal", trailing: "trailing", block: "block", "block-active": "blockActive", dca: "dca", "dca-active": "dcaActive", axis: "axis" };
const typesOff = off(res.groups.type).filter((k) => typeKey[k]);
if (typesOff.length) settings.toggles = Object.fromEntries(typesOff.map((k) => [typeKey[k], false]));
const rangeKey = { Micro: "micro", Minimal: "minimal", Short: "short", General: "general", Long: "long" };
const rangesOff = off(res.groups.range).filter((k) => rangeKey[k]);
if (rangesOff.length) settings.grid = Object.fromEntries(rangesOff.map((k) => [rangeKey[k], false]));
const kindsOff = off(res.groups.indication).filter((k) => k !== "none");
if (kindsOff.length) settings.disabledKinds = [...new Set([...(patch.disabledKinds ?? []), ...kindsOff])];
const sigOff = Object.entries(res.groups.signal).filter(([, v]) => v.n >= Math.max(5, minN / 2) && v.pf < offPf).map(([k]) => k);
if (sigOff.length) settings.signals = { sources: Object.fromEntries(sigOff.map((k) => [k, false])) };
res.patch = { settings, off: { types: typesOff, ranges: rangesOff, indications: kindsOff, signals: sigOff } };
writeFileSync(`${out}.json`, JSON.stringify(res, null, 1));
const t = (ms) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");
const md = [
  `# Configuration evaluation: ${t(sim.startT)} → ${t(sim.endT)} UTC`,
  ``,
  `${preH} h pre-historic + ${runH} h simulated, real BingX 1m data, ${rt.settings.symbols} symbols (${rt.settings.symbolRank}), the desk's settings with every config possibility computed. A group with at least ${minN} closes and PF below ${offPf} is switched off.`,
  ``,
  `Selection: ${funnel.baseEvaluated} Base combos evaluated → ${funnel.basePassed} passed Base → ${funnel.mainPairs} Main pairs → ${funnel.tapes} tapes → ${funnel.tradedConfigs} configs traded (median ${funnel.tradesPerConfigMedian}, max ${funnel.tradesPerConfigMax} closes each); at most ${funnel.openPositionsMax} positions open at once. Gates ${JSON.stringify(funnel.gates)}; validation ${JSON.stringify(funnel.wf)}.`,
  ``,
  `Whole book: ${res.all.n} closes, PF ${res.all.pf}, net ${res.all.net} %, WR ${(res.all.wr * 100).toFixed(1)} %, green hours ${(res.all.greenHours * 100).toFixed(0)} % of ${res.all.hours}.`,
  ``,
];
for (const [g, m] of Object.entries(res.groups)) {
  md.push(`## By ${g}`, ``, `| ${g} | closes | PF | net % | WR | green hours | verdict |`, `|---|---:|---:|---:|---:|---:|---|`);
  for (const [k, v] of Object.entries(m).sort((a, b) => b[1].n - a[1].n))
    md.push(
      `| ${k} | ${v.n} | ${v.pf} | ${v.net} | ${(v.wr * 100).toFixed(1)} % | ${(v.greenHours * 100).toFixed(0)} % | ${v.n < (g === "signal" ? Math.max(5, minN / 2) : minN) ? "too few closes" : v.pf < offPf ? "**off**" : "on"} |`,
    );
  md.push(``);
}
md.push(`## Patch`, ``, "```json", JSON.stringify(res.patch, null, 1), "```", ``);
writeFileSync(`${out}.md`, md.join("\n"));
console.log(md.slice(0, 6).join("\n"));
console.log(JSON.stringify(res.patch.off));
process.exit(0);
