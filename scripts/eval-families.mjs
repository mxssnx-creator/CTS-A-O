#!/usr/bin/env node
// The causal family evaluation (docs/evaluation-2026-10/PROTOCOL-3.md): every family alone through the engine over the D1
// window, one process at a time. The D1 window (240 h) is cut into consecutive causal 48 h windows, each its own causal
// session (scripts/core-session.mjs with CTS_CORE_FAMILY, 24 h pre-history, Base chosen only from the history before the
// window). A trade belongs to the window its entry falls in; the windows are concatenated. A 240 h single run is not used:
// its trades stop after the first days (the causal Base is frozen at the run start). Output: runs/eval/<family>.json with
// the trades (rows), the family's stats, the D1a / D1b halves (cut by entry time) and the per-config cells.
// Resumable: a family whose file exists with the same schema, feed hash and windows is skipped.
//
//   node --experimental-strip-types scripts/eval-families.mjs [--only engine|signal|<label substring>] [--limit N]
//        [--feed runs/eval/feed.json] [--jobs 2]
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync, appendFileSync } from "node:fs";
import { unitR, windowOrders } from "./lib/eval-orders.mjs";
import { admitter, availMb, guardChild, watchHwm } from "./lib/mem-admission.mjs";
import { join } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const FEED = arg("feed", "runs/eval/feed.json");
const ONLY = arg("only", "");
const LIMIT = Number(arg("limit", "0"));
const OUT = "runs/eval";
// 3: rolling causal 48 h windows over D1; trades stored; halves by entry time (PROTOCOL-3)
// 4 (13 Oct): signal families keep the engine's candidates (audit C5: confirmation could not pass before), Micro on by
// default, the dense range grids — results stored under 3 are recomputed
const SCHEMA = 6; // unit-return basis with explicit unknown samples; older weighted results must not be reused
const PRE = 24;
const WIN_H = 48;
const SYMBOLS = 60;
// the D1 window (PROTOCOL-3): 240 h, entries from 2026-09-29 11:00Z (the run's clamp is 240 h) to 2026-10-09 11:00Z
const D1 = { from: Date.parse("2026-09-29T11:00:00Z"), to: Date.parse("2026-10-09T11:00:00Z") };
const D1A = { from: D1.from, to: Date.parse("2026-10-04T11:00:00Z") };
const D1B = { from: Date.parse("2026-10-04T11:00:00Z"), to: D1.to };
const WINDOWS = [];
for (let t = D1.from; t < D1.to; t += WIN_H * 3_600_000) WINDOWS.push({ from: t, to: Math.min(D1.to, t + WIN_H * 3_600_000) });
const TOGGLES = JSON.stringify({ dca: false, dcaActive: false, block: false, blockActive: false, axis: false });
mkdirSync(join(OUT, "dumps"), { recursive: true });
const LOG = join(OUT, "progress.log");
const log = (m) => {
  const line = `${new Date().toISOString()} ${m}`;
  appendFileSync(LOG, line + "\n");
  console.log(line);
};

const feedSha = createHash("sha256").update(readFileSync(FEED)).digest("hex");
const { botStatsFromRows } = await import("../src/core/bot-stats.ts");
const { SIGNAL_SOURCES, signalSettings } = await import("../src/core/signal-config.ts");

// the families: 14 engine (bot × range) and the enabled signal sources × short / medium (the default settings)
const defaults = signalSettings({});
const enabled = SIGNAL_SOURCES.filter((s) =>
  defaults.sourcesMode === "allow" ? defaults.sources[s.name] === true : defaults.sources[s.name] !== false,
).map((s) => s.name);
const families = [];
for (const bot of ["follow", "revert"])
  for (const tag of ["mc", "mp", "mn", "sh", "gn", "lg", "wide"]) families.push({ label: `eng ${bot} ${tag}`, kind: "eng" });
