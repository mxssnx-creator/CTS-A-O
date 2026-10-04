// Every Axis set the settings ask for is computed, each its own tape (axisVariants).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { axisVariants } from "./walkforward.ts";
import { DEFAULT_AXIS } from "../config.ts";
import { checkSettings } from "../settings-check.ts";

describe("Axis: every configured set", () => {
  it("one mode as before: range types × ladder depths", () => {
    const v = axisVariants({ ...DEFAULT_AXIS }, ["p"]);
    assert.equal(v.length, DEFAULT_AXIS.ranges!.length * DEFAULT_AXIS.levelsSet!.length);
    assert.ok(v.every((x) => x.tag.startsWith("|ax-") && x.ax.mode === "revert"));
    const desk = axisVariants({ ...DEFAULT_AXIS, mode: "desk" }, ["p"]);
    assert.ok(desk.every((x) => x.tag.startsWith("|axd-") && !x.tag.endsWith("h")));
  });

  it("every mode, range type, ladder depth and desk plain + hybrid, each with its own id", () => {
    const ax = {
      ...DEFAULT_AXIS,
      modes: ["revert", "desk"] as Array<"revert" | "desk">,
      hybrids: [false, true],
      ranges: ["atr", "linear", "geo", "fib", "volume"] as Array<"atr" | "linear" | "geo" | "fib" | "volume">,
      levelsSet: [2, 3, 4],
    };
    const v = axisVariants(ax, ["p"]);
    // revert 5 × 3 + desk 5 × 3 × 2
    assert.equal(v.length, 15 + 30);
    assert.equal(new Set(v.map((x) => x.tag)).size, v.length, "unique tags");
    for (const x of v) {
      assert.equal(x.tag.startsWith("|axd-"), x.ax.mode === "desk");
      assert.equal(x.tag.endsWith("h"), x.ax.mode === "desk" && !!x.ax.hybrid);
      assert.ok(x.tag.includes(`${x.ax.range}${x.ax.levels}`));
    }
  });

  it("revert with fixed exits: one set per protect, beside the desk sets", () => {
    const v = axisVariants({ ...DEFAULT_AXIS, exits: "fixed", modes: ["revert", "desk"] }, ["p1", "p2", "p3"]);
    assert.equal(v.filter((x) => x.ax.mode === "revert").length, 3);
    assert.equal(v.filter((x) => x.ax.mode === "desk").length, DEFAULT_AXIS.ranges!.length * DEFAULT_AXIS.levelsSet!.length);
  });

  it("settings check: modes, hybrids, ladder depths", () => {
    checkSettings({ axis: { ...DEFAULT_AXIS, modes: ["revert", "desk"], hybrids: [false, true], levelsSet: [2, 3, 4] } });
    assert.throws(() => checkSettings({ axis: { ...DEFAULT_AXIS, modes: ["x" as never] } }));
    assert.throws(() => checkSettings({ axis: { ...DEFAULT_AXIS, hybrids: [] } }));
    assert.throws(() => checkSettings({ axis: { ...DEFAULT_AXIS, levelsSet: [2.5] } }));
  });
});
