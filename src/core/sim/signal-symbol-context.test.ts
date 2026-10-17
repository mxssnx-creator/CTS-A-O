import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { signalSettings } from "../signal-config.ts";
import { sigActiveKey } from "../signals.ts";
import { activeSignalsAt, defaultWalkForward, execDecision, makeTape } from "./walkforward.ts";

const H = 3_600_000;
const NOW = 100 * H;
const SYM = "A-USDT";
const IND = "sig-ema-cross-s@m15";
const PROTECT = { tp: .03, sl: .06, trail: 0, hold: 192 };
const ID = configId("follow", IND, PROTECT);
const trade = (i: number, sym = SYM, side: 1 | -1 = 1, r = .01, exitT = (90 + i) * H): Trade => ({
  cfg: ID, sym, side, entryT: exitT - H, exitT, entry: 100, exit: 100 * (1 + r), r,
  reason: r > 0 ? "tp" : "sl", bars: 4, mfe: 0, mae: 0, kind: "normal",
});
const tape = (syms: string[], trades: Trade[], tp = PROTECT.tp) => {
  const protect = { ...PROTECT, tp };
  const id = configId("follow", IND, protect);
  return makeTape(id, "follow", IND, protect, "normal", syms, trades.map((x) => ({ ...x, cfg: id })), [], []);
};
const rank = signalSettings({ enabled: true, count: 0, minTrades: 5, rank: "drawdown", minBlockShare: 0, validate: false });
function options(tp: ReturnType<typeof tape>) {
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  return { ...base, signalActive: new Set([sigActiveKey(tp.bot, tp.ind, SYM, 1, tp.kind, tp.id)]),
    lastN: 0, signalValidLastN: 5, signalGuardN: 0, signalCluster: undefined,
    signalAccept: undefined, signalSideAccept: undefined, signalOwnBase: true,
    gates: { ...base.gates, maxDdtH: 0, maxDdr: 0 },
    toggles: { ...base.toggles, normal: true, block: false },
  };
}
const decide = (tp: ReturnType<typeof tape>, t = NOW, ctx = { sym: SYM, side: 1 }) =>
  execDecision(tp, t, options(tp), ctx);

describe("exact Signal history with symbol × timeframe slots", () => {
  it("preserves qualification when makeTape maps multi-timeframe symbols to the last slot", () => {
    const trades = Array.from({ length: 6 }, (_, i) => trade(i));
    const single = tape([SYM], trades);
    // The runtime builds syms from every native/aggregated series, with repeats for the 1/5/15/30m lanes.
    const multi = tape([SYM, "B-USDT", SYM, "B-USDT", SYM, "B-USDT", SYM, "B-USDT"], trades);
    assert.deepEqual([...multi.symI], Array(6).fill(6));
    assert.deepEqual([...activeSignalsAt([multi], NOW, rank, 48)], [...activeSignalsAt([single], NOW, rank, 48)]);
    assert.equal(decide(single).ok, true);
    assert.equal(decide(multi).ok, true, "the same own closes must satisfy the same unchanged Last-N gate");
  });

  it("collects every matching recovered slot without borrowing another symbol or side", () => {
    const tp = tape([SYM, "B-USDT", SYM, "B-USDT"], [
      ...Array.from({ length: 6 }, (_, i) => trade(i)),
      ...Array.from({ length: 6 }, (_, i) => trade(i, SYM, -1, -.02)),
      ...Array.from({ length: 6 }, (_, i) => trade(i, "B-USDT", 1, -.02)),
    ]);
    // A packed/recovered tape may retain different aliases for the same symbol.
    let own = 0;
    for (let i = 0; i < tp.n; i++) if (tp.syms[tp.symI[i]] === SYM && tp.side[i] === 1) tp.symI[i] = own++ % 2 ? 2 : 0;
    assert.equal(decide(tp).ok, true);
    for (const ctx of [{ sym: SYM, side: -1 }, { sym: "B-USDT", side: 1 }]) {
      const o = options(tp);
      o.signalActive.add(sigActiveKey(tp.bot, tp.ind, ctx.sym, ctx.side, tp.kind, tp.id));
      assert.deepEqual(execDecision(tp, NOW, o, ctx), { ok: false, why: "signalValid" });
    }
  });

  it("keeps future and missing own closes ineligible despite winning siblings", () => {
    const tp = tape([SYM, "B-USDT", SYM, "B-USDT"], [
      ...Array.from({ length: 4 }, (_, i) => trade(i)),
      trade(0, SYM, 1, .01, NOW + H),
      ...Array.from({ length: 8 }, (_, i) => trade(i, "B-USDT", 1, .03)),
      ...Array.from({ length: 8 }, (_, i) => trade(i, SYM, -1, .03)),
    ]);
    assert.deepEqual(decide(tp), { ok: false, why: "signalValid" });
    assert.equal(decide(tp, NOW + H).ok, true, "only the newly settled own close completes the floor of five");
    const empty = tape([SYM, SYM], []);
    assert.deepEqual(decide(empty), { ok: false, why: "signalValid" });
    const sibling = tape([SYM, SYM], Array.from({ length: 6 }, (_, i) => trade(i)), .04);
    const o = options(empty);
    o.signalActive.add(sigActiveKey(sibling.bot, sibling.ind, SYM, 1, sibling.kind, sibling.id));
    assert.deepEqual(execDecision(empty, NOW, o, { sym: SYM, side: 1 }), { ok: false, why: "signalValid" });
  });

  it("rechecks the latest exact-config sample and refuses newly settled losing history", () => {
    const tp = tape([SYM, SYM], [
      ...Array.from({ length: 5 }, (_, i) => trade(i)),
      ...Array.from({ length: 5 }, (_, i) => trade(i, SYM, 1, -.02, NOW + (i + 1) * H)),
    ]);
    assert.equal(decide(tp).ok, true);
    assert.deepEqual(decide(tp, NOW + 5 * H), { ok: false, why: "signalValid" });
  });
});
