import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { RangeTag, Trade } from "../domain/types.ts";
import {
  configEval,
  defaultWalkForward,
  execDecision,
  makeTape,
  selectDurable,
  selectFixed,
  signalHistoryHours,
  engineContextValid,
  tapeRetentionHours,
} from "./walkforward.ts";

const H = 3_600_000;
const T = Date.UTC(2026, 9, 12);
const ind = "rsi-mom-14-20@m15";
function fixture(tag?: RangeTag) {
  const cfg = `follow|${ind}|tp1|sl1|tr0|h1${tag ? `|${tag}` : ""}`;
  const trades: Trade[] = Array.from({ length: 50 }, (_, i) => ({
    cfg,
    sym: "A",
    side: 1,
    entryT: T + i * 60_000,
    exitT: T + (i + 1) * 60_000,
    entry: 100,
    exit: i < 30 ? 101 : 99,
    r: i < 30 ? 0.01 : -0.01,
    reason: i < 30 ? "tp" : "sl",
    bars: 1,
    mfe: 0,
    mae: 0,
  }));
  const tp = makeTape(
    cfg,
    "follow",
    ind,
    { tp: 0.01, sl: 0.01, trail: 0, hold: 1, ...(tag ? { tag } : {}) },
    "normal",
    ["A"],
    trades,
    [],
    [],
  );
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  const o = {
    ...d,
    preH: 6,
    longH: 24,
    lastN: 0,
    validLastN: 15,
    preGate: false,
    basePassed: new Set([`follow|${ind}`]),
    basePassedRanges: { [`follow|${ind}`]: [tag ?? ""] },
    gates: {
      ...d.gates,
      minPf: 1.1,
      minTrades: 3,
      rangeMinPf: undefined,
      minGreen: 0,
      maxDdr: 0,
      maxDdtH: 1000,
      stableBlocks: 0,
      lossPrior: false,
      lastNFloor: 0,
    },
    rangeGate: undefined,
    symGate: "off" as const,
    coord: { ...d.coord!, enabled: false },
    toggles: { ...d.toggles, normal: true, block: false, blockActive: false },
  };
  return { tp, o, trades };
}

