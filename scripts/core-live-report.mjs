#!/usr/bin/env node
// CTS-A-O — the exchange result of one tracking tag, per range, read back from the exchange order history.
// Every own order carries the tag and a kind letter: U micro, H short, N minimal, M minimal plus, E wide / mixed
// (opens and increases), S stop, C close / reduce. Orders are grouped by the exchange position id; the kind of a
// position is the kind of its first own opening order; its result is the sum of the exchange's realized profit
// and commission over all its orders (stop fills included).
//
//   node --experimental-strip-types scripts/core-live-report.mjs --tag CTSV2U_ [--conn bingx-vst-02] [--hours 24]
//        [--out runs/live-micro/exchange] [--flatten]   (--flatten closes the tag's open positions at market)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

const KIND = { U: "Micro", N: "Minimal", H: "Short", G: "General", L: "Long", M: "Minimal plus", E: "Wide / mixed" };
const num = (x) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
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
  // live leg from a close-out on 3 October). One minute is the floor.
  const read = async (start, end) => {
    const data = await signed(network, conn, "GET", "/openApi/swap/v2/trade/allOrders", {
      startTime: start,
      endTime: end,
      limit: 500,
    });
    const xs = data?.orders ?? [];
    if (xs.length >= 500 && end - start > 60_000) {
      const mid = Math.floor((start + end) / 2);
      await read(start, mid);
      await read(mid + 1, end);
      return;
    }
    for (const o of xs) out.set(String(o.orderId), o);
  };
  for (let a = from; a < to; a += STEP) await read(a, Math.min(a + STEP, to));
  return [...out.values()];
}

/**
 * `all`: the account's orders already read (one read serves every tag of a monitoring round) — every order, or at
 * least every order on the symbols the tag trades.
 *
 * Own-first (decision of 14 Oct: the operator's quantity is never own): per symbol × side one episode from the first own
 * fill in until the own quantity is back to 0. A closing fill of an order that is not ours (a close by hand, another
 * system) on a key the tag holds reduces the OWN quantity first: the episode carries its share of that fill's realized
 * profit and commission (× q_own / q — the loss limit is money truth), and own at 0 ends it with closedBy "hand"
 * (flagged: PF views leave such episodes out). Someone else's fill into the position never adds to ours.
 */
export async function ownResults({ conn = "bingx-vst-02", tag, from, to = Date.now(), all = null }) {
  const network = conn === "bingx-x01" ? "mainnet" : "testnet";
  const T = tag.toUpperCase();
  const every = all ?? (await history(network, conn, from, to));
  const isOwn = (o) => String(o.clientOrderId ?? "").toUpperCase().startsWith(T);
  const orders = every.filter(isOwn);
  const keyOf = (o) => `${o.symbol}|${o.positionSide}`;
  const ownKeys = new Set(orders.map(keyOf));
  // (the exchange's position ids are 19-digit integers that lose precision as JSON numbers)
  const fills = every
    .filter((o) => ownKeys.has(keyOf(o)) && (o.status === "FILLED" || num(o.executedQty) > 0))
    .sort((a, b) => num(a.updateTime || a.time) - num(b.updateTime || b.time));
  const open = new Map();
  const byPos = [];
  for (const o of fills) {
    const k = keyOf(o);
    const q = num(o.executedQty);
    const into = (o.positionSide === "LONG" && o.side === "BUY") || (o.positionSide === "SHORT" && o.side === "SELL");
    let p = open.get(k);
    if (!isOwn(o)) {
      if (into || !p || !(q > 0)) continue;
      const cut = Math.min(p.qty, q);
      if (!(cut > 1e-12)) continue;
      const share = cut / q;
      p.profit += num(o.profit) * share;
      p.fee += num(o.commission) * share;
      p.handQty += cut;
      p.last = Math.max(p.last, num(o.updateTime || o.time));
      p.qty -= cut;
      if (p.qty <= 1e-9) {
        p.closedBy = "hand";
        open.delete(k);
      }
      continue;
    }
    if (!p) {
      p = { sym: o.symbol, side: o.positionSide, kind: "", first: num(o.time), last: 0, profit: 0, fee: 0, orders: 0, notional: 0, qty: 0, inQty: 0, handQty: 0, closedBy: "own" };
      open.set(k, p);
      byPos.push(p);
    }
    const letter = String(o.clientOrderId).toUpperCase().slice(T.length, T.length + 1);
    if (into && !p.kind && /[UHNME]/.test(letter)) p.kind = letter;
    p.last = Math.max(p.last, num(o.updateTime || o.time));
    p.profit += num(o.profit);
    p.fee += num(o.commission);
    p.orders++;
    if (into) {
      p.notional += num(o.cumQuote) || num(o.avgPrice) * q;
      p.inQty += q;
    }
    p.qty += into ? q : -q;
    if (p.qty <= 1e-9) open.delete(k);
  }
  const byKind = {};
  const positions = [];
  for (const p of byPos) {
    const kind = KIND[p.kind] ?? "unknown";
    const net = p.profit + p.fee;
    const isOpen = p.qty > 1e-9;
    // the own average entry (own fills in only): the open P&L of the own quantity is marked against it
    const avgEntry = p.inQty > 0 ? p.notional / p.inQty : 0;
    const hand = p.closedBy === "hand";
    positions.push({ ...p, kind, net, open: isOpen, avgEntry, hand });
    const a = (byKind[kind] ??= { positions: 0, wins: 0, gp: 0, gl: 0, net: 0, fee: 0, profit: 0, notional: 0, hand: 0, handNet: 0 });
    a.net += net;
    a.fee += p.fee;
    a.profit += p.profit;
    if (hand) {
      // ended by an order not ours: money, not a result of the tag's own exits
      a.hand++;
      a.handNet += net;
      continue;
    }
    a.positions++;
    if (net > 0) {
      a.wins++;
      a.gp += net;
    } else a.gl -= net;
    a.notional += p.notional;
  }
  for (const a of Object.values(byKind)) {
    a.pf = a.gl > 1e-12 ? a.gp / a.gl : a.gp > 0 ? 99 : 0;
    // realized cost of the round trips as a share of the opened notional (fees only; slippage is in the profit)
    a.feePct = a.notional > 0 ? (-a.fee / a.notional) * 100 : 0;
  }
  return {
    tag: T,
    conn,
    from,
    to,
    orders: orders.length,
    // every own client id seen on the exchange (the monitor checks them against the desk's ledger)
    orderIds: [...new Set(orders.map((o) => String(o.clientOrderId).toUpperCase()))],
    // client id → first time the exchange saw it (the monitor only checks ids older than a desk's last status)
    orderTimes: Object.fromEntries(orders.map((o) => [String(o.clientOrderId).toUpperCase(), num(o.time)])),
    byKind,
    positions,
  };
}

