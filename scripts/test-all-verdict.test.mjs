import assert from "node:assert/strict";
import { test } from "node:test";
import { testAllVerdict } from "./test-all-verdict.mjs";

const file = "src/core/fixture.test.ts";
const passed = (patch = {}) => ({ file, status: "pass", code: 0, tests: 3, pass: 2, fail: 0, cancelled: 0, skipped: 1, ...patch });

test("completed files retain intentional test-level opt-in skips without becoming resource skips", () => {
  assert.deepEqual(testAllVerdict([file], [passed()]), { complete: true, exitCode: 0, requestedFiles: 1, issues: [] });
  assert.equal(testAllVerdict([file], [passed({ pass: 0, skipped: 3 })]).exitCode, 0);
});

test("memory-admission skips and every other unrun file status prevent a successful aggregate", () => {
  for (const status of ["skipped", "not-run", "missing", "killed", "fail", "queued", undefined]) {
    const result = testAllVerdict([file], [{ file, status, reason: "memory admission did not complete" }]);
    assert.equal(result.exitCode, 1, String(status));
    assert.equal(result.complete, false);
    assert.match(result.issues[0], /memory admission/);
  }
});

test("a passing subset cannot hide missing requested files or an empty selection", () => {
  const missing = testAllVerdict([file, "scripts/missing.test.mjs"], [passed()]);
  assert.equal(missing.exitCode, 1);
  assert.equal(missing.requestedFiles, 2);
  assert.match(missing.issues[0], /missing\.test\.mjs: no file result/);
  assert.equal(testAllVerdict([], []).exitCode, 1);
});

test("file labels cannot mask cancelled, failed, nonzero-exit or absent TAP evidence", () => {
  for (const patch of [{ cancelled: 1 }, { fail: 1 }, { code: 1 }, { code: null }, { tests: 0 }, { tests: undefined }])
    assert.equal(testAllVerdict([file], [passed(patch)]).exitCode, 1, JSON.stringify(patch));
});

test("duplicated results and unexpected files cannot fill a missing result slot", () => {
  assert.equal(testAllVerdict([file], [passed(), passed()]).exitCode, 1);
  assert.equal(testAllVerdict([file], [passed({ file: "another.test.mjs" })]).exitCode, 1);
  assert.equal(testAllVerdict([file, file], [passed()]).exitCode, 0, "repeated requests identify one file");
});
