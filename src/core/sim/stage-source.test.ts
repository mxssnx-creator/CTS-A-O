import assert from "node:assert/strict";
import { test } from "node:test";
import { barsFromCandles } from "../market/bars.ts";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";
import { DEFAULT_DCA } from "../config.ts";
import type { AxisConfig, Protect, Side } from "../domain/types.ts";
import { StageChainBook } from "./stage-chain.ts";
import { DEFAULT_STAGE_CHAIN } from "./stage-policy.ts";
import { simulateStageSource, type StageSource } from "./stage-source.ts";

const M = 60_000;
const protect = { tp: .02, sl: .04, trail: 0, hold: 3 };
const axis: AxisConfig = { levels: 2, spacing: 1, ratio: 1, minDisp: .35, maxDisp: 2.6, center: 50, exits: "fixed" };

test("a rejected source cannot leak its ungated last-bar pending signal into a processed order", () => {
  const bars = (n: number) => barsFromCandles("A-USDT", 1,
    Array.from({ length: n }, (_, i) => ({ t: i * M, o: 100, h: 100, l: 100, c: 100, v: 1 })));
  const cfg = "follow|ema-9-21@m1|pending-fixture", book = new StageChainBook("model", DEFAULT_STAGE_CHAIN),
    base = book.base({ baseConfigId: cfg, symbol: "A-USDT", side: 1, kind: "normal", lane: "m1", economicRevision: "v1" }, 1.1),
    main = book.main(base.id, "main"), source = { cfg, bars: bars(2), side: 1 as const,
      signal: new Int8Array([0, 1]), protect, kind: "normal" as const, cost: .0015 };
  assert.equal(simulate(cfg, source.bars, source.signal, protect, { cost: .0015 }).pending, 1, "the raw signal exists");
  const unvalidated = simulateStageSource(main, source, () => false);
  assert.equal(unvalidated.pending, 0); assert.equal(unvalidated.pendingIntent!.state, "awaiting-validation");
  assert.equal(unvalidated.open, null); assert.equal(unvalidated.trades.length, 0);
  const qualified = simulateStageSource(main, source, () => false, (intent) => {
    assert.equal(intent.entryT, 2 * M); assert.equal(Object.hasOwn(intent, "entry"), false, "no invented next-open fill");
    return true;
  });
  assert.equal(qualified.pending, 1); assert.equal(qualified.open, null);
  const next = simulateStageSource(main, { ...source, bars: bars(3), signal: new Int8Array([0, 1, 0]) }, () => false);
  assert.equal(next.open, null); assert.equal(next.trades.length, 0, "pending qualification never bypasses actual entry admission");
  assert.equal(simulateStageSource(main, source, () => true, () => false).pendingIntent!.state, "rejected");
});
function prices(side: Side) {
  const mirror = (x: number) => side === 1 ? x : 200 - x;
  return barsFromCandles("A-USDT", 1, [
    [98.5, 98.6, 98.4, 98.5], [98.5, 98.6, 98.4, 98.5], [98.5, 98.6, 97.4, 97.6],
    [97.6, 100.2, 97.5, 100], [100, 100.1, 99.9, 100], [100, 100.1, 99.9, 100],
    [100, 100.1, 99.9, 100], [100, 100.1, 99.9, 100],
  ].map(([o, h, l, c], i) => ({ t: i * M, o: mirror(o), h: mirror(side === 1 ? h : l),
    l: mirror(side === 1 ? l : h), c: mirror(c), v: 1 })));
}

for (const mode of ["normal", "trailing", "trailing-only", "exit", "dca", "dca-active", "axis-fixed", "axis-managed", "axis-desk"] as const) {
  test(`inverse ${mode} delegates to its own simulator, cost and protection rules`, () => {
    const kind = mode.startsWith("axis") ? "axis" : mode as "normal" | "trailing" | "trailing-only" | "exit" | "dca" | "dca-active";
    const b = prices(-1), cfg = `follow|ema-9-21@m1|${mode}`,
      p: Protect = { ...protect, trail: mode === "trailing" || mode === "trailing-only" ? .01 : 0,
        ...(mode === "trailing-only" ? { tp: 0, trailOnly: true } : {}),
        ...(mode === "exit" ? { exitType: "historic", exitSet: "breakeven", exitSide: 1 } as const : {}) },
      center = new Float64Array(b.n).fill(100), atr = new Float64Array(b.n).fill(1);
    const book = new StageChainBook("model", DEFAULT_STAGE_CHAIN), base = book.base({ baseConfigId: cfg, symbol: b.sym,
      side: 1, kind, lane: "independent", economicRevision: "policy-v1" }, 1.1), main = book.main(base.id, "main"),
      inverse = book.inverseMain(main.id, "inverse-prices");
    const signal = new Int8Array([1, 0, 0, 0, 0, 0, 0, 0]), opposite = new Int8Array([-1, 0, 0, 0, 0, 0, 0, 0]);
    const common = { cfg, bars: b, side: 1 as const, signal, protect: p, cost: .0015 };
    let source: StageSource, expected;
    if (kind === "dca" || kind === "dca-active") {
      source = { ...common, kind, dca: DEFAULT_DCA };
      expected = simulateDca(cfg, b, opposite, p, DEFAULT_DCA, kind === "dca-active", .0015);
    } else if (kind === "axis") {
      const ax = { ...axis, exits: mode === "axis-managed" ? "managed" as const : "fixed" as const,
        mode: mode === "axis-desk" ? "desk" as const : "revert" as const };
      source = { ...common, kind, axis: ax, center, atr };
      expected = ax.mode === "desk" ? simulateAxisDesk(cfg, b, opposite, p, ax, center, atr, .0015)
        : simulateAxis(cfg, b, opposite, p, ax, center, atr, .0015);
    } else {
      source = { ...common, kind };
      expected = simulate(cfg, b, opposite, p, { cost: .0015 });
    }
    const seen: number[] = [], actual = simulateStageSource(inverse, source, (e) => {
      assert.equal(e.setId, inverse.id); assert.equal(e.side, -1); seen.push(e.entryT); return true;
    });
    assert.deepEqual(seen, [M]);
    assert.deepEqual(actual.trades, expected.trades.map((t) => ({ ...t, kind, mult: 1 })));
    assert.deepEqual(actual.open, expected.open ?? null);
    assert.equal(actual.pending, expected.pending); assert.equal(actual.setId, inverse.id);
    assert.equal(actual.baseConfigId, cfg);
    assert.equal(actual.parentSetId, main.id); assert.equal(actual.admissionPolicy, inverse.admissionPolicy);
    if (kind === "trailing-only") assert.ok(actual.trades.every((t) => t.reason !== "tp"));
    assert.ok(actual.trades.length || actual.open);
    assert.throws(() => simulateStageSource(inverse, { ...source, cfg: "other-config" }, () => true), /exact set/);
    assert.throws(() => simulateStageSource(inverse, { ...source, signal: opposite }, () => true), /another Base direction/);
    assert.throws(() => simulateStageSource({ ...inverse, variant: "direct" }, source, () => true), /exact set/);
    assert.throws(() => simulateStageSource({ ...inverse, identity: { ...inverse.identity, kind: "unknown" } },
      { ...source, kind: "unknown" } as unknown as StageSource, () => true), /exact set/);
  });
}
