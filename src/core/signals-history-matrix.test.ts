import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { Protect, StratKind, Trade } from "./domain/types.ts";
import { configId, laneProtect, makeUniverse, parseConfigId } from "./pipeline/pipeline.ts";
import { signalSettings } from "./signal-config.ts";
import { signalProtects, sigActiveKey } from "./signals.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { CandleSeries } from "./market/candle-series.ts";
import { laneSeriesFrom, marketHistoryBars, normalizeLanes, sanitizeWf, signalDataHours, signalLaneSeriesFrom } from "./server/runtime.server.ts";
import { checkSettings } from "./settings-check.ts";
import { laneContributions } from "./server/live.server.ts";
import { capSignalProtect, enforceSignalPosition, ratchetTrail } from "./sim/trailing.ts";
import { buildTapes, configEval, defaultWalkForward, execDecision, makeTape, signalHistoryHours } from "./sim/walkforward.ts";

const H = 3_600_000;
const T = Date.UTC(2026, 9, 20, 12);

describe("Signal history, bounded trailing and exact-context progression", () => {
  it("keeps 100h independent of engine 24h and persists the override through WF sanitization", () => {
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(wf.longH, 24);
    assert.equal(signalHistoryHours(wf), 100);
    assert.deepEqual(sanitizeWf({ signalLongH: 480 }), { signalLongH: 480 });
    assert.equal(signalHistoryHours({ preH: 6 }), 100);
  });

  it("provides the full Signal history on every lane without expanding ordinary engine cohorts", () => {
    const s = normalizeLanes({ ...DEFAULT_SETTINGS, signals: signalSettings({ lanes: [1, 5, 15, 30] }) });
    const wf = { ...defaultWalkForward(s), simH: 6 };
    const hours = signalDataHours(s, wf);
    assert.ok(hours >= 24 + 100 + 6);
    assert.ok(marketHistoryBars(s, wf) >= hours * 60);
    const candles = new Map([["A", CandleSeries.fromCandles(syntheticCandles("A", 1, Math.ceil(hours * 60), T))]]);
    const engine = laneSeriesFrom(candles, s);
    const signals = signalLaneSeriesFrom(candles, s, wf);
    for (const tf of s.tfs) {
      const a = engine.find((b) => b.tfMin === tf)!;
      const b = signals.find((b) => b.tfMin === tf)!;
      assert.ok(a.n <= s.tfDays[String(tf)] * 24 * 60 / tf);
      assert.ok(b.n * tf / 60 >= hours - tf / 60);
      assert.ok(b.n * tf / 60 <= hours + tf / 60, "ordinary retention cannot expand Signal work");
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
          const options = { ...d, signalOwnBase: true, signalLongH: 336, signalValidLastN: 25,
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

for (const hours of [100, 336]) for (const worker of [false, true])
it(`${worker ? "worker" : "local"} runtime Signal tapes retain their independent ${hours}h history beside the 24h engine`, async () => {
  const { CoreRuntime } = await import("./server/runtime.server.ts");
  const { CoreDb } = await import("./server/db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), {
    symbols: 1, tfMin: 1, tfs: [15], historyDays: 1, tfDays: { "15": 1 },
    focus: ["follow|ema-9-21@m15"], pinned: [], exitStrategy: { enabled: false },
    grid: { allSets: true, tp: [0.02], slOfTp: [1], trailOfTp: [0], holdH: [1],
      micro: false, minimal: false, minimalPlus: false, short: false, general: false, long: false },
    // Raw tape-history contract: representative discovery is disabled, while entry qualification remains separate.
    signals: signalSettings({ enabled: true, baseGate: false, sourcesMode: "allow", sources: { "ema-cross": true }, lanes: [15],
      exits: "pct", hist: { ...signalSettings().hist, enabled: false }, count: 0, validate: false,
      normal: { tp: [0.02], slOfTp: [1] }, trailing: { tp: [0.03], slOfTp: 1, trailOfTp: [0.5] },
      trailingOnly: { ...signalSettings().trailingOnly, enabled: false } }),
    gates: { minPf: 1.05, minTrades: 1, maxDdr: 0 },
    tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false },
  } as never, { market: "synthetic", priceStream: null });
  try {
    rt.stop();
    if (!worker) Object.assign(rt, { workersBroken: true, workersBrokenAt: Date.now() });
    rt.wf = { ...rt.wf, longH: 24, preH: 6, simH: 6, signalLongH: hours,
      signalValidLastN: 0, lastN: 0, validLastN: 0 };
    rt.candles.set("HISTORY-USDT", CandleSeries.fromCandles(syntheticCandles("HISTORY", 1, 380 * 60, T)));
    await rt.compute();
    const signals = rt.tapes.filter((t) => t.ind.startsWith("sig-"));
    assert.ok(signals.length > 0, JSON.stringify({ message: "actual Signal tapes built", enabled: rt.settings.signals.enabled, tfs: rt.settings.tfs, signalStatus: rt.status.signals, tapes: rt.tapes.map(t => t.ind).slice(0,5) }));
    const earliest = Math.min(...signals.flatMap((t) => Array.from(t.entryT)));
    assert.ok(earliest < T - (hours - 36) * H, `independent old Signal trades missing: ${earliest}`);
    assert.ok(earliest >= T - signalDataHours(rt.settings, rt.wf) * H, "ordinary retention cannot expand Signal history");
    if (worker) assert.equal((rt as unknown as { workersBroken: boolean }).workersBroken, false, "actual worker path must succeed");
    const engine = rt.tapes.filter((t) => !t.ind.startsWith("sig-"));
    assert.ok(engine.length > 0, "ordinary raw engine tapes also built");
    assert.ok(engine.every((t) => Array.from(t.entryT).every((v) => v >= T - 72 * H)),
      "ordinary engine histories stay bounded independently");
    // Signals rebuild in a light cycle while resumable ordinary tapes keep their own shorter universe.
    const byId = new Map(signals.map((t) => [t.id, t]));
    const signalIds = new Set(byId.keys());
    const u = makeUniverse(laneSeriesFrom(rt.candles, rt.settings, 0, 54));
    const inner = rt as unknown as { inc: unknown; gen: number; lightStep(gen: number): Promise<boolean> };
    inner.inc = { state: { universe: u, step: () => ({ tapes: new Map(), broken: new Set() }) },
      others: signalIds, ids: signalIds, since: 0, heavyBar: 1 };
    await inner.lightStep(inner.gen);
    const rebuiltSignals = rt.tapes.filter((t) => signalIds.has(t.id));
    assert.equal(rebuiltSignals.length, signals.length, "every exact Signal config survives the long-history rebuild");
    for (const t of rebuiltSignals) {
      const original = byId.get(t.id)!;
      assert.notEqual(t, original, "the Signal was actually rebuilt by the incremental path");
      for (const key of ["entryT", "exitT", "r"] as const)
        assert.deepEqual(Array.from(t[key]), Array.from(original[key]), `light Signal ${key} retains independent full history`);
    }

  } finally {
    rt.dispose(); await rt.backtestsSettled(); rt.db.db.close();
  }
});
