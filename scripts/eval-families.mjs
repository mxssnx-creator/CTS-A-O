#!/usr/bin/env node
// The causal family evaluation (docs/evaluation-2026-10/PROTOCOL.md): every family alone through the engine over the D1
// window, one process at a time. Per family: the causal session (scripts/core-session.mjs with CTS_CORE_FAMILY), its
// trades turned into bot-stats rows, the family's stats and its per-config cells, written to runs/eval/<family>.json.
// Resumable: a family whose file exists with the same feed hash and window is skipped.
//
//   node --experimental-strip-types scripts/eval-families.mjs [--only engine|signal|<label substring>] [--limit N]
//        [--feed runs/eval/feed.json] [--end-at 2026-10-09T11:00:00Z] [--run 312] [--pre 24] [--symbols 60]
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const FEED = arg("feed", "runs/eval/feed.json");
const END = arg("end-at", "2026-10-09T11:00:00Z");
const RUN = arg("run", "312");
const PRE = arg("pre", "24");
const SYMBOLS = arg("symbols", "60");
const ONLY = arg("only", "");
const LIMIT = Number(arg("limit", "0"));
const OUT = "runs/eval";
// the halves of the D1 window (docs/evaluation-2026-10/PROTOCOL-2.md): D1a chooses, D1b judges. Fixed before any split
// result was read; the whole D1 window had been read before these halves were frozen (the protocol says so).
const D1A = { from: Date.parse("2026-09-26T11:00:00Z"), to: Date.parse("2026-10-02T11:00:00Z") };
const D1B = { from: Date.parse("2026-10-02T11:00:00Z"), to: Date.parse("2026-10-09T11:00:00Z") };
const SCHEMA = 2; // 2: the family files carry their trades (rows) and the D1a / D1b halves
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

const safe = (label) => label.replace(/[^a-z0-9]+/gi, "_");
// --only: "" all, "engine" the engine families, "signal" the signal families, anything else a label substring
const keep = (f) => (ONLY === "" ? true : ONLY === "engine" ? f.kind === "eng" : ONLY === "signal" ? f.kind === "sig" : f.label.includes(ONLY));
const selected = families.filter(keep).slice(0, LIMIT > 0 ? LIMIT : undefined);
log(`families ${selected.length} of ${families.length} (enabled signal sources: ${enabled.length}); feed ${feedSha.slice(0, 12)}; window end ${END}, run ${RUN} h, pre ${PRE} h`);

