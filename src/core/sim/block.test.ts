import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AutoBlockBook,
  BLOCK_SOURCES,
  BlockBook,
  blockBookOf,
  blockDecide,
  blockStackCap,
  bookLevels,
  combineLevels,
  levelOfTail,
  sourcesOf,
  stepRaise,
  sourceKey,
} from "./block.ts";
import {
  blockEntryOf,
  blockLevel,
  defaultWalkForward,
  execDecision,
  feedBooks,
  kindOfInd,
  makeTape,
  walkForward,
} from "./walkforward.ts";
import { SignalAcceptIndex, SignalGuard } from "../signals.ts";
import { DEFAULT_BLOCK, DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "../config.ts";
import { INDICATIONS } from "../indications/registry.ts";
import type { BlockConfig, Trade } from "../domain/types.ts";

const H = 3_600_000;
const B: BlockConfig = { ratio: 0.2, maxLevel: 3, minActiveLevel: 1, maxMult: 3 };

describe("Block sources", () => {
  it("level = count of positive last-n sums", () => {
    assert.equal(levelOfTail([], 3), 0);
    assert.equal(levelOfTail([0.01, 0.01, -0.03], 3), 0);
    assert.equal(levelOfTail([-0.03, 0.01, 0.01], 3), 2);
    // window: level n judges the last n × window closes (all present)
    const noisy = [-0.05, 0.01, 0.01, 0.01, 0.01, 0.01];
    assert.equal(levelOfTail(noisy, 3), 3, "window 1: the last closes look positive");
    assert.equal(levelOfTail(noisy, 3, 2), 2, "window 2: the third level reaches back to the loss");
    assert.equal(levelOfTail(noisy, 4, 2), 2, "too few closes for level 4 × 2");
    assert.equal(levelOfTail([0.01, 0.01, 0.01], 3, 2), 1, "levels need all n × window closes");
    assert.equal(levelOfTail([0.02, -0.01, 0.01], 3), 2); // n=2 sums to 0 (not > 0)
    assert.equal(levelOfTail([0.02, -0.01, 0.01], 1), 1);
  });

  it("unknown units and overflow cannot raise a window, while finite shorter windows remain independent", () => {
    for (const unknown of [NaN, Infinity, -Infinity]) {
      assert.equal(levelOfTail([.01, unknown], 2), 0, "a latest unknown is retained, never skipped for an older win");
      assert.equal(levelOfTail([unknown, .01], 2), 1, "only the complete finite last-one window qualifies");
      assert.equal(levelOfTail([.01, unknown, .01, .01], 2, 2), 1, "the larger pooled window retains its unknown close");
    }
    assert.equal(levelOfTail([Number.MAX_VALUE, Number.MAX_VALUE], 2), 1,
      "overflow in the second window is unknown, not a second winning level");
  });

  it("keeps symbol, direction and indication independent", () => {
    const b = new BlockBook();
    b.add({ sym: "A", side: 1, kind: "rsi", r: 0.01, type: "trailing", realAccepted: true });
    b.add({ sym: "A", side: 1, kind: "rsi", r: 0.01, type: "trailing", realAccepted: true });
    b.add({ sym: "B", side: -1, kind: "macd", r: -0.05, realAccepted: true });
    assert.deepEqual(bookLevels(b, { sym: "A", side: 1, kind: "rsi", type: "trailing" }, 3), {
      overall: 0,
      symbol: 2,
      direction: 2,
      indication: 2,
      type: 2,
    });
    assert.deepEqual(bookLevels(b, { sym: "B", side: -1, kind: "macd" }, 3), {
      overall: 0,
      symbol: 0,
      direction: 0,
      indication: 0,
      type: 0,
    });
    assert.deepEqual(bookLevels(b, { sym: "C", side: 1, kind: "ema" }, 3), {
      overall: 0,
      symbol: 0,
      direction: 2,
      indication: 0,
      // type "normal" (the default): only the losing macd entry
      type: 0,
    });
    assert.deepEqual(bookLevels(null, { sym: "A", side: 1, kind: "rsi" }, 3), {
      overall: 0,
      symbol: 0,
      direction: 0,
      indication: 0,
      type: 0,
    });
  });

  it("long histories keep the right tail", () => {
    const b = new BlockBook();
    for (let i = 0; i < 1000; i++) b.add({ sym: "A", side: 1, kind: "rsi", r: -0.01, realAccepted: true });
    b.add({ sym: "A", side: 1, kind: "rsi", r: 0.05, realAccepted: true });
    assert.equal(b.level("all", 3), 3);
  });

  it("defaults to the config set only; shared = max, additive = sum", () => {
    assert.deepEqual(sourcesOf(B), {
      config: true,
      overall: false,
      symbol: false,
      direction: false,
      indication: false,
      type: false,
    });
    const lv = { config: 1, overall: 2, symbol: 3, direction: 0, indication: 1, type: 0 };
    assert.equal(combineLevels(lv, B), 1);
    const all = { config: true, overall: true, symbol: true, direction: true, indication: true };
    assert.equal(combineLevels(lv, { ...B, sources: all }), 3);
    assert.equal(combineLevels(lv, { ...B, sources: all, mode: "shared" }), 3);
    assert.equal(combineLevels(lv, { ...B, sources: all, mode: "additive" }), 7);
    assert.equal(
      combineLevels(lv, {
        ...B,
        sources: { config: false, symbol: true, indication: true },
        mode: "additive",
      }),
      4,
    );
    assert.equal(combineLevels(lv, { ...B, sources: { config: false } }), 0);
  });

  it("execDecision uses the enabled sources; volume stays capped by max multiple", () => {
    const ind = INDICATIONS[0];
    const tr = (h: number, r: number): Trade => ({
      cfg: "x",
      sym: "A",
      side: 1,
      entryT: h * H,
      exitT: (h + 1) * H,
      entry: 1,
      exit: 1,
      r,
      reason: r > 0 ? "tp" : "sl",
      bars: 4,
      mfe: 0,
      mae: 0,
    });
    // the config set itself just lost: config level 0
    const t = makeTape(
      "x",
      "magnet",
      ind.id,
      { tp: 0.02, sl: 0.02, trail: 0, hold: 32 },
      "normal",
      ["A"],
      [tr(0, -0.03)],
      [],
      [],
    );
    assert.equal(kindOfInd(ind.id), ind.kind);
    const book = new BlockBook();
    for (let i = 0; i < 3; i++) book.add({ sym: "A", side: 1, kind: ind.kind, r: 0.01, realAccepted: true });
    const base = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      lastN: 0,
      symGate: undefined,
      toggles: { ...DEFAULT_TOGGLES, normal: true, block: true, blockActive: false },
    };
    const ctx = { book, sym: "A", side: 1 };
    // config only: level 0 → not Block-adjusted: the plain base with Normal on, skipped with Normal off
    assert.deepEqual(execDecision(t, 2 * H, { ...base, block: B }, ctx), {
      ok: true,
      level: 0,
      vol: 1,
    });
    assert.deepEqual(
      execDecision(
        t,
        2 * H,
        { ...base, toggles: { ...base.toggles, normal: false }, block: B },
        ctx,
      ),
      { ok: false, why: "normalOff" },
    );
    // Block Active: level 0 is below every min level — skipped even with Normal on
    assert.deepEqual(
      execDecision(t, 2 * H, { ...base, toggles: { ...base.toggles, blockActive: true }, block: B }, ctx),
      { ok: false, why: "blockActive" },
    );
    // symbol source: level 3 → 1 + 0.2·3
    const sym = execDecision(
      t,
      2 * H,
      { ...base, block: { ...B, sources: { symbol: true } } },
      ctx,
    );
    assert.ok(sym.ok && sym.level === 3 && Math.abs(sym.vol - 1.6) < 1e-9);
    // additive over symbol + direction + indication: level 9, volume capped at 3
    const add = execDecision(
      t,
      2 * H,
      {
        ...base,
        block: {
          ...B,
          ratio: 0.3,
          mode: "additive",
          sources: { symbol: true, direction: true, indication: true },
        },
      },
      ctx,
    );
    assert.ok(add.ok && add.level === 9 && add.vol === 3);
    // a different symbol / side sees nothing from the symbol and direction sources (not adjusted: plain base)
    assert.deepEqual(
      execDecision(
        t,
        2 * H,
        { ...base, block: { ...B, sources: { symbol: true, direction: true } } },
        { book, sym: "B", side: -1 },
      ),
      { ok: true, level: 0, vol: 1 },
    );
    // without a book the extra sources contribute nothing
    assert.deepEqual(
      execDecision(t, 2 * H, { ...base, block: { ...B, sources: { overall: true } } }),
      { ok: true, level: 0, vol: 1 },
    );
  });

  it("the book judges unit results (the Block multiplier does not feed back)", () => {
    const ind = INDICATIONS[0];
    const x = {
      cfg: `magnet|${ind.id}|tp2|sl2|tr0|h32`,
      sym: "A",
      side: 1 as const,
      entryT: 0,
      exitT: H,
      entry: 1,
      exit: 1,
      r: -0.03,
      reason: "sl" as const,
      bars: 1,
      mfe: 0,
      mae: 0,
      mult: 3,
    };
    assert.deepEqual(blockEntryOf(x), {
      sym: "A",
      side: 1,
      kind: ind.kind,
      r: -0.01,
      ind: ind.id,
      type: "normal",
      cfg: x.cfg,
      entryT: x.entryT,
    });
    for (const mult of [undefined, 0, NaN, Infinity])
      assert.ok(Number.isNaN(blockEntryOf({ ...x, mult }).r), "unknown modeled units cannot become valid Block evidence");
    assert.equal(blockEntryOf({ ...x, mult: undefined }, "candidate-unit").r, -0.03,
      "the explicitly intrinsic raw candidate keeps its own unweighted return");
  });
});

