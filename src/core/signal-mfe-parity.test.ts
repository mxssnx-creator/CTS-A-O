import assert from "node:assert/strict";
import { it } from "node:test";
import { entryMfes } from "./signal-hist.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import type { Bars } from "./domain/types.ts";

// Independent scalar oracle: the original definition, including malformed-price comparison semantics.
function scalar(b: Bars, sig: Int8Array, hold: number, cutT: number, fromT: number) {
  const out: number[] = [];
  for (let i = 0; i + hold < b.n; i++) {
    if (!sig[i] || b.t[i + 1] < fromT) continue;
    if (b.t[i + hold] + b.tfMin * 60_000 > cutT) break;
    const e = b.o[i + 1];
    if (!(e > 0)) continue;
    let m = 0;
    for (let j = i + 1; j <= i + hold; j++) {
      const x = sig[i] > 0 ? b.h[j] / e - 1 : 1 - b.l[j] / e;
      if (x > m) m = x;
    }
    out.push(m);
  }
  return out;
}

for (const tf of [1, 5, 15, 30]) for (const stride of [1, 7, 137]) {
  it(`rolling MFE equals every scalar result: ${tf}m, signal stride ${stride}`, () => {
    const b = barsFromCandles("MFE", tf, syntheticCandles("MFE", tf, 2000, Date.UTC(2026, 9, 17)));
    const sig = Int8Array.from({ length: b.n }, (_, i) => i % stride ? 0 : i % 2 ? -1 : 1);
    // Exercise NaN, infinite/zero entries, ties, and non-overlapping windows.
    b.h[140] = NaN; b.l[151] = NaN; b.h[165] = Infinity; b.l[175] = -Infinity;
    b.o[138] = Infinity; b.o[274] = 0; b.o[301] = NaN;
    for (const hold of [1, 2, 30, 1000]) for (const from of [0, 100, 1450]) {
      const cutT = b.t[1800] + tf * 60_000;
      const expected = scalar(b, sig, hold, cutT, b.t[from]);
      const out = [123];
      assert.equal(entryMfes(b, sig, hold, cutT, out, b.t[from]), out);
      assert.deepEqual(out, [123, ...expected]);
    }
  });
}
