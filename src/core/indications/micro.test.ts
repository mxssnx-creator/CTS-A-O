// Micro indications ("mc-…"): one-bar reversal events, causal (bar i reads bars 0..i only), and with
// grid.micro.ownInds the Micro range trades only them while they trade only Micro cells.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { microSpecs, isMicroInd } from "./micro.ts";
import { INDICATION_BY_ID } from "./registry.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes } from "../sim/walkforward.ts";
import type { Protect } from "../domain/types.ts";

const t0 = Date.UTC(2026, 8, 20);
const bars = () => barsFromCandles("A-USDT", 1, syntheticCandles("A", 1, 1500, t0));

describe("micro indications", () => {
  it("are registered, fire on some bars, and are causal", () => {
    const full = new SeriesCache(bars());
    let firing = 0;
    for (const s of microSpecs()) {
      assert.ok(INDICATION_BY_ID.get(s.id), s.id);
      assert.ok(isMicroInd(s.id));
      const a = s.fn(full);
      // smooth synthetic bars hold few spikes: most, not every, indication fires on them
      if (a.some((x) => x !== 0)) firing++;
      // the state at bar i is the same when computed on bars 0..i only
      const b = bars();
      const cut = 900;
      const part = new SeriesCache({ ...b, n: cut + 1, t: b.t.slice(0, cut + 1), o: b.o.slice(0, cut + 1), h: b.h.slice(0, cut + 1), l: b.l.slice(0, cut + 1), c: b.c.slice(0, cut + 1), v: b.v.slice(0, cut + 1) });
      const p = s.fn(part);
      for (let i = 0; i <= cut; i++) assert.equal(p[i], a[i], `${s.id} bar ${i}`);
    }
    assert.ok(firing >= microSpecs().length - 2, `${firing} fire`);
  });

  it("with Micro's own indications, Micro cells go only to them and they take only Micro cells", () => {
    const u = makeUniverse([bars()]);
    const protects: Protect[] = [
      { tp: 0.003, sl: 0.003, trail: 0, hold: 64, tag: "mc" },
      { tp: 0.012, sl: 0.012, trail: 0, hold: 64, tag: "mn" },
    ];
    const only = new Set(["follow|mc-rsi2-5@m1", "follow|rsi-mom-14-20@m1"]);
    const got = (own: boolean) =>
      buildTapes(u, protects, 0.002, undefined, only, null, undefined, { minSl: 0, minTrail: 0, microOwnInds: own })
        .map((x) => `${x.ind} ${x.protect.tag}`)
        .sort();
    assert.deepEqual(got(true), ["mc-rsi2-5@m1 mc", "rsi-mom-14-20@m1 mn"]);
    assert.equal(got(false).length, 4);
  });
});
