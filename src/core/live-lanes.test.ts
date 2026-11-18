import { test } from "node:test";
import assert from "node:assert/strict";
import { laneExcluded } from "./server/live.server.ts";

test("live.excludeLanes: Long without its 1m lanes; other ranges and lanes unaffected", () => {
  const ex = new Set(["lg@m1", "lg@m1c"]);
  assert.equal(laneExcluded("follow|rsi-mom-14-20@m1|lg|tp1|sl1|tr0|h32", ex), true);
  assert.equal(laneExcluded("follow|rsi-mom-14-20@m1c|lg|tp1|sl1|tr0|h32", ex), true);
  assert.equal(laneExcluded("follow|rsi-mom-14-20@m5|lg|tp1|sl1|tr0|h32", ex), false);
  assert.equal(laneExcluded("follow|rsi-mom-14-20@m5c|lg|tp1|sl1|tr0|h32", ex), false);
  assert.equal(laneExcluded("follow|rsi-mom-14-20@m1|mc|tp1|sl1|tr0|h32", ex), false);
});
