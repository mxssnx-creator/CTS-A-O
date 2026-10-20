import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { StratKind, Trade } from "./domain/types.ts";
import { configId } from "./pipeline/pipeline.ts";
import { liveLaneFilter } from "./server/live.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { closePool } from "./server/pool.server.ts";
import { signalSettings } from "./signal-config.ts";
import { acceptKey, acceptOnWindow, SignalAcceptIndex, SignalGuard, signalActiveHas, signalSeatSymbols, sigActiveKey } from "./signals.ts";
import { activeSignalsAt, defaultWalkForward, execDecision, hedgeSignalsAt, makeTape, signalIndex, walkForward } from "./sim/walkforward.ts";

const H = 3_600_000;
const NOW = 100 * H;
const IND = "sig-ema-cross-s@m15";
const SYM = "A-USDT";
after(() => closePool());
function tape(kind: StratKind, rs: number[], ind = IND, tp = 0.03) {
  const protect = kind === "trailing-only"
    ? { tp: 0, sl: 0.06, trail: 0.015, trailOnly: true, hold: 192 }
    : { tp, sl: 0.06, trail: kind === "trailing" ? 0.015 : 0, hold: 192 };
  const id = configId("follow", ind, protect);
  const trades: Trade[] = rs.map((r, i) => ({
    cfg: id, sym: SYM, side: 1, entryT: (80 + i) * H, exitT: (90 + i) * H,
    entry: 100, exit: 100 * (1 + r), r, reason: r > 0 ? "tp" : "sl", bars: 40, mfe: 0, mae: 0, kind,
  }));
  return makeTape(id, "follow", ind, protect, kind, [SYM], trades, [], []);
}
const rank = signalSettings({ enabled: true, count: 0, minTrades: 4, rank: "drawdown", minBlockShare: 0, validate: false });
const key = (kind: "normal" | "trailing" | "trailing-only") => sigActiveKey("follow", IND, SYM, 1, kind, tape(kind, []).id);

