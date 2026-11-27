import assert from "node:assert/strict";
import { test } from "node:test";
import { ProcessedSetBook, processedGateVerdict, processedSetKey, processedStageDecision, type ProcessedSetIdentity } from "./processed-set.ts";
import { negativeLastN } from "../negative-last-n.ts";

const identity: ProcessedSetIdentity = { baseConfigId: "follow|ema|short|normal|tp1|sl1", symbol: "A-USDT",
  side: 1, kind: "normal", lane: "independent", economicRevision: "cost-and-settings-v1" };
const policy = { validationN: 9, realN: 9, minPf: 1.1 };

test("Exec requires its own Real terminal positions and the original receipt survives partials and restart", () => {
  const p = { validationN: 2, realN: 2, execN: 2, minPf: 1.1 };
  let book = new ProcessedSetBook("paper", 8);
  for (let i = 0; i < 5; i++) {
    const own = book.acceptPostBase(identity, String(i), i * 4, p);
    assert.equal(own.stage, ["postBase", "postBase", "validated", "validated", "real"][i]);
    book.close(identity, own.entryId, own.entryT, "done", i * 4 + 1, .02, true);
  }
  book.acceptPostBase(identity, "partial", 20, p);
  book.close(identity, "partial", 20, "a", 21, .015, false);
  assert.equal(book.preview(identity, 22, p).exec?.n, 1);
  book.close(identity, "partial", 20, "b", 22, .005, true);
  assert.equal(book.preview(identity, 22, p).stage, "real", "equal-clock terminal fills cannot authorize a decision");
  const admitted = book.acceptPostBase(identity, "exec", 23, p);
  assert.equal(admitted.stage, "active");
  assert.equal(admitted.exec?.state, "qualified");
  const snapshot = JSON.parse(JSON.stringify(book.snapshot()));
  const forged = structuredClone(snapshot);
  forged.open[0].exec.state = "insufficient";
  assert.throws(() => ProcessedSetBook.restore(forged), /invalid processed open entry/);
  book = ProcessedSetBook.restore(snapshot);
  book.close(identity, "exec", 23, "done", 24, -.05, true);
  assert.equal(book.summary(identity)?.stages.active.grossLoss, .05);
  assert.equal(book.summary(identity)?.stages.real?.closedOrders, 3);
  assert.equal(book.summary(identity)?.stages.active.closedOrders, 1);
  assert.equal(book.preview(identity, 25, p).stage, "postBase", "later losses stay in each admitted cohort");
});

test("Auto PF consumes disjoint prior closes, and Main reuse preserves the exact earlier decision floor", () => {
  const series = (priorProfit: number) => [...Array.from({ length: 24 }, (_, i) => i % 2 ? -.01 : priorProfit),
    .018, -.01, 100].map((unitReturn, exitT) => ({ unitReturn, exitT }));
  const p = { validationN: 2, realN: 2, execN: 2, minPf: 1.1, autoPf: { mode: "independent", ratio: 4 } } as const;
  const main = series(.03), real = series(.005);
  const history = (stage: string) => stage === "postBase" ? main : real;
  const independent = processedStageDecision(history, 26, p, 26);
  assert.equal(independent.stage, "active");
  assert.deepEqual(independent.validation.autoPf, { floor: 1.6, source: "own" });
  assert.deepEqual(independent.exec?.autoPf, { floor: 1.1, source: "own" });
  const shared = processedStageDecision(history, 26, { ...p, autoPf: { ...p.autoPf, mode: "main" } }, 26);
  assert.deepEqual(shared.exec?.autoPf, { floor: 1.6, source: "main" });
  assert.deepEqual(shared.real?.autoPf, shared.exec?.autoPf);
  const withHole = main.map((row, i) => i === 3 ? { ...row, unitReturn: null } : row);
  assert.deepEqual(processedGateVerdict(withHole, 26, p, "validation", 26).autoPf, { floor: 1.1, source: "fallback" });
  assert.equal(processedGateVerdict(main, 26, p, "validation", 26).n, 2);
});

