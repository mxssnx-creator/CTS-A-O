#!/usr/bin/env node
// CTS-A-O — the exchange result of one tracking tag, per range, read back from the exchange order history.
// Every own order carries the tag and a kind letter: U micro, H short, N minimal, M minimal plus, E wide / mixed
// (opens and increases), S stop, C close / reduce. Orders are grouped by the exchange position id; the kind of a
// position is the kind of its first own opening order; its result is the sum of the exchange's realized profit
// and commission over all its orders (stop fills included). Primary PF pools settled owned close-slice returns
// using the exact same average-cost and fee-allocation helper as the live UI ledger. Whole-episode return PF and
// reported dollar profit are separate diagnostics; they are not substitutes for the primary close-slice sample.
//
//   node --experimental-strip-types scripts/core-live-report.mjs --tag CTSV2U_ [--conn bingx-vst-02] [--hours 24]
//        [--out runs/live-micro/exchange] [--flatten]   (--flatten closes the tag's open positions at market)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { liveTrades } from "../src/core/statistics.ts";
import { liveGroupOf } from "../src/core/live-validation.ts";
import { profitFactor } from "../src/core/metrics/stats.ts";
import { RT_COST } from "../src/core/model-cost.ts";

const bxm = await import("../src/core/exchange/bingx.server.ts");
// VST answers "network issue, please retry" (109500) and rate limits (100410) under load: retry with backoff
const retry = async (fn) => {
  for (let i = 0; ; i++)
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i >= 6 || !/retry|network|frequency|100410|109500|timed? ?out|abort/i.test(msg)) throw err;
      // a rate-limit ban names its end: wait until then, otherwise back off
      const until = Number(/unblocked after\s+(\d{10,})/i.exec(msg)?.[1] ?? 0);
      const wait = until > Date.now() ? until - Date.now() + 2000 : 2000 * 2 ** i;
      process.stderr.write(`  exchange busy (${msg.slice(0, 60)}…), retrying in ${Math.round(wait / 1000)} s\n`);
      await new Promise((r) => setTimeout(r, Math.min(wait, 10 * 60_000)));
    }
};
const bx = {
  signed: (...a) => retry(() => bxm.signed(...a)),
  fetchBook: (...a) => retry(() => bxm.fetchBook(...a)),
  cancelOrder: (...a) => retry(() => bxm.cancelOrder(...a)),
};

const KIND = { U: "Micro", N: "Minimal", H: "Short", G: "General", L: "Long", M: "Minimal plus", E: "Wide / mixed", Q: "Signals" };
const num = (x) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

/** Client ids survive rounded/missing venue ids and identify cumulative snapshots of the same order. */
export function orderIdentity(o) {
  const coid = String(o.clientOrderId ?? "").trim().toUpperCase();
  if (coid) return `client:${coid}`;
  if (o.orderId === undefined || o.orderId === null || o.orderId === "")
    throw new Error("order history has no stable order identity (completeness unknown)");
  if (typeof o.orderId === "number" && !Number.isSafeInteger(o.orderId))
    throw new Error("order history has an unsafe numeric order id without a client id (completeness unknown)");
  return `venue:${String(o.orderId)}`;
}

const rememberOrder = (out, o) => {
  const key = orderIdentity(o);
  const prev = out.get(key);
  const qty = num(o.executedQty);
  const oldQty = num(prev?.executedQty);
  if (!prev || qty > oldQty || (qty === oldQty && num(o.updateTime || o.time) >= num(prev.updateTime || prev.time)))
    out.set(key, o);
};

/** All orders of the account in [from, to], paged by time (the exchange returns at most 500 per call). */
export async function history(network, conn, from, to) {
  return historyWith(bx.signed, network, conn, from, to);
}

