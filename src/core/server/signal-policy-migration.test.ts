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
it("fresh Signals and Exit use 150h / Last-4 while keeping 1m candles and fitting samples", () => {
  const r = open(new CoreDb(":memory:"));
  assert.equal(r.wf.signalLongH, 150);
  assert.equal(r.wf.signalValidLastN, 4);
  assert.equal(r.wf.exitMinTrades, 4);
  assert.equal(MAINNET_SIGNAL_VALID_LAST_N, 4);
  assert.equal(r.settings.signals.hist.lookbackH, 150);
  assert.equal(r.settings.signals.hist.minN, 30);
  assert.equal(r.settings.exitStrategy.lookbackH, 150);
  assert.equal(r.settings.tfMin, 1);
  assert.ok(signalDataHours(r.settings, r.wf) >= 150 + r.wf.simH + 24);
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
  assert.equal(r.wf.signalLongH, 150);
  assert.equal(r.wf.signalValidLastN, 4);
  assert.equal(r.wf.rangeOpts?.sig?.validLastN, 4);
  assert.equal(r.wf.rangeOpts?.sig?.lastN, 4);
  assert.equal(r.wf.exitMinTrades, 4);
  assert.equal(r.settings.signals.hist.lookbackH, 150);
  const presets = db.kvGet<Array<{ wf: typeof wf }>>("presets")!;
  assert.equal(presets[0].wf.signalLongH, 150);
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

it("backs up and upgrades saved 100h desks/presets once without changing custom horizons", () => {
  const db = new CoreDb(":memory:");
  db.kvSet("signalEvaluation100V1", true);
  db.kvSet("signalLast4V1", true);
  db.kvSet("wfCapsV", 37);
  db.kvSet("ddtMax35", true);
  db.kvSet("settings", { signals: { hist: { lookbackH: 100 } }, exitStrategy: { lookbackH: 100 } });
  db.kvSet("wf", { signalLongH: 100 });
  db.kvSet("presets", [{ id: "former", settings: { signals: { hist: { lookbackH: 100 } } }, wf: { signalLongH: 100 } },
    { id: "custom", settings: { signals: { hist: { lookbackH: 72 } } }, wf: { signalLongH: 200 } }]);
  const rt = open(db);
  assert.equal(rt.wf.signalLongH, 150);
  assert.equal(rt.settings.signals.hist.lookbackH, 150);
  assert.equal(rt.settings.exitStrategy.lookbackH, 150);
  const ps = db.kvGet<any[]>("presets")!;
  assert.equal(ps[0].wf.signalLongH, 150);
  assert.equal(ps[1].wf.signalLongH, 200);
  assert.equal(ps[1].settings.signals.hist.lookbackH, 72);
  assert.equal(db.kvGet<any>("signalHistory150BackupV1")?.wf.signalLongH, 100);
  rt.dispose(); runtimes.splice(runtimes.indexOf(rt), 1);
  db.kvSet("wf", { signalLongH: 100 });
  assert.equal(open(db).wf.signalLongH, 100, "later deliberate choices are preserved");
});
