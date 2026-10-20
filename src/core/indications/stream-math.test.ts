import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars } from "../domain/types.ts";
import { barsFromCandles, mulberry32 } from "../market/bars.ts";
import { htfBars, SeriesCache } from "./cache.ts";
import { StreamMath } from "./stream-math.ts";

function equal(actual: unknown, expected: unknown, label: string) {
  if (ArrayBuffer.isView(actual) && ArrayBuffer.isView(expected)) {
    const a = actual as unknown as ArrayLike<number>,
      b = expected as unknown as ArrayLike<number>;
    assert.equal(a.length, b.length, label);
    for (let i = 0; i < a.length; i++)
      if (!Object.is(a[i], b[i])) assert.fail(`${label} at ${i}: ${a[i]} != ${b[i]}`);
  } else
    for (const key of Object.keys(expected as object))
      equal(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${label}.${key}`,
      );
}
const prefix = (b: Bars, n: number): Bars => ({
  ...b,
  n,
  t: b.t.slice(0, n),
  o: b.o.slice(0, n),
  h: b.h.slice(0, n),
  l: b.l.slice(0, n),
  c: b.c.slice(0, n),
  v: b.v.slice(0, n),
});

describe("incremental Float64 indicator math", () => {
  it("retains partial higher buckets and completed-bar mappings exactly through gaps and capacity growth", () => {
    const b = barsFromCandles(
      "HTF",
      1,
      Array.from({ length: 800 }, (_, i) => ({
        t: (i + 3 + (i > 122 ? 1 : 0) + (i > 410 ? 4 : 0)) * 60_000,
        o: 100 + i / 10,
        h: 102 + i / 10,
        l: 99 + i / 10,
        c: 101 + i / 10,
        v: i % 7,
      })),
    );
    const math = new StreamMath();
    for (let n = 0; n <= b.n; n += n < 100 ? 1 : 7)
      for (const factor of [2, 5, 15, 30]) {
        const bars = prefix(b, n),
          actual = math.higher(bars, factor),
          expected = htfBars(bars, factor);
        assert.equal(actual.hb.n, expected.hb.n);
        assert.deepEqual(actual.map, expected.map);
        for (const col of ["t", "o", "h", "l", "c", "v"] as const)
          assert.deepEqual(actual.hb[col], expected.hb[col]);
      }
  });
  it("matches every full output exactly through warmup, appends, flat bars, gaps and invalid prices", () => {
    for (let seed = 1; seed <= 3; seed++)
      for (const invalid of [false, true]) {
        const random = mulberry32(seed);
        let px = 100;
        const b = barsFromCandles(
          "STREAM",
          1,
          Array.from({ length: 420 }, (_, i) => {
            const open = px,
              close = i < 40 ? open : open * (1 + (random() - 0.5) * 0.04);
            px = close;
            return {
              t: (i + (i > 200 ? 2 : 0)) * 60_000,
              o: open,
              c: invalid && i === 130 ? NaN : close,
              h: Math.max(open, close) * 1.002,
              l: Math.min(open, close) * 0.998,
              v: i % 11 ? 100 + random() * 10 : 0,
            };
          }),
        );
        const math = new StreamMath();
        for (let n = 0; n <= b.n; n += n < 90 ? 1 : 7) {
          const bars = prefix(b, n),
            full = new SeriesCache(bars),
            streamed = new SeriesCache(bars).enableStreaming(math);
          const requests: Array<[string, (k: SeriesCache) => unknown]> = [
            ...[2, 14, 80].flatMap((p): Array<[string, (k: SeriesCache) => unknown]> => [
              [`ema-${p}`, (k) => k.ema(p)],
              [`sma-${p}`, (k) => k.sma(p)],
              [`rsi-${p}`, (k) => k.rsi(p)],
              [`atr-${p}`, (k) => k.atr(p)],
              [`atre-${p}`, (k) => k.atrEma(p)],
              [`dmi-${p}`, (k) => k.dmi(p)],
              [`don-${p}`, (k) => k.don(p)],
              [`vwap-${p}`, (k) => k.vwap(p)],
              [`z-${p}`, (k) => k.z(p)],
            ]),
            ["macd", (k) => k.macd()],
            ["bb", (k) => k.bb()],
            ["psar", (k) => k.psar()],
            ["supertrend", (k) => k.st()],
            ["stoch", (k) => k.stoch()],
            ["obv", (k) => k.obv()],
            ["volume", (k) => k.volSma(20)],
            ["roc", (k) => k.roc(20)],
            ["cci", (k) => k.cci(14)],
            ["willr", (k) => k.willr(14)],
            ["mfi", (k) => k.mfi(14)],
            ["cmf", (k) => k.cmf(20)],
            ["stoch-rsi", (k) => k.stochRsi(14)],
            ["aroon", (k) => k.aroon(25)],
            ["kelt", (k) => k.kelt(20, 1.5)],
            ["ichi", (k) => k.ichi(9, 26, 52)],
            ["hma", (k) => k.hma(16)],
            ["trix", (k) => k.trix(15)],
            ["kama", (k) => k.kama(10)],
            ["ha", (k) => k.ha()],
            ["period", (k) => k.period(3_600_000)],
            ["range-sma", (k) => k.rangeSma(20)],
          ];
          for (const [name, request] of requests)
            equal(
              request(streamed),
              request(full),
              `${name}, seed ${seed}, n ${n}, invalid ${invalid}`,
            );
        }
      }
  });
});
