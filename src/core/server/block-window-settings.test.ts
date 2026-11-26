import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("Block Auto settings validate the merged sample window before changing the runtime", () => {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    assert.equal(rt.settings.block.windowAuto, true);
    assert.equal(rt.settings.block.windowIndependent, true);
    assert.equal(rt.settings.block.windowMinSamples, 30);
    const before = structuredClone(rt.settings.block);
    assert.throws(() => rt.updateSettings({ block: { windowMinSamples: 301 } }), /lookback.*minimum/i);
    assert.deepEqual(rt.settings.block, before);
    rt.updateSettings({ block: { windowMinSamples: 301, windowLookback: 400 } });
    assert.equal(rt.settings.block.windowMinSamples, 301);
    assert.equal(rt.settings.block.windowLookback, 400);
    const after = structuredClone(rt.settings.block);
    assert.throws(() => rt.updateSettings({ block: { windowLookback: 300 } }), /lookback.*minimum/i);
    assert.deepEqual(rt.settings.block, after);
  } finally {
    rt.dispose();
    db.db.close();
  }
});
