import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { checkSettings } from "../src/core/settings-check.ts";
import { patchSettings } from "./lib/patch-grid.mjs";

const patch = JSON.parse(readFileSync(new URL("../docs/live-coordination/x02.patch.json", import.meta.url)));
test("the X02 demo WF patch is at the loader's root and applies with unchanged exact-config gates", () => {
  assert.equal(patch.settings.wf, undefined);
  assert.equal(patch.wf.symGate, "off");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { live: { enabled: false } }, { market: "synthetic" });
  const prior = { validLastN: rt.wf.validLastN, lastNMinPf: rt.wf.lastNMinPf, gates: structuredClone(rt.settings.gates) };
  try {
    rt.updateSettings(patchSettings(patch.settings, rt.settings.grid), patch.wf);
    checkSettings(rt.settings);
    assert.equal(rt.settings.live.maxPositions, 100);
    assert.equal(rt.wf.symGate, "off");
    assert.equal(rt.settings.live.maxChase, 5);
    assert.equal(rt.wf.validLastN, prior.validLastN);
    assert.equal(rt.wf.lastNMinPf, prior.lastNMinPf);
    assert.deepEqual(rt.settings.gates, prior.gates);
    assert.equal(rt.settings.live.enabled, false, "loading a profile cannot start native execution");
  } finally { rt.dispose(); rt.db.db.close(); }
});
test("the demo override is isolated from the factory defaults and X01 patch", () => {
  const x01 = JSON.parse(readFileSync(new URL("../docs/live-coordination/signals.patch.json", import.meta.url)));
  assert.notEqual(DEFAULT_SETTINGS.live.maxChase, 5);
  assert.notEqual(x01.settings.live.maxChase, 5);
  assert.notEqual(x01.wf?.symGate, "off");
});
