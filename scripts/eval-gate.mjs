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
const JOBS = Math.max(1, Number(arg("jobs", "2")));
const OUT = join("runs/eval", "gate");
mkdirSync(join(OUT, "dumps"), { recursive: true });
const TOGGLES = JSON.stringify({ dca: false, dcaActive: false, block: false, blockActive: false, axis: false });
const H = 3_600_000;
const D1 = { from: Date.parse("2026-09-29T11:00:00Z"), to: Date.parse("2026-10-09T11:00:00Z") };
const D1A = { from: D1.from, to: Date.parse("2026-10-04T11:00:00Z") };
const D1B = { from: Date.parse("2026-10-04T11:00:00Z"), to: D1.to };
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
      "--feed", FEED, "--end-at", new Date(w.to).toISOString(), "--run", "48", "--pre", "24", "--symbols", "60",
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
      log(`window ${k + 1}/${WINDOWS.length} done: ${raw.trades.length} trades, survivors ${raw.basePairs.filter((x) => x.passed).length} of ${raw.basePairs.length}`);
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
  });
}
const inHalf = (h) => trades.filter((t) => t.entryT >= h.from && t.entryT < h.to).map((t) => t.r);
const summary = {
  label: LABEL,
  settings: JSON.parse(SETTINGS),
  wf: JSON.parse(WF),
  feed: readFileSync(FEED).length,
  basePairsPerWindow: windows.map((x) => x.basePairs),
  survivorsPerWindow: windows.map((x) => x.survivors),
  survivorsTradingPerWindow: windows.map((x) => x.survivorsTrading),
  tradesPerWindow: windows.map((x) => x.trades),
  pf: { d1: pf(trades.map((t) => t.r)), d1a: pf(inHalf(D1A)), d1b: pf(inHalf(D1B)) },
  trades: { d1: trades.length, d1a: inHalf(D1A).length, d1b: inHalf(D1B).length },
  seconds: (Date.now() - t0) / 1000,
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
