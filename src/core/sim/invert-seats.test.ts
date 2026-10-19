// Contrarian execution (wf.invertSeats, an evaluation knob): the seats are the ones the selection picks, and each
// seat's entries execute on its mirror's tape (follow ↔ revert: the same entry bars, the other side, the same protect).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { buildTapes, defaultWalkForward, mirrorId, protectGrid, walkForward } from "./walkforward.ts";

const T_END = Date.UTC(2026, 9, 1);
const u = makeUniverse([
  barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3)),
  barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 1800, T_END, 5)),
]);
const tapes = buildTapes(
  u,
  protectGrid(15, { ...DEFAULT_SETTINGS.grid, holdH: [16] }),
  0.002,
  undefined,
  new Set(["follow|ema-21-55", "revert|ema-21-55", "follow|rsi-mom-14-20", "revert|rsi-mom-14-20"]),
);
const settings = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.0, minTrades: 3, maxDdr: 0 } };
// only the follow pairs passed Base: they take the seats, their revert mirrors never do
const o = {
  ...defaultWalkForward(settings),
  longH: 96,
  preH: 20,
  simH: 48,
  stepH: 1,
  basePassed: new Set(["follow|ema-21-55", "follow|rsi-mom-14-20"]),
  // the selection and execution mechanics, not the gates (they are tested on their own)
  validLastN: 0,
  lastN: 0,
  symGate: undefined,
  rangeGate: null,
  engineSideAccept: { enabled: false, minPf: 1.05, hours: 24, minTrades: 30 },
  gates: { ...settings.gates, minGreen: 0, maxDdtH: 1000 },
};

describe("contrarian execution (invertSeats)", () => {
  it("mirror ids swap follow and revert and nothing else", () => {
    assert.equal(mirrorId("follow|ema-21-55@m15|tp1|sl2|tr0|h64|mn"), "revert|ema-21-55@m15|tp1|sl2|tr0|h64|mn");
    assert.equal(mirrorId("revert|z-50-2"), "follow|z-50-2");
    assert.equal(mirrorId("trend|x"), null);
  });

  it("the follow mirror takes the same entry bars on the other side with the same protect", () => {
    const f = tapes.find((t) => t.bot === "follow" && t.ind === "ema-21-55" && t.n > 5)!;
    const r = tapes.find((t) => t.id === mirrorId(f.id))!;
    assert.ok(r, "the mirror tape exists");
    assert.deepEqual(r.protect, f.protect);
    const fe = new Set(Array.from(f.entryT));
    const shared = Array.from(r.entryT).filter((t) => fe.has(t));
    assert.ok(shared.length > 0, "shared entry bars");
    // at a shared entry the sides are opposite
    const i = Array.from(f.entryT).indexOf(shared[0]);
    const j = Array.from(r.entryT).indexOf(shared[0]);
    assert.equal(f.side[i], -r.side[j]);
  });

  it("the run seats the follow configs and executes their mirrors; off, it executes the seats themselves", () => {
    const plain = walkForward(u, tapes, o);
    const inv = walkForward(u, tapes, { ...o, invertSeats: true });
    assert.ok(plain.trades.length > 0 && inv.trades.length > 0, `${plain.trades.length} / ${inv.trades.length} orders`);
    assert.ok(plain.trades.every((t) => t.cfg.startsWith("follow|")), "the seats themselves");
    assert.ok(inv.trades.every((t) => t.cfg.startsWith("revert|")), "their mirrors");
    // every inverted order is a seated config's mirror, entered on a bar the seat's own tape enters on
    const seated = new Set(plain.steps.flatMap((s) => s.real ?? []));
    for (const t of inv.trades) assert.ok(seated.has(mirrorId(t.cfg)!), `${t.cfg} mirrors a seat`);
    assert.equal(inv.invertMissing, 0);
  });
});