describe("independent signal qualification", () => {
  it("empty or losing Trailing configs cannot dilute a winning Normal type", () => {
    const normal = tape("normal", Array(6).fill(0.01));
    const expected = [key("normal")];
    assert.deepEqual([...activeSignalsAt([normal], NOW, rank, 48)], expected);
    assert.deepEqual([...activeSignalsAt([normal, tape("trailing", [])], NOW, rank, 48)], expected);
    assert.deepEqual([...activeSignalsAt([normal, tape("trailing", Array(6).fill(-0.02))], NOW, rank, 48)], expected);
  });

  it("a winning Trailing type cannot qualify its losing Normal sibling, including hedge selection", () => {
    const tapes = [tape("normal", Array(6).fill(-0.01)), tape("trailing", Array(6).fill(0.02))];
    const index = signalIndex(tapes);
    assert.deepEqual([...activeSignalsAt(index, NOW, rank, 48)], [key("trailing")]);
    assert.deepEqual([...hedgeSignalsAt(index, NOW, new Set([90, 91, 92, 93, 94, 95]), 48, { minN: 4, minPf: 1.3 })], [key("trailing")]);
  });

  it("Normal and Trailing remain distinct through simulation, live filtering and seated statistics", () => {
    const normal = tape("normal", Array(6).fill(0.01));
    const trailing = tape("trailing", []);
    const active = new Set([key("normal")]);
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const options = {
      ...base, signalActive: active, lastN: 0, validLastN: 0, signalValidLastN: 0,
      signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
      signalOwnBase: true, symGate: undefined, gates: { ...base.gates, minTrades: 3, maxDdr: 0, minGreen: 0 },
      toggles: { ...base.toggles, normal: true, trailing: true, block: false, blockActive: false },
    };
    assert.equal(execDecision(normal, NOW, options, { sym: SYM, side: 1 }).ok, true);
    const refused = execDecision(trailing, NOW, options, { sym: SYM, side: 1 });
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.equal(refused.why, "signalInactive");
    const live = liveLaneFilter({ source: "signals" }, new Set(), active);
    const lane = (cfg: string) => ({ cfg, sym: SYM, side: 1 as const, vol: 1 });
    assert.equal(live.validLane(lane(normal.id)), true);
    assert.equal(live.validLane(lane(trailing.id)), false);
    assert.deepEqual([...signalSeatSymbols(normal, active)], [0]);
    assert.deepEqual([...signalSeatSymbols(trailing, active)], []);
  });

  it("legacy Base/discovery keys never authorize any unmeasured strategy type", () => {
    const legacy = sigActiveKey("follow", IND, SYM, 1);
    for (const kind of ["normal", "trailing", "trailing-only"])
      assert.equal(signalActiveHas(new Set([legacy]), "follow", IND, SYM, 1, kind, tape("normal", []).id), false);
    for (const kind of ["", " ", undefined, null])
      assert.equal(signalActiveHas(new Set([legacy]), "follow", IND, SYM, 1, kind as string, tape("normal", []).id), false);
    assert.equal(signalActiveHas(new Set([sigActiveKey("follow", IND, SYM, 1, "normal")]),
      "follow", IND, SYM, 1, "normal", tape("normal", []).id), false);
    const mixed = new Set([legacy, key("normal")]);
    assert.equal(signalActiveHas(mixed, "follow", IND, SYM, 1, "normal", tape("normal", []).id), true);
    assert.equal(signalActiveHas(mixed, "follow", IND, SYM, 1, "trailing", tape("trailing", []).id), false);
    assert.equal(signalActiveHas(new Set([key("normal")]), "follow", IND, SYM, -1, "normal", tape("normal", []).id), false);
  });

  it("malformed directions never borrow an independently qualified long or short key", () => {
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const invalid = [0, -0, 2, -2, NaN, Infinity, -Infinity, undefined, null, "1", "-1"];
    for (const kind of ["normal", "trailing", "trailing-only"] as const) {
      const tp = tape(kind, []);
      const active = new Set([1, -1].map((side) => sigActiveKey("follow", IND, SYM, side, kind, tp.id)));
      const options = {
        ...base, signalActive: active, lastN: 0, validLastN: 0, signalValidLastN: 0,
        signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
        signalOwnBase: true, symGate: undefined,
        toggles: { ...base.toggles, normal: true, trailing: true, block: false, blockActive: false },
      };
      const live = liveLaneFilter({ source: "signals" }, new Set(), active);
      for (const side of [1, -1]) {
        assert.equal(signalActiveHas(active, "follow", IND, SYM, side, kind, tp.id), true);
        assert.equal(execDecision(tp, NOW, options, { sym: SYM, side }).ok, false, "typed activation alone cannot qualify an empty own history");
      }
      for (const rawSide of invalid) {
        const side = rawSide as 1 | -1;
        assert.equal(signalActiveHas(active, "follow", IND, SYM, side, kind, tp.id), false, String(rawSide));
        assert.deepEqual(execDecision(tp, NOW, options, { sym: SYM, side }), { ok: false, why: "signalInactive" });
        assert.equal(live.validLane({ cfg: tp.id, sym: SYM, side, vol: 1 }), false);
      }
    }
  });

  it("an untyped recovered key supplies no execution, live or seated evidence", () => {
    const active = new Set([sigActiveKey("follow", IND, SYM, 1)]);
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const options = {
      ...base, signalActive: active, lastN: 0, validLastN: 0, signalValidLastN: 0,
      signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
      signalOwnBase: true, symGate: undefined,
      toggles: { ...base.toggles, normal: true, trailing: true, block: false, blockActive: false },
    };
    const live = liveLaneFilter({ source: "signals" }, new Set(), active);
    for (const kind of ["normal", "trailing", "trailing-only"] as const) {
      const tp = tape(kind, []);
      const decision = execDecision(tp, NOW, options, { sym: SYM, side: 1 });
      assert.deepEqual(decision, { ok: false, why: "signalInactive" });
      assert.equal(live.validLane({ cfg: tp.id, sym: SYM, side: 1, vol: 1 }), false);
      assert.deepEqual([...signalSeatSymbols(tp, active)], []);
      const typed = new Set([key(kind)]);
      assert.equal(execDecision(tp, NOW, { ...options, signalActive: typed }, { sym: SYM, side: 1 }).ok, false, "typed activation still requires measured own history");
      assert.equal(liveLaneFilter({ source: "signals" }, new Set(), typed)
        .validLane({ cfg: tp.id, sym: SYM, side: 1, vol: 1 }), true);
      assert.deepEqual([...signalSeatSymbols(tp, typed)], [0]);
    }
  });

  it("same-type empty or losing protects cannot deactivate an independently winning config", () => {
    const good = tape("normal", Array(6).fill(0.01));
    const own = [...activeSignalsAt([good], NOW, rank, 48)];
    assert.deepEqual(own, [key("normal")]);
    for (const sibling of [tape("normal", [], IND, 0.04), tape("normal", Array(6).fill(-0.02), IND, 0.04)]) {
      assert.deepEqual([...activeSignalsAt([good, sibling], NOW, rank, 48)], own);
      assert.equal(signalActiveHas(new Set(own), sibling.bot, sibling.ind, SYM, 1, sibling.kind, sibling.id), false);
    }
  });

  it("same-type losing protects cannot satisfy or veto another config's acceptance PF", () => {
    const good = tape("normal", Array(6).fill(0.01));
    const losing = tape("normal", Array(6).fill(-0.02), IND, 0.04);
    const settings = { minPf: 1.3, hours: 48, minTrades: 6 };
    for (const tapes of [[good], [good, tape("normal", [], IND, 0.05)], [good, losing]]) {
      const index = new SignalAcceptIndex(tapes);
      const own = acceptKey(IND, SYM, 1, "normal", good.id);
      assert.equal(index.stats(own, NOW, 48).n, 6);
      assert.equal(acceptOnWindow((hours) => index.stats(own, NOW, hours), settings), true);
    }
    const index = new SignalAcceptIndex([good, losing]);
    const bad = acceptKey(IND, SYM, 1, "normal", losing.id);
    assert.equal(index.stats(bad, NOW, 48).n, 6);
    assert.equal(acceptOnWindow((hours) => index.stats(bad, NOW, hours), settings), false);
  });

  it("paper seats only the exact independently active protection config", () => {
    const good = tape("normal", Array(6).fill(0.01));
    const bad = tape("normal", Array(6).fill(-0.02), IND, 0.04);
    const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic" });
    const active = activeSignalsAt([good, bad], NOW, rank, 48);
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const options = { ...base, signalRank: rank, signalActive: active, preH: 6, simH: 6, longH: 48,
      signalValidLastN: 4, validLastN: 0, lastN: 0, signalGuardN: 0, signalCluster: undefined,
      signalAccept: undefined, signalSideAccept: undefined, signalOwnBase: true,
      toggles: { ...base.toggles, normal: true, block: false } };
    rt.tapes = [good, bad];
    rt.wf = options;
    rt.sim = walkForward({ bars: [], caches: [], nowT: NOW, baseTf: 60 } as never, rt.tapes, options);
    rt.wf.signalActive = active;
    (rt as unknown as { stepPaper(): void }).stepPaper();
    assert.deepEqual(rt.paper.selected, [good.id]);
    rt.dispose();
  });

  it("Signal last-N cannot borrow another symbol or direction even with the engine entry gate off", () => {
    const good = tape("normal", Array(6).fill(0.03));
    const trades: Trade[] = [];
    for (let i = 0; i < 12; i++) {
      for (const [sym, side, r] of [[SYM, 1, 0.03], [SYM, -1, -0.01], ["B-USDT", 1, -0.01]] as const)
        trades.push({ cfg: good.id, sym, side, entryT: (70 + i) * H, exitT: (80 + i) * H,
          entry: 100, exit: 100 * (1 + r), r, reason: r > 0 ? "tp" : "sl", bars: 40, mfe: 0, mae: 0, kind: "normal" });
    }
    const tp = makeTape(good.id, good.bot, good.ind, good.protect, good.kind, [SYM, "B-USDT"], trades, [], []);
    const active = new Set([sigActiveKey(tp.bot, tp.ind, SYM, 1, tp.kind, tp.id),
      sigActiveKey(tp.bot, tp.ind, SYM, -1, tp.kind, tp.id), sigActiveKey(tp.bot, tp.ind, "B-USDT", 1, tp.kind, tp.id)]);
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const options = { ...base, signalActive: active, lastN: 0, signalValidLastN: 8,
      signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
      signalOwnBase: true, toggles: { ...base.toggles, normal: true, block: false },
      gates: { ...base.gates, maxDdtH: 0, maxDdr: 0 } };
    assert.equal(execDecision(tp, NOW, options, { sym: SYM, side: 1 }).ok, true);
    for (const ctx of [{ sym: SYM, side: -1 }, { sym: "B-USDT", side: 1 }])
      assert.deepEqual(execDecision(tp, NOW, options, ctx), { ok: false, why: "signalValid" });
    assert.deepEqual([...activeSignalsAt([tp], NOW, rank, 48)], [key("normal")]);
  });

  it("retained exit-only configs never reactivate or seed another config's sample", () => {
    const held = { ...tape("normal", Array(6).fill(0.03)), heldOnly: true };
    const own = tape("normal", Array(6).fill(-0.01), IND, 0.04);
    assert.deepEqual([...activeSignalsAt([held, own], NOW, rank, 48)], []);
    assert.deepEqual(execDecision(held, NOW, defaultWalkForward(DEFAULT_SETTINGS), { sym: SYM, side: 1 }),
      { ok: false, why: "heldOnly" });
    assert.equal(signalIndex([held, own]).length, 1, "one lazy descriptor for the executable config only");
  });

  it("a retained activation verdict cannot replace a config's own minimum PF", () => {
    const winning = tape("normal", Array(6).fill(0.03));
    const losing = tape("normal", Array(6).fill(-0.01), IND, 0.04);
    const tapes = [winning, losing];
    const active = activeSignalsAt(tapes, NOW, rank, 48);
    assert.deepEqual([...active], [key("normal")]);
    const guard = new SignalGuard();
    guard.acceptIndex = new SignalAcceptIndex(tapes);
    const accept = { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 };
    assert.equal(guard.accepts(acceptKey(IND, SYM, 1, "normal", winning.id), NOW, accept), true);
    assert.equal(guard.accepts(acceptKey(IND, SYM, 1, "normal", losing.id), NOW, accept), false);
    // An earlier activation snapshot cannot waive the current own-config validation.
    active.add(sigActiveKey(losing.bot, losing.ind, SYM, 1, losing.kind, losing.id));
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const decision = execDecision(losing, NOW, {
      ...base, signalActive: active, lastN: 4, validLastN: 4, signalValidLastN: 4,
      signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
      signalOwnBase: true, symGate: undefined,
    }, { sym: SYM, side: 1, guard });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.why, "signalValid");
  });

  it("winning parameter ranges and lanes cannot supply another signal set's minimum PF", () => {
    const short = tape("normal", Array(6).fill(-0.01));
    const medium = tape("normal", Array(6).fill(0.02), "sig-ema-cross-m@m30");
    const index = new SignalAcceptIndex([short, medium]);
    const settings = { minPf: 1.3, hours: 48, minTrades: 6 };
    const shortKey = acceptKey(short.ind, SYM, 1, "normal", short.id);
    const mediumKey = acceptKey(medium.ind, SYM, 1, "normal", medium.id);
    assert.notEqual(shortKey, mediumKey);
    assert.equal(index.stats(shortKey, NOW, 48).pf, 0);
    assert.equal(acceptOnWindow((hours) => index.stats(shortKey, NOW, hours), settings), false);
    assert.equal(acceptOnWindow((hours) => index.stats(mediumKey, NOW, hours), settings), true);
    assert.equal(index.stats(acceptKey(IND.replace("@m15", "@m30"), SYM, 1, "normal", short.id), NOW, 48).n, 0);
  });
});
