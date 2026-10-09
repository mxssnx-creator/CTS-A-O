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
// the mechanism tests below are written for entry last 25, validation last 50, no signal last-N and a strict floor
// (the defaults before 6 Oct); they are pinned here so a change of the defaults does not change what they test
const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  lastN: 25,
  validLastN: 50,
  signalValidLastN: 0,
  gates: { ...defaultWalkForward(DEFAULT_SETTINGS).gates, lastNFloor: 0 },
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
    const o = { ...base, signalValidLastN: undefined, signalActive: new Set(["follow|sig-ema-cross-s@m15|AAA-USDT|1"]) };
    const d = execDecision(sig, at, o, { sym: "AAA-USDT", side: 1 });
    assert.deepEqual(d, { ok: false, why: "signalValid" });
    assert.equal(walkForward(u, [sig], o).trades.length, 0);
    // a signal whose last 50 clear min PF trades
    const good = tape(SIG, "sig-ema-cross-s@m15", 10);
    assert.equal(execDecision(good, at, o, { sym: "AAA-USDT", side: 1 }).ok, true);
  });

  it("a signal validates on its own last N: a 12-close signal config can trade, a losing one cannot", () => {
    // the default runs no extra signal validation (the acceptance gate judges signals); a set last N still applies
    // the code default since 6 Oct: signals validate on their own last 25 (the best window on the same tapes)
    assert.equal(defaultWalkForward(DEFAULT_SETTINGS).signalValidLastN, 25, "default");
    const o = { ...base, signalValidLastN: 10, signalActive: new Set(["follow|sig-ema-cross-s@m15|AAA-USDT|1"]) };
    const ctx = { sym: "AAA-USDT", side: 1 };
    // the last 12 closes and the entry; the last `lose` of the 12 are losers
    const only = (id: string, ind: string, lose: number) => {
      const xs = trades(id, 0).slice(-13);
      for (let i = 12 - lose; i < 12; i++) Object.assign(xs[i], { r: -0.01, reason: "sl" });
      return makeTape(id, "follow", ind, P, "normal", ["AAA-USDT"], xs, [], []);
    };
    const sig = (lose: number) => only(SIG, "sig-ema-cross-s@m15", lose);
    // 12 closes, all winners: the engine's 50 / 25 cannot pass on 12 closes, warm-up or not (the warm-up waives the
    // drawdown half of a partial sample, never the result). The signal's own 10 are what let it through.
    assert.deepEqual(execDecision(sig(0), at, { ...o, signalValidLastN: undefined }, ctx), {
      ok: false,
      why: "signalValid",
    });
    assert.deepEqual(
      execDecision(sig(0), at, { ...o, signalValidLastN: undefined, gates: { ...o.gates, warmup: false } }, ctx),
      { ok: false, why: "signalValid" },
    );
    assert.equal(execDecision(sig(0), at, o, ctx).ok, true);
    // the last 10 losing: still blocked
    assert.equal(execDecision(sig(10), at, o, ctx).ok, false);
    // an engine config keeps the engine's last N: 12 closes cannot clear a 50-close gate, warm-up or not
    const eng12 = only(ENG, "rsi-mom-14-20@m15", 0);
    assert.equal(execDecision(eng12, at, { ...o, gates: { ...o.gates, warmup: false } }, ctx).ok, false);
    assert.equal(execDecision(eng12, at, o, ctx).ok, false);
    assert.equal(execDecision(only(ENG, "rsi-mom-14-20@m15", 12), at, o, ctx).ok, false);
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
    // no position cap by default (operator: process freely, many orders) — the cap is not what limits the targets
    assert.equal(DEFAULT_SETTINGS.live.maxPositions, 0, "no control position cap by default");
    assert.ok(targets.length > 100, `${targets.length} targets without a cap`);
    // set one and engine and signal positions share it
    const capped = controlTargets(
      lanes,
      prices,
      controlSettingsOf({ ...DEFAULT_SETTINGS.live, maxPositions: 8 }, 6, DEFAULT_SETTINGS.signals.maxPositions),
    );
    assert.equal(capped.targets.length, 8, "one cap for engine and signal positions together");
  });
});

