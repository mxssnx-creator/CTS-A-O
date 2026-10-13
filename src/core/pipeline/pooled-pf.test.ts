// The pooled PF of a group of sets (Σ gross profit ÷ Σ gross loss): a set with no losing close is all profit. Its stored
// PF is the PF_NO_LOSS sentinel (4), and reconstructing its gross sums from (pf, net) invented a loss of net / 3 for it
// (13 Oct). With a gross loss above 0 the stored PF is exact and the reconstruction is right.
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

  it("a set with no closes or no gain pools nothing; a PF exactly 1 pools nothing (no gross sums from it)", () => {
    assert.equal(grossOfStat({ pf: 0, net: 0, gp: 0, gl: 0 }), null);
    // all loss, PF 0: gl = net / (0 − 1) = 2, gp 0 — a real loss, pooled
    assert.deepEqual(grossOfStat({ pf: 0, net: -2 }), { gp: 0, gl: 2 });
    assert.deepEqual(grossOf(0, -2), { gp: 0, gl: 2 });
    assert.equal(grossOfStat({ pf: 1, net: 0 }), null);
  });
});
