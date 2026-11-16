import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import { sweepStaleHistoryDirectories } from "./history-store.server.ts";

it("removes spill directories of dead processes only, and nothing else", () => {
  const root = mkdtempSync(join(tmpdir(), "sweep-test-"));
  try {
    const make = (name: string) => { mkdirSync(join(root, name)); writeFileSync(join(root, name, "columns.bin"), "x"); return join(root, name); };
    const dead = make("cts-history-4242-abcDEF");
    const deadTransfer = make("cts-history-transfer-4243-xyz");
    const live = make("cts-history-7001-live");
    const own = make(`cts-history-${process.pid}-mine`);
    const unrelated = make("some-other-directory-4242");
    const similar = make("cts-history-notapid-abc");
    writeFileSync(join(root, "cts-history-4242-file"), "a file is left alone too");
    const removed = sweepStaleHistoryDirectories(root, (pid) => pid === 7001);
    assert.equal(removed, 2);
    assert.equal(existsSync(dead), false);
    assert.equal(existsSync(deadTransfer), false);
    for (const keep of [live, own, unrelated, similar]) assert.equal(existsSync(keep), true, keep);
    assert.equal(sweepStaleHistoryDirectories(root, (pid) => pid === 7001), 0, "idempotent");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("a missing root is not an error, and the real liveness check treats this process as alive", () => {
  assert.equal(sweepStaleHistoryDirectories(join(tmpdir(), "does-not-exist-" + process.pid)), 0);
  const root = mkdtempSync(join(tmpdir(), "sweep-test-"));
  try {
    mkdirSync(join(root, `cts-history-${process.ppid}-parent`));
    // the parent process exists, so its directory stays under the default liveness check
    assert.equal(sweepStaleHistoryDirectories(root), 0);
    assert.equal(existsSync(join(root, `cts-history-${process.ppid}-parent`)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
