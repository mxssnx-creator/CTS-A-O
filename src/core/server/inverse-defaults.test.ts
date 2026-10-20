import { test } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { DEFAULT_SETTINGS, PREVIOUS_DEFAULT_FOCUS_20OCT, PREVIOUS_INVERSE_FOCUS_20OCT, INVERSE_FOCUS_20OCT } from "../config.ts";
import { INVERSE_CONFIG_IDS } from "../indications/inverse-config.ts";
import { allCombos, microLaneFloor } from "../pipeline/pipeline.ts";
import { checkSettings } from "../settings-check.ts";

test("Inverse joins the factory Focus and upgrades only the former factory selection, including presets", () => {
  assert.equal(INVERSE_FOCUS_20OCT.length, 114);
  assert.deepEqual(DEFAULT_SETTINGS.focus, [...PREVIOUS_DEFAULT_FOCUS_20OCT, ...INVERSE_FOCUS_20OCT]);
  checkSettings(DEFAULT_SETTINGS);
  const combos = allCombos(DEFAULT_SETTINGS.focus, [], DEFAULT_SETTINGS.tfs, microLaneFloor(DEFAULT_SETTINGS.grid));
  for (const id of INVERSE_CONFIG_IDS) assert.ok(combos.some((c) => c.ind.startsWith(`${id}@m`)), id);
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 35);
  db.kvSet("settings", { focus: [...PREVIOUS_DEFAULT_FOCUS_20OCT], disabledKinds: ["inverse"] });
  db.kvSet("presets", [
    { id: "factory", settings: { focus: [...PREVIOUS_DEFAULT_FOCUS_20OCT] }, wf: {} },
    { id: "custom", settings: { focus: ["follow|ema-9-21"] }, wf: {} },
    { id: "all", settings: { focus: [] }, wf: {} },
  ]);
  const runtime = new CoreRuntime(db, undefined, { market: "synthetic" });
  try {
    assert.deepEqual(runtime.settings.focus, DEFAULT_SETTINGS.focus);
    assert.ok(runtime.settings.disabledKinds.includes("inverse"), "a deliberately disabled type stays disabled");
    assert.equal(db.kvGet("wfCapsV"), 37);
    const presets = db.kvGet<Array<{ settings: { focus: string[] } }>>("presets")!;
    assert.deepEqual(presets[0].settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(presets[1].settings.focus, ["follow|ema-9-21"]);
    assert.deepEqual(presets[2].settings.focus, []);
  } finally { runtime.dispose(); }
});

test("the published 102-identity factory selection upgrades at v37 without changing custom or off selections", () => {
  assert.equal(PREVIOUS_INVERSE_FOCUS_20OCT.length, 199);
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 36);
  db.kvSet("settings", { focus: [...PREVIOUS_INVERSE_FOCUS_20OCT], disabledKinds: ["inverse"] });
  db.kvSet("presets", [
    { id: "factory", settings: { focus: [...PREVIOUS_INVERSE_FOCUS_20OCT] }, wf: {} },
    { id: "custom", settings: { focus: ["follow|inverse-math-zscore-20"] }, wf: {} },
    { id: "all", settings: { focus: [] }, wf: {} },
  ]);
  const runtime = new CoreRuntime(db, undefined, { market: "synthetic" });
  try {
    assert.equal(runtime.settings.focus.length, 211);
    assert.deepEqual(runtime.settings.focus, DEFAULT_SETTINGS.focus);
    assert.ok(runtime.settings.disabledKinds.includes("inverse"));
    const presets = db.kvGet<Array<{ settings: { focus: string[] } }>>("presets")!;
    assert.deepEqual(presets[0].settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(presets[1].settings.focus, ["follow|inverse-math-zscore-20"]);
    assert.deepEqual(presets[2].settings.focus, []);
    assert.equal(db.kvGet("wfCapsV"), 37);
  } finally { runtime.dispose(); }
});
