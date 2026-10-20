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
  it("defaults coordination to 8× and every other combined indication to neutral 1×", () => {
    assert.equal(DEFAULT_SIGNALS.coordination.volumeFactor, 8);
    assert.deepEqual(
      DEFAULT_SIGNALS.combinedVolumeFactors,
      Object.fromEntries(INDICATION_KINDS.map((kind) => [kind, 1])),
    );
    assert.deepEqual(signalVolumeFactorsOf(signalSettings({})), {
      coordination: 8,
      combined: DEFAULT_SIGNALS.combinedVolumeFactors,
    });
  });

  it("merges a single kind without resetting the other settings and applies only to combined lanes", () => {
    const base = signalSettings({
      coordination: { ...DEFAULT_SIGNALS.coordination, volumeFactor: 12 },
      combinedVolumeFactors: { trend: 4 } as never,
    });
    const merged = mergeSignals(base, { combinedVolumeFactors: { trend: 6 } as never });
    const factors = signalVolumeFactorsOf(merged);
    assert.equal(factors.coordination, 12);
    assert.equal(factors.combined.trend, 6);
    assert.equal(factors.combined.break, 1);
    assert.equal(volumeFactorForIndication("trend-ema-12-26@m15c", factors), 6);
    assert.equal(volumeFactorForIndication("trend-ema-12-26@m15", factors), 1);
    assert.equal(
      volumeFactorForIndication(
        laneInd(signalCoordinationId(["ema-cross", "macd-cross", "rsi-reversal"], 0.6, 3, 3), 15),
        factors,
      ),
      12,
    );
    assert.equal(
      volumeFactorForIndication(
        "sig-coord-v1-r60-n3-i3-b8nmkj3gro7l7ufsbgf@m15",
        factors,
      ),
      12,
      "legacy coordinator identities keep their configured sizing while held orders recover",
    );
  });

  it("validates the factor range as whole numbers from 1 to 22", () => {
    for (const volumeFactor of [1, 8, 22])
      assert.doesNotThrow(() =>
        checkSettings({ signals: { coordination: { volumeFactor, count: 100 } } } as never),
      );
    for (const volumeFactor of [0, 23, 2.5, "8"])
      assert.throws(() =>
        checkSettings({ signals: { coordination: { volumeFactor, count: 100 } } } as never),
      );
    assert.doesNotThrow(() =>
      checkSettings({ signals: { combinedVolumeFactors: { trend: 22 } } } as never),
    );
    assert.throws(() =>
      checkSettings({ signals: { combinedVolumeFactors: { trend: 1.5 } } } as never),
    );
  });

  it("runs combined-lane orders at the configured factor while strategy PF stays unit-normalized", () => {
    const ind = "trend-ema-12-26@m15c";
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
      indicationVolumeFactors: { coordination: 8, combined: { trend: 3 } },
    });
    assert.ok(sim.trades.length > 0);
    assert.ok(
      sim.trades.every((trade) => trade.mult === 3 && trade.vol === 3 && trade.volFactor === 3),
    );
    assert.ok(sim.trades.every((trade) => Math.abs(trade.r / trade.mult! - 0.01) < 1e-9));
    assert.ok(Math.abs(sim.stats.net - sim.trades.length) < 1e-9);
    assert.ok(Math.abs(sim.sizedStats!.net - sim.trades.length * 3) < 1e-9);
  });
});
