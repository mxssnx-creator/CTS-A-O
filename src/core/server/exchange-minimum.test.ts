// The exchange-minimum round-up, one rule for every path that sizes an order (live.ts: minRaiseBlock, controlTargets,
// scaleToExposure through scaleToRisk): a desired size under the venue minimum is rounded UP to it only while the
// rounded notional still fits the per-position cap and the account caps (gross exposure, stop risk, worst case).
// Past a cap the target is dropped with its reason; a held position is never dropped or closed for it.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  controlTargets,
  isMinAboveCapSkip,
  minRaiseBlock,
  scaleToExposure,
  scaleToRisk,
  type ControlSettings,
  type ControlTarget,
} from "./live.ts";

// a venue whose smallest order is 2 USDT at any price (no lot grid): a quantity under it is raised to it
const MIN_USDT = 2;
const snapRaw = (_s: string, q: number, px: number) => {
  const need = MIN_USDT / px;
  return q + 1e-12 >= need ? { qty: q, raised: false } : { qty: need, raised: true };
};
const snapNum = (s: string, q: number, px: number) => snapRaw(s, q, px).qty;

const cs = (cap: number, extra: Partial<ControlSettings> = {}): ControlSettings => ({
  notionalUsd: 1,
  ratio: 1,
  maxNotionalUsd: cap,
  maxPositions: 0,
  rebalancePct: 0.25,
  minStopPct: 0.01,
  ...extra,
});

const target = (sym: string, notional: number, px = 100): ControlTarget => ({
  key: `${sym}|1`,
  sym,
  side: 1,
  lanes: 1,
  vol: 1,
  qty: notional / px,
  notional,
  stopDist: 0.05,
});

describe("the exchange-minimum round-up rule", () => {
  it("minRaiseBlock: a raised size is taken while it fits the cap; no cap means no limit", () => {
    assert.equal(minRaiseBlock(2, 5), null, "fits");
    assert.equal(minRaiseBlock(5, 5), null, "exactly the cap");
    assert.equal(minRaiseBlock(50, Number.POSITIVE_INFINITY), null, "no cap");
    const why = minRaiseBlock(5, 3);
    assert.match(why!, /^exchange minimum 5\.00 USD is over the position cap 3\.00 USD/);
    assert.ok(isMinAboveCapSkip(why!), "the simulator counts it as a minimum skip");
  });

  it("controlTargets: raised to the minimum while it fits the cap; past it skipped, and a held key is kept", () => {
    const lanes = [{ cfg: "a", sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.01 }];
    const px = new Map([["A-USDT", 100]]);
    // a 1 USDT desired size against a 2 USDT minimum: rounded up to 2 USDT, which fits a 2 USDT cap
    const fits = controlTargets(lanes, px, cs(2), snapRaw);
    assert.equal(fits.targets.length, 1);
    assert.equal(fits.targets[0].raised, true);
    assert.ok(Math.abs(fits.targets[0].notional - 2) < 1e-9);
    assert.equal(fits.targets[0].atMin, undefined, "not past the cap");
    // the same minimum over a 1.5 USDT cap: not traded, with the reason
    const over = controlTargets(lanes, px, cs(1.5), snapRaw);
    assert.equal(over.targets.length, 0);
    assert.match(over.skipped[0].why, /^exchange minimum 2\.00 USD is over the position cap 1\.50 USD/);
    // held on that key: kept as it is (never closed for being too large)
    const heldOver = controlTargets(lanes, px, cs(1.5, { heldKeys: new Set(["A-USDT|1"]) }), snapRaw);
    assert.equal(heldOver.skipped[0].keep, "A-USDT|1");
    // no cap (Infinity, the live step's reading of 0): the minimum is traded
    assert.equal(controlTargets(lanes, px, cs(Number.POSITIVE_INFINITY), snapRaw).targets.length, 1);
  });
});

describe("gross exposure through the shared stop-risk scaler", () => {
  it("a round-up that would take the gross past the cap is dropped (the weakest new one first), a held one stays", () => {
    // cap 2.5 USDT (equity 2.5, maxX 1). H is held (1 USDT, its minimum is 1 USDT of its own size), N1 and N2 are
    // new at 3 USDT each with a 2 USDT minimum: the survivors at their minimum alone (1 + 2 + 2) are over the cap
    const ts = [target("H-USDT", 1), target("N1-USDT", 3), target("N2-USDT", 3)];
    const r = scaleToExposure(ts, 2.5, 1, snapNum, new Set(["H-USDT|1"]));
    assert.ok(r, "the scaler ran");
    assert.deepEqual(r.dropped, ["N2-USDT|1", "N1-USDT|1"], "weakest new first");
    assert.deepEqual(
      ts.map((t) => t.key),
      ["H-USDT|1"],
      "only the held target survives",
    );
    const gross = ts.reduce((a, t) => a + Math.abs(t.notional), 0);
    assert.ok(gross <= 2.5 * 1.0001 + 1e-9, `gross ${gross} within the cap`);
  });

  it("the drops are the same as the stop-risk scaler's: exposure is that budget with a unit cost per USDT", () => {
    const a = [target("N1-USDT", 3), target("N2-USDT", 3), target("N3-USDT", 4)];
    const b = a.map((t) => ({ ...t }));
    const e = scaleToExposure(a, 2.5, 1, snapNum);
    const s = scaleToRisk(b, 2.5, 1, snapNum, undefined, () => 1);
    assert.deepEqual(e?.dropped, s?.dropped);
    assert.ok(Math.abs((e?.factor ?? 0) - (s?.factor ?? -1)) < 1e-12);
  });

  it("randomised: after scaling, the gross is within the cap unless every survivor is held", () => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let n = 0; n < 300; n++) {
      const count = 1 + Math.floor(rnd() * 8);
      const equity = 1 + rnd() * 30;
      const maxX = 0.2 + rnd() * 2;
      const ts: ControlTarget[] = [];
      const held = new Set<string>();
      for (let i = 0; i < count; i++) {
        const t = target(`S${i}-USDT`, 0.5 + rnd() * 12, 50 + rnd() * 200);
        if (rnd() < 0.3) held.add(t.key);
        ts.push(t);
      }
      const r = scaleToExposure(ts, equity, maxX, snapNum, held);
      assert.ok(r, "maxX and equity given: the scaler runs");
      const gross = ts.reduce((a, t) => a + Math.abs(t.notional), 0);
      const allHeld = ts.every((t) => held.has(t.key));
      assert.ok(
        gross <= maxX * equity * 1.0001 + 1e-9 || allHeld,
        `case ${n}: gross ${gross} over ${maxX * equity} with ${ts.length} targets, held ${held.size}`,
      );
      for (const t of ts) assert.ok(t.qty > 0, `case ${n}: ${t.key} has a size`);
    }
  });
});
