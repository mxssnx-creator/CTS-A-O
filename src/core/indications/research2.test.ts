import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Candle } from "../domain/types.ts";
import { SeriesCache } from "./cache.ts";
import { INDICATION_BY_ID, SIGNAL_SOURCES, signalId } from "./registry.ts";
import { RESEARCH2_SOURCES, valueAreaProfile } from "./research2.ts";
import { DEFAULT_SIGNALS } from "../signal-config.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";

const T0 = Date.UTC(2026, 8, 20, 12, 0, 0);
const BAR = 15 * 60_000;
const toBars = (cs: readonly Candle[]): Bars => barsFromCandles("X-USDT", 15, [...cs]);
const stateOf = (id: string, cs: readonly Candle[]) =>
  INDICATION_BY_ID.get(id)!.fn(new SeriesCache(toBars(cs)));
const last = (id: string, cs: readonly Candle[]) => stateOf(id, cs)[cs.length - 1];
const flat = (n: number, v = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const up = i % 2 === 0;
    return { t: T0 + i * BAR, o: up ? 99.8 : 100.2, h: 100.5, l: 99.5, c: up ? 100.2 : 99.8, v };
  });
const bar = (i: number, o: number, h: number, l: number, c: number, v = 100): Candle => ({
  t: T0 + i * BAR,
  o,
  h,
  l,
  c,
  v,
});
const mirror = (cs: readonly Candle[]): Candle[] => {
  const K = 2 * Math.max(...cs.map((x) => x.h));
  return cs.map((x) => ({ t: x.t, o: K - x.o, h: K - x.l, l: K - x.h, c: K - x.c, v: x.v }));
};

/** validated research sources of this batch (positive net in replay windows, lower drawdown; docs/signals-validation.md) */
const ON = new Set(["r-linreg", "r-fractal", "r-awesome", "r-inside", "r-connors"]);

