// A range's own coordination (RangeCoord: seat validation window, execution window, symbol gate, engine direction
// acceptance) decides that range's candidates only. Another range's configs trade the same with or without it.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, rangeCoordsOf, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const IND = "rsi-mom-14-20@m15";
const SYM = "AAA-USDT";

/**
 * 100 hourly closes of the history: winners, then `tail` losers at the end (the recent closes), and one winner entering
 * in the simulated window (the trade the seat decision is about)
 */
function trades(cfg: string, tail: number, sym = SYM): Trade[] {
  const mk = (r: number, entryT: number): Trade =>
    ({
      cfg,
      sym,
      side: 1,
      entryT,
      exitT: entryT + 30 * 60_000,
      entry: 100,
      exit: 100 * (1 + r),
      r,
      reason: r > 0 ? "tp" : "sl",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind: "normal",
    }) as Trade;
  const out: Trade[] = [];
  for (let i = 0; i < 100; i++) out.push(mk(i >= 100 - tail ? -0.01 : 0.01, NOW - 120 * H + i * H));
  out.push(mk(0.01, NOW - 2 * H + 10 * 60_000));
  return out;
}

const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
  validLastN: 0,
  lastN: 0,
  robustFrac: 0,
  seatPer: "config",
  engineSideAccept: undefined,
};
const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

const gnCfg = "follow|" + IND + "|tp1|sl1|tr0|h32|gn";
const mcCfg = "follow|" + IND + "|tp2|sl1|tr0|h32|mc";
const tapes = () => [
  makeTape(gnCfg, "follow", IND, { ...P, tag: "gn" }, "normal", [SYM], trades(gnCfg, 10), [], []),
  makeTape(mcCfg, "follow", IND, { ...P, tp: 0.02, tag: "mc" }, "normal", [SYM], trades(mcCfg, 0), [], []),
];
const of = (r: { trades: Trade[] }, tag: string) => r.trades.filter((x) => x.cfg.endsWith(`|${tag}`));

describe("a range's own coordination", () => {
  it("reads each range's coordination from its own grid key and nothing else", () => {
    const grid = {
      general: { coord: { validLastN: 10 } },
      micro: { coord: { engineSide: false } },
      short: {},
    };
    const coords = rangeCoordsOf({ grid } as never);
    assert.deepEqual(coords, { gn: { validLastN: 10 }, mc: { engineSide: false } });
  });

  it("a seat window on General refuses a General config whose recent closes lost; Micro's config is not touched", () => {
    const off = walkForward(u, tapes(), base);
    assert.ok(of(off, "gn").length > 0, "without the override the General config trades");
    const on = walkForward(u, tapes(), { ...base, rangeCoord: { gn: { validLastN: 10 } } });
    assert.equal(of(on, "gn").length, 0, "the last 10 General closes lost: refused by its own window");
    assert.deepEqual(
      of(on, "mc").map((x) => `${x.entryT}:${x.r}`),
      of(off, "mc").map((x) => `${x.entryT}:${x.r}`),
      "the Micro trades are identical",
    );
  });

  it("the global seat window still applies to a range without its own coordination", () => {
    const withGlobal = walkForward(u, tapes(), { ...base, validLastN: 10 });
    assert.equal(of(withGlobal, "gn").length, 0, "the global window refuses the General config");
    assert.ok(of(withGlobal, "mc").length > 0, "and admits the Micro config, whose recent closes all won");
    // a range's own window overrides the global one for that range only
    const own = walkForward(u, tapes(), { ...base, validLastN: 10, rangeCoord: { gn: { validLastN: 0 } } });
    assert.ok(of(own, "gn").length > 0, "General's own window (off) admits it again");
    assert.deepEqual(
      of(own, "mc").map((x) => x.entryT),
      of(withGlobal, "mc").map((x) => x.entryT),
      "Micro keeps the global window's trades",
    );
  });

  it("a bot or an indication-family allow-list leaves a range's other candidates; other ranges keep theirs", () => {
    const folCfg = "follow|rsi-14-25-75@m15|tp1|sl1|tr0|h32|gn";
    const revCfg = "revert|rsi-14-25-75@m15|tp3|sl1|tr0|h32|gn";
    const trendCfg = "follow|trend-ema@m15|tp1|sl1|tr0|h32|gn";
    // one symbol per config: the book takes one open position per symbol and side, so configs that enter together on one
    // symbol would compete for it (the test is about the lists, not the book)
    const set = () => [
      makeTape(folCfg, "follow", "rsi-14-25-75@m15", { ...P, tag: "gn" }, "normal", ["AAA-USDT"], trades(folCfg, 0, "AAA-USDT"), [], []),
      makeTape(revCfg, "revert", "rsi-14-25-75@m15", { ...P, tp: 0.03, tag: "gn" }, "normal", ["BBB-USDT"], trades(revCfg, 0, "BBB-USDT"), [], []),
      makeTape(trendCfg, "follow", "trend-ema@m15", { ...P, tag: "gn" }, "normal", ["CCC-USDT"], trades(trendCfg, 0, "CCC-USDT"), [], []),
      makeTape(mcCfg, "follow", IND, { ...P, tp: 0.02, tag: "mc" }, "normal", ["DDD-USDT"], trades(mcCfg, 0, "DDD-USDT"), [], []),
    ];
    const cfgs = (r: { trades: Trade[] }, tag: string) => [...new Set(of(r, tag).map((x) => x.cfg))].sort();
    const free = walkForward(u, set(), base);
    assert.deepEqual(cfgs(free, "gn"), [folCfg, revCfg, trendCfg].sort(), "without lists every General config trades");
    const bots = walkForward(u, set(), { ...base, rangeCoord: { gn: { bots: ["follow"] } } });
    assert.deepEqual(cfgs(bots, "gn"), [folCfg, trendCfg].sort(), "the follow bot only");
    assert.deepEqual(cfgs(bots, "mc"), cfgs(free, "mc"), "Micro keeps every bot");
    const rev = walkForward(u, set(), { ...base, rangeCoord: { gn: { indFamilies: ["reversion"] } } });
    assert.deepEqual(cfgs(rev, "gn"), [folCfg, revCfg].sort(), "the reversion family only");
    assert.deepEqual(cfgs(rev, "mc"), cfgs(free, "mc"));
  });
});
