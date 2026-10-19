// Engine direction acceptance: Normal / Trailing by range, Historic Exit by tactic, DCA and Axis by family.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { configId } from "../pipeline/pipeline.ts";
import { crowdRangeOf, defaultWalkForward, execDecision, familyOf, makeTape, selectAt, selectDurable } from "./walkforward.ts";
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

  it("keeps Historic Exit tactics outside Normal ranges and independently gates each tactic", () => {
    const staticExit = makeTape(
      "exit-static",
      "follow",
      "ema-9-21@m15",
      { ...P, exitType: "historic", exitSide: -1, exitSet: "static-sl" },
      "exit",
      ["A"],
      trades(-1, -0.01, "exit"),
      [],
      [],
    );
    const trailingExit = makeTape(
      "exit-trailing",
      "follow",
      "ema-9-21@m15",
      { ...P, trail: 0.004, exitType: "historic", exitSide: -1, exitSet: "trailing" },
      "exit",
      ["A"],
      trades(-1, 0.01, "exit"),
      [],
      [],
    );
    const idx = new EngineSideIndex();
    for (const _ of idx.fill([plain, staticExit, trailingExit]));
    const staticKey = engineSideKey("exit", "mn", -1, undefined, "static-sl");
    const trailKey = engineSideKey("exit", "lg", -1, undefined, "trailing");
    assert.equal(staticKey, "exit-static-sl|independent|-1");
    assert.notEqual(staticKey, "base|wide|-1");
    assert.equal(idx.stats(staticKey, T0, 24).pf, 0);
    assert.equal(idx.stats(trailKey, T0, 24).pf, Infinity);
    assert.equal(idx.stats(engineSideKey("exit", undefined, -1, undefined, "adaptive-sl"), T0, 24).n, 0);
    const guard = new SignalGuard();
    guard.engineSide = idx;
    const g = {
      ...o,
      engineSideAccept: acc,
      toggles: { ...DEFAULT_TOGGLES, normal: false, exit: true, block: false },
    };
    assert.equal(why(execDecision(staticExit, T0, g, { guard, sym: "B", side: -1 })), "engineSide");
    assert.equal(why(execDecision(trailingExit, T0, g, { guard, sym: "B", side: -1 })), "ok");
  });

  it("keeps Exit config sets and directions on independent selection seats", () => {
    const at = T0 + 80 * H;
    const outcomes = (side: 1 | -1, cfg: string, kind: StratKind = "exit") =>
      Array.from({ length: 12 }, (_, i) => ({
        ...tr(side, 0.01, at - (12 - i) * H, kind),
        cfg,
      }));
    const exits = (["static-sl", "adaptive-sl", "trailing"] as const).flatMap((exitSet) =>
      ([1, -1] as const).map((exitSide) => {
        const protect: Protect = {
          ...P,
          trail: exitSet === "trailing" ? 0.004 : 0,
          exitType: "historic",
          exitSide,
          exitSet,
        };
        const id = configId("follow", "ema-9-21@m15", protect, "exit");
        return makeTape(id, "follow", "ema-9-21@m15", protect, "exit", ["A"], outcomes(exitSide, id), [], []);
      }),
    );
    const normal = makeTape(
      "normal-independent", "follow", "ema-9-21@m15", P, "normal", ["A"], outcomes(1, "normal-independent", "normal"), [], [],
    );
    const trailingProtect = { ...P, trail: 0.004 };
    const trailing = makeTape(
      "trailing-independent", "follow", "ema-9-21@m15", trailingProtect, "trailing", ["A"],
      outcomes(1, "trailing-independent", "trailing"), [], [],
    );
    const settings = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      longH: 24,
      preH: 24,
      durableSplits: 2,
      durableFrac: 0.5,
      lastN: 0,
      validLastN: 0,
      portfolio: 1,
      familySeats: false,
      seatPer: "pair" as const,
      robustFrac: 0,
      gates: { ...defaultWalkForward(DEFAULT_SETTINGS).gates, minTrades: 8, minDdtH: 0, maxDdtH: 1_000, maxDdr: 0 },
      toggles: { ...DEFAULT_TOGGLES, normal: true, trailing: true, exit: true, block: false },
    };
    for (const familySeats of [false, true]) {
      const result = selectAt([normal, trailing, ...exits], at, { ...settings, familySeats });
      assert.equal(result.picks.length, 8, `all independent seats remain selectable (familySeats=${familySeats})`);
      assert.equal(new Set(result.picks.map((p) => p.id)).size, 8, "each family is processed once");
      assert.deepEqual(
        new Set(result.picks.map((p) => p.id)),
        new Set([normal, trailing, ...exits].map((p) => p.id)),
      );
    }
    const noBasePass = { ...settings, basePassed: new Set<string>() };
    const hourlyWithoutBase = selectAt([normal, trailing, ...exits], at, noBasePass);
    assert.equal(hourlyWithoutBase.picks.length, 6);
    assert.ok(
      hourlyWithoutBase.picks.every((pick) => exits.some((candidate) => candidate.id === pick.id)),
      "Exit configs are judged by their own PF history even when Base admitted no pairs",
    );
    const durableWithoutBase = selectDurable([normal, trailing, ...exits], at, noBasePass, new Set());
    assert.equal(durableWithoutBase.picks.length, 6);
    assert.ok(
      durableWithoutBase.picks.every((pick) => exits.some((candidate) => candidate.id === pick.id)),
      "durable selection applies the same independent Exit admission rule",
    );
    assert.equal(familyOf("exit", "static-sl", 1), "exit-static-sl-long");
    assert.equal(familyOf("exit", "static-sl", -1), "exit-static-sl-short");
    assert.notEqual(familyOf("exit", "static-sl", 1), familyOf("exit", "adaptive-sl", 1));
    assert.equal(crowdRangeOf(exits[0].id), "exit");
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

  it("excludeRanges: a listed range opens nothing new (skip rangeOff); other ranges and the wide grid are untouched", () => {
    const mc = tape("m", "normal", trades(1, 0.01), "mc");
    const sh = tape("s", "normal", trades(1, 0.01), "sh");
    const x = { ...o, excludeRanges: ["mc"] };
    assert.equal(why(execDecision(mc, T0, x, { guard, sym: "B", side: 1 })), "rangeOff");
    assert.equal(why(execDecision(sh, T0, x, { guard, sym: "B", side: 1 })), "ok");
    assert.equal(why(execDecision(plain, T0, x, { guard, sym: "B", side: 1 })), "ok");
    assert.equal(why(execDecision(mc, T0, o, { guard, sym: "B", side: 1 })), "ok");
  });

  it("seat cool-off (seatQuietH): a config that closed within H hours before the entry waits; closes after it never count", () => {
    // the config's last close at T0 − 2 h; one at T0 + 30 min (after the entry) must not be seen
    const tp = tape("q", "normal", [tr(1, 0.01, T0 - 6 * H), tr(1, 0.01, T0 - 2 * H), tr(1, 0.01, T0 + 30 * 60_000)]);
    const q = { ...o, seatQuietH: 4 };
    assert.equal(why(execDecision(tp, T0, q, { guard, sym: "B", side: 1 })), "seatQuiet", "closed 2 h before: waits");
    assert.equal(why(execDecision(tp, T0, { ...o, seatQuietH: 2 }, { guard, sym: "B", side: 1 })), "ok", "exactly 2 h: free");
    // an entry at T0 − 3 h sees only the close at T0 − 6 h (3 h old): free under 2 h, waits under 4 h
    assert.equal(why(execDecision(tp, T0 - 3 * H, { ...o, seatQuietH: 2 }, { guard, sym: "B", side: 1 })), "ok");
    assert.equal(why(execDecision(tp, T0 - 3 * H, q, { guard, sym: "B", side: 1 })), "seatQuiet");
    assert.equal(why(execDecision(tp, T0, o, { guard, sym: "B", side: 1 })), "ok", "off by default");
    // signals are not cooled off by it
    const sig = makeTape("s", "follow", "sig-ema-cross-s@m15", P, "normal", ["A"], [tr(1, 0.01, T0 - H)], [], []);
    assert.notEqual(why(execDecision(sig, T0, q, { guard, sym: "A", side: 1 })), "seatQuiet");
  });

  it("perInd: a range's group split by indication — a winning indication trades while the pooled range loses", async () => {
    const { engineSideKeyFor } = await import("../signals.ts");
    const mk = (ind: string, r: number) =>
      makeTape(`x|${ind}|mc`, "follow", ind, { ...P, tag: "mc" } as Protect, "normal", ["A"], trades(1, r), [], []);
    const good = mk("mc-rsi3-10@m5c", 0.004);
    const bad = mk("mc-rsi2-5@m5", -0.012);
    const ix = new EngineSideIndex();
    for (const _ of ix.fill([good, bad]));
    const g = new SignalGuard();
    g.engineSide = ix;
    assert.equal(engineSideKeyFor("normal", "mc", 1, good.ind, ["mc"]), "base|mc|1|mc-rsi3-10@m5c");
    assert.equal(engineSideKeyFor("normal", "sh", 1, good.ind, ["mc"]), "base|sh|1", "other ranges stay pooled");
    const pooled = { ...o, engineSideAccept: acc };
    const split = { ...o, engineSideAccept: { ...acc, perInd: ["mc"] } };
    assert.equal(why(execDecision(good, T0, pooled, { guard: g, sym: "B", side: 1 })), "engineSide", "pooled: blocked by the loser");
    assert.equal(why(execDecision(good, T0, split, { guard: g, sym: "B", side: 1 })), "ok");
    assert.equal(why(execDecision(bad, T0, split, { guard: g, sym: "B", side: 1 })), "engineSide");
  });

  it("perInd: a thin indication group (fewer than minTrades) is judged by its pooled range group, not accepted", () => {
    const mk = (ind: string, r: number, n: number) =>
      makeTape(`y|${ind}|mc`, "follow", ind, { ...P, tag: "mc" } as Protect, "normal", ["A"], trades(-1, r).slice(0, n), [], []);
    const thin = mk("mc-bbx-25@m15c", 0.004, 5);
    const pool = mk("mc-rsi2-5@m5", -0.012, 40);
    const ix = new EngineSideIndex();
    for (const _ of ix.fill([thin, pool]));
    const g = new SignalGuard();
    g.engineSide = ix;
    const split = { ...o, engineSideAccept: { ...acc, perInd: ["mc"] } };
    assert.equal(why(execDecision(thin, T0, split, { guard: g, sym: "B", side: -1 })), "engineSide", "the losing pooled group decides");
  });

  it("the slimmed tape set reuses the full set's index (no rebuild on the live tick, the simulation's record)", async () => {
    const { carryGuardIndices, engineSideIndexGen } = await import("./walkforward.ts");
    const full = [plain, axis];
    const drainGen = <T>(g: Generator<number, T>): T => {
      for (;;) {
        const r = g.next();
        if (r.done) return r.value;
      }
    };
    const built = drainGen(engineSideIndexGen(full));
    const slim = [plain];
    carryGuardIndices(full, slim);
    assert.equal(drainGen(engineSideIndexGen(slim)), built, "the same index instance: nothing rebuilt");
    // Axis shorts (dropped from the slim set) still count in the record, as in the simulation
    assert.ok(built.stats("axis|wide|-1", T0, 24).n > 0);
  });

  it("the exchange record reaches the direction acceptance only through the live guard", async () => {
    const { exchangeAcceptIndex } = await import("../live-record.ts");
    // the simulation accepts plain longs; the desk's own exchange closes of that group all lost
    const ex = exchangeAcceptIndex(
      Array.from({ length: 40 }, (_, i) => ({ cfg: "follow|ema-9-21@m15|tp2|sl2|tr0|h32", sym: "B", side: 1, exitT: T0 - 2 * H + i * 60_000, r: -0.01 })),
    );
    const g = { ...o, engineSideAccept: acc };
    const live = new SignalGuard();
    live.engineSide = idx;
    live.exchange = ex;
    assert.equal(why(execDecision(plain, T0, g, { guard: live, sym: "B", side: 1 })), "engineSide");
    // the shared index is untouched: a simulation's guard on it still accepts
    assert.equal(why(execDecision(plain, T0, g, { guard, sym: "B", side: 1 })), "ok");
  });
});
