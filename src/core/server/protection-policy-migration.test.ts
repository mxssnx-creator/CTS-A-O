import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { migrateMinimumProtectionPolicy } from "./protection-policy-migration.server.ts";

test("candidate migration rolls back its settings, evidence and completion flag together", () => {
  const db = new CoreDb(":memory:");
  const old = { grid: { slOfTp: [1, 3, 5] } };
  db.kvSet("settings", old);
  db.kvSet("presetSeries", { retained: [1, 2, 3] });
  const set = db.kvSet.bind(db);
  db.kvSet = (key, value) => {
    if (key === "minimumProtectionPolicy20261108") throw new Error("injected write failure");
    return set(key, value);
  };
  try {
    assert.throws(() => migrateMinimumProtectionPolicy(db), /injected write failure/);
    assert.deepEqual(db.kvGet("settings"), old);
    assert.deepEqual(db.kvGet("presetSeries"), { retained: [1, 2, 3] });
    assert.equal(db.kvGet("minimumProtectionPolicy20261108Backup"), undefined);
    assert.equal(db.kvGet("minimumProtectionPolicy20261108"), undefined);
    db.kvSet = set;
    migrateMinimumProtectionPolicy(db);
    assert.equal(db.kvGet("minimumProtectionPolicy20261108"), true);
  } finally { db.db.close(); }
});

test("legacy candidates migrate once, remain editable, and never rewrite owned protection", () => {
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 37); db.kvSet("ddtMax35", true);
  const old = { grid: { micro: { tp: [.002], slOfTp: [1, 3, 5], trailOfTp: [0], minSlNet: .002 },
    lowRange: { enabled: true, slRatios: [.5, 3.5] } } };
  db.kvSet("settings", old);
  const book = { positions: [{ cfg: "old-own-lane", sym: "A-USDT", side: 1, entry: 100, stop: 94, target: 104, entryT: 1, vol: 1 }] };
  db.kvSet("paperBook", book);
  const open = () => new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  const first = open();
  try {
    assert.deepEqual(first.settings.grid.micro && first.settings.grid.micro.slOfTp, [1, 2.5]);
    assert.deepEqual(first.settings.grid.lowRange?.slRatios, [.5, 2.5]);
    assert.equal(first.settings.minSlDistancePct, .1);
    assert.equal(first.paper.positions[0].stop, 94);
    assert.deepEqual(db.kvGet<{settings: unknown}>("minimumProtectionPolicy20261108Backup")?.settings, old);
    first.updateSettings({ minSlDistancePct: .6 });
    assert.equal(first.paper.positions[0].stop, 94);
  } finally { first.dispose(); }
  const second = open();
  try { assert.equal(second.settings.minSlDistancePct, .6); assert.equal(second.paper.positions[0].stop, 94); }
  finally { second.dispose(); db.db.close(); }
});
