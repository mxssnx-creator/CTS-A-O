import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROTECT } from "../config.ts";
import { makeTape, signalEntryQueueGen, nextSignalEntryT, scheduledEngineEntriesGen, tradeAt, markedOpenTrade, type ConfigTape } from "../sim/walkforward.ts";
import { TapeHistoryStore } from "./history-store.server.ts";

const M = 60_000, start = 1_000_000, stop = start + 12 * 60 * M;
function fixture(id: string): ConfigTape {
  const ind = "sig-swing-m@m5";
  const closes = [-1, 0, 5, 5, 71, 550, 700, 720].map((minute, i) => ({
    cfg: id, sym: i % 2 ? "A" : "B", side: (i % 2 ? 1 : -1) as 1 | -1,
    entryT: start + minute * M, exitT: start + (minute + (i % 3 ? 2 : 60)) * M,
    entry: 100, exit: i % 2 ? 102 : 101, r: i % 2 ? .0185 : -.0115,
    reason: "time" as const, bars: 1, mult: 1, mfe: 0, mae: 0,
  }));
  const open = [600, 5, 720, 5, -1, 719].map((minute, i) => ({
    cfg: id, sym: i % 2 ? "A" : "B", side: (i % 2 ? 1 : -1) as 1 | -1,
    entryT: start + minute * M, entryI: 1, entry: 100, stop: 90, target: 110,
    peak: 100, trailOn: false, mtm: i % 2 ? .01 : -.02,
  }));
  return makeTape(id, "follow", ind, DEFAULT_PROTECT, "normal", ["A", "B"], closes, open, []);
}
function drain<T>(g: Generator<number, T>): T {
  for (;;) { const r = g.next(); if (r.done) return r.value; }
}

test("stored Signal scheduling keeps every due close/open and boundary with no idle-minute disk reads", () => {
  for (const markOpen of [false, true]) {
    const store = new TapeHistoryStore({ cacheBytes: 1 });
    try {
      const raw = Array.from({length: 3}, (_, i) => fixture(`signal-${i}`));
      const tapes = raw.map(t => store.append(t));
      const queue = drain(signalEntryQueueGen(tapes, start, stop, markOpen));
      for (let minute = 0; minute < 720; minute++) {
        const from = start + minute * M, to = from + M;
        const expected: string[] = [];
        for (const tp of raw) {
          for (let i = 0; i < tp.n; i++) if (tp.entryT[i] >= from && tp.entryT[i] < to)
            expected.push(`${tp.id}|closed|${i}`);
          if (markOpen) for (let i = 0; i < tp.open.length; i++) if (tp.open[i].entryT >= from && tp.open[i].entryT < to)
            expected.push(`${tp.id}|open|${i}`);
        }
        const before = store.stats.reads, actual: string[] = [];
        while (queue.peekT() < to) {
          const c = queue.pop()!;
          while (c.nextT < to) {
            actual.push(`${c.tp.id}|closed|${c.order[c.next++]}`);
            c.nextT = c.next < c.order.length ? c.tp.entryT[c.order[c.next]] : Infinity;
          }
          while (c.nextOpen < c.openOrder.length && c.tp.open[c.openOrder[c.nextOpen]].entryT < to)
            actual.push(`${c.tp.id}|open|${c.openOrder[c.nextOpen++]}`);
          const next = nextSignalEntryT(c);
          if (Number.isFinite(next)) queue.push(next, c);
        }
        assert.deepEqual(actual.sort(), expected.sort(), `minute ${minute}, open ${markOpen}`);
        if (!expected.length) assert.equal(store.stats.reads, before, "idle histories stay on disk");
      }
      assert.equal(queue.size, 0);
      assert.ok(store.stats.reads < 30, `complete 12h schedule used ${store.stats.reads} history reads`);
    } finally { store.close(); }
  }
});


test("engine scheduler matches independent minute scans across changing selected lanes and stored histories", () => {
  for (const markOpen of [false, true]) {
    const store = new TapeHistoryStore({ cacheBytes: 1 });
    try {
      const raw = Array.from({length: 3}, (_, i) => fixture(`engine-${i}`));
      const tapes = raw.map(t => store.append(t));
      const queue = drain(signalEntryQueueGen(tapes, start, stop, markOpen));
      const key = (tr: ReturnType<typeof tradeAt>) => JSON.stringify(tr);
      for (let minute = 0; minute < 720; minute++) {
        const from = start + minute * M, to = from + M;
        const selected = new Set(raw.filter((_, i) => (Math.floor(minute / 60) + i) % 3 !== 0).map(t => t.id));
        const expected = raw.filter(t => selected.has(t.id)).flatMap(tp => [
          ...Array.from({length: tp.n}, (_, i) => i).filter(i => tp.entryT[i] >= from && tp.entryT[i] < to).map(i => tradeAt(tp, i)),
          ...(markOpen ? tp.open.filter(op => op.entryT >= from && op.entryT < to).map(op => markedOpenTrade(tp, op, stop)) : []),
        ]);
        const before = store.stats.reads;
        const actual = drain(scheduledEngineEntriesGen(queue, to, selected, stop)).map(x => x.tr);
        assert.deepEqual(actual.map(key).sort(), expected.map(key).sort(), `minute ${minute}, open ${markOpen}`);
        if (![0,5,71,550,600,700,719].includes(minute)) assert.equal(store.stats.reads, before);
      }
      assert.equal(queue.size, 0);
      assert.ok(store.stats.reads < 40, `12h engine schedule: ${store.stats.reads} reads`);
    } finally { store.close(); }
  }
});
