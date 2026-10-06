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

  it("keep the positive coordinations on", () => {
    for (const p of LIVE_COORD_PRESETS) {
      const s = p.settings as { toggles?: { blockActive?: boolean } };
      const c = (p.wf as { coord?: { enabled?: boolean; confirm?: boolean } } | undefined)?.coord;
      assert.notEqual(s.toggles?.blockActive, true, `${p.id}: Block Active off`);
      if (c) assert.equal(c.enabled !== false && c.confirm !== false, true, `${p.id}: signal confirmation on`);
    }
  });

  it("applying live-all-independent sets the saved coordination", () => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic" });
    rt.stop();
    rt.applyPreset("live-all-independent");
    assert.equal(rt.settings.gates.minPf, 1.05);
    assert.deepEqual(rt.settings.disabledKinds, []);
    // every strategy type on except Block Active (positive coordination: docs/positive-coordinations.md)
    const { blockActive, ...rest } = rt.settings.toggles;
    assert.equal(blockActive, false);
    assert.equal(Object.values(rest).every(Boolean), true);
    assert.deepEqual(rt.settings.forceSymbols, ["XRP-USDT", "SOL-USDT", "BCH-USDT"]);
    for (const k of ["micro", "minimal", "short", "general", "long"] as const)
      assert.notEqual((rt.settings.grid as unknown as Record<string, unknown>)[k], false, `${k} on`);
    assert.equal(rt.wf.maxPositions, 0);
    // signal confirmation on, hour lock / cooldown / conflict off (positive coordinations)
    assert.equal(rt.wf.coord?.enabled, true);
    assert.equal(rt.wf.coord?.confirm, true);
    assert.equal(rt.wf.coord?.hourLock, 0);
    assert.equal(rt.wf.coord?.cooldown, "off");
    assert.equal(rt.wf.coord?.conflict, false);
    assert.equal(rt.wf.signalValidLastN, 25);
    rt.shutdown("test");
  });
});
