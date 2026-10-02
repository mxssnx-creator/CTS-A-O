// Saved live coordinations: offered first, valid settings, and applying one sets exactly the saved coordination.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ALL_RESEARCH_PRESETS } from "./presets.ts";
import { LIVE_COORD_PRESETS } from "./presets.live.ts";
import { checkSettings } from "./settings-check.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";

describe("saved live coordinations", () => {
  it("are offered first and carry valid settings, never the Live stage", () => {
    assert.equal(ALL_RESEARCH_PRESETS[0].id, "live-all-independent");
    for (const p of LIVE_COORD_PRESETS) {
      assert.doesNotThrow(() => checkSettings(p.settings as never), p.id);
      assert.equal((p.settings as { live?: unknown }).live, undefined, `${p.id} has no Live stage`);
    }
  });

  it("applying live-all-independent sets the saved coordination", () => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic" });
    rt.stop();
    rt.applyPreset("live-all-independent");
    assert.equal(rt.settings.gates.minPf, 1.05);
    assert.deepEqual(rt.settings.disabledKinds, []);
    assert.equal(Object.values(rt.settings.toggles).every(Boolean), true);
    assert.deepEqual(rt.settings.forceSymbols, ["XRP-USDT", "SOL-USDT", "BCH-USDT"]);
    for (const k of ["micro", "minimal", "short", "general", "long"] as const)
      assert.notEqual((rt.settings.grid as Record<string, unknown>)[k], false, `${k} on`);
    assert.equal(rt.wf.maxPositions, 0);
    assert.equal(rt.wf.coord?.enabled, false);
    assert.equal(rt.wf.signalValidLastN, 10);
    rt.shutdown("test");
  });
});
