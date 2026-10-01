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

const bx = await import("../src/core/exchange/bingx.server.ts");

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
  const byPos = new Map();
  for (const o of orders) {
    if (o.status !== "FILLED" && num(o.executedQty) <= 0) continue;
    const k = String(o.positionID ?? `${o.symbol}|${o.positionSide}`);
    let p = byPos.get(k);
    if (!p)
      byPos.set(
        k,
        (p = { sym: o.symbol, side: o.positionSide, kind: "", first: Infinity, last: 0, profit: 0, fee: 0, orders: 0, notional: 0 }),
      );
    const letter = String(o.clientOrderId).toUpperCase().slice(T.length, T.length + 1);
    const t = num(o.updateTime || o.time);
    // the opening order names the range
    if (!o.reduceOnly && /[UHNME]/.test(letter) && num(o.time) < p.first) {
      p.first = num(o.time);
      p.kind = letter;
    }
    p.last = Math.max(p.last, t);
    p.profit += num(o.profit);
    p.fee += num(o.commission);
    p.orders++;
    if (!o.reduceOnly) p.notional += num(o.cumQuote) || num(o.avgPrice) * num(o.executedQty);
  }
  const byKind = {};
  const positions = [];
  for (const p of byPos.values()) {
    const kind = KIND[p.kind] ?? "unknown";
    const net = p.profit + p.fee;
    positions.push({ ...p, kind, net });
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
  return { tag: T, conn, from, to, orders: orders.length, byKind, positions };
}

async function flatten(conn, tag) {
  const network = conn === "bingx-x01" ? "mainnet" : "testnet";
  if (network === "mainnet") throw new Error("--flatten is for demo connections only");
  const T = tag.toUpperCase();
  const own = (await history(network, conn, Date.now() - 24 * 3_600_000, Date.now())).filter((o) =>
    String(o.clientOrderId ?? "").toUpperCase().startsWith(T),
  );
  const ownPos = new Set(own.map((o) => String(o.positionID)));
  const book = await bx.fetchBook(network, conn);
  let closed = 0;
  for (const o of book.orders)
    if (String(o.clientOrderId ?? "").toUpperCase().startsWith(T) && o.id)
      await bx.cancelOrder(network, conn, o.venueSymbol, o.id);
  const raw = await bx.signed(network, conn, "GET", "/openApi/swap/v2/user/positions", {});
  for (const p of raw ?? []) {
    if (!ownPos.has(String(p.positionId))) continue;
    const qty = Math.abs(num(p.positionAmt));
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
