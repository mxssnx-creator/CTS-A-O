import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, Side, StratKind, Trade } from "../domain/types.ts";
import { EXIT_BOT } from "../exit-strategy.ts";
import { barsFromCandles } from "../market/bars.ts";
import { configId } from "../pipeline/pipeline.ts";
import { orderKey, sizeBook } from "../sizing.ts";
import { simulate } from "./backtest.ts";
import { defaultWalkForward, makeTape, walkForward } from "./walkforward.ts";

const H = 3_600_000, M = 60_000, NOW = Date.UTC(2026, 8, 20), IND = "ema-9-21@m15", SYM = "AAA-USDT";
const universe = { bars: [], caches: [], startT: NOW - 200 * H, endT: NOW, splitT: NOW - 200 * H,
  nowT: NOW, baseTf: 15 } as never;

function fixture(side: Side, exitSl = .01, exitHistory = .02) {
  const ordinary: Protect = { tp: .01, sl: .05, trail: 0, hold: 20, tag: "sh" };
  const exit: Protect = { tp: .2, sl: exitSl, trail: 0, hold: 20, exitType: "historic", exitSet: "static-sl", exitSide: side };
  const normalId = configId("follow", IND, ordinary, "normal"), exitId = configId(EXIT_BOT, IND, exit, "exit");
  const rows = [[100,100.1,99.9,100], [100,100.2,99.9,100], [100,100.1,99.2,99.3],
    [100,100.2,98.5,100], [100,101.2,99.8,100.8]].map(([o,h,l,c],i) => side === 1
      ? { t: NOW - 2 * H + i * M, o,h,l,c,v:1 }
      : { t: NOW - 2 * H + i * M, o:200-o,h:200-l,l:200-h,c:200-c,v:1 });
  const bars = barsFromCandles(SYM, 1, rows), signal = Int8Array.from([side,0,0,0,0]);
  const make = (cfg: string, bot: "follow" | typeof EXIT_BOT, p: Protect, kind: StratKind, historicReturn: number) => {
    const history: Trade[] = Array.from({ length: 100 }, (_, i) => ({ cfg, sym: SYM, side,
      entryT: NOW - 120 * H + i * H, exitT: NOW - 120 * H + i * H + 30 * M,
      entry: 100, exit: 100 * (1 + side * historicReturn), r: historicReturn,
      unitR: historicReturn, reason: historicReturn > 0 ? "tp" : "sl", bars: 2, mfe: 0, mae: 0, kind }));
    const future = simulate(cfg, bars, signal, p, { cost: .0015 }).trades.map((trade) => ({ ...trade, kind }));
    return { future, tape: makeTape(cfg, bot, IND, p, kind, [SYM], [...history, ...future], [], []) };
  };
  const a = make(normalId, "follow", ordinary, "normal", .02);
  const b = make(exitId, EXIT_BOT, exit, "exit", exitHistory);
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const opts = { ...base, preH: 336, longH: 336, simH: 6, lastN: 0, validLastN: 0, robustFrac: 0,
    seatPer: "config" as const, familySeats: false, symGate: undefined, rangeGate: undefined,
    coord: { enabled: false, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: false },
    engineSideAccept: { enabled: false, minPf: 1.05, hours: 24, minTrades: 30 },
    toggles: { ...base.toggles, normal: true, trailing: true, exit: true, dca: false, dcaActive: false, axis: false, block: false },
    gates: { ...base.gates, minTrades: 12, minDdtH: 0, maxDdtH: 1000, maxDdr: 0 },
    basePassed: new Set([`follow|${IND}`]), exitBasePassed: new Set([`${EXIT_BOT}|${IND}`]) };
  return { a, b, normalId, exitId, opts };
}

for (const side of [1, -1] as const) test(`mixed Exit and ordinary same-side parents retain independent qualification and closes: ${side}`, () => {
  const f = fixture(side);
  assert.equal(f.a.future.length, 1);
  assert.equal(f.b.future.length, 1);
  const normal = f.a.future[0], exit = f.b.future[0];
  assert.equal(normal.entryT, exit.entryT, "both strategies actually open on the same symbol and bar");
  assert.ok(exit.exitT < normal.exitT, "the Exit stop closes while the ordinary parent is still open");
  assert.equal(exit.reason, "sl");
  assert.equal(normal.reason, "tp");
  const both = walkForward(universe, [f.a.tape, f.b.tape], f.opts);
  assert.equal(both.trades.length, 2, JSON.stringify({ steps: both.steps, skips: both.skips }));
  const actual = new Map(both.trades.map((trade) => [trade.cfg, trade]));
  for (const expected of [normal, exit]) {
    const trade = actual.get(expected.cfg);
    assert.ok(trade, `${expected.cfg} has its own executed close`);
    assert.equal(trade.sym, expected.sym);
    assert.equal(trade.side, expected.side);
    assert.equal(trade.entryT, expected.entryT);
    assert.equal(trade.exitT, expected.exitT);
    assert.equal(trade.reason, expected.reason);
    assert.ok(Math.abs(trade.r - expected.r) < 1e-10);
    assert.ok(Math.abs(trade.exit - expected.exit) < 1e-5);
  }
  const funding = sizeBook(both.trades, [], { balance: 1000, fixedNotional: 100, sizing: { mode: "fixed", pct: .002 } });
  assert.equal(funding.units.size, 2);
  for (const trade of both.trades) assert.equal(funding.units.get(orderKey(trade)), 100, "both synthetic orders have positive funding");
  const withoutExit = walkForward(universe, [f.a.tape, f.b.tape], { ...f.opts, exitBasePassed: new Set<string>() });
  assert.deepEqual(withoutExit.trades, both.trades.filter((trade) => trade.cfg === f.normalId));
  const withoutOrdinary = walkForward(universe, [f.a.tape, f.b.tape], { ...f.opts, basePassed: new Set<string>() });
  assert.deepEqual(withoutOrdinary.trades, both.trades.filter((trade) => trade.cfg === f.exitId));
  const losingExit = fixture(side, .01, -.02);
  const qualified = walkForward(universe, [losingExit.a.tape, losingExit.b.tape], losingExit.opts);
  assert.deepEqual(qualified.trades, both.trades.filter((trade) => trade.cfg === f.normalId), "a failing Exit history cannot alter the ordinary parent");
  const widerExit = fixture(side, .014);
  const changed = walkForward(universe, [widerExit.a.tape, widerExit.b.tape], widerExit.opts);
  assert.equal(changed.trades.length, 2, "both parents remain active with the changed Exit stop");
  assert.ok(changed.trades.some((trade) => trade.cfg === widerExit.exitId && Math.abs(trade.r - exit.r) > .001),
    "the changed Exit retains its own distinct execution");
  assert.deepEqual(changed.trades.filter((trade) => trade.cfg === f.normalId), both.trades.filter((trade) => trade.cfg === f.normalId),
    "changing only Exit protection cannot reprice or close the ordinary parent");
});
