import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { StratKind, Trade } from "./domain/types.ts";
import { configId } from "./pipeline/pipeline.ts";
import { liveLaneFilter } from "./server/live.server.ts";
import { signalSettings } from "./signal-config.ts";
import { acceptKey, acceptOnWindow, SignalAcceptIndex, SignalGuard, signalActiveHas, signalSeatSymbols, sigActiveKey } from "./signals.ts";
import { activeSignalsAt, defaultWalkForward, execDecision, hedgeSignalsAt, makeTape, signalIndex } from "./sim/walkforward.ts";

const H = 3_600_000;
const NOW = 100 * H;
const IND = "sig-ema-cross-s@m15";
const SYM = "A-USDT";
function tape(kind: StratKind, rs: number[], ind = IND, tp = 0.03) {
  const protect = { tp, sl: 0.06, trail: kind === "trailing" ? 0.015 : 0, hold: 192 };
  const id = configId("follow", ind, protect);
  const trades: Trade[] = rs.map((r, i) => ({
    cfg: id, sym: SYM, side: 1, entryT: (80 + i) * H, exitT: (90 + i) * H,
    entry: 100, exit: 100 * (1 + r), r, reason: r > 0 ? "tp" : "sl", bars: 40, mfe: 0, mae: 0, kind,
  }));
  return makeTape(id, "follow", ind, protect, kind, [SYM], trades, [], []);
}
const rank = signalSettings({ enabled: true, count: 0, minTrades: 4, rank: "drawdown", minBlockShare: 0, validate: false });
const key = (kind: string) => sigActiveKey("follow", IND, SYM, 1, kind);

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
    const normal = tape("normal", []);
    const trailing = tape("trailing", []);
    const active = new Set([key("normal")]);
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const options = {
      ...base, signalActive: active, lastN: 0, validLastN: 0, signalValidLastN: 0,
      signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
      signalOwnBase: true, symGate: undefined,
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

  it("legacy Base/discovery keys never override a measured type in a mixed recovered set", () => {
    const legacy = sigActiveKey("follow", IND, SYM, 1);
    assert.equal(signalActiveHas(new Set([legacy]), "follow", IND, SYM, 1, "normal"), true);
    const mixed = new Set([legacy, key("normal")]);
    assert.equal(signalActiveHas(mixed, "follow", IND, SYM, 1, "normal"), true);
    assert.equal(signalActiveHas(mixed, "follow", IND, SYM, 1, "trailing"), false);
    assert.equal(signalActiveHas(new Set([key("normal")]), "follow", IND, SYM, -1, "normal"), false);
  });

  it("a qualifying type and its acceptance record cannot replace a config's own minimum PF", () => {
    const winning = tape("normal", Array(6).fill(0.03));
    const losing = tape("normal", Array(6).fill(-0.01), IND, 0.04);
    const tapes = [winning, losing];
    const active = activeSignalsAt(tapes, NOW, rank, 48);
    assert.deepEqual([...active], [key("normal")]);
    const guard = new SignalGuard();
    guard.acceptIndex = new SignalAcceptIndex(tapes);
    const accept = { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 };
    assert.equal(guard.accepts(acceptKey(IND, SYM, 1, "normal"), NOW, accept), true);
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const decision = execDecision(losing, NOW, {
      ...base, signalActive: active, lastN: 4, validLastN: 4, signalValidLastN: 4,
      signalGuardN: 0, signalCluster: undefined, signalAccept: accept, signalSideAccept: undefined,
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
    const shortKey = acceptKey(short.ind, SYM, 1, "normal");
    const mediumKey = acceptKey(medium.ind, SYM, 1, "normal");
    assert.notEqual(shortKey, mediumKey);
    assert.equal(index.stats(shortKey, NOW, 48).pf, 0);
    assert.equal(acceptOnWindow((hours) => index.stats(shortKey, NOW, hours), settings), false);
    assert.equal(acceptOnWindow((hours) => index.stats(mediumKey, NOW, hours), settings), true);
    assert.equal(index.stats(acceptKey(IND.replace("@m15", "@m30"), SYM, 1, "normal"), NOW, 48).n, 0);
  });
});
