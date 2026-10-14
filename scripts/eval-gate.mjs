#!/usr/bin/env node
// The Base gate under a settings variant (docs/evaluation-2026-10/PROTOCOL-4.md): the causal D1 windows of
// scripts/eval-families.mjs (five consecutive 48 h causal sessions, 24 h pre-history) on the full engine, with one settings
// patch. Per window: the Base funnel (pairs evaluated, pairs that pass the gate, configs in the pool, seated) and the
// pairs' Base statistic against their own trades in the window. Per variant: the survivors, the share of them that trade,
// and the PF of the trades at 0.2 % over D1, D1a and D1b (cut by entry time). Output: runs/eval/gate/<label>.json.
//
//   node --experimental-strip-types scripts/eval-gate.mjs --label base [--settings '{"gates":{"minTrades":30}}'] [--jobs 2]
//     [--from ISO --to ISO [--split ISO]] [--plan: print the windows and their warm-up, run nothing] [--allow-short-warmup]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { unitR, windowOrders } from "./lib/eval-orders.mjs";
import { ENGINE_WARMUP_H, evalWindows, feedStartTFile, resolveSpan, warmupNeedH, warmupOf } from "./lib/eval-windows.mjs";
import { admitter, availMb, guardChild, watchHwm } from "./lib/mem-admission.mjs";
import { join } from "node:path";
import { variantScores } from "./lib/eval-variants.mjs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const LABEL = arg("label", "");
if (!LABEL) {
  console.error("--label is required (the output file name)");
  process.exit(2);
}
const SETTINGS = arg("settings", "{}");
// per-variant scoring: --score-short counts a short-warm-up window's trades (marked unscored otherwise); --min-n sets the
// trades a window needs before its PF counts (default 0: no guard — an operator choice, see scripts/lib/eval-variants.mjs)
const SCORE_SHORT = process.argv.includes("--score-short");
const MIN_N = Number(arg("min-n", "0"));
const SIGNALS = arg("signals", "off");
const WF = arg("wf", "{}");
JSON.parse(WF); // the walk-forward options (seats, portfolio) of core-session --wf
JSON.parse(SETTINGS); // fail early on a bad patch
// …and on one the settings checks refuse (an unknown key, a bound): the engine takes a session patch as asked, so a typo
// such as gates.baseWindows.gate.splits ran the whole eval as the baseline
{
  const { checkSettings } = await import("../src/core/settings-check.ts");
  try {
    checkSettings(JSON.parse(SETTINGS));
  } catch (e) {
    console.error(`--settings refused: ${e.message}`);
    process.exit(2);
  }
}
// the two-window Base readout's rules (gates.baseWindows.report): the engine computes the first 8
const BASE_RULES = (() => {
  const r = JSON.parse(SETTINGS).gates?.baseWindows?.report;
  return Array.isArray(r) && r.length ? r.slice(0, 8) : null;
})();
const FEED = arg("feed", "runs/eval/feed.json");
const SYMBOLS = arg("symbols", "60"); // the symbols per window (the feed's 60, or 120 for runs/eval/feed120.json)
const JOBS = Math.max(1, Number(arg("jobs", "2")));
const OUT = join("runs/eval", "gate");
const TOGGLES = JSON.stringify({ dca: false, dcaActive: false, block: false, blockActive: false, axis: false });
// the evaluated span and its choose/judge split (default D1: 09-29 11:00 to 10-09 11:00, split 10-04 11:00); another span
// (--from/--to, split at its middle hour unless --split names one inside it) is a check on windows no choice has read,
// such as the pre-D1 days (scripts/lib/eval-windows.mjs)
const D1 = resolveSpan({ from: arg("from"), to: arg("to"), split: arg("split") });
const SPLIT = D1.split;
const D1A = { from: D1.from, to: SPLIT };
const D1B = { from: SPLIT, to: D1.to };
// each window's session runs over that window only (a short last window gets a short run, not 48 h ending at its end)
const WINDOWS = evalWindows(D1, 48);
// the history each window's session has before its start (the feed's start) against the warm-up it needs: the engine's
// (--warmup-h, default 100 h) and, with historic signal configs, their lookback (hist.lookbackH). A lane's volatility rank
// is valid only after 336 of its own bars (168 h on 30 m): the lanes it is not yet valid on are reported per window
// (limitedLanes). The engine already loads every feed bar before a window (tfDays); a window inside the warm-up is refused
// unless --allow-short-warmup (then marked, and its trades are scored only with --score-short)
// (the feed's size and its start read without holding the file: it was kept as a 318 MB Buffer for the whole eval)
const FEED_BYTES = statSync(FEED).size;
const FEED_START = feedStartTFile(FEED);
const { TFS, WARMUP_NEED_H } = await (async () => {
  const { DEFAULT_SETTINGS } = await import("../src/core/config.ts");
  const p = JSON.parse(SETTINGS);
  const sig = { ...DEFAULT_SETTINGS.signals, ...(p.signals ?? {}), hist: { ...DEFAULT_SETTINGS.signals.hist, ...(p.signals?.hist ?? {}) } };
  const engineH = arg("warmup-h", null);
  return {
    TFS: p.tfs ?? DEFAULT_SETTINGS.tfs,
    WARMUP_NEED_H: warmupNeedH({
      engineH: engineH == null ? ENGINE_WARMUP_H : Number(engineH),
      signals: SIGNALS === "on",
      hist: sig.hist.enabled !== false,
      lookbackH: Number(sig.hist.lookbackH) || 0,
    }),
  };
})();
const WARMUP = warmupOf(WINDOWS, FEED_START, WARMUP_NEED_H, TFS);
const SHORT = WARMUP.flatMap((x, k) => (x.short ? [k] : []));
const plan = {
  span: { from: new Date(D1.from).toISOString(), to: new Date(D1.to).toISOString(), split: new Date(SPLIT).toISOString() },
  windows: WINDOWS.map((w, k) => ({ from: new Date(w.from).toISOString(), to: new Date(w.to).toISOString(), runH: w.runH, ...WARMUP[k] })),
  feedStart: FEED_START == null ? null : new Date(FEED_START).toISOString(),
  warmupNeedH: WARMUP_NEED_H,
};
// --plan: print the windows, their run lengths and warm-up; nothing is run
if (process.argv.includes("--plan")) {
  console.log(JSON.stringify(plan));
  process.exit(0);
}
if (SHORT.length && !process.argv.includes("--allow-short-warmup")) {
  console.error(
    `window(s) ${SHORT.map((k) => k + 1).join(", ")} start inside the warm-up: the feed starts ${plan.feedStart} and a window needs ` +
      `${WARMUP_NEED_H} h before its start (${SHORT.map((k) => `w${k + 1} has ${WARMUP[k].haveH} h`).join(", ")}). Record a longer ` +
      `feed, move --from, or pass --allow-short-warmup (the windows are then marked in warmupShortWindows)`,
  );
  process.exit(2);
}
mkdirSync(join(OUT, "dumps"), { recursive: true });
const log = (m) => console.log(`${new Date().toISOString()} [${LABEL}] ${m}`);