/** `history` over a given signed reader (tests pass a fake exchange). */
export async function historyWith(signed, network, conn, from, to) {
  const out = new Map();
  const STEP = 2 * 3_600_000;
  // A full page (500) is split in halves until each part fits: the exchange does not say which 500 of a busier
  // range it returns, so paging on from the newest time skipped orders (a CTS-A burst of cancels and fills hid a
  // live leg from a close-out on 3 October). Split down to a millisecond: silently accepting a full one-minute page
  // lost fills during bursts and made the resulting PF unreliable. A still-full instant cannot be proven complete.
  const read = async (start, end) => {
    const data = await signed(network, conn, "GET", "/openApi/swap/v2/trade/allOrders", {
      startTime: start,
      endTime: end,
      limit: 500,
    });
    const xs = Array.isArray(data) ? data : data?.orders;
    if (!Array.isArray(xs)) throw new Error("order history reply has no orders array (completeness unknown)");
    if (xs.length >= 500 && end > start) {
      const mid = Math.floor((start + end) / 2);
      await read(start, mid);
      await read(mid + 1, end);
      return;
    }
    if (xs.length >= 500) throw new Error(`order history truncated at ${start}: 500 orders at one timestamp`);
    for (const o of xs) rememberOrder(out, o);
  };
  for (let a = from; a < to; a += STEP) await read(a, Math.min(a + STEP, to));
  return [...out.values()];
}

