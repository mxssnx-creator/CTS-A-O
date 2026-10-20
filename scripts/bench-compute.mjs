#!/usr/bin/env node
// Reproducible benchmark of one full compute on a seeded fixture (no network, no exchange).
//
//   MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_WORKERS=1 \
//   node --experimental-strip-types --no-warnings [--cpu-prof --cpu-prof-dir D] [--heap-prof] [--expose-gc] \
//     scripts/bench-compute.mjs [--fixture cache1m.json] [--symbols 70] [--days 2] [--computes 1] [--out r.json]
//
// The fixture (1m candles, {A-USDT:[{t,o,h,l,c,v}]}) holds 12 real symbols; symbols beyond them are deterministic
// synthetic ones derived from them (seeded PRNG: rotated and rescaled returns, new wicks, scaled volume), so the same
// arguments give the same bars on every run. The fixture is read from --fixture or $CTS_BENCH_FIXTURE.
//
// Prints per compute: each phase's ms (status.phases), the stage-wise peak of RSS / heap / external memory (a 25 ms
// sampler, keyed by the runtime's stage), and a result digest (so a speed change can be told from a result change).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
process.env.CTS_CORE_COMPARE = process.env.CTS_CORE_COMPARE ?? "1";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : argv[i + 1];
};
const fixture =
  arg("fixture", process.env.CTS_BENCH_FIXTURE) ??
  "/tmp/claude-0/-home-user-CTS-A-O/a9de2a82-1211-5914-8bcf-81f9d4d9e162/scratchpad/cache1m.json";
const NSYM = Number(arg("symbols", 70));
const DAYS = Number(arg("days", 2));
const COMPUTES = Number(arg("computes", 1));
const RSS_LIMIT_MB = Number(arg("rss-limit", 2500));

// ── fixture → N deterministic symbols ───────────────────────────────────────
const raw = JSON.parse(readFileSync(fixture, "utf8"));
const names = Object.keys(raw);
const mulberry = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r8 = (x) => +x.toPrecision(8);
function derive(k) {
  if (k < names.length) return { sym: names[k], cs: raw[names[k]] };
  const base = raw[names[k % names.length]];
  const rnd = mulberry(1000 + k);
  const n = base.length;
  const rot = 1 + Math.floor(rnd() * (n - 2));
  const scale = 0.7 + rnd() * 0.8;
  const noise = 0.0004 + rnd() * 0.0008;
  const p0 = 0.05 * Math.exp(rnd() * 8);
  const vscale = 0.3 + rnd() * 3;
  const cs = new Array(n);
  let prev = p0;
  for (let i = 0; i < n; i++) {
    const j = (i + rot) % n;
    const b = base[j];
    const bp = base[j > 0 ? j - 1 : n - 1];
    const ret = Math.log(b.c / bp.c) * scale + (rnd() - 0.5) * 2 * noise;
    const c = prev * Math.exp(ret);
    const up = Math.max(0, b.h / Math.max(b.o, b.c) - 1) * scale;
    const dn = Math.max(0, Math.min(b.o, b.c) / b.l - 1) * scale;
    cs[i] = {
      t: base[i].t,
      o: r8(prev),
      h: r8(Math.max(prev, c) * (1 + up)),
      l: r8(Math.min(prev, c) / (1 + dn)),
      c: r8(c),
      v: r8(b.v * vscale),
    };
    prev = c;
  }
  return { sym: `S${String(k).padStart(2, "0")}-USDT`, cs };
}
const series = new Map();
for (let k = 0; k < NSYM; k++) {
  const { sym, cs } = derive(k);
  series.set(sym, cs);
}
const lastT = Math.max(...[...series.values()].map((c) => c.at(-1).t));
const clip = (cs, bars, endT) => {
  const end = cs.findIndex((x) => x.t > endT);
  const e = end < 0 ? cs.length : end;
  return cs.slice(Math.max(0, e - bars), e).map((x) => ({ ...x }));
};
const feed = {
  tickers: async () => [],
  history: async (sym, tf, bars, opt = {}) => (tf === 1 ? clip(series.get(sym) ?? [], bars, opt.nowT ?? Infinity) : []),
  klines: async (sym, tf, opt = {}) =>
    tf === 1 ? clip(series.get(sym) ?? [], opt.limit ?? 1440, opt.endT ?? Infinity) : [],
};

// the host is shared with a live desk: no start under 6 GB available
{
  const m = /MemAvailable:\s+(\d+)/.exec(readFileSync("/proc/meminfo", "utf8"));
  if (m && Number(m[1]) / 1024 < 6000) {
    console.error(`bench: only ${Math.round(Number(m[1]) / 1024)} MB available (< 6000): not started`);
    process.exit(3);
  }
}
const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { patchSettings } = await import("./lib/patch-grid.mjs");
const { closePool } = await import("../src/core/server/pool.server.ts");

// the x01 Signals desk's settings and wf patch (docs/live-coordination/signals.patch.json; its live section is left out:
// nothing here trades) on top of the code defaults
const patch = JSON.parse(readFileSync(new URL("../docs/live-coordination/signals.patch.json", import.meta.url), "utf8"));
const { live: _live, ...patchBody } = patch.settings ?? {};
const settings = { symbols: NSYM, historyDays: DAYS, forceSymbols: [...series.keys()] };
const rt = new CoreRuntime(new CoreDb(":memory:"), settings, {
  market: "bingx",
  replay: true,
  priceStream: null,
  feed,
});

