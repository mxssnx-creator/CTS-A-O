import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "./config.ts";
import { barsFromCandles, headBars, syntheticCandles } from "./market/bars.ts";
import {
  baseRuns,
  configId,
  laneProtect,
  makeUniverse,
  passesBase,
  runCombo,
} from "./pipeline/pipeline.ts";
import {
  activeSignalsAt,
  buildTapes,
  defaultWalkForward,
  execDecision,
  type ConfigTape,
} from "./sim/walkforward.ts";
import {
  signalCandidates,
  signalEvaluationPairs,
  signalProtects,
  sigActiveKey,
} from "./signals.ts";
import { signalSettings } from "./signal-config.ts";
import { closePool, runOnWorkers } from "./server/pool.server.ts";
import { adjustProtect } from "./adjust.ts";

const H = 3_600_000;
const END = Date.UTC(2026, 9, 15, 4);
const FROM = END - 12 * H;
const CUT = END - 6 * H;
const IND = "sig-ema-cross-s@m1";
const configured = [{ bot: "follow", ind: IND }];
const fixture = () =>
  makeUniverse(
    [headBars(barsFromCandles("A-USDT", 1, syntheticCandles("A-USDT", 1, 1800, END, 19)), CUT)],
    FROM,
  );
const sig = signalSettings({ filter: { trendH: 0, volFloor: 0 } });
const gates = { ...DEFAULT_SETTINGS.gates, minPf: 1.1, minTrades: 3 };

