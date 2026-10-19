#!/usr/bin/env node
// Golden digests of the engine's results: a fixed synthetic runtime computed three times (the third at the lightest
// memory-fallback level), each component hashed. A memory change must reproduce these digests byte for byte — it may
// change where and how long memory is held, never what the engine computes (docs/PF-SEARCH.md, memory section).
//
//   CTS_CORE_WORKERS=1 node --expose-gc --experimental-strip-types --no-warnings scripts/core-golden.mjs [--out f.json] [--check]
//
// Prints one line per component and compute ("c1 tapes 3f…"), then "golden <sha>" over all of them. Writes nothing.
// The digests at HEAD for CTS_CORE_WORKERS 0, 1 and 2 are kept in scripts/core-golden.json; --check compares with them.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
process.env.CTS_CORE_COMPARE = "0";
// a fixed market end on the hour: the same bars, lane buckets and hourly windows on every run
process.env.CTS_CORE_SYNTHETIC_END = String(Date.parse("2026-10-13T12:00:00Z"));

const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { closePool } = await import("../src/core/server/pool.server.ts");
const { MEM_FALLBACK_MAX } = await import("../src/core/server/memguard.server.ts");

const argv = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));

const { SIGNAL_SOURCES, signalSettings } = await import("../src/core/signal-config.ts");
const { availMb } = await import("./lib/mem-admission.mjs");
const { cgroupAvailMb } = await import("../src/core/server/memguard.server.ts");

// every lane and range (Micro on by default) and the signals with their historic configs, on the runtime tests' light
// universe (4 symbols, percent exits, the classic sources): it runs beside a live desk. With 6 symbols and the full
// signal defaults one run reached 8.2 GB and pushed the desk into its memory fallback (14 Oct). Lenient gates so Base
// passes pairs and there are tapes, seats and trades to compare on a synthetic feed without an edge.
const settings = {
  symbols: 4,
  historyDays: 18,
  tfDays: { 1: 3, 5: 6, 15: 18, 30: 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({
    exits: "pct",
    sources: Object.fromEntries(SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false])),
  }),
};

// the desk comes first: under CTS_GOLDEN_MIN_AVAIL_MB (3,500) available the run stops at once
const MIN_AVAIL = Number(process.env.CTS_GOLDEN_MIN_AVAIL_MB || 3500);
setInterval(() => {
  const a = availMb(undefined, cgroupAvailMb);
  if (a != null && a < MIN_AVAIL) {
    console.error(`golden: stopped — ${a} MB available is under ${MIN_AVAIL} MB (the live desk needs it)`);
    process.exit(3);
  }
}, 1000).unref();

// keys that carry wall-clock time or durations, not results
// (and counters of how often a step ran: a held position's heldAt, the listings' paperStep)
const DROP = new Set(["at", "timings", "ms", "computeMs", "lastComputeAt", "startedAt", "updatedAt", "durationMs", "heldAt", "paperStep"]);
const TYPED = (v) => ArrayBuffer.isView(v) && !(v instanceof DataView);
const bytesHash = (v) => createHash("sha256").update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)).digest("hex");
const replacer = (k, v) => {
  if (DROP.has(k)) return undefined;
  if (TYPED(v)) return { ta: v.constructor.name, n: v.length, h: bytesHash(v) };
  if (v instanceof Map) return { map: [...v.entries()] };
  if (v instanceof Set) return { set: [...v] };
  if (typeof v === "number" && !Number.isFinite(v)) return String(v);
  return v;
};
// (an array is hashed element by element: a whole tape set or trade list as one JSON string passes V8's string limit)
const digest = (x) => {
  const h = createHash("sha256");
  if (Array.isArray(x)) for (const el of x) h.update(JSON.stringify(el ?? null, replacer)).update("\n");
  else h.update(JSON.stringify(x ?? null, replacer));
  return h.digest("hex");
};

/** a combo run without its trades or per-symbol detail (what it decided, not what it keeps) */
const runSummary = (r) => ({
  id: r.id,
  bot: r.bot,
  ind: r.ind,
  protect: r.protect,
  stage: r.stage,
  full: r.full,
  is: r.is,
  score: r.score,
  ranges: r.ranges,
  rangeTps: r.rangeTps,
});
const tapeOf = (t) => ({
  id: t.id,
  bot: t.bot,
  ind: t.ind,
  protect: t.protect,
  kind: t.kind,
  n: t.n,
  syms: t.syms,
  heldOnly: t.heldOnly,
  fromT: t.fromT,
  cols: [t.exitT, t.entryT, t.r, t.entry, t.exit, t.symI, t.side, t.reason, t.bars, t.vol, t.level, t.gp, t.gl, t.rs, t.r2].map(
    (c) => (c ? bytesHash(c.subarray(0, c.length)) : null),
  ),
  open: t.open,
  pending: t.pending,
});

