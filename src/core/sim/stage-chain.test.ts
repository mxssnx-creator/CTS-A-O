import assert from "node:assert/strict";
import { test } from "node:test";
import { StageChainBook } from "./stage-chain.ts";
import { DEFAULT_STAGE_CHAIN, checkStageChainSettings, dualStageGate, negativeMainTrigger,
  type StageChainSettings, type StageObservation } from "./stage-policy.ts";
import type { ProcessedSetIdentity } from "./processed-set.ts";
import { simulate } from "./backtest.ts";
import { barsFromCandles } from "../market/bars.ts";

const identity: ProcessedSetIdentity = { baseConfigId: "follow|low-range@m1|mc|normal|tp1|sl1", symbol: "A-USDT",
  side: 1, kind: "normal", lane: "coordination-a", economicRevision: "cost-and-processing-v1" };
const settings = (): StageChainSettings => ({ ...structuredClone(DEFAULT_STAGE_CHAIN), enabled: true,
  base: { primaryN: 9, secondaryN: 5, secondaryMode: "static", secondaryWindows: [5, 10, 15, 20, 25] },
  main: { primaryN: 9, secondaryN: 5, secondaryMode: "static", secondaryWindows: [5, 10, 15, 20, 25] },
  negativeMain: { enabled: true, windows: [5] }, realN: 9 });
const observations = (returns: Array<number | null>, from = 0): StageObservation[] => returns.map((unitReturn, n) =>
  ({ orderId: `o-${n + from}`, entryT: 2 * (n + from), exitT: 2 * (n + from) + 1,
    knownT: 2 * (n + from) + 1, unitReturn }));
function chain() {
  const book = new StageChainBook("model", settings()), base = book.base(identity, 1.1), main = book.main(base.id, "additional-strategies-v1"),
    real = book.real(main.id, "overall-strategies-v1"), active = book.active(real.id);
  return { book, base, main, real, active };
}
const open = (b: StageChainBook, set: { id: string }, t: number, parent?: string) =>
  b.enter(set.id, `order-${t}`, `position-${t}`, t, parent);
const close = (b: StageChainBook, set: { id: string }, t: number, r: number | null) =>
  b.close(set.id, `order-${t}`, t, "final", t + 1, r, true);

test("dual gates require full own primary and secondary windows including Last-5", () => {
  const s = settings();
  const good = observations(Array(9).fill(.02));
  assert.equal(dualStageGate(good, s.base, 1.1, 20).state, "qualified");
  assert.equal(dualStageGate(good.slice(1), s.base, 1.1, 20).state, "insufficient");
  const recentLoss = observations([.1, .1, .1, .1, -.01, -.01, -.01, -.01, -.01]);
  const gate = dualStageGate(recentLoss, s.main, 1.1, 20);
  assert.equal(gate.primary.state, "qualified"); assert.equal(gate.secondary[0].state, "failed");
  assert.equal(gate.state, "failed");
  assert.equal(dualStageGate(observations([...Array(8).fill(.02), null]), s.main, 1.1, 20).state, "unknown");
  const malformed = observations(Array(10).fill(.02));
  malformed[9].exitT = NaN;
  assert.equal(dualStageGate(malformed, s.main, 1.1, 21).state, "unknown", "unorderable losses cannot be dropped for older wins");
});

test("primary 50 plus negative Last-5/10 requests inverse without passing the original Main gate", () => {
  const s = structuredClone(DEFAULT_STAGE_CHAIN), rows = observations([...Array(40).fill(.01), ...Array(10).fill(-.005)]);
  const negative = negativeMainTrigger(rows, s, 1.1, 101);
  assert.equal(negative.qualified, true); assert.ok(Math.abs(negative.primary.pf! - 8) < 1e-12);
  assert.ok(Math.abs(negative.mean! + .005) < 1e-12);
  assert.equal(dualStageGate(rows, s.main, 1.1, 101).state, "failed");
  s.negativeMain.enabled = false;
  assert.equal(negativeMainTrigger(rows, s, 1.1, 101).qualified, false);
  assert.equal(negativeMainTrigger(observations(Array(50).fill(-.005)), { ...s, negativeMain: { enabled: true, windows: [5, 10] } }, 1.1, 101).qualified, false);
});

