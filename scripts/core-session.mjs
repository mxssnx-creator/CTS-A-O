#!/usr/bin/env node
// CTS-A-O — a complete simulated trading session on real BingX data, reported hour by hour.
// Runs the ENGINE itself (Base → Main → Real over every timeframe lane, strategy and Block / DCA / Axis),
// with a pre-historic window before the simulated run, and reports per hour: balance (from a start balance),
// equity with open positions marked to market every minute, equity drawdown, margin used, PF overall and per
// strategy, DDT, and orders / positions.
//
//   node --experimental-strip-types scripts/core-session.mjs [--symbols 12] [--pre 6] [--run 6] [--balance 10]
//        [--pct 0.02 | --sizing fixed --notional 5] [--leverage 10] [--tactics off|all] [--out docs/session]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { profitFactor, statsOf } = await import("../src/core/metrics/stats.ts");
const { closedPositions, openTimeline } = await import("../src/core/positions.ts");
const { laneLabel } = await import("../src/core/indications/registry.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const symbols = Number(arg("symbols", 12));
const preH = Number(arg("pre", 6));
const runH = Number(arg("run", 6));
const balance0 = Number(arg("balance", 10));
const notional = Number(arg("notional", 5)); // fixed sizing: USD per order volume unit
// default sizing: a fixed % of equity per order (compounding from the start balance)
const sizing = { mode: arg("sizing", "equityPct") === "fixed" ? "fixed" : "equityPct", pct: Number(arg("pct", 0.02)) };
const leverage = Number(arg("leverage", 10));
const tacticsMode = arg("tactics", "off");
const signalsOn = arg("signals", "on") === "on";
const H = 3_600_000;
const M = 60_000;

const allTactics = {
  session: true,
  volRegime: true,
  trendStrength: true,
  cooldown: true,
  cooldownBars: 4,
};
const rt = new CoreRuntime(
  new CoreDb(":memory:"),
  {
    symbols,
    ...(tacticsMode === "all" ? { tactics: allTactics } : {}),
    signals: { enabled: signalsOn },
  },
  { market: "bingx" },
);
// extra walk-forward options, e.g. --wf '{"portfolio":24,"familySeats":false}'
const wfExtra = JSON.parse(arg("wf", "{}"));
// strategy toggles, e.g. --toggles '{"normal":false}'
const togglesExtra = JSON.parse(arg("toggles", "{}"));
// any settings patch, e.g. --settings '{"block":{"maxLevel":6,"minActiveLevel":1}}'
const settingsExtra = JSON.parse(arg("settings", "{}"));
if (Object.keys(settingsExtra).length) rt.updateSettings(settingsExtra);
if (Object.keys(togglesExtra).length) rt.updateSettings({ toggles: { ...rt.settings.toggles, ...togglesExtra } });
rt.updateSettings({}, { preH, simH: runH, ...wfExtra });
const t0 = Date.now();
let rssMax = 0;
const rssT = setInterval(() => (rssMax = Math.max(rssMax, process.memoryUsage().rss)), 500);
rt.start();
process.stderr.write(
  `session: ${symbols} symbols · ${preH}h pre-historic · ${runH}h simulated · tactics ${tacticsMode}\n`,
);
while (rt.status.computes < 1) {
  if (rt.status.state === "error" && Date.now() - t0 > 600_000)
    throw new Error(rt.status.error ?? "engine error");
  await new Promise((r) => setTimeout(r, 1000));
  if ((Date.now() - t0) % 15_000 < 1000)
    process.stderr.write(
      `  ${rt.status.state} ${rt.status.stage} ${Math.round((rt.status.progress ?? 0) * 100)}% ${rt.status.label}\n`,
    );
}
rt.stop();
clearInterval(rssT);
const sim = rt.sim;
if (!sim) throw new Error("no simulated run");
const trades = [...sim.trades].sort((a, b) => a.exitT - b.exitT);
const { sizeBook, orderKey } = await import("../src/core/sizing.ts");
const sized = sizeBook(trades, [], { balance: balance0, sizing, fixedNotional: notional });
const unit = (x) => sized.units.get(orderKey(x)) ?? notional;
const units = trades.map(unit);
const startT = sim.startT;
const endT = sim.endT;

// minute closes per symbol (for mark-to-market)
const closeAt = new Map();
for (const [sym, cs] of rt.candles) {
  const m = new Map();
  for (const c of cs) m.set(c.t, c.c);
  closeAt.set(sym, m);
}
const px = (sym, t) => {
  const m = closeAt.get(sym);
  if (!m) return null;
  for (let k = 0; k < 5; k++) {
    const v = m.get(t - k * M);
    if (v !== undefined) return v;
  }
  return null;
};
const cost = rt.settings.cost;

// minute-by-minute equity: realized (closed before t) + open orders marked to market at t
let realized = 0;
let peak = balance0;
let maxDd = 0;
let maxDdPct = 0;
const hours = [];
let ti = 0;
for (let h = startT; h < endT; h += H) {
  const hh = {
    t: h,
    orders: 0,
    gp: 0,
    gl: 0,
    net: 0,
    marginMax: 0,
    eqMin: Infinity,
    eqEnd: 0,
    openEnd: 0,
    openPosEnd: 0,
  };
  for (let t = h; t < Math.min(h + H, endT); t += M) {
    while (ti < trades.length && trades[ti].exitT <= t) {
      const x = trades[ti++];
      realized += x.r * unit(x);
    }
    let mtm = 0;
    let margin = 0;
    const open = trades.filter((x) => x.entryT <= t && x.exitT > t);
    const posKeys = new Set();
    for (const x of open) {
      const p = px(x.sym, t);
      // vol = volume units held (DCA legs × Block multiple); r and the margin scale with it
      const vol = x.vol ?? 1;
      if (p !== null) mtm += ((x.side * (p - x.entry)) / x.entry - cost) * unit(x) * vol;
      margin += (unit(x) * vol) / leverage;
      posKeys.add(`${x.sym}|${x.side}`);
    }
    const eq = balance0 + realized + mtm;
    peak = Math.max(peak, eq);
    if (peak - eq > maxDd) {
      maxDd = peak - eq;
      maxDdPct = (peak - eq) / peak;
    }
    hh.marginMax = Math.max(hh.marginMax, margin);
    hh.eqMin = Math.min(hh.eqMin, eq);
    hh.eqEnd = eq;
    hh.openEnd = open.length;
    hh.openPosEnd = posKeys.size;
  }
  const closed = trades.filter((x) => x.exitT > h && x.exitT <= h + H);
  hh.orders = closed.length;
  hh.positions = closedPositions(closed);
  for (const x of closed) {
    if (x.r > 0) hh.gp += x.r;
    else hh.gl -= x.r;
    hh.net += x.r * unit(x);
  }
  hh.pf = profitFactor(hh.gp, hh.gl);
  hh.balance =
    balance0 + trades.filter((x) => x.exitT <= h + H).reduce((a, x) => a + x.r * unit(x), 0);
  hours.push(hh);
}

const group = (pred) => {
  const xs = trades.filter(pred);
  const s = statsOf(xs);
  return { n: s.n, pf: s.pf, net: xs.reduce((a, x) => a + x.r * unit(x), 0), wr: s.wr };
};
const st = statsOf(trades, endT);
const tl = openTimeline(trades, startT, endT);
const report = {
  at: new Date().toISOString(),
  symbols: rt.status.symbols,
  settings: {
    preH,
    runH,
    balance0,
    notional,
    sizing,
    unitMin: units.length ? Math.min(...units) : 0,
    unitMax: units.length ? Math.max(...units) : 0,
    leverage,
    tactics: tacticsMode,
    signals: signalsOn,
    wf: wfExtra,
    toggles: rt.settings.toggles,
    block: rt.settings.block,
    lanes: rt.settings.tfs,
    cost,
  },
  window: { startT, endT },
  total: {
    orders: st.n,
    positions: closedPositions(trades),
    pf: st.pf,
    net: trades.reduce((a, x) => a + x.r * unit(x), 0),
    wr: st.wr,
    ddtH: st.ddt,
    balanceEnd: balance0 + trades.reduce((a, x) => a + x.r * unit(x), 0),
    equityMaxDd: maxDd,
    equityMaxDdPct: maxDdPct,
    avgOpenOrders: tl.avgOrders,
    maxOpenOrders: tl.maxOrders,
    avgOpenPositions: tl.avgPositions,
    maxOpenPositions: tl.maxPositions,
    marginMax: Math.max(0, ...hours.map((h) => h.marginMax)),
  },
  strategies: {
    Normal: group((x) => x.kind === "normal"),
    Trailing: group((x) => x.kind === "trailing"),
    Axis: group((x) => x.kind === "axis"),
    DCA: group((x) => x.kind === "dca" || x.kind === "dca-active"),
    "Block-raised": group((x) => (x.mult ?? 1) > 1),
    Signals: group((x) => (x.cfg.split("|")[1] ?? "").includes("sig-")),
    "Engine (no signals)": group((x) => !(x.cfg.split("|")[1] ?? "").includes("sig-")),
  },
  lanes: Object.fromEntries(
    [...new Set(trades.map((x) => laneLabel(x.cfg.split("|")[1] ?? "") || "plain"))].map((l) => [
      l,
      group((x) => (laneLabel(x.cfg.split("|")[1] ?? "") || "plain") === l),
    ]),
  ),
  presets: rt.db.kvGet("presetSims")?.presets ?? {},
  hours,
  engine: {
    computeMs: rt.status.lastComputeMs,
    baseEvaluated: rt.status.baseEvaluated,
    basePassed: rt.status.basePassed,
    mainPairs: rt.status.mainPairs,
    tapes: rt.tapes.length,
    real: rt.paper.selected.length,
    signals: rt.status.signals ?? null,
    rssMaxMb: Math.round(rssMax / 1e6),
    mainPairs: rt.status.mainPairs,
    skips: sim.skips,
  },
};

const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const usd = (x) => `${x < 0 ? "-" : ""}$${Math.abs(x).toFixed(2)}`;
const hm = (t) => new Date(t).toISOString().slice(11, 16);
const T = report.total;
const lines = [
  `# Simulated trading session — ${symbols} symbols, ${preH} h pre-historic + ${runH} h run (tactics ${tacticsMode}, signals ${signalsOn ? "on" : "off"})`,
  ``,
  `Real BingX 1m data, every timeframe lane (${report.settings.lanes.join(" / ")} min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. ` +
    `Balance ${usd(balance0)}; ${sizing.mode === "fixed" ? `each order volume unit = ${usd(notional)} notional` : `each order volume unit = ${(sizing.pct * 100).toFixed(1)} % of equity at entry (${usd(report.settings.unitMin)}–${usd(report.settings.unitMax)})`} at ${leverage}×; ${(cost * 100).toFixed(2)} % round-trip cost on every close. ` +
    `Window ${new Date(startT).toISOString().slice(0, 16)} → ${new Date(endT).toISOString().slice(0, 16)} UTC. Engine: Base ${report.engine.basePassed}/${report.engine.baseEvaluated} passed, Main ${report.engine.mainPairs} pairs, ${report.engine.tapes} tapes, Real ${report.engine.real}, compute ${Math.round(report.engine.computeMs / 1000)} s.`,
  ``,
  `**Result:** balance ${usd(balance0)} → ${usd(T.balanceEnd)} (${f2(((T.balanceEnd - balance0) / balance0) * 100)} %) · PF ${f2(T.pf)} · ${T.positions} positions / ${T.orders} orders · WR ${f2(T.wr * 100)} % · DDT ${f2(T.ddtH)} h · equity max drawdown ${usd(T.equityMaxDd)} (${f2(T.equityMaxDdPct * 100)} %) · margin used max ${usd(T.marginMax)} · open avg ${f2(T.avgOpenPositions)} pos / ${f2(T.avgOpenOrders)} orders (peak ${T.maxOpenPositions} / ${T.maxOpenOrders})`,
  ``,
  `## Hour by hour`,
  ``,
  `| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |`,
  `|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
  ...hours.map(
    (h) =>
      `| ${hm(h.t)} | ${h.positions} / ${h.orders} | ${h.orders ? f2(h.pf) : "–"} | ${usd(h.net)} | ${usd(h.balance)} | ${usd(h.eqEnd)} | ${usd(h.eqMin)} | ${usd(h.marginMax)} | ${h.openPosEnd} / ${h.openEnd} |`,
  ),
  ``,
  `## Strategies`,
  ``,
  `| strategy | orders | PF | net | WR |`,
  `|---|---:|---:|---:|---:|`,
  ...Object.entries(report.strategies).map(
    ([k, v]) =>
      `| ${k} | ${v.n} | ${v.n ? f2(v.pf) : "–"} | ${usd(v.net)} | ${v.n ? f2(v.wr * 100) + " %" : "–"} |`,
  ),
  ``,
  `## Timeframe lanes`,
  ``,
  `| lane | orders | PF | net |`,
  `|---|---:|---:|---:|`,
  ...Object.entries(report.lanes).map(
    ([k, v]) => `| ${k} | ${v.n} | ${f2(v.pf)} | ${usd(v.net)} |`,
  ),
  ``,
  `## Execution presets on the same tapes`,
  ``,
  `| preset | orders | PF | net % of notional |`,
  `|---|---:|---:|---:|`,
  ...Object.values(report.presets).map(
    (p) => `| ${p.label} | ${p.stats?.n ?? 0} | ${f2(p.stats?.pf)} | ${f2(p.stats?.net)} |`,
  ),
  ``,
  `A ${runH} h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.`,
];
const md = lines.join("\n");
console.log(md);
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, md + "\n");
  writeFileSync(`${out}.json`, JSON.stringify(report, null, 2));
}
process.exit(0);
