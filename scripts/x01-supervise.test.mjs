// The x01 supervisor: alive → no launch; down → relaunch with the loss percentage and symbols; a HALT file → no launch.
// Runs the real script with a stub process pattern and a stub launcher; never starts the desk.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "docs", "live-coordination", "x01-supervise.sh");
const dir = mkdtempSync(join(tmpdir(), "x01-supervise-"));
const launcher = join(dir, "stub-launcher.sh");
writeFileSync(launcher, '#!/usr/bin/env bash\necho "LAUNCHED $1 $2"\n');
chmodSync(launcher, 0o755);

const run = (env = {}, args = []) =>
  spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, CTS_SUPERVISE_LAUNCHER: launcher, CTS_SUPERVISE_HALT: join(dir, "no-halt"), ...env },
  });

test("a live desk is reported alive and never relaunched", async () => {
  const token = `supervise-stub-${process.pid}-alive`;
  const stub = spawn("node", ["-e", "setTimeout(() => {}, 20000)", token]);
  try {
    await new Promise((r) => setTimeout(r, 300));
    const out = run({ CTS_SUPERVISE_PATTERN: token });
    assert.equal(out.status, 0);
    assert.match(out.stdout, /alive \(pid \d+\)/);
    assert.doesNotMatch(out.stdout, /LAUNCHED|relaunching/);
  } finally {
    stub.kill();
  }
});

test("a down desk is relaunched with the loss percentage and the symbols", () => {
  const out = run({ CTS_SUPERVISE_PATTERN: `supervise-no-such-process-${process.pid}` }, ["80", "60"]);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /down — relaunching \(loss limit 80% of the session's starting wallet, 60 symbols\)/);
  assert.match(out.stdout, /LAUNCHED 80 60/);
});

test("a dry run reports the decision and launches nothing", () => {
  const out = run({ CTS_SUPERVISE_PATTERN: `supervise-no-such-process-${process.pid}`, CTS_SUPERVISE_DRY_RUN: "1" }, ["80", "60"]);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /would relaunch/);
  assert.doesNotMatch(out.stdout, /LAUNCHED/);
});

test("a HALT file stops every relaunch until a person removes it", () => {
  const halt = join(dir, "HALT");
  writeFileSync(halt, "unowned position on TIA-USDT");
  const out = run({ CTS_SUPERVISE_PATTERN: `supervise-no-such-process-${process.pid}`, CTS_SUPERVISE_HALT: halt }, ["80", "60"]);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /halted/);
  assert.match(out.stdout, /unowned position on TIA-USDT/);
  assert.doesNotMatch(out.stdout, /LAUNCHED/);
});
