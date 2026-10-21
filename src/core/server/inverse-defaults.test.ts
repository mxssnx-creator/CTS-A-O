import { test } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import {
  DEFAULT_SETTINGS,
  PREVIOUS_DEFAULT_FOCUS_20OCT,
  PREVIOUS_INVERSE_FOCUS_20OCT,
  PREVIOUS_MICRO_FOCUS_21OCT,
  INVERSE_FOCUS_20OCT,
} from "../config.ts";
import { MICRO_CONFIG_IDS, INVERSE_MICRO_CONFIG_IDS } from "../indications/micro-family.ts";
import { INVERSE_CONFIG_IDS } from "../indications/inverse-config.ts";
import { PRE_CONTEXT_FOCUS_21OCT } from "../indications/context-default-focus.ts";
import { allCombos, microLaneFloor } from "../pipeline/pipeline.ts";
import { checkSettings } from "../settings-check.ts";

test("Inverse joins the factory Focus and upgrades only the former factory selection, including presets", () => {
  assert.equal(INVERSE_FOCUS_20OCT.length, 114);
  assert.deepEqual(DEFAULT_SETTINGS.focus, [
    ...PREVIOUS_DEFAULT_FOCUS_20OCT,
    ...INVERSE_FOCUS_20OCT,
    ...MICRO_CONFIG_IDS.map((id) => `follow|${id}`),
    ...INVERSE_MICRO_CONFIG_IDS.map((id) => `follow|${id}`),
  ]);
  checkSettings(DEFAULT_SETTINGS);
  const combos = allCombos(
    DEFAULT_SETTINGS.focus,
    [],
    DEFAULT_SETTINGS.tfs,
    microLaneFloor(DEFAULT_SETTINGS.grid),
  );
  for (const id of INVERSE_CONFIG_IDS)
    assert.ok(
      combos.some((c) => c.ind.startsWith(`${id}@m`)),
      id,
    );
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
    assert.ok(
      runtime.settings.disabledKinds.includes("inverse"),
      "a deliberately disabled type stays disabled",
    );
    assert.equal(db.kvGet("wfCapsV"), 37);
    const presets = db.kvGet<Array<{ settings: { focus: string[] } }>>("presets")!;
    assert.deepEqual(presets[0].settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(presets[1].settings.focus, ["follow|ema-9-21"]);
    assert.deepEqual(presets[2].settings.focus, []);
  } finally {
    runtime.dispose();
  }
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
    assert.equal(runtime.settings.focus.length, 1191);
    assert.deepEqual(runtime.settings.focus, DEFAULT_SETTINGS.focus);
    assert.ok(runtime.settings.disabledKinds.includes("inverse"));
    const presets = db.kvGet<Array<{ settings: { focus: string[] } }>>("presets")!;
    assert.deepEqual(presets[0].settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(presets[1].settings.focus, ["follow|inverse-math-zscore-20"]);
    assert.deepEqual(presets[2].settings.focus, []);
    assert.equal(db.kvGet("wfCapsV"), 37);
  } finally {
    runtime.dispose();
  }
});

test("the exact pre-context factory upgrades once while custom, reordered, off and disabled choices survive", () => {
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 37);
  db.kvSet("ddtMax35", true);
  db.kvSet("microBreakoutFocusV1", true);
  const reversed = [...PRE_CONTEXT_FOCUS_21OCT].reverse();
  db.kvSet("settings", {
    focus: [...PRE_CONTEXT_FOCUS_21OCT],
    disabledKinds: ["inverse", "tactic"],
  });
  db.kvSet("presets", [
    { id: "factory", settings: { focus: [...PRE_CONTEXT_FOCUS_21OCT] }, wf: {} },
    { id: "custom", settings: { focus: ["follow|ema-9-21"] }, wf: {} },
    { id: "off", settings: { focus: [] }, wf: {} },
    { id: "reordered", settings: { focus: reversed }, wf: {} },
  ]);
  const runtime = new CoreRuntime(db, undefined, { market: "synthetic" });
  try {
    assert.deepEqual(runtime.settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(runtime.settings.disabledKinds, ["inverse", "tactic"]);
    const presets = db.kvGet<Array<{ settings: { focus: string[] } }>>("presets")!;
    assert.deepEqual(
      presets.map((p) => p.settings.focus),
      [DEFAULT_SETTINGS.focus, ["follow|ema-9-21"], [], reversed],
    );
    assert.equal(db.kvGet("microContextFocusV1"), true);
    db.kvSet("settings", { focus: [...PRE_CONTEXT_FOCUS_21OCT] });
    const restarted = new CoreRuntime(db, undefined, { market: "synthetic" });
    try {
      assert.deepEqual(restarted.settings.focus, PRE_CONTEXT_FOCUS_21OCT);
    } finally {
      restarted.dispose();
    }
  } finally {
    runtime.dispose();
  }
});

test("the saved 939-entry Micro factory upgrades once, preserving custom/off choices and disabled types", () => {
  assert.equal(PREVIOUS_MICRO_FOCUS_21OCT.length, 939);
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 37);
  db.kvSet("ddtMax35", true);
  db.kvSet("settings", { focus: [...PREVIOUS_MICRO_FOCUS_21OCT], disabledKinds: ["inverse"] });
  db.kvSet("presets", [
    { id: "factory", settings: { focus: [...PREVIOUS_MICRO_FOCUS_21OCT] }, wf: {} },
    { id: "custom", settings: { focus: ["follow|ema-9-21"] }, wf: {} },
    { id: "off", settings: { focus: [] }, wf: {} },
  ]);
  const runtime = new CoreRuntime(db, undefined, { market: "synthetic" });
  try {
    assert.deepEqual(runtime.settings.focus, DEFAULT_SETTINGS.focus);
    assert.ok(runtime.settings.focus.includes("follow|inverse-micro-1-break-channel-short-fast"));
    assert.deepEqual(runtime.settings.disabledKinds, ["inverse"]);
    const presets = db.kvGet<Array<{ settings: { focus: string[] } }>>("presets")!;
    assert.deepEqual(
      presets.map((p) => p.settings.focus),
      [DEFAULT_SETTINGS.focus, ["follow|ema-9-21"], []],
    );
    assert.equal(db.kvGet("microBreakoutFocusV1"), true);
    // A choice made after this migration is not silently upgraded on another restart.
    db.kvSet("settings", { focus: [...PREVIOUS_MICRO_FOCUS_21OCT] });
    const restarted = new CoreRuntime(db, undefined, { market: "synthetic" });
    try {
      assert.deepEqual(restarted.settings.focus, PREVIOUS_MICRO_FOCUS_21OCT);
    } finally {
      restarted.dispose();
    }
  } finally {
    runtime.dispose();
  }
});
