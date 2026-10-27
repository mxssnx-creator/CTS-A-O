// Synthetic 50-symbol, eight-source Relate benchmark. No financial or exchange-performance claim.
// node --experimental-strip-types --no-warnings scripts/perf/relate-bench.ts
import { DEFAULT_RELATE_ADJUSTMENT } from "../../src/core/config.ts";
import { RelateBook, type RelateIdentity } from "../../src/core/sim/relate-volume.ts";

const book = new RelateBook({ ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: true });
const identities: RelateIdentity[] = Array.from({ length: 50 }, (_, n) => ({
  cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc", sym: `S${n}-USDT`, side: 1,
  ind: "ema-9-21@m1", strategy: "normal", coordination: "ordinary", range: "mc",
}));
const add = (identity: RelateIdentity, n: number) => book.add({ ...identity, r: n % 5 ? 0.005 : -0.004,
  accepted: true, relateMeasured: true, relateBase: 1 });
const now = () => performance.now();
const t0 = now();
for (let n = 0; n < 250; n++) for (const identity of identities) add(identity, n);
const t1 = now();
for (const identity of identities) book.decide(identity);
const t2 = now();
for (const identity of identities) book.decide(identity);
const t3 = now();
const samples: number[] = [];
for (let n = 0; n < 500; n++) {
  const identity = identities[n % identities.length];
  const start = now();
  add(identity, n);
  book.decide(identity);
  samples.push(now() - start);
}
samples.sort((a, b) => a - b);
const t4 = now();
console.log(JSON.stringify({
  benchmark: "synthetic Relate eight-source Auto",
  symbols: identities.length, acceptedBootstrapCloses: 12_500, updateAndDecisionCount: samples.length,
  bootstrapMs: +(t1 - t0).toFixed(3), coldDecisionsMs: +(t2 - t1).toFixed(3),
  cachedDecisionsMs: +(t3 - t2).toFixed(3), updatesAndDecisionsMs: +(t4 - t3).toFixed(3),
  updateAndDecisionMedianMs: +samples[Math.floor(samples.length * 0.5)].toFixed(3),
  updateAndDecisionP95Ms: +samples[Math.floor(samples.length * 0.95)].toFixed(3),
  maxRssMiB: +(process.resourceUsage().maxRSS / 1024).toFixed(1),
  summary: book.summary(),
}, null, 2));
