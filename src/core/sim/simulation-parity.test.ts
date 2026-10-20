import assert from "node:assert/strict";
import { it } from "node:test";
import { tapeReturnIndex } from "../audit.ts";
import { makeTape } from "./walkforward.ts";
import { configId } from "../pipeline/pipeline.ts";
import type { StratKind, Trade } from "../domain/types.ts";
it("runtime parity isolates every strategy, lane, range, side and protection identity", () => {
  let checked = 0;
  for (const kind of [
    "normal",
    "trailing",
    "trailing-only",
    "exit",
    "dca",
    "dca-active",
    "axis",
  ] as StratKind[])
    for (const tf of [1, 5, 15])
      for (const tag of ["mc", "mn", "sh", "gn"] as const)
        for (const side of [1, -1] as const) {
          const p = {
            tp: 0.01,
            sl: 0.02,
            trail: kind.startsWith("trailing") ? 0.005 : 0,
            hold: 60,
            tag,
          };
          const ind = `micro-${tf}-drawdown-turn-fast@m${tf}`,
            cfg = configId("follow", ind, p, kind);
          const t = {
            cfg,
            sym: "A",
            side,
            entryT: 10,
            exitT: 20,
            entry: 100,
            exit: 100 * (1 + side * 0.0115),
            r: 0.01,
            reason: "tp",
            bars: 1,
            mfe: 0,
            mae: 0,
            kind,
          } as Trade;
          const tp = makeTape(
            cfg,
            "follow",
            ind,
            p,
            kind,
            ["A", "B"],
            [t, { ...t, sym: "B", r: -0.02 }],
            [],
            [],
          );
          assert.ok(tapeReturnIndex(tp, { ...t, r: 0.03, mult: 3 }) >= 0, cfg);
          for (const patch of [
            { cfg: cfg + "|sibling" },
            { sym: "MISSING" },
            { side: -side },
            { entryT: 11 },
            { exitT: 21 },
            { r: 0.0085, mult: 1 },
            { r: 0.01, mult: undefined },
            { r: 0.03, mult: 3, unitR: null },
          ])
            assert.equal(
              tapeReturnIndex(tp, { ...t, ...patch } as Trade),
              -1,
              `${cfg}: ${JSON.stringify(patch)}`,
            );
          checked++;
        }
  assert.equal(checked, 168);
});
