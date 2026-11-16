import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";
import { orderKey } from "../sizing.ts";
import { defaultWalkForward, makeTape, walkForward, type ConfigTape, type BlockFeedEntry } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const H = 3_600_000, M = 60_000, T = Math.floor(Date.now() / H) * H - H;
const ind = "sig-count-fixture-s@m1", cfg = `follow|${ind}|tp1|sl1|tr0|h24`, sym = "OWN-USDT";
const protect = { tp: .01, sl: .01, trail: 0, hold: 24 };
type Hooks = {
  lastSelection: unknown;
  stepPaper(): void;
  stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }): Generator<number, void>;
  appendRealtimeLearningGen(tapes: readonly ConfigTape[]): Generator<number, void>;
  realtimeLearning: { feed: BlockFeedEntry[]; accepted: Trade[] };
  paperUnits(): Float64Array;
};
const drain = (g: Generator<number, void>) => { for (const _ of g) { /* cooperative runtime */ } };

for (const mode of ["full", "fast"] as const) for (const side of [1, -1] as const)
  test(`${mode}: Signal ${side} processes Main 15 and persistent 12/12 without funding intermediate stages`, () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-signal-native-"));
    const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
    const rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", priceStream: null });
    rt.stop();
    try {
      const d = defaultWalkForward(DEFAULT_SETTINGS);
      rt.wf = { ...d, preH: 12, longH: 12, simH: 12, mode: "fixed", seatPer: "config", portfolio: 0,
        maxPositions: 0, maxOpen: 1, symGate: "off", rangeOpts: undefined,
        toggles: { ...d.toggles, normal: false, block: true, blockActive: true },
        signalOwnBase: true, signalRank: undefined,
        signalActive: new Set([sigActiveKey("follow", ind, sym, side, "normal", cfg)]),
        coord: { ...d.coord!, enabled: false }, engineSideAccept: undefined,
        processedStages: { validationN: 12, realN: 12 } };
      const row = (entryT: number, r = .02): Trade => ({ cfg, sym, side, entryT, exitT: entryT + M,
        entry: 100, exit: 100 * (1 + side * r), r, mult: 1, kind: "normal", reason: r < 0 ? "sl" : "tp",
        bars: 1, mfe: 0, mae: 0 });
      const history = Array.from({ length: 15 }, (_, i) => row(T - (30 - i * 2) * M, i === 0 ? -.001 : .02));
      const tape = (rows: Trade[], open: OpenPosition[] = []) => makeTape(cfg, "follow", ind, protect, "normal", [sym], rows, open, []);
      const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 1 } as never;
      rt.sim = walkForward(u, [], rt.wf);
      rt.sim.validated = [cfg];
      rt.paper.selected = [cfg];
      const hooks = rt as unknown as Hooks;
      hooks.lastSelection = { picks: [], eligible: 0 };
      for (let i = 0; i < 27; i++) {
        const r = row(T + 2 * i * M);
        const op: OpenPosition = { cfg, sym, side, entryT: r.entryT, entryI: 0, entry: 100,
          stop: 100 - side, target: 100 + side, peak: 100, trailOn: false, mtm: .01 };
        rt.tapes = [tape([...history, ...Array.from({ length: i }, (_, j) => row(T + 2 * j * M))], [op])];
        if (mode === "full") { rt.sim.endT = r.entryT; hooks.stepPaper(); }
        else drain(hooks.stepPaperGen({ opens: new Map([[cfg, [op]]]), t: r.entryT, refreshHeld: true }));
        const p = rt.paper.positions[0];
        assert.ok(p, JSON.stringify(rt.status.paperSkips));
        assert.equal(p.processedStage, i < 12 ? "postBase" : i < 24 ? "validated" : "active");
        assert.equal(p.blockPredecessor, undefined, "Signal own-base processing is independent of Ordinary");
        if (i < 24) {
          assert.equal(rt.paper.units!.get(orderKey(p)), 0);
          assert.equal(hooks.paperUnits()[0], 0);
          assert.equal(rt.paper.equity, 0);
        } else assert.ok(rt.paper.units!.get(orderKey(p))! > 0);
        drain(hooks.appendRealtimeLearningGen([tape([r])]));
        assert.equal(hooks.realtimeLearning.feed.at(-1)!.accepted, i >= 24);
        rt.tapes = [tape([...history, ...Array.from({ length: i + 1 }, (_, j) => row(T + 2 * j * M))])];
        if (mode === "full") { rt.sim.endT = r.exitT + 1; hooks.stepPaper(); }
        else drain(hooks.stepPaperGen({ opens: new Map([[cfg, []]]), t: r.exitT + 1, refreshHeld: true }));
        assert.equal(rt.paper.positions.length, 0);
        if (i < 24) {
          assert.equal(rt.paper.trades.length, 0);
          assert.equal(rt.paper.equity, 0);
        }
        assert.equal(db.get<{n:number}>("SELECT count(*) AS n FROM paper_book_trades WHERE cfg = ?", cfg)?.n, Math.max(0, i - 23));
      }
      const snapshot = db.kvGet<{ book: { sets: unknown[]; open: unknown[] } }>("processedNativePaperV1")!;
      assert.equal(snapshot.book.open.length, 0);
      assert.ok(snapshot.book.sets.length > 0);
    } finally { rt.dispose(); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });
