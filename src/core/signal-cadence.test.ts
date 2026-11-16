import assert from "node:assert/strict";
import { test } from "node:test";
import { signalCadence } from "./signal-cadence.ts";
import { DEFAULT_SETTINGS, DEFAULT_TACTICS } from "./config.ts";
import { entrySignal } from "./bots/bots.ts";
import { laneInd } from "./indications/registry.ts";
import { SeriesCache } from "./indications/cache.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { signalId } from "./signal-config.ts";
import { forgetCombo, makeUniverse } from "./pipeline/pipeline.ts";
import { buildTapes, type ConfigTape } from "./sim/walkforward.ts";
import { closePool, runOnWorkers } from "./server/pool.server.ts";

const hour = 3_600_000;
const sample = (n = 24 * 18) => {
  const t = Float64Array.from({ length: n }, (_, i) => i * hour);
  const source = new Int8Array(n);
  for (let i = 0; i < n; i += 12) source[i] = (i / 12) % 2 ? -1 : 1;
  return { bars: { t, n, tfMin: 60 }, source };
};

test("cadence uses fourteen preceding source onsets and requires seven complete days", () => {
  const { bars, source } = sample();
  const out = signalCadence(source, source, bars, 2);
  assert.equal(out[156], 0, "six and a half days cannot prove a seven-day average");
  assert.equal(out[168], source[168], "fourteen previous onsets qualify both directions");
  const sparse = source.slice(); sparse[12] = 0;
  assert.equal(signalCadence(sparse, sparse, bars, 2)[168], 0, "thirteen onsets do not qualify");
  assert.strictEqual(signalCadence(source, source, bars, 0), source, "zero disables the gate");
  assert.equal(signalCadence(source, source, bars, Number.NaN).some(Boolean), false,
    "an unknown threshold cannot admit entries");
});

test("cadence counts source onsets once and never borrows future observations", () => {
  const { bars, source } = sample();
  const filtered = source.slice(); filtered[12] = 0;
  const out = signalCadence(filtered, source, bars, 2);
  assert.equal(out[168], source[168], "tactics do not count duplicate protection configurations");
  const cut = 200;
  const prefixBars = { ...bars, n: cut, t: bars.t.slice(0, cut) };
  const prefix = signalCadence(filtered.slice(0, cut), source.slice(0, cut), prefixBars, 2);
  assert.deepEqual(out.slice(0, cut), prefix);
});

test("a candle gap makes the trailing interval unknown until it moves outside seven days", () => {
  const { bars, source } = sample();
  for (let i = 200; i < bars.n; i++) bars.t[i] += hour;
  const out = signalCadence(source, source, bars, 2);
  assert.equal(out[204], 0);
  assert.notEqual(out[384], 0, "a fresh complete week restores qualification");
});

test("out-of-order candles cannot make a prior decision depend on a later onset", () => {
  const { bars, source } = sample();
  const clean = signalCadence(source, source, bars, 2);
  bars.t[210] = bars.t[209] - hour;
  const invalid = signalCadence(source, source, bars, 2);
  assert.deepEqual(invalid.slice(0, 210), clean.slice(0, 210));
  assert.equal(invalid.slice(210).some(Boolean), false);
});

test("entrySignal applies cadence to Signal sources while leaving ordinary indications unchanged", () => {
  const n = 24 * 15 * 9;
  const bars = barsFromCandles("A-USDT", 4, syntheticCandles("A", 4, n, Date.UTC(2026, 9, 1)));
  const tactics = { ...DEFAULT_TACTICS, volRegime: false, trendStrength: false, signalMinDaily: .1 };
  const ind = laneInd(signalId("ema-cross", "short"), 4);
  const raw = entrySignal("follow", ind, new SeriesCache(bars), { ...tactics, signalMinDaily: 0 })!;
  const gated = entrySignal("follow", ind, new SeriesCache(bars), tactics)!;
  assert.deepEqual(gated, signalCadence(raw, raw, bars, .1));
  assert.equal(gated.slice(0, 24 * 15 * 7 - 1).some(Boolean), false);
  const ordinary = laneInd("ema-9-21", 4);
  assert.deepEqual(entrySignal("follow", ordinary, new SeriesCache(bars), tactics),
    entrySignal("follow", ordinary, new SeriesCache(bars), { ...tactics, signalMinDaily: 0 }));
  assert.equal(DEFAULT_SETTINGS.tactics.signalMinDaily, 2);
  const u = makeUniverse([bars]);
  const cached = entrySignal("follow", ind, u.caches[0], tactics);
  assert.strictEqual(entrySignal("follow", ind, u.caches[0], tactics), cached);
  forgetCombo(u, "follow", ind);
  assert.notStrictEqual(entrySignal("follow", ind, u.caches[0], tactics), cached,
    "Base releases each cadence array with its source instead of retaining every source in memory");
});

test("seven-day Signal cadence and the evaluation boundary agree on worker and local tapes", async () => {
  const start = Date.UTC(2026, 9, 1);
  const bars = barsFromCandles("A-USDT", 15, syntheticCandles("A", 15, 24 * 4 * 9, start));
  const from = bars.t[0] + 7 * 24 * hour;
  const tactics = { ...DEFAULT_TACTICS, volRegime: false, trendStrength: false, signalMinDaily: .1 };
  const ind = laneInd(signalId("ema-cross", "short"), 15), pair = `follow|${ind}`;
  const protect = { tp: .01, sl: .01, trail: 0, hold: 4 };
  const local = buildTapes(makeUniverse([bars], from), [protect], .002, undefined,
    new Set([pair]), tactics);
  assert.ok(local.reduce((n, tape) => n + tape.n, 0) > 0, "the test contains evaluated Signal trades");
  try {
    const [remote] = await runOnWorkers<{ tapes: ConfigTape[] }>([{ type: "tapes", bars: [bars],
      evaluationFromT: from, pairs: [pair], protects: [protect], cost: .002, dcaOpt: null,
      tactics, adjust: null }], 1, 60_000);
    assert.deepEqual(remote.tapes, local);
  } finally { closePool(); }
});
