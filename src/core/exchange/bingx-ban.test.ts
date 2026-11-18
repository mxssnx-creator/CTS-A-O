import { test } from "node:test";
import assert from "node:assert/strict";
import { redactBan } from "./bingx.server.ts";

test("redactBan masks keys, signatures and long tokens and caps the length", () => {
  const key = "A".repeat(60);
  const out = redactBan(`GET /openApi/swap/v2/user/positions?signature=${"b".repeat(64)}&apiKey=${key} code 100410 unblocked after 1794982000000`);
  assert.ok(!out.includes("b".repeat(20)));
  assert.ok(!out.includes(key));
  assert.ok(out.includes("100410"));
  assert.ok(redactBan("x".repeat(1000)).length <= 300);
});

import { retryPauseMs, RETRY_FIRST_MS, RETRY_MAX_MS } from "./bingx.server.ts";
test("the 100410 pause starts short, doubles with each repeat and is capped", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(retryPauseMs), [5000, 10000, 20000, 40000, 60000, 60000, 60000]);
  assert.equal(retryPauseMs(0), RETRY_FIRST_MS);
  assert.equal(retryPauseMs(99), RETRY_MAX_MS);
});
