// Klines pacing: the bar pull spreads its asks over the seconds after a bar's close, backs off a symbol whose bar is
// not published yet, and resumes after a ban one symbol at a time (x01, 14 Oct: 60 symbols × 1m all asked at second
// 0 and re-asked every second, 6 at a time — 140 of 179 klines bans in seconds 0–4 of a minute).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dueKlines, KLINES_CONCURRENCY, klinesBackoffMs, klinesOffsetMs, type KlinesPace } from "./klines-pace.ts";

const M = 60_000;
const syms = Array.from({ length: 60 }, (_, i) => `S${i}X-USDT`);

describe("klines pacing", () => {
  it("each symbol has a stable offset of 1.5–20 s after the close, spread over the window", () => {
    const off = syms.map(klinesOffsetMs);
    assert.deepEqual(off, syms.map(klinesOffsetMs), "stable");
    for (const o of off) assert.ok(o >= 1_500 && o <= 20_000, String(o));
    // spread: no more than a few symbols in any one second of the window
    const perSec = new Map<number, number>();
    for (const o of off) perSec.set(Math.floor(o / 1000), (perSec.get(Math.floor(o / 1000)) ?? 0) + 1);
    assert.ok(perSec.size >= 15, `${perSec.size} distinct seconds`);
    assert.ok(Math.max(...perSec.values()) <= 8, `${Math.max(...perSec.values())} in one second`);
    assert.equal(KLINES_CONCURRENCY, 2);
  });

  it("a symbol is due only once its bar closed and its offset passed — never all at second 0", () => {
    const bar = 100 * M;
    const last = bar - 2 * M; // the bar starting at bar - M closes at bar
    const items = syms.map((sym) => ({ sym, last }));
    const pace = new Map<string, KlinesPace>();
    assert.deepEqual(dueKlines(items, bar + 1_000, M, pace), [], "nothing due in the first second");
    const at10 = dueKlines(items, bar + 10_000, M, pace);
    assert.ok(at10.length > 0 && at10.length < syms.length, `${at10.length} due at +10 s`);
    for (const s of at10) assert.ok(klinesOffsetMs(s) <= 10_000);
    assert.equal(dueKlines(items, bar + 20_000, M, pace).length, syms.length, "all due by +20 s");
    // a symbol several bars behind is due at once (its next bar closed long ago)
    assert.deepEqual(dueKlines([{ sym: syms[0], last: bar - 5 * M }], bar + 1, M, pace), [syms[0]]);
    // too far behind for the incremental pull (the gap repair takes it)
    assert.deepEqual(dueKlines([{ sym: syms[0], last: bar - 301 * M }], bar + 30_000, M, pace), []);
  });

  it("a fetch that brought nothing new backs the symbol off 2 → 4 → 8 → 15 s (a halted symbol too)", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 9].map(klinesBackoffMs), [2_000, 4_000, 8_000, 15_000, 15_000, 15_000]);
    const sym = syms[3];
    const last = 100 * M - 5 * M;
    const t0 = 100 * M;
    const items = [{ sym, last }];
    const pace = new Map<string, KlinesPace>();
    assert.deepEqual(dueKlines(items, t0, M, pace), [sym]);
    let at = t0;
    for (const [empty, wait] of [
      [1, 2_000],
      [2, 4_000],
      [3, 8_000],
      [4, 15_000],
      [7, 15_000],
    ] as const) {
      pace.set(sym, { at, empty });
      assert.deepEqual(dueKlines(items, at + wait - 1, M, pace), [], `empty ${empty}: not before ${wait} ms`);
      assert.deepEqual(dueKlines(items, at + wait, M, pace), [sym], `empty ${empty}: due after ${wait} ms`);
      at += wait;
    }
    // a fresh answer: at most once a second, as before
    pace.set(sym, { at, empty: 0 });
    assert.deepEqual(dueKlines(items, at + 999, M, pace), []);
    assert.deepEqual(dueKlines(items, at + 1_000, M, pace), [sym]);
  });

  it("after a ban every symbol resumes at the ban's end plus its own offset, not all at once", () => {
    const end = 100 * M + 37_000;
    const items = syms.map((sym) => ({ sym, last: 100 * M - 10 * M }));
    const pace = new Map<string, KlinesPace>();
    assert.deepEqual(dueKlines(items, end, M, pace, end), [], "nothing at the ban's end itself");
    const soon = dueKlines(items, end + 5_000, M, pace, end);
    assert.ok(soon.length > 0 && soon.length < 20, `${soon.length} within 5 s of the end`);
    for (const s of soon) assert.ok(klinesOffsetMs(s) <= 5_000);
    assert.equal(dueKlines(items, end + 20_000, M, pace, end).length, syms.length);
    // an old ban's end long past changes nothing
    assert.equal(dueKlines(items, end + 20_000, M, pace, end - 10 * M).length, syms.length);
  });
});
