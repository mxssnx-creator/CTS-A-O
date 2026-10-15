#!/usr/bin/env node
// CTS-A-O — a live test run on a demo connection (BingX VST, bingx-vst-02 by default) with its own tracking tag.
// Runs the engine with a settings patch (e.g. only the micro range), sends its control orders under the tag, and
// writes a status report every few minutes: the paper book per range, the own orders, and the exchange result
// per range read back from the exchange (scripts/core-live-report.mjs reads the same).
//
//   CTS_CORE_LIVE_TAG=CTSV2U_ node --experimental-strip-types scripts/core-live-test.mjs \
//     --name micro --settings runs/micro.json [--symbols 16] [--notional 10] [--hours 6] [--out runs/live-micro]
//
// Demo by default: mainnet (bingx-x01) runs only with `--mainnet yes` and a loss limit (`--max-loss` USDT and / or
// `--max-loss-pct`, a share of the wallet balance at the start of this session; each session counts its own loss from
// its own start; the larger holds): past it
// the desk stops and closes its own positions (never another system's). Probes never run on mainnet.
// `--hours 0` = no end time (stops on the loss limit or SIGTERM / SIGINT, which also close the own positions).
// SIGUSR2 = restart keeping the positions: the control stops, each position keeps its exchange stop, and the next run
// with the same tag and --out picks them up (the ownership ledger and the live record are restored from the folder).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeAtExact } from "./lib/candles.mjs";
import { returnBucket, addReturnEvidence, finishReturnEvidence, returnEvidenceText, mergeReturnEvidence } from "./lib/return-evidence.mjs";

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
// a loss limit relative to the balance: this share (%) of the wallet balance, re-read at every check — it follows the
// account (a deposit or a profit raises it, a drawdown lowers it); with --max-loss as well, the larger one holds
const maxLossPct = Number(arg("max-loss-pct", 0));
if (!(maxLossPct >= 0 && maxLossPct <= 100)) throw new Error("--max-loss-pct is a share of the wallet balance: 0–100");
// past the loss limit: "stop" closes the tag's own positions and ends the desk; "pause" stops opening (positions are
// still managed, protected and closed as their configs exit) and resumes once the own net is back above half the limit
const onMaxLoss = arg("on-max-loss", "stop") === "pause" ? "pause" : "stop";
if (mainnet && arg("mainnet", "") !== "yes") throw new Error("bingx-x01 is mainnet: pass --mainnet yes");
// a mainnet desk states its loss limit explicitly: a positive USDT amount, or 0 = off (the operator's choice; the
// free-margin floor still applies). Left out, it does not start.
if (mainnet && arg("max-loss-pct") === undefined && (arg("max-loss") === undefined || !(maxLoss >= 0)))
  throw new Error("a mainnet desk needs --max-loss (USDT, or 0 = no loss limit) or --max-loss-pct (% of the wallet)");
if (mainnet && maxLoss === 0 && !(maxLossPct > 0))
  process.stderr.write(`${name}: no loss limit (--max-loss 0, operator's choice) — the free-margin floor still applies\n`);
const hasLossLimitArg = () => maxLoss > 0 || maxLossPct > 0;
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
// a desk compares no presets (CTS_CORE_COMPARE=0, as the sessions): the comparison walked every tape once per preset
// on every compute — 72 s of x02's 188 s (7 Oct) — and nothing live reads it; set CTS_CORE_COMPARE=1 to keep it
process.env.CTS_CORE_COMPARE ??= "0";
// the runtime trades the connection it is bound to (a saved live.connId otherwise wins, and updateSettings forces
// it): an x01 desk whose state said bingx-vst-02 ran its control orders on the demo account
process.env.CTS_CORE_PRIMARY_CONN = conn;
if (!process.env.CTS_CORE_LIVE_TAG) throw new Error("set CTS_CORE_LIVE_TAG (its own tracking tag, e.g. CTSV2U_)");

const { coreRuntime, setProbe } = await import("../src/core/server/runtime.server.ts");
const { rangeOfId, RANGE_LABEL } = await import("../src/core/minimal-coord.ts");
const { liveTag, ownLedger } = await import("../src/core/server/live.ts");
const { controlRows } = await import("../src/core/server/live.server.ts");
const { ownershipBreaches, ledgerToHistoryKeys, writeHalt } = await import("./lib/ownership-halt.mjs");
const { lossLimitUsd, lossLimitText, sessionBaseline, sessionWalletOf, lossGuard, isLossGuardPause } = await import(
  "../src/core/loss-limit.ts"
);
const bxm = await import("../src/core/exchange/bingx.server.ts");
const { allocatorWarning, memInfo } = await import("../src/core/server/memguard.server.ts");
const { positiveCoordWarnings } = await import("../src/core/positive.ts");
/** the positive coordinations (docs/positive-coordinations.md) this desk's settings leave off: printed and logged */
const warnPositive = (rt, name) => {
  for (const w of positiveCoordWarnings(rt.settings, rt.wf)) {
    process.stderr.write(`${name}: ${w}\n`);
    rt.db.event("warn", w);
  }
};
{
  const w = allocatorWarning();
  if (w) process.stderr.write(`${w}\n`);
}
const { profitFactor, unitReturn } = await import("../src/core/metrics/stats.ts");
const { ownResults, flatten, history, orderIdentity } = await import("./core-live-report.mjs");
const { kindOfInd } = await import("../src/core/sim/walkforward.ts");
const { rowOf, timeline } = await import("../src/core/statistics.ts");
const { isSignalInd, signalSourceOf } = await import("../src/core/indications/registry.ts");
const { checkMerged, checkSettings } = await import("../src/core/settings-check.ts");
const { botStatsFromRows } = await import("../src/core/bot-stats.ts");
/** the checks the settings API runs: a patch out of range is refused whole, as on the Settings page */
const checkPatch = (p) => {
  checkSettings(p.settings ?? {});
  checkMerged(rt.settings, p.settings ?? {});
};

