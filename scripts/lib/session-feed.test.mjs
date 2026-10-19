// scripts/lib/session-feed.mjs: a replayed session's feed keeps every bar the engine reads through it — its own
// timeframe and the 1-hour bars of the universe ranking, up to the cut — and every read answers as on the whole feed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lowerBound, pruneFeed, RANK_TF } from "./session-feed.mjs";

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
