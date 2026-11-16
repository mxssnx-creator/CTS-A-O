import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { it } from "node:test";
import { HistoryTransfer, TapeHistoryStore, chooseHistorySpillRoot, historyProcessNamespace, historySpillRoot, sweepStaleHistoryDirectories } from "./history-store.server.ts";

const namespace = historyProcessNamespace();
it("chooses disk-backed application storage when temporary storage is RAM-backed", () => {
  const temp = "/temporary", work = "/working", tmpfs = 0x01021994, disk = 0x794c7630;
  assert.equal(chooseHistorySpillRoot(temp, work, (path) => path === temp ? tmpfs : disk), join(work, ".cts-core", "history"));
  assert.equal(chooseHistorySpillRoot(temp, work, () => disk), temp);
  assert.equal(chooseHistorySpillRoot(temp, work, () => tmpfs), temp);
  assert.equal(chooseHistorySpillRoot(temp, work, (path) => path === temp ? tmpfs : null), temp);
});
it("removes only dead spills from this PID namespace, preserving legacy and foreign namespaces", { skip: !namespace }, () => {
  const root = mkdtempSync(join(tmpdir(), "sweep-test-"));
  try {
    const make = (name: string) => { mkdirSync(join(root, name)); writeFileSync(join(root, name, "columns.bin"), "x"); return join(root, name); };
    const dead = make(`cts-history-ns${namespace}-4242-abcDEF`);
    const deadTransfer = make(`cts-history-transfer-ns${namespace}-4243-xyz`);
    const live = make(`cts-history-ns${namespace}-7001-live`);
    const own = make(`cts-history-ns${namespace}-${process.pid}-mine`);
    const foreign = make(`cts-history-ns${namespace === "1" ? "2" : "1"}-4244-foreign`);
    const legacy = make("cts-history-4245-legacy");
    const unrelated = make("some-other-directory-4242");
    const similar = make("cts-history-notapid-abc");
    writeFileSync(join(root, "cts-history-4242-file"), "a file is left alone too");
    const removed = sweepStaleHistoryDirectories(root, (pid) => pid === 7001);
    assert.equal(removed, 2);
    assert.equal(existsSync(dead), false);
    assert.equal(existsSync(deadTransfer), false);
    for (const keep of [live, own, foreign, legacy, unrelated, similar]) assert.equal(existsSync(keep), true, keep);
    assert.equal(sweepStaleHistoryDirectories(root, (pid) => pid === 7001), 0, "idempotent");
    assert.equal(sweepStaleHistoryDirectories(root, () => false, null), 0, "unknown namespace is never swept");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("a missing root is not an error, and the real liveness check treats this process as alive", { skip: !namespace }, () => {
  assert.equal(sweepStaleHistoryDirectories(join(tmpdir(), "does-not-exist-" + process.pid)), 0);
  const root = mkdtempSync(join(tmpdir(), "sweep-test-"));
  try {
    mkdirSync(join(root, `cts-history-ns${namespace}-${process.ppid}-parent`));
    // the parent process exists, so its directory stays under the default liveness check
    assert.equal(sweepStaleHistoryDirectories(root), 0);
    assert.equal(existsSync(join(root, `cts-history-ns${namespace}-${process.ppid}-parent`)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("configured history root contains both tape spills and transfer manifests", () => {
  const root = mkdtempSync(join(tmpdir(), "history-root-test-")), dir = join(root, "private", "spills");
  const previous = process.env.CTS_CORE_HISTORY_DIR;
  let store: TapeHistoryStore | undefined, transfer: HistoryTransfer | undefined;
  try {
    process.env.CTS_CORE_HISTORY_DIR = dir;
    assert.equal(historySpillRoot(), dir);
    store = new TapeHistoryStore(); transfer = new HistoryTransfer();
    assert.equal(dirname(dirname(store.path)), dir);
    assert.equal(dirname(dirname(transfer.path)), dir);
    assert.ok(existsSync(store.path)); assert.ok(existsSync(transfer.path));
  } finally {
    store?.close(); transfer?.close();
    if (previous === undefined) delete process.env.CTS_CORE_HISTORY_DIR;
    else process.env.CTS_CORE_HISTORY_DIR = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
