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
//   --explain f.html    an explanation section (HTML fragment) placed at the top of the --html page
//   --dump raw.json     the raw session (trades, minute closes, engine aggregates); --replay raw.json rebuilds
//                       every output from it without running the engine again
// Enabled / disabled overviews (the --html page's "Types on / off", "Adjustments on / off", "Live sizing replay"):
//   after the run, the walk-forward is re-run on the final tapes once per variant (every strategy toggle, signals,
//   confirmation, direction acceptance, coordination, Block mode / steps, gates — one switch flipped each, ~30 runs,
//   sequential; each costs about the session's own walk-forward time) and stored in the dump (raw.variants); the live
//   sizing replay (rebalance threshold, exposure scaler, position cap, risk budgets, volume factor, top configs) runs
//   at report time on the baseline's positions. CTS_CORE_VARIANTS=0 skips both; CTS_CORE_VARIANTS_MIN_MB (1500)
//   stops the variants below that much available memory. --replay-unit 2 / --replay-min 2: the replay's lane unit and
//   exchange minimum (USD).
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
/** min / max of a large array (spreading 100k+ values into Math.min / Math.max overflows the call stack) */
const minOf = (xs) => xs.reduce((a, x) => (x < a ? x : a), Infinity);
const maxOf = (xs) => xs.reduce((a, x) => (x > a ? x : a), -Infinity);