// ── memory sampler keyed by the runtime's stage ─────────────────────────────
const MB = 1 / 1048576;
const stages = new Map();
let cur = "-";
const sample = () => {
  const m = process.memoryUsage();
  const st = rt.status.stage || "-";
  if (st !== cur) cur = st;
  const s = stages.get(cur) ?? { rss: 0, heap: 0, ext: 0, ab: 0, first: m.rss * MB, t0: performance.now(), t1: 0 };
  s.rss = Math.max(s.rss, m.rss * MB);
  s.heap = Math.max(s.heap, m.heapUsed * MB);
  s.ext = Math.max(s.ext, m.external * MB);
  s.ab = Math.max(s.ab, m.arrayBuffers * MB);
  s.t1 = performance.now();
  stages.set(cur, s);
  if (m.rss * MB > RSS_LIMIT_MB) {
    console.error(`bench: RSS ${Math.round(m.rss * MB)} MB over ${RSS_LIMIT_MB} MB at stage ${cur} — stopped`, JSON.stringify([...stages]));
    process.exit(3);
  }
};
const timer = setInterval(sample, 25);

const until = async (cond, ms = 3_600_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 50));
  }
};
const digest = (x) => createHash("sha256").update(JSON.stringify(x ?? null, (k, v) => (ArrayBuffer.isView(v) ? { n: v.length, h: createHash("sha256").update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)).digest("hex") } : v instanceof Map ? [...v] : typeof v === "number" && !Number.isFinite(v) ? String(v) : v)).slice(0)).digest("hex").slice(0, 16);
// --alloc-prof FILE: V8's sampling heap profiler with the collected objects included (allocation by site, not what lives
// at the end; main thread only, so run with CTS_CORE_WORKERS=0) over the measured computes, written as a .heapprofile
let inspectorSession = null;
const allocOut = arg("alloc-prof");
const startAlloc = async () => {
  if (!allocOut) return;
  const { Session } = await import("node:inspector");
  inspectorSession = new Session();
  inspectorSession.connect();
  const post = (m, p) => new Promise((res, rej) => inspectorSession.post(m, p, (e, r) => (e ? rej(e) : res(r))));
  inspectorSession.p = post;
  await post("HeapProfiler.startSampling", {
    samplingInterval: 4096,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
};
const stopAlloc = async () => {
  if (!inspectorSession) return;
  const { profile } = await inspectorSession.p("HeapProfiler.stopSampling");
  writeFileSync(allocOut, JSON.stringify(profile));
};
const results = [];
const t00 = performance.now();
try {
  rt.updateSettings(patchSettings(patchBody, rt.settings.grid), patch.wf ?? {});
  rt.start();
  await until(
    () => rt.status.computes >= 1 && rt.status.state === "running" && rt.candles.size >= NSYM && rt.prehistPending === false,
  );
  const startupMs = performance.now() - t00;
  rt.stop();
  if (typeof gc === "function") gc();
  stages.clear();
  await startAlloc();
  for (let c = 1; c <= COMPUTES; c++) {
    stages.clear();
    const m0 = process.memoryUsage();
    const t0 = performance.now();
    await rt.compute(rt.gen);
    const wall = performance.now() - t0;
    sample();
    const phases = Object.fromEntries(
      Object.entries(rt.status.phases).map(([k, v]) => [k, Math.round(v.ms)]),
    );
    const mem = Object.fromEntries(
      [...stages].map(([k, v]) => [k, { rssMb: Math.round(v.rss), heapMb: Math.round(v.heap), extMb: Math.round(v.ext), abMb: Math.round(v.ab), ms: Math.round(v.t1 - v.t0) }]),
    );
    const p = rt.pipeline;
    const dig = {
      ranked: digest(p?.ranked),
      armed: digest(p?.armed),
      tapes: digest(rt.tapes.map((t) => [t.id, t.n, t.syms])),
      trades: digest(rt.sim?.trades),
      stats: digest(rt.sim?.stats),
    };
    results.push({ compute: c, wallMs: Math.round(wall), phases, mem, digest: dig, rssStartMb: Math.round(m0.rss * MB), tapes: rt.tapes.length, trades: rt.sim?.trades?.length ?? 0 });
    console.log(JSON.stringify(results.at(-1)));
  }
  await stopAlloc();
  const out = { symbols: NSYM, days: DAYS, workers: process.env.CTS_CORE_WORKERS ?? "default", startupMs: Math.round(startupMs), peakRssMb: Math.round(process.resourceUsage().maxRSS / 1024), results };
  const o = arg("out");
  if (o) writeFileSync(o, JSON.stringify(out, null, 1));
  console.log(`bench symbols=${NSYM} days=${DAYS} workers=${out.workers} startup=${out.startupMs}ms peakRSS=${out.peakRssMb}MB`);
} finally {
  clearInterval(timer);
  rt.stop();
  await closePool();
}
process.exit(0);