describe("last-N floor (gates.lastNFloor): a short pre-calculation still seats configs that close rarely", () => {
  it("strict by default; with a floor, fewer than N closes are judged on all of them", async () => {
    const { lastNOk, makeTape } = await import("./walkforward.ts");
    const H0 = Date.UTC(2026, 9, 4);
    const xs = Array.from({ length: 8 }, (_, i) => ({
      cfg: "c", sym: "A-USDT", side: 1 as const, entryT: H0 + i * 3_600_000, exitT: H0 + i * 3_600_000 + 1_800_000,
      entry: 1, exit: 1.03, r: i === 3 ? -0.02 : 0.03, reason: i === 3 ? "sl" : "tp", bars: 2, mfe: 0, mae: 0, kind: "normal" as const,
    }));
    const tp = makeTape("c", "revert", "rsi-14@m30", { tp: 0.03, sl: 0.02, trail: 0, hold: 8, tag: "lg" } as never, "normal", ["A-USDT"], xs as never, [], []);
    const at = H0 + 20 * 3_600_000;
    // the RESULT half is never waived: without its 35 closes the gate fails, warm-up or not, unless lastNFloor
    // admits the partial sample. (Measured: waiving it too cost the 12 h window PF 1.108 → 0.818.)
    assert.equal(lastNOk(tp, at, 35, 1.05), false, "8 closes < 35: no last-35 judgement is possible");
    assert.equal(lastNOk(tp, at, 35, 1.05, 0, 0, 0, false), false, "warm-up off: the same");
    assert.equal(lastNOk(tp, at, 35, 1.05, 0, 0, 5), true, "floor 5: judged on all 8 (PF > 1.05)");
    assert.equal(lastNOk(tp, at, 35, 1.05, 0, 0, 5, false), true, "warm-up off with floor 5: judged on all 8");
    assert.equal(lastNOk(tp, at, 35, 20, 0, 0, 5), false, "judged on all 8: PF below 20 fails");
    assert.equal(lastNOk(tp, at, 35, 1.05, 0, 0, 10), false, "8 < floor 10: fails");
    // once the closes are there the gate is judged normally, warm-up or not
    assert.equal(lastNOk(tp, at, 8, 20), false, "8 of 8 closes: PF below 20 fails");
    assert.equal(lastNOk(tp, at, 8, 1.05), true, "8 of 8 closes: PF above 1.05 passes");
    // what the warm-up waives is the DRAWDOWN half of a partial sample, not the result
    assert.equal(lastNOk(tp, at, 35, 1.05, 0.001, 0, 5), true, "floor 5: the drawdown of 8 of 35 is not judged");
    assert.equal(lastNOk(tp, at, 35, 1.05, 0.001, 0, 5, false), false, "warm-up off: it is judged and fails");
    assert.equal(lastNOk(tp, at, 8, 1.05, 0.001, 0), false, "8 of 8: the drawdown-time gate is judged");
  });
});