describe("continuous post-Base qualification", () => {
  for (const tag of [undefined, "mc", "mn", "mp", "sh", "gn", "lg"] as const)
    it(`${tag ?? "wide"}: profitable symbols and longs cannot validate a losing short context`, () => {
      const { tp, o } = fixture(tag);
      const rows: Trade[] = Array.from({ length: 80 }, (_, i) => {
        const sym = i % 4 < 2 ? "A" : "B";
        const side = i % 2 === 0 ? 1 : -1;
        const r = sym === "A" && side === -1 ? -0.01 : 0.05;
        return {
          cfg: tp.id,
          sym,
          side,
          entryT: T - (81 - i) * 60_000,
          exitT: T - (80 - i) * 60_000,
          entry: 100,
          exit: 100 * (1 + side * r),
          r,
          reason: "time",
          bars: 1,
          mfe: 0,
          mae: 0,
        };
      });
      // A real multi-timeframe universe repeats each symbol; tape trades use the last matching symbol slot.
      const own = makeTape(
        tp.id,
        tp.bot,
        tp.ind,
        tp.protect,
        tp.kind,
        ["A", "B", "A", "B"],
        rows,
        [],
        [],
      );
      const options = {
        ...o,
        rangeGate: tag ? { lastN: 15, minPf: 1.1, ranges: [tag] } : undefined,
      };
      assert.equal(
        configEval(own, T, options).ok,
        true,
        "the container has independently passing contexts",
      );
      assert.equal(engineContextValid(own, T, options, "A", 1), true);
      assert.equal(engineContextValid(own, T, options, "B", -1), true);
      assert.equal(engineContextValid(own, T, options, "A", -1), false);
      assert.equal(execDecision(own, T, options, { sym: "A", side: -1 }).ok, false);
      assert.equal(execDecision(own, T, options, { sym: "A", side: 1 }).ok, true);
      assert.equal(execDecision(own, T, options, { sym: "B", side: -1 }).ok, true);
      assert.equal(
        own.n,
        80,
        "rejected context losses remain available to independent candidate learning",
      );
    });
  for (const tag of [undefined, "mc", "mn", "mp", "sh", "gn", "lg"] as const) {
    it(`${tag ?? "wide"}: a qualified seat cannot open after its own recent results fail inside the same hour`, () => {
      const { tp, o } = fixture(tag);
      const before = T + 30 * 60_000 + 1;
      const after = T + 45 * 60_000 + 1;
      assert.equal(configEval(tp, before, o).ok, true);
      assert.deepEqual(
        selectFixed([tp], before, o).picks.map((p) => p.id),
        [tp.id],
      );
      assert.equal(execDecision(tp, before, o, { sym: "A", side: 1 }).ok, true);
      assert.equal(configEval(tp, after, o).ok, false);
      assert.equal(execDecision(tp, after, o, { sym: "A", side: 1 }).ok, false);
      assert.deepEqual(selectDurable([tp], after, o, new Set([tp.id])).picks, []);
      assert.equal(tp.n, 50, "rejection preserves every losing candidate and held-exit history");
    });
  }

  it("Signal history stays independent of the shortened engine window", () => {
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(defaults.longH, 24);
    assert.equal(signalHistoryHours(defaults), 336);
    assert.equal(signalHistoryHours({ preH: 6, signalLongH: 480 }), 480);
    assert.equal(signalHistoryHours({ preH: 6 }), 336);
  });

  it("Last-N retains lane history even when broad evaluation is 24h and Signals are disabled", () => {
    const s = {
      ...DEFAULT_SETTINGS,
      signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
      tfDays: { "1": 3, "15": 18 },
    };
    const o = defaultWalkForward(s);
    assert.equal(o.longH, 24);
    assert.equal(tapeRetentionHours(s, o, 1), 72);
    assert.equal(tapeRetentionHours(s, o, 15), 432);
    assert.equal(
      tapeRetentionHours(s, { ...o, validLastN: 0, lastN: 0, rangeGate: undefined }, 15),
      24,
    );
  });

  it("Signal Last-N finds the same exact history through repeated multi-timeframe symbol slots", () => {
    const { tp, o, trades } = fixture();
    const ind = "sig-ema-cross-s@m5",
      id = tp.id.replace(tp.ind, ind);
    const signal = makeTape(
      id,
      "follow",
      ind,
      tp.protect,
      tp.kind,
      ["A", "A", "A"],
      trades.map((t) => ({ ...t, cfg: id })),
      [],
      [],
    );
    const options = { ...o, signalValidLastN: 15 };
    assert.equal(
      execDecision(signal, T + 30 * 60_000 + 1, options, { sym: "A", side: 1 }).ok,
      true,
    );
    assert.equal(
      execDecision(signal, T + 45 * 60_000 + 1, options, { sym: "A", side: 1 }).ok,
      false,
    );
  });

  it("Signal config evaluation and fixed selection actually retain source closes older than 24 hours", () => {
    const { tp, o, trades } = fixture();
    const ind = "sig-ema-cross-s@m5";
    const id = tp.id.replace(tp.ind, ind);
    const rows = trades.map((trade, i) => ({
      ...trade,
      cfg: id,
      entryT: T - (100 - i) * H - 60_000,
      exitT: T - (100 - i) * H,
      r: 0.01,
      reason: "tp" as const,
    }));
    const signal = makeTape(id, "follow", ind, tp.protect, tp.kind, ["A"], rows, [], []);
    const options = {
      ...o,
      basePassed: undefined,
      basePassedRanges: undefined,
      signalValidLastN: 0,
      signalOwnBase: false,
      signalLongH: 336,
    };
    assert.equal(configEval(signal, T, options).n, 50);
    assert.equal(configEval(signal, T, options).ok, true);
    assert.deepEqual(
      selectFixed([signal], T, options).picks.map((p) => p.id),
      [id],
    );
    assert.equal(configEval(signal, T, { ...options, signalLongH: 24 }).ok, false);
    assert.deepEqual(selectFixed([signal], T, { ...options, signalLongH: 24 }).picks, []);
  });
});
