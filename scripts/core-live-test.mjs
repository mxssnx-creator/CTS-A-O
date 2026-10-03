#!/usr/bin/env node
// CTS-A-O — a live test run on a demo connection (BingX VST, bingx-vst-02 by default) with its own tracking tag.
// Runs the engine with a settings patch (e.g. only the micro range), sends its control orders under the tag, and
// writes a status report every few minutes: the paper book per range, the own orders, and the exchange result
// per range read back from the exchange (scripts/core-live-report.mjs reads the same).
//
//   CTS_CORE_LIVE_TAG=CTSV2U_ node --experimental-strip-types scripts/core-live-test.mjs \
//     --name micro --settings runs/micro.json [--symbols 16] [--notional 10] [--hours 6] [--out runs/live-micro]
//
// Demo by default: mainnet (bingx-x01) runs only with `--mainnet yes` and a loss limit (`--max-loss` USDT): past it
// the desk stops and closes its own positions (never another system's). Probes never run on mainnet.
// `--hours 0` = no end time (stops on the loss limit or SIGTERM / SIGINT, which also close the own positions).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const name = arg("name", "live-test");
const out = arg("out", join("runs", `live-${name}`));
const conn = arg("conn", "bingx-vst-02");
const mainnet = conn === "bingx-x01";
const maxLoss = Number(arg("max-loss", 0));
// past the loss limit: "stop" closes the tag's own positions and ends the desk; "pause" stops opening (positions are
// still managed, protected and closed as their configs exit) and resumes once the own net is back above half the limit
const onMaxLoss = arg("on-max-loss", "stop") === "pause" ? "pause" : "stop";
if (mainnet && arg("mainnet", "") !== "yes") throw new Error("bingx-x01 is mainnet: pass --mainnet yes");
// a mainnet desk states its loss limit explicitly: a positive USDT amount, or 0 = off (the operator's choice; the
// free-margin floor still applies). Left out, it does not start.
if (mainnet && (arg("max-loss") === undefined || !(maxLoss >= 0)))
  throw new Error("a mainnet desk needs --max-loss (USDT, or 0 = no loss limit)");
if (mainnet && maxLoss === 0)
  process.stderr.write(`${name}: no loss limit (--max-loss 0, operator's choice) — the free-margin floor still applies\n`);
const hours = Number(arg("hours", 6));
const everyMin = Number(arg("every", 5));
const symbols = Number(arg("symbols", 16));
const notional = Number(arg("notional", 10));
const patchArg = arg("settings", "{}");
const patch = JSON.parse(patchArg.trim().startsWith("{") ? patchArg : readFileSync(patchArg, "utf8"));
const wfPatch = JSON.parse(arg("wf", "{}"));
// demo probe: the best N range configs per range trade even when they fail the gates (never on mainnet)
const probe = Number(arg("probe", 0));
// heatmap probe: the best N tapes of every protect cell (TP × SL × trailing) trade (never on mainnet)
const probeCell = Number(arg("probe-cell", 0));
if (mainnet && (probe > 0 || probeCell > 0)) throw new Error("probes never run on mainnet");
mkdirSync(out, { recursive: true });
process.env.CTS_CORE_STATE ||= join(out, "state.json");
process.env.CTS_CORE_SNAPSHOT ||= join(out, "core.sqlite");
process.env.CTS_CORE_LIVE = "1";
// the runtime trades the connection it is bound to (a saved live.connId otherwise wins, and updateSettings forces
// it): an x01 desk whose state said bingx-vst-02 ran its control orders on the demo account
process.env.CTS_CORE_PRIMARY_CONN = conn;
if (!process.env.CTS_CORE_LIVE_TAG) throw new Error("set CTS_CORE_LIVE_TAG (its own tracking tag, e.g. CTSV2U_)");

