// D1 (wf.sideValidation): each seat's LONG and SHORT side must each pass the seat gates on their own validation
// window. A config whose pooled record passes but whose short side loses is seated for its long side only, and its
// trade credit carries long trades only. With the switch off the same config trades both sides, as before.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWalkForward,
  makeTape,
  selectFixed,
  sideMaskOf,
  walkForward,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const IND = "rsi-mom-14-20@m15";
const SYM = "AAA-USDT";
// the seat is judged at t: its validation window is [t - 24 h, t) (longH 24, the default); every close below sits inside
// it, so no longH pin is needed
const t = NOW - 3 * H;

type Leg = { side: 1 | -1; exitT: number; r: number };

/** one closed trade: entered an hour before it exits, on `side`, returning `r` */
function trade(cfg: string, leg: Leg, entryOffset = H): Trade {
  return {
    cfg,
    sym: SYM,
    side: leg.side,
    entryT: leg.exitT - entryOffset,
    exitT: leg.exitT,
    entry: 100,
    exit: 100 * (1 + leg.r),
    r: leg.r,
    reason: leg.r > 0 ? "tp" : "sl",
    bars: 2,
    mfe: 0,
    mae: 0,
    kind: "normal",
  } as Trade;
}

/**
 * The record of one config. LONG: 20 closes, all +1 % (in the window). SHORT: 20 closes, 13 losers of −1 % and 7 winners
 * of +1 %: the short side nets −6 % (PF 0.54) while the pooled record nets +14 % (PF 2.08) and passes the seat gates.
 */
function legs(): Leg[] {
  const out: Leg[] = [];
  for (let i = 0; i < 20; i++) out.push({ side: 1, exitT: t - 22 * H + i * H, r: 0.01 });
  for (let i = 0; i < 20; i++)
    out.push({ side: -1, exitT: t - 22.5 * H + i * H, r: i < 13 ? -0.01 : 0.01 });
  return out;
}

/**
 * The tape of one config: its validation record, and (withRun) a long and a short close inside the run window
 * [NOW − 2 h, NOW) — entered 30 min before each exit, so the credit loop of a step at NOW − 2 h or NOW − 1 h takes them.
 */
function tapeOf(cfg: string, record: Leg[], withRun = true) {
  const runLegs: Leg[] = withRun
    ? [
        { side: 1, exitT: NOW - 1 * H, r: 0.01 },
        { side: -1, exitT: NOW - 0.5 * H, r: 0.01 },
      ]
    : [];
  const trades = [
    ...record.map((l) => trade(cfg, l)),
    ...runLegs.map((l) => trade(cfg, l, 0.5 * H)),
  ];
  return makeTape(cfg, "follow", IND, { tp: 0.01, sl: 0.01, trail: 0, hold: 32 }, "normal", [SYM], trades, [], []);
}

const cfgId = `follow|${IND}|tp1|sl1|tr0|h32`;
const tp = () => tapeOf(cfgId, legs());

const opts = (extra: Partial<WalkForwardOptions> = {}): WalkForwardOptions => {
  const o = defaultWalkForward(DEFAULT_SETTINGS);
  return {
    ...o,
    gates: { ...o.gates, minPf: 1.05, minGreen: 0, minTrades: 10 },
    toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: true, dcaActive: false, axis: true },
    symGate: undefined,
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
    simH: 2,
    validLastN: 0,
    lastN: 0,
    robustFrac: 0,
    seatPer: "config",
    ...extra,
  };
};

describe("sideMaskOf: each side on its own closes", () => {
  const mk = (xs: Leg[]) => tapeOf("m", xs, false);
  it("a winning long side and a losing short side: long only", () => {
    const tape = mk(legs());
    assert.equal(sideMaskOf(tape, 0, tape.n, 10, 1.05), 1);
  });
  it("both sides winning: both", () => {
    const tape = mk([
      ...Array.from({ length: 12 }, (_, i) => ({ side: 1 as const, exitT: t - 20 * H + i * H, r: 0.01 })),
      ...Array.from({ length: 12 }, (_, i) => ({ side: -1 as const, exitT: t - 19.5 * H + i * H, r: 0.01 })),
    ]);
    assert.equal(sideMaskOf(tape, 0, tape.n, 10, 1.05), 3);
  });
  it("a side with fewer closes than minN is not enabled", () => {
    const tape = mk([
      ...Array.from({ length: 12 }, (_, i) => ({ side: 1 as const, exitT: t - 20 * H + i * H, r: 0.01 })),
      { side: -1 as const, exitT: t - 2 * H, r: 0.01 },
    ]);
    assert.equal(sideMaskOf(tape, 0, tape.n, 10, 1.05), 1);
  });
  it("neither side passing: 0", () => {
    const tape = mk(
      Array.from({ length: 24 }, (_, i) => ({ side: (i % 2 ? -1 : 1) as 1 | -1, exitT: t - 20 * H + i * H, r: i % 3 ? -0.01 : 0.01 })),
    );
    assert.equal(sideMaskOf(tape, 0, tape.n, 10, 1.05), 0);
  });
});

describe("wf.sideValidation: the seat's sides", () => {
  it("on (default): the config is seated for its long side only", () => {
    const pick = selectFixed([tp()], t, opts()).picks;
    assert.equal(pick.length, 1);
    assert.equal(pick[0].id, cfgId);
    assert.equal(pick[0].sides, 1);
  });

  it("off: the same pooled record is seated with both sides", () => {
    const pick = selectFixed([tp()], t, opts({ sideValidation: false })).picks;
    assert.equal(pick.length, 1);
    assert.equal(pick[0].id, cfgId);
    assert.equal(pick[0].sides, 3);
  });

  it("invertSeats keeps the pooled rule (sides 3)", () => {
    const pick = selectFixed([tp()], t, opts({ invertSeats: true })).picks;
    assert.equal(pick[0]?.sides, 3);
  });

  it("a config where neither side passes is not seated", () => {
    const losing = makeTape(
      "lose",
      "follow",
      IND,
      { tp: 0.01, sl: 0.01, trail: 0, hold: 32 },
      "normal",
      [SYM],
      [
        ...Array.from({ length: 24 }, (_, i) => trade("lose", { side: (i % 2 ? -1 : 1) as 1 | -1, exitT: t - 20 * H + i * H, r: i % 3 ? -0.01 : 0.01 })),
      ],
      [],
      [],
    );
    assert.equal(selectFixed([losing], t, opts()).picks.length, 0);
  });
});

describe("wf.sideValidation: trade credit", () => {
  const universe = () =>
    makeUniverse([barsFromCandles(SYM, 15, syntheticCandles(SYM, 15, 1800, NOW, 3))]);
  const runOpts = (extra: Partial<WalkForwardOptions>): WalkForwardOptions =>
    ({ ...opts(extra), startT: NOW - 2 * H, simH: 2, stepH: 1, preH: 6, longH: 24 });

  it("a seat validated on its long side only credits long trades", () => {
    const res = walkForward(universe(), [tp()], runOpts({}));
    assert.ok(res.trades.length > 0, "the run credits the seat's in-window trades");
    assert.ok(res.trades.every((x) => x.side === 1), "no short trade is credited");
  });

  it("with the switch off the same seat also credits its short trades", () => {
    const res = walkForward(universe(), [tp()], runOpts({ sideValidation: false }));
    assert.ok(res.trades.some((x) => x.side === -1), "the short side trades when not validated per side");
  });
});
