import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, Trade } from "../domain/types.ts";
import { baseLastNOf } from "../pipeline/base-lastn.ts";
import { baseGateSensitivity, baseRangeCounts, baseRangeWhy, cellStats, makeUniverse, passesBase, rangeBaseStats } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { activeSignalsAt, configContextEval, configDirectionEval, defaultWalkForward, execDecision, makeTape, selectAt, selectDurable, selectFixed, signalConfigEval, signalIndex, signalValidationOk, SignalActivationBook, withProbe } from "./walkforward.ts";
import { signalSettings } from "../signal-config.ts";
import { sigActiveKey, type SignalUnitReport } from "../signals.ts";

const H = 3_600_000, T = Date.UTC(2026, 9, 28), P: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 1 };
const opts = () => ({ ...defaultWalkForward(DEFAULT_SETTINGS), seatSet: "pool" as const, validLastN: 12, signalValidLastN: 12,
  exitMinTrades: 12, lastN: 0, rangeGate: undefined, symGate: "off" as const, bots: [],
  gates: { ...DEFAULT_SETTINGS.gates, minTrades: 9, minPf: 1.1, baseLastN: 12, baseRangeLastN: {}, maxDdtH: 1, minGreen: 1, stableBlocks: 12, lastNOnly: true },
  preGate: true, longH: 24, preH: 6, signalLongH: 24, robustFrac: 0, portfolio: 0, seatPer: "config" as const });

function tape(ind: string, old: number[], recent: number[], side: 1 | -1 = 1) {
  const id = `follow|${ind}|tp1|sl1|tr0|h1`;
  const values = [...old, ...recent];
  const trades: Trade[] = values.map((r, i) => ({ cfg: id, sym: "A-USDT", side,
    // All completed closes are older than the former 24-hour evaluation window.
    entryT: T - (400 + values.length - i) * H, exitT: T - (400 + values.length - i) * H + 1000,
    entry: 100, exit: 100 * (1 + r), r, reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0, kind: "normal" }));
  return makeTape(id, "follow", ind, P, "normal", ["A-USDT"], trades, [], []);
}

