// Evaluation follows the settled closes continuously: a config is judged on the closes settled before each entry, not on the
// closes that existed at the last hourly decision clock.
import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000, M = 60_000, END = Date.UTC(2026, 9, 16, 12), START = END - 6 * H;
const IND = "rsi-mom-14-20@m1";

/** closes at `exitOffsets` (ms from START) with return r; every trade lasts 10 minutes; the entry is `exit - 10 min` */
function tape(rows: Array<{ entryOffset: number; r: number; sym?: string; side?: 1 | -1 }>, id = `follow|${IND}|tp1|sl1|tr0|h32`) {
  const trade = (x: { entryOffset: number; r: number; sym?: string; side?: 1 | -1 }): Trade => ({
    cfg: id, sym: x.sym ?? "A", side: x.side ?? 1, entryT: START + x.entryOffset, exitT: START + x.entryOffset + 10 * M,
    entry: 100, exit: 101, r: x.r, mult: 1, reason: "tp", bars: 1, mfe: 0.02, mae: 0.01, kind: "normal" });
  const syms = [...new Set(rows.map((x) => x.sym ?? "A"))];
  return makeTape(id, "follow", IND, { tp: .01, sl: .01, trail: 0, hold: 32 }, "normal", syms, rows.map(trade), [], []);
}
function options(over: { lastNFloor?: number; stepH?: number } = {}): WalkForwardOptions {
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  return { ...d, mode: "fixed", seatSet: "validated", preH: 12, longH: 12, simH: 6, stepH: over.stepH ?? 1,
    robustFrac: 0, preGate: false, normalBaseMinPf: 0, symGate: "off", sideGateN: 0, lastN: 0, validLastN: 12,
    gates: { ...d.gates, minTrades: 9, minPf: 1.05, lastNFloor: over.lastNFloor ?? 9,
      positionWindows: { base: 12, main: 12, real: 12, entry: 12, maxDrawdownPositions: 12 } },
    toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
}
const u = { bars: [], caches: [], startT: START - 12 * H, endT: END, splitT: START, nowT: END, baseTf: 1 } as never;
// five winning closes before the run; then one winning trade every 20 minutes
const history = (n: number, r = 0.01) => Array.from({ length: n }, (_, i) => ({ entryOffset: -(n - i) * 20 * M - 60 * M, r }));
const run = (n: number, r = 0.01) => Array.from({ length: 18 }, (_, i) => ({ entryOffset: 20 * M + i * 20 * M, r }));

it("the first entry follows the close that completes the partial window, not the next hourly clock", () => {
  // 5 earlier closes + run closes at 30, 50, 70, 90 min: the 9th close settles at 90 min, so the entry at 100 min qualifies
  const sim = walkForward(u, [tape([...history(5), ...run(18)])], options());
  const first = Math.min(...sim.trades.map((t) => t.entryT));
  assert.ok(sim.trades.length > 0, "the config trades once nine own closes exist");
  assert.equal(first, START + 100 * M, `first entry at ${(first - START) / M} min`);
});

it("below the partial floor nothing trades, and a strict setting waits for the full window", () => {
  const eight = walkForward(u, [tape([...history(4), ...run(18)])], options());
  // 4 earlier + closes at 30, 50, 70, 90 -> the 9th settles at 110 min (the entry at 120 min is the first one)
  assert.equal(Math.min(...eight.trades.map((t) => t.entryT)), START + 120 * M);
  const strict = walkForward(u, [tape([...history(5), ...run(18)])], options({ lastNFloor: 0 }));
  // the full window of 12 closes: 5 earlier + 7 run closes -> the 12th settles at 150 min; the entry at 160 min is the first one
  assert.equal(Math.min(...strict.trades.map((t) => t.entryT)), START + 160 * M);
});

it("the same result at any decision clock: entries do not depend on stepH", () => {
  const rows = [...history(5), ...run(18)];
  const firsts = [1, 0.5, 0.25].map((stepH) => {
    const sim = walkForward(u, [tape(rows)], options({ stepH }));
    return [sim.trades.length, Math.min(...sim.trades.map((t) => t.entryT))];
  });
  assert.deepEqual(firsts[1], firsts[0], "30-minute clock equals the hourly clock");
  assert.deepEqual(firsts[2], firsts[0], "15-minute clock equals the hourly clock");
});

it("a window that turns losing stops new entries at once, inside the hour", () => {
  // nine winners, then losses: the last-12 window falls under PF 1.05 within a few trades
  const rows = [...history(5), ...Array.from({ length: 18 }, (_, i) => ({ entryOffset: 20 * M + i * 20 * M, r: i < 6 ? 0.01 : -0.01 }))];
  const sim = walkForward(u, [tape(rows)], options());
  const last = Math.max(...sim.trades.map((t) => t.entryT));
  // after the losses start (run row 6 at 140 min) the window fails within a few settled losses, not at the next hour mark
  assert.ok(last <= START + 200 * M, `last entry ${(last - START) / M} min`);
  assert.ok(sim.trades.every((t) => t.entryT < START + 6 * H));
});

it("contexts are independent: wins on the long side admit longs only", () => {
  const rows = [...history(5).map((x) => ({ ...x, side: 1 as const })), ...run(18).map((x) => ({ ...x, side: 1 as const })),
    ...Array.from({ length: 18 }, (_, i) => ({ entryOffset: 25 * M + i * 20 * M, r: -0.01, side: -1 as const })),
    ...history(5).map((x) => ({ ...x, r: -0.01, side: -1 as const }))];
  const sim = walkForward(u, [tape(rows)], options());
  assert.ok(sim.trades.length > 0);
  assert.ok(sim.trades.every((t) => t.r > 0), "no losing short context is admitted");
});

it("progress: no work slice of the simulation counts as a completed hour; the bar ends full only at the end", async () => {
  const { walkForwardGen } = await import("./walkforward.ts");
  const { simulationProgress } = await import("../progress.ts");
  // many tapes so the selection loop yields work slices inside every decision
  const tapes = Array.from({ length: 200 }, (_, k) => tape([...history(5), ...run(18)], `follow|${IND}|tp1|sl1|tr0|h${32 + k}`));
  const fractions: number[] = [];
  let clock = 0;
  const report = simulationProgress(6, 6, "", (f) => fractions.push(f), () => (clock += 1000));
  const gen = walkForwardGen(u, tapes, options());
  for (;;) { const r = gen.next(); if (r.done) break; report(r.value as number); }
  const before = fractions.slice(0, -1);
  assert.ok(before.length > 10, `samples ${before.length}`);
  for (let i = 1; i < fractions.length; i++) assert.ok(fractions[i] + 1e-9 >= fractions[i - 1], "monotone");
  // halfway through the samples the bar is not yet near the end
  assert.ok(before[Math.floor(before.length / 2)] < 6 * 0.9, `mid-run fraction ${before[Math.floor(before.length / 2)]}`);
  assert.ok(Math.max(...fractions) <= 6);
});

it("scope config: the config's own last N closes on every symbol decide, so a sparse context can enter", () => {
  // the config wins on A (14 closes) and has only 2 closes on B: per context B never fills the floor of 9
  const rows = [...history(5).map((x) => ({ ...x, sym: "A" })), ...run(18).map((x) => ({ ...x, sym: "A" })),
    { entryOffset: -3 * H, r: 0.01, sym: "B" }, { entryOffset: -2 * H, r: 0.01, sym: "B" },
    ...Array.from({ length: 4 }, (_, i) => ({ entryOffset: 25 * M + i * 60 * M, r: 0.01, sym: "B" }))];
  const withScope = (scope?: "config") => {
    const o = options();
    return { ...o, gates: { ...o.gates, positionWindows: { ...o.gates.positionWindows!, ...(scope ? { scope } : {}) } } };
  };
  const context = walkForward(u, [tape(rows)], withScope());
  const config = walkForward(u, [tape(rows)], withScope("config"));
  assert.equal(context.trades.filter((t) => t.sym === "B").length, 0, "per context, B has too few own closes");
  assert.ok(config.trades.filter((t) => t.sym === "B").length > 0, "config-wide, B trades on the config's record");
  assert.ok(config.trades.filter((t) => t.sym === "A").length >= context.trades.filter((t) => t.sym === "A").length);
});

it("scope auto: a context with its own floor of closes is its own lane; a sparse one falls back to its config's record", () => {
  // A wins (14 closes), B has 2 closes; C has 12 losing closes of its own
  const rows = [...history(5).map((x) => ({ ...x, sym: "A" })), ...run(18).map((x) => ({ ...x, sym: "A" })),
    { entryOffset: -3 * H, r: 0.01, sym: "B" }, { entryOffset: -2 * H, r: 0.01, sym: "B" },
    ...Array.from({ length: 4 }, (_, i) => ({ entryOffset: 25 * M + i * 60 * M, r: 0.01, sym: "B" })),
    ...Array.from({ length: 12 }, (_, i) => ({ entryOffset: -(12 - i) * 15 * M - H, r: -0.01, sym: "C" })),
    ...Array.from({ length: 4 }, (_, i) => ({ entryOffset: 35 * M + i * 60 * M, r: -0.01, sym: "C" }))];
  const withScope = (scope: "auto" | "config") => {
    const o = options();
    return { ...o, gates: { ...o.gates, positionWindows: { ...o.gates.positionWindows!, scope } } };
  };
  const auto = walkForward(u, [tape(rows)], withScope("auto"));
  const config = walkForward(u, [tape(rows)], withScope("config"));
  assert.ok(auto.trades.some((t) => t.sym === "B"), "sparse B enters on the config's record");
  assert.ok(auto.trades.some((t) => t.sym === "A"), "A trades on its own winning lane");
  assert.equal(auto.trades.filter((t) => t.sym === "C").length, 0, "C has its own losing lane: never admitted by A's wins");
  assert.ok(auto.trades.length <= config.trades.length + 0);
});

it("defaults: config-wide windows systemwide, both windows for Micro; scope both needs the lane and the config to pass", async () => {
  const { DEFAULT_POSITION_WINDOWS, checkPositionWindows } = await import("../position-windows.ts");
  assert.equal(DEFAULT_POSITION_WINDOWS.scope, "config");
  assert.equal(DEFAULT_POSITION_WINDOWS.byRange?.mc?.scope, "both");
  assert.equal(DEFAULT_SETTINGS.gates.positionWindows?.scope, "config");
  assert.throws(() => checkPositionWindows({ ...DEFAULT_POSITION_WINDOWS, scope: "x" as never }), /scope/);
  assert.throws(() => checkPositionWindows({ ...DEFAULT_POSITION_WINDOWS, byRange: { mc: { scope: "x" as never } } }));
  // A wins on its own lane, C loses on its own: with "both" C is refused although the pooled record passes; B (sparse)
  // fails its own window and is refused too
  const rows = [...history(5).map((x) => ({ ...x, sym: "A" })), ...run(18).map((x) => ({ ...x, sym: "A" })),
    ...Array.from({ length: 4 }, (_, i) => ({ entryOffset: 25 * M + i * 60 * M, r: 0.01, sym: "B" })),
    ...Array.from({ length: 10 }, (_, i) => ({ entryOffset: -(10 - i) * 15 * M - H, r: -0.005, sym: "C" })),
    ...Array.from({ length: 4 }, (_, i) => ({ entryOffset: 35 * M + i * 60 * M, r: -0.005, sym: "C" }))];
  const o = options();
  const both = walkForward(u, [tape(rows)], { ...o, gates: { ...o.gates, positionWindows: { ...o.gates.positionWindows!, scope: "both" } } });
  assert.ok(both.trades.some((t) => t.sym === "A"));
  assert.equal(both.trades.filter((t) => t.sym === "B" || t.sym === "C").length, 0);
});
