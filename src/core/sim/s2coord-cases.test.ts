// Stable-02 Block coordination (s2coord.ts) on hand-built close feeds: the cases s2coord.test.ts does not cover —
// windows judged only at every N-th close (inside / outside a window), the pause length, a pause re-armed by a losing
// window inside it, the PF = 1 boundary, the 6-result floor of the symbol PF, both sides fed the same way, the
// relation volume's picks and cap, and the switches off.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { S2Coord, type S2CoordSettings } from "./s2coord.ts";

const H = 3_600_000;
const WIN: S2CoordSettings = {
  windows: true,
  windowN: 3,
  relVolume: false,
  ratio: 0.1,
  minPf: 1.25,
  maxMult: 10,
  evalH: 2,
};
const REL: S2CoordSettings = { ...WIN, windows: false, relVolume: true };
const x = (sym: string, r: number, side = 1, cfg = `magnet|rsi@m5|p${sym}`) => ({
  cfg,
  sym,
  side,
  r,
  kind: "normal",
});
/** feed closes and record blocked(sym) after each */
const feed = (c: S2Coord, sym: string, rs: readonly number[], side = 1) =>
  rs.map((r) => {
    c.close(x(sym, r, side));
    return c.blocked(sym, side);
  });

describe("Stable-02 windows: more cases", () => {
  it("a window is judged only at every N-th close: a losing stretch across two windows is not a losing window", () => {
    const c = new S2Coord(WIN);
    // windows [+1, +1, +1] and [−5, −5, +20] (‰): after close 5 the latest three lose, but no window ends there
    const got = feed(c, "A", [0.001, 0.001, 0.001, -0.005, -0.005, 0.02]);
    assert.deepEqual(got, [null, null, null, null, null, null]);
    // a single losing close inside an open window holds nothing back
    const d = new S2Coord(WIN);
    assert.deepEqual(feed(d, "A", [-0.05]), [null]);
  });

  it("the pause lasts pauseN closes when set, else the window length", () => {
    const c = new S2Coord({ ...WIN, pauseN: 5 });
    const got = feed(c, "A", [0.01, -0.02, -0.02, 0.02, 0.02, 0.02, 0.02, 0.02]);
    // judged at close 3 (net −0.03): paused for 5 closes; close 6 ends a winning window (no re-arm)
    assert.deepEqual(got, [
      null,
      null,
      "s2Window",
      "s2Window",
      "s2Window",
      "s2Window",
      "s2Window",
      null,
    ]);
    const d = new S2Coord(WIN);
    assert.deepEqual(feed(d, "A", [0.01, -0.02, -0.02, 0.02, 0.02, 0.02]), [
      null,
      null,
      "s2Window",
      "s2Window",
      "s2Window",
      null,
    ]);
  });

  it("closes keep being judged during a pause: a losing window inside it re-arms the pause", () => {
    const c = new S2Coord(WIN);
    const got = feed(c, "A", [-0.01, -0.01, -0.01, -0.01, -0.01, -0.01, 0.1, 0.1, 0.1]);
    assert.deepEqual(got, [
      null,
      null,
      "s2Window",
      "s2Window",
      "s2Window",
      // close 6: the first pause has run out, but its window (−, −, −) re-arms it for 3 more closes
      "s2Window",
      "s2Window",
      "s2Window",
      // close 9: pause over, the window (+, +, +) wins, and the latest 9 results have PF 0.3 / 0.06 ≥ 1
      null,
    ]);
  });

  it("a window at PF exactly 1 (net 0) is not a losing window", () => {
    const c = new S2Coord({ ...WIN, windowN: 2 });
    assert.deepEqual(feed(c, "A", [0.25, -0.25]), [null, null]);
    // one tick worse: paused
    const d = new S2Coord({ ...WIN, windowN: 2 });
    assert.deepEqual(feed(d, "A", [0.25, -0.375]), [null, "s2Window"]);
  });

  it("the symbol's rolling PF needs 6 results before it can hold the symbol back", () => {
    const c = new S2Coord({ ...WIN, windowN: 50 });
    const got = feed(c, "A", [-0.01, -0.01, -0.01, -0.01, -0.01, -0.01]);
    assert.deepEqual(got, [null, null, null, null, null, "s2SymbolPf"]);
  });

  it("windows are per symbol", () => {
    const c = new S2Coord(WIN);
    feed(c, "A", [-0.01, -0.01, -0.01]);
    feed(c, "B", [0.01, 0.01, 0.01]);
    assert.equal(c.blocked("A", 1), "s2Window");
    assert.equal(c.blocked("B", 1), null);
    assert.equal(c.blocked("never-seen", 1), null);
    assert.deepEqual(c.snapshot(0).paused, ["A|1"]);
  });

  it("both sides: a short feed holds a symbol back exactly as the same long feed does", () => {
    for (const rs of [
      [0.01, -0.02, -0.02, 0.02, 0.02, 0.02, -0.01, -0.01, -0.01, 0.01],
      [-0.01, -0.01, -0.01, -0.01, -0.01, -0.01, 0.1, 0.1, 0.1],
    ]) {
      const long = feed(new S2Coord(WIN), "A", rs, 1);
      const short = feed(new S2Coord(WIN), "A", rs, -1);
      assert.deepEqual(short, long);
      assert.ok(
        long.some((b) => b !== null),
        "the feed pauses the symbol at some point",
      );
    }
  });

  it("long and short are judged apart: losing shorts never hold the symbol's longs back (6 Oct)", () => {
    const c = new S2Coord(WIN);
    feed(c, "A", [-0.01, -0.01, -0.01, -0.01, -0.01, -0.01], -1);
    assert.equal(c.blocked("A", -1), "s2Window", "the shorts are held back");
    assert.equal(c.blocked("A", 1), null, "the longs are not");
    feed(c, "A", [0.01, 0.01, 0.01], 1);
    assert.equal(c.blocked("A", 1), null);
    assert.deepEqual(c.snapshot(0).paused, ["A|-1"]);
  });

  it("windows off: nothing is held back, whatever the results", () => {
    const c = new S2Coord({ ...WIN, windows: false });
    assert.deepEqual(feed(c, "A", Array(30).fill(-0.05)), Array(30).fill(null));
    assert.deepEqual(c.snapshot(0), { factor: 0, paused: [] });
  });
});

