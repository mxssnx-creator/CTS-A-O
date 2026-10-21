// scripts/lib/session-feed.mjs: a replayed session's feed keeps every bar the engine reads through it — its own
// timeframe and the 1-hour bars of the universe ranking, up to the cut — and every read answers as on the whole feed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { lowerBound, pruneFeed, RANK_TF, boundedReplayFeed, readStored, readSessionFeed } from "./session-feed.mjs";

// the replay's read (scripts/core-session.mjs stored() under replayFeed(cut)): bars with t in [startT, endT] and
// t + tf ≤ nowT, the last `limit`
function read(candles, sym, tf, cut, { startT = 0, endT = cut - 1, limit = Infinity } = {}) {
  const all = candles[`${sym}|${tf}`] ?? [];
  const from = lowerBound(all, startT);
  const to = lowerBound(all, Math.min(endT, cut - 1, cut - tf * 60_000) + 1);
  const cs = to > from ? all.slice(from, to) : [];
  return cs.slice(Math.max(0, cs.length - limit)).filter((c) => c.t + tf * 60_000 <= cut);
}
const bars = (tf, from, n) => Array.from({ length: n }, (_, i) => ({ t: from + i * tf * 60_000, o: 1, h: 1, l: 1, c: 1 + i / 1000, v: i }));