describe("Last-N-only qualification (not yet enabled in CoreRuntime)", () => {
  it("requires the full requested Base sample and ignores a contradictory older aggregate", () => {
    const trades = [...Array.from({ length: 30 }, (_, i) => ({ entryT: i * 10, exitT: i * 10 + 1, r: -0.01 })),
      ...Array.from({ length: 12 }, (_, i) => ({ entryT: 300 + i * 10, exitT: 301 + i * 10, r: 0.01 }))];
    const proof = baseLastNOf(trades, 12, 1)!;
    const gate = { lastNOnly: true, baseLastN: 12, minPf: 1.1, minTrades: 9, lastNFloor: 5 };
    assert.equal(passesBase({ n: 42, pf: 0.4, net: -18, mdd: 25, baseLast: proof }, gate), true);
    assert.equal(passesBase({ n: 11, pf: 4, net: 11, baseLast: baseLastNOf(trades.slice(-11), 12, 1) }, gate), false);
    assert.equal(passesBase({ n: 42, pf: 4, net: 20, baseLast: baseLastNOf([...trades.slice(0, 30), ...trades.slice(-12).map(x => ({ ...x, r: -0.01 }))], 12, 1) }, gate), false);
  });

  it("reports Base counts, pooled PF and failure reasons on the actual recent gate sample", () => {
    const passing = { n: 40, pf: 0.1, net: -90, mdd: 100, bw: { gate: false },
      baseLast: { requested: 12, n: 12, gp: 6, gl: 3, stop: 1 } };
    const failing = { n: 40, pf: 10, net: 90, mdd: 1, bw: { gate: true },
      baseLast: { requested: 12, n: 12, gp: 3, gl: 6, stop: 1 } };
    const runs = [{ ind: "ema@m15", full: passing }, { ind: "ema@m15", full: failing }] as never;
    const gates = { minPf: 1.1, minTrades: 9, baseLastN: 12, lastNOnly: true, maxDdr: 1,
      baseWindows: { gate: true } } as never;
    const count = baseRangeCounts(runs, gates, [])[0];
    assert.equal(count.evaluated, 2); assert.equal(count.passed, 1);
    assert.equal(count.pfPassedMedian, 2); assert.equal(count.pfPassedPooled, 2);
    assert.equal(count.passedGp, 6); assert.equal(count.passedGl, 3);
    const why = baseRangeWhy(runs, gates, [])[0];
    assert.equal(why.passed, 1); assert.equal(why.first.net, 1);
    assert.equal("windows" in why.first, false);
    assert.equal(baseGateSensitivity(runs, gates, [])[0].pfPassedMedian, 2);
  });

  it("selects the representative Base cell by the same recent evidence it validates", () => {
    const ind = "break-atr@m15", cost = .002;
    const u = makeUniverse([barsFromCandles("A", 15, syntheticCandles("A", 15, 1500, Date.UTC(2026, 9, 1), 4))]);
    const a: Protect = { tp: .01, sl: .005, trail: 0, hold: 8, tag: "sh" };
    const b: Protect = { tp: .02, sl: .02, trail: 0, hold: 4, tag: "sh" };
    const gates = { minTrades: 9, minPf: 1.1, baseLastN: 12, lastNOnly: true };
    const x = cellStats(u, "follow", ind, a, cost, null, undefined, 12)!;
    const y = cellStats(u, "follow", ind, b, cost, null, undefined, 12)!;
    assert.ok(passesBase(x, gates) && passesBase(y, gates));
    assert.ok(x.net > y.net, "the old full-history ranking prefers the first cell");
    assert.ok(x.baseLast!.gp - x.baseLast!.gl < y.baseLast!.gp - y.baseLast!.gl,
      "the current 12-close ranking prefers the second cell");
    const run = (recent: boolean) => rangeBaseStats(u, "follow", ind, [a, b], cost, null, undefined, false,
      (_tag, s) => passesBase(s, gates), 15, undefined, undefined, undefined, 12, recent)!.sh;
    assert.deepEqual(run(false), x);
    assert.deepEqual(run(true), y);
  });

  it("judges exactly the preceding 12 own closes irrespective of elapsed hours in every selector", () => {
    const good = tape("rsi-mom-14-20@m15", Array(30).fill(-0.01), Array(12).fill(0.01));
    const bad = tape("rsi-mom-14-20@m15", Array(30).fill(0.01), Array(12).fill(-0.01));
    const o = opts();
    const g = configDirectionEval(good, T, o, 1), b = configDirectionEval(bad, T, o, 1);
    assert.equal(g.ok, true); assert.equal(g.n, 12); assert.equal(b.ok, false);
    for (const select of [() => selectFixed([good, bad], T, o), () => selectAt([good, bad], T, o),
      () => selectDurable([good, bad], T, o, new Set())]) {
      const ids = select().picks.map(x => x.id);
      // Both tapes intentionally use the same config identity to detect any accidental borrowing of a sibling's history.
      assert.deepEqual(ids, [good.id]);
    }
    assert.equal(configDirectionEval(good, T + 500 * H, o, 1).ok, true, "elapsed time alone cannot veto unchanged closes");
  });

  it("requires 12 closes in each exact Signal symbol and direction", () => {
    const good = tape("sig-ema-cross-s@m15", [], Array(12).fill(0.01));
    const short = tape("sig-ema-cross-s@m15", [], Array(11).fill(0.01));
    const o = opts();
    assert.equal(signalConfigEval(good, T, o, "A-USDT", 1).ok, true);
    assert.equal(signalConfigEval(good, T, o, "A-USDT", -1).ok, false);
    assert.equal(signalConfigEval(short, T, o, "A-USDT", 1).ok, false);
    assert.equal(signalConfigEval(good, T, { ...o, signalValidLastN: 8 }, "A-USDT", 1).ok, false);
  });

  it("activates Signals on the same exact Last-N evidence at initial and continuous selection", () => {
    const good = tape("sig-ema-cross-s@m15", [], Array(12).fill(0.01));
    const o = opts(), sig = signalSettings({ count: 0, minTrades: 9, validate: true, minBlockShare: 1 });
    const expected = sigActiveKey(good.bot, good.ind, "A-USDT", 1, good.kind, good.id), report: SignalUnitReport[] = [];
    const initial = activeSignalsAt([good], T, sig, 1, o, report);
    assert.deepEqual([...initial], [expected]);
    assert.equal(report.find(x => x.key === expected)?.okShare, null, "disabled time-block result remains unavailable");
    const gen = new SignalActivationBook(signalIndex([good]), sig, 1, o).at(T);
    let row = gen.next(); while (!row.done) row = gen.next();
    assert.deepEqual([...row.value], [expected]);
  });

  it("does not relax a stricter Signal minimum when a recent validation window is smaller", () => {
    const good = tape("sig-ema-cross-s@m15", [], Array(12).fill(0.01));
    const sig = signalSettings({ count: 0, minTrades: 13, validate: true });
    const report: SignalUnitReport[] = [];
    const active = activeSignalsAt([good], T, sig, 1, opts(), report);
    assert.equal(active.size, 0);
    assert.equal(report.find(x => x.side === 1)?.reason, "minTrades");
  });

  it("applies the same causal Last-N rule to every independent strategy kind", () => {
    const kinds = ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis", "exit"] as const;
    const base = tape("rsi-mom-14-20@m15", Array(20).fill(-0.01), Array(12).fill(0.01));
    for (const kind of kinds) {
      const id = `${base.id}|${kind}`;
      const trades: Trade[] = Array.from({ length: base.exitT.length }, (_, i) => ({
        cfg: id, sym: "A-USDT", side: 1, entryT: base.entryT[i], exitT: base.exitT[i],
        entry: 100, exit: 100 * (1 + base.r[i]), r: base.r[i], reason: base.r[i] > 0 ? "tp" : "sl",
        bars: 1, mfe: 0, mae: 0, kind,
      }));
      const own = makeTape(id, "follow", base.ind, P, kind, ["A-USDT"], trades, [], []);
      assert.equal(configDirectionEval(own, T, opts(), 1).ok, true, kind);
      assert.equal(configDirectionEval(own, T, opts(), -1).ok, false, `${kind}: no sibling-side proof`);
    }
  });

  it("uses the same time-independent own history for modeled entry and native Signal admission", () => {
    const good = tape("sig-ema-cross-s@m15", [], Array(12).fill(0.01));
    const o = { ...opts(), signalOwnBase: true, signalGuardN: 0, normalBaseMinPf: 0,
      toggles: { ...DEFAULT_SETTINGS.toggles, normal: true, block: false, blockActive: false } };
    assert.equal(signalValidationOk(good, T, o, "A-USDT", 1), true);
    assert.equal(signalValidationOk(good, T, o, "A-USDT", -1), false);
    assert.equal(execDecision(good, T, o, { sym: "A-USDT", side: 1 }).ok, true);
    assert.equal(execDecision(good, T, o, { sym: "A-USDT", side: -1 }).ok, false);
  });

  it("does not borrow another symbol or direction to satisfy the symbol gate", () => {
    const good = tape("rsi-mom-14-20@m15", [], Array(12).fill(0.01));
    const o = { ...opts(), symGate: "provenSide" as const };
    assert.equal(configContextEval(good, T, o, "A-USDT", 1).ok, true);
    assert.equal(configContextEval(good, T, o, "A-USDT", -1).ok, false);
    assert.equal(configContextEval(good, T, o, "B-USDT", 1).ok, false);
  });

  it("requires the exact symbol and direction even when the optional legacy symbol gate is off", () => {
    const good = tape("rsi-mom-14-20@m15", [], Array(12).fill(0.01));
    const o = { ...opts(), symGate: "off" as const };
    assert.equal(configContextEval(good, T, o, "A-USDT", 1).ok, true);
    assert.equal(configContextEval(good, T, o, "A-USDT", -1).ok, false);
    assert.equal(configContextEval(good, T, o, "B-USDT", 1).ok, false);
    assert.equal(execDecision(good, T, o, { sym: "B-USDT", side: 1 }).ok, false);
    assert.equal(execDecision(good, T, o).ok, false, "missing entry identity cannot qualify");
  });

  it("applies each configured Last-N window to the exact symbol, including cache changes", () => {
    const own = tape("rsi-mom-14-20@m15", Array(12).fill(-0.01), Array(12).fill(0.01));
    const o = { ...opts(), lastN: 24, symGate: "off" as const };
    assert.equal(configContextEval(own, T, o, "A-USDT", 1).ok, false, "entry Last-24 fails despite winning Last-12");
    assert.equal(configContextEval(own, T, { ...o, lastN: 12 }, "A-USDT", 1).ok, true);
    own.protect = { ...own.protect, tag: "mn" };
    const r = { ...o, lastN: 0, rangeGate: { lastN: 24, minPf: 1.1, ranges: ["mn" as const] } };
    assert.equal(configContextEval(own, T, r, "A-USDT", 1).ok, false, "the range Last-24 also uses the exact context");
    assert.equal(configContextEval(own, T, { ...r, rangeGate: { ...r.rangeGate, lastN: 12 } }, "A-USDT", 1).ok, true);
  });

  it("never seats or admits an unvalidated probe in Last-N-only mode", () => {
    const badEngine = tape("rsi-mom-14-20@m15", Array(30).fill(0.01), Array(12).fill(-0.01));
    const badSignal = tape("sig-ema-cross-s@m15", Array(30).fill(0.01), Array(12).fill(-0.01));
    const goodSignal = tape("sig-ema-cross-s@m15", [], Array(12).fill(0.01));
    const base = { ...opts(), signalGuardN: 0, normalBaseMinPf: 0,
      toggles: { ...DEFAULT_SETTINGS.toggles, normal: true, block: false, blockActive: false } };
    for (const probe of [{ perRange: 1 }, { perRange: 0, perCell: 1 }]) {
      const o = { ...base, probe };
      assert.deepEqual(withProbe({ picks: [], eligible: 0 }, [badEngine], T, o), { picks: [], eligible: 0 });
      assert.equal(execDecision(badEngine, T, o, { sym: "A-USDT", side: 1 }).ok, false);
      assert.equal(execDecision(badSignal, T, o, { sym: "A-USDT", side: 1 }).ok, false);
      assert.equal(execDecision(goodSignal, T, o, { sym: "A-USDT", side: 1 }).ok, true);
    }
  });
});