/** `all`: the account's orders already read (one read serves every tag of a monitoring round). */
export async function ownResults({ conn = "bingx-vst-02", tag, from, to = Date.now(), all = null, modelCost }) {
  const modelSource = modelCost === undefined ? "current-default-estimate" : "explicit-model";
  if (modelCost === undefined) modelCost = RT_COST;
  if (!Number.isFinite(modelCost) || modelCost < 0) throw new Error("modelCost must be finite and nonnegative");
  const network = conn === "bingx-x01" ? "mainnet" : "testnet";
  const T = tag.toUpperCase();
  const own = new Map();
  for (const o of all ?? (await history(network, conn, from, to)))
    if (String(o.clientOrderId ?? "").toUpperCase().startsWith(T)) rememberOrder(own, o);
  const orders = [...own.values()];
  // positions: per symbol × side, one episode from the first own fill in until the own quantity is back to 0
  // (the exchange's position ids are 19-digit integers that lose precision as JSON numbers)
  const fills = orders
    .filter((o) => num(o.executedQty) > 0)
    .sort((a, b) => num(a.updateTime || a.time) - num(b.updateTime || b.time));
  const open = new Map();
  const byPos = [];
  const ledger = [];
  for (const o of fills) {
    const k = `${o.symbol}|${o.positionSide}`;
    const q = num(o.executedQty);
    const into = (o.positionSide === "LONG" && o.side === "BUY") || (o.positionSide === "SHORT" && o.side === "SELL");
    let p = open.get(k);
    if (!p) {
      p = { sym: o.symbol, side: o.positionSide, kind: "", first: num(o.time), last: 0, profit: 0, fee: 0, orders: 0, notional: 0, qty: 0 };
      open.set(k, p);
      byPos.push(p);
    }
    const letter = String(o.clientOrderId).toUpperCase().slice(T.length, T.length + 1);
    if (into && !p.kind && Object.hasOwn(KIND, letter)) p.kind = letter;
    const at = num(o.updateTime || o.time);
    const px = num(o.avgPrice) || num(o.cumQuote) / q;
    const commission = typeof o.commission === "number" ? o.commission
      : typeof o.commission === "string" && o.commission.trim() !== "" ? Number(o.commission) : null;
    const feeKnown = commission !== null && Number.isFinite(commission);
    // Entry fills older than `from` in a supplied history establish inventory and its fees. The primary PF below
    // admits only closes in (from, to], matching buildStatistics; no future fill may change their average cost.
    if (at <= to) ledger.push({
      coid: String(o.clientOrderId).toUpperCase(), sym: o.symbol,
      side: o.positionSide === "SHORT" ? -1 : 1,
      kind: into ? (p.qty > 0 ? "I" : "O") : (q < p.qty ? "R" : "X"),
      qty: q, px, fillPx: px, fee: feeKnown ? commission : null, feeKnown, status: "ok", at,
    });
    p.last = Math.max(p.last, num(o.updateTime || o.time));
    p.profit += num(o.profit);
    p.fee += num(o.commission);
    p.orders++;
    if (into) p.notional += num(o.cumQuote) || num(o.avgPrice) * q;
    p.qty += into ? q : -q;
    if (p.qty <= 1e-9) open.delete(k);
  }
  const byKind = {};
  const positions = [];
  for (const p of byPos) {
    const kind = KIND[p.kind] ?? "unknown";
    const net = p.profit + p.fee;
    const r = p.notional > 0 ? net / p.notional : null;
    positions.push({ ...p, kind, net, r, open: p.qty > 1e-9 });
    const a = (byKind[kind] ??= {
      positions: 0, closedPositions: 0, openPositions: 0, returnCloses: 0, unpricedPositions: 0,
      wins: 0, gp: 0, gl: 0, cashGp: 0, cashGl: 0, net: 0, fee: 0, profit: 0, notional: 0,
      episodeGp: 0, episodeGl: 0, episodeCashGp: 0, episodeCashGl: 0,
    });
    a.positions++;
    // Closed-position PF: an entry fee or a partial realization of a still-open episode is not a closed position.
    // Its realized dollars remain in net (the account-loss guard needs them), while its PF is judged after it exits.
    if (p.qty > 1e-9) a.openPositions++;
    else {
      a.closedPositions++;
      if (net > 0) {
        a.wins++;
        a.episodeCashGp += net;
      } else a.episodeCashGl -= net;
      // An exit without its opening history still carries real dollar P&L, but no defensible return denominator.
      if (r === null) a.unpricedPositions++;
      else {
        if (r > 0) a.episodeGp += r;
        else a.episodeGl -= r;
      }
    }
    a.net += net;
    a.fee += p.fee;
    a.profit += p.profit;
    a.notional += p.notional;
  }
  const closes = liveTrades(ledger, T.length, modelCost)
    .filter((x) => x.exitT > from && x.exitT <= to)
    .map((x) => {
      const group = liveGroupOf(x.cfg);
      return { ...x, kind: group === "Wide" ? "Wide / mixed" : group, pnl: x.r * x.notional };
    });
  for (const x of closes) {
    // Every priced close came from one of the episodes above. Unknown opening letters are grouped as Wide by the
    // shared ledger helper, so their actual return is retained even if the older report could not name the range.
    const a = (byKind[x.kind] ??= {
      positions: 0, closedPositions: 0, openPositions: 0, returnCloses: 0, unpricedPositions: 0,
      wins: 0, gp: 0, gl: 0, cashGp: 0, cashGl: 0, net: 0, fee: 0, profit: 0, notional: 0,
      episodeGp: 0, episodeGl: 0, episodeCashGp: 0, episodeCashGl: 0,
    });
    a.returnCloses++;
    if (x.r > 0) a.gp += x.r;
    else a.gl -= x.r;
    if (x.pnl > 0) a.cashGp += x.pnl;
    else a.cashGl -= x.pnl;
  }
  for (const a of Object.values(byKind)) {
    a.pf = profitFactor(a.gp, a.gl);
    a.noLoss = a.gp > 0 && a.gl <= 0;
    a.pfConvention = a.noLoss ? "no-loss-sentinel" : "gross-return-ratio";
    a.cashPf = a.cashGl > 1e-12 ? a.cashGp / a.cashGl : a.cashGp > 0 ? Infinity : 0;
    a.episodePf = a.episodeGl > 1e-12 ? a.episodeGp / a.episodeGl : a.episodeGp > 0 ? Infinity : 0;
    // realized cost of the round trips as a share of the opened notional (fees only; slippage is in the profit)
    a.feePct = a.notional > 0 ? (-a.fee / a.notional) * 100 : 0;
  }
  const totals = Object.values(byKind).reduce(
    (a, x) => ({ gp: a.gp + x.gp, gl: a.gl + x.gl, cashGp: a.cashGp + x.cashGp, cashGl: a.cashGl + x.cashGl,
      episodeGp: a.episodeGp + x.episodeGp, episodeGl: a.episodeGl + x.episodeGl }),
    { gp: 0, gl: 0, cashGp: 0, cashGl: 0, episodeGp: 0, episodeGl: 0 },
  );
  return {
    tag: T,
    conn,
    from,
    to,
    pf: profitFactor(totals.gp, totals.gl),
    noLoss: totals.gp > 0 && totals.gl <= 0,
    pfConvention: totals.gp > 0 && totals.gl <= 0 ? "no-loss-sentinel" : "gross-return-ratio",
    cashPf: totals.cashGl > 1e-12 ? totals.cashGp / totals.cashGl : totals.cashGp > 0 ? Infinity : 0,
    ...totals,
    pfBasis: "settled-owned-close-net-return",
    cashPfBasis: "settled-owned-close-net-usdt",
    n: closes.length,
    closesNet: closes.reduce((sum, x) => sum + x.pnl, 0),
    closes,
    sampleWindow: { fromExclusive: from, toInclusive: to },
    episodePf: totals.episodeGl > 1e-12 ? totals.episodeGp / totals.episodeGl : totals.episodeGp > 0 ? Infinity : 0,
    episodePfBasis: "whole-episode-exchange-profit-and-commission-return",
    costs: {
      modelRoundTrip: modelCost,
      modelSource,
      estimatedFeeOrders: ledger.filter((x) => !(Number.isFinite(x.fee) && (x.fee !== 0 || x.feeKnown === true || x.feeKnown === 1)) && modelCost > 0).length,
      method: "same average-cost, owned quantity and fee allocation as the live ledger",
    },
    netBasis: "realized-order-profit-and-commission",
    funding: "account-income-only; not attributed to a tracking tag",
    orders: orders.length,
    // every own client id seen on the exchange (the monitor checks them against the desk's ledger)
    orderIds: [...new Set(orders.map((o) => String(o.clientOrderId).toUpperCase()))],
    // client id → first time the exchange saw it (the monitor only checks ids older than a desk's last status)
    orderTimes: Object.fromEntries(orders.map((o) => [String(o.clientOrderId).toUpperCase(), num(o.time)])),
    byKind,
    positions,
  };
}

