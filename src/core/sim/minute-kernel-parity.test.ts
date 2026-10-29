import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_AXIS, DEFAULT_DCA } from "../config.ts";
import type { Protect, Trade } from "../domain/types.ts";
import { barsFromCandles, resample } from "../market/bars.ts";
import { makeUniverse, evaluationSignal } from "../pipeline/pipeline.ts";
import { entrySignal } from "../bots/bots.ts";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";
import { buildTapes, tradeAt, axisVariants, compareTapeTrades } from "./walkforward.ts";

const M = 60_000, cost = .0015, ind = "ema-9-21@m30", bot = "revert";
const rows = Array.from({ length: 4320 }, (_, i) => {
  const c = 100 + 1.8 * Math.sin(i / 85) + .3 * Math.sin(i / 7);
  return { t: Date.UTC(2026, 9, 6) + i * M, o: c, h: c + .2, l: c - .2, c, v: 100 };
});
const source = barsFromCandles("PARITY-USDT", 30, resample(rows, 1, 30));
const prices = barsFromCandles("PARITY-USDT", 1, rows), u = makeUniverse([prices, source]);
const p: Protect = { tp: .005, sl: .01, trail: 0, hold: 1, maxHoldMin: 15 };
const dca = { ...DEFAULT_DCA, levels: 1, step: .001 };
const axes = (["fixed", "managed", "desk"] as const).map((mode) => ({
  ...DEFAULT_AXIS, modes: [mode === "desk" ? "desk" as const : "revert" as const],
  exits: mode === "fixed" ? "fixed" as const : "managed" as const,
  levels: 1, levelsSet: [1], ranges: ["atr" as const], hybrids: [false], minDisp: 0, maxDisp: 100,
  centerMin: 90, center: 3,
}));
// Independent timestamp projection: a completed source signal is offered once, then next-minute open execution.
const raw = evaluationSignal(u, source, entrySignal(bot, ind, u.caches[1], null)!);
const signals = [1, -1].map((side) => Int8Array.from(rows, (x) => {
  const j = source.t.findIndex((t) => t + 30 * M === x.t + M);
  return j >= 0 && raw[j] === side ? side : 0;
}));
const numeric = (values: Float64Array) => Float64Array.from(rows, (x) => {
  let j = source.n - 1;
  while (j >= 0 && source.t[j] + 30 * M > x.t + M) j--;
  return j >= 0 ? values[j] : NaN;
});
const canonical = (x: Trade) => [x.entryT, x.exitT, x.side, x.reason, Math.fround(x.entry), Math.fround(x.exit!), x.r,
  Math.fround(x.vol ?? 1), x.bars];

for (const kind of ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis-fixed", "axis-managed", "axis-desk"] as const) {
  test(`${kind}: capped source-lane construction matches an independent minute-price kernel with cost once`, () => {
    const protect = { ...p, ...(kind.startsWith("trailing") ? { trail: .003 } : {}),
      ...(kind === "trailing-only" ? { tp: 0, trailOnly: true } : {}) };
    const axIndex = ["axis-fixed", "axis-managed", "axis-desk"].indexOf(kind);
    const axis = axIndex >= 0 ? axes[axIndex] : undefined;
    const extra = kind === "dca" || kind === "dca-active" || axis
      ? { protects: [protect], dca, ...(axis ? { axis, noDca: true } : {}) } : undefined;
    const tapes = buildTapes(u, extra ? [] : [protect], cost, extra, new Set([`${bot}|${ind}`]), null, null,
      { minSl: 0, minTrail: 0, microOwnInds: false });
    const tape = tapes.find((t) => t.kind === (kind.startsWith("axis") ? "axis" : kind))!;
    assert.ok(tape, "the requested independent kind must be built");
    const expected: Trade[] = [];
    for (const sig of signals) {
      const ep = { ...protect, hold: 15 };
      if (axis) {
        const ax = axisVariants(axis, [protect])[0].ax;
        const center = numeric(u.caches[1].ema(3)), atr = numeric(u.caches[1].atr(14));
        const result = kind === "axis-desk"
          ? simulateAxisDesk(tape.id, prices, sig, ep, ax, center, atr, cost, 0, { minSl: .005, minTrail: 0 })
          : simulateAxis(tape.id, prices, sig, ep, ax, center, atr, cost, 0, { minSl: .005 });
        expected.push(...result.trades);
      } else if (kind === "dca" || kind === "dca-active")
        expected.push(...simulateDca(tape.id, prices, sig, ep, dca, kind === "dca-active", cost).trades);
      else expected.push(...simulate(tape.id, prices, sig, ep, { cost }).trades);
    }
    expected.sort(compareTapeTrades);
    assert.ok(expected.length > 0, "parity must include actual closes, not just an empty tape");
    assert.deepEqual(Array.from({ length: tape.n }, (_, i) => canonical(tradeAt(tape, i))), expected.map(canonical));
    assert.ok(expected.every((t) => t.exitT - t.entryT <= 15 * M), "each kernel respects the minute ceiling");
  });
}

test("sub-bar capped DCA/Axis configurations without minute evidence cannot create a late native-bar order", () => {
  const native = makeUniverse([source]);
  const tapes = buildTapes(native, [], cost, { protects: [p], dca, axis: axes[2] },
    new Set([`${bot}|${ind}`]), null, null, { minSl: 0, minTrail: 0 });
  assert.equal(tapes.length, 0, "unexecutable sub-bar holds stay unavailable instead of silently becoming30m");
});
