import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROTECT } from "../config.ts";
import { makeTape, tradeAt, type ConfigTape } from "../sim/walkforward.ts";
import { TapeHistoryStore, historyOf, withHistoryMetadata } from "./history-store.server.ts";
import { compactByCarryGen, withCarried } from "./runtime.server.ts";

function tape(id: string, tag: NonNullable<ConfigTape["protect"]["tag"]>): ConfigTape {
  return makeTape(id, "follow", "ema-9-21@m1", { ...DEFAULT_PROTECT, tag }, "normal", ["A"], [
    { cfg: id, sym: "A", side: 1, entryT: 60_000, exitT: 120_000, entry: 100, exit: 99,
      r: -.0115, mult: 1, reason: "sl", bars: 1, mfe: 0, mae: .01 },
    { cfg: id, sym: "A", side: -1, entryT: 180_000, exitT: 240_000, entry: 100, exit: 98,
      r: .0185, mult: 1, reason: "tp", bars: 1, mfe: .02, mae: 0 },
  ], [], []);
}
function drain<T>(g: Generator<number, T>): T {
  for (;;) { const r = g.next(); if (r.done) return r.value; }
}

test("carry-over keeps disk histories lazy, complete and independently eligible", () => {
  const store = new TapeHistoryStore({ cacheBytes: 1 });
  try {
    const original = tape("old-micro", "mc"), saved = store.append(original);
    const built = tape("new-short", "sh");
    const kept = withCarried([built], [saved], new Set(["mc"]), () => false);
    assert.equal(store.stats.reads, 0, "metadata changes must not load historical columns");
    assert.equal(kept[0], built);
    assert.equal(kept[1].carried, true);
    assert.equal(kept[1].heldOnly, true);
    assert.equal(saved.carried, undefined, "the previous generation remains unchanged");
    assert.equal(saved.heldOnly, undefined);
    assert.equal(historyOf(kept[1])?.store, store);
    assert.equal(historyOf(kept[1])?.record, historyOf(saved)?.record);
    const pending: ConfigTape["pending"] = [{ sym: "A", side: 1 }];
    const changed = withHistoryMetadata(kept[1], { pending, fromT: 120_000 });
    assert.equal(store.stats.reads, 0);
    assert.equal(changed.pending, pending);
    assert.deepEqual(saved.pending, []);
    assert.equal(changed.fromT, 120_000);
    for (let i = 0; i < saved.n; i++) assert.deepEqual(tradeAt(changed, i), tradeAt(original, i));
    assert.equal(withCarried([original], [saved], new Set(["mc"])).length, 1, "no duplicate rebuilt order set");
  } finally { store.close(); }
});

test("mixed carry compaction preserves order and every byte without materializing stored histories", () => {
  const store = new TapeHistoryStore({ cacheBytes: 1 });
  try {
    const raw = [tape("m1", "mc"), tape("s1", "sh"), tape("m2", "mc"), tape("m3", "mn")];
    const input = [raw[0], store.append(raw[1]), store.append(raw[2]), raw[3]];
    const compact = drain(compactByCarryGen(input));
    assert.equal(store.stats.reads, 0, "slimming must not undo the resident history budget");
    assert.deepEqual(compact.map(t => t.id), input.map(t => t.id));
    assert.equal(compact[1], input[1]);
    assert.equal(compact[2], input[2]);
    assert.notEqual(compact[0], input[0]);
    for (let i = 0; i < raw.length; i++) assert.deepEqual({ ...compact[i] }, raw[i]);
  } finally { store.close(); }
});
