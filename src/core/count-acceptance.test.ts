import assert from "node:assert/strict";
import { test } from "node:test";
import { CountAcceptanceIndex } from "./count-acceptance.ts";
import { liveTrades } from "./statistics.ts";
import { rangeOfId } from "./minimal-coord.ts";
import {
  EngineSideIndex,
  SignalAcceptIndex,
  SignalGuard,
  acceptKey,
  acceptPreferExchange,
  engineSideKey,
  sideAcceptKey,
  type AcceptTape,
  type SideTape,
} from "./signals.ts";

const rule = { enabled: true, minPf: 1.3, hours: 1, minTrades: 2, lastN: 2 };
const drain = (gen: Generator) => {
  for (const _ of gen);
};

test("Low-Range native ledger closes retain their own range in fallback statistics", () => {
  const closed = liveTrades(
    [
      { coid: "TAGZopen", sym: "A", side: 1, kind: "O", qty: 1, px: 100, status: "ok", at: 1 },
      { coid: "TAGXclose", sym: "A", side: 1, kind: "X", qty: 1, px: 101, status: "ok", at: 2 },
    ],
    3,
  );
  assert.equal(closed.length, 1);
  assert.equal(rangeOfId(closed[0].cfg), "lr");
});

test("last-N merge keeps the newest closed positions, unknown results and strict decision time", () => {
  const index = new CountAcceptanceIndex();
  index.add("a", { n: 4, exitT: [1, 3, 5, 7], r: [100, -0.01, NaN, 0.03] });
  index.add("a", { n: 3, exitT: [2, 4, 6], r: [-100, 0.02, -0.01] });
  assert.deepEqual(index.stats("a", 5, 2), { n: 2, pf: 2 });
  assert.ok(Number.isNaN(index.stats("a", 7, 2).pf), "unknown close is retained in its sample");
  assert.deepEqual(index.stats("a", 8, 2), { n: 2, pf: 3 });
  assert.deepEqual(
    index.stats("a", 1e12, 2),
    index.stats("a", 8, 2),
    "idle time never expires a loss",
  );
  assert.equal(index.stats("missing", 8, 2).n, 0);
  const next = index.fork();
  next.add("a", { n: 1, exitT: [9], r: [-0.02] });
  assert.deepEqual(index.stats("a", 10, 2), { n: 2, pf: 3 });
  assert.deepEqual(next.stats("a", 10, 2), { n: 2, pf: 1.5 });
});

test("invalid clocks and count requests cannot become qualifying count evidence", () => {
  for (const exitT of [
    [1, NaN, 3],
    [1, 0, 3],
  ]) {
    const index = new CountAcceptanceIndex();
    index.add("a", { n: 3, exitT, r: [1, 1, 1] });
    assert.ok(Number.isNaN(index.stats("a", 4, 2).pf));
  }
  const index = new CountAcceptanceIndex();
  for (const n of [0, 1.5, 501, NaN]) assert.ok(Number.isNaN(index.stats("a", 4, n).pf));
});

function signalTape(): AcceptTape {
  return {
    id: "follow|sig-ema-cross-s@m1|tp1|sl1|h1",
    ind: "sig-ema-cross-s@m1",
    kind: "normal",
    syms: ["A", "B"],
    n: 8,
    symI: [0, 0, 0, 0, 0, 0, 1, 0],
    side: [1, 1, 1, 1, 1, 1, 1, -1],
    exitT: [1, 2, 3, 4, 5, 6, 7, 8],
    entryT: [0, 0, 1, 2, 3, 4, 5, 6],
    r: [1e308, 1e308, NaN, -0.01, 0.02, 0.02, -1, -1],
  };
}

