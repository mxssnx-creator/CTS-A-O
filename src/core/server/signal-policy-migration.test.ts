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
it("fresh Signals and Exit use Last-12 while keeping 1m candles and fitting samples", () => {
  const r = open(new CoreDb(":memory:"));
  assert.equal(r.wf.signalLongH, 150);
  assert.equal(r.wf.signalValidLastN, 12);
  assert.equal(r.wf.exitMinTrades, 12);
  assert.equal(MAINNET_SIGNAL_VALID_LAST_N, 12);
  assert.equal(r.settings.gates.baseLastN, 40);
  assert.equal(r.settings.gates.lastNFloor, 9);
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
  const wf = { signalLongH: 336, signalValidLastN: 25, exitMinTrades: 12, rangeOpts: { sig: { validLastN: 25, lastN: 12 } } };
  const custom = { id: "custom", settings: { exitStrategy: { lookbackH: 72, minValidationTrades: 20 } }, wf: { signalLongH: 200, signalValidLastN: 20 } };
  db.kvSet("settings", settings); db.kvSet("wf", wf);
  db.kvSet("presets", [{ id: "factory", settings, wf }, custom]);
  const r = open(db);
  assert.equal(r.wf.signalLongH, 150);
  assert.equal(r.wf.signalValidLastN, 25, "the legacy migration cannot lower a stricter saved sample");
  assert.equal(r.wf.rangeOpts?.sig?.validLastN, 25);
  assert.equal(r.wf.rangeOpts?.sig?.lastN, 12);
  assert.equal(r.wf.exitMinTrades, 12);
  assert.equal(r.settings.signals.hist.lookbackH, 150);
  const presets = db.kvGet<Array<{ wf: typeof wf }>>("presets")!;
  assert.equal(presets[0].wf.signalLongH, 150);
  assert.equal(presets[0].wf.signalValidLastN, 25);
  assert.deepEqual(presets[1], custom);
  assert.deepEqual(db.kvGet<{ wf: unknown }>("signalEvaluation100BackupV1")!.wf, wf);
  r.dispose(); runtimes.splice(runtimes.indexOf(r), 1);
  db.kvSet("wf", { ...wf, signalLongH: 336, signalValidLastN: 12 });
  const reopened = open(db);
  assert.equal(reopened.wf.signalLongH, 336, "new explicit choices after migration are preserved");
  assert.equal(reopened.wf.signalValidLastN, 12);
  assert.equal(defaultWalkForward(DEFAULT_SETTINGS).signalValidLastN, 12);
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

it("migrates undersized validation samples and preserves stricter samples across saved presets", () => {
  const db = new CoreDb(":memory:");
  for (const key of ["signalEvaluation100V1", "signalLast4V1", "signalHistory150V1", "ddtMax35"]) db.kvSet(key, true);
  db.kvSet("wfCapsV", 37);
  const settings = { signals: { guard: { enabled: true, lastN: 4 } },
    exitStrategy: { minValidationTrades: 8 }, gates: { minTrades: 3, baseLastN: 8, lastNFloor: 5 } };
  const wf = { validLastN: 0, signalValidLastN: 4, exitMinTrades: 8, lastN: 6, signalGuardN: 0,
    rangeOpts: { mc: { validLastN: 7, lastN: 8 }, sig: { validLastN: 4, lastN: 0 }, sh: { validLastN: 30 } } };
  const custom = { id: "custom", settings: { signals: { guard: { enabled: false, lastN: 9 } },
    exitStrategy: { minValidationTrades: 20 }, gates: { minTrades: 12, baseLastN: 60, lastNFloor: 0 } },
    wf: { validLastN: 25, signalValidLastN: 20, exitMinTrades: 10 } };
  db.kvSet("settings", settings); db.kvSet("wf", wf);
  const formerMetrics = { pf: 4, pfBasis: "unit-net-returns", gp: 4, gl: 1, n: 12, net: 3,
    perDay: 1, wr: .5, greenHours: .5, period: "old", source: "historical" };
  db.kvSet("presets", [{ id: "former", settings, wf, metrics: formerMetrics }, custom]);
  const backtests = { former: [{ pf: 9 }], custom: [{ pf: 2 }], unidentified: [{ pf: 5 }] };
  const series = { former: { days: 1 }, custom: { days: 2 }, unidentified: { days: 1 } };
  db.kvSet("presetBacktests", backtests); db.kvSet("presetSeries", series);
  const rt = open(db);
  assert.equal(rt.settings.gates.baseLastN, 40);
  assert.equal(rt.settings.gates.minTrades, 12);
  assert.equal(rt.settings.gates.lastNFloor, 9);
  assert.equal(rt.settings.signals.guard.lastN, 12);
  assert.equal(rt.settings.exitStrategy.minValidationTrades, 12);
  assert.equal(rt.wf.validLastN, 12);
  assert.equal(rt.wf.signalValidLastN, 12);
  assert.equal(rt.wf.exitMinTrades, 12);
  assert.equal(rt.wf.lastN, 12);
  assert.equal(rt.wf.rangeOpts?.mc?.validLastN, 12);
  assert.equal(rt.wf.rangeOpts?.mc?.lastN, 12);
  assert.equal(rt.wf.rangeOpts?.sig?.lastN, 0, "an optional extra entry gate may remain off");
  assert.equal(rt.wf.rangeOpts?.sh?.validLastN, 30);
  const presets = db.kvGet<any[]>("presets")!;
  assert.deepEqual(presets[1], custom);
  assert.equal(presets[0].wf.signalValidLastN, 12);
  assert.equal(presets[0].metrics.pf, null);
  assert.equal(presets[0].metrics.pfBasis, "unavailable");
  assert.match(presets[0].metrics.source, /validation policy changed/);
  assert.deepEqual(db.kvGet<any>("validationLast12BackupV1")?.presets[0].metrics, formerMetrics);
  assert.deepEqual(db.kvGet<any>("validationLast12BackupV1")?.wf, wf);
  // The later Micro/Minimal Base-30 migration also retires the custom preset's old Base-60 results.
  assert.deepEqual(db.kvGet("presetBacktests"), {});
  assert.deepEqual(db.kvGet("presetSeries"), {});
  assert.deepEqual(db.kvGet<any>("microMinimalBase30BackupV1")?.presetBacktests, { custom: backtests.custom });
  assert.deepEqual(db.kvGet<any>("validationLast12BackupV1")?.presetBacktests, backtests);
  assert.deepEqual(new Set(db.kvGet<any>("validationLast12BackupV1")?.invalidPresetIds), new Set(["former", "unidentified"]));
  assert.equal(db.kvGet("validationLast12V1"), true);
});

it("rolls back the Last-12 migration and its backup when a write fails", () => {
  const db = new CoreDb(":memory:");
  for (const key of ["signalEvaluation100V1", "signalLast4V1", "signalHistory150V1", "ddtMax35"]) db.kvSet(key, true);
  db.kvSet("wfCapsV", 37);
  const settings = { signals: { guard: { enabled: true, lastN: 4 } } }, wf = { signalValidLastN: 4 };
  db.kvSet("settings", settings); db.kvSet("wf", wf);
  const write = db.kvSet.bind(db);
  db.kvSet = (key, value) => { if (key === "settings") throw new Error("simulated validation migration failure"); write(key, value); };
  assert.throws(() => open(db), /simulated validation migration failure/);
  db.kvSet = write;
  assert.deepEqual(db.kvGet("settings"), settings);
  assert.deepEqual(db.kvGet("wf"), wf);
  assert.equal(db.kvGet("validationLast12BackupV1"), undefined);
  assert.equal(db.kvGet("validationLast12V1"), undefined);
  assert.equal(open(db).wf.signalValidLastN, 12);
});

it("rolls back settings, metrics and caches together when retirement fails", () => {
  const db = new CoreDb(":memory:");
  for (const key of ["signalEvaluation100V1", "signalLast4V1", "signalHistory150V1", "ddtMax35"]) db.kvSet(key, true);
  db.kvSet("wfCapsV", 37);
  const settings = { signals: { guard: { enabled: true, lastN: 4 } } }, wf = { signalValidLastN: 4 };
  const presets = [{ id: "former", settings, wf, metrics: { pf: 2, source: "historical" } }];
  const backtests = { former: [{ pf: 2 }] }, series = { former: { days: 1 } };
  db.kvSet("settings", settings); db.kvSet("wf", wf); db.kvSet("presets", presets);
  db.kvSet("presetBacktests", backtests); db.kvSet("presetSeries", series);
  const write = db.kvSet.bind(db);
  db.kvSet = (key, value) => { if (key === "presetBacktests") throw new Error("simulated cache retirement failure"); write(key, value); };
  assert.throws(() => open(db), /simulated cache retirement failure/);
  db.kvSet = write;
  assert.deepEqual(db.kvGet("settings"), settings);
  assert.deepEqual(db.kvGet("wf"), wf);
  assert.deepEqual(db.kvGet("presets"), presets);
  assert.deepEqual(db.kvGet("presetBacktests"), backtests);
  assert.deepEqual(db.kvGet("presetSeries"), series);
  assert.equal(db.kvGet("validationLast12BackupV1"), undefined);
  assert.equal(db.kvGet("validationLast12V1"), undefined);
  assert.equal(open(db).wf.signalValidLastN, 12);
});
