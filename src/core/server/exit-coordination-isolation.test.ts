import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, walkForward } from "../sim/walkforward.ts";
import { fakeRt } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("paper/runtime continuation keeps Exit hours, confirmations, pauses and volume in their own lane", () => {
  const { rt } = fakeRt();
  Object.setPrototypeOf(rt, CoreRuntime.prototype);
  const x = rt as unknown as {
    sim: unknown; wf: unknown; coordCache: unknown; realtimeLearning: unknown; hedgeKeys: Set<string>;
    coordOf(sim: unknown): { hourNet: Map<number, number>; exitHourNet: Map<string, Map<number, number>>;
      engineIv: Map<string, { e: Float64Array; mx: Float64Array }> };
    confirmPoolOf(iv: Map<string, { e: Float64Array; mx: Float64Array }>, open: () => Map<string, number>, positions: unknown[]):
      { confirms(sym: string, side: number, t: number): boolean };
    entryHeldBack(op: { cfg: string; sym: string; side: number; entryT: number }, hours: Map<number, number>,
      open: unknown[], src: Map<string, never[]>, pool: unknown): string | null;
    s2EntryVolume(block: number, cfg: string): number;
  };
  const t = Date.UTC(2026, 9, 20, 12, 1), sym = "A-USDT", ind = "ema-9-21@m15";
  const exit = configId("exit", ind, { tp: .01, sl: .01, trail: 0, hold: 4, exitType: "historic", exitSet: "static-sl", exitSide: 1 });
  const normal = configId("follow", ind, { tp: .01, sl: .01, trail: 0, hold: 4, tag: "sh" });
  const signal = configId("follow", "sig-ema-cross-s@m15", { tp: .01, sl: .01, trail: 0, hold: 4 });
  const sim = {
    trades: [{ cfg: exit, kind: "exit", sym, side: 1, entryT: t - 2, exitT: t - 1, r: -.2 },
      { cfg: normal, kind: "normal", sym, side: 1, entryT: t - 2, exitT: t - 1, r: .01 }],
    feed: [{ cfg: exit, type: "exit", sym, side: 1, entryT: t - 10, exitT: t + 10, r: -.01 }],
    s2: { factor: .2, paused: [] }, exitS2: { [exit]: { factor: .6, paused: [`${sym}|1`] } },
  };
  Object.assign(x, { sim, coordCache: null, realtimeLearning: null, hedgeKeys: new Set<string>(),
    wf: { guardPct: 0, coord: { enabled: true, confirm: true, conflict: false, hourLock: 0, cooldown: "off", s2Side: true },
      block: { maxMult: 8 } } });
  try {
    const state = x.coordOf(sim), hour = Math.floor(t / 3_600_000);
    assert.equal(state.hourNet.get(hour), 1, "ordinary hour contains only the ordinary close");
    assert.equal(state.exitHourNet.get(exit)?.get(hour), -20);
    const pool = x.confirmPoolOf(state.engineIv, () => new Map(), [{ cfg: exit, sym, side: 1, entryT: t - 5 }]);
    assert.equal(pool.confirms(sym, 1, t), false, "neither the simulated candidate nor the held Exit confirms a Signal");
    assert.equal(x.entryHeldBack({ cfg: signal, sym, side: 1, entryT: t }, new Map(), [], new Map(), pool), "confirm");
    assert.equal(x.entryHeldBack({ cfg: exit, sym, side: 1, entryT: t }, new Map(), [], new Map(), pool), "s2Window");
    assert.equal(x.s2EntryVolume(1, normal), 1.2);
    assert.equal(x.s2EntryVolume(1, exit), 1.6);
  } finally { rt.db.db.close(); }
});

for (const mode of ["full", "fast"] as const) for (const heldExit of [true, false]) {
  test(`${mode}: a held ${heldExit ? "Exit" : "engine order"} ${heldExit ? "cannot consume" : "still consumes"} engine capacity`, () => {
    const H = 3_600_000, t = Math.floor(Date.now() / H) * H, sym = "AAA-USDT";
    const cfg = "follow|rsi-mom-14-25@m15|tp2.6|sl3.9|tr0|h32|sh";
    const held = heldExit
      ? configId("exit", "ema-9-21@m15", { tp: .01, sl: .01, trail: 0, hold: 4,
          exitType: "historic", exitSet: "static-sl", exitSide: 1 })
      : "follow|ema-9-21@m15|tp2.6|sl3.9|tr0|h32|mn";
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { gates: { minTrades: 1 }, live: { liveLastN: 0 } },
      { market: "synthetic", priceStream: null });
    rt.stop();
    try {
      rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), rangeGate: undefined, maxOpen: 1 };
      const history: Trade[] = Array.from({ length: 30 }, (_, i) => ({ cfg, sym, side: 1,
        entryT: t - 3 * H + i * 60_000, exitT: t - 2 * H + i * 60_000, entry: 100, exit: 102,
        r: .02, unitR: .02, mult: 1, vol: 1, kind: "normal", reason: "tp", bars: 1, mfe: 0, mae: 0 }));
      const open: OpenPosition = { cfg, sym, side: 1, entryI: 0, entryT: t, entry: 100,
        stop: 96.1, target: 102.6, peak: 100, trailOn: false, mtm: 0 };
      rt.tapes = [makeTape(cfg, "follow", "rsi-mom-14-25@m15", { ...DEFAULT_PROTECT, tag: "sh" },
        "normal", [sym], history, [open], [])];
      const u = { bars: [], caches: [], startT: t - 24 * H, endT: t, splitT: t - 12 * H, nowT: t, baseTf: 15 } as never;
      rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
      rt.sim.validated = [cfg];
      rt.sim.trades = [];
      rt.paper.positions = [{ ...open, cfg: held, entryT: t - H, vol: 1, level: 0 }];
      rt.paper.selected = [cfg];
      const hooks = rt as unknown as { lastSelection: unknown; stepPaper(): void;
        stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld: boolean }): Generator<number, void> };
      hooks.lastSelection = { picks: [{ id: cfg, score: 1 }], eligible: 1 };
      if (mode === "full") hooks.stepPaper();
      else for (const _ of hooks.stepPaperGen({ opens: new Map([[cfg, [open]]]), t, refreshHeld: true })) { /* drain */ }
      assert.equal(rt.paper.positions.some((p) => p.cfg === cfg), heldExit, JSON.stringify(rt.status.paperSkips));
      assert.equal(rt.status.paperSkips?.["cap:maxOpen"] ?? 0, heldExit ? 0 : 1);
    } finally { rt.dispose(); db.db.close(); }
  });
}
