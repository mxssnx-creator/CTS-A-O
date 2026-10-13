#!/usr/bin/env node
// The Base gate under a settings variant (docs/evaluation-2026-10/PROTOCOL-4.md): the causal D1 windows of
// scripts/eval-families.mjs (five consecutive 48 h causal sessions, 24 h pre-history) on the full engine, with one settings
// patch. Per window: the Base funnel (pairs evaluated, pairs that pass the gate, configs in the pool, seated) and the
// pairs' Base statistic against their own trades in the window. Per variant: the survivors, the share of them that trade,
// and the PF of the trades at 0.2 % over D1, D1a and D1b (cut by entry time). Output: runs/eval/gate/<label>.json.
//
//   node --experimental-strip-types scripts/eval-gate.mjs --label base [--settings '{"gates":{"minTrades":30}}'] [--jobs 2]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
const SIGNALS = arg("signals", "off");
const WF = arg("wf", "{}");
JSON.parse(WF); // the walk-forward options (seats, portfolio) of core-session --wf
JSON.parse(SETTINGS); // fail early on a bad patch
const FEED = arg("feed", "runs/eval/feed.json");
const SYMBOLS = arg("symbols", "60"); // the symbols per window (the feed's 60, or 120 for runs/eval/feed120.json)
const JOBS = Math.max(1, Number(arg("jobs", "2")));
const OUT = join("runs/eval", "gate");
mkdirSync(join(OUT, "dumps"), { recursive: true });
const TOGGLES = JSON.stringify({ dca: false, dcaActive: false, block: false, blockActive: false, axis: false });
const H = 3_600_000;
// the evaluated span and its choose/judge split (default D1: 09-29 11:00 to 10-09 11:00, split 10-04 11:00); another span
// (--from/--to/--split) is a check on windows no choice has read, such as the pre-D1 days
const D1 = { from: Date.parse(arg("from", "2026-09-29T11:00:00Z")), to: Date.parse(arg("to", "2026-10-09T11:00:00Z")) };
const SPLIT = Date.parse(arg("split", "2026-10-04T11:00:00Z"));
const D1A = { from: D1.from, to: SPLIT };
const D1B = { from: SPLIT, to: D1.to };
const WINDOWS = [];
for (let t = D1.from; t < D1.to; t += 48 * H) WINDOWS.push({ from: t, to: Math.min(D1.to, t + 48 * H) });
const log = (m) => console.log(`${new Date().toISOString()} [${LABEL}] ${m}`);

/** profit factor at the stored (net) returns; no loss → 9, no gain → 0 */
function pf(rs) {
  let gp = 0;
  let gl = 0;
  for (const v of rs) (v > 0 ? (gp += v) : (gl -= v));
  return gl < 1e-12 ? (gp > 0 ? 9 : 0) : gp / gl;
}

