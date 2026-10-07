// Pins the positive coordinations (docs/positive-coordinations.md): a change that switches one off or weakens it
// fails here and has to come with a causal comparison that beats it, recorded in that file.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { coordSettings, DEFAULT_COORD, defaultWalkForward } from "./sim/walkforward.ts";
import { DEFAULT_SETTINGS, GATE_PRESETS, STRATEGY_PRESETS } from "./config.ts";
import { RESEARCH_PRESETS } from "./presets.research.ts";
import { DESK_PRESETS } from "./presets.desk.ts";
import { LIVE_COORD_PRESETS } from "./presets.live.ts";
import { MICRO_RANGE, MICRO_SL } from "./minimal-coord.ts";
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
    // the signals' direction acceptance is a positive coordination: on by default (it was off while the doc said on)
    assert.equal(DEFAULT_SIGNALS.sideAccept.enabled, true);
    assert.equal(signalSettings({}).sideAccept.enabled, true);
    assert.equal(DEFAULT_SIGNALS.ownBase, true);
    assert.equal(DEFAULT_SIGNALS.filter.volFloor, 0.003);
    const n = signalSettings({});
    assert.equal(n.accept.minPf, 1.3);
    assert.equal(n.sideAccept.minPf, 1.3);
  });

  it("engine direction acceptance on: PF 1.05 over 24 h, ≥ 30 closes (operator, 6 Oct); a desk without it is warned", () => {
    assert.deepEqual(defaultWalkForward(DEFAULT_SETTINGS).engineSideAccept, { enabled: true, minPf: 1.05, hours: 24, minTrades: 30 });
    const off = positiveCoordWarnings({}, { engineSideAccept: { enabled: false, minPf: 1.05, hours: 24, minTrades: 30 } });
    assert.ok(off.some((w) => w.includes("engine direction acceptance is off")));
    assert.ok(!positiveCoordWarnings({}, defaultWalkForward(DEFAULT_SETTINGS)).some((w) => w.includes("engine direction")));
  });

  it("control orders Overall by default: per position, the partials by the system (operator, 7 Oct)", () => {
    assert.equal(DEFAULT_SETTINGS.live.laneOrders, false);
    for (const p of [...DESK_PRESETS, ...LIVE_COORD_PRESETS])
      assert.ok(!JSON.stringify(p).includes('"laneOrders":true'), "no preset switches partials on");
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

  it("a desk is warned when Trailing is on with Normal and Block both off (nothing would execute)", () => {
    const sig = { ...DEFAULT_SIGNALS, sideAccept: { ...DEFAULT_SIGNALS.sideAccept, enabled: true } };
    const good = { coord: { ...DEFAULT_COORD } };
    const w = positiveCoordWarnings(
      { signals: sig, toggles: { axis: true, normal: false, trailing: true, block: false } },
      good,
    );
    assert.ok(
      w.some((x) => x.includes("no trailing config is executable")),
      w.join(" | "),
    );
    // with Block on, Trailing has its base: no such warning
    assert.ok(
      !positiveCoordWarnings(
        { signals: sig, toggles: { axis: true, normal: false, trailing: true, block: true } },
        good,
      ).some((x) => x.includes("no trailing config is executable")),
    );
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

  it("every preset with Trailing on keeps an executable base (Normal or Block on)", () => {
    const all: Array<[string, { normal?: boolean; trailing?: boolean; block?: boolean } | undefined]> = [
      ...Object.entries(STRATEGY_PRESETS).map(([k, v]) => [`strategy ${k}`, v.toggles] as [string, typeof v.toggles]),
      ...[...RESEARCH_PRESETS, ...DESK_PRESETS, ...LIVE_COORD_PRESETS].map(
        (p) => [p.id, (p.settings as { toggles?: { normal?: boolean; trailing?: boolean; block?: boolean } }).toggles] as [
          string,
          { normal?: boolean; trailing?: boolean; block?: boolean } | undefined,
        ],
      ),
    ];
    for (const [id, t] of all)
      if (t?.trailing) assert.ok(t.normal !== false || t.block === true, `${id}: Trailing with Normal and Block off trades nothing`);
  });

  it("gate presets set every range's min PF to the preset's own (no per-range value left over)", () => {
    assert.deepEqual(GATE_PRESETS.strict.rangeMinPf, {});
    assert.deepEqual(GATE_PRESETS.loose.rangeMinPf, {});
  });

  it("desk presets carry Micro's full stop ladder and its cost-based stop floor", () => {
    for (const p of DESK_PRESETS) {
      const m = (p.settings as { grid?: { micro?: false | { slOfTp: number[]; minSlNet?: number } } }).grid?.micro;
      if (!m) continue;
      assert.deepEqual(m.slOfTp, [...MICRO_SL], p.id);
      assert.equal(m.minSlNet, MICRO_RANGE.minSlNet, p.id);
    }
  });

  it("the Stable-02 window and pause are not seeded from Block (engine default 6)", () => {
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(wf.coord?.s2Steps, undefined);
    assert.equal(wf.coord?.s2Pause, undefined);
  });
});