const { coreRuntime, setProbe } = await import("../src/core/server/runtime.server.ts");
const { rangeOfId, RANGE_LABEL } = await import("../src/core/minimal-coord.ts");
const { liveTag } = await import("../src/core/server/live.ts");
const bxm = await import("../src/core/exchange/bingx.server.ts");
const { profitFactor } = await import("../src/core/metrics/stats.ts");
const { ownResults, flatten, history } = await import("./core-live-report.mjs");
const { kindOfInd } = await import("../src/core/sim/walkforward.ts");
const { rowOf, timeline } = await import("../src/core/statistics.ts");
const { isSignalInd, signalSourceOf } = await import("../src/core/indications/registry.ts");

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
// the patch file is part of the desk's settings from the start: applied before the first compute (applied 30 s in,
// it landed inside that compute and threw it away), and not again by the watcher until the file changes
const patchFile = arg("patch-file", "");
let patchAt = 0;
if (patchFile && existsSync(patchFile)) {
  try {
    patchAt = statSync(patchFile).mtimeMs;
    const p = JSON.parse(readFileSync(patchFile, "utf8"));
    rt.updateSettings(p.settings ?? {}, p.wf ?? {});
    process.stderr.write(`${name}: patch applied at start — ${p.why ?? patchFile}\n`);
  } catch (e) {
    process.stderr.write(`${name}: patch not applied at start (${e instanceof Error ? e.message : e})\n`);
  }
}
if (rt.settings.live.connId !== conn)
  throw new Error(`runtime bound to ${rt.settings.live.connId}, not ${conn}: refusing to trade the wrong account`);
if (probe > 0 || probeCell > 0) setProbe(rt, probe, probeCell);
const tag = liveTag(conn);
// the desk's first start (kept in its folder): a restart continues the same run — its paper and exchange results,
// the loss limit and the closes a coordinator gates on all count from the first start, not from the restart
const startFile = join(out, "desk-start.json");
const t0 = existsSync(startFile) ? Number(JSON.parse(readFileSync(startFile, "utf8")).t0) || Date.now() : Date.now();
if (!existsSync(startFile)) writeFileSync(startFile, JSON.stringify({ t0, at: new Date(t0).toISOString() }));
// the latest loss check (status.json): realized + open own net, USDT
let lastLoss = null;
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
  // per signal source: every config (Base) and the executed book over the window, so a working source can be told
  // from one that loses or never passes its validation
  const signals = {};
  for (const tp of rt.tapes) {
    if (!isSignalInd(tp.ind)) continue;
    const i0 = lb(tp.exitT, tp.n, a);
    const i1 = lb(tp.exitT, tp.n, b + 1);
    const x = (signals[signalSourceOf(tp.ind)] ??= { configs: 0, closes: 0, gp: 0, gl: 0, executed: 0, egp: 0, egl: 0 });
    x.configs++;
    x.closes += i1 - i0;
    x.gp += tp.gp[i1] - tp.gp[i0];
    x.gl += tp.gl[i1] - tp.gl[i0];
  }
  for (const t of sim.trades) {
    const ind = t.cfg.split("|")[1] ?? "";
    if (!isSignalInd(ind)) continue;
    const x = (signals[signalSourceOf(ind)] ??= { configs: 0, closes: 0, gp: 0, gl: 0, executed: 0, egp: 0, egl: 0 });
    x.executed++;
    if (t.r > 0) x.egp += t.r;
    else x.egl -= t.r;
  }
  for (const x of Object.values(signals)) {
    x.pf = profitFactor(x.gp, x.gl);
    x.executedPf = profitFactor(x.egp, x.egl);
  }
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
    signals,
    // why the simulated execution skipped entries (signal validation, last-N, caps, ...)
    skips: sim.skips ?? null,
  };
}
let indCache = null;
let indAt = 0;

