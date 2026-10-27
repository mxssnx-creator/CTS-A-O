import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  BASE_GATE_VARIANTS,
  baseGateSensitivityGen,
  baseRangeCountsGen,
  baseRangeWhyGen,
} from "./pipeline.ts";

// This digest was recorded from the original synchronous implementation before it was sliced. The fixture includes
// empty, ineligible, missing-range, non-finite, passing and failing cells, and changes in per-indication thresholds.
const originalDigest = "887dfffd420fece7de744a03ef42df260d571293c973b218578f1b82bc8bb89e";
const tags = ["mc", "mn", "sh", "gn", "lg", "mp"];
const inds = ["micro-fake@m1", "inverse-fake@m5", "ema-9-21@m15"];
const stats = (i: number, k: number) => {
  const n = (i + k) % 19;
  const pf = (i + k) % 37 === 0 ? NaN : ((i * 7 + k * 3) % 48) / 10;
  const net = ((i * 11 + k) % 61 - 25) / 10;
  const mdd = (i + k) % 43 === 0 ? NaN : ((i + k) % 13) / 5;
  return { n, pf, net, mdd, gp: Math.max(net, 0) + 0.2, gl: 0.2, bw: { gate: (i + k) % 17 !== 0 } };
};
const runs = Array.from({ length: 4097 }, (_, i) => ({
  ind: inds[i % inds.length],
  full: stats(i, 0),
  ranges: Object.fromEntries(tags.filter((_, j) => (i + j) % 3 !== 0).map((t, j) => [t, stats(i, j + 1)])),
})) as unknown as Parameters<typeof baseRangeCountsGen>[0];
const gates = {
  minPf: 1.1,
  minTrades: 6,
  maxDdr: 2,
  rangeMinPf: { micro: 1.4, minimal: 1.3, short: 1.2 },
  baseWindows: { gate: true },
} as unknown as Parameters<typeof baseRangeWhyGen>[1];
const eligible = (ind: string, tag: string) => !(tag === "mp" && ind.startsWith("inverse"));

function collect<R>(work: Generator<number, R>): R {
  let last = 0;
  for (;;) {
    const step = work.next();
    if (step.done) {
      assert.ok(last > 4097, "the full computation did not provide regular yield points");
      return step.value;
    }
    assert.equal(step.value - last, 128);
    last = step.value;
  }
}

test("sliced Base diagnostics retain the original complete rows and provide bounded work units", () => {
  const value = {
    counts: collect(baseRangeCountsGen(runs, gates, tags, eligible)),
    sensitivity: collect(baseGateSensitivityGen(runs, gates, tags, BASE_GATE_VARIANTS, eligible)),
    why: collect(baseRangeWhyGen(runs, gates, tags, eligible)),
  };
  assert.equal(createHash("sha256").update(JSON.stringify(value)).digest("hex"), originalDigest);
});

test("ineligible ranges still yield regularly rather than monopolizing the event loop", () => {
  const counts = collect(baseRangeCountsGen(runs, gates, tags, () => false));
  const why = collect(baseRangeWhyGen(runs, gates, tags, () => false));
  assert.ok(counts.every((row) => row.evaluated === 0));
  assert.ok(why.every((row) => row.evaluated === 0));
});

test("reported diagnostic work counts only completed pairs", () => {
  for (const generate of [baseRangeCountsGen, baseRangeWhyGen]) {
    let seen = 0;
    const work = generate(runs, gates, [], () => { seen++; return false; });
    for (;;) {
      const step = work.next();
      if (step.done) break;
      assert.equal(step.value, seen);
    }
    assert.equal(seen, runs.length);
  }
});
