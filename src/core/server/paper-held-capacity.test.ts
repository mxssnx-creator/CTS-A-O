// A recovered held lane consumes its existing capacity before a new lane is admitted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { defaultWalkForward, makeTape, walkForward } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
const H = 3_600_000;
const T = Math.floor(Date.now() / H) * H;
const SYM = "AAA-USDT";
const CFG = "follow|rsi-mom-14-25@m15|tp2.6|sl3.9|tr0|h32|sh";
const HELD = "follow|ema-9-21@m15|tp2.6|sl3.9|tr0|h32|mn";

for (const mode of ["full", "fast"] as const) {
  test(`${mode}: a missing held tape still reserves max-open capacity`, () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { gates: { minTrades: 1 }, live: { liveLastN: 0 } },
      { market: "synthetic", priceStream: null });
    rt.stop();
    try {
      rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), rangeGate: undefined, maxOpen: 1 };
      const raw: Trade[] = Array.from({ length: 30 }, (_, i) => ({
        cfg: CFG, sym: SYM, side: 1, entryT: T - 3 * H + i * 60_000, exitT: T - 2 * H + i * 60_000,
        entry: 100, exit: 102, r: .02, unitR: .02, mult: 1, vol: 1, kind: "normal", reason: "tp",
        bars: 1, mfe: 0, mae: 0,
      }));
      const open: OpenPosition = { cfg: CFG, sym: SYM, side: 1, entryI: 0, entryT: T, entry: 100,
        stop: 96.1, target: 102.6, peak: 100, trailOn: false, mtm: 0 };
      rt.tapes = [makeTape(CFG, "follow", "rsi-mom-14-25@m15", { ...DEFAULT_PROTECT, tag: "sh" },
        "normal", [SYM], raw, [open], [])];
      const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 15 } as never;
      rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
      rt.sim.validated = rt.tapes.map((t) => t.id);
      rt.sim.trades = [];
      rt.paper.positions = [{ ...open, cfg: HELD, entryT: T - H, vol: 1, level: 0 }];
      rt.paper.selected = [CFG];
      const hooks = rt as unknown as {
        lastSelection: unknown;
        stepPaper(): void;
        stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }): Generator<number, void>;
      };
      hooks.lastSelection = { picks: [{ id: CFG, score: 1 }], eligible: 1 };
      if (mode === "full") hooks.stepPaper();
      else for (const _ of hooks.stepPaperGen({ opens: new Map([[CFG, [open]]]), t: T, refreshHeld: true })) { /* drain */ }
      assert.deepEqual(rt.paper.positions.map((p) => p.cfg), [HELD]);
      assert.equal(rt.status.paperSkips?.["cap:maxOpen"], 1);
    } finally { rt.dispose(); db.db.close(); }
  });

  test(`${mode}: a verified own close before a fresh entry releases capacity`, () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { gates: { minTrades: 1 }, live: { liveLastN: 0 } },
      { market: "synthetic", priceStream: null });
    rt.stop();
    try {
      rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), rangeGate: undefined, maxOpen: 1 };
      const raw: Trade[] = Array.from({ length: 30 }, (_, i) => ({
        cfg: CFG, sym: SYM, side: 1, entryT: T - 3 * H + i * 60_000, exitT: T - 2 * H + i * 60_000,
        entry: 100, exit: 102, r: .02, unitR: .02, mult: 1, vol: 1, kind: "normal", reason: "tp",
        bars: 1, mfe: 0, mae: 0,
      }));
      const open: OpenPosition = { cfg: CFG, sym: SYM, side: 1, entryI: 0, entryT: T, entry: 100,
        stop: 96.1, target: 102.6, peak: 100, trailOn: false, mtm: 0 };
      const heldClose: Trade = { ...raw[0], cfg: HELD, entryT: T - H, exitT: T - 60_000 };
      rt.tapes = [makeTape(CFG, "follow", "rsi-mom-14-25@m15", { ...DEFAULT_PROTECT, tag: "sh" },
        "normal", [SYM], raw, [open], []), makeTape(HELD, "follow", "ema-9-21@m15",
        { ...DEFAULT_PROTECT, tag: "mn" }, "normal", [SYM], [heldClose], [], [])];
      const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 15 } as never;
      rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
      rt.sim.validated = rt.tapes.map((t) => t.id);
      rt.sim.trades = [];
      rt.paper.positions = [{ ...open, cfg: HELD, entryT: T - H, vol: 1, level: 0 }];
      rt.paper.selected = [CFG];
      const hooks = rt as unknown as {
        lastSelection: unknown;
        stepPaper(): void;
        stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }): Generator<number, void>;
      };
      hooks.lastSelection = { picks: [{ id: CFG, score: 1 }], eligible: 1 };
      if (mode === "full") hooks.stepPaper();
      else for (const _ of hooks.stepPaperGen({ opens: new Map([[CFG, [open]], [HELD, []]]), t: T, refreshHeld: true })) { /* drain */ }
      assert.deepEqual(rt.paper.positions.map((p) => p.cfg), [CFG]);
      assert.equal(db.get<{ reason: string }>("SELECT reason FROM paper_book_trades WHERE cfg=?", HELD)?.reason, "tp");
    } finally { rt.dispose(); db.db.close(); }
  });
}

