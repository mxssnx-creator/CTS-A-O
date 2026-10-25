import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { signalSettings } from "../signal-config.ts";
import { sigActiveKey } from "../signals.ts";
import type { Trade } from "../domain/types.ts";
import { activeSignalsAt, defaultWalkForward, makeTape, signalConfigEval, signalIndex, signalSetAt, tradeAt,
  SignalActivationBook, walkForward, type ConfigTape, type WalkForwardOptions } from "./walkforward.ts";

const H = 3_600_000, M = 60_000, start = Date.UTC(2026, 9, 17, 9);
function fixture() {
  const ind = "sig-swing-m@m5", cfg = `follow|${ind}|tp1|sl1|tr0|h24`;
  const trade = (exitT: number, r: number, entryT = exitT - M): Trade => ({
    cfg, sym: "ADA-USDT", side: -1, entryT, exitT, r, mult: 1,
    entry: 100, exit: 100 * (1 - r - .0015), reason: "time", bars: 1, mfe: 0, mae: 0, kind: "normal",
  });
  // The last four closes fail at the hour boundary. A completed minute close restores their PF;
  // the following candidate is fully qualified before the next selection/reporting hour.
  const history = Array.from({length: 20}, (_, i) => trade(start - (24 - i) * H, .02));
  history.push(trade(start - 3 * M, -.01), trade(start - 2 * M, -.01));
  history.push(trade(start - M, -.01), trade(start + 10 * M, .06));
  const due = trade(start + 30 * M, .01, start + 20 * M);
  const tp = makeTape(cfg, "follow", ind, {tp: .01, sl: .01, trail: 0, hold: 24}, "normal", ["ADA-USDT"], [...history, due], [], []);
  const sig = signalSettings({enabled: true, count: 0, minTrades: 4, rank: "net", validate: false,
    coordination: {...DEFAULT_SETTINGS.signals.coordination, enabled: false}});
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const wf: WalkForwardOptions = {...base, startT: start, simH: 1, stepH: 1, longH: 150, signalLongH: 150,
    preGate: false, signalRank: sig, signalValidLastN: 4, lastN: 0, validLastN: 0,
    signalGuardN: 0, signalAccept: undefined, signalSideAccept: undefined, signalCluster: undefined,
    rangeGate: undefined, signalBasePassed: new Set([`follow|${ind}`]),
    gates: {...base.gates, minTrades: 4, minPf: 1.1, minGreen: 0, stableBlocks: 0, minDdtH: 0,
      maxDdtH: 1000, maxDdr: 0, lossPrior: false},
    signalMaxOpen: 0, signalPerSymbol: 0, signalMaxPositions: 0, maxOpen: 0, maxPerSymbol: 0, maxPerSide: 0,
    symGate: "off", coord: {enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false},
    toggles: {...base.toggles, normal: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false},
  };
  const u = {bars: [], caches: [], startT: start - 200 * H, endT: start + H,
    splitT: start, nowT: start + H, baseTf: 1} as never;
  return {tp, wf, sig, due, u};
}

test("a Signal validated between report hours executes on its next minute onset", () => {
  const {tp, wf, sig, due, u} = fixture();
  const key = sigActiveKey(tp.bot, tp.ind, "ADA-USDT", -1, tp.kind, tp.id);
  assert.equal(activeSignalsAt([tp], start, sig, 150, wf).has(key), false);
  assert.equal(activeSignalsAt([tp], due.entryT, sig, 150, wf).has(key), true,
    JSON.stringify(signalConfigEval(tp, due.entryT, wf, "ADA-USDT", -1)));
  const run = walkForward(u, [tp], wf);
  assert.ok(run.trades.some(t => t.cfg === due.cfg && t.entryT === due.entryT), JSON.stringify(run.skips));
  assert.ok(signalSetAt(run.signalSteps!, due.entryT)?.has(key));
  assert.equal(run.steps.length, 1, "report and ordinary selection cadence stays independent");
  assert.ok(run.signalSteps!.every(s => [...s.keys].every(k => activeSignalsAt([tp], s.t, sig, 150, wf).has(k))));
});

function drain<T>(g: Generator<number, T>): T {
  for (;;) { const r = g.next(); if (r.done) return r.value; }
}

