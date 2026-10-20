import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { auditState } from "../audit.ts";
import { AutoBlockBook, BlockBook, blockBookOf, sourceKey } from "./block.ts";
import { blockLevel, candidateDirectionFor, defaultWalkForward, execDecision, feedBooks, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";

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
  return { ...base, mode: "fixed", longH: 336, simH: 6, seatPer: "config", validLastN: 0, lastN: 0,
    normalBaseMinPf: 0, robustFrac: 0, symGate: "off", blockTrace: true,
    maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0,
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
    toggles: { normal: true, trailing: true, block: true, blockActive: false,
      dca: false, dcaActive: false, axis: false },
    block: { ...base.block, mode, historySource: "accepted-orders", ratio: .2, maxMult: 2, steps: 7, maxLevel: 8, minActiveLevel: 1,
      sources: { config: false, overall: true, symbol: false, direction: false, indication: false, type: false } } };
}

describe("Every Block relation learns final modeled Real admissions; direction gating retains candidates separately", () => {
  for (const mode of ["overall", "shared", "additive"] as const)
    it(`${mode}: final cap rejects do not enter Overall; unraised base entries causally bootstrap it`, () => {
      const tapes = [tape(1, "A"), tape(2, "B")], o = options(mode);
      const sim = walkForward(u, tapes, o);
      assert.equal(sim.trades.length, 6, "one of the two selected candidates fits the final modeled maxOpen cap per hour");
      const admitted = new Set(sim.trades.map(identity));
      const closed = sim.feed.filter((x) => !x.open);
      assert.equal(closed.length, 12, "both selected candidates remain available to independent guard/direction history");
      for (const e of closed) assert.equal(e.accepted === true, admitted.has(identity(e)));
      const first = sim.trades.find((x) => x.entryT === START + 10 * M)!;
      assert.equal(first.mult, 1, "a cold Overall book does not prevent the qualified default base entry");
      assert.equal(first.blockSampleCounts?.overall, 0);
      assert.ok(sim.trades.some((x) => (x.mult ?? 1) > 1), "later settled admitted wins can raise the volume");
      for (const x of sim.trades)
        assert.equal(x.blockSampleCounts?.overall, sim.trades.filter((p) => p.exitT <= x.entryT).length,
          "the entry cannot read its own or a future close, nor a cap-rejected candidate");
      const book = blockBookOf(o.block, false);
      const direction = candidateDirectionFor({ sideGateN: 12 });
      for (const e of closed) feedBooks(e, book, null, direction);
      assert.equal(book.tailSum("all", 100).n, 6);
      assert.equal(book.tailSum("d:1", 100).n, 6, "Block Direction uses only settled accepted Real orders");
      assert.equal(direction?.tailSum(1, 12).n, 12, "the independent direction gate retains rejected candidate calculations");
      const replay = blockBookOf(o.block, false);
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
    assert.ok(sim.feed.every((x) => x.accepted !== true));
    const book = blockBookOf(o.block, false);
    const direction = candidateDirectionFor({ sideGateN: 12 });
    for (const e of sim.feed) feedBooks(e, book, null, direction);
    assert.equal(book.level("all", 8), 0);
    assert.equal(book.sampleCount("all", 8), 0);
    assert.equal(book.level("d:1", 8), 0, "rejected wins cannot warm any accepted-order Block relation");
    assert.ok((direction?.tailSum(1, 12).n ?? 0) > 0, "raw direction evidence remains independent without inventing an admission");
  });

  it("accepted-only Active remains cold for Overall and auxiliary sources; the explicit candidate diagnostic can bootstrap", () => {
    const only = options();
    only.toggles = { ...only.toggles, normal: false, blockActive: true };
    const cold = walkForward(u, [tape(1, "A")], only);
    assert.equal(cold.trades.length, 0);
    assert.ok(cold.feed.length > 0 && cold.feed.every((e) => e.accepted !== true));
    const auxiliary = walkForward(u, [tape(1, "A")], {
      ...only, block: { ...only.block, sources: { ...only.block.sources, symbol: true } },
    });
    assert.equal(auxiliary.trades.length, 0, "an unaccepted Symbol candidate cannot bootstrap accepted-only Active");
    const diagnostic = walkForward(u, [tape(1, "A")], {
      ...only, block: { ...only.block, historySource: "real-candidates",
        sources: { ...only.block.sources, overall: false, symbol: true } },
    });
    assert.ok(diagnostic.trades.length > 0);
    assert.ok(diagnostic.trades[0].entryT > START + 10 * M, "explicit candidate history first needs a closed own Symbol candidate");
    assert.equal(diagnostic.trades[0].blockEffectiveLevels?.overall, 0, "disabled Overall cannot raise the diagnostic entry");
  });

  it("admitted open endpoint marks do not teach any source or consume an Overall pause", () => {
    const o = { ...options(), maxOpen: 0 };
    const sim = walkForward(u, [tape(1, "A", true)], o);
    const endpoint = sim.feed.find((e) => e.open)!;
    assert.ok(endpoint?.accepted, "the endpoint order was modeled as admitted, but is not settled");
    const book = new BlockBook(2, 1, true);
    book.add({ sym: "A", side: 1, kind: "osc", r: .01, accepted: true, bsrc: ["overall"] });
    const before = book.tailSum("all", 100);
    feedBooks(endpoint, book);
    assert.deepEqual(book.tailSum("all", 100), before);
    assert.equal(book.paused("all"), true);
  });

  it("rejected candidates cannot set or consume any accepted-order Block pause", () => {
    const book = new BlockBook(2, 1, true);
    const own = { sym: "A", side: 1, kind: "osc", r: .01 };
    book.add({ ...own, accepted: true, bsrc: ["overall", "symbol"] });
    for (let i = 0; i < 2; i++) book.add({ ...own, bsrc: ["overall"] });
    assert.equal(book.paused("all"), true, "unadmitted closes neither consume nor reset the admitted-order clock");
    assert.equal(book.paused(sourceKey("symbol", own)), true, "rejected candidates cannot consume the accepted Symbol clock either");
    assert.equal(book.tailSum("all", 100).n, 1);
    book.add({ ...own, r: -.01, accepted: true });
    assert.equal(book.paused("all"), true);
    book.add({ ...own, r: -.01, accepted: true });
    assert.equal(book.paused("all"), false);
    assert.equal(book.paused(sourceKey("symbol", own)), false, "only settled accepted own closes consume the Symbol pause");
    const empty = new BlockBook(2, 1, true);
    empty.add({ ...own, bsrc: ["overall"] });
    assert.equal(empty.paused("all"), false, "a rejected winning candidate cannot create an Overall pause");
  });
});

