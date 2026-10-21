import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { Protect, StratKind, Trade } from "./domain/types.ts";
import { configId, laneProtect, makeUniverse, parseConfigId } from "./pipeline/pipeline.ts";
import { signalSettings } from "./signal-config.ts";
import { signalProtects, sigActiveKey } from "./signals.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { CandleSeries } from "./market/candle-series.ts";
import { laneSeriesFrom, marketHistoryBars, normalizeLanes, sanitizeWf, signalDataHours } from "./server/runtime.server.ts";
import { checkSettings } from "./settings-check.ts";
import { laneContributions } from "./server/live.server.ts";
import { capSignalProtect, enforceSignalPosition, ratchetTrail } from "./sim/trailing.ts";
import { buildTapes, configEval, defaultWalkForward, execDecision, makeTape, signalHistoryHours } from "./sim/walkforward.ts";

const H = 3_600_000;
const T = Date.UTC(2026, 9, 20, 12);

describe("Signal history, bounded trailing and exact-context progression", () => {
  it("keeps 336h independent of engine 24h and persists the override through WF sanitization", () => {
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(wf.longH, 24);
    assert.equal(signalHistoryHours(wf), 336);
    assert.deepEqual(sanitizeWf({ signalLongH: 480 }), { signalLongH: 480 });
    assert.equal(signalHistoryHours({ preH: 6 }), 336);
  });

  it("provides the full Signal history on every lane without expanding ordinary engine cohorts", () => {
    const s = normalizeLanes({ ...DEFAULT_SETTINGS, signals: signalSettings({ lanes: [1, 5, 15, 30] }) });
    const wf = { ...defaultWalkForward(s), simH: 6 };
    const hours = signalDataHours(s, wf);
    assert.ok(hours >= 24 + 336 + 6);
    assert.ok(marketHistoryBars(s, wf) >= hours * 60);
    const candles = new Map([["A", CandleSeries.fromCandles(syntheticCandles("A", 1, Math.ceil(hours * 60), T))]]);
    const engine = laneSeriesFrom(candles, s);
    const signals = laneSeriesFrom(candles, s, 0, hours);
    for (const tf of s.tfs) {
      const a = engine.find((b) => b.tfMin === tf)!;
      const b = signals.find((b) => b.tfMin === tf)!;
      assert.ok(a.n <= s.tfDays[String(tf)] * 24 * 60 / tf);
      assert.ok(b.n * tf / 60 >= 366 - tf / 60);
      assert.equal(b.t.at(-1), a.t.at(-1));
    }
    assert.equal(engine.find((b) => b.tfMin === 1)!.n, 3 * 24 * 60);
  });

  it("validates the 3% maximum and preserves every ceiling in config identities and held stops", () => {
    for (const max of [0.005, 0.01, 0.02, 0.03]) {
      const sig = signalSettings({ trailMax: max, trailRatios: [0.5, 1, 1.5] });
      checkSettings({ signals: sig } as never);
      const p = signalProtects(sig).find((p) => p.trailOnly)!;
      for (const tf of [1, 5, 15, 30]) {
        const lane = capSignalProtect(laneProtect(p, `sig-ema-cross-s@m${tf}`));
        const cfg = configId("follow", `sig-ema-cross-s@m${tf}`, lane);
        assert.equal(parseConfigId(cfg)?.protect.trailMax, max);
        assert.equal(configId("follow", `sig-ema-cross-s@m${tf}`, parseConfigId(cfg)!.protect), cfg);
        for (const side of [1, -1] as const) {
          const pos = { cfg, entry: 100, side, stop: side === 1 ? 80 : 120, peak: 100, trailOn: false };
          enforceSignalPosition(pos);
          assert.ok(side * (100 - pos.stop) <= 100 * max + 1e-12);
          const before = pos.stop;
          ratchetTrail(pos, 0.1, 0.1, side === 1 ? 150 : 100, side === 1 ? 100 : 50);
          assert.ok(side * (pos.stop - before) >= 0);
          assert.ok(Math.abs(pos.peak - pos.stop) <= 100 * max + 1e-12);
        }
      }
    }
    assert.equal(signalSettings({ trailMax: 0.1 }).trailMax, 0.03);
    assert.throws(() => checkSettings({ signals: { trailMax: 0.031 } } as never), /trailing/);
    assert.equal(parseConfigId("follow|sig-ema-cross-s@m15|tp1|sl2|tr1|h2|tm4"), null);
    const legacy = { cfg: "follow|sig-ema-cross-s@m15|tp1|sl4|tr1|h2", entry: 100, side: 1, stop: 90, peak: 100, trailOn: false };
    enforceSignalPosition(legacy);
    assert.equal(legacy.stop, 98, "legacy 2% protection never widens on a settings upgrade");
  });

  it("native Control-order projections use each held ceiling and preserve TP-free protection", () => {
    for (const max of [0.01, 0.02, 0.03]) for (const side of [1, -1] as const) {
      const protect = { tp: 0, sl: 0.05, trail: 0.01, hold: 192, trailOnly: true, trailMax: max };
      const cfg = configId("follow", "sig-ema-cross-s@m15", protect);
      const p = { cfg, sym: "A", side, entry: 100, entryT: T, stop: side === 1 ? 90 : 110,
        peak: 100, trailOn: false, trailOnly: true, target: 0, vol: 1 };
      const rt = { settings: DEFAULT_SETTINGS, paper: { positions: [p] } };
      const contribution = laneContributions(rt as never, new Map([["A", 100]]));
      assert.equal(contribution.length, 1);
      assert.ok(Math.abs(contribution[0].stopPx! - 100 * (1 - side * max)) < 1e-12);
      assert.equal(contribution[0].tgt, undefined);
      assert.equal(p.stop, side === 1 ? 90 : 110, "read-only control projection");
    }
  });

  it("calculates every standard trailing ratio independently with the selected maximum", () => {
    const sig = signalSettings({ trailMax: 0.03, trailRatios: [0.5, 1, 1.5], exits: "both" });
    const u = makeUniverse([barsFromCandles("A", 15, syntheticCandles("A", 15, 1600, T))]);
    const tapes = buildTapes(u, signalProtects(sig), 0.002, undefined,
      new Set(["follow|sig-ema-cross-s@m15"]), null, null,
      { minSl: sig.minSl, minTrail: sig.minTrail, signalReferenceGrid: true, signalTrailMax: sig.trailMax });
    assert.equal(new Set(tapes.map((t) => t.id)).size, tapes.length);
    for (const kind of ["normal", "trailing", "trailing-only"])
      assert.ok(tapes.some((t) => t.kind === kind), kind);
    assert.ok(tapes.some((t) => t.protect.atr));
    assert.ok(tapes.some((t) => (t.protect.trailStep ?? 1) === 0.5));
    for (const t of tapes) {
      assert.equal(t.protect.trailMax, 0.03);
      assert.ok(t.protect.sl <= 0.03);
      assert.ok(t.protect.trail <= 0.03);
      if (!t.protect.atr) assert.ok(t.protect.trail * (t.protect.trailStep ?? 1) <= 0.03 + 1e-12);
    }
  });

  for (const range of ["s", "m"])
    for (const tf of [1, 5, 15, 30])
      for (const kind of ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis"] as StratKind[])
        it(`${range}/${tf}m/${kind}: exact Last-25 cannot borrow a symbol, side or future recovery`, () => {
          const ind = `sig-ema-cross-${range}@m${tf}`;
          const p: Protect = { tp: kind === "trailing-only" ? 0 : 0.02, sl: 0.02, trail: kind === "normal" ? 0 : 0.01,
            hold: 192, trailMax: 0.03, ...(kind === "trailing-only" ? { trailOnly: true } : {}) };
          const id = configId("follow", ind, p, kind);
          const rows: Trade[] = [];
          for (let i = 0; i < 25; i++)
            for (const [sym, side, r] of [["A", 1, 0.01], ["A", -1, -0.01], ["B", 1, 0.02]] as const)
              rows.push({ cfg: id, sym, side, entryT: T - (300 - i * 4) * H - 60_000, exitT: T - (300 - i * 4) * H,
                entry: 100, exit: 100 * (1 + side * r), r, reason: "time", bars: 1, mfe: 0, mae: 0, kind });
          const tape = makeTape(id, "follow", ind, p, kind, ["A", "A", "B", "B", "C", "C"], rows, [], []);
          const d = defaultWalkForward(DEFAULT_SETTINGS);
          const options = { ...d, signalOwnBase: true, signalValidLastN: 25,
            signalActive: new Set(["A", "B", "C"].flatMap((sym) => [1, -1].map((side) => sigActiveKey("follow", ind, sym, side, kind, id)))),
            signalAccept: undefined, signalSideAccept: undefined, signalCluster: undefined, signalGuardN: 0,
            gates: { ...d.gates, minPf: 1.1, rangeMinPf: undefined, minTrades: 3, maxDdr: 0, maxDdtH: 1000, minGreen: 0, lossPrior: false, lastNFloor: 0 },
            preGate: false, rangeGate: undefined,
            toggles: { ...d.toggles, normal: true, trailing: true, dca: true, dcaActive: kind === "dca-active", axis: true, block: false, blockActive: false } };
          const evaluation = configEval(tape, T, options);
          assert.equal(evaluation.candidate?.n, 75, "336h unfiltered config history remains available");
          assert.equal(evaluation.n, 50, "Strategy Base keeps only the two qualified own contexts in its admitted cohort");
          assert.equal(execDecision(tape, T, options, { sym: "A", side: 1 }).ok, true);
          assert.equal(execDecision(tape, T, options, { sym: "A", side: -1 }).ok, false);
          assert.equal(execDecision(tape, T, options, { sym: "C", side: 1 }).ok, false);
          assert.equal(execDecision(tape, T - 220 * H, options, { sym: "A", side: 1 }).ok, false, "only 21 closes had settled");
        });
});
