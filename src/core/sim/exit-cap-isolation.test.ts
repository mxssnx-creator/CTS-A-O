import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { OpenCounts, crowdKey, defaultWalkForward, makeTape, orderCapScope, positionsFull, walkForward } from "./walkforward.ts";

const H = 3_600_000, M = 60_000, NOW = Date.UTC(2026, 9, 20), START = NOW - 6 * H;
const ind = "ema-9-21@m15", signal = "sig-ema-cross-s@m15", sym = "A-USDT";
const normalProtect: Protect = { tp: .01, sl: .01, trail: 0, hold: 4, tag: "sh" };
const exitProtect: Protect = { tp: .01, sl: .01, trail: 0, hold: 4, exitType: "historic", exitSet: "static-sl", exitSide: 1 };
const normal = configId("follow", ind, normalProtect);
const ordinarySignal = configId("follow", signal, normalProtect);
const exit = configId("exit", ind, exitProtect);
const siblingExit = configId("exit", "ema-9-21@m5", exitProtect);
const signalExit = configId("exit", signal, exitProtect);

test("Exit order and position caps count only the exact Exit configuration and lane", () => {
  const book = new OpenCounts();
  const rows = [normal, ordinarySignal, exit, siblingExit, signalExit].map((cfg) => ({ cfg, sym, side: 1 }));
  for (const row of rows) book.add(row, 1);
  assert.equal(new Set(rows.map((x) => orderCapScope(x.cfg))).size, 5);
  for (const row of rows) {
    const signalClass = row.cfg.includes("|sig-");
    const scope = orderCapScope(row.cfg);
    assert.equal(book.perSymbol(sym, signalClass, scope), 1);
    assert.equal(book.open(signalClass, scope), 1);
    assert.equal(book.perSide(1, signalClass, scope), 1);
    assert.equal(book.positionsFull("B-USDT", 1, signalClass, 1, scope), true);
    assert.equal(positionsFull(rows, "B-USDT", 1, signalClass, 1, scope), true);
    assert.equal(book.positionsFull(sym, 1, signalClass, 1, scope), false);
  }
  assert.notEqual(crowdKey(exit, sym, 1, NOW), crowdKey(siblingExit, sym, 1, NOW));
  assert.notEqual(crowdKey(exit, sym, 1, NOW), crowdKey(normal, sym, 1, NOW));
  book.add(rows[2], -1);
  assert.equal(book.open(false, orderCapScope(exit)), 0);
  assert.equal(book.open(false), 1, "releasing Exit capacity must not change engine capacity");
  assert.equal(book.open(true), 1, "Signal capacity excludes its Exit-sourced sibling");
});

test("the complete modeled walk-forward keeps capped engine and Exit lanes independent", () => {
  const normal2 = configId("follow", ind, { ...normalProtect, tp: .02 });
  const make = (cfg: string, kind: "normal" | "exit", at: number, targetSym = sym): Trade => ({
    cfg, sym: targetSym, side: 1, entryT: at, exitT: at + 20 * M, entry: 100, exit: 102,
    r: .02, mult: 1, reason: "tp", bars: 1, mfe: 0, mae: 0, kind });
  const tape = (cfg: string, lane: string, kind: "normal" | "exit", protect: Protect) => {
    const history = Array.from({ length: 30 }, (_, i) => make(cfg, kind, START - (80 - i) * H));
    const future = [make(cfg, kind, START + H + M)];
    if (cfg === exit) future.push(make(cfg, kind, START + H + 2 * M, "B-USDT"));
    return makeTape(cfg, kind === "exit" ? "exit" : "follow", lane, protect, kind, [sym, "B-USDT"], [...history, ...future], [], []);
  };
  const tapes = [tape(normal, ind, "normal", normalProtect), tape(normal2, ind, "normal", { ...normalProtect, tp: .02 }),
    tape(exit, ind, "exit", exitProtect), tape(siblingExit, "ema-9-21@m5", "exit", exitProtect)];
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const o = { ...base, simH: 6, preH: 336, longH: 336, stepH: 1, validLastN: 0, lastN: 0,
    robustFrac: 0, portfolio: 0, seatPer: "config" as const, symGate: "off" as const, rangeGate: undefined,
    maxOpen: 1, maxPerSymbol: 1, maxPositions: 1,
    gates: { ...base.gates, minTrades: 12, minDdtH: 0, maxDdtH: 1000, maxDdr: 0 },
    toggles: { ...base.toggles, normal: true, exit: true, block: false, dca: false, dcaActive: false, axis: false },
    coord: { ...base.coord!, enabled: false, confirm: false, conflict: false, cooldown: "off" as const, hourLock: 0 },
    basePassed: new Set([`follow|${ind}`]), exitBasePassed: new Set([`exit|${ind}`, "exit|ema-9-21@m5"]) };
  const u = { bars: [], caches: [], startT: NOW - 200 * H, endT: NOW, splitT: NOW - 200 * H, nowT: NOW, baseTf: 15 } as never;
  const result = walkForward(u, tapes, o);
  assert.equal(result.trades.filter((x) => x.kind === "normal").length, 1, "ordinary engine cap remains active");
  assert.deepEqual(new Set(result.trades.filter((x) => x.kind === "exit").map((x) => x.cfg)), new Set([exit, siblingExit]));
  assert.equal(result.trades.filter((x) => x.cfg === exit).length, 1, "the same Exit cannot exceed its inherited max-open cap");
});