test("Base, Main, Real and Active store different results and never copy a parent's close", () => {
  const { book, base, main, real, active } = chain();
  for (let n = 0; n < 27; n++) {
    const t = n * 2;
    assert.equal(open(book, base, t).ok, true);
    const m = open(book, main, t);
    assert.equal(m.ok, n >= 9);
    const r = open(book, real, t, `order-${t}`);
    assert.equal(r.ok, n >= 18);
    const a = open(book, active, t, `order-${t}`);
    assert.equal(a.ok, false, "Real still needs nine of its own closes");
    close(book, base, t, .03);
    if (m.ok) close(book, main, t, .02);
    if (r.ok) close(book, real, t, .01);
  }
  const t = 54;
  open(book, base, t); assert.equal(open(book, main, t).ok, true);
  assert.equal(open(book, real, t, `order-${t}`).ok, true);
  assert.equal(open(book, active, t, `order-${t}`).ok, true);
  close(book, base, t, -.04); close(book, main, t, -.02); close(book, real, t, -.01);
  assert.equal(book.summary(active.id).settledSlices, 0, "even a valid Real close is not an Active close");
  assert.equal(book.activeOrders().length, 1);
  close(book, active, t, -.007);
  assert.equal(book.summary(active.id).returnPf, 0);
  assert.deepEqual([book.summary(active.id).openedOrders, book.summary(active.id).closedOrders, book.summary(active.id).heldOrders], [1, 1, 0]);
  assert.notEqual(base.id, main.id); assert.notEqual(main.id, real.id); assert.notEqual(real.id, active.id);
  assert.equal(real.parentSetId, main.id); assert.equal(main.parentSetId, base.id);
});

test("negative Main creates a separately priced inverse Main and cannot admit original or borrowed Real entries", () => {
  const { book, base, main, real } = chain(), inverse = book.inverseMain(main.id, "inverse-entry-and-protection-v1"),
    inverseReal = book.real(inverse.id, "overall-strategies-v1");
  assert.equal(inverse.identity.side, -1); assert.equal(inverse.parentSetId, main.id);
  for (let n = 0; n < 18; n++) {
    const t = n * 2;
    open(book, base, t); const m = open(book, main, t);
    close(book, base, t, .1);
    if (m.ok) close(book, main, t, n < 13 ? .1 : -.01);
  }
  const t = 36;
  open(book, base, t); assert.equal(open(book, main, t).ok, true);
  assert.equal(open(book, real, t, `order-${t}`).ok, false, "negative tail never admits original direction");
  const inverseAdmission = open(book, inverse, t, `order-${t}`);
  assert.equal(inverseAdmission.ok, true);
  assert.equal(open(book, inverseReal, t, `order-${t}`).ok, false, "inverse has no own validated history");
  close(book, base, t, .1); close(book, main, t, -.01);
  assert.equal(book.summary(inverse.id).settledSlices, 0);
  // Two directions can both lose after independent stops and costs. Never replace this with -parentReturn.
  close(book, inverse, t, -.015);
  assert.equal(book.gate(inverse.id, t + 2).primary.rows[0].unitReturn, -.015);
  assert.equal(book.summary(inverse.id).returnPf, 0);
  assert.throws(() => book.inverseMain(inverse.id, "recursive"), /direct Main/);
});

