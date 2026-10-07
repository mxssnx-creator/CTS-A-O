// The paper step writes only what changed since its last step: new or moved positions, removed ones, and trades whose
// P&L changed (every position and every trade of the window on every step were ~20k rows).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diffPositions, diffTrades } from "./paper-rows.ts";

const pos = (cfg: string, entryT: number, stop: number) => ({ cfg, sym: "A-USDT", side: 1, entryT, entry: 10, stop, target: 11 });

describe("paper rows: only changes are written", () => {
  it("first step: every position; next: only new and changed ones, and the removed ones are named", () => {
    const a = pos("a", 1, 9);
    const b = pos("b", 2, 9);
    const first = diffPositions(null, [a, b]);
    assert.equal(first.write.length, 2);
    assert.equal(first.full, true, "the first step rewrites the table");
    const next = diffPositions(first.next, [a, { ...b, stop: 9.5 }, pos("c", 3, 9)]);
    assert.equal(next.full, false);
    assert.deepEqual(next.write.map((p) => p.cfg), ["b", "c"], "b's stop moved, c is new; a unchanged");
    assert.deepEqual(next.gone, []);
    const gone = diffPositions(next.next, [a]);
    assert.deepEqual(gone.write, []);
    assert.deepEqual(gone.gone.map((g) => g.cfg).sort(), ["b", "c"]);
    // a long and a short of one config on one bar are two rows
    const ls = diffPositions(null, [a, { ...a, side: -1 }]);
    assert.equal(ls.next.size, 2);
  });

  it("trades: written when new or when their P&L changed", () => {
    const t = (cfg: string, r: number) => ({ cfg, sym: "A-USDT", side: 1, entryT: 1, r });
    const unit = () => 10;
    const first = diffTrades(null, [t("a", 0.01), t("b", -0.02)], unit);
    assert.equal(first.write.length, 2);
    const next = diffTrades(first.next, [t("a", 0.01), t("b", -0.02), t("c", 0.03)], unit);
    assert.deepEqual(next.write.map((x) => x.t.cfg), ["c"]);
    const resized = diffTrades(next.next, [t("a", 0.01), t("b", -0.02), t("c", 0.03)], (x) => (x.cfg === "a" ? 20 : 10));
    assert.deepEqual(resized.write.map((x) => [x.t.cfg, x.pnl]), [["a", 0.2]]);
  });
});