const rt = coreRuntime();
// the pause the saved state carries (before the start patch can overwrite it)
const savedPause = rt.settings.live.openPaused;
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
    checkPatch(p);
    rt.updateSettings(p.settings ?? {}, p.wf ?? {});
    process.stderr.write(`${name}: patch applied at start — ${p.why ?? patchFile}\n`);
    warnPositive(rt, name);
  } catch (e) {
    process.stderr.write(`${name}: patch not applied at start (${e instanceof Error ? e.message : e})\n`);
  }
}
if (rt.settings.live.connId !== conn)
  throw new Error(`runtime bound to ${rt.settings.live.connId}, not ${conn}: refusing to trade the wrong account`);
if (probe > 0 || probeCell > 0) setProbe(rt, probe, probeCell);
const tag = liveTag(conn);
// the desk's first start (kept in its folder): a restart continues the same run — its paper and exchange results and the
// closes a coordinator gates on count from the first start, not from the restart. The loss limit is NOT the run's: it
// counts from each session's start (sessionBaseline, systemwide)
const startFile = join(out, "desk-start.json");
const startRec = existsSync(startFile) ? JSON.parse(readFileSync(startFile, "utf8")) : {};
const t0 = Number(startRec.t0) || Date.now();
// this process's own start: the simulated run vs paper diff compares the hours this process traded forward
const procT0 = Date.now();
// the loss limit counts from this SESSION's start (this process's launch), systemwide: a restart or a relaunch starts
// a new budget; neither the run's first start nor the last stop at the limit moves it (sessionBaseline)
const lossT0 = sessionBaseline(procT0);
// the balance the limit is a share of: the wallet read at this session's first check (set once per session below)
let sessionWallet = null;
if (!existsSync(startFile)) writeFileSync(startFile, JSON.stringify({ t0, at: new Date(t0).toISOString() }));
// the latest loss check (status.json): realized + open own net, USDT
let lastLoss = null;
rt.db.event("info", `live test ${name}: tag ${tag}, ${hours} h`);
// the ownership check: what this desk holds per (symbol, side) at the session start (the restored own-quantity ledger);
// the loss check below replays the tag's fills since this process started on it, and an own fill that takes out more
// than the desk held there closed or reduced someone else's quantity → the HALT file (scripts/lib/ownership-halt.mjs)
// stops the supervisor's relaunches (docs/live-coordination/x01-supervise.sh) until a person removes it
const ownAtStart = ledgerToHistoryKeys(ownLedger([...controlRows(rt).values()]));
const haltFile = join(out, "HALT");
let haltWritten = false;
rt.start();
process.stderr.write(
  `live test ${name}: tag ${tag} on ${conn}, ${symbols} symbols, ${hours} h` +
    (hasLossLimitArg()
      ? ` · loss limit ${
          maxLoss > 0 && maxLossPct > 0
            ? `the larger of ${maxLoss} USDT and ${maxLossPct} % of the wallet (re-read every check)`
            : maxLoss > 0
              ? `${maxLoss} USDT`
              : `${maxLossPct} % of the wallet (re-read every check)`
        } → ${onMaxLoss}`
      : "") +
    "\n",
);

const H = 3_600_000;
const acc = returnBucket;
/**
 * Per indication type over the simulated window: retained built tapes (no PF filter here), a post-hoc diagnostic
 * (window PF at least 1.1 with 3+ closes), and the simulated executed book (orders, positions, PF, positive hours, drawdown time,
 * equity drawdown %).
 */
