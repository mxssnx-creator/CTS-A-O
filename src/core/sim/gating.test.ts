// Nothing unvalidated executes: signal configs need the same validation as engine configs, only pairs that passed
// Base take a seat, a seat needs min-trades closes in its window, and live has one position cap for engine and
// signal positions together.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWalkForward,
  execDecision,
  makeTape,
  selectFixed,
  walkForward,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { controlTargets, type ControlContribution } from "../server/live.ts";
import { controlSettingsOf } from "../server/live.server.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
/** 100 hourly closes (`lose` losers first, then winners) and one entry inside the simulated window. */
function trades(cfg: string, lose: number): Trade[] {
  const mk = (r: number, entryT: number): Trade =>
    ({
      cfg,
      sym: "AAA-USDT",
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
  for (let i = 0; i < 100; i++) out.push(mk(i < lose ? -0.01 : 0.01, NOW - 120 * H + i * H));
  out.push(mk(0.01, NOW - 2 * H + 10 * 60_000));
  return out;
}
const SIG = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32";
const ENG = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
const tape = (id: string, ind: string, lose: number) =>
  makeTape(id, "follow", ind, P, "normal", ["AAA-USDT"], trades(id, lose), [], []);
const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
};
const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;
const at = NOW - 2 * H + 10 * 60_000;

describe("gating: nothing unvalidated executes", () => {
  it("a signal config needs the seat validation (last 50 at min PF) like an engine config", () => {
    // 75 losers then 25 winners: the last 25 pass, the last 50 (PF 25 / 25 = 1) do not
    const sig = tape(SIG, "sig-ema-cross-s@m15", 75);
    // signals on the engine's last N (no signal-specific length)
    const o = { ...base, signalValidLastN: undefined, signalActive: new Set(["follow|sig-ema-cross-s@m15|AAA-USDT"]) };
    const d = execDecision(sig, at, o, { sym: "AAA-USDT", side: 1 });
    assert.deepEqual(d, { ok: false, why: "signalValid" });
    assert.equal(walkForward(u, [sig], o).trades.length, 0);
    // a signal whose last 50 clear min PF trades
    const good = tape(SIG, "sig-ema-cross-s@m15", 10);
    assert.equal(execDecision(good, at, o, { sym: "AAA-USDT", side: 1 }).ok, true);
  });

  it("a signal validates on its own last N: a 12-close signal config can trade, a losing one cannot", () => {
    // the default runs no extra signal validation (the acceptance gate judges signals); a set last N still applies
    assert.equal(base.signalValidLastN, 0, "default");
    const o = { ...base, signalValidLastN: 10, signalActive: new Set(["follow|sig-ema-cross-s@m15|AAA-USDT"]) };
    const ctx = { sym: "AAA-USDT", side: 1 };
    // the last 12 closes and the entry; the last `lose` of the 12 are losers
    const only = (id: string, ind: string, lose: number) => {
      const xs = trades(id, 0).slice(-13);
      for (let i = 12 - lose; i < 12; i++) Object.assign(xs[i], { r: -0.01, reason: "sl" });
      return makeTape(id, "follow", ind, P, "normal", ["AAA-USDT"], xs, [], []);
    };
    const sig = (lose: number) => only(SIG, "sig-ema-cross-s@m15", lose);
    // 12 closes, all winners: the engine's 50 / 25 could never pass, the signal's own 10 do
    assert.deepEqual(execDecision(sig(0), at, { ...o, signalValidLastN: undefined }, ctx), {
      ok: false,
      why: "signalValid",
    });
    assert.equal(execDecision(sig(0), at, o, ctx).ok, true);
    // the last 10 losing: still blocked
    assert.equal(execDecision(sig(10), at, o, ctx).ok, false);
    // an engine config keeps the engine's last N
    assert.equal(execDecision(only(ENG, "rsi-mom-14-20@m15", 0), at, o, ctx).ok, false);
  });

  it("only pairs that passed Base take a seat", () => {
    const eng = tape(ENG, "rsi-mom-14-20@m15", 10);
    assert.equal(selectFixed([eng], NOW - 3 * H, base).picks.length, 1, "no Base restriction: seated");
    const without = { ...base, basePassed: new Set(["follow|other@m15"]) };
    assert.equal(selectFixed([eng], NOW - 3 * H, without).picks.length, 0, "pair not in Base: no seat");
    const withIt = { ...base, basePassed: new Set(["follow|rsi-mom-14-20@m15"]) };
    assert.equal(selectFixed([eng], NOW - 3 * H, withIt).picks.length, 1);
  });

  it("a seat needs min-trades closes in its window even with the seat validation off", () => {
    const few = [0, 1, 2].map(
      (i) =>
        ({
          ...trades(ENG, 0)[0],
          entryT: NOW - 30 * H + i * 2 * H,
          exitT: NOW - 30 * H + i * 2 * H + 30 * 60_000,
        }) as Trade,
    );
    const tp = makeTape(ENG, "follow", "rsi-mom-14-20@m15", P, "normal", ["AAA-USDT"], few, [], []);
    assert.equal(selectFixed([tp], NOW, { ...base, validLastN: 0 }).picks.length, 0, "3 closes < 12");
  });

  it("live: one position cap for engine and signal positions together", () => {
    const lanes: ControlContribution[] = [];
    const prices = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      const sym = `S${i}-USDT`;
      prices.set(sym, 10);
      const ind = i < 50 ? "rsi-mom-14-20@m15" : "sig-ema-cross-s@m15";
      for (let k = 0; k < 3; k++)
        lanes.push({ id: `${sym}|${k}`, cfg: `follow|${ind}|tp1|sl1|tr0|h32|${k}`, sym, side: 1, vol: 1, sl: 0.02 });
    }
    const cs = controlSettingsOf(DEFAULT_SETTINGS.live, 6, DEFAULT_SETTINGS.signals.maxPositions);
    const { targets } = controlTargets(lanes, prices, cs);
    assert.equal(targets.length, DEFAULT_SETTINGS.live.maxPositions);
  });
});
