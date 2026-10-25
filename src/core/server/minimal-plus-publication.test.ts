import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROTECT } from "../config.ts";
import { makeTape, type ConfigTape, type TapeBuildStat } from "../sim/walkforward.ts";
import { TapeHistoryStore, historyOf } from "./history-store.server.ts";
import { publishMinimalPlus } from "./minimal-plus-publication.ts";

const plus = { enabled: true, lastN: 50, minPf: 1.35 };
function tape(name: string, win = false): ConfigTape {
  return makeTape(`follow|ema@m1|mp${name}`, "follow", "ema@m1", { ...DEFAULT_PROTECT, tag: "mp" }, "normal", ["A"],
    Array.from({ length: 50 }, (_, i) => ({ cfg: name, sym: "A", side: 1 as const, entryT: i * 60000,
      exitT: (i + 1) * 60000, entry: 100, exit: win ? 102 : 99, r: win ? .0185 : -.0115,
      mult: 1, reason: win ? "tp" as const : "sl" as const, bars: 1, mfe: .02, mae: .01 })), [], []);
}
const stat = (kept: number): TapeBuildStat => ({ ind: "ema@m1", tag: "mp", kind: "normal", grid: kept, built: kept, kept, few: 0, skip: {}, tps: [], sls: [], trails: [] });
test("range rejection preserves held histories for management only and counts the rejection once", () => {
  const store = new TapeHistoryStore({ cacheBytes: 1 });
  try {
    const held = store.append(tape("held")), loser = tape("loser"), winner = tape("win", true);
    const original = [stat(3)];
    const out = publishMinimalPlus([held, loser, winner], original, plus, Infinity, new Set([held.id]));
    assert.deepEqual(out.tapes.map(t => t.id), [held.id, winner.id]);
    assert.equal(out.tapes[0].heldOnly, true);
    assert.equal(out.tapes[1], winner);
    assert.equal(historyOf(out.tapes[0])?.store, historyOf(held)?.store);
    assert.deepEqual(historyOf(out.tapes[0])?.record, historyOf(held)?.record);
    assert.equal(out.buildStats[0].postGateRejected, 2);
    assert.equal(out.buildStats[0].kept - out.buildStats[0].postGateRejected!, 1);
    assert.equal(original[0].postGateRejected, undefined);
    assert.equal(held.heldOnly, undefined);
  } finally { store.close(); }
});
test("disabled range retains an existing held-only tape without reading its history or counting it as built", () => {
  const store = new TapeHistoryStore({ cacheBytes: 1 });
  try {
    const held = store.append({ ...tape("held"), heldOnly: true });
    const out = publishMinimalPlus([held], [], false, Infinity, new Set());
    assert.equal(out.tapes[0], held);
    assert.equal(store.stats.reads, 0);
  } finally { store.close(); }
});
test("strict causal boundary rejects the fiftieth close at start but admits it immediately after", () => {
  const winner = tape("win", true);
  assert.equal(publishMinimalPlus([winner], [stat(1)], plus, 50 * 60000, new Set()).tapes.length, 0);
  assert.equal(publishMinimalPlus([winner], [stat(1)], plus, 50 * 60000 + 1, new Set()).tapes.length, 1);
});
test("probe bypass remains explicit and accounting cannot silently omit a rejection", () => {
  const loser = tape("loss");
  assert.equal(publishMinimalPlus([loser], [stat(1)], plus, Infinity, new Set(), true).tapes[0], loser);
  assert.throws(() => publishMinimalPlus([loser], [], plus, Infinity, new Set()), /no matching build/);
  assert.throws(() => publishMinimalPlus([loser], [stat(0)], plus, Infinity, new Set()), /exceeds/);
});
test("carried rejected holdings do not consume this generation's built count, and non-Plus tapes are unchanged", () => {
  const carry = { ...tape("carried"), carried: true };
  const ordinary = { ...tape("ordinary"), id: "follow|ema@m1|mc", protect: { ...DEFAULT_PROTECT, tag: "mc" as const } };
  const out = publishMinimalPlus([carry, ordinary], [], false, Infinity, new Set([carry.id]));
  assert.equal(out.tapes[0].heldOnly, true);
  assert.equal(out.tapes[0].carried, true);
  assert.equal(out.tapes[1], ordinary);
  assert.deepEqual(out.buildStats, []);
});