// `allowMainnet` only from a desk closing its own tag on x01 (the command line refuses mainnet); `from` = the
// desk's start, so every own fill since then is counted (a desk running longer than a day)
/**
 * Per symbol × side: the tag's own net quantity (its fills in minus its fills out) and the other systems' (every
 * other client-id prefix, manual orders included, each counted only while positive). Position ids are 19-digit
 * integers and are not compared.
 */
export function netByTag(orders, tag) {
  const T = tag.toUpperCase();
  const own = new Map();
  const per = new Map();
  for (const o of orders) {
    const q = num(o.executedQty);
    if (!(q > 0)) continue;
    const k = `${o.symbol}|${o.positionSide}`;
    const into = (o.positionSide === "LONG" && o.side === "BUY") || (o.positionSide === "SHORT" && o.side === "SELL");
    const coid = String(o.clientOrderId ?? "").toUpperCase();
    const g = coid.startsWith(T) ? T : (/^([A-Z0-9]{2,12}_)/.exec(coid)?.[1] ?? (coid ? coid.slice(0, 8) : "manual"));
    if (g === T) own.set(k, (own.get(k) ?? 0) + (into ? q : -q));
    else {
      const m = per.get(k) ?? per.set(k, new Map()).get(k);
      m.set(g, (m.get(g) ?? 0) + (into ? q : -q));
    }
  }
  const others = new Map();
  for (const [k, m] of per) others.set(k, [...m.values()].reduce((a, v) => a + Math.max(0, v), 0));
  return { own, others };
}

/**
 * What a tag may close of a merged exchange position: its own net, and never into the other systems' part (an own
 * net overstated by fills without the tag — a manual close, a liquidation — would otherwise close theirs).
 */
export function closableQty(position, own, others) {
  return Math.max(0, Math.min(position, own, position - others));
}

/**
 * The account's income over a window by type (funding, trading fees, realized profit): BingX books funding apart
 * from order profit and without a client order id, so it is reported per account (every system on it), not per tag.
 */
export async function accountIncome(network, conn, from, to = Date.now()) {
  const out = {};
  for (const type of ["FUNDING_FEE", "TRADING_FEE", "REALIZED_PNL"]) {
    const xs = await bx.signed(network, conn, "GET", "/openApi/swap/v2/user/income", {
      incomeType: type,
      startTime: from,
      endTime: to,
      limit: 1000,
    });
    const rows = Array.isArray(xs) ? xs : (xs?.data ?? []);
    out[type] = { n: rows.length, sum: rows.reduce((a, x) => a + num(x.income), 0), capped: rows.length >= 1000 };
  }
  return out;
}