test("a genuine inverse simulation may stop at a different price and both sides pay cost", () => {
  const bars = barsFromCandles("A-USDT", 1, [[100, 100, 100, 100], [100, 102, 98, 100]].map(([o, h, l, c], i) =>
    ({ t: i * 60_000, o, h, l, c, v: 1 })));
  const p = { tp: .01, sl: .01, trail: 0, hold: 15 }, cost = .0015;
  const direct = simulate(identity.baseConfigId, bars, new Int8Array([1, 0]), p, { cost });
  const inverse = simulate(`${identity.baseConfigId}|inverse`, bars, new Int8Array([-1, 0]), p, { cost });
  assert.equal(direct.trades[0].reason, "sl"); assert.equal(inverse.trades[0].reason, "sl");
  assert.equal(direct.trades[0].exit, 99); assert.equal(inverse.trades[0].exit, 101);
  assert.ok(Math.abs(direct.trades[0].r + .0115) < 1e-12);
  assert.ok(Math.abs(inverse.trades[0].r + .0115) < 1e-12);
  assert.notEqual(inverse.trades[0].r, -direct.trades[0].r);
});

test("inverse must complete its own Main and Real windows before its Active chain can execute", () => {
  const { book, base, main } = chain(), inverse = book.inverseMain(main.id, "inverse-own-prices"),
    real = book.real(inverse.id, "inverse-overall"), active = book.active(real.id);
  let inverseCloses = 0, realCloses = 0, activeCloses = 0;
  for (let n = 0; n < 240; n++) {
    const t = n * 2; open(book, base, t); const m = open(book, main, t);
    const inv = open(book, inverse, t, `order-${t}`);
    const r = open(book, real, t, `order-${t}`), a = open(book, active, t, `order-${t}`);
    assert.equal(r.ok, inv.ok && inverseCloses >= 9, "only inverse Main's own positive completed orders qualify Real");
    assert.equal(a.ok, r.ok && realCloses >= 9, "only inverse Real's own completed orders qualify Active");
    close(book, base, t, .1);
    if (m.ok) close(book, main, t, (n - 9) % 9 < 4 ? .1 : -.01);
    if (inv.ok) { close(book, inverse, t, .02); inverseCloses++; }
    if (r.ok) { close(book, real, t, .01); realCloses++; }
    if (a.ok) { close(book, active, t, .005); activeCloses++; }
  }
  assert.ok(activeCloses > 0); assert.equal(book.summary(active.id).closedOrders, activeCloses);
  assert.equal(book.summary(active.id).returnPf, null, "a no-loss gate score is not a finite measured execution ratio");
  assert.equal(book.summary(active.id).noLoss, true);
  assert.deepEqual(StageChainBook.restore(book.snapshot()).summaries(), book.summaries());
});

test("identity includes indication, protection, symbol, direction, strategy, lane, processing and revision", () => {
  const { book, base, main, real } = chain();
  const siblings: ProcessedSetIdentity[] = [{ ...identity, symbol: "B-USDT" }, { ...identity, side: -1 },
    { ...identity, baseConfigId: `${identity.baseConfigId}|other-protect` }, { ...identity, kind: "trailing" },
    { ...identity, lane: "coordination-b" }, { ...identity, economicRevision: "cost-v2" }];
  const siblingMains = siblings.map((i) => book.main(book.base(i, 1.1).id, main.processingId));
  for (let n = 0; n < 18; n++) {
    const t = n * 2; open(book, base, t); const m = open(book, main, t);
    close(book, base, t, .02); if (m.ok) close(book, main, t, .02);
  }
  assert.equal(book.gate(main.id, 36).state, "qualified");
  for (const sibling of siblingMains) {
    assert.notEqual(sibling.id, main.id); assert.equal(book.gate(sibling.id, 36).state, "insufficient");
  }
  assert.equal(open(book, real, 36, "unprocessed-parent").ok, false);
  const differentProcessing = book.main(base.id, "other-additional-strategy");
  assert.equal(book.gate(differentProcessing.id, 36).state, "insufficient");
});