function components(rt) {
  const p = rt.pipeline;
  const sim = rt.sim;
  const out = {
    s1: (p?.s1 ?? []).map(runSummary),
    s2: (p?.s2 ?? []).map(runSummary),
    ranked: p?.ranked ?? [],
    armed: p?.armed ?? [],
    tapes: rt.tapes.map(tapeOf),
    simTrades: sim?.trades ?? [],
    simOpenAtEnd: sim?.openAtEnd ?? [],
    simStats: sim?.stats ?? null,
    simSteps: sim?.steps ?? [],
    simSkips: [sim?.skips, sim?.skipsByRange, sim?.skipsBySide, sim?.skipPf],
    simBy: [sim?.byConfig, sim?.byKind, sim?.bySide, sim?.hourly, sim?.blocks],
    paperSelected: rt.paper.selected,
    paperPositions: rt.paper.positions,
    paperBook: rt.db.kvGet("paperBook") ?? null,
    listings: rt.status.listings ?? null,
    signals: rt.status.signals?.disabled ?? null,
  };
  return out;
}

const until = async (cond, ms = 1_800_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 50));
  }
};
const drain = (g) => {
  for (let r = g.next(); !r.done; r = g.next());
};

const rt = new CoreRuntime(new CoreDb(":memory:"), settings, { market: "synthetic" });
const R = rt;
const lines = [];
// --raw dir: every component as JSON lines (finding what differs between two runs)
const rawAt = argv.indexOf("--raw");
const rawDir = rawAt >= 0 ? argv[rawAt + 1] : null;
const rec = (c) => {
  const comps = components(rt);
  for (const [k, v] of Object.entries(comps)) {
    lines.push(`c${c} ${k} ${digest(v)}`);
    if (rawDir)
      writeFileSync(
        join(rawDir, `c${c}-${k}.jsonl`),
        (Array.isArray(v) ? v : [v]).map((x) => JSON.stringify(x ?? null, replacer)).join("\n"),
      );
  }
};
const t0 = Date.now();
/** the paper step to its fixed point at the run's end (one step may open what the step before seated) */
const paperSettled = () => {
  let prev = "";
  for (let i = 0; i < 4; i++) {
    drain(R.stepPaperGen());
    const now = JSON.stringify(rt.paper.positions, replacer);
    if (now === prev) return;
    prev = now;
  }
};
try {
  rt.wf.validLastN = 0;
  rt.wf.lastN = 0;
  rt.start();
  // the whole universe backfilled and computed once (the progressive start's first compute may cover part of it,
  // depending on when its batch was stored: not a fixed input)
  await until(
    () =>
      rt.status.computes >= 1 &&
      rt.status.state === "running" &&
      rt.candles.size >= settings.symbols &&
      R.prehistPending === false &&
      (rt.status.paperSteps ?? 0) >= 1,
  );
  rt.stop();
  // from an empty book: what the cycle's own paper steps held depended on how many ran before the stop
  rt.paper.positions = [];
  rt.paper.selected = [];
  rt.paper.trades = [];
  // three computes on the same bars: the first on the cycle's previous set, the second on its own (the swap, the slim
  // and the carried paths), the third at the lightest memory-fallback level (Micro and Minimal carried)
  for (const c of [1, 2, 3]) {
    if (c === 3) rt.memFallback = MEM_FALLBACK_MAX;
    await R.compute(R.gen);
    paperSettled();
    rec(c);
  }
} finally {
  rt.stop();
  await closePool();
}
const all = createHash("sha256").update(lines.join("\n")).digest("hex");
const workers = process.env.CTS_CORE_WORKERS ?? "default";
// (maxRSS: this process's high-water mark, its worker threads included)
const peakMb = Math.round(process.resourceUsage().maxRSS / 1024);
const seconds = Math.round((Date.now() - t0) / 1000);
// --out file.json: the digests as JSON (stdout also carries the runtime's own log lines)
const outAt = argv.indexOf("--out");
if (outAt >= 0) writeFileSync(argv[outAt + 1], JSON.stringify({ workers, golden: all, lines, peakMb, seconds }, null, 1));
{
  for (const l of lines) console.log(l);
  console.log(`golden ${all} (CTS_CORE_WORKERS=${workers}, ${seconds} s, peak RSS ${peakMb} MB)`);
}
if (argv.includes("--check")) {
  const ref = JSON.parse(readFileSync(join(here, "core-golden.json"), "utf8"))[workers];
  if (!ref) {
    console.error(`no reference digest for CTS_CORE_WORKERS=${workers} in scripts/core-golden.json`);
    process.exit(2);
  }
  const want = new Map(ref.lines.map((l) => [l.split(" ").slice(0, 2).join(" "), l]));
  const diff = lines.filter((l) => want.get(l.split(" ").slice(0, 2).join(" ")) !== l);
  if (diff.length || ref.golden !== all) {
    console.error(`golden MISMATCH (${diff.length} components): ${diff.map((l) => l.split(" ").slice(0, 2).join(" ")).join(", ")}`);
    process.exit(1);
  }
  console.log("golden ok");
}
process.exit(0);