const { profitFactor, statsOf } = await import("../src/core/metrics/stats.ts");
{
  const { allocatorWarning } = await import("../src/core/server/memguard.server.ts");
  const w = allocatorWarning();
  if (w) process.stderr.write(`${w}\n`);
}
const { closedPositions, openTimeline } = await import("../src/core/positions.ts");
const { laneLabel, laneOf, isSignalInd, signalSourceOf } = await import("../src/core/indications/registry.ts");
const { rangeOfId, RANGE_LABEL, minPfOf } = await import("../src/core/minimal-coord.ts");
const { kindOfInd, configEval, tapeExecutable, ddtLimitH, EVAL_GATES, walkForward, selectionScoreAt } = await import(
  "../src/core/sim/walkforward.ts"
);
const { walkForwardVariants, summarizeRun, effectOf, sizingReplay, sizingVariants } = await import(
  "../src/core/sim/report-variants.ts"
);
const { kindOfTrade } = await import("../src/core/statistics.ts");
const { sizeBook, orderKey } = await import("../src/core/sizing.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);
// --render html/data.json: rebuild the report from a finished run's dump (a 12 h compute must never be lost to a
// rendering error) — writes index.html next to it, or into --html
if (arg("render")) {
  const dump = arg("render");
  const d = JSON.parse(readFileSync(dump, "utf8"));
  const out = arg("html") ?? dirname(dump);
  mkdirSync(out, { recursive: true });
  const ex = arg("explain") ? readFileSync(arg("explain"), "utf8").trim() : "";
  const page = renderHtml(d);
  writeFileSync(join(out, "index.html"), ex ? page.replace("<body>\n", () => `<body>\n${ex}\n`) : page);
  process.stderr.write(`rendered ${join(out, "index.html")}\n`);
  process.exit(0);
}
const H = 3_600_000;
const M = 60_000;
let balance0 = Number(arg("balance", 10));
let notional = Number(arg("notional", 5)); // fixed sizing: USD per order volume unit
// default sizing: a fixed % of equity per order (compounding from the start balance)
let sizing = { mode: arg("sizing", "equityPct") === "fixed" ? "fixed" : "equityPct", pct: Number(arg("pct", 0.02)) };
let leverage = Number(arg("leverage", 10));

// ── 1. the engine run (or a replay of a dumped one) ──────────────────────────────────────────────────────────
/**
 * Processing coverage of the last compute: every combo evaluated at Base (against the combos the settings ask for),
 * per indication kind evaluated / passed, config sets (tapes) per strategy type × range, signal processing.
 */
async function coverageOf(rt, s) {
  const { allCombos, passesBase } = await import("../src/core/pipeline/pipeline.ts");
  const { signalCombos } = await import("../src/core/signals.ts");
  const { signalSettings } = await import("../src/core/signal-config.ts");
  const { baseFocus } = await import("../src/core/server/runtime.server.ts");
  const { INDICATIONS } = await import("../src/core/indications/registry.ts");
  // the same Micro lane floor the runtime applies (a Micro pair below it can pass nothing)
  const { rangeMinTfOf } = await import("../src/core/minimal-coord.ts");
  const microOwn = !!s.grid?.micro && s.grid.micro.ownInds !== false;
  const microTf = microOwn ? (rangeMinTfOf(s.grid ?? {}).mc ?? 0) : 0;
  const engineCombos = allCombos(baseFocus(s), s.disabledKinds, s.tfs, microTf).length;
  const sigCombos = signalCombos(signalSettings(s.signals), s.tfs).length;
  const s1 = rt.pipeline?.s1 ?? [];
  const byKind = {};
  for (const r of s1) {
    const k = isSignalInd(r.ind) ? "signal" : kindOfInd(r.ind);
    const a = (byKind[k] ??= { evaluated: 0, passed: 0 });
    a.evaluated++;
    if (passesBase(r.full, s.gates)) a.passed++;
  }
  const kindsAll = [...new Set(INDICATIONS.map((x) => x.kind))].filter((k) => !(s.disabledKinds ?? []).includes(k));
  const tapes = {};
  for (const t of rt.tapes) {
    const k = `${t.kind}|${t.protect?.tag || "wide"}`;
    const a = (tapes[k] ??= { configs: 0, closes: 0 });
    a.configs++;
    a.closes += t.n;
  }
  // per indication (the base indication, every lane together): Base evaluated / passed (the default cell or a range's
  // own cell), the strategy sets built (type × exit model), the configs validated (seated in the Real stage at least
  // once) and executed, orders, PF and exits by reason — the whole funnel of each indication
  const { rangeCellPass } = await import("../src/core/pipeline/pipeline.ts");
  const cellPass = rangeCellPass(s.gates);
  const ind = {};
  const indOf = (i) => {
    const base = laneOf(i).base;
    return (ind[base] ??= {
      kind: isSignalInd(i) ? "signal" : kindOfInd(i),
      lanes: new Set(),
      baseEval: 0,
      basePass: 0,
      rangePass: 0,
      sets: {},
      exitModels: {},
      configs: 0,
      validated: 0,
      executed: 0,
      orders: 0,
      gp: 0,
      gl: 0,
      exits: {},
    });
  };
  for (const r of s1) {
    const a = indOf(r.ind);
    a.lanes.add(laneOf(r.ind).tf ?? s.tfMin);
    a.baseEval++;
    if (passesBase(r.full, s.gates)) a.basePass++;
    if (Object.entries(r.ranges ?? {}).some(([tag, st]) => cellPass(tag, st))) a.rangePass++;
  }
  const seated = new Set();
  for (const st of rt.sim?.steps ?? []) for (const id of st.real ?? []) seated.add(id);
  const executedIds = new Set();
  for (const t of rt.sim?.trades ?? []) executedIds.add(t.cfg);
  const exitModel = (p) => (p?.atr ? "atr" : (p?.trail ?? 0) > 0 ? "trailing" : "fixed");
  const byId = new Map(rt.tapes.map((t) => [t.id, t]));
  for (const t of rt.tapes) {
    const a = indOf(t.ind);
    a.configs++;
    a.sets[t.kind] = (a.sets[t.kind] ?? 0) + 1;
    const em = exitModel(t.protect);
    a.exitModels[em] = (a.exitModels[em] ?? 0) + 1;
    if (seated.has(t.id)) a.validated++;
    if (executedIds.has(t.id)) a.executed++;
  }
  // exits by strategy type × exit model × reason (is every exit strategy running?)
  const exits = {};
  for (const x of rt.sim?.trades ?? []) {
    const tp = byId.get(x.cfg);
    const a = indOf(tp?.ind ?? x.cfg.split("|")[1] ?? "?");
    a.orders++;
    if (x.r > 0) a.gp += x.r;
    else a.gl -= x.r;
    const why = x.reason ?? "close";
    a.exits[why] = (a.exits[why] ?? 0) + 1;
    const k = `${x.kind ?? tp?.kind ?? "normal"}|${exitModel(tp?.protect)}|${why}`;
    const e = (exits[k] ??= { n: 0, gp: 0, gl: 0 });
    e.n++;
    if (x.r > 0) e.gp += x.r;
    else e.gl -= x.r;
  }
  for (const a of Object.values(ind)) a.lanes = [...a.lanes].sort((x, y) => x - y);
  return {
    perInd: ind,
    exits,
    expectedCombos: engineCombos + sigCombos,
    engineCombos,
    signalCombos: sigCombos,
    evaluated: s1.length,
    byKind,
    kindsAll,
    tapes,
    toggles: s.toggles,
    ranges: { mc: !!s.grid.micro, mn: !!s.grid.minimal, sh: !!s.grid.short, gn: !!s.grid.general, lg: !!s.grid.long },
  };
}

/** MB of memory the kernel can still hand out (null when unknown) */
function memAvailMb() {
  try {
    const m = /MemAvailable:\s+(\d+)/.exec(readFileSync("/proc/meminfo", "utf8"));
    return m ? Math.round(Number(m[1]) / 1024) : null;
  } catch {
    return null;
  }
}

/**
 * Enabled / disabled overviews: the session's walk-forward re-run on its final tapes, universe and options (no new
 * tapes), once per variant — every strategy type and every cheap adjustment flipped one at a time against the
 * baseline (the options as run). Sequential, in-process; each result is reduced to per-hour aggregates and a trade-set
 * fingerprint before the next run (its trades are dropped). A variant whose trade set equals the baseline's is "no
 * effect". Below CTS_CORE_VARIANTS_MIN_MB (default 1500) of available memory the remaining variants are skipped.
 */
function runVariants(rt, sim) {
  const t0 = Date.now();
  const u0 = rt.lastUniverse;
  // the options the session's walk-forward ran with (sim.opts: without the protect grids, which it does not read)
  const base = { ...sim.opts, protects: [], dcaProtects: [] };
  // the walk-forward reads only the universe's end and base timeframe (as the compare workers do)
  const u = {
    bars: [],
    caches: [],
    startT: 0,
    endT: 0,
    splitT: 0,
    nowT: base.startT === undefined ? sim.endT : (u0?.nowT ?? sim.endT),
    baseTf: u0?.baseTf ?? 1,
  };
  const kinds = {};
  let signalTapes = 0;
  for (const tp of rt.tapes) {
    if (isSignalInd(tp.ind)) signalTapes++;
    else kinds[tp.kind] = (kinds[tp.kind] ?? 0) + 1;
  }
  const specs = walkForwardVariants(base, { kinds, signalTapes, tactics: rt.settings.tactics });
  const minMb = Number(process.env.CTS_CORE_VARIANTS_MIN_MB || 1500);
  const nRun = specs.filter((v) => v.status === "run").length + 1;
  const mainMs = rt.status.phases?.Simulation?.ms ?? null;
  process.stderr.write(
    `variants: ${nRun} walk-forward runs on ${rt.tapes.length.toLocaleString("en-US")} tapes (${signalTapes} signal)` +
      `${mainMs ? ` · the session's own run took ${Math.round(mainMs / 1000)} s` : ""} · CTS_CORE_VARIANTS=0 skips them\n`,
  );
  const session = summarizeRun(sim, sim.startT, sim.endT);
  const one = (opts) => {
    const ts = Date.now();
    let res = walkForward(u, rt.tapes, opts);
    const summary = summarizeRun(res, sim.startT, sim.endT);
    res = null;
    return { summary, ms: Date.now() - ts };
  };
  const rss = () => Math.round(process.memoryUsage().rss / 1e6);
  const b = one(base);
  const baseline = { id: "baseline", group: "baseline", label: "Baseline (as run)", change: "–", asRun: "–", status: "run", ...b };
  process.stderr.write(
    `  [1/${nRun}] baseline · ${b.summary.orders} orders · PF ${b.summary.pf.toFixed(2)} · net ${b.summary.net.toFixed(2)} % · ` +
      `${b.ms} ms · rss ${rss()} MB · ${b.summary.fp === session.fp ? "reproduces the session run" : "DIFFERS from the session run"}\n`,
  );
  const rows = [baseline];
  let k = 1;
  let lowMem = null;
  for (const v of specs) {
    const { opts, ...meta } = v;
    if (v.status !== "run") {
      rows.push(meta);
      continue;
    }
    const avail = memAvailMb();
    if (lowMem || (avail !== null && avail < minMb)) {
      lowMem ??= avail;
      rows.push({ ...meta, status: "skipped", why: `skipped: ${lowMem} MB available (< ${minMb} MB)` });
      continue;
    }
    const r = one(opts);
    k++;
    const effect = effectOf(r.summary, b.summary);
    rows.push({ ...meta, ...r, effect });
    process.stderr.write(
      `  [${k}/${nRun}] ${v.label} · ${r.summary.orders} orders · PF ${r.summary.pf.toFixed(2)} · net ${r.summary.net.toFixed(2)} % · ` +
        `${effect === "none" ? "no effect" : effect === "volume" ? "volume changed" : "orders changed"} · ${r.ms} ms · rss ${rss()} MB\n`,
    );
  }
  if (lowMem !== null) process.stderr.write(`  variants stopped: ${lowMem} MB available (< ${minMb} MB)\n`);
  return {
    v: 1,
    startT: sim.startT,
    endT: sim.endT,
    tapes: rt.tapes.length,
    signalTapes,
    kinds,
    reproduces: b.summary.fp === session.fp,
    session: { orders: session.orders, pf: session.pf, net: session.net },
    mainSimMs: mainMs,
    totalMs: Date.now() - t0,
    rows,
  };
}

async function runEngine() {
  const symbols = Number(arg("symbols", 12));
  const preH = Number(arg("pre", 6));
  const runH = Number(arg("run", 6));
  // default = the engine's own tactics (trend strength + volatility regime on); off = every tactic off; all = all on
  const tacticsMode = arg("tactics", "default");
  const signalsOn = arg("signals", "on") === "on";
  const allTactics = { session: true, volRegime: true, trendStrength: true, cooldown: true, cooldownBars: 4 };
  const noTactics = { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 };
  const { CoreRuntime, onCoreEvent } = await import("../src/core/server/runtime.server.ts");
  const { fetchHistory, fetchKlines } = await import("../src/core/market/bingx.ts");
  const { CoreDb } = await import("../src/core/server/db.server.ts");
  // --end-ago H: replay the market as it was H hours ago (the engine only sees candles before that hour)
  // --end-at ISO: the same cut for every run (variants compared on one market window)
  const endAgo = Number(arg("end-ago", 0));
  const endAt = arg("end-at", "") ? Math.floor(Date.parse(arg("end-at", "")) / H) * H : 0;
  const cutT = endAt > 0 ? endAt : endAgo > 0 ? Math.floor(Date.now() / H) * H - endAgo * H : 0;
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
    // the session's own symbol count wins over the desk's (a desk file carries x01's 50: with the session now waiting
    // for the full universe, every "--symbols 12" run computed 50 symbols)
    rt.updateSettings({ symbols });
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
  // causal by default: Base / Main / Real rank on the history before the run (--lookahead: on every bar up to the
  // end, as the live desk does — the run is then partly in-sample)
  const wfExtra = { causalBase: !flag("lookahead"), ...wfAll, ...JSON.parse(arg("wf", "{}")) };
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
  // the runtime starts progressively: it loads a batch of symbols (5 of 12), computes it, then loads the next batch.
  // The session waits for the compute over the COMPLETE universe, not the first batch's: the first moment every
  // symbol is loaded (no batch pending), the compute running then (or the next one) is the first to cover them all —
  // a backfill only happens at the start of a cycle, before its compute. (prehistoric.complete is not enough: it
  // turns true while the last compute is still running, with the previous compute's book in rt.sim.)
  let fullFrom = null;
  let memAbortsSeen = 0;
  // the universe the engine really loads: the symbol count of the applied settings (a desk file or --settings may
  // change --symbols), or every forced symbol when there are more of them — the progress line showed loaded /
  // --symbols ("symbols 13/12") and the completion check fired on --symbols with the universe still loading
  const target = () => (typeof rt.universeTarget === "function" ? rt.universeTarget() : rt.settings.symbols);
  if (target() !== symbols)
    process.stderr.write(`  note: the engine's universe is ${target()} symbols (--symbols ${symbols}; desk / settings / forced symbols)\n`);
  // state, stage % (the job's %), label, symbols loaded of the universe (never over 100 %), computes, paper step
  const progressLine = () => {
    const st = rt.status;
    const pct = (x) => `${Math.round(Math.min(1, Math.max(0, x ?? 0)) * 100)}%`;
    return (
      `${st.state} ${st.stage} ${pct(st.progress)} (job ${pct(st.overall)}) ${st.label} · ` +
      `symbols ${rt.candles.size}/${Math.max(target(), rt.candles.size)} · computes ${st.computes} · ` +
      `paper on #${st.paperCompute ?? 0} · rss ${Math.round(process.memoryUsage().rss / 1e6)} MB`
    );
  };
  const complete = () => {
    // every symbol of the universe loaded; or, when a symbol had too little history and was skipped, no batch left
    // after a first compute (prehistPending starts false and is set only after each batch is stored, so it alone is
    // not proof)
    if (
      fullFrom === null &&
      (rt.candles.size >= target() ||
        (rt.status.computes >= 1 && rt.prehistPending === false && rt.status.stage !== "backfill"))
    )
      fullFrom = rt.status.computes;
    return fullFrom !== null && rt.status.computes > fullFrom;
  };
  while (!complete()) {
    if (Date.now() - t0 > Number(arg("max-wait-min", 120)) * 60_000) {
      process.stderr.write(`  universe not complete after ${arg("max-wait-min", 120)} min: reporting the last compute\n`);
      if (rt.status.computes >= 1) break;
    }
    if (rt.status.state === "error" && Date.now() - t0 > 600_000) throw new Error(rt.status.error ?? "engine error");
    // computes aborted on memory pressure at the lightest level, again and again: the run cannot finish (and a
    // finished one would not be the asked settings) — stop with the reason instead of waiting forever
    const mem = rt.status.mem;
    if (mem?.aborts > memAbortsSeen) {
      memAbortsSeen = mem.aborts;
      process.stderr.write(`  memory: ${mem.lastAbort} · fallback ${mem.fallbackLabel}\n`);
    }
    if (mem?.retryAt && mem.abortsInRow >= 3)
      throw new Error(
        `memory: ${mem.abortsInRow} computes in a row aborted at the lightest level (${mem.availMb} MB available, ` +
          `hard ${process.env.CTS_CORE_MEM_HARD_MB || 1200} MB) — free memory or lower CTS_CORE_MEM_HARD_MB`,
      );
    await new Promise((r) => setTimeout(r, 1000));
    if (Date.now() - lastLog > 30_000) {
      lastLog = Date.now();
      process.stderr.write(`  [${Math.round((Date.now() - t0) / 1000)} s] ${progressLine()}\n`);
    }
  }
  // the dump reads the paper step's seats (rt.paper.selected), and that step runs after the compute in the same
  // cycle: dumping on computes alone reported Real seats 0 while the simulation traded 589 orders. Wait for the paper
  // step on the reported compute (status.paperCompute ≥ computes), then stop the loop at once, inside its "paper"
  // event (a later compute would otherwise replace rt.sim / rt.tapes under the dump).
  const paperWaitS = Number(arg("paper-wait-s", 900));
  const paperT0 = Date.now();
  const paperDone = () => (rt.status.paperCompute ?? 0) >= rt.status.computes;
  const paperOk = await new Promise((resolve) => {
    if (paperDone()) return resolve(true);
    let poll = null;
    let timer = null;
    const finish = (ok) => {
      off();
      clearInterval(poll);
      clearTimeout(timer);
      resolve(ok);
    };
    const off = onCoreEvent((e) => {
      if (e.type !== "paper" || !paperDone()) return;
      rt.stop();
      finish(true);
    });
    poll = setInterval(() => {
      if (paperDone()) return finish(true);
      if (Date.now() - lastLog > 30_000) {
        lastLog = Date.now();
        process.stderr.write(`  [${Math.round((Date.now() - t0) / 1000)} s] waiting for the paper step · ${progressLine()}\n`);
      }
    }, 1000);
    timer = setTimeout(() => finish(false), paperWaitS * 1000);
  });
  if (rt.status.state !== "stopped") rt.stop();
  if (paperOk)
    process.stderr.write(
      `  paper step on compute #${rt.status.paperCompute}: ${rt.paper.selected?.length ?? 0} Real seats (${Math.round((Date.now() - paperT0) / 1000)} s after the compute)\n`,
    );
  else
    process.stderr.write(
      `  WARNING: the paper step on compute #${rt.status.computes} did not finish within ${paperWaitS} s (--paper-wait-s) — ` +
        `Real seats are from the paper step on compute #${rt.status.paperCompute ?? 0} (${rt.paper.selected?.length ?? 0})\n`,
    );
  clearInterval(rssT);
  const sim = rt.sim;
  if (!sim) throw new Error("no simulated run");
  // the symbols the reported compute covered (every tape carries its universe)
  const uni = new Set();
  const seenSyms = new Set();
  for (const tp of rt.tapes) {
    if (seenSyms.has(tp.syms)) continue;
    seenSyms.add(tp.syms);
    for (const x of tp.syms) uni.add(x);
  }
  if (uni.size !== rt.candles.size)
    process.stderr.write(`  WARNING: the reported compute covered ${uni.size} of ${rt.candles.size} loaded symbols\n`);
  process.stderr.write(
    `  compute #${rt.status.computes} over ${uni.size} symbols (${rt.candles.size} loaded of ${target()}, ${symbols} asked) after ${Math.round((Date.now() - t0) / 1000)} s\n`,
  );
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
  // the seat evaluation at the run start: engine configs on configEval (the gates the seat selection applies, every
  // config on its own closes: PF ≥ its range's minimum, positive net, ≥ minTrades closes, per-tape DDT limit …);
  // signal configs are not seated by configEval but by their own signal activation — they count as seated when
  // their signal pair is active at the run start
  const byRangeEval = new Map();
  const byKindEval = new Map();
  const G = rt.settings.gates;
  const selH = Math.max(rt.wf.longH, rt.wf.preH);
  const ddtMaxH = (G.maxDdtH * selH) / 72;
  const evalStats = { configs: 0, evaluated: 0, passed: 0, signalTapes: 0, signalActive: 0 };
  // stage funnel, hour by hour (unit basis, closes in the run): Base pairs before / after the Base gate, every config
  // of the passed pairs (the pool), the seated configs — the executed orders come from the trades at render time
  const nH = Math.ceil((endT - startT) / H);
  const fz = () => Array.from({ length: nH }, () => ({ n: 0, w: 0, gp: 0, gl: 0 }));
  const FUNNEL_KEYS = ["beforeBase", "afterBase", "pool", "poolNormal", "poolTrailing", "seated", "seatedNormal", "seatedTrailing"];
  const funnel = { nH, ...Object.fromEntries(FUNNEL_KEYS.map((k) => [k, fz()])), counts: {} };
  const fadd = (arr, exitT, r) => {
    const i = Math.ceil((exitT - startT) / H) - 1;
    if (i < 0 || i >= nH) return;
    const c = arr[i];
    c.n++;
    if (r > 0) {
      c.w++;
      c.gp += r;
    } else c.gl -= r;
  };
  // per range: configs, passed, and how many failed at each gate (the first gate they missed); the PF / n / net of
  // every config configEval evaluated (pass or fail) and of the passed ones; the per-tape DDT limit
  const evalFails = {};
  const evalPfs = {};
  // the configs of the pairs that PASSED Base (per range: the range's own Base cell; wide: the default cell) and the
  // first Real gate each of them misses — where the validation fails after stage Base
  const { passesBase, rangeCellPass } = await import("../src/core/pipeline/pipeline.ts");
  const cellPass = rangeCellPass(G);
  const basePassed = new Set();
  for (const r of rt.pipeline?.s1 ?? []) {
    if (passesBase(r.full, G)) basePassed.add(`${r.bot}|${r.ind}|wide`);
    for (const [tag, st] of Object.entries(r.ranges ?? {})) if (cellPass(tag, st)) basePassed.add(`${r.bot}|${r.ind}|${tag}`);
  }
  const evalAfterBase = {};
  // the signal pairs active at the run start (the first step's active set, else the runtime's current set)
  const sigStep0 = (sim.signalSteps ?? []).find((x) => x.t <= startT) ?? sim.signalSteps?.[0] ?? null;
  const sigActive = new Set(
    [...(sigStep0?.keys ?? rt.wf.signalActive ?? [])].map((k) => String(k).split("|").slice(0, 2).join("|")),
  );
  for (const tp of rt.tapes) {
    const sig = isSignalInd(tp.ind);
    const r = rangeOfId(tp.id);
    const rl = sig ? "Signals" : RANGE_LABEL[r];
    const kl = sig ? `signal:${signalSourceOf(tp.ind)}` : kindOfInd(tp.ind);
    // the book's rule: orders entered at or after the start and closed by the end
    const ex = tp.exitT.subarray(0, tp.n);
    const a = lb(ex, startT);
    const b = lb(ex, endT + 1);
    let n = 0;
    let w = 0;
    let gp = 0;
    let gl = 0;
    for (let i = a; i < b; i++) {
      if (tp.entryT[i] < startT) continue;
      const x = tp.r[i];
      fadd(funnel.pool, ex[i], x);
      if (tp.kind === "normal") fadd(funnel.poolNormal, ex[i], x);
      else if (tp.kind === "trailing") fadd(funnel.poolTrailing, ex[i], x);
      n++;
      if (x > 0) {
        w++;
        gp += x;
      } else gl -= x;
    }
    const p = tp.protect;
    const sk = `${rl}|${tp.kind}`;
    if (!byRange.has(sk)) byRange.set(sk, acc());
    add(byRange.get(sk), n, w, gp, gl);
    evalStats.configs++;
    let seated = false;
    if (sig) {
      evalStats.signalTapes++;
      seated = sigActive.has(`${tp.bot}|${tp.ind}`) && tapeExecutable(tp, rt.wf);
      if (seated) evalStats.signalActive++;
    } else {
      // the walk-forward seats a config only when its pair passed Base (wf.basePassed) — counted apart, as "type off"
      const baseOk = !rt.wf.basePassed || rt.wf.basePassed.has(`${tp.bot}|${tp.ind}`);
      const ex2 = tapeExecutable(tp, rt.wf) && baseOk;
      const ev = ex2
        ? configEval(tp, startT, rt.wf)
        : { ok: false, fail: tapeExecutable(tp, rt.wf) ? "base off" : "type off" };
      const fails = (evalFails[rl] ??= { configs: 0, passed: 0 });
      fails.configs++;
      const pfs = (evalPfs[rl] ??= { evaluated: [], passed: [], ddtLimitH: [] });
      if (ex2) {
        evalStats.evaluated++;
        pfs.evaluated.push(+ev.pf.toFixed(4));
        pfs.ddtLimitH.push(+Math.min(ddtMaxH, ddtLimitH(rt.wf, tp, startT, selH)).toFixed(2));
      }
      if (basePassed.has(`${tp.bot}|${tp.ind}|${r || "wide"}`)) {
        const f = (evalAfterBase[`${rl}|${tp.kind}`] ??= { configs: 0, passed: 0, pfs: [] });
        f.configs++;
        if (ev.ok) f.passed++;
        else f[ev.fail] = (f[ev.fail] ?? 0) + 1;
        if (ex2 && Number.isFinite(ev.pf)) f.pfs.push(ev.pf);
      }
      if (!ev.ok) {
        fails[ev.fail] = (fails[ev.fail] ?? 0) + 1;
        continue;
      }
      fails.passed++;
      evalStats.passed++;
      pfs.passed.push(+ev.pf.toFixed(4));
      seated = true;
    }
    if (!seated) continue;
    for (let i = a; i < b; i++) {
      if (tp.entryT[i] < startT) continue;
      fadd(funnel.seated, ex[i], tp.r[i]);
      if (tp.kind === "normal") fadd(funnel.seatedNormal, ex[i], tp.r[i]);
      else if (tp.kind === "trailing") fadd(funnel.seatedTrailing, ex[i], tp.r[i]);
    }
    if (!byRangeEval.has(sk)) byRangeEval.set(sk, acc());
    add(byRangeEval.get(sk), n, w, gp, gl);
    const ek = `${rl}|${kl}`;
    if (!byKindEval.has(ek)) byKindEval.set(ek, acc());
    add(byKindEval.get(ek), n, w, gp, gl);
    // every table below: seated configs only
    const ik = `${rl}|${tp.bot}|${tp.ind}`;
    if (!byInd.has(ik)) byInd.set(ik, { ...acc(), best: null });
    const bi = byInd.get(ik);
    add(bi, n, w, gp, gl);
    if (n >= 5 && (!bi.best || gp - gl > bi.best.net)) bi.best = { id: tp.id, n, gp, gl, pf: profitFactor(gp, gl), net: gp - gl };
    const ck = p
      ? `${rl}|tp ${(p.tp * 100).toFixed(3)}%${r === "mc" ? ` (net ${((p.tp - (rt.settings.cost ?? 0.002)) * 100).toFixed(3)}%)` : ""}|sl ${(p.sl / p.tp).toFixed(2)}×|tr ${p.trail ? (p.trail / p.tp).toFixed(2) + "×" : "off"}`
      : `${rl}|–|–|–`;
    if (!cells.has(ck)) cells.set(ck, { ...acc(), range: rl, tp: p?.tp, sl: p?.sl, trail: p?.trail });
    add(cells.get(ck), n, w, gp, gl);
    const kk = `${rl}|${kl}`;
    if (!byKind.has(kk)) byKind.set(kk, acc());
    add(byKind.get(kk), n, w, gp, gl);
    // causal gate: last gateN closes before the run
    if (a >= gateN) {
      const pgp = tp.gp[a] - tp.gp[a - gateN];
      const pgl = tp.gl[a] - tp.gl[a - gateN];
      const pf = profitFactor(pgp, pgl);
      for (const g of gatePfs) {
        if (pf < g) continue;
        const k = `${rl}|${g}`;
        if (!gate.has(k)) gate.set(k, acc());
        add(gate.get(k), n, w, gp, gl);
      }
    }
  }
  const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  for (const [k, v] of Object.entries(evalPfs))
    Object.assign(evalFails[k], {
      pfEvaluatedMedian: median(v.evaluated),
      pfPassedMedian: median(v.passed),
      evaluatedN: v.evaluated.length,
      ddtLimitMinH: v.ddtLimitH.length ? minOf(v.ddtLimitH) : null,
      ddtLimitMedianH: median(v.ddtLimitH),
      ddtLimitMaxH: v.ddtLimitH.length ? maxOf(v.ddtLimitH) : null,
    });
  // open orders at the end: the engine executes the orders still open at the run's end through every gate, cap and
  // Block volume and marks them to market (sim.openAtEnd). Older engines without it: the tape-level positions still
  // open of the configs the run executed, an upper bound at one unit of volume.
  const exact = Array.isArray(sim.openAtEnd);
  const openEnd = [];
  if (exact)
    for (const x of sim.openAtEnd)
      openEnd.push({ cfg: x.cfg, sym: x.sym, side: x.side, entryT: x.entryT, entry: x.entry, mtmR: x.r, kind: x.kind, vol: x.vol ?? 1, mult: x.mult ?? 1 });
  else {
    const executed = new Set(sim.trades.map((x) => x.cfg));
    for (const tp of rt.tapes) {
      if (!executed.has(tp.id)) continue;
      for (const o of tp.open ?? [])
        if (o.entryT >= startT && o.entryT <= endT)
          openEnd.push({ cfg: tp.id, sym: o.sym, side: o.side, entryT: o.entryT, entry: o.entry, mtmR: o.mtm, kind: tp.kind, vol: 1 });
    }
  }
  // Base: every engine pair at its default protect (full history; in-sample for the run unless causal Base is on),
  // before the gate and the pairs that passed it (any range) — closes inside the run
  {
    const tags = rt.basePairTags ?? {};
    let evaluated = 0;
    let passed = 0;
    for (const r of rt.pipeline?.s1 ?? []) {
      if (isSignalInd(r.ind)) continue;
      evaluated++;
      const ok = !!tags[`${r.bot}|${r.ind}`];
      if (ok) passed++;
      // (the stored Base runs are slim — no trades — so Base is reported as counts, not per hour)
    }
    funnel.counts = {
      basePairs: evaluated,
      basePassed: passed,
      poolConfigs: evalStats.configs,
      seatedConfigs: evalStats.passed + evalStats.signalActive,
      causalBase: !!rt.wf.causalBase,
    };
  }
  // enabled / disabled overviews: walk-forward variants on these final tapes (CTS_CORE_VARIANTS=0 skips them)
  const variants = process.env.CTS_CORE_VARIANTS === "0" ? null : runVariants(rt, sim);
  // the live sizing replay's lanes: every executed config's stop distance (its protect) and selection score at the
  // run start (the top-config ranking)
  const cfgInfo = {};
  {
    const byId = new Map(rt.tapes.map((t) => [t.id, t]));
    for (const x of [...sim.trades, ...(sim.openAtEnd ?? [])]) {
      if (cfgInfo[x.cfg]) continue;
      const tp = byId.get(x.cfg);
      if (tp) cfgInfo[x.cfg] = [+(tp.protect?.sl ?? 0).toFixed(5), +selectionScoreAt(tp, startT, rt.wf).toFixed(4)];
    }
  }
  const selected = rt.paper.selected ?? [];
  const realSignal = selected.filter((id) => isSignalInd(String(id).split("|")[1] ?? "")).length;
  const obj = (m) => Object.fromEntries([...m.entries()].map(([k, c]) => [k, { ...c, pf: profitFactor(c.gp, c.gl) }]));
  const s = rt.settings;
  return {
    at: new Date().toISOString(),
    runSeconds: Math.round((Date.now() - t0) / 1000),
    symbols: rt.status.symbols,
    // the dump's format: 2 = signals bucketed apart, seat evaluation per range with PF medians, open positions at the
    // end, Real split, the live caps and the book settings
    v: 2,
    settings: {
      symbolsAsked: symbols,
      // the report book's settings (a --replay / --render uses them unless the flags say otherwise)
      book: { balance: balance0, sizing, notional, leverage },
      live: {
        maxPositionX: s.live?.maxPositionX ?? null,
        maxExposureX: s.live?.maxExposureX ?? null,
        maxRiskPct: s.live?.maxRiskPct ?? null,
        maxPositions: s.live?.maxPositions ?? null,
        // the rest of the live sizing (the sizing replay's reference)
        exposureScaler: s.live?.exposureScaler ?? null,
        maxBackstopLossPct: s.live?.maxBackstopLossPct ?? null,
        maxNotionalUsd: s.live?.maxNotionalUsd ?? null,
        notionalUsd: s.live?.notionalUsd ?? null,
        ratio: s.live?.ratio ?? null,
        top: s.live?.top ?? null,
        rebalancePct: s.live?.rebalancePct ?? null,
        minStopPct: s.live?.minStopPct ?? null,
        sizingMode: s.sizing?.mode ?? null,
      },
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
          "preH", "simH", "stepH", "causalBase", "portfolio", "lastN", "lastNMinPf", "validLastN", "signalValidLastN", "maxPerSymbol",
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
    funnel,
    variants,
    cfgInfo,
    trades: [...sim.trades].sort((a, b) => a.exitT - b.exitT),
    openEnd,
    openEndRule: exact
      ? "exact: the orders the engine executed in the run and still open at its end (every gate, cap and Block volume applied), marked to market at the last close"
      : "upper bound: tape-level positions still open at the last bar (normal / trailing tapes), entered in the run, of the configs the run executed; the sim's Real gates / caps are not re-applied; one unit of volume",
    closes,
    presets: rt.db.kvGet("presetSims")?.presets ?? {},
    engine: {
      computeMs: rt.status.lastComputeMs,
      baseEvaluated: rt.status.baseEvaluated,
      basePassed: rt.status.basePassed,
      baseByRange: rt.status.baseByRange ?? [],
      baseGates: rt.status.baseGates ?? [],
      mainPairs: rt.status.mainPairs,
      tapes: rt.tapes.length,
      real: selected.length,
      realSignal,
      realEngine: selected.length - realSignal,
      signals: rt.status.signals ?? null,
      rssMaxMb: Math.round(rssMax / 1e6),
      computes: rt.status.computes,
      universe: [...uni],
      skips: sim.skips,
      mem: rt.status.mem ?? null,
      // the event loop over the run and each compute phase's longest slice (latency: the live tick runs between them)
      loop: rt.status.loop ?? null,
      phases: rt.status.phases ?? null,
      stalls: rt.status.stalls ?? [],
      coverage: await coverageOf(rt, s),
    },
    tapeAgg: {
      gateN,
      rangeCells: obj(cells),
      rangeByType: obj(byRange),
      rangeByTypeEval: obj(byRangeEval),
      rangeByKindEval: obj(byKindEval),
      evalStats,
      v: 2,
      evalRule: {
        minPf: G.minPf,
        rangeMinPf: G.rangeMinPf ?? {},
        minTrades: G.minTrades,
        ddtMaxH,
        maxDdtH: G.maxDdtH,
        preH: selH,
        maxDdr: G.maxDdr ?? 0,
        minGreen: G.minGreen ?? 0.5,
        validLastN: rt.wf.validLastN ?? 0,
        lastN: rt.wf.lastN ?? 0,
        rangeGate: rt.wf.rangeGate ?? null,
      },
      evalFails,
      // per range × type: the configs of Base-passed pairs and their first failing Real gate (PF median of those evaluated)
      evalAfterBase: Object.fromEntries(
        Object.entries(evalAfterBase).map(([k, v]) => {
          const xs = v.pfs.sort((a, b) => a - b);
          const { pfs: _p, ...rest } = v;
          return [k, { ...rest, pfMedian: xs.length ? +xs[xs.length >> 1].toFixed(3) : null }];
        }),
      ),
      rangeByKind: obj(byKind),
      indications: obj(byInd),
      rangeGate: obj(gate),
    },
  };
}

// --replay raw.json / --render raw.json: rebuild every output from a dump, without running the engine again
const replay = arg("replay") ?? arg("render");
const raw = replay ? JSON.parse(readFileSync(replay, "utf8")) : await runEngine();
// a replay sizes the book as the dumped run did, unless the flags say otherwise (dumps before v2 carry no book
// settings: pass --balance / --pct / --leverage as the original run had them)
if (replay && raw.settings.book) {
  const b = raw.settings.book;
  if (arg("balance") === undefined) balance0 = b.balance;
  if (arg("notional") === undefined) notional = b.notional;
  if (arg("sizing") === undefined && arg("pct") === undefined) sizing = b.sizing;
  if (arg("leverage") === undefined) leverage = b.leverage;
}
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
// the live caps the report book applies when it sizes entries (as live sizes them): every position (symbol × side)
// at most maxPositionX × equity notional, the gross (long and short both counted) at most maxExposureX × equity.
// From the dump (settings.live, v2), else the dumped run's desk file, else x01's (0.75 / 7); flags override;
// --caps off sizes without them
const capsOn = arg("caps", "on") !== "off";
let liveCaps = raw.settings.live ?? null;
let capsSource = liveCaps ? "dump (settings.live)" : null;
if (!liveCaps && raw.settings.desk) {
  try {
    liveCaps = JSON.parse(readFileSync(raw.settings.desk, "utf8")).settings?.live ?? null;
    if (liveCaps) capsSource = `desk file ${raw.settings.desk.split("/").pop()}`;
  } catch {
    // the desk file is gone: the defaults below
  }
}
const capNum = (k, flagK, d) => {
  if (arg(flagK) !== undefined) return Number(arg(flagK));
  const v = Number(liveCaps?.[k]);
  return Number.isFinite(v) && liveCaps?.[k] !== null ? v : d;
};
// a source without either cap set: x01's
const capsSet = (c) => Number(c?.maxPositionX) > 0 || Number(c?.maxExposureX) > 0;
if (!capsSet(liveCaps)) {
  capsSource = `x01 defaults (${liveCaps ? "no live caps in the settings" : "not in the dump"})`;
  liveCaps = null;
}
const caps = {
  on: capsOn,
  maxPositionX: capsOn ? capNum("maxPositionX", "max-position-x", 0.75) : 0,
  maxExposureX: capsOn ? capNum("maxExposureX", "max-exposure-x", 7) : 0,
  source: !capsOn
    ? "off (--caps off)"
    : arg("max-position-x") !== undefined || arg("max-exposure-x") !== undefined
      ? "flags"
      : (capsSource ?? "x01 defaults (not in the dump)"),
};
// open orders at the end (dumps v2; an upper bound, see openEndRule): sized like entries, they hold cap room and
// are marked to market to the end
const openEnd = (raw.openEnd ?? []).filter((o) => o.entryT >= startT && o.entryT <= endT);
const openEndRecorded = Array.isArray(raw.openEnd);
/**
 * Size the book causally with the live caps: in time order (exits before entries at one instant), the entries of
 * one instant are sized together from the realized equity: unit = pct × equity (or the fixed notional), wanted
 * notional = unit × volume. Per position (symbol × side) the instant's entries share the room the position cap
 * leaves (each scaled by the same factor, as live scales a position's lanes), then the gross cap scales every entry
 * of the instant by one factor (as live scales every target). An entry left with no room gets 0 ("capped"); caps 0
 * = off. Ties are never broken by exit time (that would be look-ahead).
 */
function sizeCapped(closed, open, o) {
  const ev = [];
  closed.forEach((x, i) => {
    ev.push([x.entryT, 1, 0, i]);
    ev.push([x.exitT, 0, 0, i]);
  });
  open.forEach((x, i) => ev.push([x.entryT, 1, 1, i]));
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
  const units = new Map();
  const uc = new Float64Array(closed.length);
  const nc = new Float64Array(closed.length);
  const posN = new Map();
  let gross = 0;
  let pnl = 0;
  const st = { capped: 0, scaled: 0, cappedOpen: 0, scaledOpen: 0, byPosition: 0, byExposure: 0, wantMax: 0, gotMax: 0 };
  const pkOf = (x) => `${x.sym}|${x.side > 0 ? 1 : -1}`;
  for (let j = 0; j < ev.length; ) {
    const [t, kind] = ev[j];
    if (kind === 0) {
      const i = ev[j][3];
      const x = closed[i];
      pnl += x.r * uc[i];
      posN.set(pkOf(x), (posN.get(pkOf(x)) ?? 0) - nc[i]);
      gross -= nc[i];
      j++;
      continue;
    }
    // the entries of this instant
    const batch = [];
    while (j < ev.length && ev[j][0] === t && ev[j][1] === 1) batch.push(ev[j++]);
    const eq = o.balance + pnl;
    const u = o.sizing.mode === "fixed" ? o.fixedNotional : Math.max(0, o.sizing.pct * eq);
    const items = batch.map(([, , isOpen, i]) => {
      const x = isOpen ? open[i] : closed[i];
      return { x, isOpen, i, pk: pkOf(x), want: u * (x.vol ?? 1), got: 0, pos: false, exp: false };
    });
    // per position: the instant's entries share the room the position cap leaves
    const wantPos = new Map();
    for (const it of items) wantPos.set(it.pk, (wantPos.get(it.pk) ?? 0) + it.want);
    const fPos = new Map();
    for (const [pk, w] of wantPos) {
      const room = o.posX > 0 ? Math.max(0, o.posX * Math.max(0, eq) - (posN.get(pk) ?? 0)) : Infinity;
      fPos.set(pk, w > 0 ? Math.min(1, room / w) : 1);
    }
    let sum = 0;
    for (const it of items) {
      const f = fPos.get(it.pk);
      it.got = it.want * f;
      it.pos = f < 1 - 1e-9;
      sum += it.got;
    }
    // the gross cap: every entry of the instant by one factor
    const roomG = o.expX > 0 ? Math.max(0, o.expX * Math.max(0, eq) - gross) : Infinity;
    const fG = sum > roomG ? roomG / sum : 1;
    for (const it of items) {
      if (fG < 1) {
        it.got *= fG;
        it.exp = true;
      }
      const scale = it.want > 0 ? it.got / it.want : 1;
      if (it.want > 0 && scale < 1 - 1e-9) {
        const k = it.got <= 1e-12 ? (it.isOpen ? "cappedOpen" : "capped") : it.isOpen ? "scaledOpen" : "scaled";
        st[k]++;
        if (it.pos) st.byPosition++;
        if (it.exp) st.byExposure++;
      }
      st.wantMax = Math.max(st.wantMax, it.want);
      st.gotMax = Math.max(st.gotMax, it.got);
      units.set(orderKey(it.x), u * scale);
      if (!it.isOpen) {
        uc[it.i] = u * scale;
        nc[it.i] = it.got;
      }
      posN.set(it.pk, (posN.get(it.pk) ?? 0) + it.got);
      gross += it.got;
    }
  }
  return { units, realized: o.balance + pnl, pnl, ...st };
}
const sizeOpt = { balance: balance0, sizing, fixedNotional: notional };
const sized = sizeCapped(trades, openEnd, { ...sizeOpt, posX: caps.maxPositionX, expX: caps.maxExposureX });
const sizedU = sizeCapped(trades, openEnd, { ...sizeOpt, posX: 0, expX: 0 });
// the engine's own sizer (no caps) — the uncapped book must match it
const sizedRef = sizeBook(trades, [], sizeOpt);
const unit = (x) => sized.units.get(orderKey(x)) ?? notional;
const unitU = (x) => sizedU.units.get(orderKey(x)) ?? notional;
const units = trades.map(unit);
const pnl = (x) => x.r * unit(x);

// minute closes per symbol (for mark-to-market). Candle t = its OPEN time: the price at minute t is the close of
// the candle that opened at t − 1 min.
const closeAt = new Map();
for (const [sym, cs] of Object.entries(raw.closes)) closeAt.set(sym, new Map(cs));
// per symbol: the minute bars as sorted parallel arrays (open time, close), for a forward-filled mark at any minute
const closeSeq = new Map();
for (const [sym, m] of closeAt) {
  const ts = [...m.keys()].sort((a, b) => a - b);
  closeSeq.set(sym, { ts, vs: ts.map((t) => m.get(t)) });
}
/**
 * The mark for a symbol at minute t: the close of its last bar that has CLOSED by t (a bar keyed by its open time
 * t - 1m closes at t, so nothing later is read — no look-ahead), carried forward over any gap.
 *
 * The lookup used to give up after five minutes and return nothing. A thin symbol with a quiet stretch then dropped
 * its open positions out of the equity for those minutes — their mark-to-market counted as 0, which pulls the curve
 * toward the entry price and misstates both the equity and the drawdown — and the run failed its own check "minute
 * marks without a price". A position is only unmarkable before its symbol's first bar.
 */
const px = (sym, t) => {
  const s = closeSeq.get(sym);
  const known = t - M;
  if (!s || !s.ts.length || s.ts[0] > known) return null;
  let lo = 0;
  let hi = s.ts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s.ts[mid] <= known) lo = mid;
    else hi = mid - 1;
  }
  return s.vs[lo];
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

// every order the equity carries: the closed orders, and the positions still open at the end (exit = never)
const inBook = [...trades, ...openEnd.map((o) => ({ ...o, exitT: Infinity, openAtEnd: true }))].sort((a, b) => a.entryT - b.entryT);
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
let ruinT = null;
// feasibility: the margin of the open orders above the equity (the leverage cannot carry the book)
const marginOver = { minutes: 0, firstT: null, maxRatio: 0 };
let eqLast = balance0;
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
    while (ei < inBook.length && inBook[ei].entryT <= t) open.push(inBook[ei++]);
    open = open.filter((x) => x.exitT > t);
    let mtm = 0;
    let margin = 0;
    const posKeys = new Set();
    let oaeN = 0;
    let oaeMtm = 0;
    const oaePos = new Set();
    for (const x of open) {
      const p = px(x.sym, t);
      // vol = volume units held (DCA legs × Block multiple); r and the margin scale with it
      const vol = x.vol ?? 1;
      const d = p !== null ? ((x.side * (p - x.entry)) / x.entry - cost) * unit(x) * vol : 0;
      if (p !== null) mtm += d;
      else mtmMissing++;
      margin += (unit(x) * vol) / leverage;
      posKeys.add(`${x.sym}|${x.side}`);
      if (x.openAtEnd) {
        oaeN++;
        oaeMtm += d;
        oaePos.add(`${x.sym}|${x.side}`);
      }
    }
    const eq = balance0 + realized + mtm;
    eqLast = eq;
    if (eq <= 0 && ruinT === null) ruinT = t;
    if (margin > eq) {
      marginOver.minutes++;
      marginOver.firstT ??= t;
    }
    if (eq > 0) marginOver.maxRatio = Math.max(marginOver.maxRatio, margin / eq);
    else if (margin > 0) marginOver.maxRatio = Infinity;
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
    // of them: the positions still open at the run end (entered by now)
    hh.openAtEnd = { orders: oaeN, positions: oaePos.size, mtm: oaeMtm };
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
  hh.cumGpR = cs.gpR;
  hh.cumGlR = cs.glR;
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

/**
 * The Base pairs per range, one line: "Wide 7/133 · PF 1.38 · Short 7/68 · PF 1.41 · Micro 0/0 · Signals 10/384 · PF 1.18"
 * = passed / evaluated (eligible) pairs and the median Base PF of the passed pairs; enabled ranges and Signals only
 * (an enabled range with no eligible pair shows 0/0). A runtime before the eligibility-aware counts gave every range
 * the overall count: flagged. (clientMain holds a copy for the page — keep both in sync.)
 */


/** What each Base gate would admit, from the same Base results (no recompute): a table for the report. */
const baseGateRows = (e) => (e?.baseGates ?? []).filter((r) => r && typeof r.passedAnyRange === "number");
const baseGateMd = (e) => {
  const rows = baseGateRows(e);
  if (!rows.length) return "";
  const base = rows[0];
  return [
    ``,
    `### Base gate: what each change would admit`,
    ``,
    `From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.`,
    ``,
    `| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|`,
    ...rows.map(
      (r) =>
        `| ${r.change} | ${r.minPf.toFixed(2)} | ${r.minTrades} | ${r.maxDdr || "off"} | ${r.passed} | ${r.passedAnyRange}` +
        ` ${r === base ? "" : `(${r.passedAnyRange >= base.passedAnyRange ? "+" : ""}${r.passedAnyRange - base.passedAnyRange})`}` +
        ` | ${(r.share * 100).toFixed(1)} % | ${r.pfPassedMedian == null ? "–" : r.pfPassedMedian.toFixed(3)} |`,
    ),
    ``,
  ].join("\n");
};

const baseRangeText = (e) => {
  const rows = (e?.baseByRange ?? []).filter((r) => r.enabled || r.tag === "sig");
  if (!rows.length) return "–";
  const eng = rows.filter((r) => r.tag !== "sig");
  const flat = eng.length > 1 && eng.every((r) => r.evaluated === eng[0].evaluated && r.passed === eng[0].passed);
  return (
    rows
      .map(
        (r) =>
          `${r.range} ${r.passed ?? 0}/${r.evaluated ?? 0}${r.passed && r.pfPassedMedian != null ? ` · PF ${r.pfPassedMedian.toFixed(2)}` : ""}` +
          // no own Base cell: these are the DEFAULT protect's figures (the same numbers the Wide row
          // carries), not a measurement of the range's own distances — say so instead of printing a copy
          (r.tag && r.tag !== "sig" && r.ownCells === 0 ? " (judged at the default cell — Wide's figures)" : ""),
      )
      .join(" · ") + (flat ? " (this runtime gave every range the overall count: no per-range split)" : "")
  );
};

function curveStats(xs0, nowT = endT) {
  const xs = [...xs0].sort((a, b) => a.exitT - b.exitT);
  let gp = 0;
  let gl = 0;
  let gpR = 0;
  let glR = 0;
  let wins = 0;
  let cum = 0;
  let pk = 0;
  let cumU = 0;
  let pkU = 0;
  let mddU = 0;
  let mdd = 0;
  let mddPct = 0;
  let pkT = xs.length ? minOf(xs.map((x) => x.entryT)) : startT;
  let dipped = false;
  let ddt = 0;
  let hold = 0;
  const hn = new Map();
  for (const x of xs) {
    const p = pnl(x);
    if (x.r > 0) {
      gp += p;
      gpR += x.r;
      wins++;
    } else {
      gl -= p;
      glR -= x.r;
    }
    cum += p;
    cumU += x.r;
    pkU = Math.max(pkU, cumU);
    mddU = Math.max(mddU, pkU - cumU);
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
    // the same orders each at ONE unit (r already carries the Block multiple / DCA legs): the engine's PF, independent
    // of the compounding equity sizing; netU = Σ r in units (1 = one unit's notional)
    gpR,
    glR,
    pfU: profitFactor(gpR, glR),
    netU: gpR - glR,
    mddU,
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

/**
 * A compact second pass of the minute book at another sizing (the uncapped figures beside the capped headline):
 * realized net, $ PF, the minute equity (open orders marked to market) drawdown, margin max, end equity.
 */
function equityPass(unitFn) {
  let gp = 0;
  let gl = 0;
  for (const x of trades) {
    const p = x.r * unitFn(x);
    if (x.r > 0) gp += p;
    else gl -= p;
  }
  let rl = 0;
  let pk = balance0;
  let mdd = 0;
  let mddPct = 0;
  let mg = 0;
  let eqMin = balance0;
  let eqEnd = balance0;
  let over = 0;
  let ti2 = 0;
  let ei2 = 0;
  let op = [];
  for (let t = startT + M; t <= endT; t += M) {
    while (ti2 < trades.length && trades[ti2].exitT <= t) rl += trades[ti2].r * unitFn(trades[ti2++]);
    while (ei2 < inBook.length && inBook[ei2].entryT <= t) op.push(inBook[ei2++]);
    op = op.filter((x) => x.exitT > t);
    let mtm = 0;
    let margin = 0;
    for (const x of op) {
      const p = px(x.sym, t);
      const v = unitFn(x) * (x.vol ?? 1);
      if (p !== null) mtm += ((x.side * (p - x.entry)) / x.entry - cost) * v;
      margin += v / leverage;
    }
    const eq = balance0 + rl + mtm;
    pk = Math.max(pk, eq);
    mdd = Math.max(mdd, pk - eq);
    mddPct = Math.max(mddPct, pk > 0 ? (pk - eq) / pk : 0);
    mg = Math.max(mg, margin);
    eqMin = Math.min(eqMin, eq);
    if (margin > eq) over++;
    eqEnd = eq;
  }
  return { net: gp - gl, gp, gl, pf: profitFactor(gp, gl), balanceEnd: balance0 + gp - gl, equityEnd: eqEnd, equityMaxDd: mdd, equityMaxDdPct: mddPct, marginMax: mg, eqMin, marginOverMinutes: over };
}
const bookCapped = equityPass(unit);
const bookUncapped = equityPass(unitU);

/**
 * Live sizing replay: the baseline's positions (every closed order and every order open at the end) as the live
 * control's lanes, every 5 minutes of the run, with the report's balance curve as the equity; one lane unit = the
 * exchange minimum (--replay-unit, default $2: minimum-quantity sizing) or a fixed notional. Each sizing variant runs
 * the live control's own functions (top configs → targets with the position cap and the exchange minimum → exposure
 * scaler → stop-risk budget → worst-case budget → planned exchange orders against the held book). Sizing only: no
 * fills, slippage or stops of the control positions. CTS_CORE_VARIANTS=0 skips it.
 */
function buildSizingReplay() {
  if (process.env.CTS_CORE_VARIANTS === "0") return null;
  const t0 = Date.now();
  const info = raw.cfgInfo ?? null;
  const L = raw.settings.live ?? {};
  const num = (v, d) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));
  const fallbackSl = 0.02;
  const pos = [
    ...trades.map((x) => ({ x, exitT: x.exitT })),
    ...openEnd.map((x) => ({ x, exitT: Infinity })),
  ].map(({ x, exitT }) => ({
    cfg: x.cfg,
    sym: x.sym,
    side: x.side > 0 ? 1 : -1,
    entryT: x.entryT,
    exitT,
    vol: x.vol ?? 1,
    sl: info?.[x.cfg]?.[0] > 0 ? info[x.cfg][0] : fallbackSl,
  }));
  const samples = curve.filter((c) => c.t >= startT && c.t < endT).map((c) => ({ t: c.t, eq: c.bal }));
  const top = L.top === "fill" ? "fill" : typeof L.top === "number" ? (L.top > 0 ? L.top : "all") : "fill";
  const ref = {
    id: "ref",
    label: "reference (desk)",
    unitUsd: Number(arg("replay-unit", 2)),
    minUsd: Number(arg("replay-min", 2)),
    ratio: num(L.ratio, 1),
    maxPositionX: num(L.maxPositionX, 0.25),
    // the fixed per-position cap (positionCapOf): 0 = none, unset = 5 × the configured unit (none when unknown)
    maxNotionalUsd:
      L.maxNotionalUsd === 0 ? Infinity : num(L.maxNotionalUsd, L.notionalUsd > 0 ? L.notionalUsd * 5 : Infinity),
    maxExposureX: L.exposureScaler === false ? 0 : num(L.maxExposureX, 7),
    maxRiskPct: num(L.maxRiskPct, 0.35),
    maxBackstopLossPct: num(L.maxBackstopLossPct, 0.5),
    top,
    rebalancePct: num(L.rebalancePct, 0.25),
    maxPositions: num(L.maxPositions, 12),
    minStopPct: num(L.minStopPct, 0.01),
  };
  const scoreOf = (cfg) => (info?.[cfg] ? info[cfg][1] : undefined);
  const out = [];
  let refFp = null;
  for (const s of sizingVariants(ref)) {
    const r = sizingReplay(pos, samples, s, scoreOf, startT);
    refFp ??= r.fp;
    // JSON has no Infinity: an unset cap reads null
    out.push({ ...r, spec: { ...s, maxNotionalUsd: Number.isFinite(s.maxNotionalUsd) ? s.maxNotionalUsd : null }, effect: r.fp === refFp ? "none" : "sizing" });
  }
  out[0].effect = "reference";
  process.stderr.write(
    `sizing replay: ${out.length} variants · ${pos.length} positions · ${samples.length} samples · ${Date.now() - t0} ms\n`,
  );
  return {
    unitUsd: ref.unitUsd,
    minUsd: ref.minUsd,
    stepMin: 5,
    positions: pos.length,
    stopsKnown: !!info,
    scoresKnown: !!info,
    fallbackSl,
    variants: out,
  };
}
const sizingOut = buildSizingReplay();

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
/** range of an order: Signals apart (signal configs carry no range tag), else its protect cell's range */
const rangeOfTrade = (x) => (isSig(x) ? "Signals" : (RANGE_LABEL[rangeOfId(x.cfg)] ?? "?"));
/** indication kind of an order: a signal config by its source (signal:<source>), an engine config by its family */
const indKindOf = (ind) => (isSignalInd(ind) ? `signal:${signalSourceOf(ind)}` : kindOfInd(ind));
const RANGE_ORDER = ["Micro", "Minimal", "Minimal plus", "Short", "General", "Long", "Wide", "Signals"];
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
    return m <= 1 ? "×1" : m <= 1.5 ? "×1–1.5" : m <= 2 ? "×1.5–2" : m <= 3 ? "×2–3" : m <= 4 ? "×3–4" : m <= 6 ? "×4–6" : "×6–8";
  },
  ["×1", "×1–1.5", "×1.5–2", "×2–3", "×3–4", "×4–6", "×6–8"],
);
const indKinds = groupRows((x) => indKindOf(indOf(x)), null).sort((a, b) => b.net - a.net);
const indBases = groupRows((x) => `${botOf(x)}|${laneOf(indOf(x)).base}`, null)
  .map((r) => ({ ...r, bot: r.key.split("|")[0], base: r.key.split("|")[1], kind: indKindOf(r.key.split("|")[1]) }))
  .sort((a, b) => b.net - a.net);
