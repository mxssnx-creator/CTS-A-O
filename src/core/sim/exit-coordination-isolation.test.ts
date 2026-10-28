import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BLOCK, DEFAULT_RELATE_ADJUSTMENT, DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, Trade } from "../domain/types.ts";
import { exitScopeSuffix, isHistoricExitConfig } from "../exit-scope.ts";
import { exchangeAcceptIndex } from "../live-record.ts";
import { configId } from "../pipeline/pipeline.ts";
import { EngineSideIndex, SignalGuard, acceptKey, engineSideKey, engineSideKeyFor, guardKey, sideAcceptKey, sigActiveKey } from "../signals.ts";
import { signalSettings } from "../signal-config.ts";
import { AutoBlockBook, blockBookOf, bookLevels, sourceKey } from "./block.ts";
import { RelateBook } from "./relate-volume.ts";
import { CandidateDirectionBook, coordBlock, defaultWalkForward, feedBooks, makeTape, walkForward } from "./walkforward.ts";

const H = 3_600_000, M = 60_000, NOW = Date.UTC(2026, 9, 20), START = NOW - 6 * H;
const sym = "A-USDT", ind = "ema-9-21@m15", sig = "sig-ema-cross-s@m15";
const normal = configId("follow", ind, { tp: .01, sl: .01, trail: 0, hold: 4, tag: "sh" });
const exitProtect: Protect = { tp: .01, sl: .01, trail: 0, hold: 4, exitType: "historic", exitSet: "static-sl", exitSide: 1 };
const exitA = configId("exit", ind, exitProtect);
const exitB = configId("exit", "ema-9-21@m5", exitProtect);
const exitSignal = configId("exit", sig, exitProtect);
const row = (cfg: string, type: string, r: number) => ({ cfg, type, sym, side: 1, kind: "trend", ind,
  entryT: START, exitT: START + M, r, accepted: true });

