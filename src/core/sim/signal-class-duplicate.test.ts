// The duplicate rule is per class (8 Oct): an engine order and a signal order with the same protect, entry, exit and result
// are two orders, one per class. Two indications of one class with identical orders are still one order
// (independence.test.ts). Before this rule a signal was skipped as a duplicate of any engine order with the same key.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYM = "AAA-USDT";
const ENG = "rsi-mom-14-20@m15";
const SIG = "sig-ema-cross-s@m15";
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const U = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

const trade = (cfg: string, entryT: number, r: number): Trade =>
  ({
    cfg,
    sym: SYM,
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

/** 100 hourly closes before the run and one order in the run's last two hours: the same orders for any config id. */
function history(cfg: string): Trade[] {
  const out: Trade[] = [];
  for (let i = 0; i < 100; i++) out.push(trade(cfg, NOW - 120 * H + i * H, i % 5 === 4 ? -0.01 : 0.01));
  out.push(trade(cfg, NOW - 2 * H + 10 * 60_000, 0.01));
  return out;
}

const engine = makeTape(`follow|${ENG}|tp1|sl1|tr0|h32`, "follow", ENG, P, "normal", [SYM], history(`follow|${ENG}|tp1|sl1|tr0|h32`), [], []);
const signal = makeTape(`follow|${SIG}|tp1|sl1|tr0|h32`, "follow", SIG, P, "normal", [SYM], history(`follow|${SIG}|tp1|sl1|tr0|h32`), [], []);

const opts: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  rangeCoord: undefined,
  symGate: undefined,
  // confirmation off: the test isolates the duplicate rule (confirmation has its own tests)
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
  signalActive: new Set([sigActiveKey("follow", SIG, SYM, 1)]),
  seatPer: "config",
};

describe("the duplicate rule is per class", () => {
  it("an engine order and a signal order with the same key both execute", () => {
    const eng = walkForward(U, [engine], opts);
    const sig = walkForward(U, [signal], opts);
    assert.ok(eng.trades.length > 0, "the engine order executes alone");
    assert.ok(sig.trades.length > 0, "the signal order executes alone");
    const both = walkForward(U, [engine, signal], opts);
    assert.equal(
      both.trades.length,
      eng.trades.length + sig.trades.length,
      "the signal is not skipped as a duplicate of the engine order",
    );
    assert.equal(both.skips.duplicate ?? 0, 0, "no engine duplicate is counted");
    assert.equal(both.skips["sig:duplicate"] ?? 0, 0, "no signal is counted as a duplicate of an engine order");
  });

  it("two signal indications with identical orders still count as one order", () => {
    const SIG2 = "sig-ema-cross-m@m15";
    const twin = makeTape(`follow|${SIG2}|tp1|sl1|tr0|h32`, "follow", SIG2, P, "normal", [SYM], history(`follow|${SIG2}|tp1|sl1|tr0|h32`), [], []);
    const o: WalkForwardOptions = { ...opts, signalActive: new Set([sigActiveKey("follow", SIG, SYM, 1), sigActiveKey("follow", SIG2, SYM, 1)]) };
    const alone = walkForward(U, [signal], o);
    const both = walkForward(U, [signal, twin], o);
    assert.ok(alone.trades.length > 0);
    assert.equal(both.trades.length, alone.trades.length, "the twin's orders are the same orders within the class");
    assert.ok((both.skips["sig:duplicate"] ?? 0) > 0, "the twin is skipped as a duplicate within the signal class");
  });
});