const lanes = groupRows(laneOfTrade, ["1m", "1m+", "5m", "5m+", "15m", "15m+", "30m", "30m+", "plain"]);
const ranges = groupRows(rangeOfTrade, RANGE_ORDER);
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
check("Σ per-range net = total net (Signals a range of their own)", tot.net, sum(ranges, (r) => r.net));
check("Σ per-range orders = total orders", trades.length, sum(ranges, (r) => r.n));
check("uncapped book = the engine's sizer (sizeBook)", sizedRef.realized, sizedU.realized);
check("minute book = its second pass (max equity drawdown)", maxDd, bookCapped.equityMaxDd);
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
check("end balance = sizing book (capped)", sized.realized, balance0 + tot.net);
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
check("order keys unique (cfg · symbol · entry → one unit each)", trades.length, new Set(trades.map(orderKey)).size);
// processing coverage: every combo evaluated at Base, every indication kind, every strategy type and range on has
// config sets, signals processed (runs from before the coverage record skip these)
const cov = raw.engine.coverage;
if (cov) {
  check("coverage: every combo evaluated at Base (engine + signal combos)", cov.expectedCombos, cov.evaluated);
  const kindsSeen = cov.kindsAll.filter((k) => (cov.byKind[k]?.evaluated ?? 0) > 0).length;
  check("coverage: every indication kind evaluated", cov.kindsAll.length, kindsSeen);
  const tg = cov.toggles ?? {};
  const typesOn = [
    ["normal", tg.normal || tg.block],
    ["trailing", tg.trailing],
    ["dca", tg.dca && !tg.dcaActive],
    ["dca-active", tg.dca && tg.dcaActive],
    ["axis", tg.axis],
  ].filter(([, on]) => on);
  for (const [t] of typesOn) {
    const n = Object.entries(cov.tapes).filter(([k]) => k.startsWith(`${t}|`)).reduce((a, [, v]) => a + v.configs, 0);
    check(`coverage: strategy type ${t} has config sets`, 1, n > 0 ? 1 : 0, n > 0);
  }
  for (const [tag, on] of Object.entries(cov.ranges ?? {})) {
    if (!on) continue;
    const n = Object.entries(cov.tapes).filter(([k]) => k.endsWith(`|${tag}`)).reduce((a, [, v]) => a + v.configs, 0);
    check(`coverage: range ${tag} has config sets`, 1, n > 0 ? 1 : 0, n > 0);
  }
  if (raw.settings.signals)
    check("coverage: signal combos evaluated", 1, (cov.byKind.signal?.evaluated ?? 0) > 0 ? 1 : 0);
}
// memory: the reported compute ran on the full settings (a memory fallback leaves the micro / minimal ranges out)
const memRec = raw.engine.mem;
if (memRec) {
  const lvl = memRec.computeLevel ?? memRec.fallback ?? 0;
  check("memory: the reported compute ran at the full level (no memory fallback)", 0, lvl, lvl === 0);
}
{
  // the hour × type table's type columns: one partition of the orders closed in each hour
  let bad = 0;
  for (const h of hours) {
    const xs = trades.filter((x) => x.exitT > h.t && x.exitT <= h.t + H);
    if (types.reduce((a, r) => a + xs.filter((x) => typeOf(x) === r.key).length, 0) !== xs.length) bad++;
  }
  check("hour × type: the type columns add up to the orders closed, every hour", 0, bad, bad === 0);
}
const checksOk = checks.every((c) => c.ok);

