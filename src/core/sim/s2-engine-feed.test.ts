// Stable-02 windows (8 Oct): the engine's window judges engine candidates only. A signal's losing closes on a symbol and
// side must not pause an engine order there (the signals have their own window). Failing test first: the engine's window
// was fed every candidate, signals included. Off by default, so the defaults do not move.
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
const engCfg = `follow|${ENG}|tp1|sl1|tr0|h32|mc`;
const sigCfg = `follow|${SIG}|tp1|sl1|tr0|h32`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const U = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;
const IN_RUN = NOW - 2 * H + 10 * 60_000;

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

// the engine config: winners before the run and one order in it
const engineTape = makeTape(engCfg, "follow", ENG, { ...P, tag: "mc" }, "normal", [SYM], [
  ...Array.from({ length: 30 }, (_, i) => trade(engCfg, NOW - 60 * H + i * H, 0.01)),
  trade(engCfg, IN_RUN, 0.01),
], [], []);

// the signal config: six losers that closed before the run, so a window of six closes would pause the symbol
const signalTape = makeTape(sigCfg, "follow", SIG, P, "normal", [SYM], Array.from({ length: 6 }, (_, i) => trade(sigCfg, NOW - 10 * H + i * H, -0.01)), [], []);

const opts: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  rangeCoord: undefined,
  symGate: undefined,
  coord: { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: false, s2Windows: true, s2Steps: 6, s2Pause: 6 },
  simH: 6,
  lastN: 0,
  validLastN: 0,
  robustFrac: 0,
  signalValidLastN: 0,
  signalGuardN: 0,
  signalActive: new Set([sigActiveKey("follow", SIG, SYM, 1)]),
  seatPer: "config",
};

describe("Stable-02 windows judge their own class", () => {
  it("a signal's losing closes do not pause an engine order on the same symbol and side", () => {
    const alone = walkForward(U, [engineTape], opts);
    const withSignal = walkForward(U, [engineTape, signalTape], opts);
    const engIn = (r: ReturnType<typeof walkForward>) => r.trades.filter((t) => t.cfg === engCfg && t.entryT === IN_RUN).length;
    assert.equal(engIn(alone), 1, "the engine order trades without signals");
    assert.equal(engIn(withSignal), 1, "a signal's losing record must not pause the engine order");
  });
});
