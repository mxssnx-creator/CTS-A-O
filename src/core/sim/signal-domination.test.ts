// Direction domination per source × symbol (8 Oct, plan step 3): with `signalDomination` "unit", a signal's weaker side on a
// symbol is refused and its stronger side trades, judged on each side's own record of the same source, symbol and type.
// "pooled" (today's pooled direction gate, here off) and "off" trade both sides. Failing test first: the option does not
// exist yet, so both sides trade under "unit" too.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SIG = "sig-ema-cross-s@m15";
const AAA = "AAA-USDT";
const BBB = "BBB-USDT";
const cfg = `follow|${SIG}|tp1|sl1|tr0|h32`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const RUN = NOW - 2 * H + 10 * 60_000;
const U = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

const trade = (sym: string, side: 1 | -1, entryT: number, r: number): Trade =>
  ({
    cfg,
    sym,
    side,
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

/** 40 hourly closes of both sides before the simulated window (the last 6 h): `winSide` wins on this symbol, the other loses. */
function record(sym: string, winSide: 1 | -1): Trade[] {
  const out: Trade[] = [];
  for (let i = 0; i < 40; i++) {
    const side = (i % 2 === 0 ? winSide : -winSide) as 1 | -1;
    out.push(trade(sym, side, NOW - 60 * H + i * H, side === winSide ? 0.01 : -0.01));
  }
  return out;
}

// AAA: long is the stronger side. BBB: short is the stronger side. Each symbol takes one order per side in the run.
const closes = [
  ...record(AAA, 1),
  ...record(BBB, -1),
  trade(AAA, 1, RUN, 0.01),
  trade(AAA, -1, RUN + 5 * 60_000, -0.01),
  trade(BBB, -1, RUN + 10 * 60_000, 0.01),
  trade(BBB, 1, RUN + 15 * 60_000, -0.01),
];
const tape = makeTape(cfg, "follow", SIG, P, "normal", [AAA, BBB], closes, [], []);

const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  rangeCoord: undefined,
  symGate: undefined,
  coord: { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
  lastN: 0,
  validLastN: 0,
  robustFrac: 0,
  signalValidLastN: 0,
  signalGuardN: 0,
  signalCluster: undefined,
  signalAccept: undefined,
  signalSideAccept: undefined,
  signalActive: new Set([
    sigActiveKey("follow", SIG, AAA, 1),
    sigActiveKey("follow", SIG, AAA, -1),
    sigActiveKey("follow", SIG, BBB, 1),
    sigActiveKey("follow", SIG, BBB, -1),
  ]),
  seatPer: "config",
};

/** the sides of the run's executed orders, per symbol: "AAA-USDT long" and so on */
const executed = (mode: "unit" | "pooled" | "off") => {
  const o = { ...base, signalDomination: mode } as WalkForwardOptions;
  const r = walkForward(U, [tape], o);
  return r.trades
    .filter((t) => t.entryT >= RUN - 1)
    .map((t) => `${t.sym} ${t.side > 0 ? "long" : "short"}`)
    .sort();
};

describe("direction domination per source × symbol", () => {
  it("unit: each symbol trades only its stronger side", () => {
    assert.deepEqual(executed("unit"), ["AAA-USDT long", "BBB-USDT short"]);
  });

  it("pooled and off: both sides trade on both symbols (no direction gate)", () => {
    assert.deepEqual(executed("pooled"), [
      "AAA-USDT long",
      "AAA-USDT short",
      "BBB-USDT long",
      "BBB-USDT short",
    ]);
    assert.deepEqual(executed("off"), [
      "AAA-USDT long",
      "AAA-USDT short",
      "BBB-USDT long",
      "BBB-USDT short",
    ]);
  });
});