/** profit factor at the stored (net) returns; no loss → 9, no gain → 0 */
function pf(rs) {
  let gp = 0;
  let gl = 0;
  for (const v of rs) (v > 0 ? (gp += v) : (gl -= v));
  return gl < 1e-12 ? (gp > 0 ? 9 : 0) : gp / gl;
}

// the session each window runs (CTS_EVAL_SESSION: a test hook, a stand-in session that writes a dump)
const SESSION = process.env.CTS_EVAL_SESSION || "scripts/core-session.mjs";
function runWindow(k, w) {
  const dump = join(OUT, "dumps", `${LABEL}_w${k}.json`);
  return new Promise((resolve) => {
    // (a 50 % heap growing step: an isolate with a 2 GB+ limit otherwise grows to 4× its live heap before a major
    // collection. No --expose-gc: it makes each worker collect after every reply, which cost 10 % more compute for 76 MB
    // less at 60 symbols; the growing step alone saved 57 MB at the same compute, 14 Oct, docs/performance-latency.md)
    const args = [
      "--max-old-space-size=3072", "--heap-growing-percent=50", "--experimental-strip-types", "--no-warnings", SESSION,
      "--feed", FEED, "--end-at", new Date(w.to).toISOString(), "--run", String(w.runH), "--pre", "24", "--symbols", SYMBOLS,
      "--signals", SIGNALS, "--wf", WF, "--toggles", TOGGLES, "--settings", SETTINGS, "--dump", dump, "--dump-only", "--quiet",
    ];
    const child = spawn(process.execPath, args, {
      env: { ...process.env, CTS_CORE_VARIANTS: "0", CTS_CORE_COMPARE: "0", CTS_CORE_WORKERS: "2", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    // the child's high-water mark over every phase, its workers included (its own rssMaxMb stops before the dump)
    const hwm = watchHwm(child.pid);
    // the desk first: under CTS_EVAL_KILL_BELOW_MB available the child is stopped and the window fails loudly
    const guard = guardChild(child, { avail });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => resolve({ code, dump, err: err.slice(-300), vmHwmMb: hwm.stop(), memStop: guard.stop() }));
  });
}

// a child starts when the host can give it the largest high-water mark seen so far (before the first one: 7 GB on
// feed120, 4 GB on feed.json; --expect-mb) for itself and for every child still running, and keep CTS_EVAL_RESERVE_MB
// (3 GB) for the live desk: beside a desk that is one child at a time (every desk fallback step on 13 Oct came while two
// ran beside it). Past 30 min of waiting a child runs alone, once no other child of this eval runs (logged).
const RESERVE_MB = Number(process.env.CTS_EVAL_RESERVE_MB || 3000);
// (signals on at 60 symbols of feed.json: 6.5 GB, 14 Oct)
let expectMb = Number(arg("expect-mb", FEED_BYTES > 250e6 || SIGNALS === "on" ? "7000" : "4000"));
let seenMb = 0;
const { cgroupAvailMb } = await import("../src/core/server/memguard.server.ts");
const avail = () => availMb(undefined, cgroupAvailMb);
const gate = admitter({ perChildMb: () => expectMb, reserveMb: RESERVE_MB, avail });

/**
 * One window's dump reduced to what the summary reads, right after the window (the whole raw dumps of every window were
 * kept until the last one finished: 0.5–1.7 GB in this process at the end of a 5-window eval).
 */
function reduceWindow(raw, w, warmup, vmHwmMb) {
  // the window's orders: those closed in it and those still open at its end, marked (scripts/lib/eval-orders.mjs)
  const { closed: closedMine, open: openMine, all: mine } = windowOrders(raw, w);
  // the ranges this window's run did not compute (memory fallback: Micro at level 1, Micro and Minimal at level 2) and a
  // short warm-up window (its history is incomplete): unscored for every range, not zero (scripts/lib/eval-variants.mjs)
  const lvlNow = raw.engine?.mem?.computeLevel ?? 0;
  const uncomputed = [...(lvlNow >= 1 ? ["Micro"] : []), ...(lvlNow >= 2 ? ["Minimal"] : [])];
  if (warmup?.short && !SCORE_SHORT) uncomputed.push("Micro", "Minimal", "Minimal plus", "Short", "General", "Long", "Wide", "Signals");
  const variantWindow = {
    name: new Date(w.from).toISOString().slice(0, 16),
    trades: mine.map((t) => ({ cfg: t.cfg, r: unitR(t) })),
    uncomputed: [...new Set(uncomputed)],
  };
  // every order at ONE unit (unitR): the eval's PF is the per-order edge, as the gates judge it
  const trades = [];
  for (const t of mine) trades.push({ cfg: t.cfg, sym: t.sym, side: t.side, entryT: t.entryT, entry: t.entry, exitT: t.exitT, exit: t.exit, r: unitR(t), reason: t.reason });
  const pairsOf = (cfg) => cfg.split("|").slice(0, 2).join("|");
  const byPair = new Map();
  for (const t of mine) (byPair.get(pairsOf(t.cfg)) ?? byPair.set(pairsOf(t.cfg), []).get(pairsOf(t.cfg))).push(t.r);
  const survivors = raw.basePairs.filter((x) => x.passed);
  const trading = survivors.filter((x) => (byPair.get(x.pair) ?? []).length > 0);
  // survivors per range by the ranges their sets are built in (the dump's tags, "wide" = the untagged grid): a Micro
  // indication that passed only on its Minimal cells is a Minimal survivor, not a Micro one ("?" = a dump without tags)
  const survivorsByRange = {};
  for (const x of survivors) for (const t of x.tags ?? ["?"]) survivorsByRange[t || "wide"] = (survivorsByRange[t || "wide"] ?? 0) + 1;
  const window = {
    from: new Date(w.from).toISOString(),
    to: new Date(w.to).toISOString(),
    runH: w.runH,
    // the history before the window's start against the warm-up it needs (short: lanes / historic configs missing)
    warmup,
    // the signal pairs and configs built at the run start (configs include the historic ones)
    signals: raw.engine?.signals ?? null,
    basePairs: raw.basePairs.length,
    survivors: survivors.length,
    survivorsByRange,
    survivorsTrading: trading.length,
    funnel: raw.funnel?.counts ?? null,
    trades: mine.length,
    openAtEnd: openMine.length,
    openEndRule: raw.openEndRule ?? null,
    pf: pf(mine.map((t) => t.r)),
    pfClosed: pf(closedMine.map((t) => t.r)),
    survivorPf: pf(mine.filter((t) => survivors.some((x) => x.pair === pairsOf(t.cfg))).map((t) => t.r)),
    // the Base statistic against the window's PF, per survivor: does the gate's ranking predict the window? (`rules`, with
    // gates.baseWindows.report set: per report rule the ranges and targets that pass it too — scripts/eval-base-rules.mjs)
    pairs: survivors.map((x) => ({ pair: x.pair, tags: x.tags ?? null, pre: Number(x.pf.toFixed(3)), n: x.n, win: (byPair.get(x.pair) ?? []).length, winPf: Number(pf(byPair.get(x.pair) ?? []).toFixed(3)), ...(x.rules ? { rules: x.rules } : {}) })),
    // the Base validation per range (evaluated / passed pairs, median PF of the passed) and why pairs fail it
    baseByRange: (raw.engine?.baseByRange ?? []).filter((x) => x.enabled).map((x) => ({ tag: x.tag, range: x.range, evaluated: x.evaluated, passed: x.passed, minPf: x.minPf, pfPassedMedian: x.pfPassedMedian, pfPassedMean: x.pfPassedMean ?? null, pfPassedPooled: x.pfPassedPooled ?? null, passedGp: x.passedGp ?? 0, passedGl: x.passedGl ?? 0 })),
    // after Base, per range × type: the validated pairs' config sets, how many validate at the seat stage (the range's
    // min PF, the validated configs' mean PF on the validation window)
    afterBase: raw.tapeAgg?.evalAfterBase ?? null,
    // PF after Base (out of sample to Base): per range × type, the run's closes of every config of the Base-passed
    // pairs (pool) and of the configs validated at the run start (eval) — n, gross profit, gross loss
    pool: raw.tapeAgg?.rangeByType ?? null,
    poolEval: raw.tapeAgg?.rangeByTypeEval ?? null,
    // signal units validated (active) at the run start and at any step of the run
    signalUnits: raw.tapeAgg?.evalStats ? { atStart: raw.tapeAgg.evalStats.signalActive ?? 0, run: raw.tapeAgg.evalStats.signalUnitsRun ?? 0 } : null,
    baseWhy: raw.engine?.baseWhy ?? [],
    computeMs: raw.engine?.computeMs ?? null,
    // the memory fallback level of the window's compute (0 = the full engine)
    memLevel: raw.engine?.mem?.computeLevel ?? 0,
    rssMaxMb: raw.engine?.rssMaxMb ?? null,
    tapes: raw.engine?.tapes ?? null,
    skipPf: raw.engine?.skipPf ?? null,
      // the child's high-water mark over every phase (VmHWM, its workers included)
    vmHwmMb: vmHwmMb ?? null,
  };
  return { variantWindow, trades, window };
}

const t0 = Date.now();
const results = new Array(WINDOWS.length);
let next = 0;
await Promise.all(
  Array.from({ length: JOBS }, async () => {
    while (next < WINDOWS.length) {
      const k = next++;
      const w = WINDOWS[k];
      const adm = await gate.acquire();
      if (adm.waitedMs > 1000 || adm.alone)
        log(
          `window ${k + 1}: waited ${Math.round(adm.waitedMs / 1000)} s for memory (${adm.availMb} MB available, ${expectMb} MB per child + ` +
            `${RESERVE_MB} MB reserve)${adm.alone ? " — runs alone past the wait limit" : ""}`,
        );
      let r;
      try {
        r = await runWindow(k, w);
      } finally {
        gate.release();
      }
      // (a child that failed before its peak is no estimate of the next one's)
      if (r.vmHwmMb != null && r.code === 0 && existsSync(r.dump)) {
        seenMb = Math.max(seenMb, r.vmHwmMb);
        expectMb = seenMb;
      }
      if (r.memStop)
        throw new Error(
          `window ${k + 1} stopped: the host had ${r.memStop.availMb} MB available (under CTS_EVAL_KILL_BELOW_MB; the live desk's memory comes first) — run fewer symbols, signals off, or with the desk down`,
        );
      if (!existsSync(r.dump)) throw new Error(`window ${k + 1} failed (exit ${r.code}): ${r.err}`);
      const raw = JSON.parse(readFileSync(r.dump, "utf8"));
      unlinkSync(r.dump);
      // a compute under the memory fallback left Micro (level 1) or Micro and Minimal (level 2) out: not a full-engine
      // window (--dump-only exits before the session's own memory check)
      const lvl = raw.engine?.mem?.computeLevel ?? 0;
      log(
        `window ${k + 1}/${WINDOWS.length} done: ${raw.trades.length} trades, survivors ${raw.basePairs.filter((x) => x.passed).length} of ${raw.basePairs.length}` +
          (r.vmHwmMb != null ? ` · peak ${r.vmHwmMb} MB` : "") +
          (lvl > 0 ? ` · MEMORY FALLBACK level ${lvl}: ${lvl >= 2 ? "Micro and Minimal" : "Micro"} left out of this window` : ""),
      );
      results[k] = reduceWindow(raw, w, WARMUP[k], r.vmHwmMb);
    }
  }),
);

// the trades of every window (kept when the entry falls in their own window), the windows, and every window's orders by
// name for the per-variant minimum PF (scripts/lib/eval-variants.mjs) — in window order
const trades = [];
const windows = [];
const variantWindows = [];
for (const x of results) {
  variantWindows.push(x.variantWindow);
  for (const t of x.trades) trades.push(t);
  windows.push(x.window);
}
const { rangeOfId } = await import("../src/core/minimal-coord.ts");
const inHalf = (h) => trades.filter((t) => t.entryT >= h.from && t.entryT < h.to).map((t) => t.r);
// per variant (range × trail distance × hold time): the minimum PF over the windows; a variant passes at PF ≥ 1.2 in
// every window (operator, 13 Oct: "eval by min PF")
const variants = variantScores(variantWindows, { floor: 1.2, minN: MIN_N });
const summary = {
  label: LABEL,
  // the PF basis of every figure below: each order at one unit (r / mult), after the stored round-trip cost
  basis: "unit",
  variants,
  settings: JSON.parse(SETTINGS),
  // the two-window Base report rules of the run (gates.baseWindows.report, at most 8): rule k of windows[].pairs[].rules
  ...(BASE_RULES ? { baseRules: BASE_RULES } : {}),
  wf: JSON.parse(WF),
  span: plan.span,
  feed: FEED_BYTES,
  feedStart: plan.feedStart,
  warmupNeedH: WARMUP_NEED_H,
  // windows (1-based) run inside the warm-up with --allow-short-warmup: lanes / historic configs missing there
  warmupShortWindows: SHORT.map((k) => k + 1),
  basePairsPerWindow: windows.map((x) => x.basePairs),
  survivorsPerWindow: windows.map((x) => x.survivors),
  survivorsByRangePerWindow: windows.map((x) => x.survivorsByRange),
  survivorsTradingPerWindow: windows.map((x) => x.survivorsTrading),
  tradesPerWindow: windows.map((x) => x.trades),
  // windows computed under the memory fallback (a range left out): their counts are not the full engine's
  memFallbackWindows: windows.filter((x) => x.memLevel > 0).length,
  // with the orders open at each window's end marked (pfClosed: the closed ones only, as before 13 Oct)
  pf: { d1: pf(trades.map((t) => t.r)), d1a: pf(inHalf(D1A)), d1b: pf(inHalf(D1B)) },
  pfClosed: (() => {
    const c = trades.filter((t) => t.reason !== "open-end");
    const h = (x) => c.filter((t) => t.entryT >= x.from && t.entryT < x.to).map((t) => t.r);
    return { d1: pf(c.map((t) => t.r)), d1a: pf(h(D1A)), d1b: pf(h(D1B)) };
  })(),
  openAtEnd: trades.filter((t) => t.reason === "open-end").length,
  trades: { d1: trades.length, d1a: inHalf(D1A).length, d1b: inHalf(D1B).length },
  seconds: (Date.now() - t0) / 1000,
  // the Base validation ratio per range over the windows (pairs evaluated / passed, summed)
  baseByRange: (() => {
    const acc = new Map();
    for (const w of windows)
      for (const x of w.baseByRange) {
        const a = acc.get(x.range) ?? { range: x.range, evaluated: 0, passed: 0 };
        a.evaluated += x.evaluated;
        a.passed += x.passed;
        acc.set(x.range, a);
      }
    return [...acc.values()].map((a) => ({ ...a, ratio: a.evaluated ? +(a.passed / a.evaluated).toFixed(4) : null }));
  })(),
  baseWhy: (() => {
    const acc = new Map();
    for (const w of windows)
      for (const x of w.baseWhy) {
        const a = acc.get(x.tag) ?? { tag: x.tag, evaluated: 0, passed: 0, first: { closes: 0, net: 0, pf: 0, ddr: 0 }, only: { closes: 0, net: 0, pf: 0, ddr: 0 } };
        a.evaluated += x.evaluated;
        a.passed += x.passed;
        // (the two-window gate's "windows" only while gates.baseWindows.gate is set)
        if (x.first?.windows !== undefined && a.first.windows === undefined) a.first.windows = a.only.windows = 0;
        for (const k of Object.keys(a.first)) {
          a.first[k] += x.first?.[k] ?? 0;
          a.only[k] += x.only?.[k] ?? 0;
        }
        acc.set(x.tag, a);
      }
    return [...acc.values()];
  })(),
  // what each executor gate dropped (the skipped candidates' unit PF) against the executed orders
  skipPf: (() => {
    const acc = {};
    for (const w of windows)
      for (const [k, v] of Object.entries(w.skipPf ?? {})) {
        const a = (acc[k] ??= { n: 0, gp: 0, gl: 0 });
        a.n += v.n;
        a.gp += v.gp;
        a.gl += v.gl;
      }
    const out = Object.entries(acc)
      .map(([why, a]) => ({ why, n: a.n, pf: a.gl > 1e-12 ? +(a.gp / a.gl).toFixed(4) : null }))
      .sort((a, b) => b.n - a.n);
    return out.length ? [{ why: "executed", n: trades.length, pf: +pf(trades.map((t) => t.r)).toFixed(4) }, ...out] : [];
  })(),
  // the post-Base funnel per range (operator, 13 Oct: the counts after Base validation with their PF): Base pairs
  // validated (min PF, mean PF of the validated), their config sets, the configs validated at the seat stage (min PF,
  // mean PF), the executed orders and their realized PF
  funnel: (() => {
    const NAME = { "": "Wide", mc: "Micro", mn: "Minimal", mp: "Minimal plus", sh: "Short", gn: "General", lg: "Long" };
    const acc = new Map();
    const row = (name) => {
      let a = acc.get(name);
      if (!a) acc.set(name, (a = { range: name, basePairs: 0, baseValidated: 0, baseMinPf: null, basePfSum: 0, basePfN: 0, baseGp: 0, baseGl: 0, sets: 0, setsValidated: 0, setsMinPf: null, setsPfSum: 0, setsGp: 0, setsGl: 0, units: 0, orders: 0, gp: 0, gl: 0, poolN: 0, poolGp: 0, poolGl: 0, evalN: 0, evalGp: 0, evalGl: 0 }));
      return a;
    };
    for (const w of windows) {
      for (const x of w.baseByRange) {
        const a = row(x.range);
        a.basePairs += x.evaluated;
        a.baseValidated += x.passed;
        a.baseMinPf = x.minPf ?? a.baseMinPf;
        if (x.pfPassedMean != null) {
          a.basePfSum += x.pfPassedMean * x.passed;
          a.basePfN += x.passed;
        }
        a.baseGp += x.passedGp ?? 0;
        a.baseGl += x.passedGl ?? 0;
      }
      if (w.signalUnits) row("Signals").units += w.signalUnits.run;
      for (const [k, v] of Object.entries(w.afterBase ?? {})) {
        const a = row(k.split("|")[0]);
        a.sets += v.configs ?? 0;
        a.setsValidated += v.passed ?? 0;
        a.setsMinPf = v.minPf ?? a.setsMinPf;
        a.setsPfSum += v.pfPassedSum ?? 0;
        a.setsGp += v.okGp ?? 0;
        a.setsGl += v.okGl ?? 0;
      }
    }
    for (const w of windows) {
      for (const [k, v] of Object.entries(w.pool ?? {})) {
        const a = row(k.split("|")[0]);
        a.poolN += v.n ?? 0;
        a.poolGp += v.gp ?? 0;
        a.poolGl += v.gl ?? 0;
      }
      for (const [k, v] of Object.entries(w.poolEval ?? {})) {
        const a = row(k.split("|")[0]);
        a.evalN += v.n ?? 0;
        a.evalGp += v.gp ?? 0;
        a.evalGl += v.gl ?? 0;
      }
    }
    for (const t of trades) {
      const a = row((t.cfg.split("|")[1] ?? "").startsWith("sig-") ? "Signals" : (NAME[rangeOfId(t.cfg)] ?? "Wide"));
      a.orders++;
      if (t.r > 0) a.gp += t.r;
      else a.gl -= t.r;
    }
    return [...acc.values()].map((a) => ({
      range: a.range,
      basePairs: a.basePairs,
      baseValidated: a.baseValidated,
      baseMinPf: a.baseMinPf,
      basePfMean: a.basePfN ? +(a.basePfSum / a.basePfN).toFixed(3) : null,
      // the validated pairs' / sets' PF taken together after each evaluation (Σ gross profit ÷ Σ gross loss)
      basePf: a.baseGl > 1e-12 ? +(a.baseGp / a.baseGl).toFixed(3) : null,
      setsPf: a.setsGl > 1e-12 ? +(a.setsGp / a.setsGl).toFixed(3) : null,
      signalUnits: a.units || null,
      sets: a.sets,
      setsValidated: a.setsValidated,
      setsMinPf: a.setsMinPf,
      setsPfMean: a.setsValidated ? +(a.setsPfSum / a.setsValidated).toFixed(3) : null,
      orders: a.orders,
      pf: a.gl > 1e-12 ? +(a.gp / a.gl).toFixed(4) : null,
      // PF after Base: every config of the Base-passed pairs, and the configs validated at each run start, over the run
      afterBaseN: a.poolN,
      afterBasePf: a.poolGl > 1e-12 ? +(a.poolGp / a.poolGl).toFixed(4) : null,
      validatedN: a.evalN,
      validatedPf: a.evalGl > 1e-12 ? +(a.evalGp / a.evalGl).toFixed(4) : null,
    }));
  })(),
  tapesPerWindow: windows.map((x) => x.tapes),
  computeMsPerWindow: windows.map((x) => x.computeMs),
  rssMaxMb: Math.max(0, ...windows.map((x) => x.rssMaxMb ?? 0)),
  // each window child's high-water mark over every phase, its workers included (rssMaxMb stops before the dump)
  vmHwmMbPerWindow: windows.map((x) => x.vmHwmMb ?? null),
};
// the family table of the window's trades (bot-stats: one family per bot, range and signal source)
const rowsOf = trades.map((t) => ({ id: `${t.cfg}|${t.sym}|${t.side}|${t.entryT}`, cfg: t.cfg, sym: t.sym, side: t.side, entry: t.entry, exit: t.exit, exit_t: t.exitT, r: t.r, reason: t.reason }));
const { botStatsFromRows } = await import("../src/core/bot-stats.ts");
summary.families = botStatsFromRows(rowsOf).families.map((f) => ({ family: f.family, trades: f.trades, events: f.events, pf02: f.pf02, pf04: f.pf04, long: f.long.n, short: f.short.n, blockPassRate: f.blockPassRate, verdict: f.verdict }));
const out = { summary, windows, trades };
const file = join(OUT, `${LABEL}.json`);
writeFileSync(file + ".tmp", JSON.stringify(out));
renameSync(file + ".tmp", file);
log(
  `survivors per window ${summary.survivorsPerWindow.join("/")} (trading ${summary.survivorsTradingPerWindow.join("/")}); ` +
    `trades ${summary.trades.d1} (D1a ${summary.trades.d1a}, D1b ${summary.trades.d1b}; ${summary.openAtEnd} open at a window end, marked); PF D1 ${summary.pf.d1.toFixed(2)}, D1a ${summary.pf.d1a.toFixed(2)}, D1b ${summary.pf.d1b.toFixed(2)} (closed only: ${summary.pfClosed.d1.toFixed(2)} / ${summary.pfClosed.d1a.toFixed(2)} / ${summary.pfClosed.d1b.toFixed(2)}) (${summary.seconds.toFixed(0)} s)`,
);
if (summary.baseByRange.length)
  log(
    `Base by range (passed / evaluated): ${summary.baseByRange.map((x) => `${x.range} ${x.passed}/${x.evaluated}`).join(" · ")}; ` +
      `peak RSS ${summary.rssMaxMb} MB`,
  );
// after each evaluation, its PF and how many it validated (operator, 13 Oct: "show the PF after the evals and the sets
// amount validated"): Base (pairs, their Base cells), the seat validation (sets, on their validation window at each
// run start; signals: units active in the run), then the orders' realized PF
const pfS = (x) => (x == null ? "–" : x.toFixed(2));
for (const f of summary.funnel.filter((x) => x.basePairs || x.orders))
  log(
    `${f.range} · Base PF ${pfS(f.basePf)} (${f.baseValidated} of ${f.basePairs} pairs validated)` +
      (f.range === "Signals"
        ? ` → validation: ${f.signalUnits ?? 0} units active`
        : ` → validation PF ${pfS(f.setsPf)} (${f.setsValidated} of ${f.sets} sets validated)`) +
      ` → orders PF ${pfS(f.pf)} (${f.orders})`,
  );
if (summary.skipPf.length)
  log(`dropped by each gate (n @ PF): ${summary.skipPf.slice(0, 9).map((x) => `${x.why} ${x.n} @ ${x.pf ?? "–"}`).join(" · ")}`);
