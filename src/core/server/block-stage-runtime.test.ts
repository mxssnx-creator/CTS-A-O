import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { orderKey } from "../sizing.ts";
import { defaultWalkForward, makeTape, walkForward, type ConfigTape, type BlockFeedEntry } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { laneContributions } from "./live.server.ts";

// The full selection path caps its simulated clock at the current hour. Keep
// every forward entry in the past so the full and incremental paths can both
// advance through the complete causal sequence.
const H = 3_600_000, M = 60_000, T = Math.floor(Date.now() / H) * H - H;
const ind = "ema-9-21@m1", protect = { tp: .0215, sl: .0085, trail: 0, hold: 60, tag: "mn" as const };
const cfg = configId("follow", ind, protect), sym = "OWN-USDT";
type Hooks = {
  lastSelection: unknown;
  stepPaper(): void;
  stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }): Generator<number, void>;
  appendRealtimeLearningGen(tapes: readonly ConfigTape[]): Generator<number, void>;
  realtimeLearning: { feed: BlockFeedEntry[]; accepted: Trade[] };
  paperUnits(): Float64Array;
};
const drain = (g: Generator<number, void>) => { for (const _ of g) { /* cooperative runtime */ } };
const row = (entryT: number): Trade => ({ cfg, sym, side: 1, entryT, exitT: entryT + M,
  entry: 100, exit: 102.15, r: .02, mult: 1, kind: "normal", reason: "tp", bars: 1, mfe: 0, mae: 0 });
const history = Array.from({ length: 160 }, (_, i) => row(T - 11 * H + i * 2 * M));
const tape = (rows: Trade[], open: OpenPosition[] = []) => makeTape(cfg, "follow", ind, protect, "normal", [sym], rows, open, []);

for (const mode of ["full", "fast"] as const) test(`${mode}: persistent Block processes through own stages without funding its precursors`, () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-block-native-"));
  const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
  const rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    const d = defaultWalkForward(DEFAULT_SETTINGS);
    rt.wf = { ...d, preH: 12, longH: 12, simH: 12, mode: "fixed", seatPer: "config", portfolio: 0,
      maxPositions: 0, maxOpen: 1, symGate: "off", rangeOpts: undefined,
      basePassed: new Set([`follow|${ind}`]), basePassedRanges: { [`follow|${ind}`]: ["mn"] },
      toggles: { ...d.toggles, normal: false, block: true, blockActive: true },
      block: { ...d.block, mode: "overall", historySource: "processed-orders", ratio: .2, maxMult: 2,
        minActiveLevel: 1, sources: { config: true } },
      coord: { ...d.coord!, enabled: false }, signalRank: undefined, engineSideAccept: undefined,
      processedStages: { validationN: 12, realN: 12 } };
    const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 1 } as never;
    rt.sim = walkForward(u, [], rt.wf);
    rt.sim.validated = [cfg];
    rt.paper.selected = [cfg];
    const hooks = rt as unknown as Hooks;
    hooks.lastSelection = { picks: [{ id: cfg, score: 1 }], eligible: 1 };
    for (let i = 0; i < 27; i++) {
      const r = row(T + 2 * i * M);
      const op: OpenPosition = { cfg, sym, side: 1, entryT: r.entryT, entryI: 0, entry: 100,
        stop: 99.15, target: 102.15, peak: 100, trailOn: false, mtm: .01 };
      rt.tapes = [tape([...history, ...Array.from({ length: i }, (_, j) => row(T + 2 * j * M))], [op])];
      if (mode === "full") { rt.sim.endT = r.entryT; hooks.stepPaper(); }
      else drain(hooks.stepPaperGen({ opens: new Map([[cfg, [op]]]), t: r.entryT, refreshHeld: true }));
      const p = rt.paper.positions[0];
      assert.ok(p, JSON.stringify(rt.status.paperSkips));
      assert.equal(p.processedStage, i < 12 ? "postBase" : i < 24 ? "validated" : "active");
      assert.equal(p.blockPredecessor, i < 25 ? true : undefined, JSON.stringify({i,block:rt.wf.block,feed:hooks.realtimeLearning?.feed.slice(-3)}));
      if (i < 25) {
        assert.equal(rt.paper.units!.get(orderKey(p)), 0);
        assert.equal(hooks.paperUnits()[0], 0);
        assert.equal(rt.livePromotionGate(p, r.entryT).ok, false);
        assert.deepEqual(laneContributions(rt), [], "processing-only precursors cannot create venue control requests");
      } else assert.ok(p.blockVol! > 1);
      drain(hooks.appendRealtimeLearningGen([tape([r])]));
      const f = hooks.realtimeLearning.feed.at(-1)!;
      assert.equal(f.accepted, i >= 25);
      assert.equal(!!f.blockProcessed, i === 24);
      rt.tapes = [tape([...history, ...Array.from({ length: i + 1 }, (_, j) => row(T + 2 * j * M))])];
      if (mode === "full") { rt.sim.endT = r.exitT + 1; hooks.stepPaper(); }
      else drain(hooks.stepPaperGen({ opens: new Map([[cfg, []]]), t: r.exitT + 1, refreshHeld: true }));
      assert.equal(rt.paper.positions.length, 0);
      if (i < 25) {
        assert.equal(rt.paper.trades.length, 0, "precursors cannot enter the funded paper return cohort");
        assert.equal(rt.paper.equity, 0);
      }
    }
    const snapshot = db.kvGet<{ book: { sets: unknown[]; open: unknown[] } }>("processedNativePaperV1")!;
    assert.equal(snapshot.book.open.length, 0);
    assert.ok(snapshot.book.sets.length > 0);
  } finally { rt.dispose(); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
