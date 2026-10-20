#!/usr/bin/env node
// Public market recording only. Closed 5s OHLCV and raw trades are append-only; never places an order.
import { gunzipSync } from "node:zlib";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { TradeBars } from "../src/core/market/trade-bars.ts";
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const symbols = [...new Set(arg("symbols", "BTC-USDT,ETH-USDT").split(","))];
const seconds = Number(arg("seconds", 3600));
if (
  !symbols.length ||
  symbols.length > 50 ||
  symbols.some((s) => !/^[A-Z0-9]+-USDT$/.test(s)) ||
  !Number.isFinite(seconds) ||
  seconds <= 0
)
  throw new Error("Supply 1–50 USDT symbols and positive recording duration");
const out = resolve(arg("out", `runs/micro-trades-${Date.now()}`));
mkdirSync(out, { recursive: true });
const startedAt = Date.now(),
  session = randomUUID();
const log = (row) =>
  appendFileSync(`${out}/events.jsonl`, JSON.stringify({ session, at: Date.now(), ...row }) + "\n");
const bars = new TradeBars(5000, 15000, (bar) =>
  appendFileSync(`${out}/bars-5s.jsonl`, JSON.stringify({ session, ...bar }) + "\n"),
);
let ws,
  retry,
  attempts = 0,
  stopped = false,
  chain = Promise.resolve(),
  backoff = 1000;
const connect = () => {
  if (stopped) return;
  attempts++;
  const socket = (ws = new WebSocket("wss://open-api-swap.bingx.com/swap-market"));
  socket.binaryType = "arraybuffer";
  const timeout = setTimeout(() => socket.close(), 15_000);
  socket.onopen = () => {
    clearTimeout(timeout);
    backoff = 1000;
    log({ event: "connected", attempts });
    // Start recording at a completed bucket boundary; initial partial coverage remains explicit in metadata.
    for (const sym of symbols)
      socket.send(JSON.stringify({ id: randomUUID(), reqType: "sub", dataType: `${sym}@trade` }));
  };
  socket.onmessage = (e) => {
    chain = chain
      .then(() => {
        const text =
          typeof e.data === "string" ? e.data : gunzipSync(Buffer.from(e.data)).toString();
        if (text === "Ping") {
          if (socket.readyState === 1) socket.send("Pong");
          return;
        }
        const data = JSON.parse(text);
        if (!data.dataType?.endsWith("@trade")) {
          log({ event: "response", response: data });
          return;
        }
        for (const row of Array.isArray(data.data) ? data.data : [data.data]) {
          if (!row) continue;
          const trade = {
            sym: row.s,
            t: Number(row.T),
            price: Number(row.p),
            quantity: Number(row.q),
            ...(row.id != null ? { id: String(row.id) } : {}),
          };
          const receivedAt = Date.now();
          if (symbols.includes(trade.sym)) {
            bars.put(trade, receivedAt);
            appendFileSync(
              `${out}/trades.jsonl`,
              JSON.stringify({ session, receivedAt, ...trade }) + "\n",
            );
          }
        }
      })
      .catch((error) => log({ event: "decode-error", message: String(error) }));
  };
  socket.onerror = () => log({ event: "socket-error", attempts });
  socket.onclose = () => {
    clearTimeout(timeout);
    log({ event: "disconnected", attempts });
    if (!stopped) {
      retry = setTimeout(connect, backoff);
      backoff = Math.min(60_000, backoff * 2);
    }
  };
};
const tick = setInterval(() => bars.flush(Date.now()), 1000);
async function finish() {
  if (stopped) return;
  stopped = true;
  clearInterval(tick);
  clearTimeout(retry);
  clearTimeout(stopTimer);
  ws?.close();
  await chain;
  bars.flush(Date.now());
  const summary = {
    session,
    startedAt,
    endedAt: Date.now(),
    symbols,
    attempts,
    stats: bars.stats,
    pendingPartialBuckets: bars.pending(),
    source: "BingX swap public trade WebSocket",
    intervalMs: 5000,
    coverage:
      "Observed trades only; initial partial bucket, disconnects and idle gaps are not complete historical evidence.",
    completeRequestedHistory: false,
  };
  writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  process.exitCode = bars.stats.accepted ? 0 : 2;
}
const stopTimer = setTimeout(finish, seconds * 1000);
process.on("SIGINT", finish);
process.on("SIGTERM", finish);
log({ event: "started", symbols, seconds });
connect();