async function indicationStats() {
  const sim = rt.sim;
  const tapes = rt.tapes;
  if (!sim) return null;
  // every tape and candle of the window: in one piece it held the loop 2–4 s each half hour (the live control waited
  // behind it) — a few milliseconds at a time instead
  let sliceAt = performance.now();
  let it = 0;
  const breathe = async () => {
    if ((++it & 255) !== 0 || performance.now() - sliceAt < 12) return;
    await new Promise((r) => setImmediate(r));
    sliceAt = performance.now();
  };
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
  for (const tp of tapes) {
    await breathe();
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
  // the candles as they are now (a stored series never changes: an append is a new one): a close is looked up by
  // binary search (a Map of every close in the window was ~12 MB every 30 min) — a bar from the window's start
  // (a − 10 min) on, the latest of equal times, as the Map gave
  const candlesNow = new Map(rt.candles);
  const fromT = a - 600_000;
  const closeAt = (cs, t) => (t < fromT ? undefined : closeAtExact(cs, t));
  const price = (sym, t) => {
    const cs = candlesNow.get(sym);
    if (!cs) return null;
    const t0 = Math.floor(t / 60_000) * 60_000;
    for (let i = 0; i < 5; i++) {
      const v = closeAt(cs, t0 - i * 60_000);
      if (v !== undefined) return v;
    }
    return null;
  };
  // per signal source: every config (Base) and the executed book over the window, so a working source can be told
  // from one that loses or never passes its validation
  const signals = {};
  for (const tp of tapes) {
    await breathe();
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
    await breathe();
    const ind = t.cfg.split("|")[1] ?? "";
    if (!isSignalInd(ind)) continue;
    const x = (signals[signalSourceOf(ind)] ??= { configs: 0, closes: 0, gp: 0, gl: 0, executed: 0, egp: 0, egl: 0 });
    x.executed++;
    const r = unitReturn(t);
    if (!Number.isFinite(r)) { x.unknownExecutedReturns = (x.unknownExecutedReturns ?? 0) + 1; continue; }
    if (r > 0) x.egp += r;
    else x.egl -= r;
  }
  for (const x of Object.values(signals)) {
    x.pf = profitFactor(x.gp, x.gl);
    x.unknownExecutedReturns ??= 0;
    x.executedPf = x.unknownExecutedReturns ? null : profitFactor(x.egp, x.egl);
    x.executedPfBasis = x.unknownExecutedReturns ? "unavailable" : "unit-net-returns";
    x.executedNoLoss = !x.unknownExecutedReturns && x.egp > 0 && x.egl <= 0;
    if (x.unknownExecutedReturns) { x.egp = null; x.egl = null; }
  }
  const executed = {};
  const byKind = new Map();
  for (const x of sim.trades) {
    await breathe();
    const k = kindOf(x.cfg.split("|")[1] ?? "");
    let xs = byKind.get(k);
    if (!xs) byKind.set(k, (xs = []));
    xs.push(x);
  }
  for (const [k, xs] of byKind) {
    it = 255;
    await breathe();
    const row = rowOf(k, xs, unit);
    const tl = timeline(xs, { startT: a, endT: b, balance: rt.settings.paperBalance, unit, price, cost: rt.settings.cost, leverage: 10, points: 300 });
    executed[k] = { orders: row.n, positions: row.positions, pf: row.pf, pfBasis: row.pfBasis, unknownReturns: row.unknownReturns, returnGp: row.returnGp, returnGl: row.returnGl, noLoss: row.noLoss, pfConvention: row.pfConvention, wr: row.wr, net: row.net, netBasis: "recorded-sized-return-sum", greenHours: row.gh, ddtH: row.ddt, equityDdPct: tl.maxDdPct };
  }
  return {
    evidence: {
      actualExecution: false,
      pfBasis: "unit-net-returns",
      basePopulation: "retained built tapes; not full configured Base cells",
      evaluated: { kind: "post-hoc window diagnostic", minCloses: 3, minPf: 1.1, runtimeQualification: false },
      netBasis: "recorded sized return sum; cash/equity retain execution volume",
    },
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
/**
 * The engine part of the desk line: state, while busy the stage % and the whole job's % (backfill → compute → paper
 * step), the last compute and its age, and a paper step not yet run on it (the live control still trades the
 * previous compute's seats). A finished compute never shows its last stage's fraction as if it were running.
 */
function engineLine() {
  const st = rt.status;
  const pct = (x) => `${Math.round(Math.min(1, Math.max(0, x ?? 0)) * 100)}%`;
  const busy = st.state === "computing" || st.state === "backfill";
  const age = st.lastComputeAt ? `${Math.round((Date.now() - st.lastComputeAt) / 60_000)} min ago` : "none yet";
  const paperBehind = st.computes > 0 && (st.paperCompute ?? 0) < st.computes;
  return (
    `engine ${st.state}${busy ? ` ${st.stage} ${pct(st.progress)} (job ${pct(st.overall)})` : ""}` +
    ` · compute #${st.computes} ${age}` +
    `${paperBehind ? ` · paper step pending (seats from #${st.paperCompute ?? 0})` : ""}` +
    `${st.pending && !busy ? " · compute queued" : ""}` +
    // the realtime entry step (CTS_CORE_FAST_ENTRIES): its last bar, how long it took, and what the book took
    `${
      st.fast
        ? ` · realtime ${new Date(st.fast.bar).toISOString().slice(11, 16)} ${st.fast.ms} ms, ${st.fast.seated} seated, ${st.fast.open} open, +${st.fast.added}${st.fast.error ? ` (error: ${st.fast.error})` : ""}`
        : ""
    }`
  );
}
/**
 * Rows as plain objects with these keys (the SELECT's columns, in order), read one at a time: db.all built every row as
 * a dictionary-mode object (~720 B a row against ~100 B; a report reads ~20k paper rows, twice). The same values.
 */
function rowsOf(sql, keys, ...p) {
  const out = [];
  for (const r of rt.db.iterate(sql, ...p)) {
    const o = {};
    for (let i = 0; i < keys.length; i++) o[keys[i]] = r[i];
    out.push(o);
  }
  return out;
}
async function report(final = false) {
  const all = rowsOf(
    "SELECT cfg, sym, side, entry_t, exit_t, r, pnl, first_at, unit_r FROM paper_trades WHERE exit_t IS NOT NULL AND exit_t >= ?",
    ["cfg", "sym", "side", "entry_t", "exit_t", "r", "pnl", "first_at", "unit_r"],
    t0,
  );
  // the forward record only: the simulated window back-fills the closes of configs selected now (hours ago), which
  // never traded forward; rows from before first_at existed are counted apart (legacy)
  // the exchange record per config (one row per config's closed paper position), judged per bot family below
  const botRows = rt.db.all(
    "SELECT id, cfg, sym, side, entry, exit, exit_t, r, reason FROM live_lane_trades",
  );
  const trades = all.filter((x) => x.first_at != null && x.first_at >= x.exit_t && x.first_at - x.exit_t <= FORWARD_MS);
  const backfilled = all.filter((x) => x.first_at != null && x.first_at - x.exit_t > FORWARD_MS).length;
  const legacy = all.filter((x) => x.first_at == null).length;
  const invalidDelay = all.filter((x) => x.first_at != null && x.first_at < x.exit_t).length;
  // signal configs are their own category (their exits carry no range tag: they were counted in Wide)
  const catOf = (cfg) => (isSignalInd(cfg.split("|")[1] ?? "") ? "Signals" : RANGE_LABEL[rangeOfId(cfg)]);
  const paper = {};
  for (const x of trades) {
    const k = catOf(x.cfg);
    const a = (paper[k] ??= acc());
    // Fixed-notional sized paper diagnostic, not the exchange account's realized cash.
    addReturnEvidence(a, x.unit_r, typeof x.r === "number" && Number.isFinite(x.r) ? x.r * notional : NaN);
  }
  for (const [k, a] of Object.entries(paper)) paper[k] = finishReturnEvidence(a);
  // the paper book's own record: every position the book really held, closed on its tape (paper_book_trades) — with
  // the delay between its signal's entry and the moment the book first held it (a compute takes 9–20 min: what the
  // book adopts late, or never, is what the exchange trades late, or never)
  const bookRows = rt.db.all(
    "SELECT cfg, entry_t, exit_t, r, unit_r, reason, held_at FROM paper_book_trades WHERE exit_t >= ?",
    t0,
  );
  const book = {};
  const delays = {};
  for (const x of bookRows) {
    const k = catOf(x.cfg);
    const a = (book[k] ??= { ...acc(), dropped: 0 });
    if (x.reason === "dropped") {
      a.dropped++;
      continue;
    }
    addReturnEvidence(a, x.unit_r, typeof x.r === "number" && Number.isFinite(x.r) ? x.r * notional : NaN);
    if (x.held_at != null) (delays[k] ??= []).push((x.held_at - x.entry_t) / 60_000);
  }
  for (const [k, a] of Object.entries(book)) {
    Object.assign(a, finishReturnEvidence(a));
    const d = (delays[k] ?? []).sort((x, y) => x - y);
    a.entryDelayMin = d.length ? { median: d[d.length >> 1], p90: d[Math.floor(d.length * 0.9)] } : null;
  }
  // the simulated run split in what it counts: the closed orders and the ones still open at its end, marked to market
  // (7 Oct: closed Signals PF 1.55, Short 1.14 — the run's 0.72 came from ~5,200 open orders after the 02:00 crash)
  const simSplit = {};
  const split = (k, part, r) => {
    const a = (simSplit[k] ??= { closed: acc(), open: acc() })[part];
    addReturnEvidence(a, r);
  };
  for (const x of rt.sim?.trades ?? []) split(catOf(x.cfg), "closed", unitReturn(x));
  for (const x of rt.sim?.openAtEnd ?? []) split(catOf(x.cfg), "open", unitReturn(x));
  for (const v of Object.values(simSplit))
    for (const part of ["closed", "open"]) v[part] = finishReturnEvidence(v[part]);
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
    addReturnEvidence(a, x.unit_r, typeof x.r === "number" && Number.isFinite(x.r) ? x.r * notional : NaN);
  }
  for (const id of rt.paper.selected) {
    const k = cellOf(id);
    if (k) (cells[k] ??= { ...acc(), seats: 0 }).seats++;
  }
  for (const [k, a] of Object.entries(cells)) cells[k] = finishReturnEvidence(a);
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
      exchange = await ownResults({ conn, tag, from: t0, modelCost: rt.settings.cost });
    } catch (err) {
      exchange = { error: err instanceof Error ? err.message : String(err) };
    }
  const st = rt.db.kvGet("liveStatus") ?? rt.db.kvGet("controlStatus");
  // the indication table is heavier (every tape): every 30 min and at the end
  if (final || Date.now() - indAt > 30 * 60_000) {
    try {
      indCache = await indicationStats();
      indAt = Date.now();
    } catch (err) {
      process.stderr.write(`indication stats: ${err}\n`);
    }
  }
  const doc = {
    lossCheck: lastLoss,
    // the limit in force at the last check (a balance-relative one moves with the wallet), and how it is set
    maxLoss: lastLoss?.limit ?? (maxLoss || null),
    maxLossSet: { fixed: maxLoss, pctOfWallet: maxLossPct },
    modelCost: rt.settings.cost,
    name,
    tag,
    conn,
    at: new Date().toISOString(),
    hours: (Date.now() - t0) / H,
    pid: process.pid,
    // RSS split: the heap, the array buffers (tapes, candles) and the native rest (allocator, worker threads)
    mem: (({ rssMb, heapMb, arrayBuffersMb, nativeMb, availMb }) => ({ rssMb, heapMb, arrayBuffersMb, nativeMb, availMb }))(memInfo()),
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
      // where the engine is: the stage, its fraction, the whole job's (backfill → compute → paper) and the label;
      // the compute the last paper step stepped on (the seats the live control trades come from it)
      stage: rt.status.stage,
      progress: rt.status.progress,
      overall: rt.status.overall ?? null,
      label: rt.status.label,
      pending: rt.status.pending,
      computeStartedAt: rt.status.computeStartedAt ? new Date(rt.status.computeStartedAt).toISOString() : null,
      paperCompute: rt.status.paperCompute ?? null,
      computes: rt.status.computes,
      lastComputeMs: rt.status.lastComputeMs,
      liveValidation: rt.status.liveValidation ?? null,
      loop: rt.status.loop,
      stalls: rt.status.stalls ?? [],
      // the realtime entry step's last run (CTS_CORE_FAST_ENTRIES)
      fast: rt.status.fast ?? null,
      real: rt.paper.selected.length,
      sim: rt.sim ? { pf: rt.sim.stats.pfBasis === "unit-net-returns" ? rt.sim.stats.pf : null, n: rt.sim.stats.n, net: rt.sim.stats.net, pfBasis: rt.sim.stats.pfBasis ?? "unavailable", unknownReturns: rt.sim.stats.unknownReturns ?? null } : null,
      // per compute phase: total ms, the longest uninterrupted slice and its slowest step (event-loop stalls)
      phases: rt.status.phases,
      // memory guard: available / RSS / level / compute fallback / last abort
      mem: rt.status.mem ?? null,
    },
    paper,
    // the book's own closes (positions it held) with their entry delay — the paper result the exchange can follow
    paperBook: book,
    simVsPaper: null,
    // per bot family, the exchange record: trades, independent events, PF stored / at 0.2 % / at 0.4 %, expectancy,
    // SQN, drawdown, long and short, 8 h block consistency, and the verdict against docs/bot-stability-criteria.md
    botStats: botStatsFromRows(botRows),
    simSplit,
    // closes not in the forward record: back-filled by the simulated window, and from before first_at existed
    paperExcluded: { backfilled, legacy, invalidDelay },
    // every tape position the last paper step did not open, by reason (stale, notSelected, liveValidation, duplicate,
    // heldBack:*, exec:*, cap:*; "pending:" the entries not sent) — the drops between the simulated run and the book
    paperSkips: rt.status.paperSkips ?? null,
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
            // completeness: every paper symbol × side, how many of its lanes reach the exchange, why a key has none
            keys: c.keys ?? [],
            missing: (c.keys ?? [])
              .filter((k) => !k.target)
              .reduce((m, k) => ((m[k.why ?? "?"] = (m[k.why ?? "?"] ?? 0) + 1), m), {}),
            // the exchange orders on the positions: each one's stop and take-profit (none by design: a lane without
            // a target)
            protect: c.protect ?? null,
            // lane orders: lanes on the exchange with their own stop / take-profit, and this step's work on them
            laneOrders: c.laneOrders ?? null,
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
  // live vs system: every exchange order (live record) next to the same order in the paper book, since the start
  {
    const { liveDiff, liveDiffMd } = await import("../src/core/live-diff.ts");
    const d = liveDiff(
      rowsOf(
        "SELECT cfg, sym, side, entry_t, exit_t, unit_r AS r FROM paper_trades WHERE exit_t IS NOT NULL AND exit_t >= ?",
        ["cfg", "sym", "side", "entryT", "exitT", "r"],
        t0,
      ),
      rt.db
        .all("SELECT id, cfg, sym, exit_t, r, reason FROM live_lane_trades WHERE exit_t >= ?", t0)
        .map((x) => ({ id: x.id, cfg: x.cfg, sym: x.sym, exitT: x.exit_t, r: x.r, reason: x.reason })),
      t0,
    );
    doc.liveVsSystem = { total: d.total, byRange: d.byRange, stopMismatch: d.stopMismatch };
    writeFileSync(join(out, "live-vs-system.md"), `${liveDiffMd(d)}\n`);
  }
  // simulated run vs paper book: every order of the desk's own simulated run next to the same position in the paper
  // book's own record (paper_book_trades: what the book really held, not the simulated window's trades copied), since
  // this process started — "sim only" is an order the simulation executed that the book never held (it opened and
  // closed between two computes, came too late for the step, or a live-only rule refused it): the entries the
  // exchange never trades (operator, 7 Oct: "not all evaluated configs getting processed")
  if (rt.sim && Array.isArray(rt.sim.trades))
    try {
      const { liveDiff, liveDiffMd } = await import("../src/core/live-diff.ts");
      const since = Math.max(procT0, rt.sim.startT ?? 0);
      const d = liveDiff(
        rt.sim.trades
          .filter((x) => x.exitT >= since)
          .map((x) => ({ cfg: x.cfg, sym: x.sym, side: x.side, entryT: x.entryT, exitT: x.exitT, r: unitReturn(x) })),
        rt.db
          .all(
            "SELECT cfg, sym, side, entry_t, exit_t, unit_r AS r FROM paper_book_trades WHERE reason != 'dropped' AND exit_t >= ?",
            since,
          )
          .map((x) => ({
            id: `${x.cfg}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entry_t}`,
            cfg: x.cfg,
            sym: x.sym,
            exitT: x.exit_t,
            r: x.r,
            reason: "exit",
          })),
        since,
      );
      doc.simVsPaper = { since, total: d.total, byRange: d.byRange };
      const md = liveDiffMd(d)
        .split("\n")
        .filter((l) => !l.startsWith("Exchange stop-outs"))
        .join("\n")
        .replace("### Live vs system", `### Simulated run vs the paper book's own closes (since ${new Date(since).toISOString().slice(0, 16)}Z)`)
        .replaceAll("system only", "sim only")
        .replaceAll("exchange only", "paper only")
        .replaceAll("system ", "sim ")
        .replaceAll("exchange ", "paper ")
        .replaceAll("(exchange − system", "(paper − sim");
      writeFileSync(join(out, "sim-vs-paper.md"), `${md}\n`);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      doc.simVsPaper = { status: "unavailable", basis: "normalized-return", error };
      process.stderr.write(`${name}: sim vs paper not written (${error})\n`);
    }
  writeFileSync(join(out, "status.json"), JSON.stringify(doc, null, 2));
  {
    const ks = doc.control?.keys ?? [];
    if (ks.length)
      process.stderr.write(
        `  control keys: ${ks.length} paper · ${ks.filter((k) => k.target).length} on the exchange · ` +
          `without a target: ${Object.entries(doc.control.missing ?? {}).map(([w, n]) => `${n} ${w}`).join(", ") || "none"}\n`,
      );
    const pr = doc.control?.protect;
    if (pr)
      process.stderr.write(
        `  control orders: ${pr.positions} positions · ${pr.stops} stops · ${pr.tps} take-profits` +
          (pr.noTarget ? ` · ${pr.noTarget} without one by design (a lane without a target)` : "") +
          (pr.stopsMissing?.length ? ` · stop missing: ${pr.stopsMissing.join(", ")}` : "") +
          (pr.tpsMissing?.length ? ` · take-profit missing: ${pr.tpsMissing.join(", ")}` : "") +
          "\n",
      );
    const lo = doc.control?.laneOrders;
    if (lo)
      process.stderr.write(
        `  lane orders: ${lo.onExchange} lanes on the exchange · ${pr?.laneStops ?? 0} own stops · ${pr?.laneTps ?? 0} own take-profits` +
          ` · last step: ${lo.placed} placed, ${lo.moved} trailed, ${lo.cancelled} cancelled, ${lo.filled} filled on the venue` +
          (lo.pending ? ` · ${lo.pending} lanes still waiting for an order` : "") +
          "\n",
      );
  }
  // what the simulated run's PF is made of: its closed orders, and the ones still open at its end (marked to market)
  const ss = doc.simSplit ?? {};
  if (Object.keys(ss).length) {
    const sum = (part) => mergeReturnEvidence(Object.values(ss).map((v) => v[part]));
    const f = (a) => `${returnEvidenceText(a)} (${a.n})`;
    process.stderr.write(
      `  simulated run: closed PF ${f(sum("closed"))} · open at its end PF ${f(sum("open"))} · per range closed / open: ${Object.entries(
        ss,
      )
        .map(([k, v]) => `${k} ${f(v.closed)} / ${f(v.open)}`)
        .join(" · ")}\n`,
    );
  }
  process.stderr.write(
    `[${doc.at.slice(11, 19)}] ${name} ${doc.hours.toFixed(2)} h · ${engineLine()} · book ${Object.entries(book)
      .filter(([, a]) => a.n > 0)
      .map(
        ([k, a]) =>
          `${k} ${a.n} PF ${returnEvidenceText(a)} $${a.usd === null ? "unavailable" : a.usd.toFixed(2)}${a.entryDelayMin ? ` (entry +${Math.round(a.entryDelayMin.median)} min)` : ""}`,
      )
      .join(" · ") || "none"} · paper sample ${Object.entries(paper)
      .map(([k, a]) => `${k} ${a.n} PF ${returnEvidenceText(a)}`)
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
    })()}${(() => {
      // per range after the Base PF evaluation: the pooled PF of the passed pairs, then passed / evaluated
      const rows = (rt.status.baseByRange ?? []).filter((r) => r.enabled);
      const pfOf = (r) => r.pfPassedPooled ?? r.pfPassedMedian;
      return rows.length
        ? ` · Base ${rows
            .map((r) => `${r.range}${pfOf(r) != null ? ` PF ${Number.isFinite(pfOf(r)) ? pfOf(r).toFixed(2) : "∞"}` : ""} (${r.passed}/${r.evaluated} pairs)`)
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
        checkPatch(p);
        rt.updateSettings({ ...p.settings, ...(p.settings?.grid ? { grid: { ...rt.settings.grid, ...p.settings.grid } } : {}) }, p.wf ?? {});
        // a loss pause outlives a patch (the patch may say openPaused: false)
        if (lossPaused) rt.updateSettings({ live: { ...rt.settings.live, openPaused: lossPaused } });
        rt.db.event("info", `live test ${name}: patch applied (${p.why ?? patchFile})`);
        process.stderr.write(`${name}: patch applied — ${p.why ?? patchFile}\n`);
        warnPositive(rt, name);
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
  if (why !== "restart" && (why === "max loss" || mainnet || why === "SIGTERM" || why === "SIGINT"))
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
  // a stop at the loss limit is recorded for the operator; the next session counts its own loss from its own start
  if (why === "max loss")
    try {
      writeFileSync(startFile, JSON.stringify({ ...startRec, t0, lossStopAt: Date.now() }));
    } catch (e) {
      process.stderr.write(`${name}: loss stop not recorded in ${startFile} (${e})\n`);
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
// a loss pause saved before a restart is this desk's own: picked up, so it resumes once the net recovers (it was
// kept in the settings with nothing left to lift it)
if (typeof savedPause === "string" && savedPause.startsWith("loss limit")) {
  lossPaused = savedPause;
  rt.updateSettings({ live: { ...rt.settings.live, openPaused: lossPaused } });
}
// with no limit (0) a mainnet desk still measures its own net (status / monitoring), and never acts on it
// one check at a time (a rate-limited history read retries for minutes: overlapping checks would pile up calls on the
// same limit); without a limit it is measured every 5 min only
let lossBusy = false;
let lossLastAt = 0;
const hasLossLimit = maxLoss > 0 || maxLossPct > 0;
// fails closed: while the limit cannot be checked (the session wallet unread, no successful check for 5 min) opening is
// paused — positions stay managed — and the next successful check lifts it (bug hunt, 13 Oct: a 0 wallet read disarmed
// the limit for the whole session, and a failing history read only logged)
let lossOkAt = Date.now();
const applyLossGuard = () => {
  const g = lossGuard({ fixed: maxLoss, pct: maxLossPct, wallet: sessionWallet, lastOkAt: lossOkAt, now: Date.now() });
  if (g && (!lossPaused || (isLossGuardPause(lossPaused) && lossPaused !== g))) {
    lossPaused = g;
    rt.updateSettings({ live: { ...rt.settings.live, openPaused: lossPaused } });
    rt.db.event("warn", `live test ${name}: ${g} — opening paused, positions still managed`);
    process.stderr.write(`${name}: ${g} — opening paused, positions still managed\n`);
  } else if (!g && isLossGuardPause(lossPaused)) {
    rt.db.event("info", `live test ${name}: loss limit checked again — opening resumes`);
    lossPaused = null;
    rt.updateSettings({ live: { ...rt.settings.live, openPaused: false } });
  }
};
if (hasLossLimit) applyLossGuard();
if (hasLossLimit || mainnet)
  lossTimer = setInterval(async () => {
    // a check still retrying (a rate-limited history read waits for minutes): the guard still runs every minute
    if (lossBusy) {
      if (hasLossLimit) applyLossGuard();
      return;
    }
    if (!hasLossLimit && Date.now() - lossLastAt < 300_000) return;
    lossBusy = true;
    lossLastAt = Date.now();
    try {
      const network = mainnet ? "mainnet" : "testnet";
      // the session's starting balance, read once (until it is read): the percentage limit is a share of it
      if (maxLossPct > 0 && sessionWallet === null)
        try {
          sessionWallet = sessionWalletOf((await bxm.fetchAccount(network, conn))?.wallet);
          if (sessionWallet !== null)
            rt.db.event(
              "info",
              `live test ${name}: loss limit ${maxLossPct} % of this session's starting wallet ${sessionWallet.toFixed(2)} USDT (counted from ${new Date(lossT0).toISOString()})`,
            );
        } catch (e) {
          process.stderr.write(`${name}: session wallet unreadable for the loss limit (${e instanceof Error ? e.message : e})\n`);
        }
      // nothing sent yet: nothing to lose, no exchange reads (they share the account's rate limit)
      const sent = rt.db.get("SELECT COUNT(*) AS n FROM live_orders WHERE status IN ('ok', 'pending')")?.n ?? 0;
      if (!sent) {
        lastLoss = { at: Date.now(), realized: 0, open: 0, openKnown: true, net: 0, idle: true };
        lossOkAt = Date.now();
        return;
      }
      // the account's order history once, then only what is new (10 min overlap for late updates)
      const from = lossSeen.at ? lossSeen.at - 600_000 : lossT0 - 60_000;
      const now = Date.now();
      // only this desk's own orders are kept (the account carries every other system's orders too)
      for (const o of await history(network, conn, from, now))
        if (String(o.clientOrderId ?? "").toUpperCase().startsWith(tag)) lossSeen.orders.set(orderIdentity(o), o);
      lossSeen.at = now;
      // ownership: an own fill that took out more than this desk held on its (symbol, side) → HALT (once)
      if (!haltWritten) {
        const br = ownershipBreaches([...lossSeen.orders.values()], tag, { since: procT0, startOwn: ownAtStart });
        if (br.length) {
          haltWritten = true;
          const why = `ownership: ${br.length} own fill(s) took out more than this desk held — ${br
            .slice(0, 3)
            .map((b) => `${b.key} ${b.coid} over by ${b.over}`)
            .join("; ")}`;
          try {
            writeHalt(haltFile, why);
          } catch (e) {
            process.stderr.write(`${name}: HALT not written to ${haltFile} (${e instanceof Error ? e.message : e})\n`);
          }
          rt.db.event("warn", `live test ${name}: ${why} — ${haltFile} written, the supervisor will not relaunch`);
          process.stderr.write(`${name}: ${why} — ${haltFile} written, the supervisor will not relaunch\n`);
        }
      }
      const r = await ownResults({ conn, tag, from: lossT0 - 60_000, modelCost: rt.settings.cost, all: [...lossSeen.orders.values()] });
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
      // the limit of this check: fixed, or a share of the SESSION's starting wallet — a balance read later does not move it
      const wallet = sessionWallet;
      const lim = { fixed: maxLoss, pct: maxLossPct, wallet };
      const limit = lossLimitUsd(lim);
      lastLoss = { at: Date.now(), realized, open, openKnown, net: realized + open, paused: lossPaused, limit, wallet };
      const net = realized + open;
      lossOkAt = Date.now();
      if (!(limit > 0)) {
        // no loss limit (or a balance-relative one with the balance unread and no fixed part): measured only
      } else if (net <= -limit && onMaxLoss === "stop") {
        rt.db.event("warn", `live test ${name}: own net ${net.toFixed(2)} USDT ≤ -${lossLimitText(lim)} — stopping`);
        await stop("max loss");
      } else if (net <= -limit && (!lossPaused || isLossGuardPause(lossPaused))) {
        lossPaused = `loss limit: own net ${net.toFixed(2)} USDT ≤ -${lossLimitText(lim)}`;
        rt.updateSettings({ live: { ...rt.settings.live, openPaused: lossPaused } });
        rt.db.event("warn", `live test ${name}: ${lossPaused} — opening paused, positions still managed`);
        process.stderr.write(`${name}: ${lossPaused} — opening paused, positions still managed\n`);
      } else if (lossPaused && net >= -limit / 2) {
        rt.db.event("info", `live test ${name}: own net ${net.toFixed(2)} USDT back above -${(limit / 2).toFixed(2)} — opening resumes`);
        process.stderr.write(`${name}: own net back above -${(limit / 2).toFixed(2)} — opening resumes\n`);
        lossPaused = null;
        rt.updateSettings({ live: { ...rt.settings.live, openPaused: false } });
      }
    } catch (e) {
      process.stderr.write(`${name}: loss check failed (${e instanceof Error ? e.message : e})\n`);
    } finally {
      lossBusy = false;
      if (hasLossLimit) applyLossGuard();
    }
  }, 60_000);
if (hours > 0) setTimeout(() => stop("time"), hours * H).unref?.();
for (const sig of ["SIGTERM", "SIGINT"]) process.once(sig, () => stop(sig));
// restart (a deployment): save the state (database snapshot, live state) and exit — nothing is closed; positions stay
// open under their own stops and a new process with the same folder continues the run (the own-quantity ledger and
// the paper book stay whole, unlike a hard kill). One handler only: a second one (stop("restart")) raced it to the
// exit before the live step in flight had placed its stop.
process.once("SIGUSR2", async () => {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  clearInterval(lossTimer);
  clearInterval(patchTimer);
  // no new step starts; the one in flight finishes its order (an open with its stop) before the state is saved
  rt.stop();
  if (!(await rt.liveSettled(20_000)))
    process.stderr.write(`${name}: restart — a live step was still in flight after 20 s\n`);
  await report(false).catch(() => {});
  const r = rt.shutdown("restart");
  process.stderr.write(`${name}: restart — state saved${r.snapshot ? " (snapshot written)" : ""}, nothing closed\n`);
  process.exit(0);
});
await new Promise(() => {});
