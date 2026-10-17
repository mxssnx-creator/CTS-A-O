import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BOTS, botTrigger, comboSignal, entrySignal } from "../bots/bots.ts";
import type { Bars, Candle } from "../domain/types.ts";
import { barsFromCandles } from "../market/bars.ts";
import { SeriesCache } from "./cache.ts";
import { entryWarmupBarsOf, INDICATION_BY_ID, indicationState, laneInd, signalId } from "./registry.ts";
import { S2_WARMUP, s2Supertrend } from "./stable02.ts";

const T0 = Date.UTC(2026, 9, 17, 8);
function fixture(tf = 1, moves = true): Bars {
  let previous = 100;
  const candles: Candle[] = Array.from({ length: 200 }, (_, i) => {
    const c = !moves ? 100 : i === 14 ? 95 : i === 15 ? 96
      : i >= 80 && i < 100 ? 100 - (i - 79) * 2
        : i >= 100 && i < 120 ? 60 + (i - 99) * 2 : 100;
    const o = previous;
    previous = c;
    return { t: T0 + i * tf * 60_000, o, c, h: Math.max(o, c) + 1, l: Math.min(o, c) - 1, v: 1000 };
  });
  return barsFromCandles("S2-WARMUP", tf, candles);
}
const prefix = (b: Bars, n: number): Bars => ({ ...b, n, ...Object.fromEntries(
  (["t", "o", "h", "l", "c", "v"] as const).map((key) => [key, b[key].slice(0, n)]),
) });
const onsets = (state: Int8Array, first = 1, direction = 1) => {
  const out = new Int8Array(state.length);
  for (let i = first; i < state.length; i++)
    if (state[i] !== 0 && state[i] !== state[i - 1]) out[i] = state[i] * direction;
  return out;
};

describe("Stable-02 Supertrend entry readiness", () => {
  it("keeps raw directions intact, rejects early seeds, preserves real later onsets and propagates Signal/lane metadata", () => {
    for (const [range, period, mult] of [["short", 14, 3], ["medium", 21, 4]] as const) {
      const base = `s2-st-trail${range === "medium" ? "-m" : ""}`;
      const ids = [base, signalId("s2-st-trail", range)];
      for (const tf of [1, 5]) {
        const bars = fixture(tf), k = new SeriesCache(bars), raw = s2Supertrend(k, period, mult);
        assert.equal(raw[period - 1], 1, "the original ATR seed direction remains available to filters");
        assert.ok(onsets(raw).slice(S2_WARMUP).includes(-1), "fixture has a genuine later bearish flip");
        assert.ok(onsets(raw).slice(S2_WARMUP).includes(1), "fixture has a genuine later bullish flip");
        for (const id of ids.flatMap((x) => [x, laneInd(x, tf)])) {
          assert.equal(entryWarmupBarsOf(id), S2_WARMUP, id);
          assert.equal(indicationState(id, k), raw, "entry readiness must not copy or zero direction state");
          assert.deepEqual(comboSignal("follow", id, k), onsets(raw, S2_WARMUP));
          assert.deepEqual(comboSignal("revert", id, k), onsets(raw, S2_WARMUP, -1));
          for (const cut of [period, S2_WARMUP, S2_WARMUP + 1, 91, 121])
            assert.deepEqual(comboSignal("follow", id, new SeriesCache(prefix(bars, cut))), comboSignal("follow", id, k)!.slice(0, cut), `${id} causal prefix${cut}`);
        }
      }
      for (const id of ids) assert.equal(INDICATION_BY_ID.get(id)?.entryWarmupBars, S2_WARMUP);
      const bars = fixture(); bars.lanes = [1, 5];
      const k = new SeriesCache(bars);
      for (const id of ids.map((x) => laneInd(x, 1, true))) {
        const original = indicationState(id, k)!;
        assert.equal(entryWarmupBarsOf(id), S2_WARMUP);
        assert.deepEqual(comboSignal("follow", id, k), onsets(original, S2_WARMUP));
        assert.deepEqual(comboSignal("revert", id, k), onsets(original, S2_WARMUP, -1));
        assert.deepEqual(comboSignal("follow", id, new SeriesCache(prefix(bars, 121))), comboSignal("follow", id, k)!.slice(0, 121));
      }
    }
  });

  it("does not fabricate a natural onset at55; onRun may deliberately enter the first eligible held-run bar", () => {
    for (const id of ["s2-st-trail", "s2-st-trail-m", "sig-s2-st-trail-s", "sig-s2-st-trail-m"]) {
      const k = new SeriesCache(fixture(1, false));
      assert.ok(comboSignal("follow", id, k)!.every((x) => x === 0), id);
      assert.ok(comboSignal("revert", id, k)!.every((x) => x === 0), id);
      const tactics = { session: true, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4, onRun: true };
      for (const bot of ["follow", "revert"] as const) {
        const entries = entrySignal(bot, id, k, tactics)!;
        assert.ok(entries.slice(0, S2_WARMUP).every((x) => x === 0));
        assert.equal(entries[S2_WARMUP], bot === "follow" ? 1 : -1, "onRun means first eligible filtered bar, not a new state flip");
        assert.equal(entries.filter((x) => x !== 0).length, 1, "the held run enters once");
      }
    }
  });

  it("applies the same source floor to fade/trigger bots and leaves metadata-free entry logic unchanged", () => {
    const k = new SeriesCache(fixture()), raw = indicationState("s2-st-trail", k)!;
    const sandwich = botTrigger("sandwich", k)!;
    assert.ok(sandwich.slice(0, S2_WARMUP).some((x, i) => x !== 0 && x === raw[i]), "fixture exposes a real early trigger-agreement candidate");
    for (const bot of BOTS) {
      const gated = comboSignal(bot.type, "s2-st-trail", k)!;
      assert.ok(gated.slice(0, S2_WARMUP).every((x) => x === 0), bot.type);
      const ind = "trend-ema", state = indicationState(ind, k)!;
      assert.equal(entryWarmupBarsOf(ind), 0);
      let expected: Int8Array;
      if (bot.type === "follow" || bot.type === "revert") expected = onsets(state, 1, bot.type === "follow" ? 1 : -1);
      else {
        const trigger = botTrigger(bot.type, k)!;
        expected = Int8Array.from(trigger, (x, i) => x !== 0 && state[i] === x ? x : 0);
        const original = Int8Array.from(trigger, (x, i) => x !== 0 && raw[i] === x ? x : 0);
        assert.deepEqual(gated.slice(S2_WARMUP), original.slice(S2_WARMUP), bot.type);
      }
      assert.deepEqual(comboSignal(bot.type, ind, k), expected, `${bot.type} metadata-free parity`);
    }
  });
});
