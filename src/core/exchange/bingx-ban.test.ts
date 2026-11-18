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