test("changed admission policies create new derived set identities without changing an unchanged predecessor", () => {
  const make = (s: StageChainSettings) => {
    const b = new StageChainBook("model", s), base = b.base(identity, 1.1), main = b.main(base.id, "main"),
      inverse = b.inverseMain(main.id, "inverse"), real = b.real(main.id, "overall"), active = b.active(real.id);
    return { base, main, inverse, real, active };
  };
  const original = make(settings());
  const changedBase = settings(); changedBase.base.secondaryN = 10;
  const nextBase = make(changedBase);
  for (const key of ["base", "main", "inverse", "real", "active"] as const) assert.notEqual(nextBase[key].id, original[key].id);
  const changedMain = settings(); changedMain.main.secondaryN = 10;
  const nextMain = make(changedMain);
  assert.equal(nextMain.main.id, original.main.id, "the same upstream processing has the same Main history");
  assert.notEqual(nextMain.real.id, original.real.id, "Real records only this Main admission policy");
  assert.notEqual(nextMain.active.id, original.active.id);
  const changedReal = settings(); changedReal.realN = 15;
  const nextReal = make(changedReal);
  assert.equal(nextReal.real.id, original.real.id); assert.notEqual(nextReal.active.id, original.active.id);
  const changedNegative = settings(); changedNegative.negativeMain.windows = [5, 10];
  assert.notEqual(make(changedNegative).inverse.id, original.inverse.id);
});

test("multiple windows all pass; auto uses only earlier full candidate outcomes and falls back explicitly", () => {
  const p = { ...settings().base, secondaryMode: "multiple" as const }, rows = observations(Array(50).fill(.02));
  const multi = dualStageGate(rows, p, 1.1, 101);
  assert.equal(multi.state, "qualified"); assert.equal(multi.selectedN, null);
  assert.deepEqual(multi.secondary.map((w) => w.requestedN), [5, 10, 15, 20, 25]);
  const auto = { ...p, secondaryMode: "auto" as const };
  assert.equal(dualStageGate(rows, auto, 1.1, 101).selection, "auto-fallback");
  const scores = new Map([[10, observations([.04, -.01, .04, -.01, .04, -.01, .04, -.01, .04])],
    [5, observations([.02, -.01, .02, -.01, .02, -.01, .02, -.01, .02])],
    [25, observations(Array(9).fill(.04), 100)]]);
  const chosen = dualStageGate(rows, auto, 1.1, 101, scores);
  assert.equal(chosen.selectedN, 10); assert.equal(chosen.selection, "auto");
  assert.equal(dualStageGate(rows, auto, 1.1, 10, scores).selection, "auto-fallback", "future winning scores are unavailable");
  scores.set(10, observations([...Array(8).fill(.04), null]));
  assert.equal(dualStageGate(rows, auto, 1.1, 101, scores).selectedN, 5, "unknown scores never qualify an optimizer");
});

test("partials do not manufacture complete Last-N orders and duplicate slices are rejected", () => {
  const { book, base } = chain();
  open(book, base, 0);
  book.close(base.id, "order-0", 0, "partial-a", 1, .01, false);
  assert.equal(book.gate(base.id, 2).primary.n, 0);
  assert.throws(() => book.close(base.id, "order-0", 0, "partial-a", 2, .01, false), /duplicate/);
  book.close(base.id, "order-0", 0, "partial-b", 2, -.002, true);
  assert.equal(book.gate(base.id, 3).primary.n, 1);
  assert.equal(book.gate(base.id, 3).primary.rows[0].unitReturn, .008);
  assert.equal(book.summary(base.id).settledSlices, 2);
});

test("unknown partials poison their final order instead of borrowing older wins", () => {
  const { book, base } = chain();
  for (let i = 0; i < 9; i++) { open(book, base, 2 * i); close(book, base, 2 * i, .02); }
  open(book, base, 18); book.close(base.id, "order-18", 18, "unknown-fee", 19, null, false);
  book.close(base.id, "order-18", 18, "final", 20, .02, true);
  assert.equal(book.gate(base.id, 21).state, "unknown"); assert.equal(book.summary(base.id).returnPf, null);
});