test("Signal count acceptance isolates exact config/symbol/side and recovers after old prefix overflow", () => {
  const tp = signalTape(),
    key = acceptKey(tp.ind, "A", 1, tp.kind, tp.id);
  for (const lazy of [false, true]) {
    const index = new SignalAcceptIndex(
      [tp, { ...tp, id: "losing-sibling", r: Array(8).fill(-1) }],
      lazy,
    );
    assert.ok(Number.isNaN(index.statsN(key, 5, 2).pf));
    assert.deepEqual(index.statsN(key, 6, 2), { n: 2, pf: 2 });
    assert.deepEqual(index.statsN(key, 7, 2), { n: 2, pf: Infinity });
    assert.equal(index.statsN(acceptKey(tp.ind, "B", 1, tp.kind, tp.id), 9, 2).pf, 0);
    assert.equal(index.statsN(acceptKey(tp.ind, "A", -1, tp.kind, tp.id), 9, 2).pf, 0);
    const guard = new SignalGuard();
    guard.acceptIndex = index;
    assert.equal(guard.accepts(key, 6, rule), true);
    assert.equal(guard.accepts(key, 5, rule), false);
    assert.equal(guard.accepts(acceptKey(tp.ind, "B", 1, tp.kind, tp.id), 9, rule), false);
    assert.equal(guard.accepts(key, 1e12, { ...rule, hours: 1e-6 }), true);
  }
});

test("own venue count record is authoritative once complete and unknown fills cannot fall back", () => {
  const exchange = (n: number, pf: number) => ({
    stats: () => {
      throw new Error("clock window used");
    },
    statsN: () => ({ n, pf }),
  });
  assert.equal(
    acceptPreferExchange(exchange(2, 0.5), "a", 10, rule, () => true),
    false,
  );
  assert.equal(
    acceptPreferExchange(exchange(2, 2), "a", 10, rule, () => false),
    true,
  );
  assert.equal(
    acceptPreferExchange(exchange(1, 0.5), "a", 10, rule, () => false),
    false,
  );
  assert.equal(
    acceptPreferExchange(exchange(1, NaN), "a", 10, rule, () => true),
    false,
  );
  assert.equal(
    acceptPreferExchange({ stats: () => ({ n: 10, pf: 4 }) }, "a", 10, rule, () => true),
    false,
  );
});

test("engine direction generations append closes without dropping losses or changing earlier snapshots", () => {
  const tp: SideTape = {
    ind: "ema-9-21@m1",
    kind: "normal",
    protect: { tag: "sh" },
    n: 3,
    exitT: [1, 2, 3],
    r: [0.02, -0.01, 0.02],
    side: [1, 1, -1],
  };
  const key = engineSideKey("normal", "sh", 1),
    old = new EngineSideIndex();
  drain(old.fill([tp]));
  assert.equal(old.accepts(key, 2, rule), false, "one close is not a complete two-position sample");
  assert.equal(old.accepts(key, 3, rule), true);
  const next = old.fork();
  drain(next.append([{ ...tp, n: 1, exitT: [4], r: [-0.02], side: [1] }]));
  assert.equal(next.accepts(key, 5, rule), false);
  assert.equal(old.accepts(key, 5, rule), true);
  assert.deepEqual(next.statsN(key, 5, 2), { n: 2, pf: 0 });
  drain(next.fill([tp]));
  assert.deepEqual(
    next.statsN(key, 5, 2),
    old.statsN(key, 5, 2),
    "fill replaces rather than duplicates the record",
  );
});

test("shared Signal direction has no verdict before N but never drops a completed losing record by age", () => {
  const guard = new SignalGuard(),
    key = sideAcceptKey(1);
  guard.addAccept(key, -0.01, 1);
  assert.equal(guard.accepts(key, 2, rule), true);
  guard.addAccept(key, 0.001, 3);
  assert.equal(guard.accepts(key, 4, rule), false);
  assert.equal(guard.accepts(key, 1e12, rule), false);
  guard.addAccept(key, NaN, 5);
  assert.equal(guard.accepts(key, 6, rule), false);
});
