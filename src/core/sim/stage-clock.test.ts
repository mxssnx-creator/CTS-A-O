import assert from "node:assert/strict";
import { test } from "node:test";
import { StageChainBook } from "./stage-chain.ts";
import { DEFAULT_STAGE_CHAIN } from "./stage-policy.ts";
import { stageWindow } from "./stage-policy.ts";
import { StageWindowIndex } from "./stage-window-index.ts";

function fixture() {
  const s = structuredClone(DEFAULT_STAGE_CHAIN);
  s.base = { primaryN: 9, secondaryN: 1, secondaryMode: "static", secondaryWindows: [1] };
  s.main = { ...s.base }; s.realN = 1;
  const book = new StageChainBook("model", s), base = book.base({ baseConfigId: "clock-fixture", symbol: "A",
    side: 1, kind: "normal", lane: "m1", economicRevision: "v1" }, 1.1), main = book.main(base.id, "main"), real = book.real(main.id, "real");
  for (let i = 0; i < 18; i++) {
    const t = 2 * i, id = `o-${i}`;
    book.enter(base.id, id, id, t); const m = book.enter(main.id, id, id, t);
    book.close(base.id, id, t, "final", t + 1, .02, true);
    if (m.ok) book.close(main.id, id, t, "final", t + 1, .02, true);
  }
  return { book, base, main, real };
}

test("an already observed Main loss at the next-open clock cannot be replaced with an older win", () => {
  const { book, base, main, real } = fixture();
  book.enter(base.id, "last", "last", 36); assert.equal(book.enter(main.id, "last", "last", 36).ok, true);
  assert.equal(book.enter(real.id, "held", "held", 36, "last").ok, true);
  book.close(base.id, "last", 36, "final", 37, .02, true);
  book.close(main.id, "last", 36, "final", 38, -.5, true);
  book.enter(base.id, "next", "next", 38); assert.equal(book.enter(main.id, "next", "next", 38).ok, true);
  const admission = book.enter(real.id, "next-real", "next-real", 38, "next");
  assert.equal(admission.ok, false, "the latest completed loss was already observed before this entry decision");
  assert.equal(book.summary(real.id).openedOrders, 1);
  assert.equal(book.summary(real.id).heldOrders, 1, "earlier owned orders keep their protection after the gate fails");
  assert.deepEqual(StageChainBook.restore(book.snapshot()).summaries(), book.summaries());
});

test("current-entry outcomes remain unavailable even if their close timestamp equals the next decision", () => {
  const { book, base } = fixture();
  for (let i = 0; i < 60; i++) book.enter(base.id, `same-${i}`, `same-${i}`, 100);
  for (let i = 0; i < 60; i++) book.close(base.id, `same-${i}`, 100, "final", 100, -.5, true);
  assert.equal(book.gate(base.id, 100).state, "qualified", "a decision cannot borrow the current entry's outcome");
  assert.equal(book.gate(base.id, 101).state, "failed");
});

test("equal-clock close ordering is explicit; ambiguous tails stay unknown rather than using older wins", () => {
  const rows = [{ orderId: "old", entryT: 0, exitT: 1, knownT: 1, knownSeq: 1, unitReturn: .01 },
    { orderId: "new", entryT: 2, exitT: 3, knownT: 3, knownSeq: 2, unitReturn: -.02 }];
  assert.equal(stageWindow(rows, 1, 1.1, 3).state, "qualified", "legacy strict clock remains explicit for old studies");
  assert.equal(stageWindow(rows, 1, 1.1, 3, 2).state, "qualified", "the close was not observed before this decision");
  assert.equal(stageWindow(rows, 1, 1.1, 3, 3).state, "failed", "the prior close was observed before the decision");
  assert.equal(new StageWindowIndex(rows).window(1, 1.1, 3, 3).state, "failed");
  const ambiguous = rows.map((r) => ({ ...r })); delete (ambiguous[1] as { knownSeq?: number }).knownSeq;
  assert.equal(stageWindow(ambiguous, 1, 1.1, 3, 3).state, "unknown");
  assert.equal(new StageWindowIndex(ambiguous).window(1, 1.1, 3, 3).state, "unknown");
});

test("restart rejects impossible observation sequences and altered frozen proof evidence", () => {
  const { book, base, main } = fixture();
  book.enter(base.id, "live", "live", 36);
  assert.equal(book.enter(main.id, "live", "live", 36).ok, true);
  const saved = book.snapshot();
  for (const change of [
    (s: typeof saved) => { s.sequence = 0; },
    (s: typeof saved) => { s.open[0].admissionSeq = s.sequence + 1; },
    (s: typeof saved) => { s.records[0].history[0].knownSeq = s.sequence + 1; },
    (s: typeof saved) => { s.open.find(o => o.proof?.gate)!.proof!.gate!.primary.rows[0].knownT += 1; },
  ]) {
    const corrupt = structuredClone(saved); change(corrupt);
    assert.throws(() => StageChainBook.restore(corrupt));
  }
  const restored = StageChainBook.restore(saved);
  assert.deepEqual(restored.snapshot(), saved);
  book.close(main.id, "live", 36, "final", 38, -.02, true);
  restored.close(main.id, "live", 36, "final", 38, -.02, true);
  assert.deepEqual(restored.gate(main.id, 38), book.gate(main.id, 38));
  assert.deepEqual(restored.summaries(), book.summaries());
});