describe("Block types, Active, steps and pause", () => {
  const L = { config: 0, overall: 3, symbol: 2, direction: 1, indication: 4, type: 0 };
  const SRC = { config: false, overall: true, symbol: true, direction: true, indication: true };
  const ON: BlockConfig = { ratio: 0.2, maxLevel: 6, minActiveLevel: 1, maxMult: 3, sources: SRC };

  it("shared = strongest source, additive = sum, both one raise", () => {
    const sh = blockDecide(L, { ...ON, mode: "shared" }, false);
    assert.equal(sh.level, 4);
    assert.ok(Math.abs(sh.vol - 1.8) < 1e-9);
    assert.deepEqual(sh.src, ["indication"]);
    assert.equal(sh.legs, undefined);
    const ad = blockDecide(L, { ...ON, mode: "additive" }, false);
    assert.equal(ad.level, 10);
    assert.equal(ad.vol, 3, "1 + 0.2·10 capped at maxMult 3");
    assert.deepEqual(ad.src, ["overall", "symbol", "direction", "indication"]);
  });

  it("Shared accepts any valid independent source, without requiring a losing or paused sibling to qualify", () => {
    for (const source of ["overall", "symbol", "direction", "indication"] as const) {
      const onlyOne = { config: 0, overall: 0, symbol: 0, direction: 0, indication: 0, type: 0, [source]: 3 };
      const d = blockDecide(onlyOne, { ...ON, mode: "shared", minActiveLevel: 3 }, true);
      assert.deepEqual(d, { adjusted: true, level: 3, vol: 1.6, src: [source] }, source);
      const paused = blockDecide(onlyOne, { ...ON, mode: "shared", minActiveLevel: 3 }, true, (s) => s === source);
      assert.deepEqual(paused, { adjusted: false, level: 0, vol: 1, src: [] }, `${source}: own pause applies`);
    }
    const tied = blockDecide({ ...L, overall: 4 }, { ...ON, mode: "shared", minActiveLevel: 4 }, true);
    assert.equal(tied.vol, 1.8, "two valid sources share one raise, rather than compounding");
    assert.deepEqual(tied.src, ["overall", "indication"], "each equally strongest source retains its attribution");
  });

  it("ratio 0.2 adds 20% per passing level before the explicit step grid and one aggregate cap", () => {
    const levels = { config: 0, overall: 1, symbol: 2, direction: 3, indication: 4, type: 0 };
    const b = { ...ON, ratio: .2, maxMult: 8, steps: 0 };
    const shared = blockDecide(levels, { ...b, mode: "shared" }, false);
    const additive = blockDecide(levels, { ...b, mode: "additive" }, false);
    const overall = blockDecide(levels, { ...b, mode: "overall" }, false);
    assert.equal(shared.vol, 1.8);
    assert.equal(additive.vol, 3);
    assert.equal(overall.vol, 3);
    assert.deepEqual(overall.legs, { overall: .2, symbol: .4, direction: .6, indication: .8 });
    const stepped = blockDecide(levels, { ...b, mode: "overall", steps: 7 }, false);
    assert.deepEqual(stepped.legs, { overall: .2, symbol: .4, direction: .6, indication: .8 },
      "sub-step additions retain their requested fractions, never five times the ratio at the first level");
    assert.equal(stepped.vol, 3);
  });

  it("ratio 0.2 preserves one valid relation in every mode even when all stronger siblings are paused", () => {
    for (const source of BLOCK_SOURCES)
      for (const mode of ["shared", "additive", "overall"] as const) {
        const levels = Object.fromEntries(BLOCK_SOURCES.map((s) => [s, s === source ? 1 : 8])) as typeof L;
        const b = { ...ON, ratio: .2, maxLevel: 8, maxMult: 8, steps: 7, minActiveLevel: 1, mode,
          sources: Object.fromEntries(BLOCK_SOURCES.map((s) => [s, true])) };
        const d = blockDecide(levels, b, true, (s) => s !== source);
        assert.equal(d.vol, 1.2, `${mode}/${source}: a 0.2 raise cannot become one full unit`);
        assert.deepEqual(d.src, [source]);
        if (mode === "overall") assert.deepEqual(d.legs, { [source]: .2 });
        assert.equal(blockDecide(levels, b, true, () => true).adjusted, false, "all paused is not valid");
      }
  });

  it("step and cap matrix never adds more than the requested ratio or compounds independent source raises", () => {
    const levels = { config: 1, overall: 2, symbol: 3, direction: 4, indication: 5, type: 8 };
    const sources = Object.fromEntries(BLOCK_SOURCES.map((s) => [s, true]));
    for (const mode of ["shared", "additive", "overall"] as const)
      for (const ratio of [.2, .4, .5])
        for (const maxMult of [1, 1.0000001, 1.234567, 2, 2.5, 4, 8])
          for (const steps of [0, 1, 3, 7, 12]) {
            const b = { ...ON, sources, mode, ratio, maxLevel: 8, maxMult, steps };
            const d = blockDecide(levels, b, false);
            const raw = ratio * (mode === "shared" ? Math.max(...Object.values(levels)) : Object.values(levels).reduce((a, x) => a + x, 0));
            assert.ok(d.vol - 1 <= Math.min(raw, maxMult - 1) + 1e-12,
              `${mode}/${ratio}/${maxMult}/${steps}: ${d.vol} exceeds the requested additional volume`);
            for (const source of BLOCK_SOURCES)
              assert.ok((d.legs?.[source] ?? 0) <= ratio * levels[source] + 1e-12, `${source}: no inflated source leg`);
            if (mode === "overall") assert.ok(Math.abs(d.vol - 1 - Object.values(d.legs ?? {}).reduce((a, x) => a + (x ?? 0), 0)) < 1e-12);
          }
  });

  it("Symbol, Direction and Indication books calculate and stack their own closed candidate relations", () => {
    const book = new BlockBook();
    for (const e of [
      { sym: "A", side: 1, kind: "trend", type: "normal", r: .01 },
      { sym: "B", side: -1, kind: "osc", type: "trailing", r: -.01 },
      { sym: "A", side: -1, kind: "trend", type: "normal", r: -.01 },
      { sym: "B", side: 1, kind: "osc", type: "trailing", r: -.01 },
      { sym: "A", side: 1, kind: "trend", type: "normal", r: .03 },
    ]) book.add({ ...e, realAccepted: true });
    const own = { sym: "A", side: 1, kind: "trend", type: "normal" };
    assert.deepEqual(bookLevels(book, own, 3), { overall: 3, symbol: 2, direction: 3, indication: 2, type: 3 });
    assert.equal(bookLevels(book, { ...own, side: -1 }, 3).symbol, 0, "a losing short relation stays separate");
    assert.equal(bookLevels(book, { ...own, sym: "B", kind: "osc" }, 3).indication, 0, "another indication's losses remain its own");
    const levels = { config: 0, ...bookLevels(book, own, 3) };
    const d = blockDecide(levels, { ...ON, mode: "overall", ratio: .2, steps: 7, maxMult: 8,
      sources: { config: false, symbol: true, direction: true, indication: true } }, false);
    assert.deepEqual(d.legs, { symbol: .4, direction: .6, indication: .4 });
    assert.equal(d.vol, 2.4, "independent additions sum beside one base, rather than multiplying each other");
    assert.equal(book.sampleCount(sourceKey("symbol", own), 3), 2);
    assert.equal(book.sampleCount(sourceKey("direction", own), 3), 3);
    assert.equal(book.sampleCount(sourceKey("indication", own), 3), 2);
    const before = bookLevels(book, own, 3);
    feedBooks({ ...own, exitT: 1000, entryT: 0, r: 1000, open: true }, book);
    assert.deepEqual(bookLevels(book, own, 3), before, "an active open order's unrealized gain cannot qualify a closed-return relation");
    assert.equal(book.sampleCount(sourceKey("symbol", own), 3), 2, "endpoint marks never inflate the closed-candidate count");
  });

  it("overall: every source (overall, symbol, direction, indication) is its own Block with its own position", () => {
    const ov = blockDecide(L, { ...ON, mode: "overall" }, false);
    assert.deepEqual(ov.legs, { overall: 0.6, symbol: 0.4, direction: 0.2, indication: 0.8 });
    assert.ok(Math.abs(ov.vol - 3) < 1e-9, "1 + 0.6 + 0.4 + 0.2 + 0.8");
    assert.equal(ov.level, 4);
    // The base and all sources share maxMult; adding sources never bypasses the chosen total cap.
    const big = blockDecide({ ...L, overall: 6, symbol: 6, direction: 6, indication: 6 }, { ...ON, mode: "overall", ratio: 1, maxMult: 3 }, false);
    // 4 sources × 2 extra = 9× requested → total cap 3×, each extra shrinks to 0.5.
    assert.deepEqual(big.legs, { overall: 0.5, symbol: 0.5, direction: 0.5, indication: 0.5 });
    assert.equal(big.vol, 3);
    const legSum = Object.values(big.legs ?? {}).reduce((a, v) => a + (v ?? 0), 0);
    assert.ok(Math.abs(1 + legSum - big.vol) < 1e-6, "legs conserve the configured total cap");
    // Active: only sources at the min level or above raise; none → not adjusted
    const act = blockDecide(L, { ...ON, mode: "overall", minActiveLevel: 3 }, true);
    assert.deepEqual(act.legs, { overall: 0.6, indication: 0.8 });
    assert.deepEqual(act.src, ["overall", "indication"]);
    assert.equal(blockDecide(L, { ...ON, mode: "overall", minActiveLevel: 5 }, true).adjusted, false);
  });

  it("Active skips every entry below its min level (shared / additive / overall)", () => {
    for (const mode of ["shared", "additive", "overall"] as const) {
      const d = blockDecide({ ...L, overall: 1, symbol: 1, direction: 0, indication: 1 }, { ...ON, mode, minActiveLevel: 4 }, true);
      assert.equal(d.adjusted, false, mode);
      assert.equal(d.vol, 1, mode);
    }
    // additive judges the summed level: 3 sources at 1 + … reach 4 only together
    assert.equal(
      blockDecide({ ...L, overall: 2, symbol: 1, direction: 1, indication: 0 }, { ...ON, mode: "additive", minActiveLevel: 4 }, true).adjusted,
      true,
    );
  });

  it("every source shares the configured total cap, including fractional rounding and repeated decisions", () => {
    const levels = { config: 8, overall: 8, symbol: 8, direction: 8, indication: 8, type: 8 };
    const all = Object.fromEntries(Object.keys(levels).map((key) => [key, true]));
    for (const maxMult of [1, 1.0000001, 1.234567, 2, 2.5, 4, 8]) {
      const b = { ...ON, sources: all, mode: "overall" as const, maxMult, ratio: 1 };
      const decision = blockDecide(levels, b, false);
      assert.ok(decision.vol <= maxMult + 1e-12, `${decision.vol} > total cap ${maxMult}`);
      const sum = Object.values(decision.legs ?? {}).reduce((a, v) => a + (v ?? 0), 0);
      assert.ok(Math.abs(1 + sum - decision.vol) < 1e-12, "source orders conserve the base-plus-additions total");
      assert.deepEqual(blockDecide(levels, b, false), decision, "the target is recalculated from the base, never compounded");
    }
    for (const mode of ["shared", "additive", "overall"] as const)
      assert.deepEqual(blockDecide(levels, { ...ON, mode, maxMult: 1 }, true),
        { adjusted: false, level: 0, vol: 1, src: [] }, `${mode}: no raise fits at a unit cap`);
    for (const maxMult of [NaN, Infinity, -1]) assert.equal(blockStackCap({ maxMult }), 1);
  });

  it("the config level uses only the candidate's own symbol and direction, retaining its losses", () => {
    const cfg = "follow|sig-ema-cross-s@m5|tp1|sl1|tr0|h32";
    const row = (sym: string, side: 1 | -1, r: number, exitT: number): Trade => ({
      cfg, sym, side, r, entryT: exitT - 1, exitT, entry: 100, exit: 100 * (1 + side * r),
      reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0, kind: "normal",
    });
    const tp = makeTape(cfg, "follow", "sig-ema-cross-s@m5", { tp: .01, sl: .01, trail: 0, hold: 32 },
      "normal", ["A", "B"], [row("A", -1, -.01, H), row("A", 1, .1, 2 * H),
        row("B", -1, .1, 3 * H), row("B", 1, .1, 4 * H), row("A", -1, .1, 6 * H)], [], []);
    assert.equal(blockLevel(tp, 5 * H, ON, { sym: "A", side: -1 }), 0, "sibling wins cannot raise a losing short");
    assert.equal(blockLevel(tp, 5 * H, ON, { sym: "A", side: 1 }), 1);
    assert.equal(blockLevel(tp, 5 * H, ON, { sym: "B", side: -1 }), 1);
    assert.equal(blockLevel(tp, 5 * H, ON, { sym: "C", side: -1 }), 0, "unknown symbol has no level");
    assert.equal(blockLevel(tp, 7 * H, ON, { sym: "A", side: -1 }), 2, "only a settled own recovery advances this side");
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const o = { ...base, signalValidLastN: 0, lastN: 0, symGate: "off" as const,
      signalAccept: undefined, signalSideAccept: undefined, signalCluster: undefined,
      toggles: { ...base.toggles, normal: true, block: true, blockActive: false },
      block: { ...ON, signalsOwn: true } };
    const d = execDecision(tp, 5 * H, o, { sym: "A", side: -1 });
    assert.deepEqual(d, { ok: true, level: 0, vol: 1 }, "signalsOwn applies the same exact-side record in execution");
    const book = new BlockBook(2);
    book.add({ cfg, sym: "A", side: -1, kind: "osc", r: .1, bsrc: ["config"] });
    assert.deepEqual(execDecision(tp, 7 * H, o, { book, sym: "A", side: -1 }),
      { ok: true, level: 0, vol: 1 }, "signalsOwn still honors its own config pause without reading pooled levels");
    const long = execDecision(tp, 7 * H, o, { book, sym: "A", side: 1 });
    assert.ok(long.ok && long.vol > 1, "the short's pause cannot suppress the independent long");
    const traced = execDecision(tp, 7 * H, { ...o, blockTrace: true }, { book, sym: "A", side: -1 });
    assert.ok(traced.ok);
    assert.deepEqual(traced.blockLevels, { config: 2, overall: 0, symbol: 0, direction: 0, indication: 0, type: 0 });
    assert.deepEqual(traced.blockEffectiveLevels, { config: 0, overall: 0, symbol: 0, direction: 0, indication: 0, type: 0 });
    assert.deepEqual(traced.blockSampleCounts, { config: 2, overall: 0, symbol: 0, direction: 0, indication: 0, type: 0 });
  });

  it("Block trace is explicit opt-in and survives native WF sanitization, updates and saved settings", async () => {
    const { CoreRuntime, sanitizeWf } = await import("../server/runtime.server.ts");
    const { CoreDb } = await import("../server/db.server.ts");
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { symbols: 1 }, { market: "synthetic" });
    assert.equal(rt.wf.blockTrace, undefined);
    assert.equal(sanitizeWf({ blockTrace: true }).blockTrace, true);
    assert.equal(sanitizeWf({ blockTrace: "false" as never }).blockTrace, false, "a truthy string cannot enable trace");
    rt.updateSettings({}, { blockTrace: true });
    assert.equal(rt.wf.blockTrace, true);
    assert.equal(db.kvGet<{ blockTrace?: boolean }>("wf")?.blockTrace, true);
    rt.updateSettings({ block: { ratio: .2 } });
    assert.equal(rt.wf.blockTrace, true);
    rt.updateSettings({}, { blockTrace: false });
    assert.equal(rt.wf.blockTrace, false);
    assert.equal(rt.status.computes, 0, "the stopped fixture does not start strategy scoring");
    rt.stop();
    db.db.close();
  });

  it("a config pause affects only its own symbol and side, and siblings cannot consume it", () => {
    const book = new BlockBook(2);
    const own = { sym: "A", side: 1, kind: "rsi", cfg: "cfg" };
    book.add({ ...own, r: .01, bsrc: ["config"] });
    const key = sourceKey("config", own);
    assert.ok(book.paused(key));
    for (const other of [{ ...own, side: -1 }, { ...own, sym: "B" }, { ...own, cfg: "other" }]) {
      assert.equal(book.paused(sourceKey("config", other)), false);
      book.add({ ...other, r: .01 });
    }
    assert.ok(book.paused(key), "sibling closes have not consumed either own pause close");
    book.add({ ...own, r: -.01 });
    assert.ok(book.paused(key));
    book.add({ ...own, r: -.01 });
    assert.equal(book.paused(key), false);
  });

  it("volume steps never inflate the raw raise; full steps floor and smaller raises retain their fraction", () => {
    const b: BlockConfig = { ...ON, maxMult: 2.5, steps: 6 }; // step 0.25
    assert.equal(stepRaise(0.2, b, 1.5), 0.2);
    assert.equal(stepRaise(0.4, b, 1.5), 0.25);
    assert.equal(stepRaise(0.6, b, 1.5), 0.5);
    assert.equal(stepRaise(0.7, b, 1.5), 0.5);
    assert.equal(stepRaise(5, b, 1.5), 1.5, "capped");
    assert.equal(stepRaise(0.2, { ...b, steps: 0 }, 1.5), 0.2);
    const d = blockDecide({ ...L, indication: 3, overall: 0, symbol: 0, direction: 0 }, { ...b, mode: "shared" }, false);
    assert.equal(d.vol, 1.5, "0.2·3 = 0.6 → 2 steps of 0.25");
  });

  it("pause: a positive raised close pauses its sources for N closes, then the level is recalculated", () => {
    const book = new BlockBook(2);
    const e = (r: number, bsrc?: Array<"symbol" | "overall" | "config">) =>
      book.add({ sym: "A", side: 1, kind: "rsi", r, cfg: "c1", realAccepted: true, ...(bsrc ? { bsrc } : {}) });
    e(0.01);
    // the symbol source is per direction (long and short run independently): key "s:A|1"
    e(0.01, ["symbol", "config"]);
    assert.ok(book.paused("s:A|1"), "symbol paused");
    assert.ok(book.paused("c:c1|A|1"), "own config, symbol and side paused");
    assert.ok(!book.paused("all"), "overall did not raise it");
    e(0.01); // 1 of 2
    assert.ok(book.paused("s:A|1"));
    e(0.01); // 2 of 2 → recalculated
    assert.ok(!book.paused("s:A|1"));
    // a raised close that lost does not pause
    e(-0.01, ["overall"]);
    assert.ok(!book.paused("all"));
    // no pause configured: never paused
    const off = new BlockBook(0);
    off.add({ sym: "A", side: 1, kind: "rsi", r: 0.05, bsrc: ["symbol"] });
    assert.ok(!off.paused("s:A|1"));
    // a paused source counts as level 0 in the decision
    const d = blockDecide({ ...L, symbol: 5, overall: 0, direction: 0, indication: 0 }, { ...ON, mode: "shared" }, false, (s) => s === "symbol");
    assert.equal(d.adjusted, false);
  });

  it("execDecision end to end: overall type with Overall, Symbol, Direction and Indication sources", () => {
    const ind = INDICATIONS[0];
    const t = makeTape("x", "magnet", ind.id, { tp: 0.02, sl: 0.02, trail: 0, hold: 32 }, "normal", ["A"], [], [], []);
    const book = new BlockBook();
    // 3 positive closes on A long of this kind; 2 negative on B short of another kind
    for (let i = 0; i < 3; i++) book.add({ sym: "A", side: 1, kind: ind.kind, r: 0.01, realAccepted: true });
    for (let i = 0; i < 2; i++) book.add({ sym: "B", side: -1, kind: "zz", r: -0.01, realAccepted: true });
    const o = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      lastN: 0,
      symGate: undefined,
      toggles: { ...DEFAULT_TOGGLES, normal: true, block: true, blockActive: false },
      block: { ...ON, mode: "overall" as const },
    };
    const d = execDecision(t, 2 * H, o, { book, sym: "A", side: 1 });
    assert.ok(d.ok);
    // overall tail [+,+,+,−,−]: only n = 5 sums above 0 → level 1; symbol A, long side and this kind: level 3 each
    assert.deepEqual(d.ok && d.legs, { overall: 0.2, symbol: 0.6, direction: 0.6, indication: 0.6 });
    assert.ok(d.ok && Math.abs(d.vol - (1 + 0.2 + 0.6 + 0.6 + 0.6)) < 1e-9);
    assert.deepEqual(d.ok && d.src, ["overall", "symbol", "direction", "indication"]);
  });
});


