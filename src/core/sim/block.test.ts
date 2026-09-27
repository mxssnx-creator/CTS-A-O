import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BlockBook, bookLevels, combineLevels, levelOfTail, sourcesOf } from "./block.ts";
import {
  blockEntryOf,
  defaultWalkForward,
  execDecision,
  kindOfInd,
  makeTape,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "../config.ts";
import { INDICATIONS } from "../indications/registry.ts";
import type { BlockConfig, Trade } from "../domain/types.ts";

const H = 3_600_000;
const B: BlockConfig = { ratio: 0.2, maxLevel: 3, minActiveLevel: 1, maxMult: 3 };

describe("Block sources", () => {
  it("level = count of positive last-n sums", () => {
    assert.equal(levelOfTail([], 3), 0);
    assert.equal(levelOfTail([0.01, 0.01, -0.03], 3), 0);
    assert.equal(levelOfTail([-0.03, 0.01, 0.01], 3), 2);
    assert.equal(levelOfTail([0.02, -0.01, 0.01], 3), 2); // n=2 sums to 0 (not > 0)
    assert.equal(levelOfTail([0.02, -0.01, 0.01], 1), 1);
  });

  it("keeps symbol, direction and indication independent", () => {
    const b = new BlockBook();
    b.add({ sym: "A", side: 1, kind: "rsi", r: 0.01, type: "trailing" });
    b.add({ sym: "A", side: 1, kind: "rsi", r: 0.01, type: "trailing" });
    b.add({ sym: "B", side: -1, kind: "macd", r: -0.05 });
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
    for (let i = 0; i < 1000; i++) b.add({ sym: "A", side: 1, kind: "rsi", r: -0.01 });
    b.add({ sym: "A", side: 1, kind: "rsi", r: 0.05 });
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
    for (let i = 0; i < 3; i++) book.add({ sym: "A", side: 1, kind: ind.kind, r: 0.01 });
    const base = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      lastN: 0,
      toggles: { ...DEFAULT_TOGGLES, normal: true, block: true, blockActive: true },
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
    });
    assert.equal(blockEntryOf({ ...x, mult: undefined }).r, -0.03);
  });
});