test("same-time closes and batches larger than Last-N cannot replace strictly earlier evidence", () => {
  const { book, base } = chain();
  for (let i = 0; i < 9; i++) { open(book, base, 2 * i); close(book, base, 2 * i, .02); }
  for (let i = 0; i < 60; i++) open(book, base, 18 + i);
  for (let i = 0; i < 60; i++) book.close(base.id, `order-${18 + i}`, 18 + i, "final", 100, -.03, true);
  assert.equal(book.gate(base.id, 100).state, "qualified");
  const restored = StageChainBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
  assert.equal(restored.gate(base.id, 100).state, "qualified");
  assert.equal(restored.gate(base.id, 101).state, "failed");
});

test("late execution evidence is unavailable before observation and does not retroactively change admissions", () => {
  const { book, base } = chain();
  for (let i = 0; i < 9; i++) open(book, base, i);
  for (let i = 0; i < 9; i++) book.close(base.id, `order-${i}`, i, "fill", 10 + i, .02, true, 30);
  assert.equal(book.gate(base.id, 30).state, "insufficient");
  assert.equal(book.gate(base.id, 31).state, "qualified");
  assert.throws(() => book.gate(base.id, 20), /decision time/);
});

test("a delayed old close cannot evict more recent completed orders from Last-N", () => {
  const { book, base } = chain();
  open(book, base, 0);
  for (let i = 1; i <= 9; i++) { open(book, base, 2 * i); close(book, base, 2 * i, .02); }
  book.close(base.id, "order-0", 0, "late-fill", 1, -.5, true, 25);
  assert.equal(book.gate(base.id, 26).state, "qualified");
  const restored = StageChainBook.restore(book.snapshot());
  assert.equal(restored.gate(base.id, 26).state, "qualified");
  assert.ok(restored.gate(base.id, 26).primary.rows.every((r) => r.orderId !== "order-0"));
});

test("rejected events are chronological and cannot be retried to inflate the denominator", () => {
  const { book, main } = chain();
  assert.equal(open(book, main, 10).ok, false);
  assert.throws(() => open(book, main, 10), /duplicate/);
  assert.throws(() => open(book, main, 9), /invalid stage entry/);
  assert.equal(book.summary(main.id).evaluations.evaluated, 1);
});

test("policy getters, returned admissions and snapshots cannot change the live book", () => {
  const { book, base, main } = chain();
  for (let i = 0; i < 9; i++) { open(book, base, 2 * i); close(book, base, 2 * i, .02); }
  book.settings.base.primaryN = 500;
  const m = open(book, main, 18); assert.equal(m.ok, true);
  if (!m.ok) throw new Error("expected admitted order");
  m.order.proof!.gate!.primary.pf = 100;
  book.snapshot().open[0].proof!.gate!.primary.pf = 200;
  assert.equal(book.snapshot().open[0].proof!.gate!.primary.pf, 4);
});

test("inverse restart retains both short negative windows and refuses corrupted trigger evidence", () => {
  const s = settings(); s.negativeMain.windows = [5, 10];
  // Last-9 is positive but the older tenth loss makes the short-window mean negative.
  const book = new StageChainBook("model", s), base = book.base(identity, 1.1), main = book.main(base.id, "main"),
    inverse = book.inverseMain(main.id, "inverse");
  for (let n = 0; n < 19; n++) {
    const t = n * 2; open(book, base, t); const m = open(book, main, t);
    close(book, base, t, .1);
    if (m.ok) close(book, main, t, n === 9 ? -1 : n < 14 ? .1 : -.01);
  }
  open(book, base, 38); assert.equal(open(book, main, 38).ok, true);
  assert.equal(open(book, inverse, 38, "order-38").ok, true);
  const snap = book.snapshot(), restored = StageChainBook.restore(snap);
  assert.equal(restored.summary(inverse.id).heldOrders, 1);
  snap.open.find((o) => o.setId === inverse.id)!.proof!.negative!.windows[0].mean = .1;
  assert.throws(() => StageChainBook.restore(snap), /inverse trigger proof/);
});

