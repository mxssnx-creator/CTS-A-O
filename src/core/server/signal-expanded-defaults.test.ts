import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, it } from "node:test";
import { DEFAULT_SIGNALS, PRE_EXPANDED_SIGNAL_SOURCES, SIGNAL_SOURCES, signalSettings } from "../signal-config.ts";
import { signalCombos, signalProtects } from "../signals.ts";
import { checkSettings } from "../settings-check.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const runtimes: CoreRuntime[] = [];
const databases: CoreDb[] = [];
afterEach(() => {
  for (const r of runtimes.splice(0)) r.dispose();
  for (const db of databases.splice(0)) db.db.close();
});
function database() {
  const db = new CoreDb(":memory:"); databases.push(db);
  db.kvSet("wfCapsV", 37); db.kvSet("ddtMax35", true);
  db.kvSet("signalEvaluation100V1", true);
  return db;
}
function open(db = database()) {
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  rt.stop(); runtimes.push(rt); return rt;
}
const former = () => ({ signals: { ...structuredClone(DEFAULT_SIGNALS),
  sources: { ...PRE_EXPANDED_SIGNAL_SOURCES }, lanes: [15], exits: "pct" as const,
  trailRatios: undefined, guard: { enabled: true, lastN: 8 },
  coordination: { ...DEFAULT_SIGNALS.coordination, count: 100 } },
  exitStrategy: { minValidationTrades: 8 },
});

it("fresh Expanded defaults match the verified source/grid catalog with own Last-4", () => {
  const rt = open();
  const recorded = JSON.parse(readFileSync(new URL("../../../docs/signals-coverage-20261023/receipts/final/all-sources/protocol.json", import.meta.url), "utf8"));
  const expected = recorded.actualSettings.signals;
  expected.guard.lastN = 4;
  expected.hist.lookbackH = 150;
  const normalized = { ...rt.settings.signals, sourcesMode: "allow", sources: Object.fromEntries(SIGNAL_SOURCES.map(s => [s.name, true])) };
  assert.deepEqual(normalized, expected);
  assert.deepEqual(signalCombos(rt.settings.signals, rt.settings.tfs), signalCombos(expected, recorded.actualSettings.tfs));
  assert.deepEqual(signalProtects(rt.settings.signals), signalProtects(expected));
  assert.equal(rt.wf.signalValidLastN, 4);
  assert.equal(rt.wf.exitMinTrades, 4);
  assert.equal(rt.settings.exitStrategy.minValidationTrades, 4);
  assert.equal(rt.wf.signalLongH, 150);
  assert.equal(rt.settings.signals.hist.minN, 30);
  assert.equal(rt.settings.gates.minTrades, recorded.actualSettings.gates.minTrades);
  assert.doesNotThrow(() => checkSettings({ signals: rt.settings.signals }));
});

it("allow-lists and disabled sources stay exact, and normalized arrays do not mutate factory settings", () => {
  const one = signalSettings({ sourcesMode: "allow", sources: { "ema-cross": true } });
  assert.equal(signalCombos(one, [1, 5, 15, 30]).length, 8);
  const off = signalSettings({ sources: { aroon: false } });
  assert.ok(!signalCombos(off, [1, 5, 15, 30]).some(x => /^sig-aroon-/.test(x.ind)));
  one.trailRatios!.push(2);
  assert.deepEqual(DEFAULT_SIGNALS.trailRatios, [0.5, 1, 1.5]);
});

it("backs up former saved defaults and presets, migrates Last-8 once, and preserves custom policies", () => {
  const db = database(), settings = former();
  const wf = { signalValidLastN: 8, signalGuardN: 8, exitMinTrades: 8, rangeOpts: { sig: { validLastN: 8, lastN: 8 } } };
  const custom = { id: "custom", settings: { signals: { enabled: false, count: 20,
    sourcesMode: "allow", sources: { aroon: true, sar: false }, lanes: [5], exits: "atr",
    trailRatios: [1.25], guard: { enabled: false, lastN: 9 }, coordination: { count: 70 } },
    exitStrategy: { minValidationTrades: 10 } }, wf: { signalValidLastN: 12, exitMinTrades: 10 } };
  db.kvSet("settings", settings); db.kvSet("wf", wf);
  db.kvSet("presets", [{ id: "factory", settings, wf }, custom]);
  const rt = open(db);
  assert.equal(signalCombos(rt.settings.signals, rt.settings.tfs).length, 884);
  assert.deepEqual(rt.settings.signals.trailRatios, [0.5, 1, 1.5]);
  assert.equal(rt.settings.signals.exits, "both");
  assert.equal(rt.settings.signals.coordination.count, 0);
  assert.equal(rt.wf.rangeOpts?.sig?.validLastN, 4);
  assert.equal(rt.wf.rangeOpts?.sig?.lastN, 4);
  assert.equal(rt.settings.signals.guard.lastN, 4);
  const presets = db.kvGet<Array<{ settings: typeof settings; wf: typeof wf }>>("presets")!;
  assert.deepEqual(presets[1], custom);
  assert.deepEqual(presets[0].settings.signals.lanes, [1, 5, 15, 30]);
  assert.equal(presets[0].wf.signalValidLastN, 4);
  assert.deepEqual(db.kvGet<{ wf: unknown }>("signalLast4BackupV1")!.wf, wf);
  assert.deepEqual(db.kvGet<{ settings: typeof settings }>("signalExpandedDefaultsBackupV1")!.settings.signals.sources, PRE_EXPANDED_SIGNAL_SOURCES);
  rt.dispose(); runtimes.splice(runtimes.indexOf(rt), 1);
  db.kvSet("settings", settings); db.kvSet("wf", wf);
  const reopened = open(db);
  assert.equal(reopened.wf.signalValidLastN, 8, "deliberate post-migration values persist");
  assert.equal(reopened.settings.signals.coordination.count, 100);
  assert.deepEqual(reopened.settings.signals.lanes, [15]);
});

it("does not rewrite a customized former deny-list", () => {
  const db = database(), settings = former();
  settings.signals.sources = { ...settings.signals.sources, sar: false };
  db.kvSet("settings", settings);
  const rt = open(db);
  assert.deepEqual(rt.settings.signals.sources, settings.signals.sources);
});

it("rolls back an incomplete Last-4 settings migration including its backup and completion marker", () => {
  const db = database(), settings = former(), wf = { signalValidLastN: 8 };
  db.kvSet("settings", settings); db.kvSet("wf", wf);
  const write = db.kvSet.bind(db);
  db.kvSet = (key, value) => { if (key === "wf") throw new Error("simulated write failure"); write(key, value); };
  assert.throws(() => open(db), /simulated write failure/);
  db.kvSet = write;
  assert.deepEqual(db.kvGet("settings"), JSON.parse(JSON.stringify(settings)));
  assert.deepEqual(db.kvGet("wf"), wf);
  assert.equal(db.kvGet("signalLast4V1"), undefined);
  assert.equal(db.kvGet("signalLast4BackupV1"), undefined);
  assert.equal(open(db).wf.signalValidLastN, 4);
});