test("legacy Exit source IDs and Signal-sourced Exit retain the independent category", () => {
  assert.equal(isHistoricExitConfig(`exit|${sig}|tp1|sl1|tr0|h4`), true);
  const records: Trade[] = Array.from({ length: 30 }, (_, i) => ({ cfg: exitSignal, sym, side: 1,
    entryT: START - (80 - i) * H, exitT: START - (80 - i) * H + M, entry: 100, exit: 102,
    r: .02, mult: 1, reason: "tp", bars: 1, mfe: 0, mae: 0, kind: "exit" }));
  records.push({ ...records[0], entryT: START + H + M, exitT: START + H + 2 * M });
  const tape = makeTape(exitSignal, "exit", sig, exitProtect, "exit", [sym], records, [], []);
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const options = { ...base, simH: 6, preH: 336, longH: 336, signalLongH: 336, stepH: 1,
    validLastN: 0, signalValidLastN: 0, lastN: 0, exitMinTrades: 12, robustFrac: 0, portfolio: 0,
    symGate: "off" as const, rangeGate: undefined, signalGuardN: 0,
    gates: { ...base.gates, minTrades: 12, minDdtH: 0, maxDdtH: 1000, maxDdr: 0 },
    toggles: { ...base.toggles, exit: true, block: false },
    coord: { enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" as const },
    signalRank: signalSettings({ enabled: true, validate: false, count: 0 }),
    signalActive: new Set([sigActiveKey("exit", sig, sym, 1, "exit", exitSignal)]),
    exitBasePassed: new Set([`exit|${sig}`]) };
  const u = { bars: [], caches: [], startT: NOW - 200 * H, endT: NOW, splitT: NOW - 200 * H, nowT: NOW, baseTf: 15 } as never;
  const run = walkForward(u, [tape], options);
  const row = run.steps.find((step) => step.byRange?.exit?.taken === 1)?.byRange;
  assert.ok(row, "the Signal-sourced Exit has an actual modeled execution");
  assert.equal(row.exit.tapes, 1);
  assert.equal(row.exit.validated, 1);
  assert.equal(row.exit.candidates, 1);
  assert.equal(row.sig?.tapes ?? 0, 0);
  assert.equal(row.sig?.validated ?? 0, 0);
});

for (const auto of [false, true]) test(`Block keeps each Exit's pooled sources, deduplication and auto scores independent: auto=${auto}`, () => {
  const book = blockBookOf({ ...DEFAULT_BLOCK, windowAuto: auto, window: 1, windowCandidates: [1, 2],
    poolDedupe: true, sources: { config: true, overall: true, symbol: true, direction: true, indication: true, type: true } }, false);
  const a = row(exitA, "exit", .02), n = row(normal, "normal", .02), b = row(exitB, "exit", .02);
  book.add(a); // an Exit's own win is not evidence for another strategy or Exit lane
  assert.equal(bookLevels(book, a, 1).overall, 1);
  assert.equal(bookLevels(book, n, 1).overall, 0);
  assert.equal(bookLevels(book, b, 1).overall, 0);
  book.add(n); // identical symbol, times and outcome remain distinct across the scope boundary
  assert.equal(bookLevels(book, n, 1).overall, 1);
  book.add({ ...n, r: -.03, exitT: n.exitT + 1 });
  assert.equal(bookLevels(book, n, 1).overall, 0);
  assert.equal(bookLevels(book, a, 1).overall, 1);
  assert.notEqual(sourceKey("overall", a), sourceKey("overall", n));
  if (book instanceof AutoBlockBook) {
    const isolated = new AutoBlockBook({ ...DEFAULT_BLOCK, windowAuto: true, window: 1, windowCandidates: [1, 2],
      sources: { config: false, overall: true } }, false);
    for (let i = 0; i < 35; i++) {
      const e = { ...a, entryT: START + i * M, exitT: START + (i + 1) * M };
      isolated.stampEntry(e);
      isolated.add(e);
    }
    assert.ok(isolated.scores(exitScopeSuffix(exitA, "exit")).some((x) => x.n > 0));
    assert.ok(isolated.scores().every((x) => x.n === 0), "Exit closes cannot tune another strategy's auto window");
  }
});

test("Relate and direction books do not borrow Exit, sibling Exit, or ordinary results", () => {
  const relate = new RelateBook({ ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: false, minTrades: 1, lastN: 12 });
  const identity = { cfg: exitA, sym, side: 1, ind, strategy: "exit", coordination: "ordinary", range: "wide" };
  const ordinary = { ...identity, cfg: normal, strategy: "normal" };
  const sibling = { ...identity, cfg: exitB };
  relate.add({ ...identity, r: .02, accepted: true, relateMeasured: true, relateBase: 1 });
  assert.equal(relate.decide(identity).stats.overall?.n, 1);
  assert.equal(relate.decide(ordinary).stats.overall?.n, 0);
  assert.equal(relate.decide(sibling).stats.overall?.n, 0);
  relate.add({ ...ordinary, r: -.01, accepted: true, relateMeasured: true, relateBase: 1 });
  assert.equal(relate.decide(identity).stats.overall?.n, 1);
  const direction = new CandidateDirectionBook();
  direction.add(row(exitA, "exit", -.01));
  assert.equal(direction.tailSum(1, 1).n, 0);
  assert.equal(direction.tailSum(1, 1, { cfg: exitB, type: "exit" }).n, 0);
  assert.equal(direction.tailSum(1, 1, { cfg: exitA, type: "exit" }).sum, -.01);
});

test("Exit does not confirm or conflict with unrelated strategies, or populate their Signal guards", () => {
  const coord = { enabled: true, hourLock: 0, cooldown: "off" as const, confirm: true, conflict: true };
  const signal = { cfg: configId("follow", sig, { tp: .01, sl: .01, trail: 0, hold: 4 }), sym, side: 1, entryT: NOW };
  assert.equal(coordBlock(coord, signal, new Map(), [{ cfg: exitA, sym, side: 1 }]), "confirm");
  assert.equal(coordBlock(coord, signal, new Map(), [{ cfg: normal, sym, side: 1 }]), null);
  assert.equal(coordBlock(coord, { cfg: exitA, sym, side: 1, entryT: NOW }, new Map(),
    [{ cfg: normal, sym, side: -1 }]), null);
  const guard = new SignalGuard();
  const close = { ...row(exitSignal, "exit", -.01), ind: sig };
  for (let i = 0; i < 8; i++) feedBooks({ ...close, entryT: NOW - (20 - i) * M, exitT: NOW - (19 - i) * M }, null, guard);
  assert.equal(guard.disabled(guardKey(exitSignal, sym, 1, "exit"), 8), true, "own config losses are retained");
  assert.equal(guard.clustered(NOW, { enabled: true, windowMin: 60, minLosses: 8, lossShare: .6 }, 1), false);
  assert.equal(guard.acceptStats(sideAcceptKey(1, false), NOW, 2).n, 0);
  const exchange = exchangeAcceptIndex([close]);
  assert.equal(exchange.stats(sideAcceptKey(1, false), NOW, 24).n, 0);
  assert.equal(exchange.stats(acceptKey(sig, sym, 1, "exit", exitSignal), NOW, 24).n, 1);
});

test("Exit direction acceptance keeps indication timeframe lanes separate", () => {
  const ownKey = engineSideKeyFor("exit", undefined, 1, ind, [], "static-sl");
  const otherKey = engineSideKeyFor("exit", undefined, 1, "ema-9-21@m5", [], "static-sl");
  assert.notEqual(ownKey, otherKey);
  assert.equal(ownKey, engineSideKey("exit", undefined, 1, ind, "static-sl"));
  const records: Trade[] = Array.from({ length: 12 }, (_, i) => ({ cfg: exitA, sym, side: 1,
    entryT: NOW - (20 - i) * H, exitT: NOW - (20 - i) * H + M, entry: 100, exit: 99,
    r: -.01, mult: 1, reason: "sl", bars: 1, mfe: 0, mae: 0, kind: "exit" }));
  const index = new EngineSideIndex();
  for (const _ of index.fill([makeTape(exitA, "exit", ind, exitProtect, "exit", [sym], records, [], [])]));
  assert.equal(index.stats(ownKey, NOW, 24).n, 12);
  assert.equal(index.stats(otherKey, NOW, 24).n, 0);
});

test("Exit losses affect only their own Stable-02 state during the complete modeled walk-forward", () => {
  const make = (cfg: string, kind: "normal" | "exit", r: number, entryT: number): Trade => ({
    cfg, sym, side: 1, entryT, exitT: entryT + 5 * M, entry: 100, exit: 100 * (1 + r), r, mult: 1,
    reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0, kind });
  const histories = (cfg: string, kind: "normal" | "exit") =>
    Array.from({ length: 30 }, (_, i) => make(cfg, kind, .02, START - (80 - i) * H));
  const exitTrades = [...histories(exitA, "exit"), ...Array.from({ length: 6 }, (_, i) => make(exitA, "exit", -.01, START + (1 + i * 6) * M))];
  const normalTrades = [...histories(normal, "normal"), make(normal, "normal", .02, START + H + M)];
  const tapes = [makeTape(exitA, "exit", ind, exitProtect, "exit", [sym], exitTrades, [], []),
    makeTape(normal, "follow", ind, { tp: .01, sl: .01, trail: 0, hold: 4, tag: "sh" }, "normal", [sym], normalTrades, [], [])];
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const options = { ...base, simH: 6, preH: 336, longH: 336, stepH: 1, validLastN: 0, lastN: 0,
    robustFrac: 0, portfolio: 0, seatPer: "config" as const, symGate: "off" as const, rangeGate: undefined,
    gates: { ...base.gates, minTrades: 12, minDdtH: 0, maxDdtH: 1000, maxDdr: 0 },
    toggles: { ...base.toggles, normal: true, exit: true, block: false, dca: false, dcaActive: false, axis: false },
    coord: { ...base.coord!, enabled: true, confirm: false, conflict: false, cooldown: "off" as const,
      hourLock: 0, s2Windows: true, s2Steps: 2, s2Pause: 2, s2Side: true },
    basePassed: new Set([`follow|${ind}`]), exitBasePassed: new Set([`exit|${ind}`]) };
  const u = { bars: [], caches: [], startT: NOW - 200 * H, endT: NOW, splitT: NOW - 200 * H, nowT: NOW, baseTf: 15 } as never;
  const both = walkForward(u, tapes, options);
  const without = walkForward(u, tapes, { ...options, exitBasePassed: new Set<string>() });
  assert.ok(both.feed.some((x) => x.cfg === exitA && x.r < 0), "the modeled Exit losses actually enter its own coordination");
  assert.equal(both.trades.filter((x) => x.cfg === normal).length, 1);
  assert.deepEqual(both.trades.filter((x) => x.cfg === normal), without.trades.filter((x) => x.cfg === normal));
  assert.ok(both.exitS2?.[exitA], "Exit has its own resumable Stable-02 state");
});
