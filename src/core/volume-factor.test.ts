import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import { INDICATION_KINDS } from "./domain/types.ts";
import { signalCoordinationId } from "./signal-coordination.ts";
import {
  DEFAULT_SIGNALS,
  mergeSignals,
  signalSettings,
  signalVolumeFactorsOf,
} from "./signal-config.ts";
import { checkSettings } from "./settings-check.ts";
import { laneInd } from "./indications/registry.ts";
import { configId } from "./pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, walkForward } from "./sim/walkforward.ts";
import { volumeFactorForIndication } from "./volume-factor.ts";

const H = 3_600_000;
const M = 60_000;
const T0 = Date.UTC(2026, 8, 1);

describe("indication volume factor settings", () => {
  it("defaults every indication, coordination and Axis ratio to neutral 1×", () => {
    assert.equal(DEFAULT_SIGNALS.coordination.volumeFactor, 1);
    assert.equal(DEFAULT_SETTINGS.axis.volumeFactor,1);
    assert.equal(DEFAULT_SETTINGS.exitStrategy.volumeFactor,1);
    assert.deepEqual(
      DEFAULT_SIGNALS.combinedVolumeFactors,
      Object.fromEntries(INDICATION_KINDS.map((kind) => [kind, 1])),
    );
    assert.deepEqual(signalVolumeFactorsOf(signalSettings({})), {
      coordination: 1,
      combined: DEFAULT_SIGNALS.combinedVolumeFactors,
    });
  });

  it("merges a single kind without resetting the other settings and applies once to standalone and combined lanes", () => {
    const base = signalSettings({
      coordination: { ...DEFAULT_SIGNALS.coordination, volumeFactor: 1.2 },
      combinedVolumeFactors: { trend: 4 } as never,
    });
    const merged = mergeSignals(base, { combinedVolumeFactors: { trend: 1.3 } as never });
    const factors = signalVolumeFactorsOf(merged);
    assert.equal(factors.coordination, 1.2);
    assert.equal(factors.combined.trend, 1.3);
    assert.equal(factors.combined.break, 1);
    assert.equal(volumeFactorForIndication("trend-ema-12-26@m15c", factors), 1.3);
    assert.equal(volumeFactorForIndication("trend-ema-12-26@m15", factors), 1.3);
    assert.equal(
      volumeFactorForIndication(
        laneInd(signalCoordinationId(["ema-cross", "macd-cross", "rsi-reversal"], 0.6, 3, 3), 15),
        factors,
      ),
      1.2,
    );
    assert.equal(
      volumeFactorForIndication(
        "sig-coord-v1-r60-n3-i3-b8nmkj3gro7l7ufsbgf@m15",
        factors,
      ),
      1.2,
      "legacy coordinator identities keep their configured sizing while held orders recover",
    );
  });

  it("validates all indication ratios from 0.1 to 5 in 0.1 steps", () => {
    for (const volumeFactor of [0.1,1,1.3,2.5,5])
      assert.doesNotThrow(() =>
        checkSettings({ signals: { coordination: { volumeFactor, count: 100 } } } as never),
      );
    for (const volumeFactor of [0,5.1,1.25,"1",NaN])
      assert.throws(() =>
        checkSettings({ signals: { coordination: { volumeFactor, count: 100 } } } as never),
      );
    assert.doesNotThrow(() =>
      checkSettings({ signals: { combinedVolumeFactors: { trend: 5 } } } as never),
    );
    assert.throws(() =>
      checkSettings({ signals: { combinedVolumeFactors: { trend: 1.25 } } } as never),
    );
  });

  it("runs combined-lane orders at the configured factor while strategy PF stays unit-normalized", () => {
    for (const ind of ["trend-ema-12-26@m15", "trend-ema-12-26@m15c"]) for (const ratio of [0.1,1,1.3,5]) {
    const protect = { tp: 0.01, sl: 0.02, trail: 0, hold: 32 };
    const cfg = configId("follow", ind, protect);
    const trades = [];
    for (let entryT = T0 - 40 * H; entryT < T0 + 12 * H; entryT += H)
      trades.push({
        cfg,
        sym: "AAA-USDT",
        side: 1 as const,
        entryT,
        exitT: entryT + M,
        entry: 100,
        exit: 101.2,
        r: 0.01,
        reason: "tp" as const,
        bars: 1,
        mfe: 0,
        mae: 0,
        kind: "normal" as const,
      });
    const tape = makeTape(cfg, "follow", ind, protect, "normal", ["AAA-USDT"], trades, [], []);
    const universe = {
      bars: [],
      caches: [],
      startT: T0 - 100 * H,
      endT: T0 + 12 * H,
      splitT: T0 - 50 * H,
      nowT: T0 + 12 * H,
      baseTf: 60,
    } as never;
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    const sim = walkForward(universe, [tape], {
      ...defaults,
      startT: T0,
      simH: 12,
      preH: 20,
      longH: 48,
      stepH: 1,
      validLastN: 0,
      lastN: 0,
      signalValidLastN: 0,
      preGate: false,
      symGate: "off",
      engineSideAccept: { enabled: false, minPf: 1, hours: 24, minTrades: 30 },
      gates: { ...DEFAULT_SETTINGS.gates, minTrades: 1, minPf: 0.5, maxDdtH: 500, maxDdr: 0 },
      toggles: { ...DEFAULT_SETTINGS.toggles, block: false },
      indicationVolumeFactors: { coordination: 1, combined: { trend: ratio } },
      rangeVolumeFactors: {wide:0.3},
    });
    assert.ok(sim.trades.length > 0);
    assert.ok(
      sim.trades.every((trade) => Math.abs(trade.mult! - ratio*0.3)<1e-12 && Math.abs(trade.vol! - ratio*0.3)<1e-12 && (trade.volFactor??1) === ratio),
    );
    assert.ok(sim.trades.every((trade) => Math.abs(trade.r / trade.mult! - 0.01) < 1e-9));
    assert.ok(Math.abs(sim.stats.net - sim.trades.length) < 1e-9);
    assert.ok(Math.abs(sim.sizedStats!.net - sim.trades.length * ratio*0.3) < 1e-9);
    }
  });
});