function runWindow(k, w) {
  const dump = join(OUT, "dumps", `${LABEL}_w${k}.json`);
  return new Promise((resolve) => {
    const args = [
      "--max-old-space-size=3072", "--experimental-strip-types", "--no-warnings", "scripts/core-session.mjs",
      "--feed", FEED, "--end-at", new Date(w.to).toISOString(), "--run", "48", "--pre", "24", "--symbols", SYMBOLS,
      "--signals", SIGNALS, "--wf", WF, "--toggles", TOGGLES, "--settings", SETTINGS, "--dump", dump, "--dump-only", "--quiet",
    ];
    const child = spawn(process.execPath, args, {
      env: { ...process.env, CTS_CORE_VARIANTS: "0", CTS_CORE_COMPARE: "0", CTS_CORE_WORKERS: "2", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => resolve({ code, dump, err: err.slice(-300) }));
  });
}

const t0 = Date.now();
const results = new Array(WINDOWS.length);
let next = 0;
await Promise.all(
  Array.from({ length: JOBS }, async () => {
    while (next < WINDOWS.length) {
      const k = next++;
      const w = WINDOWS[k];
      const r = await runWindow(k, w);
      if (!existsSync(r.dump)) throw new Error(`window ${k + 1} failed (exit ${r.code}): ${r.err}`);
      const raw = JSON.parse(readFileSync(r.dump, "utf8"));
      unlinkSync(r.dump);
      results[k] = { w, raw };
      // a compute under the memory fallback left Micro (level 1) or Micro and Minimal (level 2) out: not a full-engine
      // window (--dump-only exits before the session's own memory check)
      const lvl = raw.engine?.mem?.computeLevel ?? 0;
      log(
        `window ${k + 1}/${WINDOWS.length} done: ${raw.trades.length} trades, survivors ${raw.basePairs.filter((x) => x.passed).length} of ${raw.basePairs.length}` +
          (lvl > 0 ? ` · MEMORY FALLBACK level ${lvl}: ${lvl >= 2 ? "Micro and Minimal" : "Micro"} left out of this window` : ""),
      );
    }
  }),
);

// the trades of every window, kept when the entry falls in their own window
const trades = [];
const windows = [];
for (const { w, raw } of results) {
  const mine = raw.trades.filter((t) => t.entryT >= w.from && t.entryT < w.to);
  for (const t of mine) trades.push({ cfg: t.cfg, sym: t.sym, side: t.side, entryT: t.entryT, entry: t.entry, exitT: t.exitT, exit: t.exit, r: t.r, reason: t.reason });
  const pairsOf = (cfg) => cfg.split("|").slice(0, 2).join("|");
  const byPair = new Map();
  for (const t of mine) (byPair.get(pairsOf(t.cfg)) ?? byPair.set(pairsOf(t.cfg), []).get(pairsOf(t.cfg))).push(t.r);
  const survivors = raw.basePairs.filter((x) => x.passed);
  const trading = survivors.filter((x) => (byPair.get(x.pair) ?? []).length > 0);
  windows.push({
    from: new Date(w.from).toISOString(),
    to: new Date(w.to).toISOString(),
    basePairs: raw.basePairs.length,
    survivors: survivors.length,
    survivorsTrading: trading.length,
    funnel: raw.funnel?.counts ?? null,
    trades: mine.length,
    pf: pf(mine.map((t) => t.r)),
    survivorPf: pf(mine.filter((t) => survivors.some((x) => x.pair === pairsOf(t.cfg))).map((t) => t.r)),
    // the Base statistic against the window's PF, per survivor: does the gate's ranking predict the window?
    pairs: survivors.map((x) => ({ pair: x.pair, pre: Number(x.pf.toFixed(3)), n: x.n, win: (byPair.get(x.pair) ?? []).length, winPf: Number(pf(byPair.get(x.pair) ?? []).toFixed(3)) })),
    // the Base validation per range (evaluated / passed pairs, median PF of the passed) and why pairs fail it
    baseByRange: (raw.engine?.baseByRange ?? []).filter((x) => x.enabled).map((x) => ({ tag: x.tag, range: x.range, evaluated: x.evaluated, passed: x.passed, minPf: x.minPf, pfPassedMedian: x.pfPassedMedian, pfPassedMean: x.pfPassedMean ?? null })),
    // after Base, per range × type: the validated pairs' config sets, how many validate at the seat stage (the range's
    // min PF, the validated configs' mean PF on the validation window)
    afterBase: raw.tapeAgg?.evalAfterBase ?? null,
    baseWhy: raw.engine?.baseWhy ?? [],
    computeMs: raw.engine?.computeMs ?? null,
    // the memory fallback level of the window's compute (0 = the full engine)
    memLevel: raw.engine?.mem?.computeLevel ?? 0,
    rssMaxMb: raw.engine?.rssMaxMb ?? null,
    tapes: raw.engine?.tapes ?? null,
    skipPf: raw.engine?.skipPf ?? null,
  });
}
const { rangeOfId } = await import("../src/core/minimal-coord.ts");
const inHalf = (h) => trades.filter((t) => t.entryT >= h.from && t.entryT < h.to).map((t) => t.r);
const summary = {
  label: LABEL,
  settings: JSON.parse(SETTINGS),
  wf: JSON.parse(WF),
  span: { from: new Date(D1.from).toISOString(), to: new Date(D1.to).toISOString(), split: new Date(SPLIT).toISOString() },
  feed: readFileSync(FEED).length,
  basePairsPerWindow: windows.map((x) => x.basePairs),
  survivorsPerWindow: windows.map((x) => x.survivors),
  survivorsTradingPerWindow: windows.map((x) => x.survivorsTrading),
  tradesPerWindow: windows.map((x) => x.trades),
  // windows computed under the memory fallback (a range left out): their counts are not the full engine's
  memFallbackWindows: windows.filter((x) => x.memLevel > 0).length,
  pf: { d1: pf(trades.map((t) => t.r)), d1a: pf(inHalf(D1A)), d1b: pf(inHalf(D1B)) },
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
      if (!a) acc.set(name, (a = { range: name, basePairs: 0, baseValidated: 0, baseMinPf: null, basePfSum: 0, basePfN: 0, sets: 0, setsValidated: 0, setsMinPf: null, setsPfSum: 0, orders: 0, gp: 0, gl: 0 }));
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
      }
      for (const [k, v] of Object.entries(w.afterBase ?? {})) {
        const a = row(k.split("|")[0]);
        a.sets += v.configs ?? 0;
        a.setsValidated += v.passed ?? 0;
        a.setsMinPf = v.minPf ?? a.setsMinPf;
        a.setsPfSum += v.pfPassedSum ?? 0;
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
      sets: a.sets,
      setsValidated: a.setsValidated,
      setsMinPf: a.setsMinPf,
      setsPfMean: a.setsValidated ? +(a.setsPfSum / a.setsValidated).toFixed(3) : null,
      orders: a.orders,
      pf: a.gl > 1e-12 ? +(a.gp / a.gl).toFixed(4) : null,
    }));
  })(),
  tapesPerWindow: windows.map((x) => x.tapes),
  computeMsPerWindow: windows.map((x) => x.computeMs),
  rssMaxMb: Math.max(0, ...windows.map((x) => x.rssMaxMb ?? 0)),
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
    `trades ${summary.trades.d1} (D1a ${summary.trades.d1a}, D1b ${summary.trades.d1b}); PF D1 ${summary.pf.d1.toFixed(2)}, D1a ${summary.pf.d1a.toFixed(2)}, D1b ${summary.pf.d1b.toFixed(2)} (${summary.seconds.toFixed(0)} s)`,
);
if (summary.baseByRange.length)
  log(
    `Base by range (passed / evaluated): ${summary.baseByRange.map((x) => `${x.range} ${x.passed}/${x.evaluated}`).join(" · ")}; ` +
      `peak RSS ${summary.rssMaxMb} MB`,
  );
for (const f of summary.funnel.filter((x) => x.basePairs || x.orders))
  log(
    `after Base · ${f.range}: pairs ${f.baseValidated}/${f.basePairs} validated (PF ≥ ${f.baseMinPf ?? "–"}, mean ${f.basePfMean ?? "–"})` +
      ` → sets ${f.setsValidated}/${f.sets} validated (PF ≥ ${f.setsMinPf ?? "–"}, mean ${f.setsPfMean ?? "–"}) → orders ${f.orders} @ PF ${f.pf ?? "–"}`,
  );
if (summary.skipPf.length)
  log(`dropped by each gate (n @ PF): ${summary.skipPf.slice(0, 9).map((x) => `${x.why} ${x.n} @ ${x.pf ?? "–"}`).join(" · ")}`);
