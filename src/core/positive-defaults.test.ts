// Pins the positive coordinations (docs/positive-coordinations.md): a change that switches one off or weakens it
// fails here and has to come with a causal comparison that beats it, recorded in that file.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { coordSettings, DEFAULT_COORD, defaultWalkForward } from "./sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { positiveCoordWarnings, SIGNAL_EVAL_MIN_PF } from "./positive.ts";

describe("positive coordinations stay on", () => {
  it("signal confirmation on; hour lock, cooldown and conflict blocking off", () => {
    assert.deepEqual(
      { enabled: DEFAULT_COORD.enabled, confirm: DEFAULT_COORD.confirm, hourLock: DEFAULT_COORD.hourLock, cooldown: DEFAULT_COORD.cooldown, conflict: DEFAULT_COORD.conflict },
      { enabled: true, confirm: true, hourLock: 0, cooldown: "off", conflict: false },
    );
    // an empty or partial setting keeps them (normalisation never drops confirmation)
    assert.equal(coordSettings({}).confirm, true);
    assert.equal(coordSettings({ hourLock: 0 }).enabled, true);
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(wf.coord?.enabled && wf.coord.confirm, true);
  });

  it("signal acceptance PF 1.3 over 48 h; direction acceptance PF 1.3; own base; volatility floor", () => {
    assert.equal(SIGNAL_EVAL_MIN_PF, 1.3);
    assert.deepEqual(DEFAULT_SIGNALS.accept, { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 });
    assert.equal(DEFAULT_SIGNALS.sideAccept.minPf, 1.3);
    assert.equal(DEFAULT_SIGNALS.ownBase, true);
    assert.equal(DEFAULT_SIGNALS.filter.volFloor, 0.003);
    const n = signalSettings({});
    assert.equal(n.accept.minPf, 1.3);
    assert.equal(n.sideAccept.minPf, 1.3);
  });

  it("Normal and Trailing enabled and running by default; Block Active off (it opens Block-raised entries only)", () => {
    assert.deepEqual(
      { normal: DEFAULT_SETTINGS.toggles.normal, trailing: DEFAULT_SETTINGS.toggles.trailing, blockActive: DEFAULT_SETTINGS.toggles.blockActive },
      { normal: true, trailing: true, blockActive: false },
    );
  });

  it("every config of every validated pair is its own seat, processed independently", () => {
    assert.equal(defaultWalkForward(DEFAULT_SETTINGS).seatPer, "config");
  });

  it("the tape stage builds only the range targets Base validated", () => {
    assert.equal(DEFAULT_SETTINGS.grid.baseTargets, true);
  });

  it("Base builds a pair's sets from PF 1 up, and a check it cannot compute yet counts as valid", () => {
    assert.equal(DEFAULT_SETTINGS.gates.baseSetsMinPf, 1);
    assert.equal(DEFAULT_SETTINGS.gates.warmup, true);
  });

  it("a desk is warned when a setting leaves one off", () => {
    const sig = { ...DEFAULT_SIGNALS, sideAccept: { ...DEFAULT_SIGNALS.sideAccept, enabled: true } };
    const good = { coord: { ...DEFAULT_COORD } };
    assert.deepEqual(positiveCoordWarnings({ signals: sig, toggles: { axis: true, normal: true, trailing: true } }, good), []);
    assert.equal(positiveCoordWarnings({ signals: sig, toggles: { axis: true, normal: false, blockActive: true } }, good).length, 2);
    assert.equal(positiveCoordWarnings({ signals: sig, toggles: { axis: true } }, { ...good, seatPer: "pair" }).length, 1);
    const off = positiveCoordWarnings(
      { signals: { ...sig, accept: { ...sig.accept, minPf: 1.05 } }, toggles: { axis: false } },
      { coord: { ...DEFAULT_COORD, confirm: false } },
    );
    assert.equal(off.length, 3);
    assert.ok(off.every((x) => x.includes("docs/positive-coordinations.md")));
  });
});
