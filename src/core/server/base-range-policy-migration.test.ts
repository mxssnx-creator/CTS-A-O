import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

function dbWithPresets() {
  const db = new CoreDb(":memory:");
  // Isolate Base-30 retirement; the separate PF-default migration has its own provenance/rollback tests.
  for (const key of ["signalEvaluation100V1", "signalLast4V1", "signalHistory150V1", "validationLast12V1", "basePf11V1", "ddtMax35"])
    db.kvSet(key, true);
  db.kvSet("wfCapsV", 37);
  const metrics = { pf: 2, pfBasis: "unit-net-returns", gp: 2, gl: 1, n: 20, net: 1,
    perDay: 1, wr: .5, greenHours: .5, period: "old", source: "old" };
  const presets = [
    { id: "affected", settings: {}, metrics },
    { id: "explicit", settings: { gates: { baseRangeLastN: { micro: 40, minimal: 40 } } }, metrics },
    { id: "disabled", settings: { grid: { micro: false, minimal: false } }, metrics },
    { id: "off", settings: { gates: { baseLastN: 0 } }, metrics },
  ];
  const cache = Object.fromEntries([...presets.map((p) => p.id), "unknown"].map((id) => [id, { pf: 2 }]));
  db.kvSet("presets", presets); db.kvSet("presetBacktests", cache); db.kvSet("presetSeries", cache);
  return { db, presets, cache };
}

test("Base-30 migration retires only affected or unidentifiable preset results and preserves a backup", () => {
  const { db, presets, cache } = dbWithPresets();
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    assert.deepEqual(rt.settings.gates.baseRangeLastN, { micro: 30, minimal: 30 });
    const after = db.kvGet<typeof presets>("presets")!;
    assert.equal(after[0].metrics.pf, null);
    assert.equal(after[0].metrics.pfBasis, "unavailable");
    assert.equal(after[1].metrics.pf, 2);
    assert.equal(after[2].metrics.pf, 2);
    assert.equal(after[3].metrics.pf, 2);
    assert.deepEqual(db.kvGet("presetBacktests"), { explicit: cache.explicit, disabled: cache.disabled, off: cache.off });
    assert.deepEqual(db.kvGet<any>("microMinimalBase30BackupV1")?.presets, presets);
    assert.deepEqual(new Set(db.kvGet<any>("microMinimalBase30BackupV1")?.invalidPresetIds), new Set(["affected", "unknown"]));
  } finally { rt.dispose(); db.db.close(); }
});

test("Base-30 cache retirement is atomic", () => {
  const { db, presets, cache } = dbWithPresets();
  const write = db.kvSet.bind(db);
  db.kvSet = (key, value) => { if (key === "presetSeries") throw new Error("retirement failure"); write(key, value); };
  try {
    assert.throws(() => new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null }), /retirement failure/);
    db.kvSet = write;
    assert.deepEqual(db.kvGet("presets"), presets);
    assert.deepEqual(db.kvGet("presetBacktests"), cache);
    assert.deepEqual(db.kvGet("presetSeries"), cache);
    assert.equal(db.kvGet("microMinimalBase30BackupV1"), undefined);
    assert.equal(db.kvGet("microMinimalBase30V1"), undefined);
  } finally { db.db.close(); }
});
