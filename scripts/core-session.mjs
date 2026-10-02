#!/usr/bin/env node
// CTS-A-O — a complete simulated trading session on real BingX data, reported hour by hour.
// Runs the ENGINE itself (Base → Main → Real over every timeframe lane, strategy and Block / DCA / Axis),
// with a pre-historic window before the simulated run, and reports per hour: balance (from a start balance),
// equity with open positions marked to market every minute, equity drawdown, margin used, PF overall and per
// strategy, DDT, and orders / positions.
//
//   node --experimental-strip-types scripts/core-session.mjs [--symbols 12] [--pre 6] [--run 6] [--balance 10]
//        [--pct 0.02 | --sizing fixed --notional 5] [--leverage 10] [--tactics default|off|all] [--signals on|off]
//        [--out docs/session]
//
// Settings (applied in this order, each on top of the previous):
//   --desk file.json   a desk snapshot { settings, wf } (e.g. docs/session-24h/desk-settings.json)
//   --all-on           the desk switches: every strategy toggle on, every indication kind on, micro range off,
//                      no position / order caps (engine and signals), coordination off, signals on their last 10
//   --focus all        every bot × indication combo in Base (an empty focus), instead of the default focus set
//   --min-pf 1.05      stage gate min PF
//   --settings '{…}' / --toggles '{…}' / --wf '{…}'   any further patch
// Outputs:
//   --out docs/x        docs/x.md + docs/x.json (the engine report)
//   --html docs/dir     docs/dir/index.html (standalone report with diagrams) + docs/dir/data.json
//   --writeup docs/x.md short write-up with the key tables and findings
//   --dump raw.json     the raw session (trades, minute closes, engine aggregates); --replay raw.json rebuilds
//                       every output from it without running the engine again
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const { profitFactor, statsOf } = await import("../src/core/metrics/stats.ts");
const { closedPositions, openTimeline } = await import("../src/core/positions.ts");
const { laneLabel, laneOf, isSignalInd, signalSourceOf } = await import("../src/core/indications/registry.ts");
const { rangeOfId, RANGE_LABEL } = await import("../src/core/minimal-coord.ts");
const { kindOfInd } = await import("../src/core/sim/walkforward.ts");
const { kindOfTrade } = await import("../src/core/statistics.ts");
const { sizeBook, orderKey } = await import("../src/core/sizing.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);
const H = 3_600_000;
const M = 60_000;
const balance0 = Number(arg("balance", 10));
const notional = Number(arg("notional", 5)); // fixed sizing: USD per order volume unit
// default sizing: a fixed % of equity per order (compounding from the start balance)
const sizing = { mode: arg("sizing", "equityPct") === "fixed" ? "fixed" : "equityPct", pct: Number(arg("pct", 0.02)) };
const leverage = Number(arg("leverage", 10));

// ── 1. the engine run (or a replay of a dumped one) ──────────────────────────────────────────────────────────
async function runEngine() {
  const symbols = Number(arg("symbols", 12));
  const preH = Number(arg("pre", 6));
  const runH = Number(arg("run", 6));
  // default = the engine's own tactics (trend strength + volatility regime on); off = every tactic off; all = all on
  const tacticsMode = arg("tactics", "default");
  const signalsOn = arg("signals", "on") === "on";
  const allTactics = { session: true, volRegime: true, trendStrength: true, cooldown: true, cooldownBars: 4 };
  const noTactics = { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 };
  const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
  const { fetchHistory, fetchKlines } = await import("../src/core/market/bingx.ts");
  const { CoreDb } = await import("../src/core/server/db.server.ts");
  // --end-ago H: replay the market as it was H hours ago (the engine only sees candles before that hour)
  const endAgo = Number(arg("end-ago", 0));
  const cutT = endAgo > 0 ? Math.floor(Date.now() / H) * H - endAgo * H : 0;
  function replayFeed(cut) {
    // only bars that closed by the cut
    const keep = (cs, tf) => cs.filter((c) => c.t + tf * 60_000 <= cut);
    return {
      history: async (sym, tf, bars, opt = {}) => keep(await fetchHistory(sym, tf, bars, { ...opt, nowT: cut }), tf),
      klines: async (sym, tf, opt = {}) =>
        keep(await fetchKlines(sym, tf, { ...opt, endT: Math.min(opt.endT ?? cut, cut - 1), nowT: cut }), tf),
    };
  }
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    {
      symbols,
      ...(tacticsMode === "all" ? { tactics: allTactics } : tacticsMode === "off" ? { tactics: noTactics } : {}),
      signals: { enabled: signalsOn },
    },
    { market: "bingx", ...(cutT ? { feed: replayFeed(cutT) } : {}) },
  );
  let wfAll = {};
  const deskFile = arg("desk");
  let desk = null;
  if (deskFile) {
    desk = JSON.parse(readFileSync(deskFile, "utf8"));
    rt.updateSettings(desk.settings ?? {});
    wfAll = { ...wfAll, ...(desk.wf ?? {}) };
  }
  if (flag("all-on")) {
    rt.updateSettings({
      toggles: { normal: true, trailing: true, block: true, blockActive: true, dca: true, dcaActive: true, axis: true },
      disabledKinds: [],
      grid: { micro: false },
      live: { maxPositions: 0 },
      signals: { maxPositions: 0, maxOpen: 0, perSymbol: 0 },
    });
    wfAll = {
      ...wfAll,
      maxPositions: 0,
      maxOpen: 0,
      maxPerSymbol: 0,
      maxPerSide: 0,
      coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
      signalValidLastN: 10,
    };
  }
  if (arg("focus") === "all") rt.updateSettings({ focus: [] });
  if (arg("min-pf") !== undefined) rt.updateSettings({ gates: { minPf: Number(arg("min-pf")) } });
  // any settings patch, e.g. --settings '{"block":{"maxLevel":6,"minActiveLevel":1}}'
  const settingsExtra = JSON.parse(arg("settings", "{}"));
  if (Object.keys(settingsExtra).length) rt.updateSettings(settingsExtra);
  // strategy toggles, e.g. --toggles '{"normal":false}'
  const togglesExtra = JSON.parse(arg("toggles", "{}"));
  if (Object.keys(togglesExtra).length) rt.updateSettings({ toggles: { ...rt.settings.toggles, ...togglesExtra } });
  // extra walk-forward options, e.g. --wf '{"portfolio":24,"familySeats":false}'
  const wfExtra = { ...wfAll, ...JSON.parse(arg("wf", "{}")) };
  rt.updateSettings({}, { preH, simH: runH, ...wfExtra });
  const t0 = Date.now();
  let rssMax = 0;
  const rssT = setInterval(() => (rssMax = Math.max(rssMax, process.memoryUsage().rss)), 500);
  rt.start();
  process.stderr.write(
    `session: ${symbols} symbols · ${preH}h pre-historic · ${runH}h simulated · tactics ${tacticsMode} · ` +
      `min PF ${rt.settings.gates.minPf} · focus ${rt.settings.focus.length || "all"} · toggles ${JSON.stringify(rt.settings.toggles)}\n`,
  );
  let lastLog = 0;
  while (rt.status.computes < 1) {
    if (rt.status.state === "error" && Date.now() - t0 > 600_000) throw new Error(rt.status.error ?? "engine error");
    await new Promise((r) => setTimeout(r, 1000));
    if (Date.now() - lastLog > 30_000) {
      lastLog = Date.now();
      process.stderr.write(
        `  [${Math.round((Date.now() - t0) / 1000)} s] ${rt.status.state} ${rt.status.stage} ${Math.round((rt.status.progress ?? 0) * 100)}% ${rt.status.label} · rss ${Math.round(process.memoryUsage().rss / 1e6)} MB\n`,
      );
    }
  }
  rt.stop();
  clearInterval(rssT);
  const sim = rt.sim;
  if (!sim) throw new Error("no simulated run");
  const startT = sim.startT;
  const endT = sim.endT;
  // minute closes per symbol inside the run (for mark-to-market)
  const closes = {};
  for (const [sym, cs] of rt.candles)
    closes[sym] = cs.filter((c) => c.t >= startT - 10 * M && c.t <= endT + M).map((c) => [c.t, c.c]);

  // ── every config over the run window (independent of the seats): aggregated from the tapes ──
  const gateN = Number(arg("gate-n", 50));
  const gatePfs = [1.1, 1.25, 1.35, 1.5, 1.75, 2];
  const lb = (a, t) => {
    let lo = 0;
    let hi = a.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (a[m] < t) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  const acc = () => ({ cfgs: 0, pos: 0, n: 0, w: 0, gp: 0, gl: 0 });
  const add = (a, n, w, gp, gl) => {
    a.cfgs++;
    if (gp - gl > 0) a.pos++;
    a.n += n;
    a.w += w;
    a.gp += gp;
    a.gl += gl;
  };
  const cells = new Map();
  const byRange = new Map();
  const byKind = new Map();
  const gate = new Map();
  const byInd = new Map();
  for (const tp of rt.tapes) {
    const r = rangeOfId(tp.id);
    const a = lb(tp.exitT.subarray(0, tp.n), startT);
    const b = lb(tp.exitT.subarray(0, tp.n), endT + 1);
    let n = 0;
    let w = 0;
    let gp = 0;
    let gl = 0;
    for (let i = a; i < b; i++) {
      const x = tp.r[i];
      n++;
      if (x > 0) {
        w++;
        gp += x;
      } else gl -= x;
    }
    const p = tp.protect;
    const ik = `${RANGE_LABEL[r]}|${tp.bot}|${tp.ind}`;
    if (!byInd.has(ik)) byInd.set(ik, { ...acc(), best: null });
    const bi = byInd.get(ik);
    add(bi, n, w, gp, gl);
    if (n >= 5 && (!bi.best || gp - gl > bi.best.net)) bi.best = { id: tp.id, n, pf: profitFactor(gp, gl), net: gp - gl };
    const sk = `${RANGE_LABEL[r]}|${tp.kind}`;
    if (!byRange.has(sk)) byRange.set(sk, acc());
    add(byRange.get(sk), n, w, gp, gl);
    if (!r) continue;
    const ck = `${RANGE_LABEL[r]}|tp ${(p.tp * 100).toFixed(3)}%|sl ${(p.sl / p.tp).toFixed(2)}×|tr ${p.trail ? (p.trail / p.tp).toFixed(2) + "×" : "off"}`;
    if (!cells.has(ck)) cells.set(ck, { ...acc(), range: RANGE_LABEL[r], tp: p.tp, sl: p.sl, trail: p.trail });
    add(cells.get(ck), n, w, gp, gl);
    const kk = `${RANGE_LABEL[r]}|${kindOfInd(tp.ind)}`;
    if (!byKind.has(kk)) byKind.set(kk, acc());
    add(byKind.get(kk), n, w, gp, gl);
    // causal gate: last gateN closes before the run
    if (a >= gateN) {
      const pgp = tp.gp[a] - tp.gp[a - gateN];
      const pgl = tp.gl[a] - tp.gl[a - gateN];
      const pf = profitFactor(pgp, pgl);
      for (const g of gatePfs) {
        if (pf < g) continue;
        const k = `${RANGE_LABEL[r]}|${g}`;
        if (!gate.has(k)) gate.set(k, acc());
        add(gate.get(k), n, w, gp, gl);
      }
    }
  }
  const obj = (m) => Object.fromEntries([...m.entries()].map(([k, c]) => [k, { ...c, pf: profitFactor(c.gp, c.gl) }]));
  const s = rt.settings;
  return {
    at: new Date().toISOString(),
    runSeconds: Math.round((Date.now() - t0) / 1000),
    symbols: rt.status.symbols,
    settings: {
      preH,
      runH,
      tactics: tacticsMode,
      tacticsSet: s.tactics,
      signals: signalsOn,
      desk: deskFile ?? null,
      deskWhy: desk?.why ?? null,
      allOn: flag("all-on"),
      wfPatch: wfExtra,
      wf: Object.fromEntries(
        [
          "preH", "simH", "stepH", "portfolio", "lastN", "lastNMinPf", "validLastN", "signalValidLastN", "maxPerSymbol",
          "maxPerSide", "maxOpen", "maxPositions", "signalMaxPositions", "signalMaxOpen", "guardPct", "coord", "mode",
          "familySeats", "laneSeats", "symGate",
        ].map((k) => [k, rt.wf[k] ?? null]),
      ),
      gates: s.gates,
      toggles: s.toggles,
      block: s.block,
      dca: s.dca,
      lanes: s.tfs,
      cost: s.cost,
      focus: s.focus.length,
      disabledKinds: s.disabledKinds,
      ranges: {
        micro: !!s.grid.micro,
        minimal: !!s.grid.minimal,
        short: !!s.grid.short,
        general: !!s.grid.general,
        long: !!s.grid.long,
        minimalPlus: s.grid.minimalPlus?.enabled === true,
      },
      signalSettings: {
        lanes: s.signals.lanes,
        maxPositions: s.signals.maxPositions,
        maxOpen: s.signals.maxOpen,
        perSymbol: s.signals.perSymbol,
        sourcesOff: Object.entries(s.signals.sources ?? {})
          .filter(([, v]) => v === false)
          .map(([k]) => k),
      },
    },
    window: { startT, endT },
    trades: [...sim.trades].sort((a, b) => a.exitT - b.exitT),
    closes,
    presets: rt.db.kvGet("presetSims")?.presets ?? {},
    engine: {
      computeMs: rt.status.lastComputeMs,
      baseEvaluated: rt.status.baseEvaluated,
      basePassed: rt.status.basePassed,
      mainPairs: rt.status.mainPairs,
      tapes: rt.tapes.length,
      real: rt.paper.selected.length,
      signals: rt.status.signals ?? null,
      rssMaxMb: Math.round(rssMax / 1e6),
      skips: sim.skips,
    },
    tapeAgg: {
      gateN,
      rangeCells: obj(cells),
      rangeByType: obj(byRange),
      rangeByKind: obj(byKind),
      indications: obj(byInd),
      rangeGate: obj(gate),
    },
  };
}

const replay = arg("replay");
const raw = replay ? JSON.parse(readFileSync(replay, "utf8")) : await runEngine();
if (arg("dump")) {
  mkdirSync(dirname(arg("dump")), { recursive: true });
  writeFileSync(arg("dump"), JSON.stringify(raw));
}

// ── 2. the book: sizing, minute equity, hours ─────────────────────────────────────────────────────────────────
const { preH, runH, tactics: tacticsMode, signals: signalsOn } = raw.settings;
const symbols = raw.symbols.length;
const trades = raw.trades;
const startT = raw.window.startT;
const endT = raw.window.endT;
const cost = raw.settings.cost;
const minActive = raw.settings.block?.minActiveLevel ?? 2;
const blockActiveOn = !!raw.settings.toggles?.blockActive;
const sized = sizeBook(trades, [], { balance: balance0, sizing, fixedNotional: notional });
const unit = (x) => sized.units.get(orderKey(x)) ?? notional;
const units = trades.map(unit);
const pnl = (x) => x.r * unit(x);

// minute closes per symbol (for mark-to-market). Candle t = its OPEN time: the price at minute t is the close of
// the candle that opened at t − 1 min.
const closeAt = new Map();
for (const [sym, cs] of Object.entries(raw.closes)) closeAt.set(sym, new Map(cs));
const px = (sym, t) => {
  const m = closeAt.get(sym);
  if (!m) return null;
  for (let k = 1; k <= 5; k++) {
    const v = m.get(t - k * M);
    if (v !== undefined) return v;
  }
  return null;
};

// trades by entry (for the open set) and the episodes (positions = symbol × direction, overlapping orders merge)
const byEntry = [...trades].sort((a, b) => a.entryT - b.entryT);
const episodes = [];
{
  const by = new Map();
  for (const x of byEntry) {
    const k = `${x.sym}|${x.side > 0 ? 1 : -1}`;
    let e = by.get(k);
    if (!e || x.entryT >= e.end) {
      e = { key: k, sym: x.sym, side: x.side > 0 ? 1 : -1, start: x.entryT, end: x.exitT, orders: 0 };
      episodes.push(e);
      by.set(k, e);
    }
    e.end = Math.max(e.end, x.exitT);
    e.orders++;
  }
}
// hour bucket of a close: (h, h + H] — an exit at 10:00 belongs to 09:00
const hourOfExit = (t) => startT + Math.floor((t - 1 - startT) / H) * H;
const hourOfEntry = (t) => startT + Math.floor((t - startT) / H) * H;

// minute-by-minute equity: realized (closed by t) + open orders marked to market at t
let realized = 0;
let peak = balance0;
let maxDd = 0;
let maxDdPct = 0;
let peakT = startT;
let eqDdtMax = 0;
const hours = [];
const curve = [{ t: startT, bal: balance0, eq: balance0, ddPct: 0, margin: 0, oo: 0, op: 0 }];
let ti = 0;
let ei = 0;
let open = [];
let mtmMissing = 0;
for (let h = startT; h < endT; h += H) {
  const hEnd = Math.min(h + H, endT);
  const hh = {
    t: h,
    // the last hour ends at endT (≈ now) and may cover only part of an hour: marked partial, and kept out of the
    // "hours positive" count
    minutes: Math.round((hEnd - h) / M),
    partial: hEnd - h < H,
    marginMax: 0,
    eqMin: Infinity,
    eqMax: -Infinity,
    ddMaxPct: 0,
    eqEnd: 0,
    openEnd: 0,
    openPosEnd: 0,
  };
  // minutes (h, hEnd]: the equity at the hour's end includes every close up to and including hEnd
  for (let t = Math.min(h + M, hEnd); t <= hEnd; t += M) {
    while (ti < trades.length && trades[ti].exitT <= t) realized += pnl(trades[ti++]);
    while (ei < byEntry.length && byEntry[ei].entryT <= t) open.push(byEntry[ei++]);
    open = open.filter((x) => x.exitT > t);
    let mtm = 0;
    let margin = 0;
    const posKeys = new Set();
    for (const x of open) {
      const p = px(x.sym, t);
      // vol = volume units held (DCA legs × Block multiple); r and the margin scale with it
      const vol = x.vol ?? 1;
      if (p !== null) mtm += ((x.side * (p - x.entry)) / x.entry - cost) * unit(x) * vol;
      else mtmMissing++;
      margin += (unit(x) * vol) / leverage;
      posKeys.add(`${x.sym}|${x.side}`);
    }
    const eq = balance0 + realized + mtm;
    // DDT: time since the equity last stood at its peak
    if (eq >= peak) {
      peak = eq;
      peakT = t;
    }
    eqDdtMax = Math.max(eqDdtMax, t - peakT);
    // dollar and percentage maxima tracked independently: a smaller $ drawdown from a lower peak can be the
    // larger % drawdown
    const ddPct = peak > 0 ? (peak - eq) / peak : 0;
    maxDd = Math.max(maxDd, peak - eq);
    maxDdPct = Math.max(maxDdPct, ddPct);
    hh.ddMaxPct = Math.max(hh.ddMaxPct, ddPct);
    hh.marginMax = Math.max(hh.marginMax, margin);
    hh.eqMin = Math.min(hh.eqMin, eq);
    hh.eqMax = Math.max(hh.eqMax, eq);
    hh.eqEnd = eq;
    hh.ddEndPct = ddPct;
    hh.marginEnd = margin;
    hh.openEnd = open.length;
    hh.openPosEnd = posKeys.size;
    if ((t - startT) % (5 * M) === 0 || t === hEnd)
      curve.push({
        t,
        bal: balance0 + realized,
        eq,
        ddPct,
        margin,
        oo: open.length,
        op: posKeys.size,
      });
  }
  const closed = trades.filter((x) => x.exitT > h && x.exitT <= h + H);
  hh.orders = closed.length;
  hh.ordersOpened = trades.filter((x) => x.entryT >= h && x.entryT < h + H).length;
  // legacy: positions among the orders closed in this hour
  hh.positions = closedPositions(closed);
  hh.posOpened = episodes.filter((e) => e.start >= h && e.start < h + H).length;
  hh.posClosed = episodes.filter((e) => e.end > h && e.end <= h + H).length;
  hh.gp = 0;
  hh.gl = 0;
  hh.gpR = 0;
  hh.glR = 0;
  hh.net = 0;
  for (const x of closed) {
    const p = pnl(x);
    if (x.r > 0) {
      hh.gpR += x.r;
      hh.gp += p;
    } else {
      hh.glR -= x.r;
      hh.gl -= p;
    }
    hh.net += p;
  }
  hh.pf = profitFactor(hh.gp, hh.gl);
  hh.pfR = profitFactor(hh.gpR, hh.glR);
  hh.wins = closed.filter((x) => x.r > 0).length;
  hh.losses = closed.length - hh.wins;
  hh.wr = closed.length ? hh.wins / closed.length : 0;
  const hs = curveStats(closed, hEnd);
  hh.ddrHour = hs.ddr;
  hh.mddHour = hs.mdd;
  // current drawdown time at the end of this hour: time since the minute equity (incl. open positions) last stood
  // at its peak. NOT the closed-trade DDT of the total, which is reported separately
  hh.ddNowH = (hEnd - peakT) / H;
  hh.maxDdPct = maxDdPct;
  hh.balance = balance0 + trades.filter((x) => x.exitT <= h + H).reduce((a, x) => a + pnl(x), 0);
  // cumulative (closed trades up to this hour's end)
  const upTo = trades.filter((x) => x.exitT <= h + H);
  const cs = curveStats(upTo, hEnd);
  hh.cumNet = cs.net;
  hh.cumGp = cs.gp;
  hh.cumGl = cs.gl;
  hh.cumPf = cs.pf;
  hh.cumDdr = cs.ddr;
  hh.cumDdtH = cs.ddtH;
  hh.cumOrders = upTo.length;
  hours.push(hh);
}

/**
 * Closed-trade statistics of a group in $ (each order's r × its unit): PF = gross profit ÷ gross loss, the closed
 * curve's max drawdown (from 0), DDR = max drawdown ÷ net (null when net ≤ 0), DDT = longest time from a curve peak
 * until it is regained (an unrecovered one counts to nowT), max DD % = drawdown ÷ (start balance + curve peak).
 */
function curveStats(xs0, nowT = endT) {
  const xs = [...xs0].sort((a, b) => a.exitT - b.exitT);
  let gp = 0;
  let gl = 0;
  let wins = 0;
  let cum = 0;
  let pk = 0;
  let mdd = 0;
  let mddPct = 0;
  let pkT = xs.length ? Math.min(...xs.map((x) => x.entryT)) : startT;
  let dipped = false;
  let ddt = 0;
  let hold = 0;
  const hn = new Map();
  for (const x of xs) {
    const p = pnl(x);
    if (x.r > 0) {
      gp += p;
      wins++;
    } else gl -= p;
    cum += p;
    hold += x.exitT - x.entryT;
    if (cum < pk) {
      dipped = true;
      mdd = Math.max(mdd, pk - cum);
      mddPct = Math.max(mddPct, (pk - cum) / (balance0 + pk));
    } else {
      if (dipped) ddt = Math.max(ddt, x.exitT - pkT);
      dipped = false;
      pk = cum;
      pkT = x.exitT;
    }
    const hk = hourOfExit(x.exitT);
    hn.set(hk, (hn.get(hk) ?? 0) + p);
  }
  if (dipped) ddt = Math.max(ddt, Math.max(nowT, xs.at(-1)?.exitT ?? 0) - pkT);
  const net = gp - gl;
  return {
    n: xs.length,
    wins,
    losses: xs.length - wins,
    wr: xs.length ? wins / xs.length : 0,
    gp,
    gl,
    pf: profitFactor(gp, gl),
    net,
    mdd,
    mddPct,
    ddr: net > 0 ? mdd / net : null,
    ddtH: ddt / H,
    positions: closedPositions(xs),
    greenH: [...hn.values()].filter((v) => v > 0).length,
    redH: [...hn.values()].filter((v) => v < 0).length,
    activeH: hn.size,
    avgHoldMin: xs.length ? hold / xs.length / M : 0,
  };
}

// ── 3. groups ─────────────────────────────────────────────────────────────────────────────────────────────────
const KIND_LABEL = { normal: "Normal", trailing: "Trailing", axis: "Axis", dca: "DCA", "dca-active": "DCA Active" };
const indOf = (x) => x.cfg.split("|")[1] ?? "";
const botOf = (x) => x.cfg.split("|")[0] ?? "";
const isSig = (x) => isSignalInd(indOf(x));
const kindL = (x) => KIND_LABEL[kindOfTrade(x)] ?? kindOfTrade(x);
/** strategy type: the trade's kind, signals apart (a partition of the book) */
const typeOf = (x) => (isSig(x) ? "Signal · " : "") + kindL(x);
/** Block sub-type: plain (×1) or raised by Block; with Block Active on, every raised entry cleared the active level */
const blockOf = (x) => ((x.mult ?? 1) / (x.coordVol ?? 1) > 1 ? (blockActiveOn ? "Block Active" : "Block") : "Plain");
const laneOfTrade = (x) => laneLabel(indOf(x)) || "plain";
const TYPE_ORDER = [
  "Normal",
  "Trailing",
  "Axis",
  "DCA",
  "DCA Active",
  "Signal · Normal",
  "Signal · Trailing",
  "Signal · Axis",
  "Signal · DCA",
  "Signal · DCA Active",
];
const order = (keys, ord) =>
  [...keys].sort((a, b) => {
    const ia = ord.indexOf(a);
    const ib = ord.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
const groupRows = (keyFn, ord) => {
  const by = new Map();
  for (const x of trades) {
    const k = keyFn(x);
    if (k === null) continue;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(x);
  }
  const keys = ord ? order(by.keys(), ord) : [...by.keys()];
  return keys.map((k) => ({ key: k, ...curveStats(by.get(k)), opened: by.get(k).length }));
};
/** hour × key: orders opened in the hour, closes in the hour (PF, net on them) */
const hourly = (keyFn) => {
  const out = [];
  const by = new Map();
  const get = (h, k) => {
    const id = `${h}|${k}`;
    if (!by.has(id)) {
      const e = { t: h, key: k, opened: 0, closes: 0, wins: 0, gp: 0, gl: 0, net: 0 };
      by.set(id, e);
      out.push(e);
    }
    return by.get(id);
  };
  for (const x of trades) {
    const k = keyFn(x);
    if (k === null) continue;
    if (x.entryT >= startT && x.entryT < endT) get(hourOfEntry(x.entryT), k).opened++;
    const e = get(hourOfExit(x.exitT), k);
    const p = pnl(x);
    e.closes++;
    if (x.r > 0) {
      e.wins++;
      e.gp += p;
    } else e.gl -= p;
    e.net += p;
  }
  for (const e of out) e.pf = profitFactor(e.gp, e.gl);
  return out.sort((a, b) => a.t - b.t || a.key.localeCompare(b.key));
};

const tot = curveStats(trades, endT);
const tl = openTimeline(trades, startT, endT);
const stR = statsOf(trades, endT);
const fullHours = hours.filter((h) => !h.partial);
const partialHours = hours.filter((h) => h.partial);
const types = groupRows(typeOf, TYPE_ORDER);
const kinds = groupRows(kindL, Object.values(KIND_LABEL));
const classes = groupRows((x) => (isSig(x) ? "Signals" : "Engine"), ["Engine", "Signals"]);
const subTypes = groupRows((x) => `${typeOf(x)} · ${blockOf(x)}`, null).sort(
  (a, b) =>
    TYPE_ORDER.indexOf(a.key.split(" · ").slice(0, -1).join(" · ")) -
      TYPE_ORDER.indexOf(b.key.split(" · ").slice(0, -1).join(" · ")) || a.key.localeCompare(b.key),
);
const blockLevels = groupRows(
  (x) => {
    const k = kindOfTrade(x);
    if (k !== "normal" && k !== "trailing") return null;
    return (x.mult ?? 1) > 1 ? `level ${x.level ?? 0}` : "plain";
  },
  ["plain", ...Array.from({ length: 12 }, (_, i) => `level ${i}`)],
);
const multRows = groupRows(
  (x) => {
    const m = (x.mult ?? 1) / (x.coordVol ?? 1);
    return m <= 1 ? "×1" : m <= 1.5 ? "×1–1.5" : m <= 2 ? "×1.5–2" : m <= 3 ? "×2–3" : m <= 4 ? "×3–4" : "×4+";
  },
  ["×1", "×1–1.5", "×1.5–2", "×2–3", "×3–4", "×4+"],
);
const indKinds = groupRows((x) => kindOfInd(indOf(x)), null).sort((a, b) => b.net - a.net);
const indBases = groupRows((x) => `${botOf(x)}|${laneOf(indOf(x)).base}`, null)
  .map((r) => ({ ...r, bot: r.key.split("|")[0], base: r.key.split("|")[1], kind: kindOfInd(r.key.split("|")[1]) }))
  .sort((a, b) => b.net - a.net);
const lanes = groupRows(laneOfTrade, ["1m", "1m+", "5m", "5m+", "15m", "15m+", "30m", "30m+", "plain"]);
const ranges = groupRows((x) => RANGE_LABEL[rangeOfId(x.cfg)] ?? "?", null);
const sources = groupRows((x) => (isSig(x) ? signalSourceOf(indOf(x)) : null), null).sort((a, b) => b.net - a.net);
const symRows = groupRows((x) => x.sym, null).sort((a, b) => b.net - a.net);
const sides = groupRows((x) => (x.side > 0 ? "Long" : "Short"), ["Long", "Short"]);
const typeHours = hourly(typeOf);
const sourceHours = hourly((x) => (isSig(x) ? signalSourceOf(indOf(x)) : null));
// cumulative net per type at every hour end (diagram)
const typeKeys = types.map((r) => r.key);
const typeCum = typeKeys.map((k) => {
  let c = 0;
  return {
    key: k,
    pts: [
      { t: startT, v: 0 },
      ...hours.map((h) => {
        c += typeHours.filter((e) => e.t === h.t && e.key === k).reduce((a, e) => a + e.net, 0);
        return { t: Math.min(h.t + H, endT), v: c };
      }),
    ],
  };
});

// ── 4. consistency checks ────────────────────────────────────────────────────────────────────────────────────
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
const checks = [];
const check = (name, expected, actual, ok = near(expected, actual)) => checks.push({ name, expected, actual, ok });
check("Σ hourly net = total net", tot.net, sum(hours, (h) => h.net));
check("Σ hourly orders closed = total orders", trades.length, sum(hours, (h) => h.orders));
check("Σ hourly orders opened = total orders", trades.length, sum(hours, (h) => h.ordersOpened));
check("Σ hourly positions closed = total positions", tot.positions, sum(hours, (h) => h.posClosed));
check("Σ hourly positions opened = total positions", tot.positions, sum(hours, (h) => h.posOpened));
check("Σ hourly wins = total wins", tot.wins, sum(hours, (h) => h.wins));
check("Σ per-type net = total net", tot.net, sum(types, (r) => r.net));
check("Σ per-type orders = total orders", trades.length, sum(types, (r) => r.n));
check("Σ per-kind net = total net", tot.net, sum(kinds, (r) => r.net));
check("Σ engine + signals net = total net", tot.net, sum(classes, (r) => r.net));
check("Σ sub-type net = total net", tot.net, sum(subTypes, (r) => r.net));
check("Σ per-symbol net = total net", tot.net, sum(symRows, (r) => r.net));
check("Σ per-indication-kind net = total net", tot.net, sum(indKinds, (r) => r.net));
check("Σ per-lane net = total net", tot.net, sum(lanes, (r) => r.net));
check("Σ hour × type net = total net", tot.net, sum(typeHours, (e) => e.net));
check(
  "Σ hour × source net = signal net",
  classes.find((r) => r.key === "Signals")?.net ?? 0,
  sum(sourceHours, (e) => e.net),
);
check(
  "Σ per-source net = signal net",
  classes.find((r) => r.key === "Signals")?.net ?? 0,
  sum(sources, (r) => r.net),
);
check("end balance = start + net", balance0 + tot.net, hours.at(-1)?.balance ?? balance0);
check("end balance = sizing book", sized.realized, balance0 + tot.net);
check("last cumulative net = total net", tot.net, hours.at(-1)?.cumNet ?? 0);
check("last cumulative PF = total PF", tot.pf, hours.at(-1)?.cumPf ?? 0);
{
  let bad = 0;
  let prev = balance0;
  for (const h of hours) {
    if (!near(h.balance, prev + h.net)) bad++;
    prev = h.balance;
  }
  check("balance(h) = balance(h−1) + net(h), every hour", 0, bad, bad === 0);
}
{
  // equity − balance at the hour end = the open orders marked to market (0 when nothing is open)
  const bad = hours.filter((h) => h.openEnd === 0 && !near(h.eqEnd, h.balance)).length;
  check("equity = balance at every hour end with no open order", 0, bad, bad === 0);
}
check(
  "orders inside the window (entry ≥ start, exit ≤ end)",
  trades.length,
  trades.filter((x) => x.entryT >= startT && x.exitT <= endT).length,
);
check("minute marks without a price", 0, mtmMissing, mtmMissing === 0);
const checksOk = checks.every((c) => c.ok);

// ── 5. the report objects ────────────────────────────────────────────────────────────────────────────────────
const T = {
  orders: trades.length,
  positions: tot.positions,
  pf: tot.pf,
  pfR: stR.pf,
  gp: tot.gp,
  gl: tot.gl,
  net: tot.net,
  netPct: tot.net / balance0,
  wins: tot.wins,
  losses: tot.losses,
  wr: tot.wr,
  ddtH: tot.ddtH,
  ddr: tot.ddr,
  closedMdd: tot.mdd,
  balanceEnd: balance0 + tot.net,
  equityMaxDd: maxDd,
  equityMaxDdPct: maxDdPct,
  equityDdr: tot.net > 0 ? maxDd / tot.net : null,
  equityDdtMaxH: eqDdtMax / H,
  avgOpenOrders: tl.avgOrders,
  maxOpenOrders: tl.maxOrders,
  avgOpenPositions: tl.avgPositions,
  maxOpenPositions: tl.maxPositions,
  marginMax: Math.max(0, ...hours.map((h) => h.marginMax)),
  greenHours: fullHours.filter((h) => h.net > 0).length,
  redHours: fullHours.filter((h) => h.net < 0).length,
  flatHours: fullHours.filter((h) => h.net === 0).length,
  fullHours: fullHours.length,
  partialHour: partialHours[0] ? { minutes: partialHours[0].minutes, net: partialHours[0].net } : null,
};

const groupLegacy = (pred) => {
  const xs = trades.filter(pred);
  const s = statsOf(xs);
  const wins = xs.filter((x) => x.r > 0).length;
  return { n: s.n, pf: s.pf, net: xs.reduce((a, x) => a + pnl(x), 0), wr: s.wr, wins, losses: xs.length - wins, ddtH: s.ddt };
};
const report = {
  at: raw.at,
  symbols: raw.symbols,
  settings: {
    ...raw.settings,
    balance0,
    notional,
    sizing,
    unitMin: units.length ? Math.min(...units) : 0,
    unitMax: units.length ? Math.max(...units) : 0,
    leverage,
  },
  window: { startT, endT },
  total: T,
  strategies: {
    Normal: groupLegacy((x) => x.kind === "normal"),
    Trailing: groupLegacy((x) => x.kind === "trailing"),
    Axis: groupLegacy((x) => x.kind === "axis"),
    DCA: groupLegacy((x) => x.kind === "dca" || x.kind === "dca-active"),
    "Block-raised": groupLegacy((x) => (x.mult ?? 1) > 1),
    Signals: groupLegacy(isSig),
    "Engine (no signals)": groupLegacy((x) => !isSig(x)),
  },
  ranges: Object.fromEntries(["", "sh", "mn", "gn", "lg", "mc", "mp"].map((r) => [RANGE_LABEL[r] ?? r, groupLegacy((x) => rangeOfId(x.cfg) === r)])),
  lanes: Object.fromEntries(lanes.map((l) => [l.key, groupLegacy((x) => laneOfTrade(x) === l.key)])),
  presets: raw.presets,
  hours,
  engine: raw.engine,
  ...raw.tapeAgg,
};

// ── 6. the engine report (markdown + json, as before) ─────────────────────────────────────────────────────────
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const usd = (x) => `${x < 0 ? "-" : ""}$${Math.abs(x).toFixed(2)}`;
const hm = (t) => new Date(t).toISOString().slice(11, 16);
const hourLabel = (h) => (h.partial ? `${hm(h.t)} (partial, ${h.minutes} min)` : hm(h.t));
const LANES = lanes.map((l) => l.key);
const TYPES = [
  ["Normal", (x) => x.kind === "normal" && !isSig(x)],
  ["Trailing", (x) => x.kind === "trailing" && !isSig(x)],
  ["Axis", (x) => x.kind === "axis"],
  ["DCA", (x) => x.kind === "dca" || x.kind === "dca-active"],
  ["Block-raised", (x) => (x.mult ?? 1) > 1],
  ["Signals", isSig],
];
const tacticsLabel = `tactics ${tacticsMode}`;
const lines = [
  `# Simulated trading session — ${symbols} symbols, ${preH} h pre-historic + ${runH} h run (${tacticsLabel}, signals ${signalsOn ? "on" : "off"})`,
  ``,
  `Real BingX 1m data, every timeframe lane (${report.settings.lanes.join(" / ")} min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. ` +
    `Balance ${usd(balance0)}; ${sizing.mode === "fixed" ? `each order volume unit = ${usd(notional)} notional` : `each order volume unit = ${(sizing.pct * 100).toFixed(1)} % of equity at entry (${usd(report.settings.unitMin)}–${usd(report.settings.unitMax)})`} at ${leverage}×; ${(cost * 100).toFixed(2)} % round-trip cost on every close. ` +
    `Window ${new Date(startT).toISOString().slice(0, 16)} → ${new Date(endT).toISOString().slice(0, 16)} UTC. Engine: Base ${report.engine.basePassed}/${report.engine.baseEvaluated} passed, Main ${report.engine.mainPairs} pairs, ${report.engine.tapes} tapes, Real ${report.engine.real}, compute ${Math.round(report.engine.computeMs / 1000)} s.`,
  ``,
  `**Result:** balance ${usd(balance0)} → ${usd(T.balanceEnd)} (${f2(T.netPct * 100)} %) · PF ${f2(T.pf)} · ${T.positions} positions / ${T.orders} orders · WR ${f2(T.wr * 100)} % · DDT (closed trades) ${f2(T.ddtH)} h · DDR ${T.ddr === null ? "– (net ≤ 0)" : f2(T.ddr)} · equity max drawdown ${usd(T.equityMaxDd)} (${f2(T.equityMaxDdPct * 100)} %) · margin used max ${usd(T.marginMax)} · open avg ${f2(T.avgOpenPositions)} pos / ${f2(T.avgOpenOrders)} orders (peak ${T.maxOpenPositions} / ${T.maxOpenOrders})`,
  ``,
  `## Hour by hour`,
  ``,
  `| hour (UTC) | positions / orders closed | wins / losses | PF | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |`,
  `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
  ...hours.map(
    (h) =>
      `| ${hourLabel(h)} | ${h.posClosed} / ${h.orders} | ${h.wins} / ${h.losses} | ${h.orders ? f2(h.pf) : "–"} | ${h.orders ? Math.round(h.wr * 100) + " %" : "–"} | ${usd(h.net)} | ${usd(h.balance)} | ${usd(h.eqEnd)} | ${usd(h.eqMin)} | ${f2(h.maxDdPct * 100)} % | ${f2(Math.max(0, h.ddNowH))} | ${usd(h.marginMax)} | ${h.openPosEnd} / ${h.openEnd} |`,
  ),
  ``,
  `**Hours positive:** ${T.greenHours} of ${T.fullHours} full hours · flat ${T.flatHours} · negative ${T.redHours}` +
    (T.partialHour ? ` (partial last hour, ${T.partialHour.minutes} min, not counted: net ${usd(T.partialHour.net)})` : ""),
  ``,
  `*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve.`,
  ``,
  `## Hour by hour per timeframe lane (orders · PF · net)`,
  ``,
  `| hour (UTC) | ${LANES.join(" | ")} |`,
  `|---|${LANES.map(() => "---:").join("|")}|`,
  ...hours.map((h) => {
    const xs = trades.filter((x) => x.exitT > h.t && x.exitT <= h.t + H);
    return `| ${hourLabel(h)} | ${LANES.map((l) => {
      const ys = xs.filter((x) => laneOfTrade(x) === l);
      if (!ys.length) return "–";
      return `${ys.length} · ${f2(statsOf(ys).pf)} · ${usd(ys.reduce((a, x) => a + pnl(x), 0))}`;
    }).join(" | ")} |`;
  }),
  ``,
  `## Hour by hour per type (orders · PF · WR · net)`,
  ``,
  `| hour (UTC) | ${TYPES.map(([k]) => k).join(" | ")} |`,
  `|---|${TYPES.map(() => "---:").join("|")}|`,
  ...hours.map((h) => {
    const xs = trades.filter((x) => x.exitT > h.t && x.exitT <= h.t + H);
    return `| ${hourLabel(h)} | ${TYPES.map(([, f]) => {
      const ys = xs.filter(f);
      if (!ys.length) return "–";
      const s = statsOf(ys);
      return `${ys.length} · ${f2(s.pf)} · ${Math.round(s.wr * 100)} % · ${usd(ys.reduce((a, x) => a + pnl(x), 0))}`;
    }).join(" | ")} |`;
  }),
  ``,
  `## Strategies`,
  ``,
  `| strategy | orders | wins / losses | PF | net | WR | DDT (h) |`,
  `|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(report.strategies).map(
    ([k, v]) =>
      `| ${k} | ${v.n} | ${v.wins} / ${v.losses} | ${v.n ? f2(v.pf) : "–"} | ${usd(v.net)} | ${v.n ? f2(v.wr * 100) + " %" : "–"} | ${v.n ? f2(v.ddtH ?? 0) : "–"} |`,
  ),
  ``,
  `## Timeframe lanes`,
  ``,
  `| lane | orders | PF | net |`,
  `|---|---:|---:|---:|`,
  ...Object.entries(report.lanes).map(([k, v]) => `| ${k} | ${v.n} | ${f2(v.pf)} | ${usd(v.net)} |`),
  ``,
  `## Execution presets on the same tapes`,
  ``,
  `| preset | orders | PF | net % of notional |`,
  `|---|---:|---:|---:|`,
  ...Object.values(report.presets).map((p) => `| ${p.label} | ${p.stats?.n ?? 0} | ${f2(p.stats?.pf)} | ${f2(p.stats?.net)} |`),
  ``,
  `A ${runH} h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.`,
];
const pfOf = (a) => profitFactor(a.gp, a.gl);
const accRow = (k, c) =>
  `| ${k.split("|").join(" | ")} | ${c.cfgs} | ${c.pos} (${c.cfgs ? Math.round((c.pos / c.cfgs) * 100) : 0} %) | ${c.n} | ${c.n ? Math.round((c.w / c.n) * 100) : 0} % | ${f2(pfOf(c))} | ${f2((c.gp - c.gl) * 100)} |`;
const A = raw.tapeAgg;
const cellRows = Object.entries(A.rangeCells)
  .filter(([, c]) => c.n >= 10)
  .sort((x, y) => pfOf(y[1]) - pfOf(x[1]));
lines.push(
  ``,
  `## Ranges in the executed book`,
  ``,
  `| range | orders | wins / losses | PF | net | WR | DDT (h) |`,
  `|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(report.ranges)
    .filter(([, v]) => v.n)
    .map(
      ([k, v]) =>
        `| ${k} | ${v.n} | ${v.wins} / ${v.losses} | ${f2(v.pf)} | ${usd(v.net)} | ${f2(v.wr * 100)} % | ${f2(v.ddtH ?? 0)} |`,
    ),
  ``,
  `## Every config over the run window, by range and type (seated or not)`,
  ``,
  `Each config computed independently (unit size, ${(cost * 100).toFixed(2)} % cost per close); net in % of one unit summed over the closes.`,
  ``,
  `| range | type | configs | positive | closes | WR | PF | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeByType).sort().map(([k, c]) => accRow(k, c)),
  ``,
  `## Range cells by indication kind`,
  ``,
  `| range | kind | configs | positive | closes | WR | PF | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeByKind).sort().map(([k, c]) => accRow(k, c)),
  ``,
  `## Causal last-${A.gateN} gate: configs whose last ${A.gateN} closes before the run cleared the PF, then inside the run`,
  ``,
  `| range | min PF | configs | positive | closes | WR | PF | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeGate).sort().map(([k, c]) => accRow(k, c)),
  ``,
  `## Indications per range (every config of the indication together; positive ones first)`,
  ``,
  `| range | bot | indication | configs | positive | closes | WR | PF | net % | best config (closes · PF · net %) |`,
  `|---|---|---|---:|---:|---:|---:|---:|---:|---|`,
  ...Object.entries(A.indications)
    .filter(([, c]) => c.n >= 5)
    .sort((x, y) => x[0].split("|")[0].localeCompare(y[0].split("|")[0]) || pfOf(y[1]) - pfOf(x[1]))
    .map(
      ([k, c]) =>
        `${accRow(k, c).slice(0, -1)}| ${c.best ? `${c.best.id.split("|").slice(2).join(" ")} (${c.best.n} · ${f2(c.best.pf)} · ${f2(c.best.net * 100)})` : "–"} |`,
    ),
  ``,
  `## Best range cells (≥ 10 closes, all pairs together)`,
  ``,
  `| range | TP | SL | trail | configs | positive | closes | WR | PF | net % |`,
  `|---|---|---|---|---:|---:|---:|---:|---:|---:|`,
  ...cellRows.slice(0, 40).map(([k, c]) => accRow(k, c)),
  ``,
  `## Worst range cells`,
  ``,
  `| range | TP | SL | trail | configs | positive | closes | WR | PF | net % |`,
  `|---|---|---|---|---:|---:|---:|---:|---:|---:|`,
  ...cellRows.slice(-15).map(([k, c]) => accRow(k, c)),
);
const md = lines.join("\n");
if (!arg("quiet")) console.log(md);
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, md + "\n");
  writeFileSync(`${out}.json`, JSON.stringify(report, null, 2));
}

// ── 7. the session report: data.json + standalone index.html ─────────────────────────────────────────────────
const round = (v, d = 6) => (typeof v === "number" && Number.isFinite(v) ? +v.toFixed(d) : v);
const clean = (o) => JSON.parse(JSON.stringify(o, (_, v) => (typeof v === "number" ? round(v) : v)));
const data = clean({
  title: `Simulated trading session — ${symbols} symbols, ${preH} h pre-historic + ${runH} h run`,
  at: raw.at,
  runSeconds: raw.runSeconds ?? null,
  symbols: raw.symbols,
  window: { startT, endT, preStartT: startT - preH * H, preH, runH },
  settings: report.settings,
  engine: raw.engine,
  total: T,
  checks,
  checksOk,
  definitions: {
    pf: "gross profit $ ÷ gross loss $ of the closed orders (∞ = no losing order; the engine caps that case at 4)",
    net: "Σ r × unit of the closed orders, $ (r already holds the 0.2 % round-trip cost, the Block multiple and the DCA legs)",
    ddt: "drawdown time, h: the longest time the closed-order curve stayed below a previous peak (an unrecovered one counts to the end of the window)",
    ddr: "drawdown ratio: the closed-order curve's max drawdown ÷ its net ($); – when net ≤ 0",
    maxDdPct: "group: max drawdown of its own closed curve ÷ (start balance + curve peak); total: the equity curve (open orders marked to market every minute)",
    ddNow: "equity drawdown time at the end of the hour: hours since the minute equity last stood at its peak",
    positions: "symbol × direction episodes: overlapping orders on one symbol and side form one position (per group: episodes of that group's orders)",
    greenHours: "hours whose closed orders netted > 0 (of the hours with closes)",
    hourBucket: "an order belongs to the hour of its close (h, h + 1 h]; opened = entries in [h, h + 1 h)",
    subType: "Plain = executed at ×1; Block Active = raised by Block at level ≥ " + minActive + " (with Block Active on every executed entry must be raised)",
    margin: "Σ unit × volume ÷ leverage of the open orders",
  },
  hours: hours.map((h) => ({
    t: h.t,
    partial: h.partial,
    minutes: h.minutes,
    balance: h.balance,
    equity: h.eqEnd,
    eqMin: h.eqMin,
    eqMax: h.eqMax,
    ddEndPct: h.ddEndPct,
    ddMaxHourPct: h.ddMaxPct,
    maxDdPctSoFar: h.maxDdPct,
    marginMax: h.marginMax,
    marginEnd: h.marginEnd,
    ordersOpened: h.ordersOpened,
    orders: h.orders,
    posOpened: h.posOpened,
    posClosed: h.posClosed,
    posOpenEnd: h.openPosEnd,
    ordersOpenEnd: h.openEnd,
    wins: h.wins,
    losses: h.losses,
    wr: h.wr,
    gp: h.gp,
    gl: h.gl,
    pf: h.pf,
    net: h.net,
    ddtNowH: Math.max(0, h.ddNowH),
    ddrHour: h.ddrHour,
    cumNet: h.cumNet,
    cumGp: h.cumGp,
    cumGl: h.cumGl,
    cumPf: h.cumPf,
    cumDdr: h.cumDdr,
    cumDdtH: h.cumDdtH,
    cumOrders: h.cumOrders,
  })),
  curve,
  types,
  kinds,
  classes,
  subTypes,
  blockLevels,
  mult: multRows,
  typeHours,
  typeCum,
  indKinds,
  indBases,
  lanes,
  ranges,
  sources,
  sourceHours,
  symbols_: symRows,
  sides,
  episodes: episodes.length,
});
const htmlDir = arg("html");
if (htmlDir) {
  mkdirSync(htmlDir, { recursive: true });
  writeFileSync(join(htmlDir, "data.json"), JSON.stringify(data, null, 1));
  writeFileSync(join(htmlDir, "index.html"), renderHtml(data));
}
const writeup = arg("writeup");
if (writeup) {
  mkdirSync(dirname(writeup), { recursive: true });
  writeFileSync(writeup, renderWriteup(data, htmlDir));
}
process.stderr.write(
  `checks: ${checks.filter((c) => c.ok).length}/${checks.length} ok${checksOk ? "" : " — FAILED: " + checks.filter((c) => !c.ok).map((c) => c.name).join("; ")}\n`,
);
process.exit(0);

// ── the write-up (markdown) ──────────────────────────────────────────────────────────────────────────────────
function renderWriteup(d, dir) {
  const pf = (r) => (r.gl === 0 ? (r.gp > 0 ? "∞" : "–") : f2(r.gp / r.gl));
  const ddr = (v) => (v === null || v === undefined ? "–" : f2(v));
  const pct = (v) => `${f2(v * 100)} %`;
  const hmd = (t) => new Date(t).toISOString().slice(0, 16).replace("T", " ");
  const t = d.total;
  const grp = (rows, label) => [
    `| ${label} | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...rows.map(
      (r) =>
        `| ${r.key} | ${r.n} | ${r.positions} | ${pf(r)} | ${pct(r.wr)} | ${usd(r.net)} | ${f2(r.ddtH)} | ${ddr(r.ddr)} | ${pct(r.mddPct)} | ${r.greenH} / ${r.activeH} |`,
    ),
  ];
  const pos = (rows) => rows.filter((r) => r.net > 0).sort((a, b) => b.net - a.net);
  const neg = (rows) => rows.filter((r) => r.net < 0).sort((a, b) => a.net - b.net);
  const list = (rows, n = 6) => rows.slice(0, n).map((r) => `${r.key} ${usd(r.net)} (PF ${pf(r)}, ${r.n} orders)`).join(" · ") || "none";
  const s = d.settings;
  return [
    `# 24 h simulated session — ${d.symbols.length} symbols, ${s.preH} h pre-historic + ${s.runH} h run, desk settings`,
    ``,
    `Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the ${s.lanes.join(" / ")} min lanes), ` +
      `pre-historic ${hmd(d.window.preStartT)} → ${hmd(d.window.startT)} UTC, run ${hmd(d.window.startT)} → ${hmd(d.window.endT)} UTC. ` +
      `Symbols: ${d.symbols.join(", ")}.`,
    ``,
    `Settings (desk, ${s.desk ?? "flags"}): stage gate min PF ${s.gates.minPf}, focus ${s.focus === 0 ? "every combo" : s.focus + " pairs"}, disabled kinds ${s.disabledKinds.length ? s.disabledKinds.join(", ") : "none"}, ` +
      `toggles ${Object.entries(s.toggles).filter(([, v]) => v).map(([k]) => k).join(" / ")}, ranges ${Object.entries(s.ranges).filter(([, v]) => v).map(([k]) => k).join(" / ")} (micro ${s.ranges.micro ? "on" : "off"}), ` +
      `caps: positions ${s.wf.maxPositions || "none"}, signal positions ${s.wf.signalMaxPositions || "none"}, coordination ${s.wf.coord?.enabled ? "on" : "off"}, signals validated on their last ${s.wf.signalValidLastN}. ` +
      `Block ${s.block.mode}, ${s.block.maxLevel} levels, Active from ${s.block.minActiveLevel}, ratio ${s.block.ratio}, max ${s.block.maxMult}×. ` +
      `Balance ${usd(s.balance0)}, each order unit ${(s.sizing.pct * 100).toFixed(1)} % of equity at entry, ${s.leverage}× for the margin, ${(s.cost * 100).toFixed(2)} % round-trip cost per close.`,
    ``,
    `Full report with diagrams: [${dir ? join(dir, "index.html") : "index.html"}](${dir ? join(dir.replace(/^docs\//, ""), "index.html") : "index.html"}) · numbers: \`${dir ? join(dir, "data.json") : "data.json"}\`.`,
    ``,
    `## Result`,
    ``,
    `| balance | net | PF | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
    `| ${usd(s.balance0)} → ${usd(t.balanceEnd)} | ${usd(t.net)} (${pct(t.netPct)}) | ${pf(t)} | ${f2(t.ddtH)} | ${ddr(t.ddr)} | ${usd(t.equityMaxDd)} (${pct(t.equityMaxDdPct)}) | ${t.orders} | ${t.positions} | ${pct(t.wr)} | ${t.greenHours} / ${t.fullHours} | ${usd(t.marginMax)} |`,
    ``,
    `Engine: Base ${d.engine.basePassed}/${d.engine.baseEvaluated} passed, Main ${d.engine.mainPairs} pairs, ${d.engine.tapes} tapes, Real ${d.engine.real}, compute ${Math.round(d.engine.computeMs / 1000)} s, peak RSS ${d.engine.rssMaxMb} MB. ` +
      `Consistency checks: ${d.checks.filter((c) => c.ok).length} of ${d.checks.length} pass.`,
    ``,
    `## Findings`,
    ``,
    `- **Strategy types positive:** ${list(pos(d.types))}.`,
    `- **Strategy types losing:** ${list(neg(d.types))}.`,
    `- **Engine vs signals:** ${d.classes.map((r) => `${r.key} ${usd(r.net)} (PF ${pf(r)}, ${r.n} orders)`).join(" · ")}.`,
    `- **Indication kinds positive:** ${list(pos(d.indKinds))}.`,
    `- **Indication kinds losing:** ${list(neg(d.indKinds))}.`,
    `- **Signal sources positive:** ${list(pos(d.sources), 8)}.`,
    `- **Signal sources losing:** ${list(neg(d.sources), 8)}.`,
    `- **Symbols:** best ${list(pos(d.symbols_), 3)}; worst ${list(neg(d.symbols_), 3)}.`,
    ``,
    `## Hour by hour`,
    ``,
    `| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...d.hours.map(
      (h) =>
        `| ${hm(h.t)}${h.partial ? ` (${h.minutes} min)` : ""} | ${usd(h.balance)} | ${usd(h.equity)} | ${pct(h.ddEndPct)} | ${usd(h.marginMax)} | ${h.orders} | ${h.posOpened} / ${h.posClosed} / ${h.posOpenEnd} | ${h.wins} | ${h.orders ? pf(h) : "–"} | ${usd(h.net)} | ${f2(h.ddtNowH)} | ${ddr(h.ddrHour)} | ${usd(h.cumNet)} | ${pf({ gp: h.cumGp, gl: h.cumGl })} |`,
    ),
    ``,
    `## Per strategy type`,
    ``,
    ...grp(d.types, "type"),
    ``,
    ...grp(d.subTypes, "type · sub-type"),
    ``,
    `## Per indication kind`,
    ``,
    ...grp(d.indKinds, "indication kind"),
    ``,
    `## Per signal source`,
    ``,
    ...grp(d.sources, "source"),
    ``,
    `Window of ${s.runH} h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.`,
    ``,
  ].join("\n");
}

// ── the standalone HTML report ───────────────────────────────────────────────────────────────────────────────
function renderHtml(d) {
  const json = JSON.stringify(d).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CTS-A-O Session Report</title>
<style>
:root {
  color-scheme: light;
  --bg: #f6f6f4; --surface: #fcfcfb; --surface-2: #f0efec; --border: #e2e1dc;
  --text: #0b0b0b; --text-2: #52514e; --muted: #7a7974; --grid: #e6e5e0;
  --pos: #2a78d6; --neg: #e34948; --pos-bg: rgba(42,120,214,.16); --neg-bg: rgba(227,73,72,.16);
  --s1: #2a78d6; --s2: #eb6834; --s3: #1baf7a; --s4: #eda100; --s5: #e87ba4; --s6: #008300; --s7: #4a3aa7; --s8: #e34948;
  --ok: #008300; --bad: #c62828;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #121211; --surface: #1a1a19; --surface-2: #232321; --border: #33332f;
    --text: #ffffff; --text-2: #c3c2b7; --muted: #8f8e86; --grid: #2c2c29;
    --pos: #3987e5; --neg: #e66767; --pos-bg: rgba(57,135,229,.22); --neg-bg: rgba(230,103,103,.22);
    --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181; --s6: #008300; --s7: #9085e9; --s8: #e66767;
    --ok: #4caf50; --bad: #ef5350;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #121211; --surface: #1a1a19; --surface-2: #232321; --border: #33332f;
  --text: #ffffff; --text-2: #c3c2b7; --muted: #8f8e86; --grid: #2c2c29;
  --pos: #3987e5; --neg: #e66767; --pos-bg: rgba(57,135,229,.22); --neg-bg: rgba(230,103,103,.22);
  --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181; --s6: #008300; --s7: #9085e9; --s8: #e66767;
  --ok: #4caf50; --bad: #ef5350;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1240px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 22px; line-height: 1.25; margin: 0 0 6px; letter-spacing: -.01em; }
h2 { font-size: 17px; margin: 40px 0 6px; padding-top: 8px; border-top: 1px solid var(--border); }
h3 { font-size: 14px; margin: 22px 0 6px; color: var(--text-2); font-weight: 600; }
p { margin: 6px 0; }
.sub, .note { color: var(--text-2); }
.note { font-size: 12.5px; max-width: 900px; }
.mono, td, th, .kpi .v { font-variant-numeric: tabular-nums; }
nav.toc { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 14px 0 4px; font-size: 13px; }
nav.toc a { color: var(--text-2); text-decoration: none; border-bottom: 1px dotted var(--muted); }
nav.toc a:hover { color: var(--text); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.chip { background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px; font-size: 12px; color: var(--text-2); }
.kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin: 16px 0; }
.kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; min-width: 0; }
.kpi .l { font-size: 12px; color: var(--text-2); }
.kpi .v { font-size: 20px; font-weight: 650; line-height: 1.3; overflow-wrap: anywhere; }
.kpi .s { font-size: 12px; color: var(--muted); }
.pos { color: var(--pos); } .neg { color: var(--neg); }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 14px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 12px 6px; min-width: 0; position: relative; }
.card h3 { margin: 0 0 2px; color: var(--text); }
.card .cap { font-size: 12px; color: var(--text-2); margin-bottom: 4px; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--text-2); margin: 2px 0 4px; }
.legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; vertical-align: middle; margin-right: 5px; }
.chart { width: 100%; position: relative; }
.chart svg { display: block; width: 100%; overflow: visible; }
.chart text { fill: var(--muted); font-size: 11px; }
.chart .gl { stroke: var(--grid); stroke-width: 1; }
.chart .zl { stroke: var(--muted); stroke-width: 1; }
.chart .xh { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 3; }
.tip { position: absolute; pointer-events: none; z-index: 5; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px 9px; font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.14); white-space: nowrap; display: none; }
.tip b { font-weight: 600; }
.tip .row { display: flex; gap: 10px; justify-content: space-between; }
.tip .sw { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; }
.tw { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); margin: 8px 0 4px; max-width: 100%; }
.tw.tall { max-height: 560px; overflow-y: auto; }
table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
th, td { padding: 5px 9px; text-align: right; white-space: nowrap; border-bottom: 1px solid var(--grid); }
th:first-child, td:first-child, th.l, td.l { text-align: left; }
thead th { position: sticky; top: 0; background: var(--surface-2); color: var(--text-2); font-weight: 600; z-index: 1; }
th.sort { cursor: pointer; user-select: none; }
th.sort:hover { color: var(--text); }
th.sort[aria-sort="ascending"]::after { content: " ▲"; font-size: 9px; }
th.sort[aria-sort="descending"]::after { content: " ▼"; font-size: 9px; }
tfoot td { font-weight: 650; background: var(--surface-2); border-top: 1px solid var(--border); }
tbody tr:hover td { background: var(--surface-2); }
td.cp { background: var(--pos-bg); } td.cn { background: var(--neg-bg); }
.tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 6px 0; font-size: 12.5px; color: var(--text-2); }
.tools input, .tools select { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; max-width: 100%; }
.ok { color: var(--ok); } .bad { color: var(--bad); }
.theme { position: absolute; top: 18px; right: 16px; }
.theme button { font: inherit; font-size: 12px; color: var(--text-2); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 3px 9px; cursor: pointer; }
header { position: relative; padding-right: 70px; }
details summary { cursor: pointer; color: var(--text-2); margin: 8px 0; }
@media (max-width: 600px) {
  main { padding: 16px 16px 48px; }
  h1 { font-size: 19px; }
  .kpi .v { font-size: 17px; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
}
</style>
</head>
<body>
<main id="app"></main>
<div class="tip" id="tip"></div>
<script>
const DATA = ${json};
(${clientMain.toString()})(DATA);
</script>
</body>
</html>
`;
}

// The page's own code (runs in the browser; embedded with toString — never called in node).
function clientMain(D) {
  const H = 3600000;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fin = (v) => typeof v === "number" && Number.isFinite(v);
  const n2 = (v, d = 2) => (fin(v) ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–");
  const usd = (v, d = 2) => (fin(v) ? (v < 0 ? "−$" : "$") + n2(Math.abs(v), d) : "–");
  const susd = (v) => (fin(v) ? (v > 0 ? "+" : v < 0 ? "−" : "") + "$" + n2(Math.abs(v)) : "–");
  const pct = (v, d = 2) => (fin(v) ? n2(v * 100, d) + " %" : "–");
  const pfTxt = (gp, gl, n) => (n === 0 ? "–" : gl === 0 ? (gp > 0 ? "∞" : "–") : n2(gp / gl));
  const pfVal = (gp, gl) => (gl === 0 ? (gp > 0 ? 1e9 : 0) : gp / gl);
  const hm = (t) => new Date(t).toISOString().slice(11, 16);
  const dt = (t) => new Date(t).toISOString().slice(0, 16).replace("T", " ");
  const cls = (v) => (v > 0 ? "pos" : v < 0 ? "neg" : "");
  const S = D.settings;
  const T = D.total;
  const hourLabel = (h) => hm(h.t) + (h.partial ? " (" + h.minutes + " min)" : "");

  // ── theme toggle ──
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("cts-theme");
    if (saved) root.dataset.theme = saved;
  } catch (e) {}

  // ── page skeleton ──
  const app = $("#app");
  const sec = (id, title, html) => `<section id="${id}"><h2>${title}</h2>${html}</section>`;
  const kpi = (l, v, s = "", c = "") => `<div class="kpi"><div class="l">${l}</div><div class="v ${c}">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
  const onToggles = Object.entries(S.toggles).filter(([, v]) => v).map(([k]) => k).join(", ");
  const rangesOn = Object.entries(S.ranges).filter(([, v]) => v).map(([k]) => k).join(", ");
  const sigTotal = D.classes.find((r) => r.key === "Signals");
  app.innerHTML = `
<header>
  <h1>${esc(D.title)}</h1>
  <p class="sub">Real BingX 1m market data · the engine itself (Base → Main → Real over the ${S.lanes.join(" / ")} min lanes) · pre-historic ${dt(D.window.preStartT)} → ${dt(D.window.startT)} UTC · run ${dt(D.window.startT)} → ${dt(D.window.endT)} UTC</p>
  <div class="theme"><button id="themeBtn" type="button" aria-label="Toggle light / dark">Theme</button></div>
  <div class="chips">${D.symbols.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
  <div class="chips">
    <span class="chip">min PF ${S.gates.minPf}</span>
    <span class="chip">focus: ${S.focus === 0 ? "every combo" : S.focus + " pairs"}</span>
    <span class="chip">disabled kinds: ${S.disabledKinds.length ? esc(S.disabledKinds.join(", ")) : "none"}</span>
    <span class="chip">toggles: ${esc(onToggles)}</span>
    <span class="chip">ranges: ${esc(rangesOn)} · micro ${S.ranges.micro ? "on" : "off"}</span>
    <span class="chip">position caps: ${S.wf.maxPositions || "none"} · signals ${S.wf.signalMaxPositions || "none"}</span>
    <span class="chip">coordination ${S.wf.coord && S.wf.coord.enabled ? "on" : "off"}</span>
    <span class="chip">signals ${S.signals ? "on" : "off"} · last ${S.wf.signalValidLastN}</span>
    <span class="chip">Block ${esc(S.block.mode)} · L${S.block.minActiveLevel}+ active · ratio ${S.block.ratio} · max ${S.block.maxMult}×</span>
    <span class="chip">tactics ${esc(S.tactics)}</span>
    <span class="chip">unit ${n2(S.sizing.pct * 100, 1)} % of equity · ${S.leverage}× · cost ${n2(S.cost * 100)} %</span>
  </div>
</header>
<nav class="toc">
  <a href="#summary">Summary</a><a href="#diagrams">Diagrams</a><a href="#hourly">Hourly</a><a href="#types">Strategy types</a>
  <a href="#typehours">Types per hour</a><a href="#indications">Indications</a><a href="#signals">Signals</a><a href="#symbols">Symbols</a><a href="#checks">Checks</a>
</nav>
<section id="summary">
<div class="kpis">
  ${kpi("Start → end balance", usd(S.balance0) + " → " + usd(T.balanceEnd), "")}
  ${kpi("Net", susd(T.net), pct(T.netPct) + " of the start balance", cls(T.net))}
  ${kpi("Profit factor", pfTxt(T.gp, T.gl, T.orders), "gross " + usd(T.gp) + " / " + usd(T.gl))}
  ${kpi("DDT", n2(T.ddtH) + " h", "closed orders · equity " + n2(T.equityDdtMaxH) + " h")}
  ${kpi("DDR", T.ddr === null ? "–" : n2(T.ddr), "closed DD " + usd(T.closedMdd) + " ÷ net · equity " + (T.equityDdr === null ? "–" : n2(T.equityDdr)))}
  ${kpi("Max equity drawdown", pct(T.equityMaxDdPct), usd(T.equityMaxDd) + " · marked every minute")}
  ${kpi("Peak margin used", usd(T.marginMax), "open avg " + n2(T.avgOpenPositions, 1) + " pos / " + n2(T.avgOpenOrders, 1) + " orders")}
  ${kpi("Orders", T.orders.toLocaleString("en-US"), "peak open " + T.maxOpenOrders)}
  ${kpi("Positions", T.positions.toLocaleString("en-US"), "symbol × side · peak open " + T.maxOpenPositions)}
  ${kpi("Win rate", pct(T.wr, 1), T.wins + " wins / " + T.losses + " losses")}
  ${kpi("Green hours", T.greenHours + " / " + T.fullHours, T.redHours + " red · " + T.flatHours + " flat" + (T.partialHour ? " · last hour partial" : ""))}
  ${kpi("Signals", sigTotal ? susd(sigTotal.net) : "–", sigTotal ? sigTotal.n + " orders · PF " + pfTxt(sigTotal.gp, sigTotal.gl, sigTotal.n) : "no signal orders", sigTotal ? cls(sigTotal.net) : "")}
</div>
<p class="note">Engine: Base ${D.engine.basePassed} of ${D.engine.baseEvaluated} passed · Main ${D.engine.mainPairs} pairs · ${D.engine.tapes.toLocaleString("en-US")} tapes · Real ${D.engine.real} configs · compute ${Math.round(D.engine.computeMs / 1000)} s · peak RSS ${D.engine.rssMaxMb} MB${D.runSeconds ? " · session " + Math.round(D.runSeconds / 60) + " min" : ""}. Generated ${esc(D.at)}.
Consistency checks: <b class="${D.checksOk ? "ok" : "bad"}">${D.checks.filter((c) => c.ok).length} of ${D.checks.length} pass</b> (see <a href="#checks">Checks</a>).</p>
</section>
${sec("diagrams", "Diagrams", `
<div class="grid2">
  <div class="card"><h3>Balance and equity</h3><div class="cap">Balance = start + closed orders; equity adds the open orders marked to market (5-minute samples of the minute curve)</div><div class="chart" id="cEq"></div></div>
  <div class="card"><h3>Equity drawdown</h3><div class="cap">Below the running equity peak, % of the peak</div><div class="chart" id="cDd"></div></div>
  <div class="card"><h3>Margin used</h3><div class="cap">Σ unit × volume ÷ ${S.leverage}× of the open orders</div><div class="chart" id="cMg"></div></div>
  <div class="card"><h3>Net per hour</h3><div class="cap">Closed orders of each hour, $</div><div class="chart" id="cHn"></div></div>
</div>
<div class="card" style="margin-top:14px"><h3>Cumulative net per strategy type</h3><div class="cap">Closed orders, $, at every hour end</div><div class="chart" id="cTy"></div></div>
`)}
${sec("hourly", "Hour by hour", `<p class="note">One row per hour (UTC). Orders and PF / net count the orders <i>closed</i> in the hour; positions are symbol × direction episodes (opened / closed in the hour / open at its end). DD % and DDT now are on the minute equity; DDR (hour) is the hour's own closed curve, cum columns add every hour so far. Click a header to sort.</p><div class="tw tall" id="tHours"></div>`)}
${sec("types", "Strategy types", `
<p class="note">Type = the order's kind (Normal / Trailing / Axis / DCA / DCA Active), signals apart — a partition of the book, so the rows add up to the total. Sub-type splits each by Block (with Block Active on, every executed entry is raised at level ≥ ${S.block.minActiveLevel}). Max DD % = the group's own closed curve from the start balance; green hours = hours with a positive net of the hours with closes.</p>
<h3>By type</h3><div class="tw" id="tTypes"></div>
<h3>By kind (engine + signals)</h3><div class="tw" id="tKinds"></div>
<h3>By type and sub-type</h3><div class="tw" id="tSub"></div>
<h3>Engine vs signals</h3><div class="tw" id="tClasses"></div>
<h3>Normal / Trailing by Block level</h3><div class="tw" id="tLevels"></div>
<h3>By Block volume multiple</h3><div class="tw" id="tMult"></div>
<h3>By timeframe lane</h3><div class="tw" id="tLanes"></div>
<h3>By protect range</h3><div class="tw" id="tRanges"></div>
<h3>Long / short</h3><div class="tw" id="tSides"></div>
`)}
${sec("typehours", "Strategy types per hour", `
<h3>Net per hour and type</h3><p class="note">Cell = net $ · orders closed. Shading: blue positive, red negative.</p><div class="tw tall" id="tTypeMatrix"></div>
<h3>Hour × type, line by line</h3><div class="tools"><label>Type <select id="fType"><option value="">all</option></select></label></div><div class="tw tall" id="tTypeHours"></div>
`)}
${sec("indications", "Indications", `
<p class="note">Every executed order by its indication: the registry kind (family), and the base indication (without the lane) with its bot. Signals count under their own sig-… indications.</p>
<h3>By indication kind</h3><div class="tw" id="tIndKinds"></div>
<h3>By indication (bot · base)</h3><div class="tools"><label>Filter <input id="fInd" type="search" placeholder="e.g. rsi"></label></div><div class="tw tall" id="tIndBases"></div>
`)}
${sec("signals", "Signals", `
<p class="note">Signal orders per source (the source of the sig-… indication; short and medium ranges together).</p>
<h3>Per source, total</h3><div class="tw" id="tSources"></div>
<h3>Per source and hour</h3><div class="tools"><label>Source <select id="fSrc"><option value="">all</option></select></label></div><div class="tw tall" id="tSrcHours"></div>
`)}
${sec("symbols", "Per symbol", `<div class="tw" id="tSyms"></div>`)}
${sec("checks", "Consistency checks", `<div class="tw" id="tChecks"></div>
<details><summary>Definitions</summary><div class="tw"><table><tbody>${Object.entries(D.definitions).map(([k, v]) => `<tr><td class="l"><b>${esc(k)}</b></td><td class="l" style="white-space:normal">${esc(v)}</td></tr>`).join("")}</tbody></table></div></details>
<details><summary>Settings and engine (raw)</summary><pre class="note" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify({ settings: S, engine: D.engine }, null, 1))}</pre></details>`)}
`;

  $("#themeBtn").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("cts-theme", root.dataset.theme); } catch (e) {}
    drawAll();
  });

  // ── tables ──
  // col: { k, l (label), f (format row → html), v (sort value), t: "s" text / "n" number, c (cell class fn) }
  function table(id, cols, rows, opt = {}) {
    const el = document.getElementById(id);
    if (!el) return;
    const head = `<thead><tr>${cols.map((c, i) => `<th class="sort ${c.t === "s" ? "l" : ""}" data-i="${i}" title="${esc(c.title || "Sort")}">${c.l}</th>`).join("")}</tr></thead>`;
    const body = rows
      .map(
        (r) =>
          `<tr data-q="${esc((opt.q ? opt.q(r) : "").toLowerCase())}">${cols
            .map((c) => {
              const v = c.v ? c.v(r) : r[c.k];
              const sv = typeof v === "number" ? (Number.isFinite(v) ? v : -1e12) : String(v ?? "");
              const cc = c.c ? c.c(r) : "";
              return `<td class="${c.t === "s" ? "l " : ""}${cc}" data-v="${esc(sv)}">${c.f ? c.f(r) : esc(v ?? "–")}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("");
    const foot = opt.foot ? `<tfoot><tr>${cols.map((c, i) => `<td class="${c.t === "s" ? "l" : ""}">${opt.foot[i] ?? ""}</td>`).join("")}</tr></tfoot>` : "";
    el.innerHTML = `<table>${head}<tbody>${body}</tbody>${foot}</table>`;
    el.querySelectorAll("th.sort").forEach((th) =>
      th.addEventListener("click", () => {
        const i = +th.dataset.i;
        const asc = th.getAttribute("aria-sort") !== "ascending";
        el.querySelectorAll("th.sort").forEach((x) => x.removeAttribute("aria-sort"));
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        const tb = el.querySelector("tbody");
        const num = cols[i].t !== "s";
        const trs = [...tb.rows];
        trs.sort((a, b) => {
          const x = a.cells[i].dataset.v;
          const y = b.cells[i].dataset.v;
          const r = num ? +x - +y : x.localeCompare(y);
          return asc ? r : -r;
        });
        trs.forEach((tr) => tb.appendChild(tr));
      }),
    );
  }
  const filterRows = (id, q) => {
    q = q.toLowerCase();
    document.querySelectorAll(`#${id} tbody tr`).forEach((tr) => (tr.style.display = !q || tr.dataset.q.includes(q) ? "" : "none"));
  };
  const net = (k = "net", lbl = "net") => ({ k, l: lbl, f: (r) => `<span class="${cls(r[k])}">${susd(r[k])}</span>`, v: (r) => r[k] });
  const pfCol = (gp = "gp", gl = "gl", n = "n") => ({ l: "PF", f: (r) => pfTxt(r[gp], r[gl], r[n]), v: (r) => (r[n] ? pfVal(r[gp], r[gl]) : -1) });
  const numCol = (k, l, d = 0) => ({ k, l, f: (r) => (d ? n2(r[k], d) : (r[k] ?? 0).toLocaleString("en-US")), v: (r) => r[k] });
  const groupCols = (label) => [
    { k: "key", l: label, t: "s" },
    numCol("n", "orders"),
    numCol("positions", "positions"),
    pfCol(),
    { l: "WR", f: (r) => pct(r.wr, 1), v: (r) => r.wr },
    net(),
    { l: "avg / order", f: (r) => susd(r.n ? r.net / r.n : 0), v: (r) => (r.n ? r.net / r.n : 0) },
    { l: "DDT (h)", f: (r) => n2(r.ddtH), v: (r) => r.ddtH },
    { l: "DDR", f: (r) => (r.ddr === null ? "–" : n2(r.ddr)), v: (r) => (r.ddr === null ? 1e9 : r.ddr), title: "max drawdown ÷ net (– when net ≤ 0)" },
    { l: "max DD", f: (r) => usd(r.mdd), v: (r) => r.mdd },
    { l: "max DD %", f: (r) => pct(r.mddPct), v: (r) => r.mddPct },
    { l: "green h", f: (r) => r.greenH + " / " + r.activeH, v: (r) => (r.activeH ? r.greenH / r.activeH : 0) },
    { l: "avg hold", f: (r) => n2(r.avgHoldMin / 60, 1) + " h", v: (r) => r.avgHoldMin },
  ];
  const sumRow = (rows, label, extra = {}) => {
    const n = rows.reduce((a, r) => a + r.n, 0);
    const gp = rows.reduce((a, r) => a + r.gp, 0);
    const gl = rows.reduce((a, r) => a + r.gl, 0);
    const nt = rows.reduce((a, r) => a + r.net, 0);
    return [label, n.toLocaleString("en-US"), extra.positions ?? "", pfTxt(gp, gl, n), extra.wr ?? "", `<span class="${cls(nt)}">${susd(nt)}</span>`];
  };
  const totFoot = (rows, label) => sumRow(rows, label, { positions: "(" + T.positions + ")", wr: pct(T.wr, 1) });

  // hourly
  table(
    "tHours",
    [
      { k: "t", l: "hour (UTC)", t: "s", f: (r) => hourLabel(r), v: (r) => String(r.t) },
      { l: "balance", f: (r) => usd(r.balance), v: (r) => r.balance },
      { l: "equity", f: (r) => usd(r.equity), v: (r) => r.equity },
      { l: "DD % (end)", f: (r) => pct(r.ddEndPct), v: (r) => r.ddEndPct, title: "equity below its running peak at the hour's end" },
      { l: "DD % (hour max)", f: (r) => pct(r.ddMaxHourPct), v: (r) => r.ddMaxHourPct },
      { l: "max DD % so far", f: (r) => pct(r.maxDdPctSoFar), v: (r) => r.maxDdPctSoFar },
      { l: "margin max", f: (r) => usd(r.marginMax), v: (r) => r.marginMax },
      numCol("ordersOpened", "orders opened"),
      numCol("orders", "orders closed"),
      numCol("posOpened", "pos opened"),
      numCol("posClosed", "pos closed"),
      numCol("posOpenEnd", "pos open"),
      numCol("ordersOpenEnd", "orders open"),
      numCol("wins", "wins"),
      { l: "WR", f: (r) => (r.orders ? pct(r.wr, 0) : "–"), v: (r) => r.wr },
      pfCol("gp", "gl", "orders"),
      net(),
      { l: "DDT now (h)", f: (r) => n2(r.ddtNowH), v: (r) => r.ddtNowH, title: "hours since the equity last stood at its peak" },
      { l: "DDR (hour)", f: (r) => (r.ddrHour === null ? "–" : n2(r.ddrHour)), v: (r) => (r.ddrHour === null ? 1e9 : r.ddrHour) },
      net("cumNet", "cum net"),
      { l: "cum PF", f: (r) => pfTxt(r.cumGp, r.cumGl, r.cumOrders), v: (r) => pfVal(r.cumGp, r.cumGl) },
      { l: "cum DDT (h)", f: (r) => n2(r.cumDdtH), v: (r) => r.cumDdtH },
      { l: "cum DDR", f: (r) => (r.cumDdr === null ? "–" : n2(r.cumDdr)), v: (r) => (r.cumDdr === null ? 1e9 : r.cumDdr) },
    ],
    D.hours,
    {
      foot: [
        "total",
        usd(T.balanceEnd),
        "",
        "",
        "",
        pct(T.equityMaxDdPct),
        usd(T.marginMax),
        D.hours.reduce((a, h) => a + h.ordersOpened, 0).toLocaleString("en-US"),
        T.orders.toLocaleString("en-US"),
        D.hours.reduce((a, h) => a + h.posOpened, 0),
        D.hours.reduce((a, h) => a + h.posClosed, 0),
        "",
        "",
        T.wins,
        pct(T.wr, 0),
        pfTxt(T.gp, T.gl, T.orders),
        `<span class="${cls(T.net)}">${susd(T.net)}</span>`,
        n2(T.ddtH),
        T.ddr === null ? "–" : n2(T.ddr),
        "",
        "",
        "",
        "",
      ],
    },
  );
  table("tTypes", groupCols("type"), D.types, { foot: totFoot(D.types, "total") });
  table("tKinds", groupCols("kind"), D.kinds, { foot: totFoot(D.kinds, "total") });
  table("tSub", groupCols("type · sub-type"), D.subTypes, { foot: totFoot(D.subTypes, "total") });
  table("tClasses", groupCols("class"), D.classes, { foot: totFoot(D.classes, "total") });
  table("tLevels", groupCols("Block level"), D.blockLevels);
  table("tMult", groupCols("volume ×"), D.mult, { foot: totFoot(D.mult, "total") });
  table("tLanes", groupCols("lane"), D.lanes, { foot: totFoot(D.lanes, "total") });
  table("tRanges", groupCols("range"), D.ranges, { foot: totFoot(D.ranges, "total") });
  table("tSides", groupCols("side"), D.sides, { foot: totFoot(D.sides, "total") });
  table("tIndKinds", groupCols("indication kind"), D.indKinds, { foot: totFoot(D.indKinds, "total") });
  table(
    "tIndBases",
    [{ k: "base", l: "indication", t: "s" }, { k: "bot", l: "bot", t: "s" }, { k: "kind", l: "kind", t: "s" }, ...groupCols("").slice(1)],
    D.indBases,
    { q: (r) => r.key + " " + r.kind, foot: ["total", "", "", ...totFoot(D.indBases, "").slice(1)] },
  );
  table("tSources", groupCols("source"), D.sources, { foot: D.sources.length ? sumRow(D.sources, "signals total") : null });
  table("tSyms", groupCols("symbol"), D.symbols_, { foot: totFoot(D.symbols_, "total") });
  const hourCols = (label) => [
    { k: "t", l: "hour (UTC)", t: "s", f: (r) => hm(r.t), v: (r) => String(r.t) },
    { k: "key", l: label, t: "s" },
    numCol("opened", "orders opened"),
    numCol("closes", "closes"),
    numCol("wins", "wins"),
    pfCol("gp", "gl", "closes"),
    net(),
  ];
  table("tTypeHours", hourCols("type"), D.typeHours, { q: (r) => "|" + r.key + "|" });
  table("tSrcHours", hourCols("source"), D.sourceHours, { q: (r) => "|" + r.key + "|" });
  const fill = (id, keys, tid) => {
    const sel = document.getElementById(id);
    sel.innerHTML += keys.map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join("");
    sel.addEventListener("change", () => filterRows(tid, sel.value ? "|" + sel.value + "|" : ""));
  };
  fill("fType", D.types.map((r) => r.key), "tTypeHours");
  fill("fSrc", D.sources.map((r) => r.key), "tSrcHours");
  $("#fInd").addEventListener("input", (e) => filterRows("tIndBases", e.target.value));
  // type matrix
  {
    const keys = D.types.map((r) => r.key);
    const cell = new Map(D.typeHours.map((e) => [e.t + "|" + e.key, e]));
    const mx = Math.max(1e-9, ...D.typeHours.map((e) => Math.abs(e.net)));
    const rows = D.hours.map((h) => {
      const r = { t: h.t, partial: h.partial, minutes: h.minutes, total: h.net };
      keys.forEach((k) => (r[k] = cell.get(h.t + "|" + k) || null));
      return r;
    });
    const shade = (v) => {
      const a = Math.min(1, Math.abs(v) / mx);
      return `background:${v >= 0 ? "var(--pos-bg)" : "var(--neg-bg)"};background:color-mix(in srgb, ${v >= 0 ? "var(--pos)" : "var(--neg)"} ${Math.round(4 + a * 34)}%, transparent)`;
    };
    const el = document.getElementById("tTypeMatrix");
    el.innerHTML = `<table><thead><tr><th>hour (UTC)</th>${keys.map((k) => `<th>${esc(k)}</th>`).join("")}<th>hour net</th></tr></thead><tbody>${rows
      .map(
        (r) =>
          `<tr><td class="l">${hourLabel(r)}</td>${keys
            .map((k) => {
              const e = r[k];
              if (!e || !e.closes) return `<td style="color:var(--muted)">·</td>`;
              return `<td style="${shade(e.net)}" title="${esc(k)} · ${hm(r.t)} · PF ${pfTxt(e.gp, e.gl, e.closes)}">${susd(e.net)} · ${e.closes}</td>`;
            })
            .join("")}<td class="${cls(r.total)}">${susd(r.total)}</td></tr>`,
      )
      .join("")}</tbody><tfoot><tr><td class="l">total</td>${keys
      .map((k) => {
        const t = D.types.find((x) => x.key === k);
        return `<td>${susd(t.net)} · ${t.n}</td>`;
      })
      .join("")}<td class="${cls(T.net)}">${susd(T.net)}</td></tr></tfoot></table>`;
  }
  table(
    "tChecks",
    [
      { k: "name", l: "check", t: "s" },
      { l: "expected", f: (r) => n2(r.expected, 4), v: (r) => r.expected },
      { l: "actual", f: (r) => n2(r.actual, 4), v: (r) => r.actual },
      { l: "result", t: "s", f: (r) => (r.ok ? '<span class="ok">✓ pass</span>' : '<span class="bad">✗ fail</span>'), v: (r) => (r.ok ? "pass" : "fail") },
    ],
    D.checks,
  );

  // ── charts ──
  const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
  const tip = $("#tip");
  const SER = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8"];
  function niceTicks(lo, hi, n) {
    if (!(hi > lo)) {
      hi = lo + 1;
      lo = lo - 1;
    }
    const raw = (hi - lo) / Math.max(1, n);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
    const a = Math.floor(lo / step) * step;
    const b = Math.ceil(hi / step) * step;
    const out = [];
    for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const svgEl = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">${inner}</svg>`;
  function frame(el, o) {
    const w = Math.max(280, el.clientWidth);
    const h = o.height || (w < 500 ? 200 : 240);
    const m = { l: o.ml || 58, r: o.mr || 14, t: 10, b: 24 };
    const x0 = D.window.startT;
    const x1 = D.window.endT;
    const ticks = niceTicks(o.lo, o.hi, h < 220 ? 4 : 5);
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const X = (t) => m.l + ((t - x0) / (x1 - x0)) * (w - m.l - m.r);
    const Y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (h - m.t - m.b);
    let g = "";
    for (const v of ticks) g += `<line class="${v === 0 ? "zl" : "gl"}" x1="${m.l}" x2="${w - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${o.fy(v)}</text>`;
    const span = (x1 - x0) / H;
    const every = [1, 2, 3, 4, 6, 8, 12, 24].find((e) => span / e <= (w < 500 ? 5 : 9)) || 24;
    for (let t = Math.ceil(x0 / H) * H; t <= x1; t += H) {
      if (Math.round((t - Math.ceil(x0 / H) * H) / H) % every) continue;
      g += `<line class="gl" x1="${X(t)}" x2="${X(t)}" y1="${h - m.b}" y2="${h - m.b + 4}"/><text x="${X(t)}" y="${h - 6}" text-anchor="middle">${hm(t)}</text>`;
    }
    return { w, h, m, X, Y, lo, hi, g, x0, x1 };
  }
  function showTip(el, html, px, py) {
    tip.innerHTML = html;
    tip.style.display = "block";
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    let left = r.left + window.scrollX + px + 14;
    if (left + tw > window.scrollX + document.documentElement.clientWidth - 8) left = r.left + window.scrollX + px - tw - 14;
    tip.style.left = Math.max(window.scrollX + 4, left) + "px";
    tip.style.top = r.top + window.scrollY + py - 10 + "px";
  }
  const hideTip = () => (tip.style.display = "none");
  function lineChart(id, o) {
    const el = document.getElementById(id);
    const all = o.series.flatMap((s) => s.pts.map((p) => p.v));
    const lo = Math.min(o.zero ? 0 : Infinity, ...all);
    const hi = Math.max(o.zero ? 0 : -Infinity, ...all);
    const pad = (hi - lo) * 0.04 || Math.abs(hi) * 0.02 || 1;
    const f = frame(el, { ...o, lo: o.floor0 && lo >= 0 ? 0 : lo - pad, hi: hi + pad });
    let p = "";
    o.series.forEach((s) => {
      const col = css(s.color);
      const d = s.pts.map((q, i) => (i ? "L" : "M") + f.X(q.t).toFixed(1) + "," + f.Y(q.v).toFixed(1)).join("");
      if (s.area) {
        const base = f.Y(Math.max(f.lo, Math.min(f.hi, 0)));
        p += `<path d="${d}L${f.X(s.pts.at(-1).t).toFixed(1)},${base}L${f.X(s.pts[0].t).toFixed(1)},${base}Z" fill="${col}" fill-opacity=".14" stroke="none"/>`;
      }
      p += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (o.labels) {
        const q = s.pts.at(-1);
        s._ly = f.Y(q.v);
      }
    });
    // direct labels at the line ends (≤ 4 series), nudged apart
    if (o.labels && o.series.length <= 4) {
      const ls = o.series.map((s) => ({ s, y: s._ly })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ls.length; i++) if (ls[i].y - ls[i - 1].y < 13) ls[i].y = ls[i - 1].y + 13;
      ls.forEach(({ s, y }) => (p += `<text x="${f.w - f.m.r + 6}" y="${y + 4}" style="fill:var(--text-2)">${esc(s.name)}</text>`));
    }
    const hover = `<g class="hv" style="display:none"><line class="xh" y1="${f.m.t}" y2="${f.h - f.m.b}"/>${o.series.map((s) => `<circle r="4" fill="${css(s.color)}" stroke="${css("--surface")}" stroke-width="2"/>`).join("")}</g><rect class="ov" x="${f.m.l}" y="${f.m.t}" width="${f.w - f.m.l - f.m.r}" height="${f.h - f.m.t - f.m.b}" fill="transparent"/>`;
    const legend = o.series.length > 1 ? `<div class="legend">${o.series.map((s) => `<span><i style="background:${css(s.color)}"></i>${esc(s.name)}</span>`).join("")}</div>` : "";
    el.innerHTML = legend + svgEl(f.w, f.h, f.g + p + hover);
    const svg = el.querySelector("svg");
    const hv = svg.querySelector(".hv");
    const near = (pts, t) => {
      let lo = 0;
      let hi = pts.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].t < t) lo = mid;
        else hi = mid;
      }
      return Math.abs(pts[lo].t - t) <= Math.abs(pts[hi].t - t) ? pts[lo] : pts[hi];
    };
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * f.w;
      const t = f.x0 + ((px - f.m.l) / (f.w - f.m.l - f.m.r)) * (f.x1 - f.x0);
      const pts = o.series.map((s) => near(s.pts, t));
      const tt = pts[0].t;
      hv.style.display = "";
      hv.querySelector("line").setAttribute("x1", f.X(tt));
      hv.querySelector("line").setAttribute("x2", f.X(tt));
      hv.querySelectorAll("circle").forEach((c, i) => {
        c.setAttribute("cx", f.X(pts[i].t));
        c.setAttribute("cy", f.Y(pts[i].v));
      });
      const rows = o.series
        .map((s, i) => ({ s, v: pts[i].v }))
        .sort((a, b) => b.v - a.v)
        .map(({ s, v }) => `<div class="row"><span><span class="sw" style="background:${css(s.color)}"></span>${esc(s.name)}</span><b>${o.ft(v)}</b></div>`)
        .join("");
      showTip(el, `<div style="color:var(--text-2)">${dt(tt)} UTC</div>${rows}${o.extra ? o.extra(tt) : ""}`, (f.X(tt) / f.w) * r.width, ev.clientY - r.top);
    };
    const ov = svg.querySelector(".ov");
    ov.addEventListener("pointermove", move);
    ov.addEventListener("pointerdown", move);
    ov.addEventListener("pointerleave", () => {
      hv.style.display = "none";
      hideTip();
    });
  }
  function barChart(id, o) {
    const el = document.getElementById(id);
    const vs = o.bars.map((b) => b.v);
    const f = frame(el, { ...o, lo: Math.min(0, ...vs), hi: Math.max(0, ...vs) });
    const bw = Math.max(2, ((f.w - f.m.l - f.m.r) / Math.max(1, (f.x1 - f.x0) / H)) - 3);
    let p = "";
    o.bars.forEach((b, i) => {
      const x = f.X(b.t) + 1.5;
      const w = Math.min(bw, f.X(Math.min(b.t + H, f.x1)) - f.X(b.t) - 3);
      const y0 = f.Y(0);
      const y1 = f.Y(b.v);
      const top = Math.min(y0, y1);
      const hgt = Math.max(1, Math.abs(y1 - y0));
      const col = css(b.v >= 0 ? "--pos" : "--neg");
      // 4px rounded data end, square at the baseline
      const rr = Math.min(4, w / 2, hgt);
      const d =
        b.v >= 0
          ? `M${x},${y0}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top + rr}V${y0}Z`
          : `M${x},${y0}V${top + hgt - rr}Q${x},${top + hgt} ${x + rr},${top + hgt}H${x + w - rr}Q${x + w},${top + hgt} ${x + w},${top + hgt - rr}V${y0}Z`;
      p += `<path d="${d}" fill="${col}"/><rect class="hb" data-i="${i}" x="${x - 1.5}" y="${f.m.t}" width="${w + 3}" height="${f.h - f.m.t - f.m.b}" fill="transparent"/>`;
    });
    el.innerHTML = svgEl(f.w, f.h, f.g + p);
    const svg = el.querySelector("svg");
    svg.querySelectorAll(".hb").forEach((r) => {
      const show = (ev) => {
        const b = o.bars[+r.dataset.i];
        const rc = svg.getBoundingClientRect();
        showTip(el, o.tip(b), ((f.X(b.t) + bw / 2) / f.w) * rc.width, ev.clientY - rc.top);
        r.setAttribute("fill", "rgba(128,128,128,.10)");
      };
      r.addEventListener("pointermove", show);
      r.addEventListener("pointerdown", show);
      r.addEventListener("pointerleave", () => {
        r.setAttribute("fill", "transparent");
        hideTip();
      });
    });
  }
  const fUsd = (v) => {
    const a = Math.abs(v);
    return (v < 0 ? "−$" : "$") + (a >= 10000 ? n2(a / 1000, 1) + "k" : a >= 100 ? n2(a, 0) : n2(a, a >= 10 ? 1 : 2));
  };
  function drawAll() {
    hideTip();
    const C = D.curve;
    lineChart("cEq", {
      series: [
        { name: "Equity", color: "--s1", pts: C.map((c) => ({ t: c.t, v: c.eq })) },
        { name: "Balance", color: "--s2", pts: C.map((c) => ({ t: c.t, v: c.bal })) },
      ],
      fy: fUsd,
      ft: (v) => usd(v),
      labels: true,
      mr: 62,
      extra: (t) => {
        const c = C.find((x) => x.t === t);
        return c ? `<div class="row"><span>open</span><b>${c.op} pos / ${c.oo} orders</b></div>` : "";
      },
    });
    lineChart("cDd", {
      series: [{ name: "Drawdown", color: "--s8", area: true, pts: C.map((c) => ({ t: c.t, v: -c.ddPct * 100 })) }],
      fy: (v) => n2(v, Math.abs(v) < 1 && v !== 0 ? 1 : 0) + "%",
      ft: (v) => n2(v) + " %",
      zero: true,
    });
    lineChart("cMg", {
      series: [{ name: "Margin used", color: "--s3", area: true, pts: C.map((c) => ({ t: c.t, v: c.margin })) }],
      fy: fUsd,
      ft: (v) => usd(v),
      zero: true,
      extra: (t) => {
        const c = C.find((x) => x.t === t);
        return c ? `<div class="row"><span>open</span><b>${c.op} pos / ${c.oo} orders</b></div>` : "";
      },
    });
    barChart("cHn", {
      bars: D.hours.map((h) => ({ t: h.t, v: h.net, h })),
      fy: fUsd,
      tip: (b) =>
        `<div style="color:var(--text-2)">${hourLabel(b.h)} UTC</div><div class="row"><span>net</span><b>${susd(b.h.net)}</b></div><div class="row"><span>closed</span><b>${b.h.orders} orders · PF ${pfTxt(b.h.gp, b.h.gl, b.h.orders)}</b></div><div class="row"><span>balance</span><b>${usd(b.h.balance)}</b></div>`,
    });
    const ty = D.typeCum.filter((s) => s.pts.some((p) => p.v !== 0));
    lineChart("cTy", {
      series: ty.slice(0, 8).map((s, i) => ({ name: s.key, color: SER[i], pts: s.pts })),
      fy: fUsd,
      ft: (v) => susd(v),
      zero: true,
      labels: true,
      mr: ty.length <= 4 ? 120 : 14,
      height: 280,
    });
  }
  drawAll();
  let rz = 0;
  let lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(rz);
    rz = setTimeout(drawAll, 150);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", drawAll);
}
