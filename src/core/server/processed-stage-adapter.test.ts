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
  assert.deepEqual(
    [own.stage, own.validation.state, own.validation.n, own.validation.pf],
    ["postBase", "unknown", 1, null],
  );
  const sibling = adapter.preview(tp, "SIBLING-USDT", 1, 13, 1.05);
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
  assert.equal(repriced.preview(tp, "OWN-USDT", 1, 12, 1.05).validation.state, "insufficient");
  assert.equal(repriced.preview(tp, "OWN-USDT", -1, 12, 1.05).validation.state, "insufficient");
  assert.equal(original.preview(tp, "OWN-USDT", 1, 12, 1.05).validation.state, "qualified");
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
