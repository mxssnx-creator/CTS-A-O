import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS, GRID_VARIANTS_MAX } from "./config.ts";
import { signalSettings } from "./signal-config.ts";
import { checkSettings } from "./settings-check.ts";

it("accepts the larger processing ceilings and preserves every accepted historic/trailing list value", () => {
  assert.equal(GRID_VARIANTS_MAX, 100_000);
  const xs = Array.from({ length: 10 }, (_, i) => .2 + i * .05);
  const ratios = Array.from({ length: 10 }, (_, i) => .25 + i * .05);
  const signals = signalSettings({ count: 10_000,
    coordination: { enabled: true, minSources: 3, count: 10_000, volumeFactor: 8,
      ranges: { short: true, normal: true, long: true } },
    hist: { enabled: true, quantiles: xs, trailOfTp: xs, slOfTp: ratios, minN: 30, lookbackH: 100 },
    trailingOnly: { enabled: true, sl: xs.map(x => x / 10), trail: xs.map(x => x / 20), trailStep: 1 },
    trailRatios: [1, 1.5],
  });
  assert.doesNotThrow(() => checkSettings({ signals, exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, maxConfigsPerPair: 512 } }));
  assert.deepEqual(signals.hist.quantiles, xs);
  assert.deepEqual(signals.hist.trailOfTp, xs);
  assert.deepEqual(signals.hist.slOfTp, ratios);
  assert.equal(signals.trailingOnly.sl.length, 10);
  assert.equal(signals.count, 10_000);
  assert.equal(signals.coordination.count, 10_000);
  assert.throws(() => checkSettings({ signals: { ...signals, count: 10_010 } }));
  assert.throws(() => checkSettings({ exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, maxConfigsPerPair: 513 } }));
  assert.throws(() => checkSettings({ signals: { ...signals, trailRatios: [1, 1.5, 2] } }), /grid too large/);
});
