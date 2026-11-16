import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { SIGNAL_RATE_MIN_DAYS, signalEvaluationPairs, signalSourcesToDrop } from "./signals.ts";
import { checkSettings } from "./settings-check.ts";

const run = (ind: string, bySym: Record<string, { n: number }>, full = { n: 40, net: 5, pf: 1.5 }, bot = "follow") =>
  ({ bot, ind, bySym, full });
const sig = { enabled: true, baseGate: false, minTrades: 3, minPerDay: 2, dropLosing: true };
const days = () => 4;

it("defaults: two signals a day per symbol, losing sources dropped, both settings validated", () => {
  assert.equal(DEFAULT_SIGNALS.minPerDay, 2);
  assert.equal(DEFAULT_SIGNALS.dropLosing, true);
  assert.equal(signalSettings({}).minPerDay, 2);
  assert.equal(signalSettings({ minPerDay: 5, dropLosing: false }).minPerDay, 5);
  assert.doesNotThrow(() => checkSettings({ signals: { minPerDay: 0, dropLosing: false } }));
  assert.doesNotThrow(() => checkSettings({ signals: { minPerDay: 3.5 } }));
  for (const bad of [{ minPerDay: -1 }, { minPerDay: NaN }, { minPerDay: "2" }, { minPerDay: 5000 }, { dropLosing: "yes" }])
    assert.throws(() => checkSettings({ signals: bad as never }), /signal/i, JSON.stringify(bad));
  // the engine's own settings object carries the same defaults
  assert.equal(DEFAULT_SETTINGS.signals.minPerDay, 2);
});

it("a source that fires less than minPerDay on every symbol is dropped; one busy symbol keeps it", () => {
  const runs = [
    run("sig-a@m5", { A: { n: 6 }, B: { n: 7 } }),   // 1.5 and 1.75 a day: too few everywhere
    run("sig-b@m5", { A: { n: 6 }, B: { n: 12 } }),  // 3 a day on B
    run("sig-c@m5", { A: { n: 8 } }),                  // exactly 2 a day
  ];
  const pairs = new Set(runs.map((r) => `${r.bot}|${r.ind}`));
  const drop = signalSourcesToDrop(runs, pairs, sig, days);
  assert.deepEqual([...drop], ["follow|sig-a@m5"]);
});

it("the rate rule is skipped when the history is too short to say anything, and when it is switched off", () => {
  const r = run("sig-a@m5", { A: { n: 1 } });
  const pairs = new Set(["follow|sig-a@m5"]);
  assert.equal(signalSourcesToDrop([r], pairs, { ...sig, dropLosing: false }, () => SIGNAL_RATE_MIN_DAYS / 2).size, 0, "6 h of history");
  assert.equal(signalSourcesToDrop([r], pairs, { ...sig, dropLosing: false }, () => 4).size, 1);
  assert.equal(signalSourcesToDrop([r], pairs, { ...sig, minPerDay: 0, dropLosing: false }, () => 4).size, 0, "off");
});

it("a losing source is dropped only with enough closes; winners and unknowns stay", () => {
  const losing = run("sig-l@m5", { A: { n: 30 } }, { n: 30, net: -4, pf: 0.7 });
  const flat = run("sig-f@m5", { A: { n: 30 } }, { n: 30, net: 0, pf: 0.99 });
  const winning = run("sig-w@m5", { A: { n: 30 } }, { n: 30, net: 6, pf: 1.8 });
  const fewCloses = run("sig-s@m5", { A: { n: 2 } }, { n: 2, net: -1, pf: 0.2 });
  const noPf = run("sig-p@m5", { A: { n: 30 } }, { n: 30, net: -4, pf: NaN });
  const runs = [losing, flat, winning, fewCloses, noPf];
  const pairs = new Set(runs.map((r) => `${r.bot}|${r.ind}`));
  const rateOff = { ...sig, minPerDay: 0 };
  assert.deepEqual([...signalSourcesToDrop(runs, pairs, rateOff, days)].sort(), ["follow|sig-f@m5", "follow|sig-l@m5"]);
  assert.equal(signalSourcesToDrop(runs, pairs, { ...rateOff, dropLosing: false }, days).size, 0, "switched off");
});

it("a coordinator is not a source: it is never filtered by rate or result", () => {
  const coord = run("sig-coord-v2-r70-n2-i1-b3@m5", { A: { n: 1 } }, { n: 40, net: -9, pf: 0.3 });
  assert.equal(signalSourcesToDrop([coord], new Set(["follow|sig-coord-v2-r70-n2-i1-b3@m5"]), sig, days).size, 0);
});

it("signalEvaluationPairs applies the filters with a history, and is unchanged without one", () => {
  const configured = [
    { bot: "follow", ind: "sig-a@m5" }, { bot: "follow", ind: "sig-b@m5" }, { bot: "follow", ind: "sig-nobase@m5" }, { bot: "follow", ind: "rsi-14@m5" },
  ];
  const runs = [run("sig-a@m5", { A: { n: 2 } }), run("sig-b@m5", { A: { n: 40 } })];
  const pass = () => true;
  const all = signalEvaluationPairs(configured as never, runs as never, sig, pass);
  assert.deepEqual([...all].sort(), ["follow|sig-a@m5", "follow|sig-b@m5", "follow|sig-nobase@m5"], "no history function: nothing filtered");
  const filtered = signalEvaluationPairs(configured as never, runs as never, sig, pass, days);
  assert.deepEqual([...filtered].sort(), ["follow|sig-b@m5", "follow|sig-nobase@m5"], "sparse a dropped; a source without Base history is kept");
  assert.equal(signalEvaluationPairs(configured as never, runs as never, { ...sig, enabled: false }, pass, days).size, 0);
});

it("with the Base gate on, the filters apply on top of the representative gate", () => {
  const configured = [{ bot: "follow", ind: "sig-a@m5" }, { bot: "follow", ind: "sig-b@m5" }];
  const runs = [run("sig-a@m5", { A: { n: 40 } }), run("sig-b@m5", { A: { n: 3 } })];
  const out = signalEvaluationPairs(configured as never, runs as never, { ...sig, baseGate: true }, () => true, days);
  assert.deepEqual([...out], ["follow|sig-a@m5"]);
});
