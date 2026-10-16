import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { auditState } from "../audit.ts";
import { AutoBlockBook, BlockBook, sourceKey } from "./block.ts";
import { defaultWalkForward, feedBooks, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";

const H = 3_600_000, M = 60_000;
const NOW = Date.UTC(2026, 9, 15, 12), START = NOW - 6 * H;
const IND = "rsi-mom-14-20@m15";
const u = { bars: [], caches: [], startT: NOW - 400 * H, endT: NOW,
  splitT: NOW - 400 * H, nowT: NOW, baseTf: 60 } as never;
const config = (n: number) => `follow|${IND}|tp${n}|sl1|tr0|h32`;
const identity = (x: { cfg?: string; sym: string; side: number; entryT?: number }) =>
  `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`;
function tape(n: number, sym: string, open = false) {
  const cfg = config(n);
  const row = (entryT: number): Trade => ({ cfg, sym, side: 1, entryT, exitT: entryT + 30 * M,
    entry: 100, exit: 100 * (1 + .01 + DEFAULT_SETTINGS.cost), r: .01, reason: "time",
    bars: 2, mfe: 0, mae: 0, kind: "normal" });
  const rows = Array.from({ length: 100 }, (_, i) => row(NOW - 120 * H + i * H));
  for (let i = 0; i < 6; i++) rows.push(row(START + 10 * M + i * H));
  const positions: OpenPosition[] = open ? [{ cfg, sym, side: 1, entryT: NOW - 10 * M, entryI: 0,
    entry: 100, stop: 99, target: 102, peak: 100, trailOn: false, mtm: .1 }] : [];
  return makeTape(cfg, "follow", IND, { tp: n / 100, sl: .01, trail: 0, hold: 32 },
    "normal", [sym], rows, positions, []);
}
function options(mode: "overall" | "shared" | "additive" = "overall"): WalkForwardOptions {
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  return { ...base, mode: "fixed", simH: 6, seatPer: "config", validLastN: 0, lastN: 0,
    normalBaseMinPf: 0, robustFrac: 0, symGate: "off", blockTrace: true,
    maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0,
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
    toggles: { normal: true, trailing: true, block: true, blockActive: false,
      dca: false, dcaActive: false, axis: false },
    block: { ...base.block, mode, ratio: .2, maxMult: 2, steps: 7, maxLevel: 8, minActiveLevel: 1,
      sources: { config: false, overall: true, symbol: false, direction: false, indication: false, type: false } } };
}

describe("Overall learns final modeled Real admissions while auxiliary relations retain candidates", () => {
  for (const mode of ["overall", "shared", "additive"] as const)
    it(`${mode}: final cap rejects do not enter Overall; unraised base entries causally bootstrap it`, () => {
      const tapes = [tape(1, "A"), tape(2, "B")], o = options(mode);
      const sim = walkForward(u, tapes, o);
      assert.equal(sim.trades.length, 6, "one of the two selected candidates fits the final modeled maxOpen cap per hour");
      const admitted = new Set(sim.trades.map(identity));
      const closed = sim.feed.filter((x) => !x.open);
      assert.equal(closed.length, 12, "both independent selected candidates remain available to auxiliary relations");
      for (const e of closed) assert.equal(e.realAccepted === true, admitted.has(identity(e)));
      const first = sim.trades.find((x) => x.entryT === START + 10 * M)!;
      assert.equal(first.mult, 1, "a cold Overall book does not prevent the qualified default base entry");
      assert.equal(first.blockSampleCounts?.overall, 0);
      assert.ok(sim.trades.some((x) => (x.mult ?? 1) > 1), "later settled admitted wins can raise the volume");
      for (const x of sim.trades)
        assert.equal(x.blockSampleCounts?.overall, sim.trades.filter((p) => p.exitT <= x.entryT).length,
          "the entry cannot read its own or a future close, nor a cap-rejected candidate");
      const book = new BlockBook();
      for (const e of closed) feedBooks(e, book);
      assert.equal(book.tailSum("all", 100).n, 6);
      assert.equal(book.tailSum("d:1", 100).n, 12, "Direction retains all closed selected candidate calculations");
      const replay = new BlockBook();
      for (const e of JSON.parse(JSON.stringify(sim.feed))) feedBooks(e, replay);
      assert.deepEqual(replay.tailSum("all", 100), book.tailSum("all", 100), "the admission marker survives feed persistence/replay");
      const audit = auditState({ sim, tapes, cost: DEFAULT_SETTINGS.cost });
      assert.ok(audit.checks.find((x) => x.name.startsWith("replay:"))?.ok,
        JSON.stringify(audit.checks.filter((x) => !x.ok)));
    });

  it("a selected candidate rejected by its own last-N PF/sample gate never seeds Overall", () => {
    const base = options();
    const o = { ...base, maxOpen: 0, lastN: 200, gates: { ...base.gates, lastNFloor: 0 } };
    const sim = walkForward(u, [tape(1, "A")], o);
    assert.equal(sim.trades.length, 0);
    assert.ok(sim.feed.length > 0);
    assert.ok(sim.feed.every((x) => x.realAccepted !== true));
    const book = new BlockBook();
    for (const e of sim.feed) feedBooks(e, book);
    assert.equal(book.level("all", 8), 0);
    assert.equal(book.sampleCount("all", 8), 0);
    assert.ok(book.level("d:1", 8) > 0, "auxiliary candidate evidence remains available without inventing an admission");
  });

  it("Overall-only Active remains honestly cold; an independent auxiliary relation can bootstrap Active", () => {
    const only = options();
    only.toggles = { ...only.toggles, normal: false, blockActive: true };
    const cold = walkForward(u, [tape(1, "A")], only);
    assert.equal(cold.trades.length, 0);
    assert.ok(cold.feed.length > 0 && cold.feed.every((e) => e.realAccepted !== true));
    const auxiliary = walkForward(u, [tape(1, "A")], {
      ...only, block: { ...only.block, sources: { ...only.block.sources, symbol: true } },
    });
    assert.ok(auxiliary.trades.length > 0);
    assert.ok(auxiliary.trades[0].entryT > START + 10 * M, "the independent Symbol source first needs a closed candidate");
    assert.equal(auxiliary.trades[0].blockSampleCounts?.overall, 0, "the auxiliary raise does not pretend Overall was already warm");
  });

  it("admitted open endpoint marks do not teach any source or consume an Overall pause", () => {
    const o = { ...options(), maxOpen: 0 };
    const sim = walkForward(u, [tape(1, "A", true)], o);
    const endpoint = sim.feed.find((e) => e.open)!;
    assert.ok(endpoint?.realAccepted, "the endpoint order was modeled as admitted, but is not settled");
    const book = new BlockBook(2);
    book.add({ sym: "A", side: 1, kind: "osc", r: .01, realAccepted: true, bsrc: ["overall"] });
    const before = book.tailSum("all", 100);
    feedBooks(endpoint, book);
    assert.deepEqual(book.tailSum("all", 100), before);
    assert.equal(book.paused("all"), true);
  });

  it("rejected candidates cannot set or consume the Overall pause; auxiliary clocks remain independent", () => {
    const book = new BlockBook(2);
    const own = { sym: "A", side: 1, kind: "osc", r: .01 };
    book.add({ ...own, realAccepted: true, bsrc: ["overall", "symbol"] });
    for (let i = 0; i < 2; i++) book.add({ ...own, bsrc: ["overall"] });
    assert.equal(book.paused("all"), true, "unadmitted closes neither consume nor reset the admitted-order clock");
    assert.equal(book.paused(sourceKey("symbol", own)), false, "the auxiliary candidate clock consumes its own two closes");
    assert.equal(book.tailSum("all", 100).n, 1);
    book.add({ ...own, r: -.01, realAccepted: true });
    assert.equal(book.paused("all"), true);
    book.add({ ...own, r: -.01, realAccepted: true });
    assert.equal(book.paused("all"), false);
    const empty = new BlockBook(2);
    empty.add({ ...own, bsrc: ["overall"] });
    assert.equal(empty.paused("all"), false, "a rejected winning candidate cannot create an Overall pause");
  });
});

describe("automatic windows preserve entry-time admitted versus auxiliary evidence", () => {
  const base = { ...DEFAULT_SETTINGS.block, maxLevel: 1, minActiveLevel: 1, window: 1,
    windowAuto: true, windowCandidates: [1], sources: { config: false, overall: true, symbol: true } };
  const own = { sym: "A", side: 1, kind: "osc", r: .01 };
  it("a rejected entry raised only by Overall cannot enter auto scores through a later winning auxiliary close", () => {
    const book = new AutoBlockBook(base);
    book.add({ ...own, sym: "B", realAccepted: true });
    const rejected = { ...own, entryT: 1, autoRaise: undefined as number | undefined };
    book.stampEntry(rejected);
    assert.equal((rejected as { autoOverallRaise?: number }).autoOverallRaise, 1);
    assert.equal((rejected as { autoAuxRaise?: number }).autoAuxRaise, 0);
    book.add({ ...own, realAccepted: false }); // a new auxiliary close after the rejected entry
    book.add(rejected);
    assert.equal(book.scores()[0].n, 0, "do not replace an entry-time auxiliary zero with its later close-time level");
    assert.equal(book.sampleCount("all", 8), 1);
  });
  it("a rejected candidate may still score its genuinely qualifying independent auxiliary entry-time relation", () => {
    const book = new AutoBlockBook(base);
    book.add(own); // Symbol is warm; Overall has no admitted order
    const rejected = { ...own, entryT: 1 };
    book.stampEntry(rejected);
    book.add(rejected);
    assert.equal(book.scores()[0].n, 1);
    assert.equal(book.sampleCount("all", 8), 0);
  });
  it("admitted Overall-only stamps survive JSON replay while unmarked legacy masks remain unavailable", () => {
    const cfg = { ...base, sources: { config: false, overall: true } };
    const book = new AutoBlockBook(cfg);
    book.add({ ...own, realAccepted: true });
    const admitted = { ...own, entryT: 1, realAccepted: true };
    book.stampEntry(admitted);
    book.add(JSON.parse(JSON.stringify(admitted)));
    assert.equal(book.scores()[0].n, 1);
    book.add({ ...own, entryT: 2, autoRaise: 1 });
    book.add({ ...own, entryT: 3 });
    assert.equal(book.scores()[0].n, 1, "legacy missing admission/split evidence cannot be inferred at exit");
  });
});
