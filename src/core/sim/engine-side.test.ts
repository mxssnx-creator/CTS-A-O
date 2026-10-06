// Engine direction acceptance: each type family (Normal + Trailing / DCA / Axis) × range × side opens only while its
// candidates' record over the last whole hours clears the PF — the losing side pauses alone, the others trade.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, execDecision, makeTape } from "./walkforward.ts";
import { EngineSideIndex, engineSideKey, SignalGuard } from "../signals.ts";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "../config.ts";
import type { Protect, StratKind, Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = 100 * H;
const P: Protect = { tp: 0.02, sl: 0.02, trail: 0, hold: 32 };
const tr = (side: 1 | -1, r: number, exitT: number, kind: StratKind = "normal") =>
  ({ cfg: "c", sym: "A", side, entryT: exitT - 60_000, exitT, entry: 1, exit: 1 + side * r, r, reason: "tp", bars: 1, mfe: 0, mae: 0, kind }) as Trade;
const tape = (id: string, kind: StratKind, trades: Trade[], tag?: string) =>
  makeTape(id, "follow", "ema-9-21@m15", { ...P, ...(tag ? { tag } : {}) } as Protect, kind, ["A"], trades, [], []);

describe("engine direction acceptance (engineSideAccept)", () => {
  // a rally: every short candidate of the plain base loses, longs win; Axis shorts win
  const trades = (side: 1 | -1, r: number, kind: StratKind = "normal") =>
    Array.from({ length: 40 }, (_, i) => tr(side, r, T0 - 20 * H + i * 15 * 60_000, kind));
  const plain = tape("p", "normal", [...trades(1, 0.01), ...trades(-1, -0.01)].sort((a, b) => a.exitT - b.exitT));
  const axis = tape("a", "axis", trades(-1, 0.008, "axis"));
  const idx = new EngineSideIndex();
  for (const _ of idx.fill([plain, axis]));
  const guard = new SignalGuard();
  guard.engineSide = idx;
  const acc = { enabled: true, minPf: 1.05, hours: 24, minTrades: 30 };
  const o = {
    ...defaultWalkForward(DEFAULT_SETTINGS),
    lastN: 0,
    validLastN: 0,
    symGate: undefined,
    toggles: { ...DEFAULT_TOGGLES, normal: true, trailing: true, axis: true, block: false },
    // off here (on by default since 6 Oct): each case switches it on itself
    engineSideAccept: { enabled: false, minPf: 1.05, hours: 24, minTrades: 30 },
  };
  const why = (d: ReturnType<typeof execDecision>) => (d.ok ? "ok" : d.why);

  it("groups by type family × range × side; the losing short base pauses, its long side and Axis shorts trade", () => {
    assert.equal(engineSideKey("trailing", undefined, -1), "base|wide|-1");
    assert.equal(engineSideKey("dca-active", "sh", 1), "dca|sh|1");
    const g = { ...o, engineSideAccept: acc };
    assert.equal(why(execDecision(plain, T0, g, { guard, sym: "B", side: -1 })), "engineSide");
    assert.equal(why(execDecision(plain, T0, g, { guard, sym: "B", side: 1 })), "ok");
    assert.notEqual(why(execDecision(axis, T0, g, { guard, sym: "B", side: -1 })), "engineSide");
    // off: shorts open
    assert.equal(why(execDecision(plain, T0, o, { guard, sym: "B", side: -1 })), "ok");
  });

  it("causal: closes in the entry's own hour are not seen; too few closes in twice the window opens; old hours leave both windows", () => {
    const one = new EngineSideIndex();
    const t = 50 * H;
    for (const _ of one.fill([tape("q", "normal", Array.from({ length: 40 }, (_, i) => tr(-1, -0.01, t + 60_000 + i * 1000)))]));
    // all 40 losses close inside hour 50: an entry in hour 50 does not see them, one in hour 51 does
    assert.equal(one.stats("base|wide|-1", t + 30 * 60_000, 24).n, 0);
    assert.equal(one.stats("base|wide|-1", t + H, 24).n, 40);
    assert.equal(one.accepts("base|wide|-1", t + H, acc), false);
    // 40 closes under a 41-close minimum, in 24 h and in 48 h: no sample to judge — valid
    assert.equal(one.accepts("base|wide|-1", t + H, { ...acc, minTrades: 41 }), true, "not judged below minTrades in twice the hours");
    // 26 h on the 24 h window is empty; twice the hours still hold the 40 losses — refused
    assert.equal(one.accepts("base|wide|-1", t + 26 * H, acc), false, "48 h still sees the losses");
    // past 48 h both windows are empty — valid again
    assert.equal(one.accepts("base|wide|-1", t + 50 * H, acc), true, "older than 48 h");
  });

  it("recovers: once the side's recent hours clear the PF it opens again", () => {
    const t = 200 * H;
    const xs = [
      ...Array.from({ length: 40 }, (_, i) => tr(-1, -0.01, t - 30 * H + i * 60_000)),
      ...Array.from({ length: 40 }, (_, i) => tr(-1, 0.012, t - 10 * H + i * 60_000)),
    ];
    const ix = new EngineSideIndex();
    for (const _ of ix.fill([tape("r", "normal", xs)]));
    assert.equal(ix.accepts("base|wide|-1", t - 20 * H, acc), false);
    assert.equal(ix.accepts("base|wide|-1", t, acc), true);
  });
});
