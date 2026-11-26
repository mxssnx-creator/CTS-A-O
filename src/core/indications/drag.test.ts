import { test } from "node:test";
import assert from "node:assert/strict";
import { DRAG_IDS, dragState } from "./drag.ts";
import { INDICATION_BY_ID, indicationState } from "./registry.ts";
import { barsFromCandles, headBars } from "../market/bars.ts";
import { allCombos, makeUniverse } from "../pipeline/pipeline.ts";
import { StreamMath } from "./stream-math.ts";
import type { Bars, Candle } from "../domain/types.ts";

function fixture(tf: number, side: 1 | -1, mode: "catchup" | "confirmed"): [Bars, Bars] {
  let btc = 100, alt = 100;
  const a: Candle[] = [], b: Candle[] = [];
  for (let i = 0; i < 90; i++) {
    const x = i >= 87 ? side * .002 : .0008 * Math.sin(i * 1.7) + .00015 * Math.sin(i * .37);
    const y = i >= 87 ? (mode === "catchup" ? 0 : .8 * x) : .8 * x + .00005 * Math.cos(i);
    btc *= Math.exp(x); alt *= Math.exp(y);
    const t = i * tf * 60_000, candle = (c: number) => ({ t, o: c, h: c, l: c, c, v: 10 });
    a.push(candle(btc)); b.push(candle(alt));
  }
  return [barsFromCandles("BTC-USDT", tf, a), barsFromCandles("ETH-USDT", tf, b)];
}
function states(btc: Bars, alt: Bars, id: string) {
  const u = makeUniverse([btc, alt]);
  return indicationState(id, u.caches[u.bars.findIndex(b => b.sym === "ETH-USDT")])!;
}

test("all Drag profiles are registered, focused and limited to independent 1/5/15m follow lanes", () => {
  assert.equal(DRAG_IDS.length, 8);
  assert.equal(new Set(DRAG_IDS).size, 8);
  for (const id of DRAG_IDS) assert.equal(INDICATION_BY_ID.get(id)?.kind, "drag");
  const id = DRAG_IDS[0];
  assert.deepEqual(allCombos([`follow|${id}`], [], [1, 5, 15, 30]).map(x => x.ind),
    [`${id}@m1`, `${id}@m5`, `${id}@m15`]);
  assert.equal(allCombos([`follow|${id}`], ["drag"], [1, 5, 15]).length, 0);
});

test("BTC-relative catch-up and confirmation fire symmetrically on each requested timeframe", () => {
  for (const tf of [1, 5, 15]) for (const side of [1, -1] as const)
    for (const mode of ["catchup", "confirmed"] as const) {
      const [btc, alt] = fixture(tf, side, mode);
      for (const window of [20, 40]) for (const ratio of [.5, .75]) {
        const id = `drag-${mode}-${window}-r${ratio * 100}@m${tf}`;
        assert.equal(states(btc, alt, id).at(-1), side, id);
      }
    }
});

test("missing, duplicate, self and gapped BTC references cannot generate a stale signal", () => {
  const [btc, alt] = fixture(1, 1, "catchup");
  const id = "drag-catchup-20-r50@m1";
  const only = makeUniverse([alt]);
  assert.ok(indicationState(id, only.caches[0])!.every(n => n === 0));
  const dup = makeUniverse([btc, btc, alt]);
  assert.ok(indicationState(id, dup.caches[dup.bars.findIndex(b => b.sym === alt.sym)])!.every(n => n === 0));
  const self = makeUniverse([btc, alt]);
  assert.ok(indicationState(id, self.caches[self.bars.findIndex(b => b.sym === btc.sym)])!.every(n => n === 0));
  const gap = { ...btc, t: Float64Array.from(btc.t, (t, i) => i === 84 ? t + 30_000 : t) };
  assert.equal(states(gap, alt, id).at(-1), 0);
});

test("incremental state exactly matches full calculations and cannot read future bars", () => {
  const [btc, alt] = fixture(1, -1, "catchup");
  const oracle = states(btc, alt, "drag-catchup-20-r50@m1");
  const math = new StreamMath();
  for (const n of [30, 50, 70, 88, 90]) {
    const cut = n * 60_000;
    const u = makeUniverse([headBars(btc, cut), headBars(alt, cut)]);
    const cache = u.caches[u.bars.findIndex(b => b.sym === alt.sym)].enableStreaming(math);
    const actual = dragState(cache, 20, .5, "catchup");
    assert.deepEqual([...actual], [...oracle.slice(0, n)]);
  }
});