test("held Active orders survive later gate failure and restart without mirror Last-N revalidation", () => {
  const { book, base, main, real, active } = chain();
  for (let n = 0; n < 27; n++) {
    const t = 2 * n; open(book, base, t); const m = open(book, main, t), r = open(book, real, t, `order-${t}`);
    close(book, base, t, .02); if (m.ok) close(book, main, t, .02); if (r.ok) close(book, real, t, .02);
  }
  for (let n = 27; n < 37; n++) {
    const t = 2 * n; open(book, base, t); const m = open(book, main, t), r = open(book, real, t, `order-${t}`);
    if (n === 27) assert.equal(open(book, active, t, `order-${t}`).ok, true);
    close(book, base, t, .02); if (m.ok) close(book, main, t, .02); if (r.ok) close(book, real, t, -.03);
  }
  assert.equal(book.gate(real.id, 75).state, "failed");
  const restored = StageChainBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
  assert.equal(restored.activeOrders().length, 1); assert.equal(restored.activeOrders()[0].order.entryT, 54);
  assert.throws(() => restored.gate(active.id, 75), /no further Last-N/);
  restored.close(active.id, "order-54", 54, "final", 76, .01, true);
  assert.equal(restored.activeOrders().length, 0);
});

test("restore rejects altered lineage, frozen evidence and held totals instead of inventing an Active proof", () => {
  const { book, base, main } = chain();
  for (let n = 0; n < 9; n++) { open(book, base, 2 * n); close(book, base, 2 * n, .02); }
  assert.equal(open(book, main, 18).ok, true);
  const valid = book.snapshot(); assert.equal(StageChainBook.restore(valid).summary(main.id).heldOrders, 1);
  const corrupt = (mutate: (s: typeof valid) => void) => { const s = structuredClone(valid); mutate(s); assert.throws(() => StageChainBook.restore(s)); };
  corrupt((s) => { s.open[0].proof!.gate!.primary.pf = 999; });
  corrupt((s) => { s.open[0].proof!.gate!.primary.rows[0].knownT = 18; });
  corrupt((s) => { s.open[0].proof!.sourceSetId = "sibling"; });
  corrupt((s) => { s.records[1].set.identity.side = -1; });
  corrupt((s) => { s.records[1].totals.openedOrders++; });
  corrupt((s) => { s.open[0].proof = null; });
  corrupt((s) => { s.seenAtClock = []; });
  corrupt((s) => { s.seenAtClock = ["not-an-order-key"]; });
});

test("same-time completed orders retain deduplication after restart", () => {
  const { book, base } = chain();
  open(book, base, 10); book.close(base.id, "order-10", 10, "final", 10, .02, true);
  const valid = book.snapshot(), restored = StageChainBook.restore(valid);
  assert.throws(() => open(restored, base, 10), /duplicate/);
  valid.seenAtClock = [];
  assert.throws(() => StageChainBook.restore(valid), /completed stage deduplication/);
});

test("settings validate every window and keep independently cloned defaults", () => {
  checkStageChainSettings(DEFAULT_STAGE_CHAIN);
  assert.equal(DEFAULT_STAGE_CHAIN.base.primaryN, 50); assert.equal(DEFAULT_STAGE_CHAIN.main.secondaryN, 15);
  assert.equal(DEFAULT_STAGE_CHAIN.realN, 15);
  for (const mutate of [(s: StageChainSettings) => { s.realN = 5; }, (s: StageChainSettings) => { s.base.primaryN = 8; },
    (s: StageChainSettings) => { s.main.secondaryN = 6; }, (s: StageChainSettings) => { s.main.secondaryWindows = [5, 5]; },
    (s: StageChainSettings) => { s.negativeMain.windows = [15]; }]) {
    const s = settings(); mutate(s); assert.throws(() => checkStageChainSettings(s));
  }
});