for (const src of enabled)
  for (const range of ["short", "medium"]) families.push({ label: `sig follow ${src} ${range}`, kind: "sig" });

// a family whose range builds no cell in the children's protect grid (the code defaults: no --settings) cannot trade —
// by default Micro (grid.micro unset), Minimal plus (off) and Wide (grid.tp empty). It is not run: five sessions of it
// ended as "no trades on D1", which read as a measured zero
const { DEFAULT_SETTINGS } = await import("../src/core/config.ts");
const { defaultWalkForward } = await import("../src/core/sim/walkforward.ts");
const { evalFamilyHasCells, parseEvalFamily } = await import("../src/core/eval-family.ts");
const protects = defaultWalkForward(DEFAULT_SETTINGS).protects;
const noCells = families.filter((f) => !evalFamilyHasCells(parseEvalFamily(f.label), protects));

const safe = (label) => label.replace(/[^a-z0-9]+/gi, "_");
// --only: "" all, "engine" the engine families, "signal" the signal families, anything else a label substring
const keep = (f) => (ONLY === "" ? true : ONLY === "engine" ? f.kind === "eng" : ONLY === "signal" ? f.kind === "sig" : f.label.includes(ONLY));
const selected = families.filter((f) => keep(f) && !noCells.includes(f)).slice(0, LIMIT > 0 ? LIMIT : undefined);
if (noCells.length) log(`not run (their range builds no cell under the run's settings): ${noCells.map((f) => f.label).join(", ")}`);
log(
  `families ${selected.length} of ${families.length} (enabled signal sources: ${enabled.length}); feed ${feedSha.slice(0, 12)}; ` +
    `D1 ${new Date(D1.from).toISOString()} to ${new Date(D1.to).toISOString()}; ${WINDOWS.length} causal windows of ${WIN_H} h, pre ${PRE} h`,
);

// a child starts when the host can give it the largest high-water mark seen so far (7 GB on feed120, 4 GB on feed.json
// before the first) for itself and every child still running, and keep CTS_EVAL_RESERVE_MB (3 GB) for the live desk
// (scripts/lib/mem-admission.mjs; eval-gate does the same)
const RESERVE_MB = Number(process.env.CTS_EVAL_RESERVE_MB || 3000);
let expectMb = statSync(FEED).size > 250e6 ? 7000 : 4000;
let seenMb = 0;
const { cgroupAvailMb } = await import("../src/core/server/memguard.server.ts");
const gate = admitter({ perChildMb: () => expectMb, reserveMb: RESERVE_MB, avail: () => availMb(undefined, cgroupAvailMb) });

/** one causal session of one window: its dump (the raw trades) */
async function runChild(f, w, dump) {
  const adm = await gate.acquire();
  if (adm.waitedMs > 1000 || adm.alone)
    log(`${f.label}: waited ${Math.round(adm.waitedMs / 1000)} s for memory (${adm.availMb} MB available)${adm.alone ? " — runs alone" : ""}`);
  try {
    const r = await spawnChild(f, w, dump);
    // (a child that failed before its peak is no estimate of the next one's)
    if (r.vmHwmMb != null && r.code === 0 && existsSync(dump)) expectMb = seenMb = Math.max(seenMb, r.vmHwmMb);
    return r;
  } finally {
    gate.release();
  }
}
function spawnChild(f, w, dump) {
  return new Promise((resolve) => {
    // (a 50 % heap growing step, no --expose-gc: see scripts/eval-gate.mjs)
    const args = [
      "--max-old-space-size=3072", "--heap-growing-percent=50", "--experimental-strip-types", "--no-warnings", "scripts/core-session.mjs",
      "--feed", FEED, "--end-at", new Date(w.to).toISOString(), "--run", String(WIN_H), "--pre", String(PRE), "--symbols", String(SYMBOLS),
      "--signals", f.kind === "sig" ? "on" : "off", "--toggles", TOGGLES, "--dump", dump, "--dump-only", "--quiet",
    ];
    const child = spawn(process.execPath, args, {
      // the Compare stage (18 presets) is not part of the family's trades: measurement runs turn it off
      env: { ...process.env, CTS_CORE_FAMILY: f.label, CTS_CORE_VARIANTS: "0", CTS_CORE_COMPARE: "0", CTS_CORE_WORKERS: "2", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    const hwm = watchHwm(child.pid);
    // the desk first: under CTS_EVAL_KILL_BELOW_MB available the child is stopped (the window fails, logged)
    const guard = guardChild(child, { avail: () => availMb(undefined, cgroupAvailMb) });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      const memStop = guard.stop();
      resolve({ code, err: memStop ? `stopped: the host had ${memStop.availMb} MB available (the live desk's memory comes first)` : err.slice(-400), vmHwmMb: hwm.stop(), memStop });
    });
  });
}

const JOBS = Math.max(1, Number(arg("jobs", "2")));
let done = 0;
const pfOf = (rs) => {
  let gp = 0;
  let gl = 0;
  for (const v of rs) {
    if (!Number.isFinite(v)) return NaN;
    if (v > 0) gp += v;
    else gl -= v;
  }
  return gl < 1e-12 ? (gp > 0 ? 4 : 0) : gp / gl;
};

async function processFamily(f) {
  const file = join(OUT, `${safe(f.label)}.json`);
  if (existsSync(file)) {
    const prev = JSON.parse(readFileSync(file, "utf8"));
    if (prev.schema === SCHEMA && prev.feedSha === feedSha && prev.window?.pre === PRE && prev.window?.win === WIN_H) {
      log(`skip ${f.label} (done, same feed and windows)`);
      return;
    }
  }
  const t0 = Date.now();
  const rows = [];
  const perWindow = [];
  for (const [k, w] of WINDOWS.entries()) {
    const dump = join(OUT, "dumps", `${safe(f.label)}_w${k}.json`);
    const r = await runChild(f, w, dump);
    if (!existsSync(dump)) {
      log(`FAIL ${f.label} window ${k + 1}: no dump (exit ${r.code}) ${r.err.replace(/\s+/g, " ").slice(-200)}`);
      return;
    }
    const raw = JSON.parse(readFileSync(dump, "utf8"));
    // a trade belongs to the window its entry falls in (the windows overlap in their pre-history only)
    // and the orders still open at the window's end, marked (scripts/lib/eval-orders.mjs): without them a family's
    // losers short of their stop were dropped while its winners counted
    const { all: mine } = windowOrders(raw, w);
    for (const t of mine) {
      const r = unitR(t);
      rows.push({
        id: `${t.cfg}|${t.sym}|${t.side}|${t.entryT}`,
        cfg: t.cfg,
        sym: t.sym,
        side: t.side,
        entry: t.entry,
        entryT: t.entryT,
        exit: t.exit,
        exit_t: t.exitT,
        r,
        unitR: Number.isFinite(r) ? r : null,
        rWeighted: t.r,
        reason: t.reason,
      });
    }
    // a compute under the memory fallback left Micro (level 1) or Micro and Minimal (level 2) out: marked, not the full
    // engine's window (--dump-only exits before the session's own memory check)
    const memLevel = raw.engine?.mem?.computeLevel ?? 0;
    if (memLevel > 0) log(`${f.label} window ${k + 1}: MEMORY FALLBACK level ${memLevel} (${memLevel >= 2 ? "Micro and Minimal" : "Micro"} left out)`);
    const unknownReturns = mine.filter((t) => !Number.isFinite(unitR(t))).length;
    perWindow.push({ from: new Date(w.from).toISOString(), to: new Date(w.to).toISOString(), trades: mine.length, unknownReturns, pfBasis: unknownReturns ? "unavailable" : "unit-net-returns", memLevel });
    unlinkSync(dump);
  }
  // Unknown unit evidence invalidates the affected family/period, never just the unknown rows within it.
  const statsFor = (xs) => xs.some((x) => !Number.isFinite(x.r)) ? null : botStatsFromRows(xs).families.find((x) => x.family === f.label) ?? null;
  const unknownReturns = rows.filter((x) => !Number.isFinite(x.r)).length;
  const stats = statsFor(rows);
  const half = (h) => {
    const xs = rows.filter((x) => x.entryT >= h.from && x.entryT < h.to);
    const unknownReturns = xs.filter((x) => !Number.isFinite(x.r)).length;
    return { trades: xs.length, unknownReturns, pfBasis: unknownReturns ? "unavailable" : "unit-net-returns", stats: statsFor(xs) };
  };
  const halves = { d1a: half(D1A), d1b: half(D1B) };
  // the per-config cells: each config's own trades, PF, long / short PF and the halves' PF
  const byCfg = new Map();
  for (const x of rows) (byCfg.get(x.cfg) ?? byCfg.set(x.cfg, []).get(x.cfg)).push(x);
  const cells = [...byCfg].map(([cfg, xs]) => {
    const rs = xs.map((x) => x.r);
    const inH = (h) => xs.filter((x) => x.entryT >= h.from && x.entryT < h.to).map((x) => x.r);
    return {
      cfg, n: rs.length, pf: pfOf(rs), net: rs.reduce((a, b) => a + b, 0), unknownReturns: rs.filter((r) => !Number.isFinite(r)).length,
      pfBasis: rs.some((r) => !Number.isFinite(r)) ? "unavailable" : "unit-net-returns",
      long: pfOf(xs.filter((x) => x.side === 1).map((x) => x.r)), short: pfOf(xs.filter((x) => x.side === -1).map((x) => x.r)),
      d1a: { n: inH(D1A).length, pf: pfOf(inH(D1A)), unknownReturns: inH(D1A).filter((r) => !Number.isFinite(r)).length },
      d1b: { n: inH(D1B).length, pf: pfOf(inH(D1B)), unknownReturns: inH(D1B).filter((r) => !Number.isFinite(r)).length },
    };
  }).sort((a, b) => (Number.isFinite(b.pf) ? b.pf : -1) - (Number.isFinite(a.pf) ? a.pf : -1));
  const out = {
    schema: SCHEMA, label: f.label, kind: f.kind, feedSha,
    window: { from: new Date(D1.from).toISOString(), to: new Date(D1.to).toISOString(), win: WIN_H, pre: PRE, symbols: SYMBOLS, windows: perWindow },
    verdict: unknownReturns ? "unscored: unit return unavailable" : stats ? (stats.pf02 >= 1 ? "D1 positive (in-sample)" : "D1 not positive (in-sample)") : "no trades on D1",
    pfBasis: unknownReturns ? "unavailable" : "unit-net-returns", unknownReturns,
    trades: rows.length, stats, halves, cells: cells.slice(0, 400),
    rowsCols: ["cfg", "sym", "side", "entryT", "exitT", "entry", "exit", "r", "reason", "rWeighted", "unitR"],
    rows: rows.map((x) => [x.cfg, x.sym, x.side, x.entryT, x.exit_t, x.entry, x.exit, x.r, x.reason, x.rWeighted, x.unitR]),
    seconds: (Date.now() - t0) / 1000,
  };
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(out, null, 1));
  renameSync(tmp, file);
  done++;
  log(`${f.label}: ${rows.length} trades in ${WINDOWS.length} windows, PF 0.2% ${stats ? stats.pf02.toFixed(2) : "–"}, ${out.verdict} (${out.seconds.toFixed(0)} s)`);
}
// JOBS families run at once (each a separate causal session per window, two worker threads each)
const queue = [...selected];
await Promise.all(Array.from({ length: JOBS }, async () => {
  while (queue.length) await processFamily(queue.shift());
}));
log(`finished: ${done} run this time (${JOBS} at once)`);