// Operator, 5 Oct: "if no DDT available because of too few previous positions, calculate as valid until enough
// existing, then evaluate normally" — and "keep all processing" at the Base sets stage (PF 1+).
describe("sample warm-up (gates.warmup): a check that cannot be computed yet is valid, then judged normally", () => {
  it("the per-symbol 'proven' gate no longer refuses a symbol it has too few closes on", async () => {
    const { execDecision, makeTape, defaultWalkForward } = await import("./walkforward.ts");
    const { DEFAULT_SETTINGS } = await import("../config.ts");
    const H0 = Date.UTC(2026, 9, 4);
    // 30 winning closes on A, exactly one on B (below symMinN 2): B cannot be judged yet
    const xs = Array.from({ length: 31 }, (_, i) => ({
      cfg: "c", sym: i === 30 ? "B-USDT" : "A-USDT", side: 1 as const,
      entryT: H0 + i * 3_600_000, exitT: H0 + i * 3_600_000 + 1_800_000,
      entry: 1, exit: 1.03, r: 0.03, reason: "tp", bars: 2, mfe: 0, mae: 0, kind: "normal" as const,
    }));
    const tp = makeTape("c", "revert", "rsi-14@m30", { tp: 0.03, sl: 0.02, trail: 0, hold: 8 } as never,
      "normal", ["A-USDT", "B-USDT"], xs as never, [], []);
    const at = H0 + 40 * 3_600_000;
    const o = { ...defaultWalkForward(DEFAULT_SETTINGS), symGate: "proven" as const, symMinN: 2, lastN: 0, validLastN: 0 };
    const ctx = { sym: "B-USDT", side: 1 as const };
    assert.equal(execDecision(tp, at, o, ctx as never).ok, true, "warm-up: B's single winning close is judged");
    const strict = { ...o, gates: { ...o.gates, warmup: false } };
    const d = execDecision(tp, at, strict, ctx as never);
    assert.equal(d.ok, false, "warm-up off: 'proven' refuses a symbol with fewer than 2 closes");
    assert.equal(d.ok === false ? d.why : "", "symPf");
    // a symbol it HAS closes on is judged normally either way
    assert.equal(execDecision(tp, at, strict, { sym: "A-USDT", side: 1 } as never).ok, true, "A is proven");
    // a symbol whose one close LOST is refused by the warm-up too: the result there is judged, not waved through
    const lost = xs.map((x, i) => (i === 30 ? { ...x, exit: 0.98, r: -0.02, reason: "sl" } : x));
    const tpL = makeTape("c", "revert", "rsi-14@m30", { tp: 0.03, sl: 0.02, trail: 0, hold: 8 } as never,
      "normal", ["A-USDT", "B-USDT"], lost as never, [], []);
    const dl = execDecision(tpL, at, o, ctx as never);
    assert.equal(dl.ok, false, "a losing close on B refuses B");
    assert.equal(dl.ok === false ? dl.why : "", "symPf");
  });

  it("the stability blocks pass while fewer than two blocks carry a sample", async () => {
    const { stableOk, makeTape } = await import("./walkforward.ts");
    const H0 = Date.UTC(2026, 9, 4);
    // three closes inside one hour: only one block of a 24 h / 6-block window can have a sample
    const xs = Array.from({ length: 3 }, (_, i) => ({
      cfg: "c", sym: "A-USDT", side: 1 as const, entryT: H0 + i * 60_000, exitT: H0 + i * 60_000 + 30_000,
      entry: 1, exit: 1.03, r: 0.03, reason: "tp", bars: 2, mfe: 0, mae: 0, kind: "normal" as const,
    }));
    const tp = makeTape("c", "revert", "rsi-14@m30", { tp: 0.03, sl: 0.02, trail: 0, hold: 8 } as never,
      "normal", ["A-USDT"], xs as never, [], []);
    const at = H0 + 24 * 3_600_000;
    assert.equal(stableOk(tp, at, 24, 6, 1.05), true, "one active block: valid until there are two");
    // the blocks that DO carry a sample are judged either way
    assert.equal(stableOk(tp, at, 24, 6, 1.05, false), false, "warm-up off: fewer than two active blocks fails");
  });

  it("Base computes a pair's sets from PF 1 up, and every range keeps its own trading minimum", async () => {
    const { DEFAULT_GATES } = await import("../config.ts");
    const { baseSetsGates, passesBase } = await import("../pipeline/pipeline.ts");
    const { minPfOf } = await import("../minimal-coord.ts");
    assert.equal(DEFAULT_GATES.baseSetsMinPf, 1, "the sets floor");
    assert.equal(DEFAULT_GATES.warmup, true, "the sample warm-up is on");
    const sets = baseSetsGates(DEFAULT_GATES);
    assert.equal(sets.minPf, 1);
    assert.equal(sets.rangeMinPf, undefined, "one floor for every range at the sets stage");
    // a set at PF 1.02 is built and evaluated, and still has to clear its range minimum to trade
    const st = { n: 40, pf: 1.02, net: 0.5 };
    assert.equal(passesBase(st, sets), true, "built and evaluated");
    // each range keeps its own minimum (operator defaults: micro 1.02, minimal 1.05, general 1.2, long 1.5): a set exactly at
    // its minimum is built and trades, a set just below it does not
    for (const tag of ["mc", "mn", "gn", "lg"]) {
      const min = minPfOf(DEFAULT_GATES, tag);
      assert.equal(passesBase({ ...st, pf: min }, { ...DEFAULT_GATES, minPf: min }), true, `${tag} at its minimum`);
      assert.equal(passesBase({ ...st, pf: min - 0.01 }, { ...DEFAULT_GATES, minPf: min }), false, `${tag} below its minimum`);
    }
  });
});