describe("research signals, second batch", () => {
  it("capped value-area profiles cover high-price volume and conserve each included candle's volume", () => {
    const h = Float64Array.of(101, 191, 200), l = Float64Array.of(100, 190, 200), v = Float64Array.of(10, 100, 50);
    const profile = valueAreaProfile(h, l, v, 0, 3, 0.15)!;
    assert.equal(profile.vol.length, 400);
    assert.equal(profile.bin, 0.25);
    assert.equal(profile.lo + profile.vol.length * profile.bin, profile.hi, "the cap cannot truncate the observed price domain");
    assert.ok(profile.vol.every((x) => Number.isFinite(x) && x >= 0));
    assert.ok(Math.abs(profile.vol.reduce((a, b) => a + b, 0) - 160) < 1e-10, "no candle volume disappears above the old capped domain");
    assert.ok(Math.abs(profile.vol.slice(360).reduce((a, b) => a + b, 0) - 150) < 1e-10);
    assert.equal(profile.vol[399], 50, "a zero-range candle at the capped upper endpoint belongs to the last bin");
  });

  it("uncapped value-area profiles preserve their exact former bins and volume arithmetic", () => {
    const h = Float64Array.of(101, 100.6, 100.9, 999), l = Float64Array.of(100, 100.2, 100.3, 1), v = Float64Array.of(10, 20, 30, 1_000);
    const bin = 0.15, lo = 100, hi = 101, expected = new Float64Array(Math.ceil((hi - lo) / bin));
    for (let j = 0; j < 3; j++) {
      const b0 = Math.max(0, Math.floor((l[j] - lo) / bin));
      const b1 = Math.min(expected.length - 1, Math.floor((h[j] - lo) / bin));
      const share = v[j] / (b1 - b0 + 1);
      for (let b = b0; b <= b1; b++) expected[b] += share;
    }
    const profile = valueAreaProfile(h, l, v, 0, 3, bin)!;
    assert.equal(profile.bin, bin);
    assert.equal(profile.lo, lo);
    assert.equal(profile.hi, hi);
    assert.deepEqual(profile.vol, expected, "uncapped calculations are bit-for-bit unchanged");
    assert.deepEqual(valueAreaProfile(h.slice(0, 3), l.slice(0, 3), v.slice(0, 3), 0, 3, bin), profile,
      "bars beyond the explicit prior-window endpoint cannot change a profile");
  });

  it("uncapped value-area profiles retain a flat candle exactly at the upper bin boundary", () => {
    const profile = valueAreaProfile(Float64Array.of(101, 102), Float64Array.of(100, 102), Float64Array.of(10, 50), 0, 2, 0.25)!;
    assert.equal(profile.vol.length, 8);
    assert.equal(profile.bin, 0.25, "the ordinary requested width stays unchanged");
    assert.equal(profile.vol[7], 50, "a valid flat high candle belongs to the last bin");
    assert.equal(profile.vol.reduce((a, b) => a + b, 0), 60, "the endpoint volume is conserved without widening uncapped bins");
  });

  it("capped value-area re-entry uses the full past domain causally in both independent profiles", () => {
    const cs = Array.from({ length: 260 }, (_, i): Candle => {
      const price = i < 160 ? 100 : 200;
      return bar(i, i === 160 ? 100 : price, price + 0.1, i === 160 ? 99.9 : price - 0.1, price, i < 160 ? 1 : 100);
    });
    cs[218] = bar(218, 200, 201.1, 199.9, 201, 1);
    cs[219] = bar(219, 201, 201.1, 199.9, 200, 100);
    const b = toBars(cs), at = 220, a = new SeriesCache(b).atr(14);
    for (const [id, look] of [["r-valuearea", 96], ["r-valuearea-m", 192]] as const) {
      const profile = valueAreaProfile(b.h, b.l, b.v, at - look, at - 1, 0.15 * a[at])!;
      assert.equal(profile.vol.length, 400);
      assert.ok(profile.bin > 0.15 * a[at], "this event exercises the corrected cap path");
      const state = stateOf(id, cs);
      assert.equal(state[at], -1, `${id} recognizes the re-entry near the high-volume upper domain`);
      assert.equal(stateOf(id, mirror(cs))[at], 1, `${id} retains its mirrored long re-entry`);
      assert.deepEqual(stateOf(id, cs.slice(0, at + 1)), state.slice(0, at + 1), `${id} does not read later bars`);
    }
  });

  it("every source is registered (short + medium) and listed; only the validated ones are on", () => {
    assert.equal(RESEARCH2_SOURCES.length, 24);
    for (const r of RESEARCH2_SOURCES) {
      assert.ok(INDICATION_BY_ID.has(r.name), r.name);
      assert.ok(INDICATION_BY_ID.has(`${r.name}-m`), r.name);
      assert.ok(INDICATION_BY_ID.has(signalId(r.name, "medium")), r.name);
      assert.ok(
        SIGNAL_SOURCES.some((s) => s.name === r.name),
        r.name,
      );
      assert.equal(
        DEFAULT_SIGNALS.sources[r.name] === false,
        !ON.has(r.name),
        `${r.name} on only when validated`,
      );
    }
  });

  it("causal: appending later bars never changes an earlier state; most sources fire on noise", () => {
    const cs = syntheticCandles("R2", 15, 1800, T0);
    let fires = 0;
    for (const r of RESEARCH2_SOURCES)
      for (const id of [r.name, `${r.name}-m`]) {
        const full = stateOf(id, cs);
        const cut = stateOf(id, cs.slice(0, 1100));
        for (let i = 0; i < 1100; i++) assert.equal(full[i], cut[i], `${id} bar ${i}`);
        if (full.some((x) => x !== 0)) fires++;
      }
    assert.ok(
      fires >= RESEARCH2_SOURCES.length,
      `${fires} of ${RESEARCH2_SOURCES.length * 2} fired`,
    );
  });

  it("pin bar: a long lower wick closing near the high at a 20-bar low is long, mirrored short", () => {
    const cs = [...flat(120), bar(120, 100.1, 100.3, 97, 100.2, 200)];
    assert.equal(last("r-pin", cs), 1);
    assert.equal(last("r-pin", mirror(cs)), -1);
  });

  it("morning / evening star", () => {
    const cs = [
      ...flat(118),
      bar(118, 104, 104.1, 100, 100.2),
      bar(119, 100.1, 100.2, 99.8, 100.15),
      bar(120, 100.2, 103.2, 100.1, 103),
    ];
    assert.equal(last("r-star", cs), 1);
    assert.equal(last("r-star", mirror(cs)), -1);
  });

  it("failed breakout: a close above the 20-bar high, back below it two bars later, fades short", () => {
    const cs = [
      ...flat(120),
      bar(120, 100.2, 101.8, 100.1, 101.5),
      bar(121, 101.4, 101.5, 100, 100.1),
    ];
    assert.equal(last("r-fakeout", cs), -1);
    assert.equal(last("r-fakeout", mirror(cs)), 1);
  });

  it("fair value gap: a retest of the gap after a displacement bar is long", () => {
    const cs = [
      ...flat(119),
      bar(119, 100.2, 102.6, 100.1, 102.5),
      bar(120, 102.5, 102.8, 101.2, 102.6),
      bar(121, 100.9, 101.6, 100.6, 101.4),
    ];
    assert.equal(last("r-fvg", cs), 1);
    assert.equal(last("r-fvg", mirror(cs)), -1);
  });

  it("exhaustion streak: five falling closes on a volume spike, then the first up bar, is long", () => {
    const fall = Array.from({ length: 5 }, (_, i) =>
      bar(
        100 + i,
        99.8 - i * 0.8,
        99.9 - i * 0.8,
        99 - i * 0.8,
        99.2 - i * 0.8,
        i === 4 ? 400 : 250,
      ),
    );
    const cs = [...flat(100), ...fall, bar(105, 95.3, 96.4, 95.2, 96.2, 200)];
    assert.equal(last("r-streak", cs), 1);
    assert.equal(last("r-streak", mirror(cs)), -1);
  });

  it("opening range: the breakout above the first hour after 00:00 UTC fires once per day", () => {
    const day0 = Date.UTC(2026, 8, 21, 0, 0, 0);
    const mk = (i: number, o: number, h: number, l: number, c: number): Candle => ({
      t: day0 + i * BAR,
      o,
      h,
      l,
      c,
      v: 100,
    });
    const pre = Array.from({ length: 40 }, (_, i) =>
      mk(i - 40, 100, 100.6, 99.4, 100 + (i % 2 ? 0.1 : -0.1)),
    );
    const orb = [
      mk(0, 100, 100.5, 99.5, 100.1),
      mk(1, 100.1, 100.6, 99.6, 100.2),
      mk(2, 100.2, 100.5, 99.7, 100.1),
      mk(3, 100.1, 100.6, 99.6, 100.2),
    ];
    const rest = [
      mk(4, 100.2, 100.5, 99.9, 100.3),
      mk(5, 100.3, 101.8, 100.2, 101.6),
      mk(6, 101.6, 102, 101.4, 101.9),
    ];
    const st = stateOf("r-orb", [...pre, ...orb, ...rest]);
    const at = (j: number) => st[40 + j];
    assert.equal(at(5), 1);
    assert.equal(at(6), 0, "once per opening range");
    assert.equal(at(4), 0);
  });
});
