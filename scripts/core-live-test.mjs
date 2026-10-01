#!/usr/bin/env node
// CTS-A-O — a live test run on a demo connection (BingX VST, bingx-vst-02 by default) with its own tracking tag.
// Runs the engine with a settings patch (e.g. only the micro range), sends its control orders under the tag, and
// writes a status report every few minutes: the paper book per range, the own orders, and the exchange result
// per range read back from the exchange (scripts/core-live-report.mjs reads the same).
//
//   CTS_CORE_LIVE_TAG=CTSV2U_ node --experimental-strip-types scripts/core-live-test.mjs \
//     --name micro --settings runs/micro.json [--symbols 16] [--notional 10] [--hours 6] [--out runs/live-micro]
//
// Demo only: the connection must be a VST connection; mainnet (bingx-x01) is refused here.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const name = arg("name", "live-test");
const out = arg("out", join("runs", `live-${name}`));
const conn = arg("conn", "bingx-vst-02");
if (conn === "bingx-x01") throw new Error("core-live-test runs on a demo (VST) connection only");
const hours = Number(arg("hours", 6));
const everyMin = Number(arg("every", 5));
const symbols = Number(arg("symbols", 16));
const notional = Number(arg("notional", 10));
const patchArg = arg("settings", "{}");
const patch = JSON.parse(patchArg.trim().startsWith("{") ? patchArg : readFileSync(patchArg, "utf8"));
const wfPatch = JSON.parse(arg("wf", "{}"));
// demo probe: the best N range configs per range trade even when they fail the gates (never on mainnet)
const probe = Number(arg("probe", 0));
mkdirSync(out, { recursive: true });
process.env.CTS_CORE_STATE ||= join(out, "state.json");
process.env.CTS_CORE_SNAPSHOT ||= join(out, "core.sqlite");
process.env.CTS_CORE_LIVE = "1";
if (!process.env.CTS_CORE_LIVE_TAG) throw new Error("set CTS_CORE_LIVE_TAG (its own tracking tag, e.g. CTSV2U_)");

const { coreRuntime, setProbe } = await import("../src/core/server/runtime.server.ts");
const { rangeOfId, RANGE_LABEL } = await import("../src/core/minimal-coord.ts");
const { liveTag } = await import("../src/core/server/live.ts");
const { profitFactor } = await import("../src/core/metrics/stats.ts");
const { ownResults } = await import("./core-live-report.mjs");
const { kindOfInd } = await import("../src/core/sim/walkforward.ts");
const { rowOf, timeline } = await import("../src/core/statistics.ts");
const { isSignalInd } = await import("../src/core/indications/registry.ts");

const rt = coreRuntime();
rt.updateSettings(
  {
    symbols,
    ...patch,
    live: {
      ...rt.settings.live,
      enabled: true,
      connId: conn,
      requireReady: false,
      notionalUsd: notional,
      ...(patch.live ?? {}),
    },
  },
  wfPatch,
);
if (probe > 0) setProbe(rt, probe);
const tag = liveTag(conn);
const t0 = Date.now();
rt.db.event("info", `live test ${name}: tag ${tag}, ${hours} h`);
rt.start();
process.stderr.write(`live test ${name}: tag ${tag} on ${conn}, ${symbols} symbols, ${hours} h\n`);

const H = 3_600_000;
const acc = () => ({ n: 0, w: 0, gp: 0, gl: 0, usd: 0 });
/**
 * Per indication type over the simulated window: Base (every config, no PF filter), evaluated (configs whose window
 * PF is at least 1.1 with 3+ closes), and the executed book (orders, positions, PF, positive hours, drawdown time,
 * equity drawdown %).
 */
function indicationStats() {
  const sim = rt.sim;
  if (!sim) return null;
  const a = sim.startT;
  const b = sim.endT;
  const kindOf = (ind) => (isSignalInd(ind) ? "signal" : kindOfInd(ind));
  const lb = (xs, n, t) => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (xs[m] < t) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  const acc = () => ({ configs: 0, positive: 0, closes: 0, gp: 0, gl: 0 });
  const base = {};
  const evald = {};
  for (const tp of rt.tapes) {
    const i0 = lb(tp.exitT, tp.n, a);
    const i1 = lb(tp.exitT, tp.n, b + 1);
    const n = i1 - i0;
    const gp = tp.gp[i1] - tp.gp[i0];
    const gl = tp.gl[i1] - tp.gl[i0];
    const k = kindOf(tp.ind);
    for (const [bucket, ok] of [
      [base, true],
      [evald, n >= 3 && profitFactor(gp, gl) >= 1.1],
    ]) {
      if (!ok) continue;
      const x = (bucket[k] ??= acc());
      x.configs++;
      if (gp - gl > 0) x.positive++;
      x.closes += n;
      x.gp += gp;
      x.gl += gl;
    }
  }
  const pfOf = (x) => ({ ...x, pf: profitFactor(x.gp, x.gl) });
  const unit = () => rt.settings.paperNotional;
  const closes = new Map();
  for (const [sym, cs] of rt.candles) {
    const m = new Map();
    for (const c of cs) if (c.t >= a - 600_000) m.set(c.t, c.c);
    closes.set(sym, m);
  }
  const price = (sym, t) => {
    const m = closes.get(sym);
    if (!m) return null;
    const t0 = Math.floor(t / 60_000) * 60_000;
    for (let i = 0; i < 5; i++) {
      const v = m.get(t0 - i * 60_000);
      if (v !== undefined) return v;
    }
    return null;
  };
  const executed = {};
  const byKind = new Map();
  for (const x of sim.trades) {
    const k = kindOf(x.cfg.split("|")[1] ?? "");
    let xs = byKind.get(k);
    if (!xs) byKind.set(k, (xs = []));
    xs.push(x);
  }
  for (const [k, xs] of byKind) {
    const row = rowOf(k, xs, unit);
    const tl = timeline(xs, { startT: a, endT: b, balance: rt.settings.paperBalance, unit, price, cost: rt.settings.cost, leverage: 10, points: 300 });
    executed[k] = { orders: row.n, positions: row.positions, pf: row.pf, wr: row.wr, net: row.net, greenHours: row.gh, ddtH: row.ddt, equityDdPct: tl.maxDdPct };
  }
  return {
    window: { startT: a, endT: b },
    base: Object.fromEntries(Object.entries(base).map(([k, x]) => [k, pfOf(x)])),
    evaluated: Object.fromEntries(Object.entries(evald).map(([k, x]) => [k, pfOf(x)])),
    executed,
  };
}
let indCache = null;
let indAt = 0;

