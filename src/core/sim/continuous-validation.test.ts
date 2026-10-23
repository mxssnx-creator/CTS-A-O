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
  selectAt,
  signalHistoryHours,
  engineContextValid,
  configContextEval,
  tapeRetentionHours,
  walkForward,
  engineValidationLastNOk,
  configDirectionEval,
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
  for (const tag of [undefined, "mc", "mn", "mp", "sh", "gn", "lg"] as const) {
    it(`${tag ?? "wide"}: each direction retains its own full sample and confidence, and rejected directions cannot dilute it`, () => {
      const { tp, o, trades } = fixture(tag);
      const longs = Array.from({ length: 30 }, (_, i) => ({
        ...trades[0],
        entryT: T - (112 - i) * 60_000,
        exitT: T - (111 - i) * 60_000,
        r: 0.05,
      }));
      const shorts = Array.from({ length: 20 }, (_, i) => ({
        ...trades[0],
        side: -1 as const,
        entryT: T - (32 - i) * 60_000,
        exitT: T - (31 - i) * 60_000,
        r: i < 9 ? -0.01 : 0.012,
      }));
      const own = makeTape(
        tp.id,
        tp.bot,
        tp.ind,
        tp.protect,
        tp.kind,
        ["A"],
        [...longs, ...shorts],
        [],
        [],
      );
      const options = {
        ...o,
        gates: { ...o.gates, minTrades: 12, lastNFloor: 5 },
        rangeGate: tag ? { lastN: 75, minPf: 1.35, ranges: [tag] } : undefined,
      };
      assert.equal(
        engineValidationLastNOk(own, T, options, -1),
        true,
        "short PF/Last-N alone passes",
      );
      const short = configDirectionEval(own, T, options, -1);
      assert.equal(
        short.ok ? "ok" : short.fail,
        "lcb",
        "short confidence cannot borrow the winning long sample",
      );
      const ev = configEval(own, T, options);
      assert.equal(ev.ok, true);
      assert.equal(ev.n, 30);
      assert.equal(ev.pf, 4, "primary validation contains only independently passing directions");
      assert.equal(execDecision(own, T, options, { sym: "A", side: -1 }).ok, false);
      const losingShorts = shorts.flatMap((tr) =>
        Array.from({ length: 4 }, () => ({ ...tr, r: -0.1 })),
      );
      const losingPool = makeTape(
        tp.id,
        tp.bot,
        tp.ind,
        tp.protect,
        tp.kind,
        ["A"],
        [...longs, ...losingShorts],
        [],
        [],
      );
      assert.equal(configEval(losingPool, T, options).ok, true);
      assert.equal(configEval(losingPool, T, options).n, 30);
      assert.equal(losingPool.n, 110, "all rejected losses remain in candidate learning");
    });
    it(`${tag ?? "wide"}: winning longs never qualify an unseen or losing short when execution Last-N is off`, () => {
      const { tp, o, trades } = fixture(tag);
      const rows = trades
        .slice(0, 18)
        .map((tr) => ({ ...tr, entryT: tr.entryT - H, exitT: tr.exitT - H }));
      const own = makeTape(tp.id, tp.bot, tp.ind, tp.protect, tp.kind, ["A", "A"], rows, [], []);
      const options = {
        ...o,
        lastN: 0,
        symGate: "provenSide" as const,
        gates: { ...o.gates, minTrades: 12, lastNFloor: 5 },
        rangeGate: tag ? { lastN: 75, minPf: 1.35, ranges: [tag] } : undefined,
      };
      assert.equal(configEval(own, T, options).ok, true);
      assert.equal(
        engineContextValid(own, T, options, "A", -1),
        false,
        "the proven symbol gate also rejects the empty short result during warmup",
      );
      assert.equal(engineValidationLastNOk(own, T, options, 1), true);
      assert.equal(engineValidationLastNOk(own, T, options, -1), false);
      assert.equal(execDecision(own, T, options, { sym: "A", side: 1 }).ok, true);
      assert.deepEqual(execDecision(own, T, options, { sym: "A", side: -1 }), {
        ok: false,
        why: "directionValidation",
      });
      const losses = trades.slice(0, 5).map((tr) => ({
        ...tr,
        side: -1 as const,
        r: -0.001,
        entryT: tr.entryT - H,
        exitT: tr.exitT - H,
      }));
      const mixed = makeTape(
        tp.id,
        tp.bot,
        tp.ind,
        tp.protect,
        tp.kind,
        ["A"],
        [...rows, ...losses],
        [],
        [],
      );
      assert.equal(
        configEval(mixed, T, options).ok,
        true,
        "the config remains profitable from longs",
      );
      assert.equal(execDecision(mixed, T, options, { sym: "A", side: -1 }).ok, false);
      assert.equal(execDecision(mixed, T, options, { sym: "A", side: 1 }).ok, true);
      assert.equal(mixed.n, 23, "the losing side remains in candidate learning");
    });
    it(`${tag ?? "wide"}: Base provenance preserves config sample scope through selection and execution`, () => {
      const { tp, o, trades } = fixture(tag);
      const history = ["A", "B", "C"].flatMap((sym) =>
        trades
          .slice(0, 5)
          .map((tr) => ({ ...tr, sym, entryT: tr.entryT - H, exitT: tr.exitT - H })),
      );
      const future = { ...trades[0], entryT: T + 60_000, exitT: T + 2 * 60_000, r: -0.5 };
      const later = { ...future, entryT: T + 3 * 60_000, exitT: T + 4 * 60_000, r: 0.01 };
      const own = makeTape(
        tp.id,
        tp.bot,
        tp.ind,
        tp.protect,
        tp.kind,
        ["A", "B", "C", "A", "B", "C"],
        [...history, future, later],
        [],
        [],
      );
      const options = {
        ...o,
        startT: T,
        simH: 1,
        symGate: "provenSide" as const,
        durableFrac: 0,
        gates: { ...o.gates, minTrades: 12, lastNFloor: 5 },
        rangeGate: tag ? { lastN: 75, minPf: 1.35, ranges: [tag] } : undefined,
      };
      const ev = configEval(own, T, options);
      assert.equal(ev.ok, true, "15 config closes pass even though no symbol has twelve");
      assert.equal(ev.n, 15);
      assert.deepEqual(
        ev,
        configEval(own, T, { ...options, basePassed: undefined }),
        "Base admission metadata never changes the evaluator's population",
      );
      for (const select of [selectFixed, selectAt])
        assert.deepEqual(
          select([own], T, options).picks.map((p) => p.id),
          [own.id],
        );
      assert.deepEqual(
        selectDurable([own], T, options, new Set()).picks.map((p) => p.id),
        [own.id],
      );
      for (const sym of ["A", "B", "C"])
        assert.equal(execDecision(own, T, options, { sym, side: 1 }).ok, true);
      assert.equal(
        configEval(own, T, { ...options, gates: { ...options.gates, minTrades: 16 } }).ok,
        false,
        "the config minimum still applies",
      );
      if (tag)
        assert.equal(
          configEval(own, T, { ...options, rangeGate: { ...options.rangeGate!, floor: 0 } }).ok,
          false,
          "strict range Last-N still requires 75 config closes",
        );
      const u = {
        bars: [],
        caches: [],
        startT: T - 24 * H,
        endT: T + H,
        splitT: T,
        nowT: T + H,
        baseTf: 5,
      } as never;
      const sim = walkForward(u, [own], options);
      assert.deepEqual(
        sim.trades.map((tr) => [tr.sym, tr.entryT, tr.r]),
        [["A", future.entryT, -0.5]],
        "a valid set executes and retains its loss; deterioration rejects the later entry",
      );
      assert.equal(
        own.n,
        17,
        "failed validation never deletes candidate losses or rejected entries",
      );
    });

    it(`${tag ?? "wide"}: config Last-N and the configured symbol/direction gate remain independent`, () => {
      const { tp, o, trades } = fixture(tag);
      const rows = ["A", "B", "C", "D"].flatMap((sym) =>
        trades.slice(0, 5).map((tr) => ({
          ...tr,
          sym,
          r: sym === "D" ? -0.001 : 0.01,
          entryT: tr.entryT - H,
          exitT: tr.exitT - H,
        })),
      );
      const own = makeTape(
        tp.id,
        tp.bot,
        tp.ind,
        tp.protect,
        tp.kind,
        ["A", "B", "C", "D", "A", "B", "C", "D"],
        rows,
        [],
        [],
      );
      const options = {
        ...o,
        validLastN: 15,
        symGate: "provenSide" as const,
        symMinN: 2,
        gates: { ...o.gates, minTrades: 12, lastNFloor: 5 },
      };
      assert.equal(configEval(own, T, options).ok, true);
      assert.equal(
        execDecision(own, T, options, { sym: "A", side: 1 }).ok,
        true,
        "five own closes are enough for a configured two-close symbol gate",
      );
      assert.deepEqual(
        execDecision(own, T, options, { sym: "D", side: 1 }),
        { ok: false, why: "symPf" },
        "a profitable config cannot bypass the configured losing-symbol veto",
      );
      assert.equal(
        engineContextValid(own, T, options, "D", 1),
        false,
        "native promotion uses the identical symbol gate",
      );
      assert.equal(configContextEval(own, T, options, "A", 1).n, 5);
      assert.equal(
        engineContextValid(own, T, { ...options, symGate: "off" }, "D", 1),
        true,
        "an explicitly disabled symbol gate does not acquire a hidden Last-N gate",
      );
      const strict = { ...options, gates: { ...options.gates, warmup: false } };
      assert.equal(
        engineContextValid(own, T, strict, "A", -1),
        false,
        "strict symbol evidence cannot borrow the opposite side's closes",
      );
      assert.equal(engineContextValid(own, T, strict, "A", 1), true);
      assert.equal(
        engineContextValid(own, T, { ...strict, symMinN: 0 }, "A", -1),
        false,
        "strict mode still refuses an empty result even with a zero count floor",
      );
      assert.equal(
        engineContextValid(own, T, options, "A", -1),
        false,
        "warmup cannot treat an empty symbol/direction result as proven",
      );
      assert.equal(engineContextValid(own, T, { ...options, symMinN: 0 }, "A", -1), false);
      assert.deepEqual(
        execDecision(own, T, options, { sym: "unseen", side: 1 }),
        { ok: false, why: "symPf" },
        "passing direction evidence cannot qualify an unobserved symbol",
      );
      assert.equal(engineContextValid(own, T, options, "unseen", 1), false,
        "native promotion rejects the same empty symbol result");
      assert.equal(
        configEval(own, T, {
          ...options,
          validLastN: 25,
          gates: { ...options.gates, lastNFloor: 0 },
        }).ok,
        false,
        "symbol warmup cannot waive config Last-N result evidence",
      );
      assert.equal(own.n, 20);
    });

    it(`${tag ?? "wide"}: a selected config cannot open after its own Last-N fails within the hour`, () => {
      const { tp, o } = fixture(tag);
      const before = T + 30 * 60_000 + 1,
        after = T + 45 * 60_000 + 1;
      assert.equal(configEval(tp, before, o).ok, true);
      assert.deepEqual(
        selectFixed([tp], before, o).picks.map((p) => p.id),
        [tp.id],
      );
      assert.equal(execDecision(tp, before, o, { sym: "A", side: 1 }).ok, true);
      assert.equal(configEval(tp, after, o).ok, false);
      assert.equal(execDecision(tp, after, o, { sym: "A", side: 1 }).ok, false);
      assert.deepEqual(selectDurable([tp], after, o, new Set([tp.id])).picks, []);
      assert.equal(tp.n, 50);
    });
  }

  it("a close at the exact entry boundary updates Last-N before the next entry", () => {
    const { tp, o, trades } = fixture();
    const rows = trades.slice(0, 31).map((trade, i) => ({ ...trade, r: i === 30 ? -0.5 : 0.01 }));
    const own = makeTape(tp.id, tp.bot, tp.ind, tp.protect, tp.kind, ["A"], rows, [], []);
    const at = rows[30].exitT;
    assert.equal(execDecision(own, at - 1, o, { sym: "A", side: 1 }).ok, true);
    assert.equal(execDecision(own, at, o, { sym: "A", side: 1 }).ok, false);
    assert.equal(execDecision(own, at + 1, o, { sym: "A", side: 1 }).ok, false);
  });

  it("Base metadata cannot override hourly ranking or Durable stability", () => {
    const { tp, o, trades } = fixture();
    const tape = (id: string, values: number[], spread: boolean) =>
      makeTape(
        id,
        tp.bot,
        tp.ind,
        tp.protect,
        tp.kind,
        ["A"],
        values.map((r, i) => ({
          ...trades[0],
          cfg: id,
          r,
          entryT: T - (20 - i) * (spread ? H : 60_000) - 60_000,
          exitT: T - (20 - i) * (spread ? H : 60_000),
        })),
        [],
        [],
      );
    const steady = tape(tp.id, Array(20).fill(0.01), true);
    const burst = tape(
      tp.id + "-burst",
      Array.from({ length: 20 }, (_, i) => (i % 4 === 3 ? -0.02 : 0.025)),
      false,
    );
    const options = {
      ...o,
      validLastN: 0,
      seatPer: "pair" as const,
      familySeats: false,
      robustFrac: 0,
      portfolio: 1,
    };
    for (const basePassed of [undefined, o.basePassed]) {
      assert.deepEqual(
        selectAt([steady, burst], T, { ...options, basePassed, rank: "net" }).picks.map(
          (p) => p.id,
        ),
        [burst.id],
      );
      assert.deepEqual(
        selectAt([steady, burst], T, { ...options, basePassed, rank: "lcb" }).picks.map(
          (p) => p.id,
        ),
        [steady.id],
      );
      assert.deepEqual(
        selectDurable(
          [burst],
          T,
          { ...options, basePassed, durableSplits: 4, durableFrac: 0.75 },
          new Set(),
        ).picks,
        [],
        "one positive block cannot pass three required Durable blocks",
      );
      assert.deepEqual(
        selectDurable(
          [steady],
          T,
          { ...options, basePassed, durableSplits: 4, durableFrac: 0.75 },
          new Set(),
        ).picks.map((p) => p.id),
        [steady.id],
      );
    }
  });

  it("direction-scoped caching restores longer Last-N and history requests without trimming candidates", () => {
    const { tp, o, trades } = fixture();
    const rows = Array.from({ length: 100 }, (_, i) => ({
      ...trades[0],
      entryT: T - (101 - i) * H,
      exitT: T - (100 - i) * H,
    }));
    const own = makeTape(tp.id, tp.bot, tp.ind, tp.protect, tp.kind, ["A"], rows, [], []);
    assert.equal(configDirectionEval(own, T, o, 1).n, 24);
    assert.equal(configDirectionEval(own, T, { ...o, validLastN: 75 }, 1).ok, true);
    assert.equal(configDirectionEval(own, T, { ...o, longH: 336 }, 1).n, 100);
    assert.equal(configDirectionEval(own, T, o, 1).n, 24);
    assert.equal(own.n, 100);
  });

  it("cached direction views and selection info refresh held-only admission on the same tape list", () => {
    const { tp, o } = fixture();
    const list = [tp],
      at = T + 30 * 60_000 + 1;
    assert.equal(selectFixed(list, at, o).picks.length, 1);
    tp.heldOnly = true;
    assert.equal(selectFixed(list, at, o).picks.length, 0);
    tp.heldOnly = false;
    assert.equal(selectFixed(list, at, o).picks.length, 1);
  });

  it("failed direction configs remain in the hourly robustness denominator", () => {
    const { tp, o, trades } = fixture();
    const good = makeTape(
      tp.id,
      tp.bot,
      tp.ind,
      tp.protect,
      tp.kind,
      ["A"],
      trades.slice(0, 18).map((tr) => ({ ...tr, entryT: tr.entryT - H, exitT: tr.exitT - H })),
      [],
      [],
    );
    const bad = [2, 3, 4].map((k) =>
      makeTape(
        tp.id.replace("|tp1|", `|tp${k}|`),
        tp.bot,
        tp.ind,
        { ...tp.protect, tp: k / 100 },
        tp.kind,
        ["A"],
        trades
          .slice(0, 18)
          .map((tr) => ({ ...tr, r: -0.01, entryT: tr.entryT - H, exitT: tr.exitT - H })),
        [],
        [],
      ),
    );
    const options = { ...o, robustFrac: 0.6, seatPer: "pair" as const, familySeats: false };
    assert.equal(selectAt([good], T, options).picks.length, 1);
    assert.equal(selectAt([good, ...bad], T, options).picks.length, 0);
  });

  it("a rejected direction learns causally from its own candidates and can recover", () => {
    const { tp, o, trades } = fixture("mc");
    const longs = trades
      .slice(0, 18)
      .map((tr) => ({ ...tr, entryT: tr.entryT - H, exitT: tr.exitT - H }));
    const shorts = trades.slice(0, 14).map((tr, i) => ({
      ...tr,
      side: -1 as const,
      r: 0.01,
      entryT: T + (2 * i + 1) * 60_000,
      exitT: T + (2 * i + 2) * 60_000,
    }));
    const own = makeTape(
      tp.id,
      tp.bot,
      tp.ind,
      tp.protect,
      tp.kind,
      ["A"],
      [...longs, ...shorts],
      [],
      [],
    );
    const options = {
      ...o,
      startT: T,
      simH: 1,
      lastN: 0,
      gates: { ...o.gates, minTrades: 12, lastNFloor: 5 },
      rangeGate: { lastN: 75, minPf: 1.35 },
    };
    assert.equal(engineValidationLastNOk(own, T + 9 * 60_000, options, -1), false);
    assert.equal(
      engineValidationLastNOk(own, T + 10 * 60_000, options, -1),
      true,
      "the fifth own close has settled at this boundary",
    );
    const u = {
      bars: [],
      caches: [],
      startT: T - 24 * H,
      endT: T + H,
      splitT: T,
      nowT: T + H,
      baseTf: 5,
    } as never;
    const sim = walkForward(u, [own], options);
    assert.deepEqual(
      sim.trades.map((tr) => tr.entryT),
      shorts.slice(12).map((tr) => tr.entryT),
    );
    assert.equal(
      configDirectionEval(own, T + 10 * 60_000, options, -1).ok,
      false,
      "five wins cannot borrow the long direction's twelve-close sample",
    );
    assert.equal(configDirectionEval(own, T + 24 * 60_000 + 1, options, -1).ok, true);
    assert.equal(own.n, 32, "rejected candidates remain available to independent learning");
  });

  it("a strict range window cannot borrow the opposite direction's closes", () => {
    const { tp, o, trades } = fixture("mc");
    const rows = Array.from({ length: 80 }, (_, i) => ({
      ...trades[0],
      entryT: T - (82 - i) * 60_000,
      exitT: T - (81 - i) * 60_000,
    }));
    rows.push(...rows.slice(0, 5).map((tr) => ({ ...tr, side: -1 as const })));
    const own = makeTape(tp.id, tp.bot, tp.ind, tp.protect, tp.kind, ["A"], rows, [], []);
    const options = {
      ...o,
      lastN: 0,
      validLastN: 0,
      rangeGate: { lastN: 75, minPf: 1.35, floor: 0 },
    };
    assert.equal(configEval(own, T, options).ok, true);
    assert.equal(engineValidationLastNOk(own, T, options, 1), true);
    assert.equal(engineValidationLastNOk(own, T, options, -1), false);
    assert.equal(
      engineValidationLastNOk(
        own,
        T,
        { ...options, rangeGate: { ...options.rangeGate, floor: 5 } },
        -1,
      ),
      true,
    );
  });

  it("Signal history stays independent of the shortened engine window", () => {
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(defaults.longH, 24);
    assert.equal(signalHistoryHours(defaults), 100);
    assert.equal(signalHistoryHours({ preH: 6, signalLongH: 480 }), 480);
    assert.equal(signalHistoryHours({ preH: 6 }), 100);
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