test("loads plain and gzip frozen market feeds identically", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-session-feed-"));
  try {
    const expected = { source: { provider: "fixture" }, candles: { "AAA-USDT|1": bars(1, 0, 3) } };
    const json = Buffer.from(JSON.stringify(expected));
    const plain = join(dir, "feed.json"), zipped = join(dir, "feed.json.gz");
    writeFileSync(plain, json); writeFileSync(zipped, gzipSync(json));
    assert.deepEqual(readSessionFeed(plain), expected);
    assert.deepEqual(readSessionFeed(zipped), expected);
    assert.ok(readFileSync(zipped).length < json.length);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("replay feed honors earlier ranking clocks for both 1H and 5m reads without exposing later bars", async () => {
  const end = Date.UTC(2026, 9, 20), start = end - 12 * 3_600_000;
  const calls = [], rows = Object.fromEntries([1, 5, 60].map((tf) => [tf, bars(tf, end - 24 * 3_600_000, 24 * 60 / tf)]));
  const klines = async (_sym, tf, opt) => { calls.push(opt); return readStored(rows[tf], tf, opt); };
  const history = async (sym, tf, n, opt) => klines(sym, tf, { ...opt, limit: n });
  const feed = boundedReplayFeed(history, klines, end, start);
  assert.equal(feed.rankingAt, start);
  const hourly = await feed.klines("A", 60, { limit: 4, nowT: start });
  assert.equal(hourly.length, 4); assert.equal(hourly.at(-1).t + 3_600_000, start);
  assert.equal(calls.at(-1).nowT, start); assert.equal(calls.at(-1).endT, start - 1);
  const five = await feed.klines("A", 5, { nowT: start, startT: start - 65 * 60_000, endT: start - 1, limit: 13 });
  assert.equal(five.length, 13); assert.equal(five.at(-1).t + 300_000, start);
  const past = await feed.history("A", 1, 10, { nowT: start });
  assert.equal(past.at(-1).t + 60_000, start);
  const future = await feed.klines("A", 60, { nowT: end + 3_600_000 });
  assert.equal(future.at(-1).t + 3_600_000, end, "later caller clocks are clamped to replay end");
  assert.equal(calls.at(-1).nowT, end);
});

test("the prune keeps the engine's timeframe and the ranking's 1-hour bars up to the cut; every read answers as before", () => {
  const T0 = Date.parse("2026-10-01T00:00:00Z");
  const cut = Date.parse("2026-10-03T00:00:00Z");
  const feed = () => ({
    "AAA-USDT|1": bars(1, T0, 4 * 1440),
    "AAA-USDT|5": bars(5, T0, 4 * 288),
    "AAA-USDT|60": bars(60, T0, 4 * 24),
    "BBB-USDT|60": bars(60, T0, 4 * 24),
    "BBB-USDT|15": bars(15, T0, 4 * 96),
  });
  const whole = feed();
  const pruned = feed();
  const dropped = pruneFeed(pruned, cut, [1, RANK_TF]);
  assert.deepEqual(Object.keys(pruned).sort(), ["AAA-USDT|1", "AAA-USDT|60", "BBB-USDT|60"], "other timeframes left out");
  for (const [k, cs] of Object.entries(pruned)) {
    const tf = Number(k.split("|")[1]);
    assert.ok(cs.every((c) => c.t + tf * 60_000 <= cut), `${k}: no bar after the cut`);
  }
  // the 5 m and 15 m bars, and the second half of each kept series (the bars after the cut)
  assert.equal(dropped, 4 * 288 + 4 * 96 + 2 * 1440 + 2 * 24 + 2 * 24, "the bars left out");
  // the ranking's read (the last 4 closed 1 h bars), the history and the klines of the engine's timeframe
  for (const [sym, tf, opt] of [
    ["AAA-USDT", 60, { limit: 4 }],
    ["BBB-USDT", 60, { limit: 4 }],
    ["AAA-USDT", 1, { limit: 1440 }],
    ["AAA-USDT", 1, { limit: 10_000 }],
    ["AAA-USDT", 1, { startT: T0 + 3_600_000, endT: cut - 7_200_000, limit: 200 }],
  ])
    assert.deepEqual(read(pruned, sym, tf, cut, opt), read(whole, sym, tf, cut, opt), `${sym} ${tf} ${JSON.stringify(opt)}`);
  // (before 14 Oct the prune kept the engine's timeframe only: the ranking read no 1 h bar and ranked a different universe)
  assert.ok(read(pruned, "AAA-USDT", 60, cut, { limit: 4 }).length === 4);
});

test("the replay's read answers on columns as on the bars; the store writes itself as its bars", async () => {
  const { columnarStore, readStored } = await import("./session-feed.mjs");
  // the read before 14 Oct (core-session.mjs stored()), verbatim
  const ref = (all, tf, { startT = 0, endT = Infinity, nowT = Infinity, limit = Infinity } = {}) => {
    const from = lowerBound(all, startT);
    const to = lowerBound(all, Math.min(endT, nowT - tf * 60_000) + 1);
    const cs = to > from ? all.slice(from, to) : [];
    return cs.slice(Math.max(0, cs.length - limit));
  };
  const T0 = Date.parse("2026-10-01T00:00:00Z");
  const objs = { "AAA-USDT|1": bars(1, T0, 3000), "AAA-USDT|60": bars(60, T0, 50), "BBB-USDT|1": bars(1, T0 + 7 * 60_000, 900) };
  const cols = await columnarStore(JSON.parse(JSON.stringify(objs)));
  assert.equal(JSON.stringify(cols), JSON.stringify(objs), "the store writes itself as its bars (a recorded feed)");
  let x = 7;
  const r = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  let checks = 0;
  for (const key of Object.keys(objs)) {
    const tf = Number(key.split("|")[1]);
    const all = objs[key];
    const span = all.at(-1).t - all[0].t;
    for (let q = 0; q < 300; q++) {
      const startT = r() < 0.2 ? 0 : all[0].t - 60_000 + r() * span;
      const endT = r() < 0.2 ? Infinity : startT + r() * span;
      const nowT = r() < 0.2 ? Infinity : all[0].t + r() * (span + 3 * 60_000) + (r() < 0.3 ? 30_000 : 0); // (a cut inside a bar)
      const limit = [Infinity, 0, -3, 2.5, NaN, 1, 4, 299, 1440, 100_000][q % 10];
      const opt = { startT, endT, nowT, limit };
      const want = ref(all, tf, opt);
      assert.deepEqual(readStored(all, tf, opt), want, `${key} array ${JSON.stringify(opt)}`);
      assert.deepEqual(readStored(cols[key], tf, opt), want, `${key} columns ${JSON.stringify(opt)}`);
      checks++;
    }
  }
  assert.deepEqual(readStored(undefined, 1, {}), []);
  assert.ok(checks >= 900);
});
