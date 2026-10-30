import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { ProcessedSetBook, type ProcessedSetIdentity } from "./processed-set.ts";
import { configDirectionEval, defaultWalkForward, lastNSideOk, makeTape, walkForward } from "./walkforward.ts";

// Exercises the draft lastNOnly path on an artificial 8-symbol, 12h + 12h tape.
// This mode is not the persistent Base → Main → Real adapter and cannot certify live readiness.
// This is a controlled lineage test, not a claim about any market or exchange account.
function fixture() {
  const H = 3_600_000, M = 60_000, start = Date.UTC(2026, 9, 9), ind = "ema-9-21@m1";
  const symbols = ["ADA", "APT", "ARB", "ATOM", "AVAX", "BCH", "BNB", "BTC"].map((x) => `${x}-USDT`);
  const p: Protect = { tp: .0215, sl: .0085, trail: 0, hold: 60, tag: "mn" };
  const blockerProtect: Protect = { ...p, tp: .0065 };
  const id = configId("follow", ind, p), blockerId = configId("follow", ind, blockerProtect);
  const trade = (cfg: string, sym: string, side: 1 | -1, entryT: number, exitT: number, r: number): Trade => ({
    cfg, sym, side, entryT, exitT, entry: 100, exit: 100 * (1 + side * (r + .0015)), r,
    reason: r > 0 ? "tp" : "sl", bars: (exitT - entryT) / M, mfe: 0, mae: 0, kind: "normal", mult: 1,
  });
  const history = Array.from({ length: 96 }, (_, i) => {
    const exit = start - (11 * H - i * 6 * M);
    return trade(id, symbols[i % 8], 1, exit - M, exit, .02);
  });
  const blockerHistory = Array.from({ length: 98 }, (_, i) => {
    const exit = start - (11 * H - i * 6 * M);
    return trade(blockerId, symbols[1 + i % 7], -1, exit - M, exit, .005);
  });
  const candidates: Trade[] = [], blockers: Trade[] = [];
  for (let i = 0; i < 14; i++) {
    const t = start + (i * 8 + 1) * M, win = symbols[1 + i % 7];
    blockers.push(trade(blockerId, win, -1, t - M, t + 4 * M, .005));
    candidates.push(trade(id, symbols[0], 1, t, t + 6 * M, -.01), trade(id, win, 1, t + M, t + 3 * M, .02));
  }
  for (const row of [...history, ...blockerHistory, ...candidates, ...blockers])
    assert.ok(Math.abs(row.side * (row.exit - row.entry) / row.entry - .0015 - row.r) < 1e-12);
  const tape = makeTape(id, "follow", ind, p, "normal", symbols,
    [...history, ...candidates].sort((a, b) => a.exitT - b.exitT), [], []);
  const other = makeTape(blockerId, "follow", ind, blockerProtect, "normal", symbols,
    [...blockerHistory, ...blockers].sort((a, b) => a.exitT - b.exitT), [], []);
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const options = { ...base, preH: 12, longH: 12, simH: 12, signalLongH: 12, startT: start, stepH: 1,
    gates: { ...base.gates, lastNOnly: true, baseLastN: 12, baseRangeLastN: { micro: 12, minimal: 12 } },
    validLastN: 12, lastN: 0, rangeGate: undefined, rangeOpts: undefined, normalBaseMinPf: 0,
    mode: "fixed" as const, seatPer: "config" as const, portfolio: 0, maxPositions: 0, preGate: false,
    symGate: "off" as const, basePassed: new Set([`follow|${ind}`]), basePassedRanges: { [`follow|${ind}`]: ["mn"] },
    toggles: { ...base.toggles, normal: true, trailing: false, axis: false, dca: false, dcaActive: false, block: false, exit: false },
    coord: { ...base.coord!, enabled: true, confirm: false, conflict: true }, signalRank: undefined, engineSideAccept: undefined };
  const universe = { bars: [], caches: [], startT: start - 12 * H, endT: start + 12 * H,
    splitT: start, nowT: start + 12 * H, baseTf: 1 } as never;
  const simulation = walkForward(universe, [tape, other], options);
  const decisionTime = start + 97 * M, executed = simulation.trades.filter((row) => row.cfg === id);
  const identity: ProcessedSetIdentity = { baseConfigId: id, symbol: symbols[0], side: 1,
    kind: "normal", lane: "m1", economicRevision: "cost-0.0015" };
  const book = new ProcessedSetBook("model", 12), policy = { validationN: 12, realN: 12, minPf: 1.08 };
  // The fixture declares these exact prehistory rows Base-admitted; it does not infer Base evidence from a later run.
  const prior = history.filter((row) => row.sym === symbols[0]);
  for (const [i, row] of [...prior, ...executed.filter((row) => row.exitT < decisionTime)].entries()) {
    const order = `owned-${i}`;
    book.acceptPostBase(identity, order, row.entryT, policy);
    book.close(identity, order, row.entryT, "final", row.exitT, row.r, true);
  }
  return { tape, options, decisionTime, simulation, executed, book, identity };
}

test("own processed Last-12 retains the admitted losses and excludes conflict-rejected siblings", () => {
  const f = fixture(), proof = f.book.verdict(f.identity, "postBase", 12, 1.08, f.decisionTime);
  assert.deepEqual(proof, { state: "failed", n: 12, pf: 0 });
  assert.equal(f.simulation.skips.conflict, 14);
  assert.equal(f.executed.filter((row) => row.exitT < f.decisionTime).length, 12);
  assert.equal(lastNSideOk(f.tape, 1, f.decisionTime, 12, 1.08), true,
    "the legacy raw candidate tape includes conflict-rejected wins");
  assert.equal(configDirectionEval(f.tape, f.decisionTime, f.options, 1).ok, true);
});

test("draft processed validation rejects the next entry after 12 admitted losses", () => {
  const f = fixture();
  assert.equal(f.simulation.skips.processedValidation, 2);
  assert.equal(f.executed.some((row) => row.entryT === f.decisionTime), false,
    "a raw-candidate pass must not override the exact processed set's failed Last-12");
});
