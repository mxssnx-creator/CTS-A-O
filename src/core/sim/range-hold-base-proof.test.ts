import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, RangeTag } from "../domain/types.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { laneProtect, makeUniverse, protectCellKey, rangeBaseStats } from "../pipeline/pipeline.ts";
import { baseAllowsTape, buildTapes, cellAllowed, passedCellsOf } from "./walkforward.ts";

for (const tag of ["mc", "mn", "sh"] as RangeTag[]) for (const kind of ["normal", "trailing", "trailing-only"] as const)
  for (const tf of [1, 5, 15]) for (const cap of [10, 15, 20]) {
    test(`Base proof: ${tag} ${kind}, ${cap}m hold on the ${tf}m lane`, () => {
      const ind = `${tag === "mc" ? "mc-rsi2-5" : "rsi-mom-14-20"}@m${tf}`;
      const pair = `follow|${ind}`, cost = DEFAULT_SETTINGS.cost;
      const p: Protect = { tp: kind === "trailing-only" ? 0 : 0.0035, sl: 0.005,
        trail: kind === "normal" ? 0 : 0.003, hold: Math.max(1, Math.round(cap / 15)), tag, maxHoldMin: cap,
        ...(kind === "trailing-only" ? { trailOnly: true } : {}) };
      const lane = laneProtect(p, ind), proof: string[] = [];
      const u = makeUniverse([3, 5].map((seed, i) => barsFromCandles(`S${i}`, tf,
        syntheticCandles(`S${i}`, tf, 1800, Date.UTC(2026, 9, 1), seed))));
      const result = rangeBaseStats(u, "follow", ind, [p], cost, null, undefined, false,
        (_tag, s) => s.n > 0, tf, undefined, undefined, proof);
      if (cap < tf) {
        assert.equal(lane.hold, 0);
        assert.equal(result?.[tag], undefined);
        assert.deepEqual(proof, []);
        return;
      }
      assert.ok(result?.[tag]?.n, "the exact cell was simulated in Base");
      const key = protectCellKey(lane);
      assert.deepEqual(proof, [key], "Base proof must use the same lane hold as execution");
      const cells = { [pair]: proof };
      const tapes = buildTapes(u, [p], cost, undefined, new Set([pair]), null, undefined,
        { minSl: 0, minTrail: 0, pairTags: { [pair]: [tag] }, pairCells: cells });
      assert.equal(tapes.length, 1, "the measured cell builds");
      assert.equal(protectCellKey(tapes[0].protect), key);
      const published = { basePassed: new Set([pair]), basePassedRanges: { [pair]: [tag] },
        basePassedCells: passedCellsOf(cells) };
      assert.equal(cellAllowed(tapes[0], published), true);
      assert.equal(baseAllowsTape(tapes[0], published), true);
      assert.equal(cellAllowed(tapes[0], { ...published, basePassedCells: passedCellsOf({
        [pair]: [protectCellKey({ ...lane, hold: lane.hold + 1 })],
      }) }), false, "a different hold cannot supply the proof");
    });
  }

for (const tag of ["mc", "mn", "sh"] as RangeTag[]) for (const kind of ["normal", "trailing", "trailing-only"] as const)
  for (const tf of [1, 5, 15]) {
    test(`Base feedback remains exact for ${tag} ${kind} on the ${tf}m lane`, async () => {
      const ind = `${tag === "mc" ? "mc-rsi2-5" : "rsi-mom-14-20"}@m${tf}`;
      const pair = `follow|${ind}`, cost = DEFAULT_SETTINGS.cost;
      const a: Protect = { tp: kind === "trailing-only" ? 0 : .0035, sl: .005,
        trail: kind === "normal" ? 0 : .003, hold: 1, tag, maxHoldMin: 15,
        ...(kind === "trailing-only" ? { trailOnly: true } : {}) };
      const b: Protect = { ...a, sl: .01 };
      const ak = protectCellKey(laneProtect(a, ind)), bk = protectCellKey(laneProtect(b, ind));
      const u = makeUniverse([3, 5].map((seed, i) => barsFromCandles(`S${i}`, tf,
        syntheticCandles(`S${i}`, tf, 1800, Date.UTC(2026, 9, 1), seed))));
      const measured: string[] = [];
      rangeBaseStats(u, "follow", ind, [a, b], cost, null, undefined, false,
        (_tag, s) => s.n > 0, tf, undefined, undefined, measured);
      assert.ok(measured.includes(ak) && measured.includes(bk), "both cells were simulated independently");
      const set = `${pair}|${kind}`;
      const adjust = { [set]: { set, level: 1, minSl: 0, minTrail: 0, pausedUntil: 0,
        pf: 0, n: 1, lastExitT: 0, at: 0, note: "fixture", slMult: 2 } };
      const make = (cells: string[], heldIds = new Set<string>()) => buildTapes(u, [a, b], cost,
        undefined, new Set([pair]), null, adjust, { minSl: 0, minTrail: 0,
          pairTags: { [pair]: [tag] }, pairCells: { [pair]: cells }, heldIds });
      assert.equal(make([ak]).length, 0, "the source proof cannot qualify changed SL");
      const chosen = make([bk]);
      assert.equal(chosen.length, 1, "the adjusted cell needs its own proof");
      assert.equal(protectCellKey(chosen[0].protect), bk);
      const held = chosen[0].id;
      const retained = make([ak], new Set([held]));
      assert.equal(retained.length, 1);
      assert.equal(retained[0].id, held);
      assert.equal(retained[0].heldOnly, true, "unqualified held exposure remains protected without a new seat");
    });
  }
