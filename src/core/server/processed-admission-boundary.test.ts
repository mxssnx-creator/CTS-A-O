import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { orderKey } from "../sizing.ts";
import { defaultWalkForward, makeTape, walkForward } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const H = 3_600_000, T = Math.floor(Date.now() / H) * H - H, SYM = "AAA-USDT";
const CFG = "follow|rsi-mom-14-25@m15|tp2.6|sl3.9|tr0|h32|sh";
const HELD = "follow|ema-9-21@m15|tp2.6|sl3.9|tr0|h32|mn";

for (const mode of ["full", "fast"] as const) test(`${mode}: native stage policy persists predecessor admission and preserves held protection`, () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-processed-admission-"));
  const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
  const rt = new CoreRuntime(db, { gates: { positionWindows:null,minTrades: 1 }, live: { liveLastN: 0 } },
    { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    rt.wf = { ...defaultWalkForward({...DEFAULT_SETTINGS,gates:{...DEFAULT_SETTINGS.gates,positionWindows:null}}), rangeGate: undefined,
      processedStages: { validationN: 2, realN: 2 } };
    const raw: Trade[] = Array.from({ length: 30 }, (_, i) => ({
      cfg: CFG, sym: SYM, side: 1, entryT: T - 3 * H + i * 60_000, exitT: T - 2 * H + i * 60_000,
      entry: 100, exit: 102, r: .02, unitR: .02, mult: 1, vol: 1, kind: "normal", reason: "tp",
      bars: 1, mfe: 0, mae: 0,
    }));
    const open: OpenPosition = { cfg: CFG, sym: SYM, side: 1, entryI: 0, entryT: T, entry: 100,
      stop: 96.1, target: 102.6, peak: 100, trailOn: false, mtm: 0 };
    rt.tapes = [makeTape(CFG, "follow", "rsi-mom-14-25@m15", { ...DEFAULT_PROTECT, tag: "sh" },
      "normal", [SYM], raw, [open], [{ sym: SYM, side: 1 }])];
    const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 15 } as never;
    rt.sim = walkForward(u, [], { ...rt.wf, simH: 12, preH: 12 });
    rt.sim.validated = [CFG];
    const held = { ...open, cfg: HELD, entryT: T - H, vol: 1, level: 0 };
    rt.paper.positions = [held];
    rt.paper.selected = [CFG];
    const hooks = rt as unknown as {
      lastSelection: unknown;
      candles: Map<string, { lastT(): number }>;
      stepPaper(): void;
      stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }): Generator<number, void>;
      coordOf(): null;
    };
    hooks.lastSelection = { picks: [{ id: CFG, score: 1 }], eligible: 1 };
    if (mode === "full") hooks.stepPaper();
    else for (const _ of hooks.stepPaperGen({ opens: new Map([[CFG, [open]]]), t: T, refreshHeld: true })) { /* drain */ }
    assert.deepEqual(rt.paper.positions.map(p => [p.cfg, p.entryT, p.stop, p.target, p.vol, p.processedStage]),
      [[CFG, open.entryT, open.stop, open.target, 1, "postBase"],
        [HELD, held.entryT, held.stop, held.target, held.vol, undefined]]);
    const precursor = rt.paper.positions.find(p => p.cfg === CFG)!;
    assert.equal(rt.paper.units?.get(orderKey(precursor)), 0, "post-Base processing must not receive paper funding");
    assert.equal(rt.status.paperSkips?.["exec:processedUnavailable"] ?? 0, 0);
    assert.equal(rt.db.kvGet<{version:number;book:{basis:string;open:unknown[]}}>("processedNativePaperV1")?.book.open.length, 1);
    const gate = rt.livePromotionGate({ cfg: CFG, sym: SYM, side: 1, entryT: T }, T);
    assert.equal(gate.ok, false);
    assert.equal(gate.processed?.stage, "postBase");
    assert.equal(gate.processed?.state, "insufficient");
    hooks.candles = new Map([[SYM, { lastT: () => T - 60_000 }]]);
    rt.status.lastBarT = T - 60_000;
    const coordOf = hooks.coordOf;
    hooks.coordOf = () => null;
    assert.deepEqual(rt.pendingEntries(), []);
    assert.equal(rt.status.paperSkips?.["pending:liveValidation"], 1);
    hooks.coordOf = coordOf;

    const close: Trade = { ...raw[0], entryT: T, exitT: T + 60_000, entry: 100, exit: 102, r: .02 };
    rt.tapes = [makeTape(CFG, "follow", "rsi-mom-14-25@m15", { ...DEFAULT_PROTECT, tag: "sh" },
      "normal", [SYM], [...raw, close], [], [{ sym: SYM, side: 1 }])];
    if (mode === "full") { rt.sim.endT = close.exitT + 1; hooks.stepPaper(); }
    else for (const _ of hooks.stepPaperGen({ opens: new Map([[CFG, []]]), t: close.exitT + 1, refreshHeld: true })) { /* drain */ }
    assert.ok(rt.paper.positions.every(p => p.cfg !== CFG));
    assert.ok(rt.paper.trades.every(x => x.cfg !== CFG), "virtual closes must not enter the funded paper cohort");
    assert.equal(db.get<{n:number}>("SELECT count(*) AS n FROM paper_book_trades WHERE cfg = ?", CFG)?.n, 0);
    assert.equal(db.get<{n:number}>("SELECT count(*) AS n FROM paper_trades WHERE cfg = ?", CFG)?.n, 0);
    assert.equal(rt.paper.equity, 0);
    const snapshot = db.kvGet<{book:{open:unknown[];sets:unknown[]}}>("processedNativePaperV1")!;
    assert.equal(snapshot.book.open.length, 0);
    assert.ok(snapshot.book.sets.length > 0, "the virtual close remains available as stage evidence");
  } finally { rt.dispose(); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