function runChild(f, dump) {
  return new Promise((resolve) => {
    const args = [
      "--max-old-space-size=3072", "--experimental-strip-types", "--no-warnings", "scripts/core-session.mjs",
      "--feed", FEED, "--end-at", END, "--run", RUN, "--pre", PRE, "--symbols", SYMBOLS,
      "--signals", f.kind === "sig" ? "on" : "off", "--toggles", TOGGLES, "--dump", dump, "--dump-only", "--quiet",
    ];
    const child = spawn(process.execPath, args, {
      // the Compare stage (18 presets) is not part of the family's trades: measurement runs turn it off
      env: { ...process.env, CTS_CORE_FAMILY: f.label, CTS_CORE_VARIANTS: "0", CTS_CORE_COMPARE: "0", CTS_CORE_WORKERS: "2", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => resolve({ code, err: err.slice(-400) }));
  });
}

const JOBS = Math.max(1, Number(arg("jobs", "2")));
let done = 0;
async function processFamily(f) {
  const file = join(OUT, `${safe(f.label)}.json`);
  if (existsSync(file)) {
    const prev = JSON.parse(readFileSync(file, "utf8"));
    if (prev.schema === SCHEMA && prev.feedSha === feedSha && prev.window?.end === END && prev.window?.run === Number(RUN) && prev.window?.pre === Number(PRE)) {
      log(`skip ${f.label} (done, same feed and window)`);
      return;
    }
  }
  const dump = join(OUT, "dumps", `${safe(f.label)}.json`);
  const t0 = Date.now();
  const r = await runChild(f, dump);
  if (!existsSync(dump)) {
    log(`FAIL ${f.label}: no dump (exit ${r.code}) ${r.err.replace(/\s+/g, " ").slice(-200)}`);
    return;
  }
  const raw = JSON.parse(readFileSync(dump, "utf8"));
  const rows = (raw.trades ?? []).map((t) => ({
    id: `${t.cfg}|${t.sym}|${t.side}|${t.entryT}`,
    cfg: t.cfg,
    sym: t.sym,
    side: t.side,
    entry: t.entry,
    exit: t.exit,
    exit_t: t.exitT,
    r: t.r,
    reason: t.reason,
  }));
  const stats = botStatsFromRows(rows).families.find((x) => x.family === f.label) ?? null;
  // the halves of the D1 window (PROTOCOL-2): a trade belongs to the half its entry falls in
  const half = (lo, hi) => {
    const xs = rows.filter((x) => x.entryT >= lo && x.entryT < hi);
    return { trades: xs.length, stats: botStatsFromRows(xs).families.find((y) => y.family === f.label) ?? null };
  };
  const halves = { d1a: half(D1A.from, D1A.to), d1b: half(D1B.from, D1B.to) };
  // the per-config cells: each config's own trades, its PF and its long / short PF (the sim's r is net of the round trip)
  const pfOf = (rs) => {
    let gp = 0;
    let gl = 0;
    for (const v of rs) (v > 0 ? (gp += v) : (gl -= v));
    return gl < 1e-12 ? (gp > 0 ? 4 : 0) : gp / gl;
  };
  const byCfg = new Map();
  for (const x of rows) (byCfg.get(x.cfg) ?? byCfg.set(x.cfg, []).get(x.cfg)).push(x);
  const cells = [...byCfg].map(([cfg, xs]) => {
    const rs = xs.map((x) => x.r);
    const halfOf = (lo, hi) => xs.filter((x) => x.entryT >= lo && x.entryT < hi).map((x) => x.r);
    return {
      cfg, n: rs.length, pf: pfOf(rs), net: rs.reduce((a, b) => a + b, 0),
      long: pfOf(xs.filter((x) => x.side === 1).map((x) => x.r)), short: pfOf(xs.filter((x) => x.side === -1).map((x) => x.r)),
      d1a: { n: halfOf(D1A.from, D1A.to).length, pf: pfOf(halfOf(D1A.from, D1A.to)) },
      d1b: { n: halfOf(D1B.from, D1B.to).length, pf: pfOf(halfOf(D1B.from, D1B.to)) },
    };
  }).sort((a, b) => b.pf - a.pf);
  // the trades, compact (the halves and the cells are recomputed from them without a new run)
  const compact = rows.map((x) => [x.cfg, x.sym, x.side, Number(x.id.split("|").pop()), x.exit_t, x.entry, x.exit, x.r, x.reason]);
  const out = {
    schema: SCHEMA, label: f.label, kind: f.kind, feedSha, window: { end: END, run: Number(RUN), pre: Number(PRE), symbols: Number(SYMBOLS) },
    verdict: stats ? (stats.pf02 >= 1 ? "D1 positive (in-sample)" : "D1 not positive (in-sample)") : "no trades on D1",
    trades: rows.length, stats, halves, cells: cells.slice(0, 400), rowsCols: ["cfg", "sym", "side", "entryT", "exitT", "entry", "exit", "r", "reason"],
    rows: compact, seconds: (Date.now() - t0) / 1000,
  };
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(out, null, 1));
  renameSync(tmp, file);
  unlinkSync(dump);
  done++;
  log(`${f.label}: ${rows.length} trades, PF 0.2% ${stats ? stats.pf02.toFixed(2) : "–"}, ${out.verdict} (${out.seconds.toFixed(0)} s)`);
}
// JOBS families run at once (each a separate causal session, two worker threads each)
const queue = [...selected];
await Promise.all(Array.from({ length: JOBS }, async () => {
  while (queue.length) await processFamily(queue.shift());
}));
log(`finished: ${done} run this time (${JOBS} at once)`);