/** A paper trade recorded within this long of its exit traded forward on live prices; later = back-filled. */
const FORWARD_MS = 20 * 60_000;
async function report(final = false) {
  const all = rt.db.all(
    "SELECT cfg, sym, side, entry_t, exit_t, r, pnl, first_at FROM paper_trades WHERE exit_t IS NOT NULL AND exit_t >= ?",
    t0,
  );
  // the forward record only: the simulated window back-fills the closes of configs selected now (hours ago), which
  // never traded forward; rows from before first_at existed are counted apart (legacy)
  const trades = all.filter((x) => x.first_at != null && x.first_at - x.exit_t <= FORWARD_MS);
  const backfilled = all.filter((x) => x.first_at != null && x.first_at - x.exit_t > FORWARD_MS).length;
  const legacy = all.filter((x) => x.first_at == null).length;
  // signal configs are their own category (their exits carry no range tag: they were counted in Wide)
  const catOf = (cfg) => (isSignalInd(cfg.split("|")[1] ?? "") ? "Signals" : RANGE_LABEL[rangeOfId(cfg)]);
  const paper = {};
  for (const x of trades) {
    const k = catOf(x.cfg);
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
  // sim vs live per range: the simulated run's closes (the expectation the configs were selected on) next to the
  // forward paper book (the same configs on live prices); the exchange's own results are the monitor's per round
  const simBy = {};
  for (const x of rt.sim?.trades ?? []) {
    const k = catOf(x.cfg);
    const a = (simBy[k] ??= acc());
    const r = x.r;
    a.n++;
    if (r > 0) {
      a.w++;
      a.gp += r;
    } else a.gl -= r;
  }
  const simVsLive = {};
  for (const k of new Set([...Object.keys(simBy), ...Object.keys(paper)])) {
    const sim = simBy[k] ?? acc();
    const live = paper[k] ?? acc();
    const sPf = profitFactor(sim.gp, sim.gl);
    const lPf = profitFactor(live.gp, live.gl);
    simVsLive[k] = {
      sim: { n: sim.n, pf: sPf, wr: sim.n ? sim.w / sim.n : 0 },
      live: { n: live.n, pf: lPf, wr: live.n ? live.w / live.n : 0 },
      pfDiff: live.n ? lPf - sPf : null,
    };
  }
  // per protect cell (TP % · SL % · trailing %, from the config id): the paper book on live prices, and the seats
  const cellOf = (cfg) => {
    const m = /\|tp([\d.]+)\|sl([\d.]+)\|tr([\d.]+)/.exec(cfg);
    return m ? `${m[1]}|${m[2]}|${m[3]}` : null;
  };
  const cells = {};
  for (const x of trades) {
    const k = cellOf(x.cfg);
    if (!k) continue;
    const a = (cells[k] ??= { ...acc(), seats: 0 });
    a.n++;
    if (x.r > 0) {
      a.w++;
      a.gp += x.r;
    } else a.gl -= x.r;
    a.usd += x.r * notional;
  }
  for (const id of rt.paper.selected) {
    const k = cellOf(id);
    if (k) (cells[k] ??= { ...acc(), seats: 0 }).seats++;
  }
  const orders = rt.db.all(
    "SELECT kind, status, COUNT(*) AS n FROM live_orders WHERE at >= ? GROUP BY kind, status",
    t0,
  );
  const fills = rt.db.all(
    "SELECT COUNT(*) AS n, AVG(ABS(fill_px - ref_px) / ref_px) AS slip, SUM(fee) AS fee FROM live_fills WHERE at >= ?",
    t0,
  )[0];
  // the exchange's order history is read by the monitor once per round for every desk (scripts/core-live-monitor.mjs);
  // the desk reads it itself only at the end
  let exchange = null;
  if (final)
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
    lossCheck: lastLoss,
    maxLoss: maxLoss || null,
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
    // signed exchange calls and rate-limit bans per endpoint, since the start
    exchangeCalls: Object.fromEntries(bxm.signedCalls),
    exchangeBans: Object.fromEntries(bxm.signedBans),
    indications: indCache,
    // own tracking ids this desk recorded (the monitor checks every exchange order of the tag against them)
    ledger: rt.db
      .all("SELECT coid, kind, status, sym, side, qty FROM live_orders WHERE at >= ? ORDER BY at", t0)
      .map((x) => ({ coid: String(x.coid).toUpperCase(), kind: x.kind, status: x.status, sym: x.sym, side: x.side, qty: x.qty })),
    engine: {
      state: rt.status.state,
      computes: rt.status.computes,
      lastComputeMs: rt.status.lastComputeMs,
      liveValidation: rt.status.liveValidation ?? null,
      loop: rt.status.loop,
      stalls: rt.status.stalls ?? [],
      real: rt.paper.selected.length,
      sim: rt.sim ? { pf: rt.sim.stats.pf, n: rt.sim.stats.n, net: rt.sim.stats.net } : null,
      // per compute phase: total ms, the longest uninterrupted slice and its slowest step (event-loop stalls)
      phases: rt.status.phases,
      // memory guard: available / RSS / level / compute fallback / last abort
      mem: rt.status.mem ?? null,
    },
    paper,
    simVsLive,
    // closes not in the forward record: back-filled by the simulated window, and from before first_at existed
    paperExcluded: { backfilled, legacy },
    cells,
    openPositions: rt.paper.positions.length,
    orders,
    fills,
    exchange,
    live: st
      ? {
          reason: st.reason,
          error: st.error,
          enabled: st.enabled,
          at: st.at ? new Date(st.at).toISOString() : null,
          // why targets were not opened (foreign symbols, caps, holds): the first ones, for the monitor
          skipped: (st.skipped ?? []).slice(0, 12),
          skippedN: (st.skipped ?? []).length,
        }
      : null,
    // the control step: when it last ran, how often, what it targets and holds; and the runtime's live gate
    control: (() => {
      const c = rt.db.kvGet("controlStatus");
      return c
        ? {
            at: new Date(c.at).toISOString(),
            steps: c.steps,
            changes: c.changes,
            targets: (c.targets ?? []).map((t) => `${t.key}:${t.qty}`),
            held: (c.held ?? []).map((h) => `${h.key}:${h.qty}`),
            lastActions: (c.actions ?? []).slice(0, 6).map((a) => `${a.kind} ${a.key}${a.ok ? "" : ` ✗ ${a.msg ?? ""}`}`),
          }
        : null;
    })(),
    gate: {
      paperStepped: rt.paperStepped,
      dirty: rt.dirty,
      liveBusy: rt.liveBusy,
      liveBusyS: rt.liveBusy ? Math.round((Date.now() - rt.liveStartedAt) / 1000) : 0,
      livePhase: rt.livePhase,
      liveEpoch: rt.liveEpoch,
      paperPositions: rt.paper.positions.length,
      selected: rt.paper.selected?.length ?? null,
    },
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
    }${(() => {
      // group live validation: each group's pooled last-N PF and whether it opens new entries
      const gs = rt.status.liveValidation?.groups ?? [];
      return gs.length
        ? ` · live groups ${gs
            .map((g) => `${g.group} ${g.pf === null ? `${g.n} n/j` : `${g.pf.toFixed(2)} ${g.ok ? "on" : "off"}`}`)
            .join(" · ")}`
        : "";
    })()}${final ? " (final)" : ""}\n`,
  );
}

// live re-configuration: a settings patch file (--patch-file) applied whenever it changes (checked every 30 s), so a
// coordinator can switch ranges / types on a running desk without a restart
const patchTimer = patchFile
  ? setInterval(() => {
      try {
        const m = statSync(patchFile).mtimeMs;
        if (m === patchAt) return;
        patchAt = m;
        const p = JSON.parse(readFileSync(patchFile, "utf8"));
        rt.updateSettings({ ...p.settings, ...(p.settings?.grid ? { grid: { ...rt.settings.grid, ...p.settings.grid } } : {}) }, p.wf ?? {});
        // a loss pause outlives a patch (the patch may say openPaused: false)
        if (lossPaused) rt.updateSettings({ live: { ...rt.settings.live, openPaused: lossPaused } });
        rt.db.event("info", `live test ${name}: patch applied (${p.why ?? patchFile})`);
        process.stderr.write(`${name}: patch applied — ${p.why ?? patchFile}\n`);
      } catch (e) {
        if (existsSync(patchFile)) process.stderr.write(`${name}: patch not applied (${e instanceof Error ? e.message : e})\n`);
      }
    }, 30_000)
  : null;

const timer = setInterval(() => report().catch((e) => process.stderr.write(`report: ${e}\n`)), everyMin * 60_000);
let stopping = false;
const stop = async (why) => {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  clearInterval(lossTimer);
  clearInterval(patchTimer);
  // Live off stops the control (held positions keep their exchange stops); a loss limit, a mainnet desk or a
  // signal also closes the tag's own positions (only the quantity this tag filled, never another system's)
  rt.updateSettings({ live: { ...rt.settings.live, enabled: false } });
  if (why === "max loss" || mainnet || why === "SIGTERM" || why === "SIGINT")
    for (let i = 0; i < 3; i++) {
      try {
        const n = await flatten(conn, tag, { from: t0 - 60_000, allowMainnet: mainnet });
        rt.db.event("info", `live test ${name}: ${why} — closed ${n} own position(s)`);
        process.stderr.write(`${name}: ${why} — closed ${n} own position(s)\n`);
        break;
      } catch (e) {
        process.stderr.write(`${name}: closing own positions failed (${e}) — retrying\n`);
        await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
      }
    }
  await report(true).catch(() => {});
  rt.shutdown(why);
  process.exit(0);
};
// the loss limit: realized net of the tag's own positions (fees included) plus their share of the open P&L,
// checked every minute from the exchange
let lossTimer = null;
const lossSeen = { at: 0, orders: new Map() };
/** "pause" mode: the reason opening is paused for the loss limit, or null */
let lossPaused = null;
// with no limit (0) a mainnet desk still measures its own net (status / monitoring), and never acts on it
// one check at a time (a rate-limited history read retries for minutes: overlapping checks would pile up calls on the
// same limit); without a limit it is measured every 5 min only
let lossBusy = false;
let lossLastAt = 0;
if (maxLoss > 0 || mainnet)
  lossTimer = setInterval(async () => {
    if (lossBusy || (!(maxLoss > 0) && Date.now() - lossLastAt < 300_000)) return;
    lossBusy = true;
    lossLastAt = Date.now();
    try {
      const network = mainnet ? "mainnet" : "testnet";
      // nothing sent yet: nothing to lose, no exchange reads (they share the account's rate limit)
      const sent = rt.db.get("SELECT COUNT(*) AS n FROM live_orders WHERE status IN ('ok', 'pending')")?.n ?? 0;
      if (!sent) {
        lastLoss = { at: Date.now(), realized: 0, open: 0, openKnown: true, net: 0, idle: true };
        return;
      }
      // the account's order history once, then only what is new (10 min overlap for late updates)
      const from = lossSeen.at ? lossSeen.at - 600_000 : t0 - 60_000;
      const now = Date.now();
      // only this desk's own orders are kept (the account carries every other system's orders too)
      for (const o of await history(network, conn, from, now))
        if (String(o.clientOrderId ?? "").toUpperCase().startsWith(tag)) lossSeen.orders.set(String(o.orderId), o);
      lossSeen.at = now;
      const r = await ownResults({ conn, tag, from: t0 - 60_000, all: [...lossSeen.orders.values()] });
      const realized = r.positions.reduce((a, p) => a + p.net, 0);
      // positions only (the open-orders endpoint is the one rate limits pause); unreadable → the realized loss
      // alone still trips the limit
      let open = 0;
      let openKnown = true;
      try {
        const raw = await bxm.signed(network, conn, "GET", "/openApi/swap/v2/user/positions", {});
        for (const p of r.positions.filter((x) => x.open)) {
          const b = (raw ?? []).find((x) => x.symbol === p.sym && String(x.positionSide).toUpperCase() === p.side);
          const q = Math.abs(Number(b?.positionAmt ?? 0));
          if (q > 0) open += Number(b.unrealizedProfit ?? 0) * Math.min(1, p.qty / q);
        }
      } catch (e) {
        openKnown = false;
        process.stderr.write(`${name}: open P&L unreadable (${e instanceof Error ? e.message : e}) — realized only\n`);
      }
      lastLoss = { at: Date.now(), realized, open, openKnown, net: realized + open, paused: lossPaused };
      const net = realized + open;
      if (!(maxLoss > 0)) {
        // no loss limit: measured only
      } else if (net <= -maxLoss && onMaxLoss === "stop") {
        rt.db.event("warn", `live test ${name}: own net ${net.toFixed(2)} USDT ≤ -${maxLoss} — stopping`);
        await stop("max loss");
      } else if (net <= -maxLoss && !lossPaused) {
        lossPaused = `loss limit: own net ${net.toFixed(2)} USDT ≤ -${maxLoss}`;
        rt.updateSettings({ live: { ...rt.settings.live, openPaused: lossPaused } });
        rt.db.event("warn", `live test ${name}: ${lossPaused} — opening paused, positions still managed`);
        process.stderr.write(`${name}: ${lossPaused} — opening paused, positions still managed\n`);
      } else if (lossPaused && net >= -maxLoss / 2) {
        rt.db.event("info", `live test ${name}: own net ${net.toFixed(2)} USDT back above -${maxLoss / 2} — opening resumes`);
        process.stderr.write(`${name}: own net back above -${maxLoss / 2} — opening resumes\n`);
        lossPaused = null;
        rt.updateSettings({ live: { ...rt.settings.live, openPaused: false } });
      }
    } catch (e) {
      process.stderr.write(`${name}: loss check failed (${e instanceof Error ? e.message : e})\n`);
    } finally {
      lossBusy = false;
    }
  }, 60_000);
if (hours > 0) setTimeout(() => stop("time"), hours * H).unref?.();
for (const sig of ["SIGTERM", "SIGINT"]) process.once(sig, () => stop(sig));
// restart: save the state (database snapshot, live state) and exit — nothing is closed; a new process with the same
// folder continues the run (the own-quantity ledger and the paper book stay whole, unlike a hard kill)
process.once("SIGUSR2", async () => {
  clearInterval(timer);
  clearInterval(lossTimer);
  clearInterval(patchTimer);
  await report(false).catch(() => {});
  const r = rt.shutdown("restart");
  process.stderr.write(`${name}: restart — state saved${r.snapshot ? " (snapshot written)" : ""}, nothing closed\n`);
  process.exit(0);
});
await new Promise(() => {});
