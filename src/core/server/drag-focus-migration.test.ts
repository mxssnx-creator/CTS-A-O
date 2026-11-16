import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS, PRE_DRAG_FACTORY_FOCUS } from "../config.ts";
import { dragReferenceSelection } from "../indications/drag.ts";
import { CoreDb } from "./db.server.ts";
import { DRAG_FOCUS_BACKUP, DRAG_FOCUS_FLAG, migrateDragFactoryFocus } from "./drag-focus-migration.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("BTC selection keeps user symbols, recognizes aliases and does not overflow a full list", () => {
  assert.deepEqual(dragReferenceSelection(["xrp", "btc"]), { symbols: ["xrp", "btc"], included: true });
  assert.deepEqual(dragReferenceSelection(["XRP-USDT"]), { symbols: ["XRP-USDT", "BTC-USDT"], included: true });
  const full = Array.from({ length: 50 }, (_, i) => `SYM${i}`);
  assert.deepEqual(dragReferenceSelection(full), { symbols: full, included: false });
});

test("the exact former factory focus migrates once, preserves choices and invalidates changed preset PF", () => {
  const db = new CoreDb(":memory:");
  const oldSettings = { focus: [...PRE_DRAG_FACTORY_FOCUS], forceSymbols: ["XRP-USDT", "SOL"], disabledKinds: ["drag"] };
  const full = Array.from({ length: 50 }, (_, i) => `SYM${i}`);
  const metrics = { pf: 1.8, pfBasis: "unit-net-returns", gp: 18, gl: 10, source: "old run" };
  const oldPresets = [
    { id: "factory", settings: { focus: [...PRE_DRAG_FACTORY_FOCUS], forceSymbols: ["btc"] }, metrics },
    { id: "full", settings: { focus: [...PRE_DRAG_FACTORY_FOCUS], forceSymbols: full }, metrics },
    { id: "custom", settings: { focus: ["follow|ema-9-21"], forceSymbols: ["XRP"] }, metrics },
    { id: "off", settings: { focus: [], forceSymbols: [] }, metrics },
    { id: "reordered", settings: { focus: [...PRE_DRAG_FACTORY_FOCUS].reverse() }, metrics },
  ];
  db.kvSet("settings", structuredClone(oldSettings));
  db.kvSet("presets", structuredClone(oldPresets));
  try {
    migrateDragFactoryFocus(db);
    const settings = db.kvGet<typeof oldSettings>("settings")!;
    assert.deepEqual(settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(settings.forceSymbols, ["XRP-USDT", "SOL", "BTC-USDT"]);
    assert.deepEqual(settings.disabledKinds, ["drag"]);
    const presets = db.kvGet<Array<{ settings: { focus: string[]; forceSymbols?: string[] }; metrics: Record<string, unknown> }>>("presets")!;
    assert.deepEqual(presets[0].settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(presets[0].settings.forceSymbols, ["btc"]);
    assert.equal(presets[0].metrics.pf, null);
    assert.equal(presets[0].metrics.pfBasis, "unavailable");
    assert.equal(presets[0].metrics.gp, undefined);
    assert.deepEqual(presets[1].settings.forceSymbols, full);
    assert.deepEqual(presets.slice(2), oldPresets.slice(2));
    assert.deepEqual(db.kvGet(DRAG_FOCUS_BACKUP), { settings: oldSettings, presets: oldPresets });
    assert.equal(db.kvGet(DRAG_FOCUS_FLAG), true);
    db.kvSet("settings", oldSettings);
    migrateDragFactoryFocus(db);
    assert.deepEqual(db.kvGet("settings"), oldSettings, "a subsequent explicit choice is not overwritten");
  } finally { db.db.close(); }
});

test("the factory migration is atomic when a write fails", () => {
  const db = new CoreDb(":memory:");
  const old = { focus: [...PRE_DRAG_FACTORY_FOCUS], forceSymbols: ["XRP"] };
  db.kvSet("settings", old);
  const set = db.kvSet.bind(db);
  db.kvSet = (key, value) => {
    if (key === DRAG_FOCUS_FLAG) throw new Error("injected write failure");
    return set(key, value);
  };
  try {
    assert.throws(() => migrateDragFactoryFocus(db), /injected write failure/);
    assert.deepEqual(db.kvGet("settings"), old);
    assert.equal(db.kvGet(DRAG_FOCUS_BACKUP), undefined);
    assert.equal(db.kvGet(DRAG_FOCUS_FLAG), undefined);
  } finally { db.kvSet = set; db.db.close(); }
});

test("a runtime on the previous factory selection enables Drag while retaining explicit disabled kinds", () => {
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 38);
  db.kvSet("microBreakoutFocusV1", true);
  db.kvSet("microContextFocusV1", true);
  db.kvSet("settings", { focus: [...PRE_DRAG_FACTORY_FOCUS], forceSymbols: ["XRP"], disabledKinds: ["inverse"] });
  const runtime = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  try {
    assert.deepEqual(runtime.settings.focus, DEFAULT_SETTINGS.focus);
    assert.deepEqual(runtime.settings.forceSymbols, ["XRP", "BTC-USDT"]);
    assert.deepEqual(runtime.settings.disabledKinds, ["inverse"]);
  } finally { runtime.dispose(); db.db.close(); }
});
