import assert from "node:assert/strict";
import { test } from "node:test";
import { ProcessedSetBook, processedSetKey, type ProcessedSetIdentity } from "./processed-set.ts";

const identity: ProcessedSetIdentity = { baseConfigId: "follow|ema|short|normal|tp1|sl1", symbol: "A-USDT",
  side: 1, kind: "normal", lane: "independent", economicRevision: "cost-and-settings-v1" };
const policy = { validationN: 9, realN: 9, minPf: 1.1 };
const enterAndClose = (book: ProcessedSetBook, i: ProcessedSetIdentity, at: number, r: number | null) => {
  const id = `order-${at}`;
  const admission = book.acceptPostBase(i, id, at, policy);
  book.close(i, id, at, "final", at + 1, r, true);
  return admission;
};

test("Validation and Real use consecutive processed sets and require complete own windows", () => {
  const book = new ProcessedSetBook("paper", 12);
  for (let n = 0; n < 9; n++) {
    const entry = enterAndClose(book, identity, 2 * n, .02);
    assert.equal(entry.stage, "postBase");
    assert.equal(entry.validation.state, "insufficient");
  }
  assert.equal(book.verdict(identity, "validated", 9, 1.1).n, 0);
  for (let n = 9; n < 18; n++) {
    const entry = enterAndClose(book, identity, 2 * n, .02);
    assert.equal(entry.stage, "validated");
    assert.equal(entry.validation.state, "qualified");
    assert.equal(entry.real?.state, "insufficient");
  }
  assert.equal(book.verdict(identity, "active", 9, 1.1).n, 0);
  const active = book.acceptPostBase(identity, "active", 36, policy);
  assert.equal(active.stage, "active");
  assert.equal(active.real?.state, "qualified");
  assert.equal(book.activePositions().length, 1);
  const summary = book.summary(identity)!;
  assert.deepEqual(summary.evaluations.validation, { insufficient: 9, unknown: 0, failed: 0, qualified: 10 });
  assert.deepEqual(summary.evaluations.real, { insufficient: 9, unknown: 0, failed: 0, qualified: 1 });
  assert.deepEqual([summary.stages.postBase.openedOrders, summary.stages.postBase.closedOrders, summary.stages.postBase.heldOrders], [19, 18, 1]);
  assert.deepEqual([summary.stages.validated.openedOrders, summary.stages.validated.closedOrders, summary.stages.validated.heldOrders], [10, 9, 1]);
  assert.deepEqual([summary.stages.active.openedOrders, summary.stages.active.closedOrders, summary.stages.active.heldOrders], [1, 0, 1]);
  assert.equal(summary.stages.active.returnPf, null, "an open mark is not a settled return");
});

test("a later loss cannot declassify or close an already Active position", () => {
  const book = new ProcessedSetBook("paper", 12);
  for (let n = 0; n < 18; n++) enterAndClose(book, identity, 2 * n, .02);
  book.acceptPostBase(identity, "held", 36, policy);
  for (let n = 0; n < 9; n++) enterAndClose(book, identity, 38 + 2 * n, -.03);
  assert.equal(book.verdict(identity, "validated", 9, 1.1).state, "failed");
  const later = book.acceptPostBase(identity, "later", 56, policy);
  assert.equal(later.stage, "postBase");
  assert.deepEqual(book.activePositions().map((x) => x.entryId), ["held"]);
  book.close(identity, "later", 56, "last", 57, -.03, true);
  book.close(identity, "held", 36, "last", 58, .01, true);
  assert.equal(book.activePositions().length, 0);
});

test("separate symbols, sides, kinds, lanes, Base configs and economic revisions cannot lend proof", () => {
  const book = new ProcessedSetBook("paper", 12);
  const siblings: ProcessedSetIdentity[] = [
    { ...identity, symbol: "B-USDT" }, { ...identity, side: -1 }, { ...identity, kind: "trailing" },
    { ...identity, lane: "exit" }, { ...identity, baseConfigId: `${identity.baseConfigId}|sibling` },
    { ...identity, economicRevision: "cost-and-settings-v2" },
  ];
  assert.equal(new Set([identity, ...siblings].map(processedSetKey)).size, 7);
  for (let n = 0; n < 9; n++) enterAndClose(book, identity, 2 * n, .01);
  assert.equal(book.verdict(identity, "postBase", 9, 1.1).state, "qualified");
  for (const sibling of siblings) assert.equal(book.verdict(sibling, "postBase", 9, 1.1).state, "insufficient");
  assert.throws(() => book.close(siblings[0], "rejected", 0, "final", 18, .5, true), /no matching/);
  assert.equal(book.verdict(siblings[0], "postBase", 9, 1.1).n, 0);
});