describe("Stable-02 relation volume: more cases", () => {
  it("one winning close: one pick per major kind (ind, kind, side, book) plus every minor one (cfg, sub)", () => {
    const c = new S2Coord(REL);
    c.close(x("A", 0.01));
    // 4 major + 2 minor relations at PF ≥ 1.25 → 6 × 0.1 (symbol and symbol × side relations are tracked but are
    // neither a major nor a minor kind, so they add nothing)
    assert.ok(Math.abs(c.volume(0) - 1.6) < 1e-12, String(c.volume(0)));
  });

  it("at most 8 winners count, and the factor is capped at maxMult − 1", () => {
    const c = new S2Coord(REL);
    // 10 configs: 10 cfg relations + 1 sub + 4 major = 15 picks → 8
    for (let i = 0; i < 10; i++) c.close(x("A", 0.01, 1, `magnet|rsi@m5|p${i}`));
    assert.ok(Math.abs(c.volume(0) - 1.8) < 1e-12);
    const d = new S2Coord({ ...REL, maxMult: 1.3 });
    d.close(x("A", 0.01));
    assert.ok(Math.abs(d.volume(0) - 1.3) < 1e-12);
    // a maxMult below 1 adds nothing (never a reduction)
    const e = new S2Coord({ ...REL, maxMult: 0.5 });
    e.close(x("A", 0.01));
    assert.equal(e.volume(0), 1);
  });

  it("losing relations add nothing; a relation below minPf adds nothing", () => {
    const c = new S2Coord(REL);
    for (let i = 0; i < 6; i++) c.close(x("A", -0.01));
    assert.equal(c.volume(0), 1);
    // the best of a relation's last-N windows (N 1–3) is PF 1.2 < 1.25: after these six closes N=1 judged the last
    // close (PF 0), N=2 closes 5–6 (PF 1.2), N=3 closes 4–6 (PF 0.6)
    const d = new S2Coord(REL);
    for (const r of [-0.01, -0.01, -0.01, -0.01, 0.012, -0.01]) d.close(x("A", r));
    assert.equal(d.volume(0), 1);
  });

  it("re-evaluated only on the evalH grid: closes after an evaluation count from the next grid hour", () => {
    const c = new S2Coord(REL);
    assert.equal(c.volume(0.5 * H), 1);
    c.close(x("A", 0.01));
    assert.equal(c.volume(1.99 * H), 1, "same 2 h slot: the evaluation of hour 0 stands");
    assert.ok(Math.abs(c.volume(2 * H) - 1.6) < 1e-12, "the next slot sees the close");
    for (let i = 0; i < 6; i++) c.close(x("A", -0.02));
    assert.ok(Math.abs(c.volume(3.5 * H) - 1.6) < 1e-12, "still the evaluation at 2 h");
    assert.equal(c.volume(4 * H), 1, "the losses count from 4 h");
  });

  it("both sides: a winning short feed earns what the same winning long feed earns", () => {
    for (const rs of [[0.01], [0.01, 0.01, -0.002], [0.01, -0.03, 0.02, 0.02]]) {
      const l = new S2Coord(REL);
      const s = new S2Coord(REL);
      for (const r of rs) {
        l.close(x("A", r, 1));
        s.close(x("A", r, -1));
      }
      assert.equal(s.volume(0), l.volume(0), JSON.stringify(rs));
    }
  });

  it("relation volume off: volume 1 and factor 0", () => {
    const c = new S2Coord({ ...REL, relVolume: false });
    c.close(x("A", 0.05));
    assert.equal(c.volume(10 * H), 1);
    assert.equal(c.snapshot(10 * H).factor, 0);
  });
});