describe("Block pooled window", () => {
  it("the book judges pooled sources on n × window closes and keeps that much tail", () => {
    const book = new BlockBook(0, 25);
    const add = (r: number) => book.add({ sym: "A-USDT", side: 1, kind: "rsi", r, realAccepted: true });
    // 200 closes: a loss of 1 % every 4th close, small wins in between (net slightly negative over long windows)
    for (let i = 0; i < 200; i++) add(i % 4 === 3 ? -0.01 : 0.003);
    assert.equal(book.level("all", 8), 0, "25-close windows see the losses");
    const short = new BlockBook(0, 1);
    for (let i = 0; i < 200; i++) short.add({ sym: "A-USDT", side: 1, kind: "rsi", r: i % 4 === 3 ? -0.01 : 0.003, realAccepted: true });
    assert.ok(short.level("all", 8) >= 0);
    // retention: a long run still has every close a level can read
    for (let i = 0; i < 2000; i++) add(0.002);
    assert.equal(book.level("all", 8), 8, "200 straight wins: every level");
  });
});

describe("AutoBlockBook (windowAuto)", () => {
  const cfg = {
    ...DEFAULT_BLOCK,
    sources: { config: false, overall: true, symbol: false, direction: false, indication: false, type: false },
    maxLevel: 8,
    minActiveLevel: 2,
    window: 50,
    windowAuto: true,
    windowCandidates: [1, 50],
  };
  const entry = (r: number) => ({ sym: "AAA-USDT", side: 1, kind: "trend", r, realAccepted: true });

  it("keeps the configured window until every candidate has 30 raised closes", () => {
    const b = new AutoBlockBook(cfg);
    for (let i = 0; i < 20; i++) b.add(entry(1));
    assert.equal(b.window, 50);
  });

  it("picks the window whose levels raised the better closes (runs of 10 winners, 10 losers)", () => {
    const b = new AutoBlockBook(cfg);
    for (let i = 0; i < 2000; i++) b.add(entry(Math.floor(i / 10) % 2 === 0 ? 0.01 : -0.01));
    assert.equal(b.window, 1);
    const sc = b.scores();
    const w1 = sc.find((x) => x.window === 1)!;
    const w50 = sc.find((x) => x.window === 50)!;
    assert.ok((w1.pf ?? 0) > (w50.pf ?? 0), `window 1 PF ${w1.pf} vs 50 PF ${w50.pf}`);
    // levels come from the chosen window's book: after a run of winners the window-1 level is the top level
    for (let i = 0; i < 10; i++) b.add(entry(0.01));
    assert.equal(b.level("all", 8), 8);
  });

  // events alternate +1.2 % / −1 %, each closing in two sibling configs of the same entry (2 and 8 min after it).
  // Window 1, level 1: at an event's entry the level is 1 exactly when the previous event won, i.e. before a losing
  // event — that window raises only losers (PF 0). Scored at the exit, an event's first sibling raised its second.
  const alt = {
    ...cfg,
    maxLevel: 1,
    minActiveLevel: 1,
    window: 1,
    windowCandidates: [1],
  };
  it("an unknown raised unit return stays in the auto-window sample and cannot become a no-loss score", () => {
    const b = new AutoBlockBook(alt);
    for (let i = 0; i < 30; i++) b.add({ ...entry(.01), autoRaise: 1 });
    assert.equal(b.scores()[0].n, 30);
    assert.ok((b.scores()[0].pf ?? 0) > 1);
    b.add({ ...entry(NaN), autoRaise: 1 });
    assert.deepEqual(b.scores(), [{ window: 1, n: 31, pf: null }], "unknown chronology is retained and blocks PF selection");
  });
  it("overflow in known auto-window returns remains an unavailable score, not an infinite winning PF", () => {
    const b = new AutoBlockBook(alt);
    for (let i = 0; i < 30; i++) b.add({ ...entry(Number.MAX_VALUE), autoRaise: 1 });
    assert.deepEqual(b.scores(), [{ window: 1, n: 30, pf: null }]);
  });
  it("scores each window on its level at the candidate's entry, not at its exit", () => {
    const b = new AutoBlockBook(alt);
    for (let k = 0; k < 100; k++) {
      const sibs = [0, 1].map(() => entry(k % 2 ? -0.01 : 0.012));
      for (const s of sibs) b.stampEntry(s); // both enter after event k − 1 closed
      for (const s of sibs) b.add(s);
    }
    // events 1, 3, …, 99 raised: 50 losers × 2 closes
    assert.deepEqual(b.scores(), [{ window: 1, n: 100, pf: 0 }]);
  });

  it("a run's feed carries the stamps: its replay scores the windows at the entries", () => {
    const T0 = Date.UTC(2026, 8, 1);
    const NOW = T0 + 400 * H;
    const IND = "rsi-mom-14-20@m15";
    const tape = (tp: number, holdMin: number) => {
      const id = `follow|${IND}|tp${tp}|sl1|tr0|h32`;
      const xs: Trade[] = [];
      for (let k = 0, e = NOW - 48 * H; e < NOW - H; k++, e += 10 * 60_000) {
        const r = k % 2 ? -0.01 : 0.012;
        xs.push({
          ...{ cfg: id, sym: "AAA-USDT", side: 1, entryT: e, exitT: e + holdMin * 60_000, entry: 100 },
          ...{ exit: 100 * (1 + r), r, reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0, kind: "normal" },
        } as Trade);
      }
      const p = { tp: tp / 100, sl: 0.01, trail: 0, hold: 32 };
      return makeTape(id, "follow", IND, p, "normal", ["AAA-USDT"], xs, [], []);
    };
    const sim = walkForward(
      { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never,
      [tape(1, 2), tape(1.2, 8)],
      {
        ...defaultWalkForward(DEFAULT_SETTINGS),
        toggles: { ...DEFAULT_TOGGLES, block: true, blockActive: false },
        block: alt,
        symGate: undefined,
        coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
        simH: 12,
        validLastN: 0,
        lastN: 0,
        robustFrac: 0,
        seatPer: "config",
      },
    );
    const replay = new AutoBlockBook(alt);
    for (const f of sim.feed) feedBooks(f, replay);
    const [sc] = replay.scores();
    assert.ok(sc.n >= 30, `${sc.n} raised closes`);
    assert.equal(sc.pf, 0, "only losers follow a winning event");
  });

  it("blockBookOf: fixed window unless windowAuto", () => {
    assert.ok(!(blockBookOf({ ...cfg, windowAuto: false }) instanceof AutoBlockBook));
    assert.ok(blockBookOf(cfg) instanceof AutoBlockBook);
    assert.equal(blockBookOf({ ...cfg, windowAuto: false }).window, 50);
  });

  it("tailSum reads the same feed as the fixed book", () => {
    const a = new AutoBlockBook(cfg);
    const f = new BlockBook();
    for (let i = 0; i < 300; i++) {
      const e = { sym: "A", side: i % 3 ? 1 : -1, kind: "rsi", r: i % 5 ? 0.01 : -0.03 };
      a.add(e);
      f.add(e);
    }
    assert.deepEqual(a.tailSum("d:1", 10), f.tailSum("d:1", 10));
    assert.deepEqual(f.tailSum("d:9", 10), { n: 0, sum: 0 });
  });
});

describe("Direction gate (sideGateN)", () => {
  const ind = INDICATIONS[0];
  const t = makeTape("x", "magnet", ind.id, { tp: 0.02, sl: 0.02, trail: 0, hold: 32 }, "normal", ["A"], [], [], []);
  const o = {
    ...defaultWalkForward(DEFAULT_SETTINGS),
    lastN: 0,
    symGate: undefined,
    toggles: { ...DEFAULT_TOGGLES, normal: true, block: false },
  };
  const fill = (book: BlockBook, side: number, rs: number[]) => {
    for (const r of rs) book.add({ sym: "B", side, kind: "zz", r });
  };

  it("a side whose last N candidates sum negative opens nothing; the other side still opens", () => {
    const book = new BlockBook();
    fill(book, -1, Array(10).fill(-0.01));
    fill(book, 1, Array(10).fill(0.01));
    const g = { ...o, sideGateN: 10 };
    assert.deepEqual(execDecision(t, 2 * H, g, { book, sym: "A", side: -1 }), { ok: false, why: "sideGate" });
    assert.equal(execDecision(t, 2 * H, g, { book, sym: "A", side: 1 }).ok, true);
    // off: both sides open
    assert.equal(execDecision(t, 2 * H, o, { book, sym: "A", side: -1 }).ok, true);
  });

  it("opens while the side has fewer than N candidates, and again once they recover", () => {
    const book = new BlockBook();
    fill(book, -1, Array(9).fill(-0.01));
    const g = { ...o, sideGateN: 10 };
    assert.equal(execDecision(t, 2 * H, g, { book, sym: "A", side: -1 }).ok, true, "9 of 10: not judged yet");
    fill(book, -1, [-0.01]);
    assert.equal(execDecision(t, 2 * H, g, { book, sym: "A", side: -1 }).ok, false);
    fill(book, -1, Array(6).fill(0.02));
    assert.equal(execDecision(t, 2 * H, g, { book, sym: "A", side: -1 }).ok, true, "6 × +2 % outweigh 4 × −1 %");
  });

  it("works with Block on and without a book (no feed: no gate)", () => {
    const book = new BlockBook();
    fill(book, 1, Array(10).fill(-0.01));
    const g = { ...o, sideGateN: 10, toggles: { ...o.toggles, block: true, blockActive: false } };
    assert.deepEqual(execDecision(t, 2 * H, g, { book, sym: "A", side: 1 }), { ok: false, why: "sideGate" });
    assert.equal(execDecision(t, 2 * H, g, { book: null, sym: "A", side: 1 }).ok, true);
  });
});

describe("Signal direction acceptance (signalSideAccept)", () => {
  const sig = makeTape("s", "follow", "sig-ema-trend-s", { tp: 0.02, sl: 0.02, trail: 0, hold: 32 }, "normal", ["A"], [], [], []);
  const o = {
    ...defaultWalkForward(DEFAULT_SETTINGS),
    lastN: 0,
    validLastN: 0,
    signalValidLastN: 0,
    signalGuardN: 0,
    signalCluster: undefined,
    signalAccept: undefined,
    symGate: undefined,
    toggles: { ...DEFAULT_TOGGLES, normal: true, block: false },
  };
  const acc = { enabled: true, minPf: 1.05, hours: 24, minTrades: 10 };
  const feedSig = (guard: SignalGuard, side: number, rs: number[], t = H) => {
    for (const r of rs)
      feedBooks({ sym: "B", side, kind: "zz", r, ind: "sig-ema-trend-s", cfg: "x", exitT: t }, null, guard);
  };

  it("a side whose pooled signal record is below the PF opens no signal; the other side still opens", () => {
    const guard = new SignalGuard();
    feedSig(guard, -1, [...Array(8).fill(-0.01), 0.01, 0.01]);
    feedSig(guard, 1, [...Array(8).fill(0.01), -0.01, -0.01]);
    const g = { ...o, signalSideAccept: acc };
    assert.deepEqual(execDecision(sig, 2 * H, g, { guard, sym: "A", side: -1 }), { ok: false, why: "signalSide" });
    assert.equal(execDecision(sig, 2 * H, g, { guard, sym: "A", side: 1 }).ok, true);
    // off: both sides open
    assert.equal(execDecision(sig, 2 * H, o, { guard, sym: "A", side: -1 }).ok, true);
  });

  it("too few closes: judged on twice the hours, still too few = valid; old closes leave both windows", () => {
    const guard = new SignalGuard();
    // nine losing closes, under the 10-close minimum in 24 h and in 48 h: no sample to judge yet — valid
    feedSig(guard, 1, Array(9).fill(-0.01));
    const g = { ...o, signalSideAccept: acc };
    assert.equal(execDecision(sig, 2 * H, g, { guard, sym: "A", side: 1 }).ok, true, "9 of 10: valid until there is a sample");
    // the tenth: 24 h has its sample, and it loses
    feedSig(guard, 1, [-0.01]);
    assert.deepEqual(execDecision(sig, 2 * H, g, { guard, sym: "A", side: 1 }), { ok: false, why: "signalSide" });
    // 26 h on: the 24 h window is empty, so twice the hours decide — they still hold the ten losers
    assert.equal(execDecision(sig, 26 * H, g, { guard, sym: "A", side: 1 }).ok, false, "48 h still sees the losers");
    // past 48 h both windows are empty: nothing to judge — valid again
    assert.equal(execDecision(sig, 50 * H, g, { guard, sym: "A", side: 1 }).ok, true, "all closes older than 48 h");
  });

  it("the direction groups pool the run's fed candidates, never the tape record (acceptance index)", () => {
    const t0 = 10 * H;
    const tr = (side: 1 | -1, r: number, i: number) =>
      ({ cfg: "s", sym: "A", side, entryT: t0 + i * 60_000, exitT: t0 + i * 60_000 + 1, entry: 1, exit: 1 + r, r, reason: "tp", bars: 1, mfe: 0, mae: 0, kind: "normal" }) as Trade;
    const tape = makeTape("s2", "follow", "sig-ema-trend-s", { tp: 0.02, sl: 0.02, trail: 0, hold: 32 }, "normal", ["A"], [
      ...Array.from({ length: 12 }, (_, i) => tr(1, 0.01, i)),
      ...Array.from({ length: 12 }, (_, i) => tr(-1, -0.01, 20 + i)),
    ], [], []);
    const guard = new SignalGuard();
    guard.acceptIndex = new SignalAcceptIndex([tape]);
    const g = { ...o, signalSideAccept: acc };
    // the tape's losing shorts (every tape, active or not) are not the direction's record: nothing fed, nothing judged
    assert.equal(execDecision(sig, t0 + 2 * H, g, { guard, sym: "Z", side: -1 }).ok, true);
    assert.equal(guard.acceptStats("side|-1", t0 + 2 * H, 24).n, 0);
    // the run's own candidates, fed as they close, are (with the tape record set as well)
    for (let i = 0; i < 12; i++)
      feedBooks(
        { sym: "B", side: -1, kind: "zz", r: -0.01, ind: "sig-ema-trend-s", cfg: "x", exitT: t0 + H + i, entryT: t0 + i },
        null,
        guard,
      );
    assert.equal(execDecision(sig, t0 + 2 * H, g, { guard, sym: "Z", side: 1 }).ok, true);
    assert.deepEqual(execDecision(sig, t0 + 2 * H, g, { guard, sym: "Z", side: -1 }), { ok: false, why: "signalSide" });
  });
});