// ── 5. the report objects ────────────────────────────────────────────────────────────────────────────────────
const T = {
  orders: trades.length,
  positions: tot.positions,
  pf: tot.pf,
  pfR: stR.pf,
  gpR: tot.gpR,
  glR: tot.glR,
  netU: tot.netU,
  mddU: tot.mddU,
  // the same book at a FIXED unit (no compounding): unit = start balance × pct (equityPct) or the fixed notional
  fixedUnit: sizing.mode === "fixed" ? notional : balance0 * sizing.pct,
  eqMin: Math.min(balance0, ...hours.map((h) => h.eqMin)),
  ruinT,
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
  // equity at the end: the balance plus the positions still open at the end marked to market at the last close
  equityEnd: eqLast,
  openEnd: {
    recorded: openEndRecorded,
    orders: openEnd.length,
    positions: new Set(openEnd.map((o) => `${o.sym}|${o.side > 0 ? 1 : -1}`)).size,
    // marked at the last close of the run (the last minute's mark)
    mtm: hours.at(-1)?.openAtEnd?.mtm ?? 0,
    rule: raw.openEndRule ?? null,
  },
  // the live caps applied to the $ book, and the same book without them
  caps: {
    ...caps,
    capped: sized.capped,
    scaled: sized.scaled,
    cappedOpen: sized.cappedOpen,
    scaledOpen: sized.scaledOpen,
    byPosition: sized.byPosition,
    byExposure: sized.byExposure,
  },
  uncapped: bookUncapped,
  // margin above the equity: the leverage could not carry the book
  feasible: marginOver.minutes === 0,
  marginOver,
};

/**
 * A group of the book in $ as sized (PF $ = gross profit $ ÷ gross loss $, the basis of the $ net beside it), with
 * the unit PF (every order at one unit: the engine's PF) as a separate figure; DDT on the group's $ curve to the
 * run end, as the headline's.
 */
const groupLegacy = (pred) => {
  const xs = trades.filter(pred);
  const c = curveStats(xs, endT);
  return {
    n: c.n,
    wins: c.wins,
    losses: c.losses,
    wr: c.wr,
    gp: c.gp,
    gl: c.gl,
    pf: c.pf,
    gpR: c.gpR,
    glR: c.glR,
    pfU: c.pfU,
    net: c.net,
    netU: c.netU,
    ddtH: c.ddtH,
  };
};
const isRaised = (x) => blockOf(x) !== "Plain";
const unitsWanted = trades.map(unitU);
const ENABLED_RANGES = [
  ["micro", "Micro"],
  ["minimal", "Minimal"],
  ["minimalPlus", "Minimal plus"],
  ["short", "Short"],
  ["general", "General"],
  ["long", "Long"],
]
  .filter(([k]) => raw.settings.ranges?.[k])
  .map(([, l]) => l);
