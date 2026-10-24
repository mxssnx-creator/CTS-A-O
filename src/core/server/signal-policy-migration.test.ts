import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime, MAINNET_SIGNAL_VALID_LAST_N, signalDataHours } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward } from "../sim/walkforward.ts";

const runtimes: CoreRuntime[] = [];
afterEach(() => { for (const r of runtimes.splice(0)) r.dispose(); });
function open(db: CoreDb) {
  const r = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  r.stop(); runtimes.push(r); return r;
}
it("fresh Signals and Exit use 100h / Last-4 while keeping 1m candles and fitting samples", () => {
  const r = open(new CoreDb(":memory:"));
  assert.equal(r.wf.signalLongH, 100);
  assert.equal(r.wf.signalValidLastN, 4);
  assert.equal(r.wf.exitMinTrades, 4);
  assert.equal(MAINNET_SIGNAL_VALID_LAST_N, 4);
  assert.equal(r.settings.signals.hist.lookbackH, 100);
  assert.equal(r.settings.signals.hist.minN, 30);
  assert.equal(r.settings.exitStrategy.lookbackH, 100);
  assert.equal(r.settings.tfMin, 1);
  assert.ok(signalDataHours(r.settings, r.wf) >= 100 + r.wf.simH + 24);
});
it("upgrades old saved settings and presets once, preserves custom choices and a backup", () => {
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 37); db.kvSet("ddtMax35", true);
  const settings = { signals: { hist: { lookbackH: 0 } }, exitStrategy: { lookbackH: 168, minValidationTrades: 12 } };
  const wf = { signalLongH: 336, signalValidLastN: 25, exitMinTrades: 12, rangeOpts: { sig: { validLastN: 12, lastN: 12 } } };
  const custom = { id: "custom", settings: { exitStrategy: { lookbackH: 72, minValidationTrades: 20 } }, wf: { signalLongH: 200, signalValidLastN: 20 } };
  db.kvSet("settings", settings); db.kvSet("wf", wf);
  db.kvSet("presets", [{ id: "factory", settings, wf }, custom]);
  const r = open(db);
  assert.equal(r.wf.signalLongH, 100);
  assert.equal(r.wf.signalValidLastN, 4);
  assert.equal(r.wf.rangeOpts?.sig?.validLastN, 4);
  assert.equal(r.wf.rangeOpts?.sig?.lastN, 4);
  assert.equal(r.wf.exitMinTrades, 4);
  assert.equal(r.settings.signals.hist.lookbackH, 100);
  const presets = db.kvGet<Array<{ wf: typeof wf }>>("presets")!;
  assert.equal(presets[0].wf.signalLongH, 100);
  assert.equal(presets[0].wf.signalValidLastN, 4);
  assert.deepEqual(presets[1], custom);
  assert.deepEqual(db.kvGet<{ wf: unknown }>("signalEvaluation100BackupV1")!.wf, wf);
  r.dispose(); runtimes.splice(runtimes.indexOf(r), 1);
  db.kvSet("wf", { ...wf, signalLongH: 336, signalValidLastN: 12 });
  const reopened = open(db);
  assert.equal(reopened.wf.signalLongH, 336, "new explicit choices after migration are preserved");
  assert.equal(reopened.wf.signalValidLastN, 12);
  assert.equal(defaultWalkForward(DEFAULT_SETTINGS).signalValidLastN, 4);
});
