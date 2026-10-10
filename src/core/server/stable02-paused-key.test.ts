// Stable-02 symbol pause at paper / live entries: the simulation's end snapshot holds symbol × direction keys
// (`sym|±1`, sim/s2coord.ts), so the paper check must refuse an entry only on the paused direction.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { S2Coord } from "../sim/s2coord.ts";
import { mk, stopStarted } from "./runtime-harness.ts";

afterEach(stopStarted);

const H = 3_600_000;
const opts = {
  windows: true,
  windowN: 3,
  relVolume: false,
  ratio: 0.4,
  minPf: 1.25,
  maxMult: 1.8,
  evalH: 2,
};
const cfg = "magnet|rsi@m5|pA";

describe("Stable-02 symbol pause at paper / live entries", () => {
  it("a pause on BTC long refuses a paper entry on BTC long and admits BTC short, as the simulation does", () => {
    // the simulation: a losing window on BTC in direction +1 only
    const s2 = new S2Coord(opts);
    for (const r of [0.01, -0.02, -0.03]) s2.close({ cfg, sym: "BTC", side: 1, r, kind: "normal" });
    const snap = s2.snapshot(0);
    assert.deepEqual(snap.paused, ["BTC|1"], "the simulation's snapshot keys are sym|side");
    assert.equal(s2.blocked("BTC", 1), "s2Window");
    assert.equal(s2.blocked("BTC", -1), null);

    // paper / live: the same run's end snapshot as the runtime's sim, Stable-02 windows on
    const rt = mk() as any;
    rt.wf.coord = {
      enabled: true,
      hourLock: 0,
      cooldown: "off",
      conflict: false,
      confirm: true,
      s2Windows: true,
    };
    rt.sim = { s2: snap };
    const op = (side: number) => ({ cfg, sym: "BTC", side, entryT: 10 * H });
    assert.equal(
      rt.entryHeldBack(op(1), new Map(), [], new Map()),
      "s2Window",
      "a paper entry long on the paused symbol × direction is refused",
    );
    assert.equal(
      rt.entryHeldBack(op(-1), new Map(), [], new Map()),
      null,
      "the short side of the same symbol is not paused",
    );
  });
});