test("unknown and losing processed closes are not replaced by candidates or older wins", () => {
  const book = new ProcessedSetBook("model", 9);
  for (let n = 0; n < 8; n++) enterAndClose(book, identity, 2 * n, .01);
  enterAndClose(book, identity, 16, null);
  assert.equal(book.verdict(identity, "postBase", 9, 1.1).state, "unknown");
  assert.equal(book.summary(identity)!.stages.postBase.returnPf, null);
  for (let n = 9; n < 18; n++) enterAndClose(book, identity, 2 * n, -.01);
  const failed = book.verdict(identity, "postBase", 9, 1.1);
  assert.equal(failed.state, "failed");
  assert.equal(failed.n, 9);
  assert.equal(failed.pf, 0);
  assert.equal(book.acceptPostBase(identity, "not-validated", 36, policy).stage, "postBase");
});

test("partial slices are unique and restart retains entry decisions and open ownership", () => {
  let book = new ProcessedSetBook("paper", 12);
  for (let n = 0; n < 18; n++) enterAndClose(book, identity, 2 * n, .01);
  book.acceptPostBase(identity, "held", 36, policy);
  book.close(identity, "held", 36, "fill-1", 37, .02, false);
  assert.throws(() => book.close(identity, "held", 36, "fill-1", 37, .02, false), /duplicate/);
  book = ProcessedSetBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
  assert.equal(book.activePositions()[0].entryId, "held");
  assert.throws(() => book.close(identity, "held", 36, "fill-1", 38, .02, false), /duplicate/);
  book.close(identity, "held", 36, "fill-2", 38, -.01, true);
  assert.equal(book.activePositions().length, 0);
  assert.throws(() => book.close(identity, "held", 36, "fill-3", 39, .01, true), /no matching/);
});

test("future information, duplicate opens, invalid policies and corrupt snapshots fail closed", () => {
  const book = new ProcessedSetBook("paper", 9);
  book.acceptPostBase(identity, "one", 10, policy);
  assert.throws(() => book.acceptPostBase(identity, "one", 10, policy), /duplicate/);
  assert.throws(() => book.close(identity, "one", 10, "bad", 9, .01, true), /invalid/);
  assert.throws(() => book.acceptPostBase(identity, "old", 9, policy), /chronological/);
  assert.throws(() => book.acceptPostBase(identity, "bad", 11, { ...policy, realN: 8 }), /policy/);
  const snap = book.snapshot();
  snap.open[0].stage = "active";
  assert.throws(() => ProcessedSetBook.restore(snap), /invalid processed open/);
  const badCounts = book.snapshot();
  badCounts.sets[0].counts.active.openedOrders = 1;
  assert.throws(() => ProcessedSetBook.restore(badCounts), /progression/);
  assert.equal(book.activePositions().length, 0, "snapshots and returned records cannot mutate the live book");
});

test("entries at a close timestamp see only earlier closes, regardless of delivery order and restart", () => {
  for (const [prior, simultaneous, expected] of [[.02, -.03, "qualified"], [-.03, .02, "failed"]] as const) {
    for (const order of ["entries-first", "closes-first", "restart-after-closes"] as const) {
      let book = new ProcessedSetBook("paper", 9);
      for (let n = 0; n < 9; n++) enterAndClose(book, identity, n * 2, prior);
      for (let n = 0; n < 9; n++) book.acceptPostBase(identity, `pending-${n}`, 18 + n, policy);
      const close = () => {
        for (let n = 0; n < 9; n++) book.close(identity, `pending-${n}`, 18 + n, "final", 40, simultaneous, true);
      };
      if (order !== "entries-first") close();
      if (order === "restart-after-closes") book = ProcessedSetBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
      const at = book.acceptPostBase(identity, "same-time", 40, policy);
      if (order === "entries-first") close();
      assert.equal(at.validation.state, expected, `${prior}, ${simultaneous}, ${order}`);
      assert.equal(at.validation.n, 9, "the full prior window remains available even if an entire later batch arrived first");
      if (expected === "qualified") assert.equal(at.real?.state, "insufficient");
      const after = book.acceptPostBase(identity, "next-time", 41, policy);
      assert.equal(after.validation.state, simultaneous > 0 ? "qualified" : "failed");
    }
  }
});

test("Validation and Real both retain strictly prior windows across a larger same-time close batch", () => {
  let book = new ProcessedSetBook("paper", 9);
  for (let n = 0; n < 18; n++) enterAndClose(book, identity, n * 2, .01);
  for (let n = 0; n < 12; n++) {
    assert.equal(book.acceptPostBase(identity, `active-${n}`, 36 + n, policy).stage, "active");
  }
  for (let n = 0; n < 12; n++) book.close(identity, `active-${n}`, 36 + n, "fill", 50, -.02, true);
  const snap = book.snapshot();
  assert.deepEqual([snap.sets[0].postBase.length, snap.sets[0].validated.length], [18, 18],
    "each history is bounded to one prior and one current Last-N window");
  book = ProcessedSetBook.restore(JSON.parse(JSON.stringify(snap)));
  const same = book.acceptPostBase(identity, "at-50", 50, policy);
  assert.equal(same.stage, "active");
  assert.equal(same.validation.state, "qualified");
  assert.equal(same.real?.state, "qualified");
  const later = book.acceptPostBase(identity, "at-51", 51, policy);
  assert.equal(later.validation.state, "failed");
  assert.equal(later.stage, "postBase");
});