const report = {
  at: raw.at,
  symbols: raw.symbols,
  settings: {
    ...raw.settings,
    balance0,
    notional,
    sizing,
    // the unit before the caps (pct × realized equity at entry) and as executed (after the caps)
    unitMin: unitsWanted.length ? minOf(unitsWanted) : 0,
    unitMax: unitsWanted.length ? maxOf(unitsWanted) : 0,
    unitEffMin: units.length ? minOf(units) : 0,
    unitEffMax: units.length ? maxOf(units) : 0,
    leverage,
    caps,
  },
  window: { startT, endT },
  total: T,
  // one partition (the strategy types: kind, signals apart) — the rows add up to the total; the "of which" rows
  // are subsets of it
  strategies: Object.fromEntries([
    ...types.map((r) => [r.key, groupLegacy((x) => typeOf(x) === r.key)]),
    ["total", groupLegacy(() => true)],
    ["of which Block-raised", groupLegacy(isRaised)],
    ["of which Signals", groupLegacy(isSig)],
    ["of which Engine (no signals)", groupLegacy((x) => !isSig(x))],
  ]),
  // Signals are a range of their own (signal configs carry no range tag); every enabled range listed
  ranges: Object.fromEntries(
    RANGE_ORDER.filter((l) => l === "Wide" || l === "Signals" || ENABLED_RANGES.includes(l) || ranges.some((r) => r.key === l)).map(
      (l) => [l, groupLegacy((x) => rangeOfTrade(x) === l)],
    ),
  ),
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
/** PF from gross profit / loss: "∞ (no loss)" when nothing lost (the engine's PF_NO_LOSS placeholder is no PF) */
const pfStr = (gp, gl, n = 1) => (!n ? "–" : gl > 0 ? f2(gp / gl) : gp > 0 ? "∞ (no loss)" : "–");
const LANES = lanes.map((l) => l.key);
const tacticsLabel = `tactics ${tacticsMode}`;
const symAsked = raw.settings.symbolsAsked ?? null;
const symText =
  `${symbols} symbols` +
  (symAsked && symAsked < symbols ? ` (${symAsked} asked + ${symbols - symAsked} forced)` : symAsked && symAsked > symbols ? ` (${symAsked} asked)` : "");
const tg = raw.settings.toggles ?? {};
const strategiesOn = [
  tg.normal && "Normal",
  tg.trailing && "Trailing",
  tg.axis && "Axis",
  tg.dca && !tg.dcaActive && "DCA",
  tg.dca && tg.dcaActive && "DCA Active",
].filter(Boolean);
const blockText = tg.block ? ` with Block${tg.blockActive ? ` (Block Active from level ${minActive})` : ""}` : "";
const E = report.engine;
const realText =
  E.realSignal !== undefined
    ? `Real seats: ${E.realEngine} engine configs + ${E.realSignal} signal configs (every config of the active signals)`
    : `Real seats ${E.real} (engine seats + every config of the active signals; split not recorded in this dump)`;
const capsText = caps.on
  ? `position cap ${caps.maxPositionX}× equity per symbol × side, gross cap ${caps.maxExposureX}× equity (${caps.source})`
  : "no caps (--caps off)";
const capLine = !caps.on
  ? `**Caps:** off (--caps off): the book is sized without the live caps.`
  : `**Caps:** ${capsText} — ${T.caps.capped} orders capped to $0, ${T.caps.scaled} scaled down` +
  (openEnd.length ? ` (open at end: ${T.caps.cappedOpen} capped, ${T.caps.scaledOpen} scaled)` : "") +
  ` · binding: position cap ${T.caps.byPosition}, gross cap ${T.caps.byExposure}. ` +
  `**Without the caps:** balance ${usd(balance0)} → ${usd(bookUncapped.balanceEnd)} (${f2((bookUncapped.net / balance0) * 100)} %) · PF $ ${pfStr(bookUncapped.gp, bookUncapped.gl, trades.length)} · equity at end ${usd(bookUncapped.equityEnd)} · equity max drawdown ${usd(bookUncapped.equityMaxDd)} (${f2(bookUncapped.equityMaxDdPct * 100)} %) · margin used max ${usd(bookUncapped.marginMax)}${bookUncapped.marginOverMinutes ? ` · infeasible: margin exceeded equity for ${bookUncapped.marginOverMinutes} min` : ""}.`;
const openText = !T.openEnd.recorded
  ? "open at end: not recorded in this dump (dumped by an older core-session; the equity holds the closed orders only)"
  : `open at end: ${T.openEnd.positions} positions / ${T.openEnd.orders} orders, MTM ${usd(T.openEnd.mtm)} (${String(T.openEnd.rule ?? "upper bound").split(":")[0]}: ${String(T.openEnd.rule ?? "").startsWith("exact") ? "executed by the engine through every gate, cap and Block volume, marked to market" : "tape-level open positions of the executed configs, one unit of volume, the sim's gates not re-applied"})`;
const feasText = T.feasible
  ? ""
  : ` · **infeasible: margin exceeded equity** (${T.marginOver.minutes} min, first ${hm(T.marginOver.firstT)} UTC, max margin ÷ equity ${f2(T.marginOver.maxRatio)}×)`;
const sigOn = !!signalsOn;
const lines = [
  `# Simulated trading session — ${symText}, ${preH} h pre-historic + ${runH} h run (${tacticsLabel}, signals ${sigOn ? "on" : "off"})`,
  ``,
  `Real BingX 1m data, timeframe lanes ${report.settings.lanes.join(" / ")} min set (independent + combined; traded: ${LANES.join(", ") || "none"}), strategies ${strategiesOn.join(", ") || "none"}${blockText}${sigOn ? ", signals" : ""}. ` +
    `Balance ${usd(balance0)}; ${sizing.mode === "fixed" ? `each order volume unit = ${usd(notional)} notional` : `each order volume unit = ${(sizing.pct * 100).toFixed(1)} % of the realized equity at entry (${usd(report.settings.unitMin)}–${usd(report.settings.unitMax)} before the caps)`} at ${leverage}×; ${(cost * 100).toFixed(2)} % round-trip cost on every close. ` +
    `Window ${new Date(startT).toISOString().slice(0, 16)} → ${new Date(endT).toISOString().slice(0, 16)} UTC. Engine: Base ${E.basePassed}/${E.baseEvaluated} pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: ${baseRangeText(E)}; Main ${E.mainPairs} pairs, ${E.tapes} tapes, ${realText}, compute ${Math.round(E.computeMs / 1000)} s. ${raw.settings.wf?.causalBase ? "Causal: Base / Main / Real ranked on the history before the run." : "Look-ahead: Base / Main / Real ranked on every bar up to the end (the run is partly in-sample)."}`,
  ``,
  `**Result (as live sizes it, ${capsText}):** balance ${usd(balance0)} → ${usd(T.balanceEnd)} (${f2(T.netPct * 100)} %, closed orders) · equity at end ${usd(T.equityEnd)} (${openText}) · PF $ ${pfStr(T.gp, T.gl, T.orders)} (gross profit $ ÷ gross loss $ as sized) · PF unit ${pfStr(T.gpR, T.glR, T.orders)} (every order at one unit: the engine's PF) · ${T.positions} positions / ${T.orders} orders${T.caps.capped ? ` (incl. ${T.caps.capped} capped to $0)` : ""} · WR ${f2(T.wr * 100)} % · DDT (closed trades, $) ${f2(T.ddtH)} h · DDR ${T.ddr === null ? "– (net ≤ 0)" : f2(T.ddr)} · equity max drawdown ${usd(T.equityMaxDd)} (${f2(T.equityMaxDdPct * 100)} %) · margin used max ${usd(T.marginMax)} · open avg ${f2(T.avgOpenPositions)} pos / ${f2(T.avgOpenOrders)} orders (peak ${T.maxOpenPositions} / ${T.maxOpenOrders})${feasText}`,
  ``,
  capLine,
  baseGateMd(E),
  `## Hour by hour`,
  ``,
  `| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |`,
  `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
  ...hours.map(
    (h) =>
      `| ${hourLabel(h)} | ${h.posClosed} / ${h.orders} | ${h.wins} / ${h.losses} | ${pfStr(h.gp, h.gl, h.orders)} | ${pfStr(h.gpR, h.glR, h.orders)} | ${h.orders ? Math.round(h.wr * 100) + " %" : "–"} | ${usd(h.net)} | ${usd(h.balance)} | ${usd(h.eqEnd)} | ${usd(h.eqMin)} | ${f2(h.maxDdPct * 100)} % | ${f2(Math.max(0, h.ddNowH))} | ${usd(h.marginMax)} | ${h.openPosEnd} / ${h.openEnd} |`,
  ),
  ``,
  `**Last hour (${hourLabel(hours.at(-1) ?? { t: startT, minutes: 0 })}):** ${openText}; equity at the end ${usd(T.equityEnd)} = balance ${usd(T.balanceEnd)} + MTM ${usd(T.equityEnd - T.balanceEnd)}.`,
  ``,
  `**Hours positive:** ${T.greenHours} of ${T.fullHours} full hours · flat ${T.flatHours} · negative ${T.redHours}` +
    (T.partialHour ? ` (partial last hour, ${T.partialHour.minutes} min, not counted: net ${usd(T.partialHour.net)})` : ""),
  ``,
  `*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.`,
  ``,
  `## Hour by hour per timeframe lane (orders · PF $ · net $)`,
  ``,
  `| hour (UTC) | ${LANES.join(" | ")} |`,
  `|---|${LANES.map(() => "---:").join("|")}|`,
  ...hours.map((h) => {
    const xs = trades.filter((x) => x.exitT > h.t && x.exitT <= h.t + H);
    return `| ${hourLabel(h)} | ${LANES.map((l) => {
      const ys = xs.filter((x) => laneOfTrade(x) === l);
      if (!ys.length) return "–";
      const c = curveStats(ys);
      return `${ys.length} · ${pfStr(c.gp, c.gl, c.n)} · ${usd(c.net)}`;
    }).join(" | ")} |`;
  }),
];
// hour × type: ONE partition (the strategy types: kind, signals apart) so the type columns add up to the orders
// closed in the hour; Block-raised and Signals as "of which" subsets
const TYPE_COLS = [
  ...types.map((r) => [r.key, (x) => typeOf(x) === r.key]),
  ["of which Block-raised", isRaised],
  ["of which Signals", isSig],
];
lines.push(
  ``,
  `## Hour by hour per type (orders · PF $ · WR · net $)`,
  ``,
  `The type columns (${types.map((r) => r.key).join(", ")}) are one partition of the orders closed in the hour; *of which* columns are subsets of them.`,
  ``,
  `| hour (UTC) | orders closed | ${TYPE_COLS.map(([k]) => k).join(" | ")} |`,
  `|---|---:|${TYPE_COLS.map(() => "---:").join("|")}|`,
  ...hours.map((h) => {
    const xs = trades.filter((x) => x.exitT > h.t && x.exitT <= h.t + H);
    return `| ${hourLabel(h)} | ${xs.length} | ${TYPE_COLS.map(([, f]) => {
      const ys = xs.filter(f);
      if (!ys.length) return "–";
      const c = curveStats(ys);
      return `${ys.length} · ${pfStr(c.gp, c.gl, c.n)} · ${Math.round(c.wr * 100)} % · ${usd(c.net)}`;
    }).join(" | ")} |`;
  }),
);
// stage funnel, hour by hour: unit PF (every order at one unit, after the cost) of the closes at each stage
if (raw.funnel) {
  const F = raw.funnel;
  const cell = (c) => (c && c.n ? `${c.n} · ${pfStr(c.gp, c.gl, c.n)}` : "–");
  const sum = (arr) => arr.reduce((a, c) => ({ n: a.n + c.n, w: a.w + c.w, gp: a.gp + c.gp, gl: a.gl + c.gl }), { n: 0, w: 0, gp: 0, gl: 0 });
  const unit = (xs) => {
    const c = { n: 0, w: 0, gp: 0, gl: 0 };
    for (const x of xs) {
      c.n++;
      if (x.r > 0) {
        c.w++;
        c.gp += x.r;
      } else c.gl -= x.r;
    }
    return c;
  };
  const exAt = (i) => trades.filter((x) => x.exitT > startT + i * H && x.exitT <= startT + (i + 1) * H);
  const kindIs = (k) => (x) => !isSig(x) && kindOfTrade(x) === k;
  const COLS = [
    ["all configs (pool)", (i) => F.pool[i]],
    ["pool Normal", (i) => F.poolNormal[i]],
    ["pool Trailing", (i) => F.poolTrailing[i]],
    ["seated configs", (i) => F.seated[i]],
    ["executed (all types)", (i) => unit(exAt(i))],
    ["executed Normal", (i) => unit(exAt(i).filter(kindIs("normal")))],
    ["executed Trailing", (i) => unit(exAt(i).filter(kindIs("trailing")))],
    ["executed Block-raised", (i) => unit(exAt(i).filter(isRaised))],
    ["executed Signals", (i) => unit(exAt(i).filter(isSig))],
  ];
  const tot = (f) => sum(Array.from({ length: F.nH }, (_, i) => f(i)));
  const k = F.counts ?? {};
  lines.push(
    ``,
    `## Stage funnel, hour by hour (orders closed · unit PF)`,
    ``,
    `Base (full history, each pair at its default protect and its ranges' cells): ${k.basePairs ?? "?"} engine pairs evaluated, ${k.basePassed ?? "?"} passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (${k.poolConfigs ?? "?"} tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (${k.seatedConfigs ?? "?"}); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the ${((raw.settings?.cost ?? 0.002) * 100).toFixed(2)} % cost.${k.causalBase ? "" : " Base and the pool are computed on the full history (in-sample for the run); seated / executed are causal."}`,
    ``,
    `| hour (UTC) | ${COLS.map(([c]) => c).join(" | ")} |`,
    `|---|${COLS.map(() => "---:").join("|")}|`,
    ...Array.from({ length: F.nH }, (_, i) => `| ${hm(startT + i * H)} | ${COLS.map(([, f]) => cell(f(i))).join(" | ")} |`),
    `| **total** | ${COLS.map(([, f]) => `**${cell(tot(f))}**`).join(" | ")} |`,
  );
}
const stratRow = ([k, v]) =>
  `| ${k} | ${v.n} | ${v.wins} / ${v.losses} | ${pfStr(v.gp, v.gl, v.n)} | ${pfStr(v.gpR, v.glR, v.n)} | ${usd(v.net)} | ${v.n ? f2(v.wr * 100) + " %" : "–"} | ${v.n ? f2(v.ddtH ?? 0) : "–"} |`;
lines.push(
  ``,
  `## Strategies`,
  ``,
  `The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.`,
  ``,
  `| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |`,
  `|---|---:|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(report.strategies).map(stratRow),
  ``,
  `## Timeframe lanes`,
  ``,
  `| lane | orders | PF $ | PF unit | net |`,
  `|---|---:|---:|---:|---:|`,
  ...Object.entries(report.lanes).map(([k, v]) => `| ${k} | ${v.n} | ${pfStr(v.gp, v.gl, v.n)} | ${pfStr(v.gpR, v.glR, v.n)} | ${usd(v.net)} |`),
);
const presetRows = Object.values(report.presets ?? {});
if (presetRows.length)
  lines.push(
    ``,
    `## Execution presets on the same tapes`,
    ``,
    `| preset | orders | PF unit | net % of notional |`,
    `|---|---:|---:|---:|`,
    ...presetRows.map(
      (p) =>
        `| ${p.label} | ${p.stats?.n ?? 0} | ${p.stats?.gl !== undefined ? pfStr(p.stats.gp, p.stats.gl, p.stats.n ?? 0) : f2(p.stats?.pf)} | ${f2(p.stats?.net)} |`,
    ),
  );
lines.push(``, `A ${runH} h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.`);
// the tape aggregates (computed at the run, dumped): v2 buckets signal configs as Signals and records the seat
// evaluation per range; an older dump's Wide holds the signal configs
const A = normalizeTapeAgg(raw.tapeAgg);
const v2 = A.v === 2;
const oldNote = v2
  ? ""
  : ` *(Older dump: these aggregates were computed by an earlier core-session — signal configs are inside Wide here, except in the indications table, re-bucketed on render; re-run the session for the corrected split.)*`;
const accRow = (k, c) =>
  `| ${k.split("|").join(" | ")} | ${c.cfgs} | ${c.pos} (${c.cfgs ? Math.round((c.pos / c.cfgs) * 100) : 0} %) | ${c.n} | ${c.n ? Math.round((c.w / c.n) * 100) : 0} % | ${pfStr(c.gp, c.gl, c.n)} | ${f2((c.gp - c.gl) * 100)} |`;
const rangeRank = (k) => {
  const i = RANGE_ORDER.indexOf(k.split("|")[0]);
  return i < 0 ? 99 : i;
};
const byRangeKey = (x, y) => rangeRank(x[0]) - rangeRank(y[0]) || x[0].localeCompare(y[0]);
const netOf = (c) => c.gp - c.gl;
const cellRows = Object.entries(A.rangeCells ?? {})
  .filter(([, c]) => c.n >= 10)
  .sort((x, y) => netOf(y[1]) - netOf(x[1]));
const bestCells = cellRows.slice(0, 40);
const worstCells = cellRows.slice(bestCells.length).reverse().slice(0, 15);
const ER = A.evalRule ?? {};
const ES = A.evalStats ?? {};
const seatHead = v2
  ? `Engine configs that passed the seat evaluation (configEval) at the run start (${ES.passed} of ${ES.evaluated} evaluated, ${ES.configs - ES.signalTapes} engine tapes) and the signal configs of the signals active at the run start (${ES.signalActive} of ${ES.signalTapes} signal tapes), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.`
  : `Configs that passed configEval at the run start (${ES.evaluated} of ${ES.configs}), each on its own closes inside the run. Net in % of one unit; PF unit basis.${oldNote}`;
const maxDdtH = ER.maxDdtH ?? raw.settings.gates?.maxDdtH;
const ddtRule = `drawdown time ≤ min(${f2(ER.ddtMaxH)} h, ${maxDdtH} h × span ÷ 72 h), span = the tape's own history inside the ${ER.preH} h window (ddtLimitH: a 1m tape with 72 h of history → ${maxDdtH} h; a full window → ${f2(ER.ddtMaxH)} h)`;
const seatRule = `Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (${ER.preH} h) ≥ max(3, ${ER.minTrades}) closes, positive net, PF ≥ its range's minimum (stage ${ER.minPf}${Object.keys(ER.rangeMinPf ?? {}).length ? `; ${Object.entries(ER.rangeMinPf).map(([k, v]) => `${k} ${v}`).join(", ")}` : ""}), ${ddtRule}${ER.maxDdr ? `, drawdown ratio ≤ ${ER.maxDdr}` : ""}, last ${ER.validLastN ?? 0} closes at the same PF / DDT${ER.rangeGate ? `, range cells' last ${ER.rangeGate.lastN} at PF ≥ ${ER.rangeGate.minPf}` : ""}, positive lower-confidence bound, green hours ≥ ${Math.round((ER.minGreen ?? 0.5) * 100)} %. Real entries then check the last ${ER.lastN ?? 0} closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder ${4}).`;
const fz = A.evalFails ?? {};
const seatRows = [];
for (const l of RANGE_ORDER.filter((x) => x !== "Signals")) {
  const f = fz[l];
  const on = l === "Wide" || ENABLED_RANGES.includes(l);
  if (!f && !on) continue;
  if (!f) {
    seatRows.push(
      `| ${l} | 0 | 0 | 0 | – | – | – | ${EVAL_GATES.map(() => "–").join(" | ")} | – | – | 0 configs — ${l === "Micro" ? "no Micro indication in the focus" : "no config sets built for this range"} |`,
    );
    continue;
  }
  const ddtTxt = f.ddtLimitMinH != null ? `${f2(f.ddtLimitMinH)}–${f2(f.ddtLimitMaxH)} (median ${f2(f.ddtLimitMedianH)})` : "–";
  seatRows.push(
    `| ${l} | ${f.configs} | ${f.evaluatedN ?? (v2 ? 0 : "–")} | ${f.passed} | ${f.pfEvaluatedMedian != null ? f2(f.pfEvaluatedMedian) : "–"} | ${f.pfPassedMedian != null ? f2(f.pfPassedMedian) : "–"} | ${ddtTxt} | ${EVAL_GATES.map((g) => f[g] ?? 0).join(" | ")} | ${f["type off"] ?? 0} | ${f["base off"] ?? 0} | ${on ? "" : "range off: tapes from an earlier setting"}${!v2 && l === "Wide" ? "incl. signal configs (older dump)" : ""} |`,
  );
}
if (sigOn)
  seatRows.push(
    `| Signals | ${v2 ? ES.signalTapes : "–"} | – | ${v2 ? ES.signalActive : "–"} | – | – | – | ${EVAL_GATES.map(() => "–").join(" | ")} | – | – | ${v2 ? `${ES.signalTapes} signal tapes, ${ES.signalActive} active at the run start — seated by their own signal activation, not configEval` : "not split in this older dump (inside Wide)"} |`,
  );
lines.push(
  ``,
  `## Ranges in the executed book`,
  ``,
  `Signals are a range of their own (signal configs carry no range tag); every enabled range listed.`,
  ``,
  `| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |`,
  `|---|---:|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(report.ranges).map(
    ([k, v]) =>
      `| ${k} | ${v.n} | ${v.wins} / ${v.losses} | ${pfStr(v.gp, v.gl, v.n)} | ${pfStr(v.gpR, v.glR, v.n)} | ${usd(v.net)} | ${v.n ? f2(v.wr * 100) + " %" : "–"} | ${v.n ? f2(v.ddtH ?? 0) : "–"} |`,
  ),
  ``,
  `## Base said, the book did — the same ranges on the same basis`,
  ``,
  `The gates judge a set on its **unit** PF (per-order return, unsized). The headline result is in **dollars**, after`,
  `the live sizing and its caps. So a range has three numbers that must be read together, and only the first two are`,
  `on the same basis: the median unit PF of the sets Base passed, the unit PF those sets actually traded at, and the`,
  `dollar PF after sizing. "Base → book" is the second divided by the first: how much of the validated edge survived`,
  `out of sample. "sizing" is the third divided by the second: what the live caps did to it — above 1 they flattered`,
  `the range, below 1 they ate the edge. A row where Base is high and "Base → book" is low is selection, not sizing;`,
  `a row where "Base → book" is near 1 and "sizing" is far from it is the caps.`,
  ``,
  `| range | Base passed (median PF unit) | traded PF unit | Base → book | traded PF $ | sizing | orders |`,
  `|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(report.ranges).map(([k, v]) => {
    const b = (E.baseByRange ?? []).find((r) => r.range === k);
    const bp = b && b.passed && b.pfPassedMedian != null ? b.pfPassedMedian : null;
    const own = !b || !b.tag || b.tag === "sig" || b.ownCells !== 0;
    const u = v.n && v.glR ? v.gpR / v.glR : null;
    const d = v.n && v.gl ? v.gp / v.gl : null;
    return (
      `| ${k}${own ? "" : " (Base at the default cell)"} | ${bp != null ? f2(bp) : "–"} | ${u != null ? f2(u) : "–"} | ` +
      `${bp != null && u != null ? f2(u / bp) : "–"} | ${d != null ? f2(d) : "–"} | ${u != null && d != null && u > 0 ? f2(d / u) : "–"} | ${v.n} |`
    );
  }),
  ``,
  `## Seated configs over the run window, by range and type`,
  ``,
  seatHead,
  ``,
  `| range | type | configs | positive | closes | WR | PF unit | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeByTypeEval ?? {}).sort(byRangeKey).map(([k, c]) => accRow(k, c)),
  ``,
  `| range | indication kind | configs | positive | closes | WR | PF unit | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeByKindEval ?? {}).sort(byRangeKey).map(([k, c]) => accRow(k, c)),
  ``,
  `### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)`,
  ``,
  seatRule,
  ``,
  `| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | ${EVAL_GATES.join(" | ")} | type off | pair not Base-passed | note |`,
  `|---|---:|---:|---:|---:|---:|---:|${EVAL_GATES.map(() => "---:").join("|")}|---:|---:|---|`,
  ...seatRows,
  ``,
  `## Every config over the run window, by range and type (context: seated or not)`,
  ``,
  `Each config computed independently (unit size, ${(cost * 100).toFixed(2)} % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.${oldNote}`,
  ``,
  `| range | type | configs | positive | closes | WR | PF unit | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeByType ?? {}).sort(byRangeKey).map(([k, c]) => accRow(k, c)),
  ``,
  `## Range cells by indication kind (seated configs; signal configs by source)`,
  ``,
  `| range | kind | configs | positive | closes | WR | PF unit | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeByKind ?? {}).sort(byRangeKey).map(([k, c]) => accRow(k, c)),
  ``,
  `## Causal last-${A.gateN} gate on the seated configs: their last ${A.gateN} closes before the run cleared the PF, then inside the run`,
  ``,
  `| range | min PF | configs | positive | closes | WR | PF unit | net % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|`,
  ...Object.entries(A.rangeGate ?? {}).sort(byRangeKey).map(([k, c]) => accRow(k, c)),
  ``,
  `## Indications per range (seated configs of the indication together; positive net first, then by net)`,
  ``,
  `| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |`,
  `|---|---|---|---:|---:|---:|---:|---:|---:|---|`,
  ...Object.entries(A.indications ?? {})
    .filter(([, c]) => c.n >= 5)
    .sort(
      (x, y) =>
        rangeRank(x[0]) - rangeRank(y[0]) ||
        Number(netOf(y[1]) > 0) - Number(netOf(x[1]) > 0) ||
        netOf(y[1]) - netOf(x[1]),
    )
    .map(
      ([k, c]) =>
        `${accRow(k, c).slice(0, -1)}| ${c.best ? `${c.best.id.split("|").slice(2).join(" ")} (${c.best.n} · ${c.best.gl !== undefined ? pfStr(c.best.gp, c.best.gl, c.best.n) : f2(c.best.pf)} · ${f2(c.best.net * 100)})` : "–"} |`,
    ),
  ``,
  `## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)`,
  ``,
  `| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |`,
  `|---|---|---|---|---:|---:|---:|---:|---:|---:|`,
  ...bestCells.map(([k, c]) => accRow(k, c)),
  ``,
  `## Worst range cells by net (seated configs, the rows not in the best table)`,
  ``,
  `| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |`,
  `|---|---|---|---|---:|---:|---:|---:|---:|---:|`,
  ...(worstCells.length ? worstCells.map(([k, c]) => accRow(k, c)) : [`| – | | | | | | | | | |`]),
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
  coverage: raw.engine.coverage ?? null,
  // enabled / disabled overviews (walk-forward variants on the final tapes) and the live sizing replay
  variants: raw.variants ?? null,
  sizingReplay: sizingOut,
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
    mtm: "open orders marked at the last 1m close (price at minute t = close of the bar that opened at t − 1 min), less the round-trip cost; a DCA order is marked with its full final volume from its entry",
    unitPf: "the same orders each at one unit of notional (r carries the Block multiple and DCA legs): the engine's PF, independent of the compounding equity sizing",
    variantEffect:
      "walk-forward variants (one switch flipped against the options as run, on the same tapes): changes results = a different order set; changes volume = the same orders at other volumes / results; no effect = the identical trade set; n/a = the switch has nothing to act on; needs a recompute = it shapes the tapes when they are built. Net and PF in trade % (Σ r × 100, one unit per order)",
    sizingReplay:
      "the live control's sizing replayed on the baseline's positions every 5 minutes, equity = the report's balance curve: top configs → per-position cap and exchange minimum → exposure scaler → stop-risk budget → worst-case budget → exchange orders against the held book (rebalance threshold). Sizing only: no fills, slippage or control stops",
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
    gpR: h.gpR,
    glR: h.glR,
    cumGpR: h.cumGpR,
    cumGlR: h.cumGlR,
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
  // --explain fragment.html: a hand-written "how to read this run" section placed above the generated report
  const explain = arg("explain") ? readFileSync(arg("explain"), "utf8").trim() : "";
  const page = renderHtml(data);
  writeFileSync(join(htmlDir, "index.html"), explain ? page.replace("<body>\n", () => `<body>\n${explain}\n`) : page);
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

/**
 * The dumped tape aggregates as the report reads them. A dump before v2 bucketed signal configs as Wide: its
 * indications table carries the indication, so those rows move to Signals; the other tables cannot be split.
 */
function normalizeTapeAgg(A0) {
  const A = { ...(A0 ?? {}) };
  if (A.v === 2) return A;
  const ind = {};
  for (const [k, c] of Object.entries(A.indications ?? {})) {
    const [r, bot, i] = k.split("|");
    const k2 = isSignalInd(i ?? "") ? `Signals|${bot}|${i}` : k;
    if (!ind[k2]) ind[k2] = c;
    else {
      const a = ind[k2];
      ind[k2] = { ...a, cfgs: a.cfgs + c.cfgs, pos: a.pos + c.pos, n: a.n + c.n, w: a.w + c.w, gp: a.gp + c.gp, gl: a.gl + c.gl, best: (a.best?.net ?? -Infinity) >= (c.best?.net ?? -Infinity) ? a.best : c.best };
    }
    void r;
  }
  A.indications = ind;
  return A;
}

function sizingTxt(s) {
  return s.sizing.mode === "fixed"
    ? `a fixed ${usd(s.notional)} per unit`
    : `${(s.sizing.pct * 100).toFixed(1)} % of the realized equity per unit, compounding`;
}

// ── the write-up (markdown) ──────────────────────────────────────────────────────────────────────────────────
function renderWriteup(d, dir) {
  const pf = (r) => (r.gl === 0 ? (r.gp > 0 ? "∞ (no loss)" : "–") : f2(r.gp / r.gl));
  const ddr = (v) => (v === null || v === undefined ? "–" : f2(v));
  const pct = (v) => `${f2(v * 100)} %`;
  const hmd = (t) => new Date(t).toISOString().slice(0, 16).replace("T", " ");
  const t = d.total;
  const grp = (rows, label) => [
    `| ${label} | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...rows.map(
      (r) =>
        `| ${r.key} | ${r.n} | ${r.positions} | ${pf(r)} | ${pf({ gp: r.gpR, gl: r.glR })} | ${pct(r.wr)} | ${usd(r.net)} | ${f2(r.ddtH)} | ${ddr(r.ddr)} | ${pct(r.mddPct)} | ${r.greenH} / ${r.activeH} |`,
    ),
  ];
  const pos = (rows) => rows.filter((r) => r.net > 0).sort((a, b) => b.net - a.net);
  const neg = (rows) => rows.filter((r) => r.net < 0).sort((a, b) => a.net - b.net);
  const list = (rows, n = 6) => rows.slice(0, n).map((r) => `${r.key} ${usd(r.net)} (PF ${pf(r)}, ${r.n} orders)`).join(" · ") || "none";
  const s = d.settings;
  return [
    `# ${s.runH} h simulated session — ${d.symbols.length} symbols, ${s.preH} h pre-historic + ${s.runH} h run${s.desk ? ", desk settings" : ""}`,
    ``,
    `Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the ${s.lanes.join(" / ")} min lanes), ` +
      `pre-historic ${hmd(d.window.preStartT)} → ${hmd(d.window.startT)} UTC, run ${hmd(d.window.startT)} → ${hmd(d.window.endT)} UTC. ` +
      `Symbols: ${d.symbols.join(", ")}.`,
    ``,
    `Settings (desk, ${s.desk ?? "flags"}): stage gate min PF ${s.gates.minPf}, focus ${s.focus === 0 ? "every combo" : s.focus + " pairs"}, disabled kinds ${s.disabledKinds.length ? s.disabledKinds.join(", ") : "none"}, ` +
      `toggles ${Object.entries(s.toggles).filter(([, v]) => v).map(([k]) => k).join(" / ")}, ranges ${Object.entries(s.ranges).filter(([, v]) => v).map(([k]) => k).join(" / ")} (micro ${s.ranges.micro ? "on" : "off"}), ` +
      `caps: positions ${s.wf.maxPositions || "none"}, signal positions ${s.wf.signalMaxPositions || "none"}, coordination ${s.wf.coord?.enabled ? "on" : "off"}, signals validated on their last ${s.wf.signalValidLastN}. ` +
      `Block ${s.block.mode}, ${s.block.maxLevel} levels, Active from ${s.block.minActiveLevel}, ratio ${s.block.ratio}, max ${s.block.maxMult}×. ` +
      `Balance ${usd(s.balance0)}, each order unit ${sizingTxt(s)}, ${s.leverage}× for the margin, ${(s.cost * 100).toFixed(2)} % round-trip cost per close.`,
    ``,
    `Full report with diagrams: [${dir ? join(dir, "index.html") : "index.html"}](${dir ? join(dir.replace(/^docs\//, ""), "index.html") : "index.html"}) · numbers: \`${dir ? join(dir, "data.json") : "data.json"}\`.`,
    ``,
    `## Result`,
    ``,
    `| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
    `| ${usd(s.balance0)} → ${usd(t.balanceEnd)} | ${usd(t.equityEnd)} | ${usd(t.net)} (${pct(t.netPct)}) | ${pf(t)} | ${pf({ gp: t.gpR, gl: t.glR })} | ${f2(t.ddtH)} | ${ddr(t.ddr)} | ${usd(t.equityMaxDd)} (${pct(t.equityMaxDdPct)}) | ${t.orders} | ${t.positions} | ${pct(t.wr)} | ${t.greenHours} / ${t.fullHours} | ${usd(t.marginMax)} |`,
    ``,
    `As live sizes it (${capsText}); ${openText}${feasText}.`,
    ``,
    capLine,
    ``,
    `PF = gross profit $ ÷ gross loss $ as sized (${sizingTxt(s)}, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing).` +
      (s.sizing.mode !== "fixed"
        ? ` At a fixed unit of ${usd(t.fixedUnit)} (no compounding) the same orders net ${usd(t.netU * t.fixedUnit)} (${pct((t.netU * t.fixedUnit) / s.balance0)}), closed-order max drawdown ${usd(t.mddU * t.fixedUnit)}.`
        : "") +
      (t.ruinT ? ` **The equity reached $0 at ${hmd(t.ruinT)} UTC (lowest ${usd(t.eqMin)}): at this sizing with no position caps the account would have been liquidated there.**` : ""),
    ``,
    `Engine: Base ${d.engine.basePassed}/${d.engine.baseEvaluated} pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: ${baseRangeText(d.engine)}), Main ${d.engine.mainPairs} pairs, ${d.engine.tapes} tapes, ${realText}, compute ${Math.round(d.engine.computeMs / 1000)} s, peak RSS ${d.engine.rssMaxMb} MB. ` +
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
    `- **Block volume:** ${d.mult.map((r) => `${r.key} ${usd(r.net)} (unit PF ${pf({ gp: r.gpR, gl: r.glR })}, ${r.n})`).join(" · ")}.`,
    `- **Lanes:** ${d.lanes.map((r) => `${r.key} ${usd(r.net)} (PF ${pf(r)}, ${r.n})`).join(" · ")}; **ranges:** ${d.ranges.map((r) => `${r.key} ${usd(r.net)} (PF ${pf(r)}, ${r.n})`).join(" · ")}; **sides:** ${d.sides.map((r) => `${r.key} ${usd(r.net)} (PF ${pf(r)}, ${r.n})`).join(" · ")}.`,
    `- **Hours:** ${t.greenHours} green / ${t.redHours} red / ${t.flatHours} flat of ${t.fullHours} full hours; first order opened ${(() => {
      const h = d.hours.find((x) => x.ordersOpened > 0);
      return h ? hm(h.t) + " UTC" : "never";
    })()}; best hour ${(() => {
      const h = [...d.hours].sort((a, b) => b.net - a.net)[0];
      return h ? `${hm(h.t)} ${usd(h.net)}` : "–";
    })()}, worst hour ${(() => {
      const h = [...d.hours].sort((a, b) => a.net - b.net)[0];
      return h ? `${hm(h.t)} ${usd(h.net)}` : "–";
    })()}.`,
    ``,
    `## Hour by hour`,
    ``,
    `| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...d.hours.map(
      (h) =>
        `| ${hm(h.t)}${h.partial ? ` (${h.minutes} min)` : ""} | ${usd(h.balance)} | ${usd(h.equity)} | ${pct(h.ddEndPct)} | ${usd(h.marginMax)} | ${h.orders} | ${h.posOpened} / ${h.posClosed} / ${h.posOpenEnd} | ${h.wins} | ${h.orders ? pf(h) : "–"} | ${h.orders ? pf({ gp: h.gpR, gl: h.glR }) : "–"} | ${usd(h.net)} | ${f2(h.ddtNowH)} | ${ddr(h.ddrHour)} | ${usd(h.cumNet)} | ${pf({ gp: h.cumGp, gl: h.cumGl })} |`,
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
  const stamp = (t) => new Date(t).toISOString().slice(0, 16).replace("T", " ");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CTS-A-O Session ${stamp(d.window.startT)} → ${stamp(d.window.endT)} UTC</title>
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
.warn { border: 1px solid var(--neg); background: var(--neg-bg); border-radius: 10px; padding: 8px 12px; font-size: 13px; }
.theme { position: absolute; top: 18px; right: 16px; }
.theme button { font: inherit; font-size: 12px; color: var(--text-2); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 3px 9px; cursor: pointer; }
header { position: relative; padding-right: 70px; }
details summary { cursor: pointer; color: var(--text-2); margin: 8px 0; }
.badge { display: inline-block; padding: 0 8px; border-radius: 999px; font-size: 11.5px; line-height: 18px; border: 1px solid var(--border); color: var(--text-2); white-space: nowrap; }
.badge.ch { background: var(--pos-bg); color: var(--pos); border-color: transparent; }
.badge.vo { background: var(--surface-2); color: var(--text); }
.badge.no { color: var(--muted); }
.badge.na { color: var(--muted); border-style: dashed; }
td.wrap { white-space: normal; min-width: 180px; max-width: 320px; }
tr.base td { background: var(--surface-2); font-weight: 600; }
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
  // the page runs on its own: it sees no top-level helper of this script (a call to one threw a ReferenceError and
  // left the whole page blank) — its own copies, kept in sync with the top-level baseGateRows / baseRangeText
  const baseGateRows = (e) => (e?.baseGates ?? []).filter((r) => r && typeof r.passedAnyRange === "number");
  const baseRangeText = (e) => {
    const rows = (e?.baseByRange ?? []).filter((r) => r.enabled || r.tag === "sig");
    if (!rows.length) return "–";
    const eng = rows.filter((r) => r.tag !== "sig");
    const flat = eng.length > 1 && eng.every((r) => r.evaluated === eng[0].evaluated && r.passed === eng[0].passed);
    return (
      rows
        .map(
          (r) =>
            `${r.range} ${r.passed ?? 0}/${r.evaluated ?? 0}${r.passed && r.pfPassedMedian != null ? ` · PF ${r.pfPassedMedian.toFixed(2)}` : ""}` +
            // no own Base cell: these are the DEFAULT protect's figures (the same numbers the Wide row
            // carries), not a measurement of the range's own distances — say so instead of printing a copy
            (r.tag && r.tag !== "sig" && r.ownCells === 0 ? " (judged at the default cell — Wide's figures)" : ""),
        )
        .join(" · ") + (flat ? " (this runtime gave every range the overall count: no per-range split)" : "")
    );
  };
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fin = (v) => typeof v === "number" && Number.isFinite(v);
  const n2 = (v, d = 2) => (fin(v) ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–");
  const usd = (v, d = 2) => (fin(v) ? (v < 0 ? "−$" : "$") + n2(Math.abs(v), d) : "–");
  const susd = (v) => (fin(v) ? (v > 0 ? "+" : v < 0 ? "−" : "") + "$" + n2(Math.abs(v)) : "–");
  const pct = (v, d = 2) => (fin(v) ? n2(v * 100, d) + " %" : "–");
  const pfTxt = (gp, gl, n) => (n === 0 ? "–" : gl === 0 ? (gp > 0 ? "∞ (no loss)" : "–") : n2(gp / gl));
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
  } catch {
    // storage blocked: the system theme applies
  }

  // ── page skeleton ──
  const app = $("#app");
  // every indication's funnel (Base → strategy sets → validation → orders), with the strategy types and exit models
  // its sets carry: an indication with sets but no validated config was evaluated and did not clear its own gates
  function funnelHtml(C) {
    const rows = Object.entries(C.perInd).sort((a, b) => b[1].orders - a[1].orders || b[1].configs - a[1].configs || (a[0] < b[0] ? -1 : 1));
    const T = rows.reduce(
      (t, [, a]) => {
        for (const k of ["baseEval", "basePass", "rangePass", "configs", "validated", "executed", "orders", "gp", "gl"]) t[k] += a[k];
        return t;
      },
      { baseEval: 0, basePass: 0, rangePass: 0, configs: 0, validated: 0, executed: 0, orders: 0, gp: 0, gl: 0 },
    );
    const types = ["normal", "trailing", "dca", "dca-active", "axis"];
    const fmtSets = (o) => types.filter((k) => o[k]).map((k) => `${k} ${o[k]}`).join(" · ") || "–";
    const fmtEx = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(" · ") || "–";
    const tr = (name, a) =>
      `<tr><td>${esc(name)}</td><td>${esc(a.kind ?? "")}</td><td>${(a.lanes ?? []).map((x) => x + "m").join(" ")}</td><td class="num">${a.baseEval}</td><td class="num">${a.basePass}</td><td class="num">${a.rangePass}</td><td class="num">${a.configs}</td><td>${fmtSets(a.sets ?? {})}</td><td>${fmtEx(a.exitModels ?? {})}</td><td class="num">${a.validated}</td><td class="num">${a.executed}</td><td class="num">${a.orders}</td><td class="num">${pfTxt(a.gp, a.gl)}</td><td>${fmtEx(a.exits ?? {})}</td></tr>`;
    return `<p class="note">Per base indication (every lane together): Base combos evaluated and passed (at the default cell, and at a range's own cell), the strategy sets built from it (one per config: strategy type × exit model), the configs validated (seated in the Real stage at least once in the run) and executed, the orders with their PF and how they exited. ${rows.length} indications · ${T.baseEval} Base evaluations · ${T.basePass} passed (${T.rangePass} at a range cell) · ${T.configs} strategy sets · ${T.validated} validated · ${T.executed} executed · ${T.orders} orders (PF ${pfTxt(T.gp, T.gl)}).</p>
<div class="tw tall"><table><thead><tr><th>Indication</th><th>Kind</th><th>Lanes</th><th>Base eval</th><th>Base pass</th><th>Range cell pass</th><th>Sets</th><th>Sets by type</th><th>Exit models</th><th>Validated</th><th>Executed</th><th>Orders</th><th>PF</th><th>Exits</th></tr></thead><tbody>${rows.map(([k, a]) => tr(k, a)).join("")}</tbody></table></div>`;
  }
  // every strategy type × exit model × exit reason: is every exit strategy running, and how it does
  function exitsHtml(C) {
    const rows = Object.entries(C.exits).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const models = [...new Set(rows.map(([k]) => k.split("|").slice(0, 2).join(" · ")))];
    return `<p class="note">Orders of the run by strategy type and exit model (fixed target/stop, trailing, ATR) and how each exited (tp = target, sl = stop, trail = trailing stop, time = hold limit). ${models.length} type × exit-model combinations traded.</p>
<div class="tw"><table><thead><tr><th>Type</th><th>Exit model</th><th>Exit</th><th>Orders</th><th>PF</th><th>Net Σ %</th></tr></thead><tbody>${rows
      .map(([k, e]) => {
        const [t, m, w] = k.split("|");
        return `<tr><td>${esc(t)}</td><td>${esc(m)}</td><td>${esc(w)}</td><td class="num">${e.n}</td><td class="num">${pfTxt(e.gp, e.gl)}</td><td class="num">${((e.gp - e.gl) * 100).toFixed(1)}</td></tr>`;
      })
      .join("")}</tbody></table></div>`;
  }
  const sec = (id, title, html) => `<section id="${id}"><h2>${title}</h2>${html}</section>`;
  const kpi = (l, v, s = "", c = "") => `<div class="kpi"><div class="l">${l}</div><div class="v ${c}">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
  const onToggles = Object.entries(S.toggles).filter(([, v]) => v).map(([k]) => k).join(", ");
  const rangesOn = Object.entries(S.ranges).filter(([, v]) => v).map(([k]) => k).join(", ");
  const sigTotal = D.classes.find((r) => r.key === "Signals");

  // ── enabled / disabled overviews (walk-forward variants) and the live sizing replay: section skeletons ──
  const V = D.variants;
  const Z = D.sizingReplay;
  const VAR_GROUPS = {
    types: { title: "Strategy types", sec: "variants" },
    signals: { title: "Signals and direction acceptance", sec: "variants" },
    coordination: { title: "Coordination", sec: "adjustments" },
    block: { title: "Block mode and steps", sec: "adjustments" },
    gates: { title: "Gates and position cap", sec: "adjustments" },
    tactics: { title: "Tactics (shape the tapes)", sec: "adjustments" },
  };
  const varRows = (g) => (V ? V.rows.filter((r) => r.group === g) : []);
  const varCards = (key, title) => `
<div class="grid2" style="margin-top:10px">
  <div class="card"><h3>Cumulative net per hour — ${esc(title)}</h3><div class="cap">Σ trade % of the closed orders at every hour end (one unit per order); baseline bold, up to 8 variants with the largest change</div><div class="chart" id="cVarCum_${key}"></div></div>
  <div class="card"><h3>Net per variant — ${esc(title)}</h3><div class="cap">Σ trade % over the run; baseline outlined, no-effect variants faded</div><div class="chart" id="cVarNet_${key}"></div></div>
  <div class="card"><h3>PF per variant — ${esc(title)}</h3><div class="cap">Trade-% profit factor, bars from PF 1</div><div class="chart" id="cVarPf_${key}"></div></div>
  <div class="card"><h3>Orders per variant — ${esc(title)}</h3><div class="cap">Closed orders in the run (hover: long / short)</div><div class="chart" id="cVarN_${key}"></div></div>
</div>`;
  function variantSections() {
    if (!V) {
      const none = `<p class="note">Not computed for this report: the run had <code>CTS_CORE_VARIANTS=0</code>, or the dump predates the variants.</p>`;
      return sec("variants", "Strategy types on / off", none) + sec("adjustments", "Adjustments on / off", none);
    }
    const run = V.rows.filter((r) => r.summary);
    const runMs = run.reduce((a, r) => a + (r.ms ?? 0), 0);
    const cnt = (f) => V.rows.filter(f).length;
    const tally = `<div class="chips">
  <span class="chip">${cnt((r) => r.effect === "orders")} change the orders</span>
  <span class="chip">${cnt((r) => r.effect === "volume")} change only volumes</span>
  <span class="chip">${cnt((r) => r.effect === "none")} no effect</span>
  <span class="chip">${cnt((r) => r.status === "na")} n/a</span>
  <span class="chip">${cnt((r) => r.status === "recompute")} need a recompute</span>
  ${cnt((r) => r.status === "skipped") ? `<span class="chip">${cnt((r) => r.status === "skipped")} skipped (memory)</span>` : ""}
</div>`;
    const intro = `<p class="note">Every row re-runs the session's walk-forward on its own final tapes (${V.tapes.toLocaleString("en-US")} config tapes, ${V.signalTapes.toLocaleString("en-US")} of them signal tapes — no new tapes) with <b>one switch flipped</b> against the baseline, the options the session ran with. <b>Changes results</b>: a different set of orders; <b>changes results (volume)</b>: the same orders at other volumes; <b>no effect</b>: the identical trade set — the switch is not working on this window; <b>n/a</b>: it has nothing to act on (e.g. a Block mode with Block off); <b>needs a recompute</b>: it shapes the tapes when they are built. Net and PF are in trade % (Σ r × 100, every order at one unit, the Block multiple and the legs included) — independent of the book's $ sizing above. ${V.reproduces ? "The baseline re-run reproduces the session's run exactly." : `<b class="bad">The baseline re-run differs from the session's run</b> (${V.session.orders} orders, net ${n2(V.session.net)} % in the session) — compare the variants with the baseline row, not with the totals above.`} ${run.length} walk-forward runs in ${n2(runMs / 1000, 0)} s (${n2(runMs / Math.max(1, run.length) / 1000, 1)} s each${V.mainSimMs ? `; the session's own walk-forward took ${n2(V.mainSimMs / 1000, 0)} s` : ""}).</p>`;
    const grp = (g) =>
      varRows(g).length ? `<h3>${esc(VAR_GROUPS[g].title)}</h3>${g === "tactics" ? "" : varCards(g, VAR_GROUPS[g].title)}<div class="tw" id="tVar_${g}"></div>` : "";
    return (
      sec("variants", "Strategy types on / off", intro + tally + grp("types") + grp("signals")) +
      sec(
        "adjustments",
        "Adjustments on / off",
        `<p class="note">The same re-run for the coordination rules, Block mode / steps, the last-N, symbol and direction gates and the position cap — each flipped alone (a sub-switch of a coordination that was off runs with coordination on: its label says so). Tactics filter entries when the tapes are built: they are listed, not run.</p>` +
          grp("coordination") +
          grp("block") +
          grp("gates") +
          grp("tactics"),
      )
    );
  }
  function sizingSection() {
    if (!Z) return sec("sizing", "Live sizing replay", `<p class="note">Not computed for this report (<code>CTS_CORE_VARIANTS=0</code>).</p>`);
    const r = Z.variants[0].spec;
    const refTxt = `unit ${usd(r.unitUsd)} per lane volume unit · exchange minimum ${usd(r.minUsd)} · volume factor ${r.ratio} · position cap ${r.maxPositionX ? r.maxPositionX + "× equity" : "off"}${r.maxNotionalUsd !== null ? " (≤ " + usd(r.maxNotionalUsd) + ")" : ""} · exposure scaler ${r.maxExposureX ? r.maxExposureX + "× equity" : "off"} · stop-risk budget ${r.maxRiskPct ? pct(r.maxRiskPct, 0) : "off"} · worst-case budget ${r.maxBackstopLossPct ? pct(r.maxBackstopLossPct, 0) : "off"} · top ${esc(String(r.top))} · rebalance ${r.rebalancePct} · max ${r.maxPositions || "∞"} positions`;
    return sec(
      "sizing",
      "Live sizing replay: rebalancing, caps, volume factor",
      `<p class="note">The live control's own sizing replayed on the baseline run: every ${Z.stepMin} minutes the run's positions open at that moment (${Z.positions.toLocaleString("en-US")} orders: config, symbol, side, Block / leg volume, the config's stop distance) are the lanes, the report's balance curve is the equity (from ${usd(S.balance0)}), and each variant runs top configs → per-position cap and exchange minimum → exposure scaler → stop-risk budget → worst-case budget → the exchange orders against the book held at the previous step (an existing position is resized only beyond the rebalance threshold). <b>Sizing only</b>: every price is 1, no fills, slippage, funding or stops of the control positions; the stop is each config's initial protect stop (a trail is not followed)${Z.stopsKnown ? "" : `, <b>unknown in this dump: ${pct(Z.fallbackSl, 0)} assumed</b>, and the top-config ranking has no scores`}; configs are ranked by their selection score at the run start. Reference (the desk's live settings, defaults where the dump has none): ${refTxt}.</p>
<div class="grid2">
  <div class="card"><h3>Gross notional per hour</h3><div class="cap">Σ target notional (long and short), hour average of the samples; reference bold</div><div class="chart" id="cSzGross"></div></div>
  <div class="card"><h3>Exchange orders per hour</h3><div class="cap">Opens + increases + reduces + closes the planner sends, per hour of the run</div><div class="chart" id="cSzOrders"></div></div>
  <div class="card"><h3>Positions at the per-position cap</h3><div class="cap">Average positions whose lanes asked for more than the cap (a higher volume factor sizes them no further)</div><div class="chart" id="cSzCapped"></div></div>
  <div class="card"><h3>Worst-case loss, max</h3><div class="cap">Σ notional × backstop distance, % of equity (every exchange stop at once)</div><div class="chart" id="cSzWorst"></div></div>
</div>
<h3>Per variant</h3><div class="tw" id="tSizing"></div>
<h3>Reference, hour by hour</h3><div class="tw tall" id="tSizingHours"></div>`,
    );
  }
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
    <span class="chip">unit ${S.sizing.mode === "fixed" ? usd(S.notional) + " fixed" : n2(S.sizing.pct * 100, 1) + " % of equity (compounding)"} · ${S.leverage}× · cost ${n2(S.cost * 100)} %</span>
  </div>
</header>
<nav class="toc">
  <a href="#summary">Summary</a><a href="#diagrams">Diagrams</a><a href="#hourly">Hourly</a><a href="#types">Strategy types</a>
  <a href="#typehours">Types per hour</a><a href="#variants">Types on / off</a><a href="#adjustments">Adjustments on / off</a><a href="#sizing">Live sizing replay</a>
  <a href="#indications">Indications</a><a href="#funnel">Funnel</a><a href="#exits">Exits</a><a href="#signals">Signals</a><a href="#symbols">Symbols</a><a href="#checks">Checks</a>
</nav>
<section id="summary">
<div class="kpis">
  ${kpi("Start → end balance", usd(S.balance0) + " → " + usd(T.balanceEnd), T.equityEnd !== undefined ? "equity at end " + usd(T.equityEnd) + " (incl. open MTM)" : "")}
  ${kpi("Net", susd(T.net), pct(T.netPct) + " of the start balance" + (S.sizing.mode !== "fixed" ? " · at a fixed " + usd(T.fixedUnit) + " unit " + susd(T.netU * T.fixedUnit) : ""), cls(T.net))}
  ${kpi("Profit factor", pfTxt(T.gp, T.gl, T.orders), "$, as sized · per unit (engine) " + pfTxt(T.gpR, T.glR, T.orders))}
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
${T.ruinT ? `<p class="warn"><b>Equity reached $0 at ${dt(T.ruinT)} UTC</b> (lowest ${usd(T.eqMin)}): at this sizing (${S.sizing.mode === "fixed" ? usd(S.notional) + " per unit" : n2(S.sizing.pct * 100, 1) + " % of equity per unit"} × the Block multiple, no position caps) an account would have been liquidated there. The book below keeps the engine's orders as they were; orders entered after it are sized at $0. The per-unit PF (each order at one unit) is the sizing-independent view.</p>` : ""}
${T.feasible === false ? `<p class="warn"><b>Infeasible: margin exceeded equity</b> for ${T.marginOver.minutes} min (first ${dt(T.marginOver.firstT)} UTC, max margin ÷ equity ${n2(T.marginOver.maxRatio)}×).</p>` : ""}
<p class="note"><b>As live sizes it:</b> ${T.caps && T.caps.on ? `position cap ${T.caps.maxPositionX}× equity per symbol × side, gross cap ${T.caps.maxExposureX}× equity (${esc(T.caps.source)})` : "no caps"} — ${T.caps ? T.caps.capped : 0} orders capped to $0, ${T.caps ? T.caps.scaled : 0} scaled down.${T.uncapped ? ` <b>Without the caps:</b> balance ${usd(S.balance0)} → ${usd(T.uncapped.balanceEnd)} · PF ${pfTxt(T.uncapped.gp, T.uncapped.gl, T.orders)} · equity max drawdown ${usd(T.uncapped.equityMaxDd)} (${pct(T.uncapped.equityMaxDdPct)}) · margin max ${usd(T.uncapped.marginMax)}.` : ""}
${T.openEnd && T.openEnd.recorded ? `Open at the end: ${T.openEnd.positions} positions / ${T.openEnd.orders} orders, MTM ${susd(T.openEnd.mtm)} (${String(T.openEnd.rule ?? "").startsWith("exact") ? "exact: executed by the engine, marked to market" : "upper bound: tape-level open positions of the executed configs, one unit of volume"}), in the end equity ${usd(T.equityEnd)}.` : "Open positions at the end: not recorded in this dump."}</p>
<p class="note">Engine: Base ${D.engine.basePassed} of ${D.engine.baseEvaluated} pairs passed, incl. signal pairs (per range, passed / evaluated pairs · median Base PF of the passed pairs: ${esc(baseRangeText(D.engine))}) · Main ${D.engine.mainPairs} pairs · ${D.engine.tapes.toLocaleString("en-US")} tapes · ${D.engine.realSignal !== undefined ? `Real seats: ${D.engine.realEngine} engine configs + ${D.engine.realSignal} signal configs` : `Real seats ${D.engine.real} (engine seats + every config of the active signals)`} · compute ${Math.round(D.engine.computeMs / 1000)} s · peak RSS ${D.engine.rssMaxMb} MB${D.runSeconds ? " · session " + Math.round(D.runSeconds / 60) + " min" : ""}. Generated ${esc(D.at)}.
Consistency checks: <b class="${D.checksOk ? "ok" : "bad"}">${D.checks.filter((c) => c.ok).length} of ${D.checks.length} pass</b> (see <a href="#checks">Checks</a>).</p>
${
  baseGateRows(D.engine).length
    ? `<h3>Base gate: what each change would admit</h3>
<p class="note">From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from; the median PF is of the pairs that passed at the default cell.</p>
<table class="v2"><thead><tr><th>Base gate</th><th>PF</th><th>closes</th><th>DDR</th><th>pairs at the default cell</th><th>pairs in a range</th><th>share</th><th>median PF of the passed</th></tr></thead><tbody>
${baseGateRows(D.engine)
  .map((r, i, xs) => {
    const d = r.passedAnyRange - xs[0].passedAnyRange;
    return `<tr${i === 0 ? ' class="hl"' : ""}><td>${esc(r.change)}</td><td class="n">${r.minPf.toFixed(2)}</td><td class="n">${r.minTrades}</td><td class="n">${r.maxDdr || "off"}</td><td class="n">${r.passed}</td><td class="n">${r.passedAnyRange}${i === 0 ? "" : ` <span class="${d >= 0 ? "pos" : "neg"}">${d >= 0 ? "+" : ""}${d}</span>`}</td><td class="n">${(r.share * 100).toFixed(1)} %</td><td class="n">${r.pfPassedMedian == null ? "–" : r.pfPassedMedian.toFixed(3)}</td></tr>`;
  })
  .join("\n")}
</tbody></table>`
    : ""
}
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
<h3>By protect range</h3><p class="note">Range of the order's protect cell (TP in multiples of the position cost); signal configs carry no range tag and form their own row, Signals.</p><div class="tw" id="tRanges"></div>
<h3>Long / short</h3><div class="tw" id="tSides"></div>
`)}
${sec("typehours", "Strategy types per hour", `
<h3>Net per hour and type</h3><p class="note">Cell = net $ · orders closed. Shading: blue positive, red negative.</p><div class="tw tall" id="tTypeMatrix"></div>
<h3>Hour × type, line by line</h3><div class="tools"><label>Type <select id="fType"><option value="">all</option></select></label></div><div class="tw tall" id="tTypeHours"></div>
`)}
${variantSections()}
${sizingSection()}
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
${D.coverage ? sec("coverage", "Processing coverage", `<p class="note">What the last compute processed: every bot × indication × lane combo (and every signal combo) evaluated at Base against the combos the settings ask for (${D.coverage.evaluated.toLocaleString("en-US")} of ${D.coverage.expectedCombos.toLocaleString("en-US")}), how many passed Base per indication kind, and the config sets (one tape per config: strategy type × protect range) the later stages evaluated and executed from. A config set with no executed order is computed and evaluated, but no config in it cleared its own gates in the window.</p>
<h3>Base per indication kind</h3><div class="tw" id="tCovKinds"></div>
<h3>Config sets per strategy type and range</h3><div class="tw" id="tCovTapes"></div>`) : ""}
${D.coverage?.perInd ? sec("funnel", "Indication funnel: Base → sets → validation → orders", funnelHtml(D.coverage)) : ""}
${D.coverage?.exits ? sec("exits", "Exit strategies", exitsHtml(D.coverage)) : ""}
${sec("checks", "Consistency checks", `<div class="tw" id="tChecks"></div>
<details><summary>Definitions</summary><div class="tw"><table><tbody>${Object.entries(D.definitions).map(([k, v]) => `<tr><td class="l"><b>${esc(k)}</b></td><td class="l" style="white-space:normal">${esc(v)}</td></tr>`).join("")}</tbody></table></div></details>
<details><summary>Settings and engine (raw)</summary><pre class="note" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify({ settings: S, engine: D.engine }, null, 1))}</pre></details>`)}
`;

  $("#themeBtn").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem("cts-theme", root.dataset.theme);
    } catch {
      // storage blocked: the choice lasts for this view
    }
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
          `<tr${opt.rc ? ` class="${opt.rc(r)}"` : ""} data-q="${esc((opt.q ? opt.q(r) : "").toLowerCase())}">${cols
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
  const pfCol = (gp = "gp", gl = "gl", n = "n") => ({ l: "PF $", title: "gross profit $ ÷ gross loss $ as sized", f: (r) => pfTxt(r[gp], r[gl], r[n]), v: (r) => (r[n] ? pfVal(r[gp], r[gl]) : -1) });
  const numCol = (k, l, d = 0) => ({ k, l, f: (r) => (d ? n2(r[k], d) : (r[k] ?? 0).toLocaleString("en-US")), v: (r) => r[k] });
  const groupCols = (label) => [
    { k: "key", l: label, t: "s" },
    numCol("n", "orders"),
    numCol("positions", "positions"),
    pfCol(),
    { l: "PF unit", f: (r) => pfTxt(r.gpR, r.glR, r.n), v: (r) => (r.n ? pfVal(r.gpR, r.glR) : -1), title: "every order at one unit (the engine's PF, independent of the equity sizing)" },
    { l: "WR", f: (r) => pct(r.wr, 1), v: (r) => r.wr },
    net(),
    { l: "net (units)", f: (r) => `<span class="${cls(r.netU)}">${n2(r.netU, 3)}</span>`, v: (r) => r.netU, title: "Σ r: net in units of one order's notional" },
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
    const gpR = rows.reduce((a, r) => a + r.gpR, 0);
    const glR = rows.reduce((a, r) => a + r.glR, 0);
    return [label, n.toLocaleString("en-US"), extra.positions ?? "", pfTxt(gp, gl, n), pfTxt(gpR, glR, n), extra.wr ?? "", `<span class="${cls(nt)}">${susd(nt)}</span>`, `<span class="${cls(gpR - glR)}">${n2(gpR - glR, 3)}</span>`];
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
      { l: "unit PF", f: (r) => pfTxt(r.gpR, r.glR, r.orders), v: (r) => (r.orders ? pfVal(r.gpR, r.glR) : -1) },
      net(),
      { l: "DDT now (h)", f: (r) => n2(r.ddtNowH), v: (r) => r.ddtNowH, title: "hours since the equity last stood at its peak" },
      { l: "DDR (hour)", f: (r) => (r.ddrHour === null ? "–" : n2(r.ddrHour)), v: (r) => (r.ddrHour === null ? 1e9 : r.ddrHour) },
      net("cumNet", "cum net"),
      { l: "cum PF", f: (r) => pfTxt(r.cumGp, r.cumGl, r.cumOrders), v: (r) => pfVal(r.cumGp, r.cumGl) },
      { l: "cum unit PF", f: (r) => pfTxt(r.cumGpR, r.cumGlR, r.cumOrders), v: (r) => pfVal(r.cumGpR, r.cumGlR) },
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
        pfTxt(T.gpR, T.glR, T.orders),
        `<span class="${cls(T.net)}">${susd(T.net)}</span>`,
        n2(T.ddtH),
        T.ddr === null ? "–" : n2(T.ddr),
        "",
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
  // ranges only: what Base said about these sets, next to what the book did with them, on the same (unit) basis
  const baseOf = (r) => (D.engine?.baseByRange ?? []).find((b) => b.range === r.key);
  const basePf = (r) => {
    const b = baseOf(r);
    return b && b.passed && b.pfPassedMedian != null ? b.pfPassedMedian : null;
  };
  const rangeBaseCols = [
    {
      l: "Base PF unit",
      f: (r) => {
        const b = baseOf(r);
        const v = basePf(r);
        if (v == null) return "–";
        // a range with no own Base cell was judged at the default protect: those are Wide's figures, not its own
        const dflt = b && b.tag && b.tag !== "sig" && b.ownCells === 0;
        return n2(v) + (dflt ? ' <span class="note">(default cell)</span>' : "");
      },
      v: (r) => basePf(r) ?? -1,
      title: "median unit PF of the sets this range passed at Base — the number the gates judged on",
    },
    {
      l: "Base → book",
      f: (r) => {
        const b = basePf(r);
        const u = r.n && r.glR ? r.gpR / r.glR : null;
        return b != null && u != null ? `<span class="${cls(u / b - 1)}">${n2(u / b)}</span>` : "–";
      },
      v: (r) => {
        const b = basePf(r);
        const u = r.n && r.glR ? r.gpR / r.glR : null;
        return b != null && u != null ? u / b : -1;
      },
      title: "traded unit PF ÷ Base's median unit PF: how much of the validated edge survived out of sample (1 = all of it)",
    },
    {
      l: "sizing",
      f: (r) => {
        const u = r.n && r.glR ? r.gpR / r.glR : null;
        const d = r.n && r.gl ? r.gp / r.gl : null;
        return u != null && d != null && u > 0 ? `<span class="${cls(d / u - 1)}">${n2(d / u)}</span>` : "–";
      },
      v: (r) => {
        const u = r.n && r.glR ? r.gpR / r.glR : null;
        const d = r.n && r.gl ? r.gp / r.gl : null;
        return u != null && d != null && u > 0 ? d / u : -1;
      },
      title: "dollar PF ÷ unit PF: what the live sizing and its caps did to the edge (above 1 they flattered the range, below 1 they ate it)",
    },
  ];
  table("tRanges", [...groupCols("range"), ...rangeBaseCols], D.ranges, { foot: totFoot(D.ranges, "total") });
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
  if (D.coverage) {
    const C = D.coverage;
    table(
      "tCovKinds",
      [
        { k: "kind", l: "indication kind", t: "s" },
        { k: "evaluated", l: "combos evaluated", f: (r) => r.evaluated.toLocaleString("en-US") },
        { k: "passed", l: "passed Base", f: (r) => r.passed.toLocaleString("en-US") },
        { l: "pass %", f: (r) => n2((r.passed / Math.max(1, r.evaluated)) * 100, 1), v: (r) => r.passed / Math.max(1, r.evaluated) },
      ],
      Object.entries(C.byKind)
        .map(([kind, a]) => ({ kind, ...a }))
        .sort((a, b) => b.evaluated - a.evaluated),
    );
    const RL = { mc: "Micro", mn: "Minimal", sh: "Short", gn: "General", lg: "Long", mp: "Minimal plus", wide: "Wide" };
    table(
      "tCovTapes",
      [
        { k: "type", l: "strategy type", t: "s" },
        { k: "range", l: "range", t: "s" },
        { k: "configs", l: "config sets", f: (r) => r.configs.toLocaleString("en-US") },
        { k: "closes", l: "computed closes", f: (r) => r.closes.toLocaleString("en-US") },
      ],
      Object.entries(C.tapes)
        .map(([k, a]) => ({ type: k.split("|")[0], range: RL[k.split("|")[1]] ?? k.split("|")[1], ...a }))
        .sort((a, b) => b.configs - a.configs),
    );
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

  // ── variant tables: one per group, the baseline row first ──
  const TYPE_ORDER = ["Normal", "Trailing", "Axis", "DCA", "DCA Active", "Signals"];
  const pctU = (v, d = 2) => (fin(v) ? (v > 0 ? "+" : v < 0 ? "−" : "") + n2(Math.abs(v), d) + " %" : "–");
  const EFF_RANK = { orders: 0, volume: 1, none: 2 };
  const effBadge = (r) =>
    r.group === "baseline"
      ? '<span class="badge vo">baseline</span>'
      : r.status === "na"
        ? '<span class="badge na">n/a</span>'
        : r.status === "recompute"
          ? '<span class="badge na">needs a recompute (tapes)</span>'
          : r.status === "skipped"
            ? '<span class="badge na">skipped</span>'
            : r.effect === "none"
              ? '<span class="badge no">no effect</span>'
              : r.effect === "volume"
                ? '<span class="badge ch">changes results (volume)</span>'
                : '<span class="badge ch">changes results</span>';
  if (V) {
    const B = V.rows[0].summary;
    const typesSeen = TYPE_ORDER.filter((k) => V.rows.some((r) => r.summary && r.summary.byType[k]));
    const sm = (r, f, d = "–") => (r.summary ? f(r.summary) : d);
    const sideTxt = (a) => (a && a.n ? `${a.n} · ${pctU(a.net)}` : "0");
    const cols = [
      { k: "label", l: "variant", t: "s", f: (r) => esc(r.label) },
      { k: "change", l: "change", t: "s", c: () => "wrap", f: (r) => esc(r.change) },
      { k: "asRun", l: "as run", t: "s" },
      { l: "result", t: "s", f: effBadge, v: (r) => (r.group === "baseline" ? "0" : r.summary ? String(1 + (EFF_RANK[r.effect] ?? 3)) : "9" + r.status) },
      { l: "orders", f: (r) => sm(r, (s) => s.orders.toLocaleString("en-US")), v: (r) => sm(r, (s) => s.orders, -1) },
      { l: "Δ orders", f: (r) => sm(r, (s) => (s.orders > B.orders ? "+" : s.orders < B.orders ? "−" : "") + Math.abs(s.orders - B.orders).toLocaleString("en-US")), v: (r) => sm(r, (s) => s.orders - B.orders, -1e9) },
      { l: "PF", title: "trade-% profit factor (one unit per order)", f: (r) => sm(r, (s) => pfTxt(s.gp, s.gl, s.orders)), v: (r) => sm(r, (s) => (s.orders ? pfVal(s.gp, s.gl) : -1), -1) },
      { l: "net", title: "Σ trade % of the closed orders", f: (r) => sm(r, (s) => `<span class="${cls(s.net)}">${pctU(s.net)}</span>`), v: (r) => sm(r, (s) => s.net, -1e9) },
      { l: "Δ net", f: (r) => sm(r, (s) => `<span class="${cls(s.net - B.net)}">${pctU(s.net - B.net)}</span>`), v: (r) => sm(r, (s) => s.net - B.net, -1e9) },
      { l: "max DD", title: "max drawdown of the closed Σ trade % curve", f: (r) => sm(r, (s) => n2(s.mdd) + " %"), v: (r) => sm(r, (s) => s.mdd, -1) },
      { l: "long", title: "orders · net", f: (r) => sm(r, (s) => sideTxt(s.longs)), v: (r) => sm(r, (s) => s.longs.n, -1) },
      { l: "short", title: "orders · net", f: (r) => sm(r, (s) => sideTxt(s.shorts)), v: (r) => sm(r, (s) => s.shorts.n, -1) },
      ...typesSeen.map((k) => ({ l: esc(k), title: `${k}: orders · net`, f: (r) => sm(r, (s) => sideTxt(s.byType[k])), v: (r) => sm(r, (s) => s.byType[k]?.net ?? 0, -1e9) })),
      { l: "open at end", title: "orders still open at the run's end · their mark", f: (r) => sm(r, (s) => (s.openEnd ? `${s.openEnd} · ${pctU(s.openNet)}` : "0")), v: (r) => sm(r, (s) => s.openEnd, -1) },
      {
        l: "why / top skips",
        t: "s",
        c: () => "wrap",
        f: (r) => (r.summary ? esc(r.summary.skips.slice(0, 3).map(([k, n]) => `${k} ${n.toLocaleString("en-US")}`).join(" · ") || "–") : esc(r.why ?? "–")),
        v: (r) => r.why ?? "",
      },
      { l: "run", title: "walk-forward time", f: (r) => (r.ms !== undefined ? n2(r.ms / 1000, 1) + " s" : "–"), v: (r) => r.ms ?? -1 },
    ];
    for (const g of Object.keys(VAR_GROUPS)) {
      const rows = varRows(g);
      if (rows.length) table(`tVar_${g}`, cols, [V.rows[0], ...rows], { rc: (r) => (r.group === "baseline" ? "base" : "") });
    }
  }
  // ── sizing replay tables ──
  if (Z) {
    const zs = (r, f) => f(r.summary);
    const effZ = (r) =>
      r.effect === "reference" ? '<span class="badge vo">reference</span>' : r.effect === "none" ? '<span class="badge no">no effect</span>' : '<span class="badge ch">changes sizing / orders</span>';
    table(
      "tSizing",
      [
        { k: "label", l: "variant", t: "s" },
        { l: "result", t: "s", f: effZ, v: (r) => (r.effect === "reference" ? "0" : r.effect === "none" ? "2" : "1") },
        { l: "positions", title: "average (max) control positions", f: (r) => zs(r, (s) => `${n2(s.positionsAvg, 1)} (${s.positionsMax})`), v: (r) => r.summary.positionsAvg },
        { l: "gross avg", f: (r) => usd(r.summary.grossAvg), v: (r) => r.summary.grossAvg },
        { l: "gross max", f: (r) => usd(r.summary.grossMax), v: (r) => r.summary.grossMax },
        { l: "gross ÷ equity", title: "max over the samples", f: (r) => n2(r.summary.grossXMax) + "×", v: (r) => r.summary.grossXMax },
        { l: "orders", title: "exchange orders over the run", f: (r) => r.summary.orders.toLocaleString("en-US"), v: (r) => r.summary.orders },
        { l: "orders / h", f: (r) => n2(r.summary.ordersPerHour, 1), v: (r) => r.summary.ordersPerHour },
        { l: "open · incr · reduce · close", t: "s", f: (r) => zs(r, (s) => `${s.opens} · ${s.increases} · ${s.reduces} · ${s.closes}`), v: (r) => String(r.summary.increases + r.summary.reduces).padStart(9, "0") },
        { l: "at cap", title: "average positions at the per-position cap (share of all position-samples)", f: (r) => zs(r, (s) => `${n2(s.cappedAvg, 1)} (${pct(s.cappedShare, 0)})`), v: (r) => r.summary.cappedShare },
        { l: "raised to min", title: "average positions the exchange minimum raised above the lanes' size (share)", f: (r) => zs(r, (s) => `${n2(s.raisedAvg, 1)} (${pct(s.raisedShare, 0)})`), v: (r) => r.summary.raisedShare },
        { l: "at min", title: "average positions sitting at the exchange minimum after every scaler", f: (r) => n2(r.summary.atMinAvg, 1), v: (r) => r.summary.atMinAvg },
        { l: "worst case max", title: "Σ notional × backstop distance (max) · % of equity · samples above the worst-case budget", f: (r) => zs(r, (s) => `${usd(s.worstMax)} · ${pct(s.worstPctMax, 1)}${s.worstOverSamples ? ` · ${s.worstOverSamples} over` : ""}`), v: (r) => r.summary.worstPctMax },
        { l: "size min · median · max", t: "s", f: (r) => zs(r, (s) => `${usd(s.sizeMin)} · ${usd(s.sizeMedian)} · ${usd(s.sizeMax)}`), v: (r) => String(Math.round((r.summary.sizeMedian ?? 0) * 1e4)).padStart(12, "0") },
        { l: "configs kept", title: "top configs kept / offered (averages)", f: (r) => zs(r, (s) => `${n2(s.keptAvg, 0)} / ${n2(s.ofAvg, 0)}`), v: (r) => r.summary.keptAvg },
        { l: "refused", title: "targets refused: exchange minimum above the position cap · max positions reached · dropped by a risk budget", f: (r) => zs(r, (s) => `${s.refusedMinAboveCap} · ${s.refusedMaxPositions} · ${s.droppedByRisk}`), v: (r) => r.summary.refusedMinAboveCap + r.summary.refusedMaxPositions + r.summary.droppedByRisk },
      ],
      Z.variants,
      { rc: (r) => (r.effect === "reference" ? "base" : "") },
    );
    table(
      "tSizingHours",
      [
        { k: "t", l: "hour (UTC)", t: "s", f: (r) => hm(r.t), v: (r) => String(r.t) },
        { l: "equity", f: (r) => usd(r.eq), v: (r) => r.eq },
        { l: "positions", f: (r) => n2(r.positions, 1), v: (r) => r.positions },
        { l: "gross avg", f: (r) => usd(r.gross), v: (r) => r.gross },
        { l: "gross max", f: (r) => usd(r.grossMax), v: (r) => r.grossMax },
        { l: "at cap", f: (r) => n2(r.capped, 1), v: (r) => r.capped },
        { l: "raised", f: (r) => n2(r.raised, 1), v: (r) => r.raised },
        { l: "at min", f: (r) => n2(r.atMin, 1), v: (r) => r.atMin },
        numCol("opens", "opens"),
        numCol("increases", "increases"),
        numCol("reduces", "reduces"),
        numCol("closes", "closes"),
        { l: "worst case max", f: (r) => usd(r.worstMax), v: (r) => r.worstMax },
        { l: "÷ budget", title: "worst case ÷ (worst-case budget × equity), max", f: (r) => (r.worstRatioMax === null ? "–" : n2(r.worstRatioMax) + "×"), v: (r) => r.worstRatioMax ?? -1 },
      ],
      Z.variants[0].hours,
    );
  }

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
    // a series that never crosses 0 keeps 0 as its edge (no padding past the baseline)
    const f = frame(el, { ...o, lo: o.zero && lo >= 0 ? 0 : lo - pad, hi: o.zero && hi <= 0 ? 0 : hi + pad });
    let p = "";
    o.series.forEach((s) => {
      const col = css(s.color);
      const d = s.pts.map((q, i) => (i ? "L" : "M") + f.X(q.t).toFixed(1) + "," + f.Y(q.v).toFixed(1)).join("");
      if (s.area) {
        const base = f.Y(Math.max(f.lo, Math.min(f.hi, 0)));
        p += `<path d="${d}L${f.X(s.pts.at(-1).t).toFixed(1)},${base}L${f.X(s.pts[0].t).toFixed(1)},${base}Z" fill="${col}" fill-opacity=".14" stroke="none"/>`;
      }
      p += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${s.width || 2}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""} stroke-linejoin="round" stroke-linecap="round"/>`;
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
    const swatch = (s) => (s.dash ? `repeating-linear-gradient(90deg, ${css(s.color)} 0 4px, transparent 4px 7px)` : css(s.color));
    const legend = o.series.length > 1 ? `<div class="legend">${o.series.map((s) => `<span><i style="background:${swatch(s)}"></i>${esc(s.name)}</span>`).join("")}</div>` : "";
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
  /**
   * Horizontal bars per category (one row per variant): bars from `base` (0, or 1 for PF), blue above / red below
   * (or the row's own color); a highlighted row is outlined, a dimmed one faded.
   */
  function catChart(id, o) {
    const el = document.getElementById(id);
    if (!el || !o.rows.length) return;
    const w = Math.max(280, el.clientWidth);
    const lw = Math.min(190, Math.round(w * 0.4));
    const rh = 20;
    const m = { l: lw, r: 14, t: 4, b: 22 };
    const h = m.t + m.b + o.rows.length * rh;
    const base = o.base ?? 0;
    const vs = o.rows.map((r) => r.v).filter(fin);
    const ticks = niceTicks(Math.min(base, ...vs), Math.max(base, ...vs), w < 500 ? 3 : 5);
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const X = (v) => m.l + ((v - lo) / (hi - lo || 1)) * (w - m.l - m.r);
    let g = "";
    for (const v of ticks)
      g += `<line class="${v === base ? "zl" : "gl"}" x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${h - m.b}"/><text x="${X(v)}" y="${h - 6}" text-anchor="middle">${o.fx(v)}</text>`;
    if (!ticks.includes(base)) g += `<line class="zl" x1="${X(base)}" x2="${X(base)}" y1="${m.t}" y2="${h - m.b}"/>`;
    const maxCh = Math.max(8, Math.floor((lw - 8) / 6.2));
    o.rows.forEach((r, i) => {
      const y = m.t + i * rh + 3;
      const bh = rh - 6;
      const lab = r.label.length > maxCh ? r.label.slice(0, maxCh - 1) + "…" : r.label;
      g += `<text x="${m.l - 6}" y="${y + bh / 2 + 4}" text-anchor="end" style="fill:var(${r.hi ? "--text" : "--text-2"})${r.hi ? ";font-weight:600" : ""}">${esc(lab)}</text>`;
      if (fin(r.v)) {
        const x0 = X(base);
        const x1 = X(r.v);
        const col = css(r.color || (r.v >= base ? "--pos" : "--neg"));
        g += `<rect x="${Math.min(x0, x1)}" y="${y}" width="${Math.max(1, Math.abs(x1 - x0))}" height="${bh}" rx="3" fill="${col}" fill-opacity="${r.dim ? 0.4 : 1}"${r.hi ? ` stroke="${css("--text")}" stroke-width="1.5"` : ""}/>`;
      }
      g += `<rect class="hb" data-i="${i}" x="0" y="${m.t + i * rh}" width="${w}" height="${rh}" fill="transparent"/>`;
    });
    el.innerHTML = svgEl(w, h, g);
    const svg = el.querySelector("svg");
    svg.querySelectorAll(".hb").forEach((rc) => {
      const show = (ev) => {
        const r = o.rows[+rc.dataset.i];
        const b = svg.getBoundingClientRect();
        showTip(el, o.tip(r), ((fin(r.v) ? X(r.v) : m.l) / w) * b.width, ev.clientY - b.top);
        rc.setAttribute("fill", "rgba(128,128,128,.10)");
      };
      rc.addEventListener("pointermove", show);
      rc.addEventListener("pointerdown", show);
      rc.addEventListener("pointerleave", () => {
        rc.setAttribute("fill", "transparent");
        hideTip();
      });
    });
  }
  // the variant charts: per group, the baseline and the run variants
  function drawVariantCharts() {
    if (!V) return;
    const B = V.rows[0];
    const cumPts = (s) => {
      let c = 0;
      const pts = [{ t: D.window.startT, v: 0 }];
      s.hourNet.forEach((v, i) => {
        c += v;
        pts.push({ t: Math.min(D.window.endT, D.window.startT + (i + 1) * H), v: c });
      });
      return pts;
    };
    const tipRow = (r) => {
      const s = r.summary;
      const head = `<div style="color:var(--text-2)">${esc(r.label)}</div>`;
      if (!s) return head + `<div class="row"><span>${esc(r.status)}</span><b>${esc(r.why ?? "")}</b></div>`;
      return (
        head +
        `<div class="row"><span>net</span><b>${pctU(s.net)} (Δ ${pctU(s.net - B.summary.net)})</b></div>` +
        `<div class="row"><span>PF</span><b>${pfTxt(s.gp, s.gl, s.orders)}</b></div>` +
        `<div class="row"><span>orders</span><b>${s.orders} · long ${s.longs.n} / short ${s.shorts.n}</b></div>` +
        `<div class="row"><span>max DD</span><b>${n2(s.mdd)} %</b></div>` +
        `<div class="row"><span>result</span><b>${r.group === "baseline" ? "baseline" : r.effect === "none" ? "no effect" : r.effect === "volume" ? "changes volume" : "changes orders"}</b></div>`
      );
    };
    for (const g of Object.keys(VAR_GROUPS)) {
      if (g === "tactics") continue;
      const rows = varRows(g).filter((r) => r.summary);
      if (!document.getElementById(`cVarNet_${g}`)) continue;
      const all = [B, ...rows];
      const bars = (f) =>
        all.map((r) => ({ label: r.label, v: f(r.summary), hi: r === B, dim: r !== B && r.effect === "none", r }));
      catChart(`cVarNet_${g}`, { rows: bars((s) => s.net), fx: (v) => n2(v, Math.abs(v) < 10 ? 1 : 0) + "%", tip: (x) => tipRow(x.r) });
      catChart(`cVarPf_${g}`, { rows: bars((s) => (s.orders ? Math.min(s.pf, 5) : NaN)), base: 1, fx: (v) => n2(v, 2), tip: (x) => tipRow(x.r) });
      catChart(`cVarN_${g}`, { rows: bars((s) => s.orders).map((x) => ({ ...x, color: "--s1" })), fx: (v) => n2(v, 0), tip: (x) => tipRow(x.r) });
      // up to 8 variants with the largest change in the line chart (no-effect ones lie on the baseline)
      const top = rows
        .filter((r) => r.effect !== "none")
        .sort((a, b) => Math.abs(b.summary.net - B.summary.net) - Math.abs(a.summary.net - B.summary.net))
        .slice(0, 8);
      if (document.getElementById(`cVarCum_${g}`))
        lineChart(`cVarCum_${g}`, {
          series: [
            ...top.map((r, i) => ({ name: r.label, color: SER[i % SER.length], pts: cumPts(r.summary) })),
            { name: "Baseline", color: "--text", width: 3, pts: cumPts(B.summary) },
          ],
          fy: (v) => n2(v, Math.abs(v) < 10 ? 1 : 0) + "%",
          ft: (v) => pctU(v),
          zero: true,
          height: 260,
        });
    }
  }
  function drawSizingCharts() {
    if (!Z || !Z.variants[0].hours.length) return;
    const vs = Z.variants;
    lineChart("cSzGross", {
      series: vs.map((r, i) =>
        i === 0
          ? { name: r.label, color: "--text", width: 3, pts: r.hours.map((h) => ({ t: h.t, v: h.gross })) }
          : { name: r.label, color: SER[(i - 1) % SER.length], dash: i > SER.length ? "5 4" : "", pts: r.hours.map((h) => ({ t: h.t, v: h.gross })) },
      ),
      fy: fUsd,
      ft: (v) => usd(v),
      zero: true,
      height: 280,
    });
    const tipZ = (x) => {
      const s = x.r.summary;
      return `<div style="color:var(--text-2)">${esc(x.r.label)}</div><div class="row"><span>orders</span><b>${s.orders} (${n2(s.ordersPerHour, 1)} / h)</b></div><div class="row"><span>open · incr · reduce · close</span><b>${s.opens} · ${s.increases} · ${s.reduces} · ${s.closes}</b></div><div class="row"><span>positions</span><b>${n2(s.positionsAvg, 1)} avg · ${s.positionsMax} max</b></div><div class="row"><span>at cap / raised</span><b>${n2(s.cappedAvg, 1)} / ${n2(s.raisedAvg, 1)}</b></div><div class="row"><span>gross avg</span><b>${usd(s.grossAvg)}</b></div><div class="row"><span>worst case max</span><b>${usd(s.worstMax)} · ${pct(s.worstPctMax, 1)}</b></div>`;
    };
    const rowsZ = (f) => vs.map((r, i) => ({ label: r.label, v: f(r.summary), hi: i === 0, dim: r.effect === "none", r }));
    catChart("cSzOrders", { rows: rowsZ((s) => s.ordersPerHour).map((x) => ({ ...x, color: "--s1" })), fx: (v) => n2(v, v < 10 ? 1 : 0), tip: tipZ });
    catChart("cSzCapped", { rows: rowsZ((s) => s.cappedAvg).map((x) => ({ ...x, color: "--s2" })), fx: (v) => n2(v, v < 10 ? 1 : 0), tip: tipZ });
    catChart("cSzWorst", { rows: rowsZ((s) => s.worstPctMax * 100).map((x) => ({ ...x, color: "--s8" })), fx: (v) => n2(v, 0) + "%", tip: tipZ });
  }
  const fUsd = (v) => {
    const a = Math.abs(v);
    return (v < 0 ? "−$" : "$") + (a >= 10000 ? n2(a / 1000, 1) + "k" : a >= 100 || (a >= 10 && Number.isInteger(a)) ? n2(a, 0) : n2(a, a >= 10 ? 1 : 2));
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
    drawVariantCharts();
    drawSizingCharts();
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
