// Timeframe lanes: 1m base data, 5m / 15m / 30m derived, each independent and combined with the higher ones.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  higherFactors,
  indicationState,
  laneInd,
  laneLabel,
  laneOf,
  TF_LADDER,
} from "./indications/registry.ts";
import {
  allCombos,
  laneClosesWith,
  laneProtect,
  mainByLane,
  makeUniverse,
  runCombo,
  seriesOf,
  REF_TF,
} from "./pipeline/pipeline.ts";
import { barsFromCandles, resample, syntheticCandles } from "./market/bars.ts";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "./config.ts";
import { defaultWalkForward, kindOfInd, makeTape, selectDurable } from "./sim/walkforward.ts";
import type { Trade } from "./domain/types.ts";
import { normalizeLanes } from "./server/runtime.server.ts";
import { checkSettings } from "./settings-check.ts";

const M = 60_000;
const END = Date.UTC(2026, 0, 10);
const base = (sym: string, n = 6000) => syntheticCandles(sym, 1, n, END);
const lanesOf = (sym: string, tfs = [1, 5, 15, 30]) => {
  const cs = base(sym);
  return tfs.map((tf) => barsFromCandles(sym, tf, tf === 1 ? cs : resample(cs, 1, tf)));
};

describe("lane encoding", () => {
  it("round-trips lane ids; plain ids have no lane", () => {
    assert.deepEqual(laneOf("rsi-14@m5"), { base: "rsi-14", tf: 5, combined: false });
    assert.deepEqual(laneOf("bb-walk@x4@m15c"), { base: "bb-walk@x4", tf: 15, combined: true });
    assert.deepEqual(laneOf("bb-walk@x4"), { base: "bb-walk@x4", tf: null, combined: false });
    assert.equal(laneInd("ema-50", 30), "ema-50@m30");
    assert.equal(laneInd("ema-50", 1, true), "ema-50@m1c");
    assert.equal(laneLabel("ema-50@m5c"), "5m+");
    assert.deepEqual(TF_LADDER, [1, 5, 15, 30]);
  });
  it("combined lanes agree with every higher ladder timeframe", () => {
    assert.deepEqual(higherFactors(1), [5, 15, 30]);
    assert.deepEqual(higherFactors(5), [3, 6]);
    assert.deepEqual(higherFactors(15), [2]);
    assert.deepEqual(higherFactors(30), []);
  });
  it("the indication type of a lane is its base's", () => {
    const plain = allCombos()[20].ind;
    assert.equal(kindOfInd(`${plain}@m5c`), kindOfInd(plain));
  });
});

describe("lane combos", () => {
  it("every combo in every lane: 4 independent + 3 combined (none: 4 independent)", () => {
    const plain = allCombos();
    const lanes = allCombos(undefined, undefined, [1, 5, 15, 30]);
    const none = plain.filter((c) => c.ind === "none").length;
    assert.equal(lanes.length, (plain.length - none) * 7 + none * 4);
    // a focus pair selects that combo in every lane; a lane pair only that lane
    const f = `${plain[20].bot}|${plain[20].ind}`;
    assert.equal(allCombos([f], undefined, [1, 5, 15, 30]).length, 7);
    assert.equal(
      allCombos([`${plain[20].bot}|${plain[20].ind}@m15`], undefined, [1, 5, 15, 30]).length,
      1,
    );
  });
  it("a lane runs only on its timeframe's series; a plain id on every series", () => {
    const u = makeUniverse([...lanesOf("A"), ...lanesOf("B")]);
    assert.equal(u.baseTf, 1);
    assert.deepEqual(
      seriesOf(u, "rsi-14@m15").map((s) => u.bars[s].tfMin),
      [15, 15],
    );
    assert.equal(seriesOf(u, "rsi-14").length, 8);
    const ind = allCombos().find((c) => c.bot === "follow")!.ind;
    const r = runCombo(u, "follow", `${ind}@m15`, DEFAULT_PROTECT, 0.002, 1, null)!;
    assert.ok(r.trades.length > 0);
    // every 15m-lane trade enters on a 15m bar open
    assert.ok(r.trades.every((t) => t.entryT % (15 * M) === 0));
    assert.ok(r.id.includes("@m15|"));
  });
  it("a combined signal is a subset of the independent one (same sign)", () => {
    const u = makeUniverse(lanesOf("A"));
    const s = seriesOf(u, "x@m5")[0];
    const ind = allCombos().find((c) => c.bot === "follow" && c.ind !== "none")!.ind;
    const a = indicationState(`${ind}@m5`, u.caches[s])!;
    const c = indicationState(`${ind}@m5c`, u.caches[s])!;
    let kept = 0;
    for (let i = 0; i < a.length; i++) {
      if (c[i] !== 0) {
        assert.equal(c[i], a[i]);
        kept++;
      }
    }
    assert.ok(kept <= a.filter((x) => x !== 0).length);
  });
});

describe("lane protect", () => {
  it("scales TP / SL / trail by √(tf / 15m) and keeps the hold time", () => {
    const p = { tp: 0.03, sl: 0.045, trail: 0.015, hold: 32 };
    assert.deepEqual(laneProtect(p, "x@m15"), p);
    assert.deepEqual(laneProtect(p, "x"), p);
    const one = laneProtect(p, "x@m1");
    assert.ok(Math.abs(one.tp - 0.03 * Math.sqrt(1 / REF_TF)) < 1e-4);
    assert.equal(one.hold, 32 * 15);
    const thirty = laneProtect(p, "x@m30c");
    assert.ok(Math.abs(thirty.sl - 0.045 * Math.sqrt(2)) < 1e-4);
    assert.equal(thirty.hold, 16);
    assert.equal(laneProtect({ ...p, trail: 0 }, "x@m5").trail, 0);
  });
});

