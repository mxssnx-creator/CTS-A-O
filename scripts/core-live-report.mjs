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

const KIND = { U: "Micro", H: "Short", N: "Minimal", M: "Minimal plus", E: "Wide / mixed" };
const num = (x) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

/** All orders of the account in [from, to], paged by time (the exchange returns at most 500 per call). */
async function history(network, conn, from, to) {
  const out = new Map();
  const STEP = 2 * 3_600_000;
  for (let a = from; a < to; a += STEP) {
    let start = a;
    const end = Math.min(a + STEP, to);
    for (let guard = 0; guard < 20; guard++) {
      const data = await bx.signed(network, conn, "GET", "/openApi/swap/v2/trade/allOrders", {
        startTime: start,
        endTime: end,
        limit: 500,
      });
      const xs = data?.orders ?? [];
      for (const o of xs) out.set(String(o.orderId), o);
      if (xs.length < 500) break;
      start = Math.max(...xs.map((o) => num(o.time))) + 1;
    }
  }
  return [...out.values()];
}

export async function ownResults({ conn = "bingx-vst-02", tag, from, to = Date.now() }) {
  const network = conn === "bingx-x01" ? "mainnet" : "testnet";
  const T = tag.toUpperCase();
  const orders = (await history(network, conn, from, to)).filter((o) =>
    String(o.clientOrderId ?? "").toUpperCase().startsWith(T),
  );
  // positions: per symbol × side, one episode from the first own fill in until the own quantity is back to 0
  // (the exchange's position ids are 19-digit integers that lose precision as JSON numbers)
  const fills = orders
    .filter((o) => o.status === "FILLED" || num(o.executedQty) > 0)
    .sort((a, b) => num(a.updateTime || a.time) - num(b.updateTime || b.time));
  const open = new Map();
  const byPos = [];
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
    if (into && !p.kind && /[UHNME]/.test(letter)) p.kind = letter;
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
    positions.push({ ...p, kind, net, open: p.qty > 1e-9 });
    const a = (byKind[kind] ??= { positions: 0, wins: 0, gp: 0, gl: 0, net: 0, fee: 0, profit: 0, notional: 0 });
    a.positions++;
    if (net > 0) {
      a.wins++;
      a.gp += net;
    } else a.gl -= net;
    a.net += net;
    a.fee += p.fee;
    a.profit += p.profit;
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
    byKind,
    positions,
  };
}

async function flatten(conn, tag) {
  const network = conn === "bingx-x01" ? "mainnet" : "testnet";
  if (network === "mainnet") throw new Error("--flatten is for demo connections only");
  const T = tag.toUpperCase();
  const own = (await history(network, conn, Date.now() - 24 * 3_600_000, Date.now())).filter((o) =>
    String(o.clientOrderId ?? "").toUpperCase().startsWith(T),
  );
  // the quantity this tag holds per symbol × side: its own fills in minus its own fills out (position ids are
  // 19-digit integers and are not compared; another system's quantity on the same side is never closed)
  const net = new Map();
  for (const o of own) {
    const q = num(o.executedQty);
    if (!(q > 0)) continue;
    const k = `${o.symbol}|${o.positionSide}`;
    const into = (o.positionSide === "LONG" && o.side === "BUY") || (o.positionSide === "SHORT" && o.side === "SELL");
    net.set(k, (net.get(k) ?? 0) + (into ? q : -q));
  }
  const book = await bx.fetchBook(network, conn);
  for (const o of book.orders)
    if (String(o.clientOrderId ?? "").toUpperCase().startsWith(T) && o.id)
      await bx.cancelOrder(network, conn, o.venueSymbol, o.id);
  const raw = await bx.signed(network, conn, "GET", "/openApi/swap/v2/user/positions", {});
  let closed = 0;
  for (const p of raw ?? []) {
    const mine = net.get(`${p.symbol}|${p.positionSide}`) ?? 0;
    const qty = Math.min(Math.abs(num(p.positionAmt)), mine);
    if (!(qty > 0)) continue;
    await bx.signed(network, conn, "POST", "/openApi/swap/v2/trade/order", {
      symbol: p.symbol,
      side: p.positionSide === "LONG" ? "SELL" : "BUY",
      positionSide: p.positionSide,
      type: "MARKET",
      quantity: qty,
      clientOrderID: `${T}C${Date.now().toString(36)}`,
    });
    closed++;
  }
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
}