test("validation percentage counts only processed parent orders; unrelated intents remain a separate diagnostic", () => {
  const { book, base, main, real } = chain();
  for (let n = 0; n < 18; n++) {
    const t = n * 2; open(book, base, t); const m = open(book, main, t);
    close(book, base, t, .02); if (m.ok) close(book, main, t, .02);
  }
  for (let i = 0; i < 10; i++) assert.equal(book.enter(real.id, `unrelated-${i}`, `outside-position-${i}`, 36, `outside-${i}`).ok, false);
  assert.equal(book.summary(real.id).evaluations.evaluated, 0);
  assert.equal(book.summary(real.id).evaluations.percent, null, "empty parent evaluation is unavailable, not zero percent");
  assert.equal(book.summary(real.id).evaluations.parentMissing, 10);
  open(book, base, 36); assert.equal(open(book, main, 36).ok, true);
  assert.equal(open(book, real, 36, "order-36").ok, true);
  const stats = book.summary(real.id);
  assert.deepEqual(stats.evaluations, { evaluated: 1, qualified: 1, insufficient: 0, unknown: 0, failed: 0,
    parentMissing: 10, percent: 100 });
  assert.equal(stats.openedOrders, 1);
  assert.deepEqual(StageChainBook.restore(book.snapshot()).summaries(), book.summaries());
  const invalid = book.snapshot(); invalid.records.find((r) => r.set.id === real.id)!.evaluations.parentMissing = -1;
  assert.throws(() => StageChainBook.restore(invalid), /totals or history/);
  const legacy = book.snapshot() as unknown as { version: number }; legacy.version = 1;
  assert.throws(() => StageChainBook.restore(legacy as never), /snapshot/);
});

test("an early outside-parent intent cannot poison the later processed child identity at the same clock", () => {
  const { book, base, main, real } = chain();
  for (let n = 0; n < 18; n++) {
    const t = n * 2; open(book, base, t); const m = open(book, main, t);
    close(book, base, t, .02); if (m.ok) close(book, main, t, .02);
  }
  assert.equal(open(book, real, 36, "order-36").ok, false);
  assert.equal(open(book, real, 36, "order-36").ok, false, "a repeated raw intent is still outside the parent stream");
  assert.equal(book.summary(real.id).evaluations.parentMissing, 1, "retries do not inflate diagnostics");
  const restored = StageChainBook.restore(book.snapshot());
  assert.equal(open(restored, real, 36, "order-36").ok, false);
  assert.equal(restored.summary(real.id).evaluations.parentMissing, 1);
  open(restored, base, 36); assert.equal(open(restored, main, 36).ok, true);
  assert.equal(open(restored, real, 36, "order-36").ok, true, "the actual processed parent now exists");
  assert.throws(() => open(restored, real, 36, "order-36"), /duplicate/);
  assert.equal(restored.summary(real.id).evaluations.percent, 100);
  assert.deepEqual(StageChainBook.restore(restored.snapshot()).summaries(), restored.summaries());
});

test("stage execution statistics distinguish no-loss, flat and unknown returns from measured finite PF", () => {
  const { book, base } = chain();
  open(book, base, 0); close(book, base, 0, 0);
  assert.equal(book.summary(base.id).returnPf, null); assert.equal(book.summary(base.id).noLoss, false);
  open(book, base, 2); close(book, base, 2, .01);
  assert.equal(book.summary(base.id).returnPf, null); assert.equal(book.summary(base.id).noLoss, true);
  open(book, base, 4); close(book, base, 4, null);
  assert.equal(book.summary(base.id).returnPf, null); assert.equal(book.summary(base.id).noLoss, false);
  assert.equal(book.summary(base.id).unknownSlices, 1);
});
