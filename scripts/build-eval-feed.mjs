#!/usr/bin/env node
// Builds the causal evaluation feed from the desk's candle table (read-only): the 1 m bars of every symbol, the 5, 15 and
// 30 m lanes resampled from them with the engine's own resample(), and a ticker list derived from the bars (last close,
// 24 h quote volume, 24 h change). The store is the one core-session.mjs replays with --feed (no network).
//
//   node --experimental-strip-types scripts/build-eval-feed.mjs [--db runs/x01-signals/core.sqlite] [--out runs/eval/feed.json]
//        [--symbols SYM,SYM | all] [--tfs 1,5,15,30]
// Prints the file's SHA-256 and the symbol and bar counts; the checkpoints of an evaluation key on that hash.
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const dbFile = arg("db", "runs/x01-signals/core.sqlite");
const outFile = arg("out", "runs/eval/feed.json");
const tfs = arg("tfs", "1,5,15,30").split(",").map(Number);
const want = arg("symbols", "all");

const { resample } = await import("../src/core/market/bars.ts");
const db = new DatabaseSync(dbFile, { readOnly: true });
const syms = (want === "all"
  ? db.prepare("SELECT DISTINCT sym FROM candles ORDER BY sym").all().map((r) => r.sym)
  : want.split(",")
).filter(Boolean);

const store = { tickers: [], candles: {}, source: { db: dbFile, tfs, built: new Date().toISOString() } };
const q = db.prepare("SELECT t, o, h, l, c, v FROM candles WHERE sym = ? ORDER BY t");
let bars = 0;
for (const sym of syms) {
  const rows = q.all(sym);
  if (rows.length === 0) continue;
  const oneMin = rows.map((r) => ({ t: Number(r.t), o: r.o, h: r.h, l: r.l, c: r.c, v: r.v }));
  bars += oneMin.length;
  for (const tf of tfs) store.candles[`${sym}|${tf}`] = tf === 1 ? oneMin : resample(oneMin, 1, tf);
  // the ticker of the window's end: last close, 24 h quote volume (close × volume over the last 1440 bars), 24 h change
  const last = oneMin[oneMin.length - 1];
  const day = oneMin.slice(-1440);
  const quoteVol = day.reduce((a, c) => a + c.c * c.v, 0);
  const ref = oneMin[Math.max(0, oneMin.length - 1440)];
  store.tickers.push({ sym, last: last.c, quoteVol, changePct: ref.c > 0 ? ((last.c - ref.c) / ref.c) * 100 : 0 });
}
const json = JSON.stringify(store);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, json);
const sha = createHash("sha256").update(readFileSync(outFile)).digest("hex");
console.log(`feed ${outFile}: ${store.tickers.length} symbols, ${bars} 1m bars, tfs ${tfs.join("/")}, ${(json.length / 1e6).toFixed(0)} MB`);
console.log(`sha256 ${sha}`);
