import assert from "node:assert/strict";
import { test } from "node:test";
import { historyCacheBytes } from "./history-store.server.ts";

test("decoded history cache override is bounded and measured in MiB", () => {
  assert.equal(historyCacheBytes("64"), 64 * 1048576);
  assert.equal(historyCacheBytes("256"), 256 * 1048576);
  for (const value of ["", "0", "-1", "1.5", "1025", "NaN"])
    assert.throws(() => historyCacheBytes(value));
});
