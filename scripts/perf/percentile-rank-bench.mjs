// Reproducible exactness and timing check for the bounded causal volatility percentile.
// node --experimental-strip-types --no-warnings scripts/perf/percentile-rank-bench.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pastPercentileRank } from '../../src/core/indications/filters.ts';
const n = 20_000, p = 336, repeats = 10;
let seed = 743;
const x = Float64Array.from({ length: n }, (_, i) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return i % 89 === 0 ? NaN : Math.round(seed / 2 ** 32 * 5000) / 100000;
});
const scalar = () => {
  const out = new Float64Array(n).fill(NaN);
  for (let i = p; i < n; i++) {
    const v = x[i];
    if (!Number.isFinite(v)) continue;
    let below = 0, count = 0;
    for (let j = i - p; j < i; j++) {
      const w = x[j];
      if (!Number.isFinite(w)) continue;
      count++;
      if (w < v) below++;
    }
    if (count > p / 2) out[i] = below / count;
  }
  return out;
};
const rows = [];
for (const [name, fn] of [['scalar', scalar], ['bounded', () => pastPercentileRank(x, p)]]) {
  let out;
  const started = performance.now();
  for (let i = 0; i < repeats; i++) out = fn();
  rows.push({ name, n, p, repeats, ms: Math.round(performance.now() - started),
    sha256: createHash('sha256').update(new Uint8Array(out.buffer)).digest('hex') });
}
assert.equal(rows[0].sha256, rows[1].sha256, 'The optimized rank must match the scalar oracle');
console.log(JSON.stringify(rows));
