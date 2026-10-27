import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { defaultWalkForward, makeTape, type WalkForwardResult } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

it("publishes the actual full paper selection's post-Base validation separately from execution", () => {
  const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, {}, { market: "synthetic", priceStream: null });
  const t = Date.UTC(2026, 9, 20), H = 3_600_000;
  const protect = { tp: 0.01, sl: 0.02, trail: 0, hold: 4, tag: "mc" as const };
  const ind = "rsi-mom-14-20@m15", pair = `follow|${ind}`;
  const make = (suffix: string, losing: boolean) => {
    const id = `${pair}|tp1|sl2|tr0|h4|mc|${suffix}`;
    const rows: Trade[] = Array.from({ length: 60 }, (_, i) => ({ cfg: id, sym: "A", side: 1,
      entryT: t - (61 - i) * 20 * 60_000, exitT: t - (60 - i) * 20 * 60_000,
      entry: 100, exit: 101, r: losing || i === 0 ? -0.01 : 0.01, mult: 1, kind: "normal",
      reason: "tp", bars: 1, mfe: 0, mae: 0 }));
    return makeTape(id, "follow", ind, protect, "normal", ["A"], rows, [], []);
  };
  try {
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    rt.wf = { ...defaults, mode: "fixed", preH: 6, longH: 24, preGate: false, lastN: 0, validLastN: 15,
      portfolio: 0, rangeGate: undefined, rangeOpts: undefined, symGate: "off", basePassed: new Set([pair]),
      basePassedRanges: { [pair]: ["mc"] },
      gates: { ...defaults.gates, minTrades: 12, minPf: 1.1, rangeMinPf: undefined, maxDdr: 0,
        maxDdtH: 1000, minGreen: 0, stableBlocks: 0, lossPrior: false } };
    rt.settings.live.liveLastN = 0;
    rt.tapes = [make("good", false), make("bad", true)];
    rt.sim = { startT: t - 24 * H, endT: t, steps: [], feed: [], trades: [] } as unknown as WalkForwardResult;
    const hook = rt as unknown as { stepPaper(): void };
    hook.stepPaper();
    const progress = rt.status.postBaseValidation;
    assert.ok(progress);
    assert.equal(progress.at, t);
    assert.equal(progress.evaluated, 2);
    assert.equal(progress.passed, 1);
    assert.equal(progress.closes, 60);
    assert.ok(Math.abs(progress.pf! - 59) < 1e-9);
    assert.equal(rt.paper.positions.length, 0, "validation history did not become an execution");
  } finally { rt.dispose(); db.db.close(); }
});
