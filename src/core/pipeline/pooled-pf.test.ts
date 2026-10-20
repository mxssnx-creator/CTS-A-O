// The pooled PF of a group of sets (Σ gross profit ÷ Σ gross loss): a set with no losing close is all profit. Its stored
// PF is the PF_NO_LOSS sentinel (4), and reconstructing its gross sums from (pf, net) invented a loss of net / 3 for it
// (13 Oct). Exact gross sums also preserve break-even sets that PF / net cannot reconstruct.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PF_NO_LOSS } from "../config.ts";
import { grossOf, grossOfStat, pooledPf } from "./pipeline.ts";

describe("pooled PF of sets", () => {
  it("a no-loss set pools as all profit, not as a PF-4 set with a phantom loss", () => {
    const noLoss = { pf: PF_NO_LOSS, net: 3, gp: 3, gl: 0 };
    assert.deepEqual(grossOfStat(noLoss), { gp: 3, gl: 0 });
    // the reconstruction alone cannot tell the sentinel from a true PF 4: it gives gl = net / 3
    assert.deepEqual(grossOf(PF_NO_LOSS, 3), { gp: 4, gl: 1 });
    const losing = { pf: 0.5, net: -1, gp: 1, gl: 2 };
    const p = pooledPf([noLoss, losing]);
    assert.equal(p.gp, 4);
    assert.equal(p.gl, 2);
    assert.equal(p.pf, 2, "Σgp / Σgl = (3 + 1) / (0 + 2); the phantom loss gave (4 + 1) / (1 + 2)");
  });

  it("a set with a gross loss pools from its exact PF and net, whether or not gp / gl are given", () => {
    const a = { pf: 2, net: 1 }; // gp 2, gl 1
    const b = { pf: 2, net: 1, gp: 2, gl: 1 };
    assert.deepEqual(grossOfStat(a), { gp: 2, gl: 1 });
    assert.deepEqual(grossOfStat(b), { gp: 2, gl: 1 });
    assert.equal(pooledPf([a, b]).pf, 2);
  });

  it("includes a break-even set's exact profit and loss instead of inflating the pooled PF", () => {
    const even = { pf: 1, net: 0, gp: 100, gl: 100 };
    assert.deepEqual(grossOfStat(even), { gp: 100, gl: 100 });
    const pooled = pooledPf([even, { pf: 2, net: 1, gp: 2, gl: 1 }]);
    assert.equal(pooled.gp, 102);
    assert.equal(pooled.gl, 101);
    assert.equal(pooled.pf, 102 / 101);
  });

  it("uses exact sums when a ratio is rounded to one or capped, preserving their own units", () => {
    assert.deepEqual(grossOfStat({ pf: 1, net: 0.0001, gp: 100.000001, gl: 100 }), { gp: 100.000001, gl: 100 });
    // A tape carries gross sums in fractions and net in percent. The exact sums are authoritative.
    assert.deepEqual(grossOfStat({ pf: PF_NO_LOSS, net: 3, gp: 0.03, gl: 0 }), { gp: 0.03, gl: 0 });
    assert.deepEqual(grossOfStat({ pf: Infinity, net: 3, gp: 3, gl: 0 }), { gp: 3, gl: 0 });
    assert.deepEqual(pooledPf([{ pf: Infinity, net: 3, gp: 3, gl: 0 }]), { pf: null, gp: 3, gl: 0 });
  });

  it("rejects invalid explicit sums rather than inventing a favorable split", () => {
    for (const [gp, gl] of [[Infinity, 0], [1, NaN], [-1, 0], [1, -1]])
      assert.equal(grossOfStat({ pf: 4, net: 3, gp, gl }), null);
  });

  it("empty sets pool nothing; PF exactly 1 without gross sums cannot be reconstructed", () => {
    assert.equal(grossOfStat({ pf: 0, net: 0, gp: 0, gl: 0 }), null);
    // all loss, PF 0: gl = net / (0 − 1) = 2, gp 0 — a real loss, pooled
    assert.deepEqual(grossOfStat({ pf: 0, net: -2 }), { gp: 0, gl: 2 });
    assert.deepEqual(grossOf(0, -2), { gp: 0, gl: 2 });
    assert.equal(grossOfStat({ pf: 1, net: 0 }), null);
  });
});
