#!/usr/bin/env node
// CTS-A-O heavy stress test: the real engine on real BingX market data (70 symbols, every indication, every
// timeframe lane, every strategy on) with Live in Overall mode against a simulated exchange that enforces BingX's
// real contract rules (lot step, min quantity, min USDT) and holds a foreign position and order. Every 30 s the
// invariants are checked and the health (memory, cycle / compute / tick timing, errors) is sampled.
//
//   node --experimental-strip-types scripts/core-stress.mjs [--symbols 70] [--minutes 30] [--out docs/stress]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
process.env.CTS_CORE_LIVE = "1";
const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { stepLive } = await import("../src/core/server/live.server.ts");
const { isOwnCoid } = await import("../src/core/server/live.ts");
const bx = await import("../src/core/exchange/bingx.server.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const symbols = Number(arg("symbols", 70));
const minutes = Number(arg("minutes", 30));
const CONN = "bingx-vst-02";

const specs = await bx.fetchContracts("mainnet");
if (!specs.size) throw new Error("no contract specs (exchange unreachable)");

class SimExchange {
  positions = new Map(); // `${sym}|LONG|SHORT` → { qty, entry }
  orders = [];
  sent = 0;
  rejects = [];
  seq = 0;
  constructor(px) {
    this.px = px;
  }
  hasKeys() {
    return true;
  }
  fingerprint() {
    return `${CONN}|testnet|sim|stress`;
  }
  async book() {
    return {
      positions: [...this.positions.entries()].map(([k, p]) => {
        const [venueSymbol, ps] = k.split("|");
        return {
          symbol: venueSymbol,
          venueSymbol,
          side: ps === "LONG" ? "long" : "short",
          qty: p.qty,
        };
      }),
      orders: this.orders.map((o) => ({ ...o })),
    };
  }
  async contracts() {
    return specs;
  }
  reject(msg) {
    this.rejects.push(msg);
    throw new Error(msg);
  }
  async order(p) {
    this.sent++;
    const sym = String(p.symbol);
    const spec = specs.get(sym);
    if (!spec) this.reject(`${sym}: unknown symbol`);
    const px = this.px(sym);
    if (!(px > 0)) this.reject(`${sym}: no price`);
    const ps = String(p.positionSide ?? "LONG");
    const key = `${sym}|${ps}`;
    if (p.type === "MARKET") {
      const q = Number(p.quantity);
      const steps = q / spec.step;
      if (Math.abs(steps - Math.round(steps)) > 1e-6)
        this.reject(`${sym}: quantity ${q} not a multiple of the step ${spec.step}`);
      const into = (ps === "LONG" && p.side === "BUY") || (ps === "SHORT" && p.side === "SELL");
      const cur = this.positions.get(key) ?? { qty: 0, entry: px };
      if (into) {
        if (q < spec.minQty - 1e-12)
          this.reject(`${sym}: quantity ${q} below the minimum ${spec.minQty}`);
        if (q * px < spec.minUsdt - 1e-9)
          this.reject(`${sym}: order value ${(q * px).toFixed(2)} below ${spec.minUsdt} USDT`);
        const nq = cur.qty + q;
        this.positions.set(key, { qty: nq, entry: (cur.entry * cur.qty + px * q) / nq });
      } else {
        const nq = Math.max(0, cur.qty - q);
        if (nq <= 1e-12) this.positions.delete(key);
        else this.positions.set(key, { ...cur, qty: nq });
      }
      return { order: { avgPrice: px, commission: q * px * 0.0005 } };
    }
    // protective orders rest until triggered or cancelled
    const stop = Number(p.stopPrice);
    if (!(stop > 0)) this.reject(`${sym}: stop price missing`);
    const id = `S${++this.seq}`;
    this.orders.push({
      id,
      venueSymbol: sym,
      symbol: sym,
      clientOrderId: String(p.clientOrderID ?? ""),
      positionSide: ps,
      type: String(p.type),
      stopPrice: stop,
    });
    return { orderId: id };
  }
  async cancel(sym, id) {
    const n = this.orders.length;
    this.orders = this.orders.filter((o) => !(o.venueSymbol === sym && o.id === id));
    return this.orders.length < n;
  }
  async setPositionMode() {}
  async setMarginMode() {}
  /** trigger resting stops at the current price (a stop hit closes the position) */
  trigger() {
    let hits = 0;
    for (const o of [...this.orders]) {
      if (o.type !== "STOP_MARKET") continue;
      const px = this.px(o.venueSymbol);
      if (!(px > 0)) continue;
      const long = o.positionSide === "LONG";
      if ((long && px <= o.stopPrice) || (!long && px >= o.stopPrice)) {
        this.positions.delete(`${o.venueSymbol}|${o.positionSide}`);
        this.orders = this.orders.filter(
          (x) =>
            x.venueSymbol !== o.venueSymbol ||
            x.positionSide !== o.positionSide ||
            !isOwnCoid(x.clientOrderId, CONN),
        );
        hits++;
      }
    }
    return hits;
  }
}

const rt = new CoreRuntime(
  new CoreDb(":memory:"),
  {
    symbols,
    tfDays: { 1: 2, 5: 4, 15: 6, 30: 6 },
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: false,
      dca: true,
      dcaActive: true,
      axis: true,
    },
    live: {
      ...(await import("../src/core/config.ts")).DEFAULT_SETTINGS.live,
      enabled: true,
      connId: CONN,
      mode: "overall",
      requireReady: false,
      // defaults otherwise: no positions limit, $200 cap per control position
      notionalUsd: 10,
      syncMs: 1000,
    },
  },
  { market: "bingx" },
);
const pxOf = (sym) => rt.stream?.price(sym) ?? rt.candles.get(sym)?.at(-1)?.c ?? 0;
const ex = new SimExchange(pxOf);
// a foreign position and order on the account (another system): must never be touched
ex.positions.set("BTC-USDT|LONG", { qty: 0.5, entry: 1 });
ex.orders.push({
  id: "F1",
  venueSymbol: "ETH-USDT",
  symbol: "ETH-USDT",
  clientOrderId: "OTHER_1",
  positionSide: "LONG",
  type: "LIMIT",
  stopPrice: 1,
});
rt.onLive = (r, intents, gen) => stepLive(r, intents, gen, ex);