const enterAndClose = (book: ProcessedSetBook, i: ProcessedSetIdentity, at: number, r: number | null) => {
  const id = `order-${at}`;
  const admission = book.acceptPostBase(i, id, at, policy);
  book.close(i, id, at, "final", at + 1, r, true);
  return admission;
};

test("overflowing finite parent returns remain unknown in a complete owned window", () => {
  const book = new ProcessedSetBook("model", 12);
  enterAndClose(book, identity, 0, Number.MAX_VALUE);
  enterAndClose(book, identity, 2, Number.MAX_VALUE);
  assert.deepEqual(book.verdict(identity, "postBase", 2, 1.1, 4), { state: "unknown", n: 2, pf: null });
});

test("signed Validation blocks retain the configured independent recent-loss veto", () => {
  const book = new ProcessedSetBook("model", 12);
  [0.02, 0.03, -0.001].forEach((r, i) => enterAndClose(book, identity, 2 * i, r));
  const signed = {...policy,blocks:{validation:{long:2,short:0,minimal:1,
    shortPolarity:"positive",minimalPolarity:"negative"} as const}};
  assert.equal(book.acceptPostBase(identity,"signed-qualification",6,signed).stage,"validated");
  const veto = book.acceptPostBase(identity,"recent-loss-veto",6,{...signed,
    negativeFilter:negativeLastN({windows:[1],mode:"any"})});
  assert.equal(veto.stage,"postBase");
  assert.equal(veto.validation.blockedBy,"negative-filter");
  assert.deepEqual(ProcessedSetBook.restore(JSON.parse(JSON.stringify(book.snapshot()))).snapshot(),book.snapshot());
});

test("processed negative windows retain losses, reject only later admission and survive restart",()=>{
 let book=new ProcessedSetBook("model",20);
 for(let n=0;n<18;n++)enterAndClose(book,identity,2*n,.02);
 book.acceptPostBase(identity,"held-through-dip",36,policy);
 enterAndClose(book,identity,38,-.001);
 const guarded={...policy,negativeFilter:negativeLastN({windows:[1,3],mode:"any"})};
 const entry=book.acceptPostBase(identity,"new-after-dip",40,guarded);
 assert.equal(entry.stage,"postBase");assert.ok(entry.validation.pf!>1);
 assert.equal(entry.validation.blockedBy,"negative-filter");
 const corrupt=book.snapshot();
 const pending=corrupt.open.find(x=>x.entryId==="new-after-dip")!;
 pending.validation.state="qualified";
 assert.throws(()=>ProcessedSetBook.restore(corrupt),/invalid processed open/);
 book=ProcessedSetBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
 assert.deepEqual(book.activePositions().map(x=>x.entryId),["held-through-dip"]);
 book.close(identity,"new-after-dip",40,"final",41,-.002,true);
 assert.equal(book.summary(identity)!.stages.postBase.closedOrders,20);
 assert.equal(book.verdict({...identity,symbol:"B-USDT"},"postBase",9,1.1,42,guarded.negativeFilter).state,"insufficient");
 assert.throws(()=>book.acceptPostBase(identity,"bad",42,{...guarded,negativeFilter:{windows:[21],mode:"any",maxPf:1}}));
});

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