describe("live freshness per lane", () => {
  it("a lane's entry is offered only in the base bar that closes the lane bar", () => {
    const t0 = Date.UTC(2026, 0, 10, 12, 0);
    assert.ok(laneClosesWith(t0 + 14 * M, 1, 15)); // 12:14 bar closes the 12:00 quarter
    assert.ok(!laneClosesWith(t0 + 13 * M, 1, 15));
    assert.ok(!laneClosesWith(t0 + 15 * M, 1, 15));
    assert.ok(laneClosesWith(t0 + 4 * M, 1, 5));
    assert.ok(laneClosesWith(t0 + 7 * M, 1, 1));
    assert.ok(laneClosesWith(t0 + 29 * M, 1, 30));
  });
});

describe("lane settings", () => {
  it("1m is always the base; lanes are sorted and valid; base history covers the longest lane", () => {
    const s = normalizeLanes({
      ...DEFAULT_SETTINGS,
      tfMin: 60,
      tfs: [30, 5],
      tfDays: { "1": 2, "5": 4, "15": 18, "30": 10 },
    });
    assert.equal(s.tfMin, 1);
    assert.deepEqual(s.tfs, [1, 5, 30]);
    assert.equal(s.historyDays, 10);
    assert.deepEqual(normalizeLanes(DEFAULT_SETTINGS).tfs, [1, 5, 15, 30]);
  });
  it("validation", () => {
    assert.doesNotThrow(() => checkSettings({ tfs: [1, 5, 15, 30], tfDays: { "1": 3 } }));
    assert.throws(() => checkSettings({ tfs: [5, 15] }), /1m is the base/);
    assert.throws(() => checkSettings({ tfs: [1, 60] }), /timeframes/);
    assert.throws(() => checkSettings({ tfDays: { "7": 3 } }), /unknown timeframe/);
    assert.throws(() => checkSettings({ tfDays: { "1": 0 } }), /lane history/);
  });
});

describe("Main share per lane", () => {
  it("every lane gets its seats; unused seats go to the best remaining passers", () => {
    const passed = [
      ...Array.from({ length: 30 }, (_, i) => ({ bot: "a", ind: `x${i}@m30`, score: 100 - i })),
      ...Array.from({ length: 30 }, (_, i) => ({ bot: "a", ind: `y${i}@m1`, score: 10 - i })),
      { bot: "a", ind: "z@m5c", score: 1 },
    ];
    const m = mainByLane(passed, 12);
    assert.equal(m.size, 12);
    // 3 lanes → 4 seats each; the 5m+ lane has only one passer, its 3 spare seats go to the best (30m)
    assert.equal([...m].filter((k) => k.endsWith("@m1")).length, 4);
    assert.ok(m.has("a|z@m5c"));
    assert.equal([...m].filter((k) => k.endsWith("@m30")).length, 7);
    assert.equal(mainByLane([], 12).size, 0);
  });
});

describe("short-history lanes are judged on the history they have", () => {
  it("a 3-day 1m lane passes durable selection when its tape knows where its data begins", () => {
    const H = 3_600_000;
    const now = 336 * H;
    const trades: Trade[] = [];
    for (let h = 264; h < 336; h += 2)
      trades.push({
        cfg: "x",
        sym: "A",
        side: 1,
        entryT: h * H,
        exitT: (h + 1) * H,
        entry: 1,
        exit: 1,
        r: h % 6 === 0 ? -0.004 : 0.006,
        reason: "tp",
        bars: 60,
        mfe: 0,
        mae: 0,
      });
    const tape = makeTape(
      "x",
      "follow",
      "rsi-14@m1",
      { tp: 0.01, sl: 0.01, trail: 0, hold: 480 },
      "normal",
      ["A"],
      trades,
      [],
      [],
    );
    const o = { ...defaultWalkForward(DEFAULT_SETTINGS), preGate: false };
    // without the history start: three of four sub-windows of the 14-day window are empty → rejected
    assert.equal(selectDurable([tape], now, o, new Set()).picks.length, 0);
    tape.fromT = 264 * H;
    assert.equal(selectDurable([tape], now, o, new Set()).picks.length, 1);
  });
});

describe("Real seats per lane", () => {
  it("a weaker fast lane still gets its share of the portfolio", () => {
    const H = 3_600_000;
    const now = 336 * H;
    const mk = (ind: string, r: number, from: number, every: number) => {
      const ts: Trade[] = [];
      for (let h = from; h < 336; h += every)
        ts.push({
          cfg: ind,
          sym: "A",
          side: 1,
          entryT: h * H,
          exitT: (h + 1) * H,
          entry: 1,
          exit: 1,
          r: h % 5 === 0 ? -r / 2 : r,
          reason: "tp",
          bars: 4,
          mfe: 0,
          mae: 0,
        });
      const t = makeTape(
        `follow|${ind}|x`,
        "follow",
        ind,
        { tp: 0.01, sl: 0.01, trail: 0, hold: 32 },
        "normal",
        ["A"],
        ts,
        [],
        [],
      );
      t.fromT = from * H;
      return t;
    };
    const strong = [mk("a@m30", 0.02, 0, 4), mk("b@m30", 0.02, 0, 5), mk("c@m30", 0.02, 0, 6)];
    const fast = mk("d@m1", 0.004, 264, 1);
    const o = { ...defaultWalkForward(DEFAULT_SETTINGS), preGate: false, portfolio: 2 };
    const picks = selectDurable([...strong, fast], now, o, new Set()).picks.map((p) => p.id);
    assert.equal(picks.length, 2);
    assert.ok(picks.includes(fast.id), `the 1m lane got a seat: ${picks}`);
  });
});
