import assert from "node:assert/strict";
import test from "node:test";
import { NativeProcessedStageAdapter } from "./processed-stage-adapter.ts";

const policy = { validationN: 1, realN: 1 };
const tp = { id: "follow|ema-9-21@m1|native", kind: "normal", ind: "ema-9-21@m1" };

test("a missing durable paper parent becomes unknown once and cannot qualify a sibling identity", () => {
  let adapter = new NativeProcessedStageAdapter(policy, 0.0015);
  const open = adapter.enter(tp, "OWN-USDT", 1, 10, 1.05);
  adapter = new NativeProcessedStageAdapter(
    policy,
    0.0015,
    JSON.parse(JSON.stringify(adapter.snapshot())),
  );

  assert.equal(adapter.reconcile(new Set(), 11), 1);
  assert.equal(adapter.reconcile(new Set(), 12), 0, "checkpoint replay is idempotent");
  assert.equal(
    adapter.settle(open.entryId, 12, 0.5),
    "already-settled",
    "a later replay cannot invent a win",
  );

  const own = adapter.preview(tp, "OWN-USDT", 1, 13, 1.05);
  assert.ok(own);
  assert.deepEqual(
    [own.stage, own.validation.state, own.validation.n, own.validation.pf],
    ["postBase", "unknown", 1, null],
  );
  const sibling = adapter.preview(tp, "SIBLING-USDT", 1, 13, 1.05);
  assert.ok(sibling);
  assert.deepEqual(
    [sibling.stage, sibling.validation.state, sibling.validation.n],
    ["postBase", "insufficient", 0],
  );
});

test("cost and direction revisions retain old evidence without lending it to a new economic lane", () => {
  const original = new NativeProcessedStageAdapter(policy, 0.0015);
  const first = original.enter(tp, "OWN-USDT", 1, 10, 1.05);
  original.settle(first.entryId, 11, 0.02);
  const snapshot = JSON.parse(JSON.stringify(original.snapshot()));

  const repriced = new NativeProcessedStageAdapter(policy, 0.002, snapshot);
  assert.equal(repriced.preview(tp, "OWN-USDT", 1, 12, 1.05)!.validation.state, "insufficient");
  assert.equal(repriced.preview(tp, "OWN-USDT", -1, 12, 1.05)!.validation.state, "insufficient");
  assert.equal(original.preview(tp, "OWN-USDT", 1, 12, 1.05)!.validation.state, "qualified");
});

test("malformed durable ownership fails restore instead of starting a clean stage book", () => {
  const adapter = new NativeProcessedStageAdapter(policy, 0.0015);
  adapter.enter(tp, "OWN-USDT", 1, 10, 1.05);
  const snapshot = JSON.parse(JSON.stringify(adapter.snapshot()));
  snapshot.book.basis = "model";
  assert.throws(
    () => new NativeProcessedStageAdapter(policy, 0.0015, snapshot),
    /native processed-stage book/,
  );
});

test("a shared paper opening restores both independent lanes and settles each exact receipt once", () => {
  const lanes = { ...policy, execN: 1, lanes: [{id:"fast"}, {id:"slow", execN:2}] };
  let adapter = new NativeProcessedStageAdapter(lanes, .0015);
  for (let i = 0; i < 3; i++) {
    const order = adapter.enter(tp, "OWN-USDT", 1, i*4, 1.05);
    adapter.settle(order.entryId, i*4+1, .02);
  }
  const fast = adapter.enter(tp, "OWN-USDT", 1, 12, 1.05);
  assert.equal(fast.stage, "active");
  const snapshot = JSON.parse(JSON.stringify(adapter.snapshot()));
  assert.deepEqual(snapshot.book.open.map((o: {stage: string}) => o.stage), ["active", "real"]);
  adapter = new NativeProcessedStageAdapter(lanes, .0015, snapshot);
  assert.equal(adapter.decisionFor(fast.entryId)?.exec?.state, "qualified");
  const changed = new NativeProcessedStageAdapter({ ...lanes, lanes: [{id:"new"}] }, .0015, snapshot);
  assert.equal(changed.decisionFor(fast.entryId), null);
  assert.equal(changed.settle(fast.entryId, 13, -.02), "settled");
  assert.equal(adapter.settle(fast.entryId, 13, .02), "settled");
  assert.equal(adapter.settle(fast.entryId, 14, -.01), "already-settled");
  assert.equal(adapter.snapshot().book.open.length, 0);
});

test("a negative Main policy does not use the Base side's native orders or block a direct sibling", () => {
  const inverse = { id: "inverse", blocks: { validation: { long: 3, short: 2, minimal: 1,
    shortPolarity: "negative" as const, minimalPolarity: "negative" as const } } };
  const supported = new NativeProcessedStageAdapter({ ...policy, execN: 1, lanes: [inverse, { id: "direct" }] }, .0015);
  for (let i = 0; i < 5; i++) {
    const order = supported.enter(tp, "OWN-USDT", 1, 2*i, 1.25);
    if (i === 4) assert.equal(order.stage, "active");
    assert.equal(JSON.parse(order.identity.lane).at(-1), "direct");
    supported.settle(order.entryId, 2*i+1, .02);
  }
  const unsupported = new NativeProcessedStageAdapter({ ...policy, execN: 1, lanes: [inverse] }, .0015);
  assert.equal(unsupported.hasNativeSource, false);
  assert.equal(unsupported.preview(tp,"OWN-USDT",1,12,1.25), null);
  assert.equal(unsupported.preview(tp,"OWN-USDT",-1,12,1.25), null);
  assert.throws(() => unsupported.enter(tp,"OWN-USDT",1,12,1.25), /no Base-qualified/);
});

test("large disjoint policy retains every required parent close across a legacy checkpoint", () => {
  const wide = {...policy, blocks:{validation:{long:500,short:200,minimal:5,shortPolarity:"negative" as const,minimalPolarity:"negative" as const}}};
  const previous=new NativeProcessedStageAdapter(policy,0.001);
  const active=previous.enter(tp,"OWN-USDT",1,0,1.05);
  const adapter=new NativeProcessedStageAdapter(wide,0.001,JSON.parse(JSON.stringify(previous.snapshot())));
  assert.equal(adapter.settle(active.entryId,1,.02),"settled");
  for (let i=0;i<705;i++) {
    const entry=adapter.enter(tp,"OWN-USDT",1,2+i*2,1.05);
    adapter.settle(entry.entryId,3+i*2,i<500?.02:-.01);
  }
  const restored=new NativeProcessedStageAdapter(wide,.001,JSON.parse(JSON.stringify(adapter.snapshot())));
  assert.equal(restored.preview(tp,"OWN-USDT",1,1414,1.05)!.validation.state,"qualified");
  assert.equal(restored.preview(tp,"OWN-USDT",-1,1414,1.05)!.validation.state,"insufficient");
});
