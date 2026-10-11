// rangeFit fits only the gated ranges (micro / minimal / short / plus); General and Long keep every target. The cell
// filter reads the fitted set, so a General or Long cell must be in it, or the whole range is dropped.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Protect } from "./domain/types.ts";
import { fittedRangeTps } from "./sim/walkforward.ts";

const cell = (tag: string, tp: number): Protect => ({ tp, sl: 1, trail: 0, hold: 10, tag }) as Protect;

describe("rangeFit: General and Long keep every target", () => {
  const protects = [cell("gn", 0.032), cell("gn", 0.044), cell("lg", 0.048), cell("lg", 0.06), cell("sh", 0.02)];
  const fit = { lo: 0.5, hi: 2, keep: 1 } as never;

  it("every General and Long target is in the fitted set", () => {
    const keep = fittedRangeTps("rsi-14-25", 15, protects, 0.003, fit);
    assert.ok(keep, "a fitted set is built when rangeFit is on and sigma is known");
    for (const p of protects.filter((x) => x.tag === "gn" || x.tag === "lg"))
      assert.ok(keep.has(`${p.tag}|${p.tp}`), `${p.tag} ${p.tp} is kept`);
  });

  it("a gated range is still fitted to its band (Short keeps at least its nearest target)", () => {
    const keep = fittedRangeTps("rsi-14-25", 15, protects, 0.003, fit)!;
    assert.ok(keep.has("sh|0.02"), "the Short cell is kept");
  });
});