/**
 * The open P&L of the tag's own quantity: Σ own open qty × side × (mark − own average entry), from the exchange's
 * positions (BingX user/positions rows). A position without a mark price falls back to the exchange's unrealized
 * profit × the own share of the position (`approx`: true then).
 */
export function ownOpenPnl(positions, raw) {
  let open = 0;
  let approx = false;
  for (const p of positions.filter((x) => x.open)) {
    const b = (raw ?? []).find((x) => x.symbol === p.sym && String(x.positionSide).toUpperCase() === p.side);
    const q = Math.abs(num(b?.positionAmt));
    if (!(q > 0)) continue;
    const own = Math.min(p.qty, q);
    const mark = num(b?.markPrice);
    if (mark > 0 && p.avgEntry > 0) open += own * (p.side === "LONG" ? 1 : -1) * (mark - p.avgEntry);
    else {
      open += num(b?.unrealizedProfit) * Math.min(1, own / q);
      approx = true;
    }
  }
  return { open, approx };
}

// `allowMainnet` only from a desk closing its own tag on x01 (the command line refuses mainnet); `from` = the
// desk's start, so every own fill since then is counted (a desk running longer than a day)
/**
 * Per symbol × side: the tag's own net quantity (its fills in minus its fills out) and the other systems' (every
 * other client-id prefix, manual orders included), in time order and own-first: a closing fill that is not the tag's
 * reduces the tag's quantity first (the operator's quantity is never own), only the rest the others'. Position ids
 * are 19-digit integers and are not compared.
 */
export function netByTag(orders, tag) {
  const T = tag.toUpperCase();
  const own = new Map();
  const others = new Map();
  const xs = orders
    .map((o, i) => ({ o, i }))
    .sort((a, b) => num(a.o.updateTime || a.o.time) - num(b.o.updateTime || b.o.time) || a.i - b.i);
  for (const { o } of xs) {
    const q = num(o.executedQty);
    if (!(q > 0)) continue;
    const k = `${o.symbol}|${o.positionSide}`;
    const into = (o.positionSide === "LONG" && o.side === "BUY") || (o.positionSide === "SHORT" && o.side === "SELL");
    const mine = String(o.clientOrderId ?? "").toUpperCase().startsWith(T);
    const a = own.get(k) ?? 0;
    const b = others.get(k) ?? 0;
    if (mine) {
      // an own close past the own quantity took the others' part (a closePosition order): theirs shrinks by the rest
      if (into) own.set(k, a + q);
      else {
        own.set(k, Math.max(0, a - q));
        if (others.has(k)) others.set(k, Math.max(0, b - Math.max(0, q - a)));
      }
    } else if (into) others.set(k, b + q);
    else {
      const cut = Math.min(a, q);
      if (own.has(k)) own.set(k, a - cut);
      others.set(k, Math.max(0, b - (q - cut)));
    }
  }
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
  const r = await ownResults({ conn, tag, from: Date.now() - Number(arg("hours", 24)) * 3_600_000 });
  const outPath = arg("out");
  if (outPath) writeFileSync(`${outPath}.json`, JSON.stringify(r, null, 2));
  console.log(`${r.tag} on ${r.conn}: ${r.orders} own orders, ${r.positions.length} positions`);
  for (const [k, a] of Object.entries(r.byKind))
    console.log(
      `  ${k.padEnd(14)} ${String(a.positions).padStart(4)} pos · ${a.wins} won · PF ${a.pf.toFixed(2)} · net ${a.net.toFixed(2)} USDT · fees ${(-a.fee).toFixed(2)} (${a.feePct.toFixed(3)} % of notional)`,
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
