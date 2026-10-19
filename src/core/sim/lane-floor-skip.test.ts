// A grid cell below its range's lane floor is a structural exclusion, never a Base-gate hold: the build statistics
// must not count it as "baseRange" even when the pair's tags leave that range out (they do: rangeAppliesTo keeps a
// floored range off a faster lane). Before, baseRange was tested first and every such cell read as held back by the
// gate (grid.allSets' completeness check failed on 22,800 of them, 13 Oct).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { buildTapes, protectGrid, type TapeBuildStat } from "./walkforward.ts";
import { microOwnInds } from "../server/runtime.server.ts";

describe("lane-floor cells in the build statistics", () => {
  it("a General / Long cell on the 1m lane is not a baseRange hold when the pair's tags leave those ranges out", () => {
    const T_END = Date.UTC(2026, 9, 1);
    const u = makeUniverse([barsFromCandles("A-USDT", 1, syntheticCandles("A-USDT", 1, 6000, T_END, 3))]);
    const protects = protectGrid(1, { ...DEFAULT_SETTINGS.grid, holdH: [16] });
    const bs = new Map<string, TapeBuildStat>();
    const id = "follow|rsi-mom-14-20@m1";
    buildTapes(u, protects, 0.002, undefined, new Set([id]), null, null, {
      minSl: 0,
      minTrail: 0,
      // the pair's tags as the runtime sets them: General and Long do not apply on the 1m lane (floor 15m)
      pairTags: { [id]: ["", "mn"] },
      rangeMinTf: { mc: 5, sh: 15, gn: 15, lg: 15 },
      microOwnInds: microOwnInds(DEFAULT_SETTINGS.grid),
      buildStats: bs,
    });
    const rows = [...bs.values()];
    const floored = rows.filter((x) => x.tag === "gn" || x.tag === "lg" || x.tag === "sh");
    assert.equal(floored.reduce((a, x) => a + (x.skip.baseRange ?? 0), 0), 0, `baseRange on floored ranges: ${JSON.stringify(floored.map((x) => [x.tag, x.skip]))}`);
    // the Minimal cells (no floor) build as usual
    const mn = rows.filter((x) => x.tag === "mn");
    assert.ok(mn.length > 0 && mn.every((x) => x.built === x.grid), JSON.stringify(mn.map((x) => [x.kind, x.grid, x.built, x.skip])));
  });
});
