import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("DCA upgrades only old factory spacing once, backs up originals and preserves custom uncapped ladders", () => {
  for (const custom of [false, true]) {
    const db = new CoreDb(":memory:");
    const dca = { levels: 1, step: custom ? .03 : .02, addRatio: 2.5, stopGap: .5, slOfTp: 1 };
    db.kvSet("wfCapsV", 37); db.kvSet("ddtMax35", true);
    db.kvSet("settings", { dca });
    const open = () => new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
    const rt = open();
    try {
      assert.equal(rt.settings.dca.levels, custom ? 1 : 2);
      assert.equal(rt.settings.dca.maxDistance, custom ? 0 : .02);
      assert.deepEqual(db.kvGet<{settings:{dca:unknown}}>("dcaTwoStepsBackupV1")!.settings.dca, dca);
      rt.updateSettings({ dca: { levels: 1, step: .015, maxDistance: 0 } });
    } finally { rt.dispose(); }
    const again = open();
    try { assert.equal(again.settings.dca.levels, 1); assert.equal(again.settings.dca.maxDistance, 0); }
    finally { again.dispose(); db.db.close(); }
  }
});