test("minute activation equals fresh full ranking, including family caps, Exit keys and backward clocks", () => {
  const {tp, wf, sig} = fixture();
  const tapes: ConfigTape[] = [tp];
  for (let i = 0; i < 6; i++) {
    const ind = i % 2 ? `sig-coord-fixture${i}@m5` : `sig-ema-cross-${i}-s@m5`;
    const id = tp.id.replace(tp.ind, ind);
    const other = makeTape(id, tp.bot, ind, tp.protect, tp.kind, tp.syms,
      Array.from({length: tp.n}, (_, j) => ({...tradeAt(tp, j), cfg: id, r: i === 4 ? -tp.r[j] : tp.r[j]})), [], []);
    other.heldOnly = i === 5;
    tapes.push(other);
  }
  const exit = "follow|sig-exit-fixture@m5|ADA-USDT|-1|exit|cfg=owned-exit";
  const stamps = Array.from({length: 125}, (_, i) => start - 3 * M + i * M);
  stamps.push(start + 20 * M, start - M, start + H + 2 * M);
  for (const count of [0, 1, 3]) {
    const ranked = {...sig, count, coordination: {...sig.coordination, enabled: true, count: count ? 1 : 0}};
    const options = {...wf, signalRank: ranked, signalActive: new Set([exit])};
    const book = new SignalActivationBook(signalIndex(tapes), ranked, 150, options);
    for (const t of stamps) assert.deepEqual([...drain(book.at(t))], [...activeSignalsAt(tapes, t, ranked, 150, options)],
      `exact same ordered keys at ${t}, count ${count}`);
  }
});

test("cancelling an activation build cannot publish a partial ranking or retain stale minute verdicts", () => {
  const {tp, wf, sig} = fixture();
  const book = new SignalActivationBook(signalIndex([tp]), sig, 150, wf);
  const attempt = book.at(start + 20 * M);
  // A completed tiny build is valid too; closing a larger generation mid-yield never changes its result.
  attempt.next(); attempt.return(new Set());
  for (const t of [start, start + 20 * M, start + H])
    assert.deepEqual([...drain(book.at(t))], [...activeSignalsAt([tp], t, sig, 150, wf)]);
});

test("prepared own histories remain causal under adversarial future returns and bounded cache eviction", () => {
  const {tp,wf,sig}=fixture();
  const cases=[-1e6,1e6].map(r=>makeTape(tp.id,tp.bot,tp.ind,tp.protect,tp.kind,tp.syms,
    [...Array.from({length:tp.n},(_,i)=>tradeAt(tp,i)),{...tradeAt(tp,0),entryT:start+2*H,exitT:start+3*H,r}],[],[]));
  const books=cases.map(t=>new SignalActivationBook(signalIndex([t]),sig,150,wf));
  // Exercise the single-item-over-budget path as well as the normal cache.
  (books[1] as unknown as {ownLimit:number}).ownLimit=1;
  for(let minute=-2;minute<60;minute++){
    const t=start+minute*M,expected=[...activeSignalsAt([tp],t,sig,150,wf)];
    for(const book of books)assert.deepEqual([...drain(book.at(t))],expected,`causal minute ${minute}`);
  }
});

test("activation cache budgets metadata as well as columns and preserves gates across LRU eviction", () => {
  const {tp, wf, sig} = fixture();
  const tapes = Array.from({length: 8}, (_, i) => {
    const ind = `sig-ema-cross-${i}-s@m5`, id = tp.id.replace(tp.ind, ind);
    return makeTape(id, tp.bot, ind, tp.protect, tp.kind, tp.syms,
      Array.from({length: tp.n}, (_, j) => ({...tradeAt(tp, j), cfg: id})), [], []);
  });
  const book = new SignalActivationBook(signalIndex(tapes), sig, 150, wf);
  const cache = book as unknown as {ownLimit: number; ownBytes: number; own: Map<string, {bytes: number}>};
  cache.ownLimit = 20_000;
  for (const t of [start, start + 20 * M, start + 21 * M, start]) {
    assert.deepEqual([...drain(book.at(t))], [...activeSignalsAt(tapes, t, sig, 150, wf)]);
    assert.ok(cache.own.size > 0 && cache.own.size < tapes.length, "exercise nonempty repeated evictions");
    assert.ok(cache.ownBytes <= cache.ownLimit);
    assert.equal(cache.ownBytes, [...cache.own.values()].reduce((sum, row) => sum + row.bytes, 0));
    assert.ok([...cache.own.values()].every(row => row.bytes >= 4096));
  }
});
