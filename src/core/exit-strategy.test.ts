import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "./config.ts";
import { checkSettings } from "./settings-check.ts";
import {
  capExitCandidates,
  EXIT_BOT,
  EXIT_HISTORY_MAX_PAIRS,
  emptyExitStrategyDiagnostics,
  exitHistoryFingerprint,
  passesExitHourlyConsistency,
  passesExitValidationSlices,
  exitProtectCandidates,
  exitStrategyPairs,
  exitSignalStrategyPairs,
  exitStrategyProtectsBoundedGen,
  exitStrategyProtectsGen,
  qualifyExitBase,
  heldExitProtect,
} from "./exit-strategy.ts";
import { barsFromCandles, resample, syntheticCandles } from "./market/bars.ts";
import { INDICATIONS } from "./indications/registry.ts";
import { relateAnchorTf } from "./indications/relate.ts";
import { breakAnchorTf } from "./indications/break-config.ts";
import {
  makeUniverse,
  configId,
  kindOfId,
  laneProtect,
  parseConfigId,
  baseRuns,
} from "./pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward, execDecision, kindExecutable } from "./sim/walkforward.ts";
import { liveLaneFilter, rangeExcluded } from "./server/live.server.ts";
import { planLaneOrders } from "./server/lane-orders.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { closePool, runOnWorkers, type ExitStrategyReply } from "./server/pool.server.ts";
import type { Bars, Protect, Trade } from "./domain/types.ts";

function finish<T>(g: Generator<void, T>): T {
  let x = g.next();
  while (!x.done) x = g.next();
  return x.value;
}