describe("automatic windows preserve entry-time accepted-order evidence and explicit candidate diagnostics", () => {
  const base = { ...DEFAULT_SETTINGS.block, historySource: "accepted-orders" as const, maxLevel: 1, minActiveLevel: 1, window: 1,
    windowAuto: true, windowCandidates: [1], sources: { config: false, overall: true, symbol: true } };
  const own = { sym: "A", side: 1, kind: "osc", r: .01 };
  it("a rejected entry cannot enter accepted-order auto scores through a later winning candidate close", () => {
    const book = new AutoBlockBook(base);
    book.add({ ...own, sym: "B", accepted: true });
    const rejected = { ...own, entryT: 1, autoRaise: undefined as number | undefined };
    book.stampEntry(rejected);
    assert.equal(rejected.autoRaise, 1, "the entry-time Overall verdict is stamped before the rejected close");
    book.add({ ...own, accepted: false }); // a new auxiliary close after the rejected entry
    book.add(rejected);
    assert.equal(book.scores()[0].n, 0, "rejected candidates cannot score an accepted-order window");
    assert.equal(book.sampleCount("all", 8), 1);
  });
  it("a qualifying rejected auxiliary candidate scores only under the explicit legacy candidate diagnostic", () => {
    const book = new AutoBlockBook(base);
    book.add({ ...own, accepted: true }); // accepted Symbol and Overall are warm
    const rejected = { ...own, entryT: 1 };
    book.stampEntry(rejected);
    book.add(rejected);
    assert.equal(book.scores()[0].n, 0, "a positive rejected result does not enter accepted-only auto scores");
    assert.equal(book.sampleCount("all", 8), 1);
    const diagnostic = new AutoBlockBook({ ...base, historySource: "real-candidates" });
    diagnostic.add(own);
    const candidate = { ...own, entryT: 1 };
    diagnostic.stampEntry(candidate);
    diagnostic.add(candidate);
    assert.equal(diagnostic.scores()[0].n, 1, "explicit candidate learning may score its causal qualifying candidate");
  });
  it("accepted Overall-only stamps survive JSON replay while unaccepted legacy masks remain unavailable", () => {
    const cfg = { ...base, sources: { config: false, overall: true } };
    const book = new AutoBlockBook(cfg);
    book.add({ ...own, accepted: true });
    const admitted = { ...own, entryT: 1, accepted: true };
    book.stampEntry(admitted);
    book.add(JSON.parse(JSON.stringify(admitted)));
    assert.equal(book.scores()[0].n, 1);
    const legacyStamped = { ...own, entryT: 2, autoRaise: 1 };
    const legacyUnstamped = { ...own, entryT: 3 };
    book.add(legacyStamped);
    book.add(legacyUnstamped);
    assert.equal(book.scores()[0].n, 1, "unaccepted legacy entries cannot become accepted evidence at exit");
  });
});

