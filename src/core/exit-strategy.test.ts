import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "./config.ts";
import { checkSettings } from "./settings-check.ts";
import {
  capExitCandidates,
  emptyExitStrategyDiagnostics,
  exitHistoryFingerprint,
  exitProtectCandidates,
  exitStrategyPairs,
  exitStrategyProtectsGen,
  heldExitProtect,
} from "./exit-strategy.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import {
  makeUniverse,
  configId,
  kindOfId,
  laneProtect,
  parseConfigId,
} from "./pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward, execDecision, kindExecutable } from "./sim/walkforward.ts";
import { liveLaneFilter, rangeExcluded } from "./server/live.server.ts";
import { planLaneOrders } from "./server/lane-orders.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";
import type { Bars, Protect } from "./domain/types.ts";

function finish<T>(g: Generator<void, T>): T {
  let x = g.next();
  while (!x.done) x = g.next();
  return x.value;
}

describe("independent historic exit strategy", () => {
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

  it("fits independent, higher TP and historical SL config families without a range target", () => {
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
    assert.deepEqual(Object.keys(candidates).sort(), ["adaptive-sl", "static-sl", "trailing"]);
    assert.ok(candidates["static-sl"].length);
    assert.ok(candidates["adaptive-sl"].length);
    assert.ok(candidates.trailing.length);
    for (const [set, protects] of Object.entries(candidates))
      for (const protect of protects) {
        assert.equal(protect.exitSet, set);
        assert.equal(
          protect.tag,
          undefined,
          "Historic Exit targets do not inherit Normal / Trailing range tags",
        );
        assert.ok(protect.tp >= DEFAULT_SETTINGS.exitStrategy.minTp);
      }
    assert.ok(
      candidates.trailing.every((protect) => protect.trail > 0 && protect.trail < protect.tp),
    );
    assert.ok(candidates["static-sl"].every((protect) => protect.trail === 0));
  });

  it("includes every initialized engine indication without applying Base admission", () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 200, Date.UTC(2026, 8, 1), 12),
    );
    const u = makeUniverse([bars]);
    assert.deepEqual(
      exitStrategyPairs(
        [
          { bot: "follow", ind: "ema-9-21@m15" },
          { bot: "follow", ind: "ema-9-21@m15" },
          { bot: "revert", ind: "rsi-9-21@m15" },
          { bot: "follow", ind: "sig-ema-cross-s@m15" },
          { bot: "follow", ind: "ema-9-21@m30" },
        ],
        u,
      ),
      ["follow|ema-9-21@m15", "revert|rsi-9-21@m15"],
      "Exit sees all initialized engine pairs, deduplicates them, and excludes signal-only or unavailable lanes",
    );
  });

  it("keeps independent exit-set identity and direction through lane restart recovery", () => {
    for (const ind of [
      "rsi-mom-14-20@m1",
      "rsi-mom-14-20@m5",
      "rsi-mom-14-20@m15",
      "rsi-mom-14-20@m30",
    ]) {
      for (const side of [1, -1] as const) {
        for (const exitSet of ["static-sl", "adaptive-sl", "trailing"] as const) {
          const ref: Protect = {
            tp: 0.025,
            sl: 0.04,
            trail: exitSet === "trailing" ? 0.0075 : 0,
            hold: 64,
            exitType: "historic",
            exitSide: side,
            exitSet,
          };
          const id = configId("follow", ind, laneProtect(ref, ind));
          assert.equal(kindOfId(id), "exit");
          const parsed = parseConfigId(id);
          assert.equal(parsed?.protect.exitType, "historic");
          assert.equal(parsed?.protect.exitSide, side);
          assert.equal(parsed?.protect.exitSet, exitSet);
          assert.equal(parsed?.protect.tag, undefined);
          const held = heldExitProtect(id);
          assert.ok(held, id);
          assert.equal(held.pair, `follow|${ind}`);
          assert.equal(held.protect.exitSet, exitSet);
          assert.equal(configId("follow", ind, laneProtect(held.protect, ind)), id);
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

  it("runtime fits an initialized engine pair even when Base admits no pairs", async () => {
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
      assert.ok(rt.status.computes >= 1 && rt.audit, "runtime completes the Exit history compute");
      assert.ok(rt.pipeline?.s1.some((run) => run.bot === "follow" && run.ind === "ema-9-21@m15"));
      assert.equal(rt.status.basePassed, 0, "the high Base sample floor admits no pair");
      assert.ok(
        rt.status.phases["Exit history"],
        "Historic Exit gets its own fit and holdout phase",
      );
      assert.ok(
        rt.tapes
          .filter((tape) => tape.kind === "exit")
          .every((tape) => tape.protect.tag === undefined),
        "any runtime Exit tape remains outside all range tags",
      );
    } finally {
      rt.stop();
    }
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
        p.exitSet === "static-sl" || p.exitSet === "adaptive-sl" || p.exitSet === "trailing",
      );
    }
    assert.ok((a[pair] ?? []).every((p) => p.exitType === "historic" && p.tag === undefined));
  });

  it("qualifies all three independent exits on a planted trend/turn history with profitable orders", () => {
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
    const pair = "follow|ema-9-21@m15";
    const settings = {
      ...DEFAULT_SETTINGS.exitStrategy,
      lookbackH: 240,
      trainFraction: 0.6,
      minEntries: 5,
      minValidationTrades: 4,
      minPf: 1.05,
      maxDdr: 0,
      holdH: 3,
      maxConfigsPerPair: 12,
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
      6,
      "each of three tactics qualifies long and short independently",
    );
    assert.deepEqual([...new Set(protects.map((protect) => protect.exitSet))].sort(), [
      "adaptive-sl",
      "static-sl",
      "trailing",
    ]);
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

  it("builds three independent historical Exit tapes and simulates each configured side", () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 3000, Date.UTC(2026, 8, 1), 3),
    );
    const u = makeUniverse([bars]);
    const ind = "ema-9-21@m15";
    const pair = `follow|${ind}`;
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
    ];
    const tapes = buildTapes(u, [], 0.002, undefined, new Set([pair]), null, undefined, {
      minSl: 0,
      minTrail: 0,
      pairProtects: { [pair]: protects },
    }).filter((x) => x.kind === "exit");
    assert.equal(tapes.length, 3);
    assert.equal(new Set(tapes.map((tape) => tape.id)).size, 3);
    assert.deepEqual(
      tapes.map((tape) => parseConfigId(tape.id)?.protect.exitSet),
      ["static-sl", "adaptive-sl", "trailing"],
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
    const pair = `follow|${ind}`;
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
  });
});
