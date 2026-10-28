import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { DEFAULT_SIGNALS } from "../signal-config.ts";
import { defaultWalkForward, makeTape, rangeVolumeFactorFor, walkForward } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const M = 60_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const START = NOW - 6 * H;
const SYM = "AAA-USDT";
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

function result(cfg: string, entryT: number, r: number): Trade {
  return {
    cfg,
    sym: SYM,
    side: 1,
    entryT,
    exitT: entryT + 30 * M,
    entry: 100,
    exit: 100 * (1 + r),
    r,
    reason: r > 0 ? "tp" : "sl",
    bars: 2,
    mfe: 0,
    mae: 0,
    kind: "normal",
  };
}

const base = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  protects: [],
  dcaProtects: [],
  simH: 6,
  // these fixtures place their settled closes 65 h or more before the step; the default history window was narrowed
  // from 336 h to 24 h on 19 Oct (4779175), so the window these expectations were written for is pinned here
  longH: 336,
  stepH: 1,
  validLastN: 0,
  lastN: 0,
  robustFrac: 0,
  symGate: "off" as const,
  seatPer: "config" as const,
  portfolio: 0,
  toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
};

describe("coordination volume factors", () => {
  it("keeps Signal short and medium range volume factors independent from engine ranges", () => {
    const factors = { short: 1.8, medium: 0.6 };
    assert.equal(rangeVolumeFactorFor({ ind: "sig-ema-cross-s@m15", protect: P }, { signalRangeVolumeFactors: factors }), 1.8);
    assert.equal(rangeVolumeFactorFor({ ind: "sig-ema-cross-m@m15", protect: P }, { signalRangeVolumeFactors: factors }), 0.6);
    assert.equal(rangeVolumeFactorFor({ ind: "rsi-mom-14-20@m15", protect: { ...P, tag: "sh" } }, {
      rangeVolumeFactors: { sh: 1.4 }, signalRangeVolumeFactors: factors,
    }), 1.4);
    assert.equal(rangeVolumeFactorFor({ ind: "sig-ema-cross-s@m15", protect: P }, { signalRangeVolumeFactors: { short: 2.5, medium: 1 } }), 2.5);
  });

  it("applies the matching Signal range factor to its own Normal and Trailing execution", () => {
    const shortInd = "sig-ema-cross-s@m15";
    const mediumInd = "sig-ema-cross-m@m15";
    const shortCfg = `follow|${shortInd}|tp1|sl1|tr0|h32`;
    const mediumCfg = `follow|${mediumInd}|tp1|sl1|tr0.005|h32`;
    const shortTrades = Array.from({ length: 30 }, (_, i) => result(shortCfg, NOW - 100 * H + i * H, 0.01));
    const mediumTrades = Array.from({ length: 30 }, (_, i) => result(mediumCfg, NOW - 100 * H + i * H, 0.01));
    shortTrades.push(result(shortCfg, START + 5 * M, 0.01));
    mediumTrades.push(result(mediumCfg, START + 5 * M, 0.01));
    const tapes = [
      makeTape(shortCfg, "follow", shortInd, P, "normal", [SYM], shortTrades, [], []),
      makeTape(mediumCfg, "follow", mediumInd, { ...P, trail: 0.005 }, "trailing", [SYM], mediumTrades, [], []),
    ];
    const run = walkForward(u, tapes, {
      ...base,
      signalRank: {
        ...DEFAULT_SIGNALS,
        count: 0,
        minTrades: 1,
        rank: "net",
        validate: false,
        guard: { ...DEFAULT_SIGNALS.guard, enabled: false },
        cluster: { ...DEFAULT_SIGNALS.cluster, enabled: false },
      },
      signalAccept: { ...DEFAULT_SIGNALS.accept, enabled: false },
      signalSideAccept: { ...DEFAULT_SIGNALS.sideAccept, enabled: false },
      coord: { ...base.coord!, enabled: false },
      signalRangeVolumeFactors: { short: 1.8, medium: 0.6 },
    });
    assert.equal(run.trades.find((x) => x.cfg === shortCfg)?.mult, 1.8);
    assert.equal(run.trades.find((x) => x.cfg === mediumCfg)?.mult, 0.6);
  });

  it("uses the configured relation increment while respecting its cap and the Block ceiling", () => {
    const cfg = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
    const trades = Array.from({ length: 30 }, (_, i) => result(cfg, NOW - 100 * H + i * H, 0.01));
    for (const h of [5, 3, 1]) trades.push(result(cfg, NOW - h * H + 10 * M, 0.01));
    const tape = makeTape(cfg, "follow", "rsi-mom-14-20@m15", P, "normal", [SYM], trades, [], []);
    const run = (s2Increase: number) =>
      walkForward(u, [tape], {
        ...base,
        coord: {
          ...base.coord!,
          enabled: true,
          s2RelVolume: true,
          s2Increase,
        },
      });
    const configured = run(0.05);
    const capped = run(0.5);
    assert.equal(configured.trades[1].coordVol, 1.3);
    assert.equal(capped.trades[1].coordVol, 1.8, "relation volume remains capped at 1.8×");
    assert.ok(capped.trades.every((x) => (x.mult ?? 1) <= 8 + 1e-9), "the existing Block total ceiling remains in force");
  });

  it("applies the hedge factor only to Signal entries selected from losing hours", () => {
    const engineInd = "rsi-mom-14-20@m15";
    const activeInd = "sig-ema-cross-s@m15";
    const hedgeInd = "sig-sar-s@m15c";
    const engine = `follow|${engineInd}|tp1|sl1|tr0|h32`;
    const active = `follow|${activeInd}|tp1|sl1|tr0|h32`;
    const hedge = `follow|${hedgeInd}|tp1|sl1|tr0|h32`;
    const engineTrades = Array.from({ length: 30 }, (_, i) => result(engine, NOW - 80 * H + i * H, 0.01));
    engineTrades.push(result(engine, START + 5 * M, -0.05));
    engineTrades.push(result(engine, START + 40 * M, 0.02));
    engineTrades.push(result(engine, START + 2 * H + 5 * M, -0.05));
    const activeTrades = Array.from({ length: 30 }, (_, i) => result(active, NOW - 80 * H + i * H, 0.02));
    activeTrades.push(result(active, START + H + 5 * M, 0.01));
    const hedgeTrades = Array.from({ length: 20 }, (_, i) => result(hedge, NOW - 100 * H + i * H, -0.01));
    // A hedge is still an independently qualified Signal config. Its recent own history must pass Last-25;
    // the coordination book's losing hour supplies the hedge relation, not a substitute for this evidence.
    for (let i = 0; i < 30; i++) hedgeTrades.push(result(hedge, NOW - (70 - i) * H, 0.02));
    // This positive close lands in the book's losing hour and makes the source eligible at the next hour.
    hedgeTrades.push(result(hedge, START + 25 * M, 0.02));
    hedgeTrades.push(result(hedge, START + H + 15 * M, 0.01));
    hedgeTrades.push(result(hedge, START + 2 * H + 25 * M, 0.02));
    hedgeTrades.push(result(hedge, START + 3 * H + 15 * M, 0.01));
    const tapes = [
      makeTape(engine, "follow", engineInd, P, "normal", [SYM], engineTrades, [], []),
      makeTape(active, "follow", activeInd, P, "normal", [SYM], activeTrades, [], []),
      makeTape(hedge, "follow", hedgeInd, P, "normal", [SYM], hedgeTrades, [], []),
    ];
    const run = (hedgeVolumeFactor: number, combinedFactors = false) =>
      walkForward(u, tapes, {
        ...base,
        ...(combinedFactors ? {
          toggles: { ...base.toggles, block: true },
          block: { ...base.block, maxLevel: 1, ratio: 0.2, signalsOwn: true },
          indicationVolumeFactors: { coordination: 8, combined: { sar: 3 } },
          signalRangeVolumeFactors: { short: 1.8, medium: 1 },
        } : {}),
        coord: {
          ...base.coord!,
          enabled: true,
          confirm: true,
          hedge: true,
          hedgeMinN: 1,
          hedgeMinPf: 1.1,
          hedgeVolumeFactor,
          ...(combinedFactors ? { s2RelVolume: true, s2Increase: 0.05 } : {}),
        },
        signalValidLastN: undefined,
        signalRank: {
          ...DEFAULT_SIGNALS,
          count: 1,
          minTrades: 1,
          rank: "net",
          validate: false,
          guard: { ...DEFAULT_SIGNALS.guard, enabled: false },
          cluster: { ...DEFAULT_SIGNALS.cluster, enabled: false },
        },
        signalAccept: { ...DEFAULT_SIGNALS.accept, enabled: false },
        signalSideAccept: { ...DEFAULT_SIGNALS.sideAccept, enabled: false },
      });
    const neutral = run(1);
    const raised = run(1.6);
    const neutralTrade = neutral.trades.find((x) => x.hedge);
    const raisedTrade = raised.trades.find((x) => x.hedge);
    assert.ok(neutralTrade && raisedTrade, "both runs execute the causal hedge-selected entry");
    assert.equal(neutralTrade!.mult, 1);
    assert.equal(neutralTrade!.hedgeVol, undefined, "neutral sizing does not add a separate multiplier");
    assert.equal(raisedTrade!.mult, 1.6);
    assert.equal(raisedTrade!.hedgeVol, 1.6);
    assert.ok(raisedTrade!.cfg.startsWith("follow|sig-"));

    const combined = run(1.6, true).trades.find((x) => x.hedge && (x.coordVol ?? 1) > 1);
    assert.ok(combined, "the same causal hedge entry executes with all sizing sources enabled");
    assert.equal(combined.hedgeVol, 1.6);
    assert.equal(combined.volFactor, 3);
    assert.equal(combined.rangeVol, 1.8);
    assert.ok((combined.coordVol ?? 1) > 1, "settled history supplies the relation multiplier");
    assert.equal(combined.level, 1, "the config's recent settled winner supplies one Block level");
    assert.ok(Math.abs(combined.mult! - Math.min(8, 1.2 * combined.coordVol! * 3 * 1.6 * 1.8)) < 1e-12);
    assert.ok(combined.mult! <= 8, "the aggregate external sizing ceiling still applies to coordinated Signal entries");
    assert.ok(Math.abs(combined.r / combined.mult! - 0.01) < 1e-12, "unit returns exclude every external sizing factor");
  });
});
