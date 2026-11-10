import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BLOCK } from "../config.ts";
import { AutoBlockBook, blockBookOf, blockDecide, sourceKey, type BlockBookEntry } from "./block.ts";

const levels = { config: 1, overall: 1, symbol: 1, direction: 1, indication: 1, type: 1 };
const identity = { cfg: "set-a", sym: "A", side: 1, kind: "trend", ind: "ema@m1", type: "normal" };
const base = { ...DEFAULT_BLOCK, ratio: .2, sharedRatio: .2, steps: 0, holdUntilNet: true,
  sources: { config: true, symbol: true }, sourceRatios: { config: 1, symbol: 2 },
  mode: "shared" as const, minActiveLevel: 2, pause: 1, windowAuto: false };

test("Shared Active attributes only eligible tied relations and isolates their recovery and pause", () => {
  const d = blockDecide({ ...levels, config: 2 }, base, true);
  assert.equal(d.vol, 1.4);
  assert.deepEqual(d.src, ["config"]);
  assert.deepEqual(Object.keys(d.blockAttribution ?? {}), ["config"]);
  const row = { ...identity, accepted: true, blockAttribution: d.blockAttribution, bsrc: d.src };
  const losing = blockBookOf(base); losing.add({ ...row, r: -.02 });
  assert.ok(losing.recoveryState(sourceKey("config", row))!.net < 0);
  assert.equal(losing.recoveryState(sourceKey("symbol", row)), null);
  const winning = blockBookOf(base); winning.add({ ...row, r: .02 });
  assert.equal(winning.paused(sourceKey("config", row)), true);
  assert.equal(winning.paused(sourceKey("symbol", row)), false);
  assert.deepEqual(blockDecide({ ...levels, config: 2, symbol: 2 },
    { ...base, sourceRatios: { config: 1, symbol: 1 } }, true).src, ["config", "symbol"]);
});

for (const mode of ["shared", "additive"] as const)
  test(`${mode} unit-sized Active entry does not pause an unraised source`, () => {
    const b = { ...base, mode, ratio: .1, sharedRatio: .1, maxMult: 2, steps: 1, stepFloor: false,
      sources: { config: true }, minActiveLevel: 1 };
    const d = blockDecide(levels, b, true);
    assert.equal(d.adjusted, true); assert.equal(d.vol, 1); assert.deepEqual(d.src, []);
    const row = { ...identity, accepted: true, r: .02, bsrc: d.src };
    const book = blockBookOf(b); book.add(row);
    assert.equal(book.paused(sourceKey("config", row)), false);
  });

for (const stamped of [false, true])
  test(`automatic windows score actual raises only; stamped=${stamped}`, () => {
    const b = { ...base, ratio: .1, sharedRatio: .1, maxMult: 2, steps: 1, stepFloor: false,
      maxLevel: 1, minActiveLevel: 1, sources: { config: true }, historySource: "accepted-orders" as const,
      window: 1, windowAuto: true, windowCandidates: [1] };
    const run = (ratio: number) => {
      const book = blockBookOf({ ...b, ratio, sharedRatio: ratio }, true);
      assert.ok(book instanceof AutoBlockBook);
      book.add({ ...identity, accepted: true, r: .01 });
      const next: BlockBookEntry = { ...identity, accepted: true, r: .02 };
      if (stamped) book.stampEntry(next);
      book.add(next);
      return { mask: next.autoRaise, samples: book.scores()[0].n };
    };
    assert.deepEqual(run(.1), { mask: stamped ? 0 : undefined, samples: 0 });
    assert.deepEqual(run(.6), { mask: stamped ? 1 : undefined, samples: 1 });
  });