export async function flatten(conn, tag, { from = Date.now() - 24 * 3_600_000, allowMainnet = false } = {}) {
  const network = conn === "bingx-x01" ? "mainnet" : "testnet";
  if (network === "mainnet" && !allowMainnet) throw new Error("--flatten is for demo connections only");
  const T = tag.toUpperCase();
  const { own: net, others } = netByTag(await history(network, conn, from, Date.now()), T);
  // positions first: closing never waits on the open-orders endpoint (the one rate limits pause); the own stops
  // are cancelled after, when open orders can be read (a stop left on a flat side has nothing to close)
  const raw = await bx.signed(network, conn, "GET", "/openApi/swap/v2/user/positions", {});
  let closed = 0;
  const failed = [];
  for (const p of raw ?? []) {
    const k = `${p.symbol}|${p.positionSide}`;
    const qty = closableQty(Math.abs(num(p.positionAmt)), net.get(k) ?? 0, others.get(k) ?? 0);
    if (!(qty > 0)) continue;
    // each position on its own: one the exchange refuses (a thin book's price floor) never stops the others
    try {
      await bx.signed(network, conn, "POST", "/openApi/swap/v2/trade/order", {
        symbol: p.symbol,
        side: p.positionSide === "LONG" ? "SELL" : "BUY",
        positionSide: p.positionSide,
        type: "MARKET",
        quantity: qty,
        clientOrderID: `${T}C${Date.now().toString(36)}`,
      });
      closed++;
    } catch (e) {
      failed.push(`${p.symbol} ${p.positionSide}: ${e instanceof Error ? e.message : e}`);
    }
  }
  try {
    const book = await bx.fetchBook(network, conn);
    for (const o of book.orders)
      if (String(o.clientOrderId ?? "").toUpperCase().startsWith(T) && o.id)
        await bx.cancelOrder(network, conn, o.venueSymbol, o.id);
  } catch (e) {
    process.stderr.write(`flatten ${T}: own stops not cancelled yet (${e instanceof Error ? e.message : e})\n`);
  }
  // the caller retries: positions already closed are flat on the exchange then and are not sent again
  if (failed.length) throw new Error(`closed ${closed}, not closed: ${failed.join("; ")}`);
  return closed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const arg = (k, d) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : d;
  };
  const conn = arg("conn", "bingx-vst-02");
  const tag = arg("tag");
  if (!tag) throw new Error("--tag is required");
  if (argv.includes("--flatten")) console.log(`closed ${await flatten(conn, tag)} positions`);
  const requestedCost = arg("cost", undefined);
  const r = await ownResults({ conn, tag, from: Date.now() - Number(arg("hours", 24)) * 3_600_000,
    ...(requestedCost === undefined ? {} : { modelCost: Number(requestedCost) }) });
  const outPath = arg("out");
  if (outPath) writeFileSync(`${outPath}.json`, JSON.stringify(r, null, 2));
  console.log(`${r.tag} on ${r.conn}: ${r.orders} own orders, ${r.positions.length} positions`);
  for (const [k, a] of Object.entries(r.byKind))
    console.log(
      `  ${k.padEnd(14)} ${String(a.positions).padStart(4)} pos · ${a.returnCloses} settled closes · return PF ${a.pf.toFixed(2)}${a.noLoss ? " (shared no-loss sentinel)" : ""} · net ${a.net.toFixed(2)} USDT · fees ${(-a.fee).toFixed(2)} (${a.feePct.toFixed(3)} % of notional)`,
    );
  // funding is not in the order results: the account's total over the same window (all systems on the account)
  try {
    const network = conn === "bingx-x01" ? "mainnet" : "testnet";
    const inc = await accountIncome(network, conn, Date.now() - Number(arg("hours", 24)) * 3_600_000);
    const f = (k) => `${inc[k].sum.toFixed(2)}${inc[k].capped ? "+" : ""}`;
    console.log(
      `  account (all systems): funding ${f("FUNDING_FEE")} USDT · trading fees ${f("TRADING_FEE")} · realized ${f("REALIZED_PNL")}`,
    );
  } catch (err) {
    console.log(`  account income unavailable (${err instanceof Error ? err.message : err})`);
  }
}