describe("opt-in Block trace follows the judging history without changing execution", () => {
  const own = { cfg: "cfg", sym: "A", side: 1, kind: "osc", ind: IND, r: .01, accepted: true };

  it("legacy raw config traces count the whole available own tail beyond an unknown newest outcome", () => {
    const tp = tape(1, "A");
    tp.r[tp.r.length - 1] = NaN;
    const original = options();
    const o = { ...original, block: { ...original.block, historySource: "real-candidates" as const,
      maxLevel: 3, sources: { config: true } } };
    const observed = { n: 0 };
    assert.equal(blockLevel(tp, NOW, o.block, { sym: "A", side: 1 }, observed), 0);
    assert.equal(observed.n, 3, "unknown latest evidence does not erase older available rows from the diagnostic");
    const traced = execDecision(tp, NOW, o, { sym: "A", side: 1 });
    const plain = execDecision(tp, NOW, { ...o, blockTrace: false }, { sym: "A", side: 1 });
    assert.ok(traced.ok && plain.ok);
    assert.equal(traced.blockSampleCounts?.config, 3);
    assert.equal(traced.blockLevels?.config, 0);
    assert.equal(traced.vol, plain.vol);
    assert.equal(traced.level, plain.level);
  });

  it("fixed and automatic sample counts use config window 1 and the selected pooled window, retaining unknown rows", () => {
    const fixed = new BlockBook(0, 2, true);
    const automatic = new AutoBlockBook({ ...options().block, maxLevel: 3, window: 2,
      windowAuto: true, windowCandidates: [1, 2] }, false);
    for (const book of [fixed, automatic]) {
      for (let i = 0; i < 7; i++) book.add({ ...own, r: i === 6 ? NaN : .01 });
      assert.equal(book.window, 2);
      assert.equal(book.sampleCount(sourceKey("config", own), 3), 3, "config keeps its exact last-N record");
      assert.equal(book.sampleCount("all", 3), 6, "pooled evidence uses the selected 2-close window");
      assert.equal(book.level("all", 3), 0, "the latest unknown remains in every judged window");
      assert.equal(book.sampleCount("missing", 3), 0);
    }
  });

  for (const mode of ["overall", "shared", "additive"] as const)
    for (const windowAuto of [false, true])
      it(`${mode}, auto ${windowAuto}: tracing changes metadata only, retaining causal accepted counts`, () => {
        const original = options(mode);
        const o = { ...original, block: { ...original.block, maxLevel: 2, window: 2, windowAuto,
          windowCandidates: [1, 2] } };
        const tapes = [tape(1, "A"), tape(2, "B")];
        const traced = walkForward(u, tapes, o);
        const plain = walkForward(u, tapes, { ...o, blockTrace: false });
        const withoutTrace = (rows: Trade[]) => rows.map(({ blockLevels: _levels,
          blockEffectiveLevels: _effective, blockSampleCounts: _counts, ...row }) => row);
        assert.deepEqual(withoutTrace(traced.trades), plain.trades);
        assert.deepEqual(traced.stats, plain.stats);
        assert.deepEqual(traced.steps, plain.steps);
        assert.deepEqual(traced.feed, plain.feed, "entry admission and automatic-window stamps are unchanged");
        assert.ok(plain.trades.every((x) => x.blockLevels === undefined && x.blockSampleCounts === undefined));
        for (const x of traced.trades) {
          const settled = traced.trades.filter((p) => p.exitT <= x.entryT).length;
          assert.equal(x.blockSampleCounts?.overall, Math.min(settled, o.block.maxLevel * o.block.window));
          assert.equal(x.blockSampleCounts?.config, Math.min(settled, o.block.maxLevel), "accepted config counts use window 1");
          assert.equal(x.blockEffectiveLevels?.symbol, 0, "disabled relations remain diagnostic levels only");
          assert.ok(x.blockLevels && x.blockSampleCounts);
        }
      });
});