for (const mode of ["full", "fast"] as const) for (const scenario of ["malformed-tape-duplicate", "inconsistent-unit-return"] as const) {
  test(`${mode}: ${scenario} is not accepted as a held close`, () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", replay: true, priceStream: null });
    rt.stop();
    try {
      const entryT = T - H;
      const open: OpenPosition = { cfg: HELD, sym: SYM, side: 1, entryI: 0, entryT, entry: 100,
        stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0 };
      const close: Trade & { unitR: number } = { cfg: HELD, sym: SYM, side: 1, entryT, exitT: T - 60_000,
        entry: 100, exit: 101, r: .01, vol: 1, mult: 1, unitR: .01,
        kind: "normal", reason: "tp", bars: 1, mfe: 0, mae: 0 };
      const tapeRows = scenario === "malformed-tape-duplicate"
        ? [{ ...close, exitT: T - 2 * 60_000, r: NaN }, close] : [close];
      rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), lastN: 0, validLastN: 0, rangeGate: undefined };
      const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 15 } as never;
      rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
      const inconsistent = { ...close, unitR: .2 };
      rt.sim.trades = scenario === "inconsistent-unit-return" ? [inconsistent] : [];
      rt.paper.trades = [...rt.sim.trades];
      rt.tapes = [makeTape(HELD, "follow", "ema-9-21@m15", { ...DEFAULT_PROTECT, tag: "mn" },
        "normal", [SYM], tapeRows, [], [])];
      rt.paper.positions = [{ ...open, vol: 1, level: 0 }];
      const hooks = rt as unknown as {
        lastSelection: unknown;
        stepPaperGen(fast?: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }, reuse?: boolean): Generator<number, void>;
      };
      hooks.lastSelection = { picks: [], eligible: 0 };
      const step = mode === "full" ? hooks.stepPaperGen(undefined, true)
        : hooks.stepPaperGen({ opens: new Map([[HELD, []]]), t: T, refreshHeld: true });
      for (const _ of step) { /* drain */ }
      assert.deepEqual(rt.paper.positions.map((p) => p.cfg), [HELD]);
      assert.equal(db.all("SELECT cfg FROM paper_book_trades").length, 0);
      assert.equal(rt.paper.trades.length, 0, "ambiguous simulated close cannot enter the accounting sample");
    } finally { rt.dispose(); db.db.close(); }
  });
}

test("changed values of an existing exact stop-hit key are persisted", () => {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", replay: true, priceStream: null });
  rt.stop();
  try {
    const entryT = T - H;
    const open: OpenPosition = { cfg: HELD, sym: SYM, side: 1, entryI: 0, entryT, entry: 100,
      stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0 };
    rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), lastN: 0, validLastN: 0, rangeGate: undefined };
    const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 15 } as never;
    rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
    rt.tapes = [makeTape(HELD, "follow", "ema-9-21@m15", { ...DEFAULT_PROTECT, tag: "mn" },
      "normal", [SYM], [], [open], [])];
    rt.paper.positions = [{ ...open, vol: 1, level: 0, stopHit: T - 5_000, hitPx: 98.8 }];
    const key = `${HELD}|${SYM}|1|${entryT}`;
    db.kvSet("stopHits", { [key]: { at: T - 10_000, stop: 99, px: 99.2 } });
    const hooks = rt as unknown as { lastSelection: unknown; stepPaperGen(fast?: undefined, reuse?: boolean): Generator<number, void> };
    hooks.lastSelection = { picks: [], eligible: 0 };
    for (const _ of hooks.stepPaperGen(undefined, true)) { /* drain */ }
    assert.equal(rt.paper.positions[0].hitPx, 98.8);
    assert.deepEqual(db.kvGet<Record<string, unknown>>("stopHits")?.[key], { at: T - 5_000, stop: 99, px: 98.8 });
  } finally { rt.dispose(); db.db.close(); }
});
