import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Candle } from "../domain/types.ts";
import { SeriesCache } from "./cache.ts";
import { INDICATION_BY_ID, SIGNAL_SOURCES, signalId } from "./registry.ts";
import { RESEARCH_SOURCES } from "./research.ts";
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
const bar = (i: number, o: number, h: number, l: number, c: number, v: number): Candle => ({
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

describe("research signals", () => {
  it("every research source is registered in a short and a medium range and listed as a signal source", () => {
    for (const r of RESEARCH_SOURCES) {
      assert.ok(INDICATION_BY_ID.has(r.name), r.name);
      assert.ok(INDICATION_BY_ID.has(`${r.name}-m`), r.name);
      assert.ok(INDICATION_BY_ID.has(signalId(r.name, "short")), r.name);
      assert.ok(
        SIGNAL_SOURCES.some((s) => s.name === r.name),
        r.name,
      );
    }
  });

  it("causal: a state never changes when later bars are appended, and fires on some bars", () => {
    const cs = syntheticCandles("R", 15, 1500, T0);
    for (const r of RESEARCH_SOURCES)
      for (const id of [r.name, `${r.name}-m`]) {
        const full = stateOf(id, cs);
        const cut = stateOf(id, cs.slice(0, 900));
        for (let i = 0; i < 900; i++) assert.equal(full[i], cut[i], `${id} bar ${i}`);
      }
    // most sources fire on synthetic noise; at least half must, so the check above is not vacuous
    const fires = RESEARCH_SOURCES.filter((r) => stateOf(r.name, cs).some((x) => x !== 0)).length;
    assert.ok(fires >= RESEARCH_SOURCES.length / 2, `${fires}`);
  });

  it("donchian + volume + CLV: a wide volume breakout closing at its high is long, mirrored short", () => {
    const cs = [...flat(120), bar(120, 100.2, 103.2, 100, 103.1, 400)];
    assert.equal(last("r-donch-vol", cs), 1);
    assert.equal(last("r-donch-vol", mirror(cs)), -1);
    // same break on ordinary volume: no signal
    assert.equal(last("r-donch-vol", [...flat(120), bar(120, 100.2, 103.2, 100, 103.1, 100)]), 0);
  });

  it("stop-run reversal: a spike above the range that closes back inside on a long wick is short", () => {
    const cs = [...flat(120), bar(120, 100.2, 102.5, 100, 100.3, 300)];
    assert.equal(last("r-sweep", cs), -1);
    assert.equal(last("r-sweep", mirror(cs)), 1);
  });

  it("forced-flow fade: a 3.5-point (3 ATR) drop on a volume spike that closes off its low is long", () => {
    const cs = [...flat(120), bar(120, 104, 104.2, 97, 100.5, 900)];
    assert.equal(last("r-capit", cs), 1);
    assert.equal(last("r-capit", mirror(cs)), -1);
  });

  it("NR7: the bar after the narrowest of seven closing beyond its range fires", () => {
    const wide = (i: number) => bar(i, 100, 101.5, 98.5, 100, 100);
    const cs = [
      ...Array.from({ length: 30 }, (_, i) => wide(i)),
      bar(30, 100, 100.3, 99.9, 100.1, 100), // narrowest
      bar(31, 100.1, 100.9, 100, 100.8, 100), // closes above the narrow bar's high
    ];
    assert.equal(last("r-nr-break", cs), 1);
    assert.equal(last("r-nr-break", mirror(cs)), -1);
  });

  it("session trend only fires inside the liquid sessions", () => {
    // 60 rising bars starting 12:00 UTC ⇒ bars run 12:00 → 03:00; the trend condition holds throughout
    const cs = Array.from({ length: 80 }, (_, i) => {
      const p = 100 + i * 0.5;
      return bar(i, p - 0.1, p + 0.3, p - 0.4, p + 0.2, 100);
    });
    const st = stateOf("r-session-trend", cs);
    for (let i = 0; i < cs.length; i++) {
      const hr = new Date(cs[i].t).getUTCHours();
      const inSession = (hr >= 12 && hr < 17) || hr < 2;
      if (!inSession) assert.equal(st[i], 0, `bar ${i} hour ${hr}`);
    }
    assert.ok(st.some((x) => x === 1));
  });
});