test("cold bookkeeping stays independent in snapshots, restores and later promotion", () => {
  const other = { ...identity, symbol: "B-USDT" }, book = new ProcessedSetBook("model", 12);
  enterAndClose(book, identity, 0, .01);
  enterAndClose(book, other, 2, .01);
  const snap = book.snapshot(), a = snap.sets.find(x => x.identity.symbol === identity.symbol)!,
    b = snap.sets.find(x => x.identity.symbol === other.symbol)!;
  a.validated.push(a.postBase[0]);
  a.counts.validated.openedOrders = 7;
  a.evaluations.real.qualified = 3;
  assert.equal(b.validated.length, 0);
  assert.equal(a.active.length, 0);
  assert.equal(b.counts.validated.openedOrders, 0);
  assert.equal(a.counts.active.openedOrders, 0);
  assert.equal(b.evaluations.real.qualified, 0);
  assert.equal(book.summary(identity)!.stages.validated.openedOrders, 0, "checkpoint edits cannot mutate the book");
  const restored = ProcessedSetBook.restore(book.snapshot());
  for (let n = 0; n < 8; n++) enterAndClose(restored, identity, 4 + 2 * n, .01);
  assert.equal(restored.acceptPostBase(identity, "promoted", 20, policy).stage, "validated");
  assert.equal(restored.summary(other)!.stages.validated.openedOrders, 0, "a sibling stays cold after restore");
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

test("partial fills cannot manufacture a complete Last-N parent window", () => {
  let book = new ProcessedSetBook("paper", 12);
  book.acceptPostBase(identity, "one-parent", 0, policy);
  for (let n = 1; n <= 9; n++) book.close(identity, "one-parent", 0, `part-${n}`, n, .002, false);
  assert.deepEqual(book.verdict(identity, "postBase", 9, 1.1), { state: "insufficient", n: 0, pf: null });
  assert.equal(book.summary(identity)!.stages.postBase.returnPf, null);
  book = ProcessedSetBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
  book.close(identity, "one-parent", 0, "last", 10, -.028, true);
  assert.equal(book.verdict(identity, "postBase", 9, 1.1).n, 1);
  const s = book.summary(identity)!.stages.postBase;
  assert.equal(s.closedOrders, 1); assert.equal(s.settledSlices, 10);
  assert.equal(s.returnPf, 0, "one net-losing parent is one loss, not nine winners and one loser");
  assert.ok(Math.abs(s.grossLoss - .01) < 1e-12);
  assert.equal(s.grossProfit, 0);
});

test("partial losses and unknowns remain attached to their own final parent", () => {
  let book = new ProcessedSetBook("model", 9);
  for (let n = 0; n < 8; n++) enterAndClose(book, identity, 2 * n, .01);
  book.acceptPostBase(identity, "unknown-parent", 16, policy);
  book.close(identity, "unknown-parent", 16, "unknown-part", 17, null, false);
  book = ProcessedSetBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
  assert.equal(book.verdict(identity, "postBase", 9, 1.1).state, "insufficient");
  book.close(identity, "unknown-parent", 16, "final", 18, .05, true);
  assert.equal(book.verdict(identity, "postBase", 9, 1.1).state, "unknown");
  assert.equal(book.summary(identity)!.stages.postBase.unknownReturns, 1);
  assert.equal(book.summary(identity)!.stages.postBase.returnPf, null);
});

test("future information, duplicate opens, invalid policies and corrupt snapshots fail closed", () => {
  const book = new ProcessedSetBook("paper", 9);
  book.acceptPostBase(identity, "one", 10, policy);
  assert.throws(() => book.acceptPostBase(identity, "one", 10, policy), /duplicate/);
  assert.throws(() => book.close(identity, "one", 10, "bad", 9, .01, true), /invalid/);
  assert.throws(() => book.acceptPostBase(identity, "old", 9, policy), /chronological/);
  assert.throws(() => book.acceptPostBase(identity, "bad", 11, { ...policy, realN: 0 }), /policy/);
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

for (const broken of ["validation-pf", "validation-count", "real-pf", "real-count", "missing-policy", "changed-policy", "real-stage"] as const) {
  test(`restart rejects an Active order whose ${broken} evidence is malformed`, () => {
    const book = new ProcessedSetBook("paper", 12);
    for (let n = 0; n < 18; n++) enterAndClose(book, identity, 2 * n, .02);
    book.acceptPostBase(identity, "held", 36, policy);
    const snap = book.snapshot(), opened = snap.open[0];
    if (broken === "validation-pf") opened.validation.pf = null;
    if (broken === "validation-count") opened.validation.n = 0;
    if (broken === "real-pf") opened.real!.pf = 0;
    if (broken === "real-count") opened.real!.n = 0;
    if (broken === "missing-policy") Reflect.deleteProperty(opened, "policy");
    if (broken === "changed-policy") opened.policy.validationN = 12;
    if (broken === "real-stage") opened.real = { state: "insufficient", n: 8, pf: null };
    assert.throws(() => ProcessedSetBook.restore(snap), /invalid processed open/);
  });
}

test("restart retains the entry policy and refuses legacy snapshots without it", () => {
  const book = new ProcessedSetBook("paper", 12), p = { ...policy };
  const admission = book.acceptPostBase(identity, "cold", 0, p);
  p.validationN = 12; admission.policy.realN = 12;
  const snapshot = book.snapshot();
  assert.deepEqual(snapshot.open[0].policy, policy, "caller changes cannot rewrite the entry-time policy");
  assert.equal(ProcessedSetBook.restore(snapshot).snapshot().open[0].stage, "postBase");
  const legacy = structuredClone(snapshot) as unknown as { version: number };
  legacy.version = 1;
  assert.throws(() => ProcessedSetBook.restore(legacy as never), /invalid processed-set snapshot/);
});


test("parallel major/minor policies keep own stages, full windows and restart identities", () => {
  let b = new ProcessedSetBook("paper", 20);
  const lanes = [{id:"major",role:"major" as const,validationN:5,realN:3,minPf:1.1},
    {id:"minor",role:"minor" as const,validationN:2,realN:1,minPf:1.05}];
  for (let i=0;i<5;i++) {
    const opened=b.acceptParallelPostBase(identity,`p${i}`,i*2,lanes);
    if (i===4) {assert.equal(opened[0].stage,"postBase");assert.equal(opened[1].stage,"active");}
    for (const row of opened) b.close(row.identity,row.entryId,row.entryT,"final",i*2+1,.01,true);
  }
  b=ProcessedSetBook.restore(JSON.parse(JSON.stringify(b.snapshot())));
  const next=b.acceptParallelPostBase(identity,"next",10,lanes);
  assert.equal(next[0].stage,"validated");assert.equal(next[1].stage,"active");
  const edited=b.acceptParallelPostBase(identity,"edited",11,[{...lanes[1],realN:2}]);
  assert.equal(edited[0].stage,"postBase");
  const before=b.snapshot();assert.throws(()=>b.acceptParallelPostBase(identity,"bad",12,[lanes[0],lanes[0]]));
  assert.deepEqual(b.snapshot(),before,"invalid duplicate policy must not partially mutate the book");
});

const signedBlocks={long:20,short:10,minimal:3,shortPolarity:"negative" as const,minimalPolarity:"negative" as const};
test("disjoint processed blocks use the PF of all 33 own closes and restart without parent borrowing",()=>{
 const p={validationN:20,realN:20,minPf:1.1,blocks:{validation:signedBlocks,real:signedBlocks}};
 let book=new ProcessedSetBook("paper",95);
 for(let n=0;n<33;n++){const held=book.acceptPostBase(identity,String(n),n*2,p);assert.equal(held.stage,"postBase");book.close(identity,String(n),n*2,"final",n*2+1,n<20?2:-1,true);}
 const held=book.acceptPostBase(identity,"qualified",66,p);assert.equal(held.stage,"validated");assert.equal(held.validation.n,33);assert.equal(held.validation.pf,40/13);assert.equal(held.real!.state,"insufficient");
 book=ProcessedSetBook.restore(JSON.parse(JSON.stringify(book.snapshot())));
 assert.equal(book.verdict(identity,"postBase",20,1.1,67,undefined,signedBlocks).state,"qualified");
 assert.equal(book.verdict({...identity,lane:"sibling"},"postBase",20,1.1,67,undefined,signedBlocks).state,"insufficient");
});
