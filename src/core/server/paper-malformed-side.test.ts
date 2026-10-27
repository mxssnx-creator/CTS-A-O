import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { defaultWalkForward, makeTape, walkForward } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
const H = 3_600_000, T = Math.floor(Date.now() / H) * H;
const SYM = "AAA-USDT", CFG = "follow|rsi-mom-14-25@m15|tp2.6|sl3.9|tr0|h32|sh";
const HELD = "follow|ema-9-21@m15|tp2.6|sl3.9|tr0|h32|mn";
for (const mode of ["full", "fast"] as const) for (const side of [1, -1] as const) {
  test(`${mode}: invalid ${side === 1 ? "2" : "0"} side cannot close or release a held ${side} lane`, () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { gates: { minTrades: 1 }, live: { liveLastN: 0 } },
      { market: "synthetic", replay: true, priceStream: null });
    rt.stop();
    try {
      rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), rangeGate: undefined, maxOpen: 1 };
      const history: Trade[] = Array.from({ length: 30 }, (_, i) => ({ cfg: CFG, sym: SYM, side: 1,
        entryT: T - 3 * H + i * 60_000, exitT: T - 2 * H + i * 60_000, entry: 100, exit: 102,
        r: .02, unitR: .02, mult: 1, vol: 1, kind: "normal", reason: "tp", bars: 1, mfe: 0, mae: 0 }));
      const open: OpenPosition = { cfg: CFG, sym: SYM, side: 1, entryI: 0, entryT: T, entry: 100,
        stop: 96.1, target: 102.6, peak: 100, trailOn: false, mtm: 0 };
      rt.tapes = [makeTape(CFG, "follow", "rsi-mom-14-25@m15", { ...DEFAULT_PROTECT, tag: "sh" },
        "normal", [SYM], history, [open], [])];
      const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 15 } as never;
      rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
      const bad = { ...history[0], cfg: HELD, side: side === 1 ? 2 : 0, entryT: T - H,
        exitT: T - 60_000 } as unknown as Trade;
      rt.sim.trades = [bad];
      rt.paper.trades = [bad];
      rt.paper.positions = [{ ...open, cfg: HELD, side, entryT: T - H, vol: 1, level: 0 }];
      rt.paper.selected = [CFG];
      const hooks = rt as unknown as { lastSelection: unknown; stepPaper(): void;
        stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }): Generator<number, void> };
      hooks.lastSelection = { picks: [{ id: CFG, score: 1 }], eligible: 1 };
      if (mode === "full") hooks.stepPaper();
      else for (const _ of hooks.stepPaperGen({ opens: new Map([[CFG, [open]]]), t: T, refreshHeld: true })) { /* drain */ }
      assert.deepEqual(rt.paper.positions.map((p) => [p.cfg, p.side]), [[HELD, side]]);
      assert.equal(rt.status.paperSkips?.["cap:maxOpen"], 1);
      assert.equal(db.get("SELECT * FROM paper_book_trades WHERE cfg=?", HELD), undefined);
    } finally { rt.dispose(); db.db.close(); }
  });
}