async function report(final = false) {
  const trades = rt.db.all(
    "SELECT cfg, sym, side, entry_t, exit_t, r, pnl FROM paper_trades WHERE exit_t IS NOT NULL AND exit_t >= ?",
    t0,
  );
  const paper = {};
  for (const x of trades) {
    const k = RANGE_LABEL[rangeOfId(x.cfg)];
    const a = (paper[k] ??= acc());
    a.n++;
    if (x.r > 0) {
      a.w++;
      a.gp += x.r;
    } else a.gl -= x.r;
    // paper result at the live unit: r × notional
    a.usd += x.r * notional;
  }
  for (const a of Object.values(paper)) a.pf = profitFactor(a.gp, a.gl);
  const orders = rt.db.all(
    "SELECT kind, status, COUNT(*) AS n FROM live_orders WHERE at >= ? GROUP BY kind, status",
    t0,
  );
  const fills = rt.db.all(
    "SELECT COUNT(*) AS n, AVG(ABS(fill_px - ref_px) / ref_px) AS slip, SUM(fee) AS fee FROM live_fills WHERE at >= ?",
    t0,
  )[0];
  let exchange = null;
  try {
    exchange = await ownResults({ conn, tag, from: t0 });
  } catch (err) {
    exchange = { error: err instanceof Error ? err.message : String(err) };
  }
  const st = rt.db.kvGet("liveStatus") ?? rt.db.kvGet("controlStatus");
  // the indication table is heavier (every tape): every 30 min and at the end
  if (final || Date.now() - indAt > 30 * 60_000) {
    try {
      indCache = indicationStats();
      indAt = Date.now();
    } catch (err) {
      process.stderr.write(`indication stats: ${err}\n`);
    }
  }
  const doc = {
    name,
    tag,
    conn,
    at: new Date().toISOString(),
    hours: (Date.now() - t0) / H,
    pid: process.pid,
    mem: { rssMb: Math.round(process.memoryUsage().rss / 1e6), heapMb: Math.round(process.memoryUsage().heapUsed / 1e6) },
    symbols: rt.status.symbols,
    lastComputeAt: rt.status.lastComputeAt,
    probe: rt.wf.probe ?? null,
    final,
    indications: indCache,
    // own tracking ids this desk recorded (the monitor checks every exchange order of the tag against them)
    ledger: rt.db
      .all("SELECT coid, kind, status, sym, side, qty FROM live_orders WHERE at >= ? ORDER BY at", t0)
      .map((x) => ({ coid: String(x.coid).toUpperCase(), kind: x.kind, status: x.status, sym: x.sym, side: x.side, qty: x.qty })),
    engine: {
      state: rt.status.state,
      computes: rt.status.computes,
      lastComputeMs: rt.status.lastComputeMs,
      real: rt.paper.selected.length,
      sim: rt.sim ? { pf: rt.sim.stats.pf, n: rt.sim.stats.n, net: rt.sim.stats.net } : null,
    },
    paper,
    orders,
    fills,
    exchange,
    live: st ? { reason: st.reason, error: st.error, enabled: st.enabled } : null,
    events: rt.db
      .all("SELECT at, level, msg FROM events WHERE at >= ? ORDER BY id DESC LIMIT 25", t0)
      .map((e) => `${new Date(e.at).toISOString().slice(11, 19)} ${e.level} ${e.msg}`),
  };
  writeFileSync(join(out, "status.json"), JSON.stringify(doc, null, 2));
  process.stderr.write(
    `[${doc.at.slice(11, 19)}] ${name} ${doc.hours.toFixed(2)} h · paper ${Object.entries(paper)
      .map(([k, a]) => `${k} ${a.n} PF ${a.pf.toFixed(2)} $${a.usd.toFixed(2)}`)
      .join(" · ") || "none"} · exchange ${
      exchange && !exchange.error
        ? Object.entries(exchange.byKind ?? {})
            .map(([k, a]) => `${k} ${a.positions} pos $${a.net.toFixed(2)}`)
            .join(" · ") || "none"
        : (exchange?.error ?? "–")
    }${final ? " (final)" : ""}\n`,
  );
}

const timer = setInterval(() => report().catch((e) => process.stderr.write(`report: ${e}\n`)), everyMin * 60_000);
const stop = async (why) => {
  clearInterval(timer);
  // leave the account flat: Live off, then one more step closes what the control still holds
  rt.updateSettings({ live: { ...rt.settings.live, enabled: false } });
  await report(true).catch(() => {});
  rt.shutdown(why);
  process.exit(0);
};
setTimeout(() => stop("time"), hours * H).unref?.();
for (const sig of ["SIGTERM", "SIGINT"]) process.once(sig, () => stop(sig));
await new Promise(() => {});
