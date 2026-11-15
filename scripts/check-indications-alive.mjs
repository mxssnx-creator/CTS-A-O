#!/usr/bin/env node
// Smoke check: every registered indication must produce signals on a realistic synthetic 1-minute series.
// A "dead" indication (no +1/-1 at all) can never qualify; it is listed, not silently skipped.
//   node --experimental-strip-types --no-warnings scripts/check-indications-alive.mjs
const { INDICATIONS } = await import("../src/core/indications/registry.ts");
const { barsFromCandles, syntheticCandles } = await import("../src/core/market/bars.ts");
const { SeriesCache } = await import("../src/core/indications/cache.ts");
const b = barsFromCandles("SYN-USDT", 1, syntheticCandles("SYN-USDT", 1, 20_000, Date.UTC(2026, 9, 1), 7));
const dead = [], alive = [];
for (const spec of INDICATIONS) {
  let sig;
  try { sig = spec.fn(new SeriesCache(b)); } catch (e) { dead.push(`${spec.id} (error: ${String(e.message).slice(0, 80)})`); continue; }
  let n = 0;
  for (let i = 0; i < sig.length; i++) if (sig[i] !== 0) n++;
  (n === 0 ? dead : alive).push(n === 0 ? spec.id : `${spec.id} ${n}`);
}
console.log(`indications ${INDICATIONS.length}: alive ${alive.length}, dead ${dead.length}`);
for (const d of dead) console.log("DEAD", d);
