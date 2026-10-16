import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "./config.ts";
import { checkSettings } from "./settings-check.ts";
import {
  capExitCandidates,
  emptyExitStrategyDiagnostics,
  exitHistoryFingerprint,
  exitTargetsForPair,
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
import {
  buildTapes,
  defaultWalkForward,
  execDecision,
  kindExecutable,
} from "./sim/walkforward.ts";
import { liveLaneFilter, rangeExcluded } from "./server/live.server.ts";
import { planLaneOrders } from "./server/lane-orders.ts";
import type { Bars, Protect } from "./domain/types.ts";

function finish<T>(g: Generator<void, T>): T {
  let x = g.next();
  while (!x.done) x = g.next();
  return x.value;
}

describe("independent historic exit strategy", () => {
  it("caps candidate sets fairly across range and direction groups", () => {
    assert.deepEqual(
      capExitCandidates([["L-mn-1", "L-mn-2"], ["S-mn-1"], ["L-sh-1", "L-sh-2"]], 4),
      ["L-mn-1", "S-mn-1", "L-sh-1", "L-mn-2"],
    );
    assert.deepEqual(
      capExitCandidates(
        [
          ["L-wide-1", "L-wide-2"],
          ["S-wide-1", "S-wide-2"],
          ["L-mn-1"],
          ["S-mn-1"],
          ["L-sh-1"],
          ["S-sh-1"],
        ],
        6,
      ),
      ["L-wide-1", "S-wide-1", "L-mn-1", "S-mn-1", "L-sh-1", "S-sh-1"],
      "the per-pair cap first gives each range and direction an independent seat",
    );
  });

  it("uses only Base-passed range targets unless the configured grid builds every range", () => {
    const protects: Protect[] = [
      { tp: 0.01, sl: 0.02, trail: 0, hold: 32 },
      { tp: 0.02, sl: 0.04, trail: 0, hold: 32 },
      { tp: 0.02, sl: 0.03, trail: 0, hold: 32, tag: "mn" },
      { tp: 0.03, sl: 0.045, trail: 0, hold: 32, tag: "mn" },
      { tp: 0.04, sl: 0.06, trail: 0, hold: 32, tag: "sh" },
    ];
    const options = {
      minTrailByTag: { mn: 0.006 },
      defaultMinTrail: 0.005,
    };
    assert.deepEqual(
      exitTargetsForPair(["", "mn", "sh"], { mn: [0.02] }, protects, {
        ...options,
        baseRanges: true,
      }),
      [
        { tp: 0.01, minSl: 0.02, minTrail: 0 },
        { tp: 0.02, minSl: 0.04, minTrail: 0 },
        { tp: 0.02, tag: "mn", minSl: 0.03, minTrail: 0.006 },
      ],
    );
    assert.deepEqual(
      exitTargetsForPair(["mn", "sh"], { mn: [0.02] }, protects, {
        ...options,
        baseRanges: false,
      }).map(({ tag, tp }) => [tag, tp]),
      [
        ["mn", 0.02],
        ["sh", 0.04],
      ],
    );
  });

  it("keeps exact historic direction and range identity through lane restart recovery", () => {
    for (const [ind, tag] of [
      ["rsi-mom-14-20@m1", "mn"],
      ["rsi-mom-14-20@m5", "sh"],
      ["rsi-mom-14-20@m15", "gn"],
      ["rsi-mom-14-20@m30", "lg"],
    ] as const) {
      for (const side of [1, -1] as const) {
        const ref: Protect = {
          tp: 0.025,
          sl: 0.04,
          trail: 0.0075,
          hold: 64,
          tag,
          exitType: "historic",
          exitSide: side,
        };
        const id = configId("follow", ind, laneProtect(ref, ind));
        assert.equal(kindOfId(id), "exit");
        const parsed = parseConfigId(id);
        assert.equal(parsed?.protect.exitType, "historic");
        assert.equal(parsed?.protect.exitSide, side);
        assert.equal(parsed?.protect.tag, tag);
        const held = heldExitProtect(id);
        assert.ok(held, id);
        assert.equal(held.pair, `follow|${ind}`);
        assert.equal(configId("follow", ind, laneProtect(held.protect, ind)), id);
      }
    }
  });

  it("applies live range exclusions to tagged and untagged Historic Exit lanes", () => {
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
    assert.equal(rangeExcluded(tagged, new Set(["mn"])), true);
    assert.equal(rangeExcluded(wide, new Set(["wide"])), true);
    assert.equal(rangeExcluded(wide, new Set(["mn"])), false);
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
    const filter = liveLaneFilter({ source: "engine", kinds: ["exit"] }, null, null);
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
    assert.ok(lanes.every((l) => filter.sendable({ cfg: l.cfg, vol: 1, sym: l.sym, side: l.side })));
    const actions = planLaneOrders(lanes, {}, new Set(), {
      px: () => 100,
      stopPx: (_lane, px) => px,
      targetPx: (_lane, px) => px,
      budget: 4,
      slots: 4,
    });
    for (const lane of lanes) {
      assert.deepEqual(
        actions.filter((action) => action.lane === lane.id).map((action) => action.kind).sort(),
        ["placeStop", "placeTarget"],
        "each qualified exit lane receives its own partial stop and target",
      );
    }
  });

  it("keeps Historic Exit independent when the Normal toggle is off", () => {
    const t = buildTapes(
      makeUniverse([
        barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 3000, Date.UTC(2026, 8, 1), 8)),
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
    const disabled = execDecision(t, t.entryT[0] + 1, {
        ...options,
        toggles: { ...options.toggles, exit: false },
      }) as { why?: string };
    assert.equal(disabled.why, "toggle");
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
    const targets = { [pair]: [{ tp: 0.03, minSl: 0.01, minTrail: 0.002 }] };
    const validation = { cost: 0.002, minPf: 1.05, minTrades: 2, minSl: 0, minTrail: 0 };
    const aDiagnostics = emptyExitStrategyDiagnostics();
    const bDiagnostics = emptyExitStrategyDiagnostics();
    const a = finish(
      exitStrategyProtectsGen(
        makeUniverse([original]),
        [pair],
        targets,
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
        targets,
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
    for (const p of a[pair] ?? []) assert.ok(p.exitSide === 1 || p.exitSide === -1);
    assert.ok((a[pair] ?? []).every((p) => p.exitType === "historic"));
  });

  it("builds and simulates a historical exit tape for its own side only", () => {
    const bars = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 3000, Date.UTC(2026, 8, 1), 3),
    );
    const u = makeUniverse([bars]);
    const ind = "sig-ema-cross-s@m15";
    const pair = `follow|${ind}`;
    const p: Protect = {
      tp: 0.03,
      sl: 0.06,
      trail: 0.01,
      hold: 192,
      exitType: "historic",
      exitSide: 1,
    };
    const tapes = buildTapes(u, [], 0.002, undefined, new Set([pair]), null, undefined, {
      minSl: 0,
      minTrail: 0,
      pairProtects: { [pair]: [p] },
    });
    const tape = tapes.find((x) => x.kind === "exit");
    assert.ok(tape);
    assert.equal(tape.id, configId("follow", ind, p));
    assert.ok(tape.n > 0);
    assert.ok(
      Array.from(tape.side).every((side) => side === 1),
      "short signals stay in their separate config set",
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
