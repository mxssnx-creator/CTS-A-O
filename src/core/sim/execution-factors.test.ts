import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { modeledUnitReturn } from "../metrics/stats.ts";
import { CoreDb } from "../server/db.server.ts";
import { CoreRuntime } from "../server/runtime.server.ts";
import { blockMult, subTypeOf } from "../statistics.ts";
import { defaultWalkForward, makeTape, walkForward } from "./walkforward.ts";

const H = 3_600_000;
const M = 60_000;
const NOW = Date.UTC(2026, 9, 17, 12);
const START = NOW - 6 * H;
const IND = "trend-ema-12-26@m15c";
const ID = `follow|${IND}|tp1|sl1|tr0|h32|gn`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag: "gn" as const };

describe("captured independent execution factors", () => {
  it("records indication, relation and range sizing exactly once while retaining unit returns", () => {
    const close = (entryT: number): Trade => ({
      cfg: ID, sym: "AAA-USDT", side: 1, entryT, exitT: entryT + 30 * M,
      entry: 100, exit: 101, r: 0.01, mult: 1, reason: "tp", bars: 2, mfe: 0, mae: 0, kind: "normal",
    });
    const history = Array.from({ length: 30 }, (_, i) => close(NOW - (100 - i) * H));
    for (const h of [5, 3, 1]) history.push(close(NOW - h * H + 10 * M));
    history[history.length - 2] = { ...history[history.length - 2], r: -0.003, reason: "sl" };
    const open = { cfg: ID, sym: "AAA-USDT", side: 1 as const, entryT: NOW - 10 * M,
      entryI: 0, entry: 100, stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0.003 };
    const tp = makeTape(ID, "follow", IND, P, "normal", ["AAA-USDT"], history, [open], []);
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    const run = walkForward({ bars: [], caches: [], startT: START - 100 * H, endT: NOW, splitT: START, nowT: NOW, baseTf: 60 } as never, [tp], {
      ...defaults, startT: START, simH: 6, longH: 336, validLastN: 0, lastN: 0,
      symGate: "off", rangeGate: undefined, preGate: false,
      toggles: { ...defaults.toggles, normal: true, block: false },
      indicationVolumeFactors: { coordination: 8, combined: { trend: 3 } },
      rangeVolumeFactors: { gn: 1.8 },
      coord: { ...defaults.coord!, enabled: true, s2RelVolume: true, s2Increase: 0.05 },
    });
    assert.equal(run.trades.length, 3);
    assert.ok(run.trades.some((x) => (x.coordVol ?? 1) > 1), "causal settled history raises later relation sizing");
    assert.equal(run.openAtEnd?.length, 1);
    for (const x of [...run.trades, ...run.openAtEnd!]) {
      assert.equal(x.volFactor, 3);
      assert.equal(x.rangeVol, 1.8);
      const expected = (x.coordVol ?? 1) * 3 * 1.8;
      assert.ok(Math.abs(x.mult! - expected) < 1e-12);
      assert.ok(Math.abs(x.vol! - expected) < 1e-12);
      const expectedReturn = x.markedOpen ? open.mtm : history.find((t) => t.entryT === x.entryT)!.r;
      assert.ok(Math.abs(modeledUnitReturn(x) - expectedReturn) < 1e-12);
      assert.ok(Math.abs(blockMult(x) - 1) < 1e-12, "independent sizing is not a Block raise");
    }
    const neutral = walkForward({ bars: [], caches: [], startT: START - 100 * H, endT: NOW, splitT: START, nowT: NOW, baseTf: 60 } as never, [tp], {
      ...defaults, ...run.opts,
      indicationVolumeFactors: { coordination: 1, combined: { trend: 1 } },
      rangeVolumeFactors: { gn: 1 },
    });
    assert.deepEqual(run.trades.map((x) => x.entryT), neutral.trades.map((x) => x.entryT));
    assert.ok(Number.isFinite(run.stats.pf), "the sample includes a settled loss rather than a no-loss sentinel");
    assert.ok(Math.abs(run.stats.pf - neutral.stats.pf) < 1e-12, "primary unit PF is unchanged by sizing factors");
    assert.ok(Math.abs(run.stats.net - neutral.stats.net) < 1e-12);
  });

  it("keeps all captured factors on a restored held position despite changed range settings", () => {
    const db = new CoreDb(":memory:");
    const position = {
      cfg: ID, sym: "AAA-USDT", side: 1 as const, entryT: NOW - H,
      entryI: 0, entry: 100, stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0,
      coordVol: 1.4, volFactor: 3, hedgeVol: 1.6, rangeVol: 1.8,
      vol: 1.4 * 3 * 1.6 * 1.8,
    };
    db.kvSet("paperBook", { at: Date.now(), startedAt: NOW - 2 * H, selected: [ID], positions: [position] });
    const settings = structuredClone(DEFAULT_SETTINGS);
    if (settings.grid.general) settings.grid.general.volumeFactor = 0.6;
    const runtime = new CoreRuntime(db, settings, { market: "synthetic" });
    try {
      assert.deepEqual(runtime.paper.positions, [position], "restored sizing and protection come from the held entry");
      assert.equal(runtime.paper.positions[0].rangeVol, 1.8, "new range settings cannot relabel the held multiplier");
    } finally {
      runtime.dispose();
    }
  });

  it("removes all four independent factors when classifying Block volume", () => {
    const factors = { coordVol: 1.4, volFactor: 3, hedgeVol: 1.6, rangeVol: 1.8 };
    const mult = factors.coordVol * factors.volFactor * factors.hedgeVol * factors.rangeVol;
    const trade = { cfg: ID, sym: "AAA-USDT", side: 1 as const, entryT: START, exitT: START + H, entry: 100, r: 0.01, reason: "tp", ...factors, mult };
    assert.ok(Math.abs(blockMult(trade) - 1) < 1e-12);
    assert.deepEqual(subTypeOf(trade, 2), ["Base (unit volume)"]);
    assert.ok(Math.abs(blockMult({ ...trade, mult: mult * 2 }) - 2) < 1e-12);
  });
});
