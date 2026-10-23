#!/usr/bin/env node
// One-minute historic excursion benchmark. Scalar output parity is mandatory before timing is reported.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { entryMfes } from "../../src/core/signal-hist.ts";
import { barsFromCandles, syntheticCandles } from "../../src/core/market/bars.ts";
import type { Bars } from "../../src/core/domain/types.ts";

function scalar(b: Bars, sig: Int8Array, hold: number, cutT: number) {
  const out: number[] = [];
  for (let i = 0; i + hold < b.n; i++) {
    if (!sig[i]) continue;
    if (b.t[i + hold] + 60_000 > cutT) break;
    const e = b.o[i + 1]; if (!(e > 0)) continue;
    let m = 0;
    for (let j = i + 1; j <= i + hold; j++) {
      const x = sig[i] > 0 ? b.h[j] / e - 1 : 1 - b.l[j] / e;
      if (x > m) m = x;
    }
    out.push(m);
  }
  return out;
}
const results = [];
for (const hours of [100, 336]) {
  const bars = Array.from({ length: 12 }, (_, i) => barsFromCandles(`BENCH-${i}`, 1,
    syntheticCandles(`BENCH-${i}`, 1, hours * 60, Date.UTC(2026, 9, 17), i + 1)));
  const sig = Int8Array.from({ length: hours * 60 }, (_, i) => i % 3 === 0 ? (i % 2 ? -1 : 1) : 0);
  const hold = Math.round(Math.min(48, hours / 4) * 60);
  const reference = bars.map((b) => scalar(b, sig, hold, Infinity));
  assert.deepEqual(bars.map((b) => entryMfes(b, sig, hold, Infinity)), reference);
  const timings: Record<string, number[]> = { scalar: [], rolling: [] };
  for (let repeat = 0; repeat < 3; repeat++) for (const [name, fn] of [["scalar", scalar], ["rolling", entryMfes]] as const) {
    const started = performance.now();
    for (const b of bars) fn(b, sig, hold, Infinity);
    timings[name].push(performance.now() - started);
  }
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[1];
  results.push({ hours, timeframeMinutes: 1, symbols: bars.length, holdBars: hold,
    excursions: reference.reduce((n, xs) => n + xs.length, 0), timings,
    scalarMedianMs: median(timings.scalar), rollingMedianMs: median(timings.rolling),
    speedup: median(timings.scalar) / median(timings.rolling),
    resultSha256: createHash("sha256").update(JSON.stringify(reference)).digest("hex"), exactParity: true });
}
console.log(JSON.stringify({ classification: "synthetic CPU benchmark; no trading performance claim", results }, null, 2));