describe("independent historic exit strategy", () => {
  it("requires validation returns to be green across enough active hours", () => {
    assert.equal(passesExitHourlyConsistency({ hours: 8, greenHours: 5 }, 0.5), true);
    assert.equal(passesExitHourlyConsistency({ hours: 8, greenHours: 3 }, 0.5), false);
    assert.equal(passesExitHourlyConsistency({ hours: 5, greenHours: 0 }, 0.5), true);
    assert.equal(passesExitHourlyConsistency({ hours: 8, greenHours: 0 }, 0), true);
  });

  it("requires every chronological validation slice to pass without future closes or pooled rescue", () => {
    const row = (exitT: number, r: number) => ({ cfg: "fixture", sym: "A", side: 1, entryT: exitT - 1, exitT, r } as Trade);
    const pass = [row(1, .01), row(2, -.001), row(5, .01), row(6, .01), row(7, -.001), row(10, .01)];
    assert.equal(passesExitValidationSlices(pass, 0, 10, 2, 3, 1.1), true);
    const recentLoss = [row(1, .1), row(2, .1), row(5, .1), row(6, -.01), row(7, -.01), row(10, .001)];
    assert.equal(passesExitValidationSlices(recentLoss, 0, 10, 2, 3, 1.1), false);
    assert.equal(passesExitValidationSlices(pass.slice(0, 5), 0, 10, 2, 3, 1.1), false, "insufficient recent sample");
    assert.equal(passesExitValidationSlices([...pass, row(11, 1)], 0, 10, 2, 3, 1.1), false, "future rows rejected");
    assert.equal(passesExitValidationSlices(recentLoss, 0, 10, 1, 3, 1.1), true, "one slice preserves the separate pooled gate");
    for (const n of [0, 1.5, 5, NaN]) assert.throws(() => checkSettings({ exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, validationSlices: n } }));
    for (const n of [1, 2, 4]) assert.doesNotThrow(() => checkSettings({ exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, validationSlices: n } }));
  });

  it("caps config sets fairly across independent tactics and directions", () => {
    assert.deepEqual(
      capExitCandidates(
        [["L-static-1", "L-static-2"], ["S-adaptive-1"], ["L-trailing-1", "L-trailing-2"]],
        4,
      ),
      ["L-static-1", "S-adaptive-1", "L-trailing-1", "L-static-2"],
    );
    assert.deepEqual(
      capExitCandidates(
        [
          ["L-static-1", "L-static-2"],
          ["S-static-1", "S-static-2"],
          ["L-adaptive-1"],
          ["S-adaptive-1"],
          ["L-trailing-1"],
          ["S-trailing-1"],
        ],
        6,
      ),
      ["L-static-1", "S-static-1", "L-adaptive-1", "S-adaptive-1", "L-trailing-1", "S-trailing-1"],
      "the per-pair cap first gives each tactic and direction an independent seat",
    );
  });

  it("fits five independent Exit protection families without a range target", () => {
    const candidates = exitProtectCandidates(
      [0.01, 0.02, 0.03, 0.04],
      [0.002, 0.004, 0.006, 0.008],
      1,
      32,
      {
        ...DEFAULT_SETTINGS.exitStrategy,
        quantiles: [0.75],
        stopQuantiles: [0.75],
        stopMultiples: [1.5],
        trailShares: [0.4],
      },
      { cost: 0.002, minPf: 1.05, minTrades: 2, minSl: 0.005, minTrail: 0.002 },
    );
    assert.deepEqual(Object.keys(candidates).sort(), [
      "adaptive-sl",
      "breakeven",
      "static-sl",
      "trailing",
      "trailing-only",
    ]);
    assert.ok(candidates["static-sl"].length);
    assert.ok(candidates["adaptive-sl"].length);
    assert.ok(candidates.breakeven.length);
    assert.ok(candidates.trailing.length);
    assert.ok(candidates["trailing-only"].length);
    for (const [set, protects] of Object.entries(candidates))
      for (const protect of protects) {
        assert.equal(protect.exitSet, set);
        assert.equal(
          protect.tag,
          undefined,
          "Historic Exit targets do not inherit Normal / Trailing range tags",
        );
        assert.ok(
          protect.exitSet === "trailing-only"
            ? protect.tp === 0 && protect.trailOnly === true && protect.sl > 0
            : protect.tp >= DEFAULT_SETTINGS.exitStrategy.minTp,
        );
      }
    assert.ok(
      candidates.trailing.every((protect) => protect.trail > 0 && protect.trail < protect.tp),
    );
    assert.ok(candidates.breakeven.every((protect) => protect.trail === 0));
    assert.ok(
      candidates["trailing-only"].every(
        (protect) =>
          protect.tp === 0 && protect.trailOnly && protect.sl > 0 && (protect.trailStep ?? 0) > 0,
      ),
    );
    assert.ok(candidates["static-sl"].every((protect) => protect.trail === 0));
  });

  it("deduplicates configured indication sources into Bot-free Exit pairs", () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 200, Date.UTC(2026, 8, 1), 12),
    );
    const u = makeUniverse([bars]);
    assert.deepEqual(
      exitStrategyPairs(
        [
          { ind: "ema-9-21@m15" },
          { ind: "ema-9-21@m15" },
          { ind: "rsi-mid@m15" },
          { ind: "sig-ema-cross-s@m15" },
          { ind: "ema-9-21@m30" },
        ],
        u,
        {
          timeframes: [15],
          includeTactics: false,
          includeRelations: false,
          includeCombined: false,
        },
      ),
      ["exit|ema-9-21@m15", "exit|rsi-mid@m15"],
      "Exit sources are deduplicated across Bots, signal-only inputs and unavailable lanes are excluded",
    );
  });

  it("keeps Signal Exit pairs on only their configured source range and lane", () => {
    const oneMinute = syntheticCandles("A-USDT", 1, 60 * 60, Date.UTC(2026, 8, 1), 12);
    const u = makeUniverse([1, 5, 15].map((tf) => ({
      ...barsFromCandles("A-USDT", tf, resample(oneMinute, 1, tf)),
      lanes: [1, 5, 15],
    })));
    assert.deepEqual(
      exitSignalStrategyPairs(
        [
          { ind: "sig-ema-cross-s@m5" },
          { ind: "sig-ema-cross-s@m5" },
          { ind: "sig-ema-cross-m@m15" },
          { ind: "ema-9-21@m15" },
        ],
        u,
      ),
      ["exit|sig-ema-cross-m@m15", "exit|sig-ema-cross-s@m5"],
      "Signal short/medium identities stay separate and do not expand into other source ranges or lanes",
    );
  });

  it("uses only configured, eligible lanes and keeps every category independently scoped", () => {
    const oneMinute = syntheticCandles("A-USDT", 1, 60 * 60, Date.UTC(2026, 8, 1), 12);
    const u = makeUniverse([1, 5, 15].map((tf) => ({
      ...barsFromCandles("A-USDT", tf, resample(oneMinute, 1, tf)), lanes: [1, 5, 15],
    })));
    const tactic = INDICATIONS.find((x) => x.kind === "tactic")!.id;
    const relation = INDICATIONS.find((x) => x.kind === "relate" && relateAnchorTf(x.id) === 1)!.id;
    const breaker = INDICATIONS.find((x) => x.id.startsWith("break-rel-") && breakAnchorTf(x.id) === 5)!.id;
    const micro = INDICATIONS.find((x) => x.kind === "micro" && x.id.startsWith("micro-1-"))!.id;
    const settings = { timeframes: [1, 5, 15], includeTactics: true, includeRelations: true,
      includeMicro: true, includeCombined: true };
    const source = ["ema-9-21@m15", "ema-9-21@m1c", `${tactic}@m5`, `${relation}@m1`,
      `${breaker}@m5`, `${micro}@m1`].map((ind) => ({ ind }));
    const wanted = source.map(({ ind }) => `exit|${ind}`).sort();
    assert.deepEqual(exitStrategyPairs([...source, source[0]], u, settings), wanted);
    assert.deepEqual(exitStrategyPairs([], u, settings), [], "no unfocused family is synthesized");
    assert.deepEqual(exitStrategyPairs([{ ind: "ema-9-21" }, { ind: `${micro}@m5` },
      { ind: `${relation}@m5` }, { ind: `${breaker}@m5c` }, { ind: "unknown@m1" }], u, settings), [],
      "unknown, lane-less, wrongly anchored and duplicate combined sources do not create entries");
    const only15 = exitStrategyPairs(source, u, { ...settings, timeframes: [15] });
    assert.deepEqual(only15, ["exit|ema-9-21@m15"]);
    assert.deepEqual(exitStrategyPairs(source, u, { ...settings, includeTactics: false,
      includeRelations: false, includeMicro: false, includeCombined: false }), ["exit|ema-9-21@m15"]);
    assert.ok(!exitStrategyPairs(source, u, settings, ["tactic"]).includes(`exit|${tactic}@m5`));
  });

  it("filters configured Signal Exit sources by allowed lane and combined switch", () => {
    const candles = syntheticCandles("A-USDT", 1, 600, Date.UTC(2026, 8, 1), 12);
    const u = makeUniverse([1, 5, 15].map((tf) => ({
      ...barsFromCandles("A-USDT", tf, resample(candles, 1, tf)), lanes: [1, 5, 15],
    })));
    const runs = [{ ind: "sig-ema-cross-s@m1" }, { ind: "sig-ema-cross-s@m5" },
      { ind: "sig-ema-cross-s@m1c" }];
    assert.deepEqual(exitSignalStrategyPairs(runs, u, { timeframes: [1], includeCombined: false }),
      ["exit|sig-ema-cross-s@m1"]);
  });

  it("applies the Normal Base PF, sample and drawdown gate to standalone Exit sources", () => {
    const good = { n: 20, pf: 1.2, net: 0.2, mdd: 0.04 };
    const weak = { n: 20, pf: 1.08, net: 0.1, mdd: 0.02 };
    const qualified = qualifyExitBase(
      [
        { bot: EXIT_BOT, ind: "ema-9-21@m1", full: good },
        { bot: EXIT_BOT, ind: "tactic-trend-s@m1", full: weak },
        { bot: "follow", ind: "ema-9-21@m1", full: good },
        { bot: EXIT_BOT, ind: "rsi-9-21@m1", full: { ...good, n: 3 } },
      ],
      { minPf: 1.05 },
      { minPf: 1.05, minTrades: 10, maxDdr: 1 },
    );
    assert.deepEqual([...qualified.evaluated].sort(), [
      "exit|ema-9-21@m1",
      "exit|rsi-9-21@m1",
      "exit|tactic-trend-s@m1",
    ]);
    assert.deepEqual([...qualified.passed], ["exit|ema-9-21@m1"]);
    assert.equal(
      qualified.rejected,
      2,
      "a Tactic cannot pass below PF 1.1 and insufficient Base trades fail",
    );
    const baseBars = barsFromCandles(
      "BASE-USDT",
      1,
      syntheticCandles("BASE-USDT", 1, 600, Date.UTC(2026, 8, 1), 2),
    );
    const baseRun = baseRuns(
      makeUniverse([baseBars]),
      [{ bot: EXIT_BOT, ind: "ema-9-21@m1" }],
      DEFAULT_SETTINGS.cost,
      { ...DEFAULT_SETTINGS.tactics, cooldown: true },
      false,
      false,
      undefined,
      [{ tp: 0.01, sl: 0.01, trail: 0, hold: 10, tag: "sh" }],
    )[0];
    assert.ok(baseRun);
    assert.equal(baseRun.bot, EXIT_BOT);
    assert.equal(baseRun.ranges, undefined, "Exit Base does not inherit Normal range cells");
  });

  it("keeps independent exit-set identity and direction through lane restart recovery", () => {
    for (const ind of [
      "rsi-mom-14-20@m1",
      "rsi-mom-14-20@m5",
      "rsi-mom-14-20@m15",
      "rsi-mom-14-20@m30",
    ]) {
      for (const side of [1, -1] as const) {
        for (const exitSet of [
          "static-sl",
          "adaptive-sl",
          "trailing",
          "breakeven",
          "trailing-only",
        ] as const) {
          const ref: Protect = {
            tp: exitSet === "trailing-only" ? 0 : 0.025,
            sl: 0.04,
            trail: exitSet === "trailing" ? 0.0075 : exitSet === "trailing-only" ? 0.025 : 0,
            ...(exitSet === "trailing-only" ? { trailOnly: true, trailStep: 0.5 } : {}),
            hold: 64,
            exitType: "historic",
            exitSide: side,
            exitSet,
          };
          const id = configId(EXIT_BOT, ind, laneProtect(ref, ind));
          assert.equal(kindOfId(id), "exit");
          const parsed = parseConfigId(id);
          assert.equal(parsed?.protect.exitType, "historic");
          assert.equal(parsed?.protect.exitSide, side);
          assert.equal(parsed?.protect.exitSet, exitSet);
          assert.equal(parsed?.protect.tag, undefined);
          const held = heldExitProtect(id);
          assert.ok(held, id);
          assert.equal(held.pair, `${EXIT_BOT}|${ind}`);
          assert.equal(held.protect.exitSet, exitSet);
          assert.equal(configId(EXIT_BOT, ind, laneProtect(held.protect, ind)), id);
        }
      }
    }
    const legacy = configId("follow", "rsi-mom-14-20@m15", {
      tp: 0.025,
      sl: 0.04,
      trail: 0.0075,
      hold: 64,
      tag: "mn",
      exitType: "historic",
      exitSide: 1,
    });
    assert.ok(heldExitProtect(legacy), "legacy held Exit ids remain recoverable during rollout");
  });

  it("retains fitted lane-native distances and exact held identity on every timeframe", () => {
    for (const tf of [1, 5, 15, 30]) {
      const ind = `ema-9-21@m${tf}`;
      const p: Protect = {
        tp: 0.03,
        sl: 0.02,
        trail: 0.008,
        hold: 16,
        exitType: "historic",
        exitSet: "trailing",
        exitSide: 1,
      };
      const actual = laneProtect(p, ind);
      assert.equal(actual.tp, p.tp, `TP already measured in ${tf}m lane`);
      assert.equal(actual.sl, p.sl, `SL already measured in ${tf}m lane`);
      assert.equal(actual.trail, p.trail, `trail already measured in ${tf}m lane`);
      assert.equal(actual.hold * tf, p.hold * 15);
      const id = configId("follow", ind, actual);
      const held = heldExitProtect(id);
      assert.ok(held);
      assert.deepEqual(held.protect, p);
      assert.equal(configId("follow", ind, laneProtect(held.protect, ind)), id);
    }
  });

  it("keeps Historic Exit independent of Normal / Trailing range exclusions", () => {
    const tagged = configId("follow", "rsi-mom-14-20@m15", {
      tp: 0.025,
      sl: 0.04,
      trail: 0.0075,
      hold: 64,
      tag: "mn",
      exitType: "historic",
      exitSide: 1,
    });
    const wide = configId("follow", "rsi-mom-14-20@m15", {
      tp: 0.025,
      sl: 0.04,
      trail: 0.0075,
      hold: 64,
      exitType: "historic",
      exitSide: 1,
    });
    assert.equal(rangeExcluded(tagged, new Set(["mn"])), false);
    assert.equal(rangeExcluded(wide, new Set(["wide"])), false);
    assert.equal(rangeExcluded(wide, new Set(["mn"])), false);
    const normal = configId("follow", "rsi-mom-14-20@m15", {
      tp: 0.025,
      sl: 0.04,
      trail: 0.0075,
      hold: 64,
      tag: "mn",
    });
    assert.equal(rangeExcluded(normal, new Set(["mn"])), true);
  });

  it("evaluates complete Exit indication entries independently of remove-only engine tactics", () => {
    const u = makeUniverse([
      barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 800, Date.UTC(2026, 8, 1), 18)),
    ]);
    const pair = "follow|ema-9-21@m15";
    const protect: Protect = {
      tp: 0.025,
      sl: 0.035,
      trail: 0.01,
      hold: 8,
      exitType: "historic",
      exitSet: "trailing",
      exitSide: 1,
    };
    const floors = { minSl: 0, minTrail: 0, pairProtects: { [pair]: [protect] } };
    const base = buildTapes(u, [], 0.002, undefined, new Set([pair]), null, null, floors);
    const filtered = buildTapes(
      u,
      [],
      0.002,
      undefined,
      new Set([pair]),
      {
        session: true,
        volRegime: true,
        trendStrength: true,
        cooldown: true,
        cooldownBars: 100,
      },
      null,
      floors,
    );
    assert.ok(base[0].n > 0);
    assert.deepEqual(
      filtered,
      base,
      "range-engine filters and cooldown cannot suppress a separate Exit family",
    );
    const settings = {
      ...DEFAULT_SETTINGS.exitStrategy,
      enabled: true,
      minEntries: 2,
      minValidationTrades: 2,
      maxDdr: 0,
      holdH: 1,
      maxConfigsPerPair: 6,
    };
    const validation = { cost: 0.002, minPf: 1.1, minTrades: 2, minSl: 0, minTrail: 0 };
    const a = emptyExitStrategyDiagnostics();
    const b = emptyExitStrategyDiagnostics();
    const x = finish(exitStrategyProtectsGen(u, [pair], settings, null, u.nowT, validation, a));
    const y = finish(
      exitStrategyProtectsGen(u, [pair], settings, DEFAULT_SETTINGS.tactics, u.nowT, validation, b),
    );
    assert.deepEqual(x, y);
    assert.deepEqual(a, b, "qualification uses the same complete entry history as the tape");
    assert.ok(a.evaluated > 0);
  });

  it("runs independent exit lanes through live selection and per-lane partial orders", () => {
    const config = (tp: number) =>
      configId("follow", "rsi-mom-14-20@m15", {
        tp,
        sl: tp * 1.5,
        trail: tp * 0.3,
        hold: 64,
        exitType: "historic",
        exitSide: 1,
      });
    const ids = [config(0.025), config(0.04)];
    const filter = liveLaneFilter(
      { source: "engine", kinds: ["exit"], excludeRanges: ["wide", "mn"] },
      null,
      null,
    );
    const lanes = ids.map((cfg, i) => ({
      id: `${cfg}|A-USDT|1|${i + 1}`,
      cfg,
      key: "A-USDT|1",
      sym: "A-USDT",
      side: 1 as const,
      stop: 95 - i,
      target: 103 + i,
      entryT: i + 1,
      qty: 1,
    }));
    assert.ok(
      lanes.every((l) => filter.sendable({ cfg: l.cfg, vol: 1, sym: l.sym, side: l.side })),
    );
    const actions = planLaneOrders(lanes, {}, new Set(), {
      px: () => 100,
      stopPx: (_lane, px) => px,
      targetPx: (_lane, px) => px,
      budget: 4,
      slots: 4,
    });
    for (const lane of lanes) {
      assert.deepEqual(
        actions
          .filter((action) => action.lane === lane.id)
          .map((action) => action.kind)
          .sort(),
        ["placeStop", "placeTarget"],
        "each qualified exit lane receives its own partial stop and target",
      );
    }
  });

  it("keeps Historic Exit independent when the Normal toggle is off", () => {
    const t = buildTapes(
      makeUniverse([
        barsFromCandles(
          "A-USDT",
          15,
          syntheticCandles("A-USDT", 15, 3000, Date.UTC(2026, 8, 1), 8),
        ),
      ]),
      [],
      0.002,
      undefined,
      new Set(["follow|sig-ema-cross-s@m15"]),
      null,
      undefined,
      {
        minSl: 0,
        minTrail: 0,
        pairProtects: {
          "follow|sig-ema-cross-s@m15": [
            {
              tp: 0.03,
              sl: 0.06,
              trail: 0.01,
              hold: 192,
              exitType: "historic",
              exitSide: 1,
            },
          ],
        },
      },
    ).find((x) => x.kind === "exit");
    assert.ok(t);
    const options = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      toggles: { ...DEFAULT_TOGGLES, normal: false, block: false, exit: true },
      lastN: 0,
      validLastN: 0,
      preGate: false,
    };
    assert.equal(kindExecutable("exit", options.toggles), true);
    assert.equal(execDecision(t, t.entryT[0] + 1, options).ok, true);
    assert.equal(
      execDecision(t, t.entryT[0] + 1, { ...options, excludeRanges: ["wide", "mn"] }).ok,
      true,
      "range controls leave the independent Exit set active",
    );
    const disabled = execDecision(t, t.entryT[0] + 1, {
      ...options,
      toggles: { ...options.toggles, exit: false },
    }) as { why?: string };
    assert.equal(disabled.why, "toggle");
  });

  it("runtime refuses Exit fitting when the Normal Base gate admits no pairs", async () => {
    process.env.CTS_CORE_SYNTHETIC_END = String(Date.UTC(2026, 8, 30, 12));
    const grid = {
      ...DEFAULT_SETTINGS.grid,
      tp: [0.02],
      slOfTp: [1],
      trailOfTp: [0],
      holdH: [4],
      minimal: false,
      short: false,
      general: false,
      long: false,
      micro: false,
    };
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        symbols: 1,
        historyDays: 18,
        tfMin: 15,
        tfs: [15],
        tfDays: { ...DEFAULT_SETTINGS.tfDays, "15": 18 },
        focus: ["follow|ema-9-21@m15"],
        pinned: [],
        mainTop: 0,
        grid,
        gates: { ...DEFAULT_SETTINGS.gates, minTrades: 500 },
        // This fixture tests ordinary Base rejection; expanded independent Signals have their own runtime matrix.
        signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
        exitStrategy: {
          ...DEFAULT_SETTINGS.exitStrategy,
          enabled: true,
          lookbackH: 168,
          trainFraction: 0.6,
          minEntries: 3,
          minValidationTrades: 2,
          minPf: 1.05,
          maxDdr: 0,
          holdH: 3,
          maxConfigsPerPair: 6,
          quantiles: [0.6],
          stopQuantiles: [0.5],
          trailShares: [0.5],
          stopMultiples: [1],
        },
        toggles: { ...DEFAULT_TOGGLES, normal: false, block: false, exit: true },
      } as never,
      { market: "synthetic" },
    );
    const deadline = Date.now() + 120_000;
    try {
      rt.start();
      while (
        !(rt.status.computes >= 1 && rt.status.state === "running" && rt.audit !== null) &&
        Date.now() < deadline
      )
        await new Promise((resolve) => setTimeout(resolve, 25));
      assert.ok(rt.status.computes >= 1 && rt.audit, `runtime completes the Exit history compute: ${JSON.stringify({ state: rt.status.state, computes: rt.status.computes, error: rt.status.error, phases: rt.status.phases })}`);
      assert.ok(rt.pipeline?.s1.some((run) => run.bot === "follow" && run.ind === "ema-9-21@m15"));
      assert.equal(rt.status.basePassed, 0, "the high Base sample floor admits no pair");
      const exitStatus = rt.status.exitStrategies;
      assert.ok(exitStatus, "independent Exit diagnostics are reported");
      assert.ok(exitStatus.pairs > 0, "independent Exit sources are still discovered");
      assert.ok((exitStatus.baseRejected ?? 0) > 0, "each Exit source is measured against Base");
      assert.equal(
        rt.status.phases["Exit history"],
        undefined,
        "unqualified Exit sources are not fitted",
      );
      assert.equal(
        rt.tapes.filter((tape) => tape.kind === "exit").length,
        0,
        "Base failures cannot get Exit tapes",
      );
    } finally {
      rt.stop();
    }
  });

  it("bounds local Exit cache lifetime by chunk without changing configs, diagnostics or cancellation", () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 900, Date.UTC(2026, 8, 1), 42),
    );
    const pairs = INDICATIONS.filter((x) => !x.id.startsWith("sig-"))
      .slice(0, EXIT_HISTORY_MAX_PAIRS + 1)
      .map((x) => `follow|${x.id}@m15`);
    assert.equal(pairs.length, EXIT_HISTORY_MAX_PAIRS + 1);
    const settings = {
      ...DEFAULT_SETTINGS.exitStrategy,
      enabled: true,
      lookbackH: 72,
      minEntries: 2,
      minValidationTrades: 2,
      minPf: 1.05,
      maxDdr: 0,
      holdH: 1,
      maxConfigsPerPair: 6,
    };
    const validation = { cost: 0.002, minPf: 1.05, minTrades: 2, minSl: 0, minTrail: 0 };
    const memos = (u: ReturnType<typeof makeUniverse>) =>
      u.caches.reduce(
        (n, cache) => n + (cache as unknown as { m: Map<string, unknown> }).m.size,
        0,
      );
    const originalU = makeUniverse([bars]);
    const originalDiagnostics = emptyExitStrategyDiagnostics();
    const original = finish(
      exitStrategyProtectsGen(
        originalU,
        pairs,
        settings,
        null,
        originalU.nowT,
        validation,
        originalDiagnostics,
      ),
    );
    const boundedU = makeUniverse([bars]);
    const boundedDiagnostics = emptyExitStrategyDiagnostics();
    const clears: number[] = [];
    const clear = boundedU.caches[0].clear.bind(boundedU.caches[0]);
    boundedU.caches[0].clear = () => {
      clears.push(memos(boundedU));
      clear();
    };
    const bounded = finish(
      exitStrategyProtectsBoundedGen(
        boundedU,
        pairs,
        settings,
        null,
        boundedU.nowT,
        validation,
        boundedDiagnostics,
      ),
    );
    assert.deepEqual(
      bounded,
      original,
      "clearing indicator caches cannot change fitted/qualified configs",
    );
    assert.deepEqual(boundedDiagnostics, originalDiagnostics);
    assert.ok(boundedDiagnostics.evaluated > 0, "the comparison includes candidate simulations");
    assert.equal(clears.length, 2, "seventeen pairs release at sixteen and at the final pair");
    assert.ok(
      clears.every((n) => n > 0),
      "each release actually frees populated indicator caches",
    );
    assert.equal(memos(boundedU), 0);
    for (const cancel of ["return", "throw"] as const) {
      const u = makeUniverse([bars]);
      const g = exitStrategyProtectsBoundedGen(u, pairs, settings, null, u.nowT, validation);
      for (let i = 0; i < 100 && memos(u) === 0; i++) assert.equal(g.next().done, false);
      assert.ok(memos(u) > 0, "cancellation interrupts a populated chunk");
      if (cancel === "return") g.return({});
      else assert.throws(() => g.throw(new Error("cancel Exit fit")), /cancel Exit fit/);
      assert.equal(memos(u), 0, `${cancel} releases the suspended chunk immediately`);
      assert.equal(g.next().done, true, "canceled fitting cannot start another pair");
    }
  });

  it("fingerprints the exact pair inventory while ignoring pair ordering and duplicates", () => {
    const u = makeUniverse([
      barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 200, Date.UTC(2026, 8, 1), 42)),
    ]);
    const follow = "follow|ema-9-21@m15";
    const revert = "revert|ema-9-21@m15";
    const otherInd = "follow|rsi-mom-14-20@m15";
    const fingerprint = (pairs: Iterable<string>) => exitHistoryFingerprint(u, pairs, u.nowT);
    assert.notEqual(fingerprint([follow]), fingerprint([revert]), "same candles, different bot");
    assert.notEqual(
      fingerprint([follow]),
      fingerprint([otherInd]),
      "same candles, different indication",
    );
    assert.notEqual(
      fingerprint([follow]),
      fingerprint([follow, revert]),
      "newly enabled pairs invalidate the cache",
    );
    assert.notEqual(
      fingerprint([follow, revert]),
      fingerprint([revert]),
      "disabled pairs invalidate the cache",
    );
    assert.equal(fingerprint([follow, revert]), fingerprint([revert, follow, revert, follow]));
    assert.equal(
      fingerprint([follow, revert]),
      fingerprint(
        (function* () {
          yield revert;
          yield follow;
        })(),
      ),
      "a single-use iterable retains both pair identities and their candle series",
    );
  });

  it("fits candidates only before the causal cut and validates each side on later closes", () => {
    const original = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 3000, Date.UTC(2026, 8, 1), 42),
    );
    const cutIndex = 2500;
    const cutT = original.t[cutIndex];
    const changed: Bars = {
      ...original,
      t: original.t.slice(),
      o: original.o.slice(),
      h: original.h.slice(),
      l: original.l.slice(),
      c: original.c.slice(),
      v: original.v.slice(),
    };
    for (let i = cutIndex; i < changed.n; i++) {
      changed.h[i] = changed.c[i] * 1.4;
      changed.l[i] = changed.c[i] * 0.6;
      changed.c[i] = changed.o[i] * (i % 2 ? 1.2 : 0.8);
    }
    const pair = "follow|sig-ema-cross-s@m15";
    assert.equal(
      exitHistoryFingerprint(makeUniverse([original]), [pair], cutT),
      exitHistoryFingerprint(makeUniverse([changed]), [pair], cutT),
      "post-cut bars are excluded from the cache fingerprint",
    );
    const correctedBeforeCut: Bars = { ...original, c: original.c.slice() };
    correctedBeforeCut.c[100] *= 1.01;
    assert.notEqual(
      exitHistoryFingerprint(makeUniverse([original]), [pair], cutT),
      exitHistoryFingerprint(makeUniverse([correctedBeforeCut]), [pair], cutT),
      "a correction to closed prehistory invalidates the cache",
    );
    const settings = {
      ...DEFAULT_SETTINGS.exitStrategy,
      enabled: true,
      lookbackH: 400,
      trainFraction: 0.6,
      minEntries: 4,
      minValidationTrades: 2,
      minPf: 1.05,
      maxDdr: 0,
      holdH: 1.5,
      maxConfigsPerPair: 12,
      quantiles: [0.5, 0.75],
      trailShares: [0.25, 0.5],
      stopMultiples: [1, 2],
    };
    const validation = { cost: 0.002, minPf: 1.05, minTrades: 2, minSl: 0, minTrail: 0 };
    const aDiagnostics = emptyExitStrategyDiagnostics();
    const bDiagnostics = emptyExitStrategyDiagnostics();
    const a = finish(
      exitStrategyProtectsGen(
        makeUniverse([original]),
        [pair],
        settings,
        null,
        cutT,
        validation,
        aDiagnostics,
      ),
    );
    const b = finish(
      exitStrategyProtectsGen(
        makeUniverse([changed]),
        [pair],
        settings,
        null,
        cutT,
        validation,
        bDiagnostics,
      ),
    );
    assert.deepEqual(
      a,
      b,
      "bars after the causal cut cannot change fitted or held-out exit candidates",
    );
    assert.equal(aDiagnostics.pairs, 1);
    assert.equal(aDiagnostics.candidates, bDiagnostics.candidates);
    assert.equal(aDiagnostics.evaluated, bDiagnostics.evaluated);
    assert.ok(aDiagnostics.candidates > 0, "the sample supplied independent candidate sets");
    assert.ok(aDiagnostics.evaluated > 0, "candidates were tested on later completed closes");
    for (const p of a[pair] ?? []) {
      assert.ok(p.exitSide === 1 || p.exitSide === -1);
      assert.ok(
        ["static-sl", "adaptive-sl", "trailing", "breakeven", "trailing-only"].includes(
          p.exitSet ?? "",
        ),
      );
    }
    assert.ok((a[pair] ?? []).every((p) => p.exitType === "historic" && p.tag === undefined));
  });

  it("validates additional Signal Exit ranges without allowing invalid or duplicate fits", () => {
    const good = [{ holdH: 6, distance: 1.5, basis: "close" as const }];
    checkSettings({ exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, signalRanges: good } });
    for (const signalRanges of [[{...good[0], distance: NaN}], [{...good[0], holdH: 0}],
      [{...good[0], basis: "future"}], [...good, ...good], Array(7).fill(good[0])])
      assert.throws(() => checkSettings({ exitStrategy: { signalRanges } } as never), /Signal Exit/);
  });

  it("keeps Signal Exit filters and trail caps identical on local and worker history fits", async () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 1200, Date.UTC(2026, 8, 1), 24),
    );
    const u = makeUniverse([bars]);
    const pair = `${EXIT_BOT}|sig-ema-cross-s@m15`;
    const settings = {
      ...DEFAULT_SETTINGS.exitStrategy,
      enabled: true,
      lookbackH: 240,
      trainFraction: 0.6,
      minEntries: 3,
      minValidationTrades: 2,
      minPf: 1.05,
      holdH: 1,
      maxConfigsPerPair: 60,
      signalRanges: [{ holdH: 3, distance: 1.5, basis: "close" as const },
        { holdH: 6, distance: 2, basis: "extrema" as const }],
      quantiles: [0.5],
      stopQuantiles: [0.5],
      trailShares: [0.5],
      stopMultiples: [1],
    };
    const validation = {
      cost: 0.002,
      minPf: 1.05,
      minTrades: 2,
      minSl: 0,
      minTrail: 0,
      signalTrailMax: 0.03,
    };
    const entryFilter = { trendH: 6, volFloor: 0.0005 };
    const entryFilters = { [pair]: entryFilter };
    const diagnostics = emptyExitStrategyDiagnostics();
    const local = finish(
      exitStrategyProtectsGen(u, [pair], settings, null, u.nowT, validation, diagnostics, entryFilters),
    );
    assert.ok(diagnostics.candidates > 0 && diagnostics.evaluated > 0);
    const baselineDiagnostics = emptyExitStrategyDiagnostics();
    finish(exitStrategyProtectsGen(u, [pair], { ...settings, signalRanges: [] }, null, u.nowT,
      validation, baselineDiagnostics, entryFilters));
    assert.ok(diagnostics.candidates > baselineDiagnostics.candidates, "additional fits create genuinely distinct candidate cells");
    assert.ok((local[pair]?.length ?? 0) <= settings.maxConfigsPerPair, "qualified fits share the bounded per-source cap");
    const limitedDiagnostics = emptyExitStrategyDiagnostics();
    const limited = finish(exitStrategyProtectsGen(u, [pair], {...settings,maxConfigsPerPair:6},
      null,u.nowT,validation,limitedDiagnostics,entryFilters));
    assert.equal(limitedDiagnostics.evaluated,diagnostics.evaluated,"a smaller retention limit cannot skip candidate qualification");
    assert.equal(limited[pair]?.length ?? 0,Math.min(6,local[pair]?.length ?? 0));
    const qualifiedIds=new Set((local[pair]??[]).map(p=>configId(EXIT_BOT,pair.split('|')[1],p)));
    assert.ok((limited[pair]??[]).every(p=>qualifiedIds.has(configId(EXIT_BOT,pair.split('|')[1],p))));
    const gapDiagnostics = emptyExitStrategyDiagnostics();
    const gapValidation = {...validation,minTrail:0.004};
    const gapFits = finish(exitStrategyProtectsGen(u,[pair],{...settings,trailShares:[0.1,0.5]},null,u.nowT,gapValidation,gapDiagnostics,entryFilters));
    assert.ok(gapDiagnostics.trailTooShort > 0,"sub-floor trailing gaps are rejected before qualification");
    assert.ok(gapDiagnostics.evaluated>0,"feasible candidates still receive their independent financial evaluation");
    const gapTapes = buildTapes(u,[],validation.cost,undefined,new Set([pair]),null,undefined,
      {...gapValidation,entry:entryFilter,pairProtects:gapFits});
    assert.equal(gapTapes.length,gapFits[pair]?.length??0,"every qualified Signal Exit has an executable tape");
    const ordinary = `${EXIT_BOT}|ema-9-21@m15`;
    const ordinaryFit = (expanded: boolean) => finish(exitStrategyProtectsGen(u, [ordinary],
      { ...settings, signalRanges: expanded ? settings.signalRanges : [] }, null, u.nowT, validation));
    assert.deepEqual(ordinaryFit(true), ordinaryFit(false), "Signal ranges never change ordinary Exit fits");
    const cut = u.nowT - 12 * 3_600_000;
    const originalAtCut = finish(exitStrategyProtectsGen(u, [pair], settings, null, cut, validation,
      emptyExitStrategyDiagnostics(), entryFilters));
    const changed = structuredClone(bars);
    for (let i = 0; i < changed.n; i++) if (changed.t[i] >= cut)
      for (const col of [changed.o, changed.h, changed.l, changed.c]) col[i] *= 2;
    const future = makeUniverse([changed]);
    assert.deepEqual(finish(exitStrategyProtectsGen(future, [pair], settings, null, cut, validation,
      emptyExitStrategyDiagnostics(), entryFilters)), originalAtCut, "future price structures cannot change historical qualification");
    try {
      const [worker] = await runOnWorkers<ExitStrategyReply>(
        [{
          type: "exit-hist",
          bars: u.bars,
          pairs: [pair],
          settings,
          tactics: null,
          cutT: u.nowT,
          validation,
          entryFilters,
        }],
        1,
        60_000,
      );
      assert.deepEqual(worker.pairProtects, local);
      assert.ok(
        Object.values(local).flat().every((protect) => (protect.trailMax ?? 0) <= validation.signalTrailMax),
        "every fitted Signal Exit carries the configured ceiling into its executable tape config",
      );
    } finally {
      await closePool();
    }
  });

  it("qualifies all five independent exits on a Bot-free planted trend/turn history", () => {
    const tf = 15;
    const step = tf * 60_000;
    const start = Date.UTC(2026, 8, 1);
    const candles = [];
    let price = 100;
    for (let i = 0; i < 2000; i++) {
      const direction = Math.floor(i / 20) % 2 === 0 ? 1 : -1;
      const open = price;
      const close = open * (1 + direction * 0.003);
      candles.push({
        t: start + i * step,
        o: open,
        h: Math.max(open, close) * 1.0002,
        l: Math.min(open, close) * 0.9998,
        c: close,
        v: 100,
      });
      price = close;
    }
    const u = makeUniverse([barsFromCandles("A-USDT", tf, candles)]);
    const pair = `${EXIT_BOT}|ema-9-21@m15`;
    const settings = {
      ...DEFAULT_SETTINGS.exitStrategy,
      enabled: true,
      lookbackH: 240,
      trainFraction: 0.6,
      minEntries: 5,
      minValidationTrades: 4,
      validationSlices: 2,
      minPf: 1.05,
      maxDdr: 0,
      holdH: 3,
      maxConfigsPerPair: 24,
      minTp: 0.006,
      maxTp: 0.05,
      maxSl: 0.1,
      quantiles: [0.5, 0.75],
      stopQuantiles: [0.5, 0.75],
      trailShares: [0.33],
      stopMultiples: [1],
    };
    const diagnostics = emptyExitStrategyDiagnostics();
    const protects =
      finish(
        exitStrategyProtectsGen(
          u,
          [pair],
          settings,
          null,
          u.nowT,
          { cost: 0.002, minPf: 1.05, minTrades: 4, minSl: 0.005, minTrail: 0.005 },
          diagnostics,
        ),
      )[pair] ?? [];
    assert.equal(
      diagnostics.qualified,
      protects.length,
      "every retained candidate passed the independent holdout gates",
    );
    assert.deepEqual([...new Set(protects.map((protect) => protect.exitSet))].sort(), [
      "adaptive-sl",
      "breakeven",
      "static-sl",
      "trailing",
      "trailing-only",
    ]);
    const lowCapDiagnostics = emptyExitStrategyDiagnostics();
    const lowCap = finish(exitStrategyProtectsGen(u,[pair],{...settings,maxConfigsPerPair:6},
      null,u.nowT,{cost:0.002,minPf:1.05,minTrades:4,minSl:0.005,minTrail:0.005},lowCapDiagnostics))[pair]??[];
    assert.ok(protects.length>6,"fixture has more passing configs than the smaller budget");
    assert.equal(lowCap.length,6,"only passing configs consume retention slots");
    assert.equal(lowCapDiagnostics.evaluated,diagnostics.evaluated,"retention budget never truncates qualification");
    assert.ok(lowCapDiagnostics.capped>0,"discarded passing configs are counted explicitly");
    assert.ok(
      new Set(protects.map((protect) => protect.tp)).size > 1,
      "the selected TP remains adjustable",
    );
    const tapes = buildTapes(u, [], 0.002, undefined, new Set([pair]), null, undefined, {
      minSl: 0.005,
      minTrail: 0.005,
      pairProtects: { [pair]: protects },
    }).filter((tape) => tape.kind === "exit");
    assert.equal(tapes.length, protects.length);
    for (const tape of tapes) {
      let grossProfit = 0;
      let grossLoss = 0;
      for (let i = 0; i < tape.n; i++) {
        if (tape.r[i] > 0) grossProfit += tape.r[i];
        else grossLoss -= tape.r[i];
      }
      const pf = grossLoss === 0 ? Infinity : grossProfit / grossLoss;
      assert.ok(tape.n >= 10, `${tape.protect.exitSet} has repeated independent exits`);
      assert.ok(pf >= 1.3, `${tape.protect.exitSet} synthetic tape PF ${pf}`);
      assert.ok(
        Array.from(tape.side).every((side) => side === tape.protect.exitSide),
        `${tape.protect.exitSet} does not blend long and short orders`,
      );
    }
  });

  it("builds five independent historical Exit tapes and simulates each configured side", () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 3000, Date.UTC(2026, 8, 1), 3),
    );
    const u = makeUniverse([bars]);
    const ind = "ema-9-21@m15";
    const pair = `${EXIT_BOT}|${ind}`;
    const protects: Protect[] = [
      {
        tp: 0.03,
        sl: 0.06,
        trail: 0,
        hold: 192,
        exitType: "historic",
        exitSide: 1,
        exitSet: "static-sl",
      },
      {
        tp: 0.04,
        sl: 0.055,
        trail: 0,
        hold: 192,
        exitType: "historic",
        exitSide: 1,
        exitSet: "adaptive-sl",
      },
      {
        tp: 0.05,
        sl: 0.07,
        trail: 0.012,
        hold: 192,
        exitType: "historic",
        exitSide: 1,
        exitSet: "trailing",
      },
      {
        tp: 0.03,
        sl: 0.06,
        trail: 0,
        hold: 192,
        exitType: "historic",
        exitSide: 1,
        exitSet: "breakeven",
      },
      {
        tp: 0,
        sl: 0.06,
        trail: 0.03,
        trailStep: 0.5,
        trailOnly: true,
        hold: 192,
        exitType: "historic",
        exitSide: 1,
        exitSet: "trailing-only",
      },
    ];
    const tapes = buildTapes(u, [], 0.002, undefined, new Set([pair]), null, undefined, {
      minSl: 0,
      minTrail: 0,
      pairProtects: { [pair]: protects },
    }).filter((x) => x.kind === "exit");
    assert.equal(tapes.length, 5);
    assert.equal(new Set(tapes.map((tape) => tape.id)).size, 5);
    assert.deepEqual(
      tapes.map((tape) => parseConfigId(tape.id)?.protect.exitSet),
      ["static-sl", "adaptive-sl", "trailing", "breakeven", "trailing-only"],
    );
    for (const tape of tapes) {
      assert.ok(tape.n > 0);
      assert.ok(
        Array.from(tape.side).every((side) => side === 1),
        "short signals stay in their separate config set",
      );
    }
  });

  it("builds tagless Exit tapes despite Base range and lane filters", () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 1600, Date.UTC(2026, 8, 1), 13),
    );
    const u = makeUniverse([bars]);
    const ind = "ema-9-21@m15";
    const pair = `${EXIT_BOT}|${ind}`;
    const exit: Protect = {
      tp: 0.03,
      sl: 0.06,
      trail: 0,
      hold: 192,
      exitType: "historic",
      exitSide: 1,
      exitSet: "static-sl",
    };
    const build = (floors: Partial<NonNullable<Parameters<typeof buildTapes>[7]>>) =>
      buildTapes(u, [], 0.002, undefined, new Set([pair]), null, undefined, {
        minSl: 0,
        minTrail: 0,
        pairProtects: { [pair]: [exit] },
        ...floors,
      }).filter((tape) => tape.kind === "exit");
    assert.equal(
      build({ pairTags: { [pair]: ["sh"] } }).length,
      1,
      "a Base range-tag list cannot exclude the untagged Exit set",
    );
    assert.equal(
      build({ rangeMinTf: { wide: 30 } }).length,
      1,
      "Normal/Trailing lane floors cannot suppress Exit candidates",
    );
  });

  it("validates the settings cap and rejects oversized exit grids", () => {
    assert.equal(DEFAULT_SETTINGS.exitStrategy.maxDdr, DEFAULT_SETTINGS.gates.maxDdr);
    assert.doesNotThrow(() =>
      checkSettings({
        exitStrategy: {
          ...DEFAULT_SETTINGS.exitStrategy,
          maxConfigsPerPair: 24,
          quantiles: [0.5, 0.75],
        },
        live: { ...DEFAULT_SETTINGS.live, kinds: ["exit"] },
      }),
    );
    assert.doesNotThrow(() =>
      checkSettings({ live: { ...DEFAULT_SETTINGS.live, excludeConfigs: ["follow|exit"] } }),
    );
    assert.throws(
      () =>
        checkSettings({
          exitStrategy: {
            ...DEFAULT_SETTINGS.exitStrategy,
            quantiles: [0.2, 0.4, 0.6, 0.8],
            trailShares: [0.2, 0.4, 0.6],
            stopMultiples: [1, 2],
          },
        }),
      /grid too large/,
    );
    assert.throws(
      () =>
        checkSettings({
          exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, maxDdr: 11 },
        }),
      /max drawdown \/ net ratio/,
    );
    assert.throws(
      () =>
        checkSettings({
          exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, minGreenHourShare: 1.1 },
        }),
      /minimum green-hour share/,
    );
  });
});