describe("Signals: independent protection discovery", () => {
  it("computes own histories even when the unrelated representative has fewer than three closes", () => {
    const u = fixture();
    const representative = runCombo(u, "follow", IND, DEFAULT_PROTECT, 0.002, 1, null)!;
    assert.equal(representative.full.n, 0);
    assert.equal(
      signalCandidates([representative], sig.minTrades).size,
      0,
      "old representative-only admission loses this pair",
    );
    const pairs = signalEvaluationPairs(configured, [representative], sig, (r) =>
      passesBase(r.full, gates),
    );
    assert.deepEqual([...pairs], [`follow|${IND}`]);
    const tapes = buildTapes(u, signalProtects(sig), 0.002, undefined, pairs, null, null, {
      minSl: sig.minSl,
      minTrail: sig.minTrail,
      signalReferenceGrid: true,
    });
    assert.equal(tapes.length, 36);
    assert.ok(tapes.filter((tp) => tp.kind === "trailing-only").some((tp) => tp.n >= 3));
    assert.ok(tapes.filter((tp) => tp.kind !== "trailing-only").every((tp) => tp.n < 3));
    assert.ok(tapes.every((tp) => [...tp.entryT].every((t) => t >= FROM)));
    assert.deepEqual(
      [...activeSignalsAt(tapes, CUT, sig, 48)],
      [],
      "calculation does not waive the actual quality/ranking gates",
    );
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    const capped = tapes.find((tp) => tp.kind === "trailing")!;
    const decision = execDecision(
      capped,
      CUT,
      {
        ...wf,
        signalOwnBase: true,
        signalActive: new Set([sigActiveKey("follow", IND, "A-USDT", 1, "trailing-only")]),
      },
      { sym: "A-USDT", side: 1 },
    );
    assert.deepEqual(
      decision,
      { ok: false, why: "signalInactive" },
      "another type's discovery/record is never its qualification",
    );

    const historic = { tp: 0.03, sl: 0.06, trail: 0.01, hold: 192 };
    const buildStats = new Map();
    const withHistoric = buildTapes(u, signalProtects(sig), 0.002, undefined, pairs, null, null, {
      minSl: sig.minSl,
      minTrail: sig.minTrail,
      signalReferenceGrid: true,
      pairProtects: { [`follow|${IND}`]: [historic] },
      buildStats,
    });
    assert.equal(withHistoric.length, 36, "standard lane aliases retain every effective configured cell");
    assert.ok(
      !withHistoric.some((tp) => tp.id === configId("follow", IND, laneProtect(historic, IND))),
      "a history-qualified custom trail stays disabled if lane scaling takes it below its floor",
    );
    assert.equal(buildStats.get(`${IND}||trailing`)?.skip.trailTooShort, 1);
  });

  it("keeps explicit representative Base gates, initialization and family/configuration restrictions", () => {
    const poor = {
      bot: "follow",
      ind: IND,
      full: { n: 20, pf: 0.5, net: -1, mdd: 1 },
      bySym: { "A-USDT": { n: 20 } },
    };
    const rich = { ...poor, full: { n: 20, pf: 2, net: 3, mdd: 1 } };
    const pass = (r: typeof poor) => passesBase(r.full, gates);
    assert.deepEqual(
      [...signalEvaluationPairs(configured, [poor], { ...sig, baseGate: true }, pass)],
      [],
    );
    assert.deepEqual(
      [...signalEvaluationPairs(configured, [rich], { ...sig, baseGate: true }, pass)],
      [`follow|${IND}`],
    );
    assert.deepEqual(
      [
        ...signalEvaluationPairs(
          configured,
          [{ ...rich, bySym: { "A-USDT": { n: 2 } } }],
          { ...sig, baseGate: true },
          pass,
        ),
      ],
      [],
    );
    assert.deepEqual(
      [...signalEvaluationPairs([], [rich], sig, pass)],
      [],
      "uninitialized or family-excluded pairs stay excluded",
    );
    assert.deepEqual(
      [...signalEvaluationPairs(configured, [rich], { ...sig, enabled: false }, pass)],
      [],
    );
    assert.deepEqual(
      [
        ...signalEvaluationPairs(configured, [], sig, () => {
          throw new Error("representative must not judge own-history discovery");
        }),
      ],
      [`follow|${IND}`],
    );
  });

  it("preserves configured floors and accounts for raw-to-effective protection aliases", () => {
    const requested = signalProtects(sig);
    const effective = (tf: number) =>
      requested.map((p) => adjustProtect(laneProtect(p, `sig-ema-cross-s@m${tf}`), sig));
    const unique = (tf: number) =>
      new Set(effective(tf).map((p) => configId("follow", `sig-ema-cross-s@m${tf}`, p)));
    assert.equal(requested.length, 39);
    assert.deepEqual(
      [1, 5, 15, 30].map((tf) => unique(tf).size),
      [36, 39, 39, 39],
    );
    assert.equal(
      new Set(
        effective(1)
          .filter((p) => p.trailOnly)
          .map((p) => configId("follow", IND, p)),
      ).size,
      6,
    );
    assert.ok(
      effective(1)
        .filter((p) => p.trail > 0)
        .every((p) => p.trail >= sig.minTrail),
    );
    assert.equal(
      requested.filter((p) => p.trailOnly).length,
      9,
      "all nine requested no-TP cells retain alias provenance",
    );
  });

  it("workers and local calculation preserve every effective type without representative pruning", async () => {
    const u = fixture();
    const localBase = baseRuns(u, configured, 0.002, null, true);
    const pairs = signalEvaluationPairs(configured, localBase, sig, (r) =>
      passesBase(r.full, gates),
    );
    const floors = { minSl: sig.minSl, minTrail: sig.minTrail, signalReferenceGrid: true };
    const protects = signalProtects(sig);
    const local = buildTapes(u, protects, 0.002, undefined, pairs, null, null, floors);
    try {
      const [base] = await runOnWorkers<{ runsJson: string[] }>(
        [
          {
            type: "s1",
            bars: u.series,
            evaluationFromT: FROM,
            combos: configured,
            cost: 0.002,
            tactics: null,
          },
        ],
        2,
      );
      const remoteBase = base.runsJson.flatMap((chunk) => JSON.parse(chunk));
      assert.deepEqual(remoteBase, localBase);
      const remotePairs = signalEvaluationPairs(configured, remoteBase, sig, (r) =>
        passesBase(r.full, gates),
      );
      assert.deepEqual([...remotePairs], [...pairs]);
      const [remote] = await runOnWorkers<{ tapes: ConfigTape[] }>(
        [
          {
            type: "tapes",
            bars: u.series,
            evaluationFromT: FROM,
            pairs: [...remotePairs],
            protects,
            cost: 0.002,
            tactics: null,
            dcaOpt: null,
            adjust: null,
            floors,
          },
        ],
        2,
      );
      assert.deepEqual(remote.tapes, local);
      assert.deepEqual(
        ["normal", "trailing", "trailing-only"].map(
          (kind) => remote.tapes.filter((tp) => tp.kind === kind).length,
        ),
        [15, 15, 6],
      );
    } finally {
      closePool();
    }
  });
});
