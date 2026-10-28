import assert from "node:assert/strict";
import { test } from "node:test";
import { configId } from "../pipeline/pipeline.ts";
import { fakeRt } from "../test-support.ts";
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
