// Stable-02 Block coordination: last-N symbol windows and relation volume, on every closed candidate result.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { S2Coord } from "./s2coord.ts";

const H = 3_600_000;
const opts = {
  windows: true,
  windowN: 3,
  relVolume: true,
  ratio: 0.4,
  minPf: 1.25,
  maxMult: 1.8,
  evalH: 2,
};
const x = (sym: string, r: number, side = 1) => ({
  cfg: `magnet|rsi@m5|p${sym}`,
  sym,
  side,
  r,
  kind: "normal",
});

describe("Stable-02 Block coordination", () => {
  it("a losing last-N window holds a symbol back for its next N closes", () => {
    const c = new S2Coord({ ...opts, relVolume: false });
    c.close(x("A", 0.05));
    c.close(x("A", -0.02));
    assert.equal(c.blocked("A", 1), null, "window not complete yet");
    c.close(x("A", -0.04)); // window of 3: net < 0 → pause 3
    assert.equal(c.blocked("A", 1), "s2Window");
    assert.equal(c.blocked("B", 1), null);
    c.close(x("A", 0.05));
    c.close(x("A", 0.05));
    assert.equal(c.blocked("A", 1), "s2Window", "1 close of the pause left");
    c.close(x("A", 0.05)); // pause over; new window positive; overall PF 0.2 / 0.06 > 1
    assert.equal(c.blocked("A", 1), null);
  });

  it("a symbol whose latest 24 results have PF < 1 takes no entries, and comes back when they recover", () => {
    const c = new S2Coord({ ...opts, windowN: 50, relVolume: false });
    for (const r of [0.01, -0.03, 0.01, -0.03, 0.01, -0.03]) c.close(x("A", r));
    assert.equal(c.blocked("A", 1), "s2SymbolPf");
    for (let i = 0; i < 24; i++) c.close(x("A", 0.01));
    assert.equal(c.blocked("A", 1), null, "rolling: the losses aged out");
  });

  it("winning relations add 0.4 volume each, capped at 1.8×, re-evaluated every 2 h", () => {
    const c = new S2Coord({ ...opts, windows: false });
    assert.equal(c.volume(0), 1, "no history");
    for (let i = 0; i < 6; i++) c.close(x("A", 0.01));
    assert.equal(c.volume(H), 1, "still the evaluation of hour 0");
    // hour 2: every relation of A won → many winners, capped at maxMult
    assert.ok(Math.abs(c.volume(2 * H) - 1.8) < 1e-9);
    const off = new S2Coord({ ...opts, relVolume: false });
    assert.equal(off.volume(10 * H), 1);
  });
});