const t0 = Date.now();
rt.start();
process.stderr.write(
  `stress: ${symbols} symbols · ${minutes} min · all strategies · Live Overall on a simulated exchange\n`,
);
const samples = [];
const violations = [];
let lastEvent = 0;
const errors = [];
const minStop = rt.settings.live.minStopPct ?? 0.01;
let prevOrphans = new Set();
while (Date.now() - t0 < minutes * 60_000 + 20 * 60_000) {
  await new Promise((r) => setTimeout(r, 30_000));
  const hits = ex.trigger();
  const st = rt.status;
  const mem = process.memoryUsage();
  // invariants
  const v = [];
  if ((ex.positions.get("BTC-USDT|LONG")?.qty ?? 0) !== 0.5) v.push("foreign position touched");
  if (!ex.orders.some((o) => o.clientOrderId === "OTHER_1")) v.push("foreign order touched");
  const own = [...ex.positions.entries()].filter(([k]) => k !== "BTC-USDT|LONG");
  for (const [k, p] of own) {
    const [sym, ps] = k.split("|");
    const spec = specs.get(sym);
    const stop = ex.orders.find(
      (o) =>
        o.venueSymbol === sym &&
        o.positionSide === ps &&
        o.type === "STOP_MARKET" &&
        isOwnCoid(o.clientOrderId, CONN),
    );
    if (!stop) v.push(`${k} without own stop`);
    else if (Math.abs(stop.stopPrice - p.entry) / p.entry < minStop * 0.95)
      v.push(`${k} stop closer than ${minStop}`);
    if (spec && p.qty < spec.minQty - 1e-12) v.push(`${k} below min quantity`);
  }
  if (rt.settings.live.maxPositions > 0 && own.length > rt.settings.live.maxPositions)
    v.push(`positions ${own.length} > ${rt.settings.live.maxPositions}`);
  const ctl = rt.db.kvGet("controlStatus");
  // one own stop per own position, no stray own stops
  const ownStops = new Map();
  for (const o of ex.orders)
    if (o.type === "STOP_MARKET" && isOwnCoid(o.clientOrderId, CONN)) {
      const k = `${o.venueSymbol}|${o.positionSide}`;
      ownStops.set(k, (ownStops.get(k) ?? 0) + 1);
    }
  for (const [k, n] of ownStops) {
    if (n > 1) v.push(`${k}: ${n} own stops (duplicate)`);
    if (!ex.positions.has(k)) v.push(`${k}: own stop without a position`);
  }
  // reconciliation: every own exchange position is a control target (a position the lanes no longer hold is
  // closed); judged when it persists over two samples (an in-flight tick may sit between them)
  const want = new Set(
    (ctl?.targets ?? []).map((x) => `${x.sym}|${x.side > 0 ? "LONG" : "SHORT"}`),
  );
  const orphan = own.map(([k]) => k).filter((k) => !want.has(k));
  for (const k of orphan)
    if (prevOrphans.has(k)) v.push(`${k}: exchange position without a control target`);
  prevOrphans = new Set(orphan);
  const liveSt = rt.db.kvGet("liveStatus");
  const events = rt.db.all("SELECT id, level, msg FROM events WHERE id > ? ORDER BY id", lastEvent);
  lastEvent = Math.max(lastEvent, ...events.map((e) => e.id));
  for (const e of events)
    if (e.level !== "info")
      errors.push(`${new Date().toISOString().slice(11, 19)} ${e.level}: ${e.msg.slice(0, 200)}`);
  const s = {
    t: Math.round((Date.now() - t0) / 1000),
    state: st.state,
    cycles: st.cycles,
    computes: st.computes,
    computeS: Math.round(st.lastComputeMs / 100) / 10,
    tickMs: st.tick ? Math.round(st.tick.ms * 10) / 10 : null,
    ticks: st.tick?.count ?? 0,
    stream: st.tick?.stream
      ? `${st.tick.stream.connected ? "up" : "down"} ${st.tick.stream.symbols} ${st.tick.stream.rate.toFixed(0)}/s`
      : "-",
    loopMax: Math.round(st.loop?.max ?? 0),
    rssMB: Math.round(mem.rss / 1e6),
    heapMB: Math.round(mem.heapUsed / 1e6),
    paperOrders: rt.paper.positions.length,
    paperPositions: new Set(rt.paper.positions.map((p) => `${p.sym}|${p.side}`)).size,
    exchangePositions: own.length,
    engineOrders: rt.sim?.trades.length ?? 0,
    targets: ctl?.targets?.length ?? 0,
    raised: (ctl?.targets ?? []).filter((x) => x.raised).length,
    sent: ex.sent,
    rejects: ex.rejects.length,
    stopHits: hits,
    live: liveSt?.reason ?? "",
    violations: v.length,
  };
  samples.push(s);
  for (const x of v) violations.push(`${s.t}s ${x}`);
  process.stderr.write(`${JSON.stringify(s)}\n`);
  if (st.computes >= 1 && Date.now() - t0 > minutes * 60_000) break;
}
rt.stop();
const last = samples.at(-1) ?? {};
const report = {
  symbols,
  minutes,
  specs: specs.size,
  samples,
  violations,
  errors: errors.slice(0, 200),
  rejects: ex.rejects.slice(0, 50),
};
const md = [
  `# Stress test — ${symbols} symbols, ${minutes} min, every indication / lane / strategy, Live Overall on a simulated exchange`,
  ``,
  `Real BingX market data; the simulated exchange enforces BingX's contract rules (${specs.size} contracts: lot step, min quantity, min USDT) and holds a foreign position and order.`,
  ``,
  `**Violations:** ${violations.length} · **exchange rejects:** ${ex.rejects.length} · **warnings/errors logged:** ${errors.length} · orders sent ${ex.sent} · computes ${last.computes} · last compute ${last.computeS} s · RSS ${last.rssMB} MB (peak ${Math.max(...samples.map((x) => x.rssMB))} MB) · loop max ${Math.max(...samples.map((x) => x.loopMax))} ms`,
  ``,
  `| t (s) | state | computes | compute s | tick ms | stream | RSS MB | paper pos / orders | exchange positions | targets (raised) | sent | rejects | violations |`,
  `|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|`,
  ...samples.map(
    (x) =>
      `| ${x.t} | ${x.state} | ${x.computes} | ${x.computeS} | ${x.tickMs} | ${x.stream} | ${x.rssMB} | ${x.paperPositions} / ${x.paperOrders} | ${x.exchangePositions} | ${x.targets} (${x.raised}) | ${x.sent} | ${x.rejects} | ${x.violations} |`,
  ),
  ``,
  violations.length
    ? `## Violations\n\n${violations
        .slice(0, 50)
        .map((x) => `- ${x}`)
        .join("\n")}`
    : `No invariant was violated.`,
  ``,
  errors.length
    ? `## Warnings / errors\n\n${errors
        .slice(0, 40)
        .map((x) => `- ${x}`)
        .join("\n")}`
    : `No warning or error was logged.`,
  ``,
  ex.rejects.length
    ? `## Exchange rejects\n\n${ex.rejects
        .slice(0, 30)
        .map((x) => `- ${x}`)
        .join("\n")}`
    : `The exchange rejected no order.`,
].join("\n");
console.log(md);
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, md + "\n");
  writeFileSync(`${out}.json`, JSON.stringify(report, null, 2));
}
process.exit(0);
