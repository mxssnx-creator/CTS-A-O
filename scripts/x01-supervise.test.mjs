// The x01 supervisor: alive → no launch; down → relaunch with the loss percentage and symbols; a HALT file → no launch.
// Runs the real script with a stub process pattern and a stub launcher; never starts the desk.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from "node:fs";
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

// the desk's side of the HALT file (scripts/lib/ownership-halt.mjs, called from core-live-test.mjs's loss check)
test("an own fill that takes out more than the desk held writes HALT, and the supervisor then refuses to relaunch", async () => {
  const { ownershipBreaches, ledgerToHistoryKeys, writeHalt } = await import("./lib/ownership-halt.mjs");
  const T = "CTSX01_";
  const o = (coid, symbol, positionSide, side, executedQty, time) => ({ clientOrderId: coid, symbol, positionSide, side, executedQty: String(executedQty), status: "FILLED", time, updateTime: time });
  const since = 1_000;
  // a position carried from the last session (the ledger: 2 held), closed in full: no breach
  const startOwn = ledgerToHistoryKeys(new Map([["ETH-USDT|1", 2], ["SOL-USDT|-1", 0]]));
  assert.deepEqual([...startOwn], [["ETH-USDT|LONG", 2]]);
  const clean = [
    o(`${T}c1`, "ETH-USDT", "LONG", "SELL", 2, 2_000),
    o(`${T}o1`, "BTC-USDT", "SHORT", "SELL", 0.5, 2_100),
    o(`${T}x1`, "BTC-USDT", "SHORT", "BUY", 0.5, 2_200),
    // someone else's orders on the same keys are never ours to count
    o("MANUAL1", "BTC-USDT", "SHORT", "SELL", 3, 2_300),
    o("OTHER_x", "ETH-USDT", "LONG", "SELL", 9, 2_400),
    // a fill before this session (the ledger already holds it) is not replayed
    o(`${T}old`, "ADA-USDT", "LONG", "SELL", 5, 500),
  ];
  assert.deepEqual(ownershipBreaches(clean, T, { since, startOwn }), []);
  // an own closePosition stop that closed the operator's added quantity too: 0.5 ours, 1.5 filled
  const over = [...clean, o(`${T}o2`, "BTC-USDT", "SHORT", "SELL", 0.5, 3_000), o(`${T}s2`, "BTC-USDT", "SHORT", "BUY", 1.5, 3_100)];
  const br = ownershipBreaches(over, T.toLowerCase(), { since, startOwn });
  assert.equal(br.length, 1);
  assert.equal(br[0].key, "BTC-USDT|SHORT");
  assert.ok(Math.abs(br[0].over - 1) < 1e-9);
  // a close of a key the desk never held, this session or before: a breach too
  assert.equal(ownershipBreaches([o(`${T}x9`, "TIA-USDT", "LONG", "SELL", 1, 4_000)], T, { since, startOwn }).length, 1);
  // the file the supervisor reads: written once, never over a person's
  const halt = join(dir, "HALT-desk");
  assert.equal(writeHalt(halt, `ownership: ${br[0].key}`), true);
  assert.equal(writeHalt(halt, "second"), false);
  const out = run({ CTS_SUPERVISE_PATTERN: `supervise-no-such-process-${process.pid}`, CTS_SUPERVISE_HALT: halt, CTS_SUPERVISE_DRY_RUN: "1" }, ["80", "60"]);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /halted .*ownership: BTC-USDT\|SHORT/);
  assert.doesNotMatch(out.stdout, /would relaunch|LAUNCHED/);
});

test("the desk runs the ownership check and writes HALT into its --out folder, the file the supervisor reads", () => {
  const desk = readFileSync(join(here, "core-live-test.mjs"), "utf8");
  assert.match(desk, /ownershipBreaches\(/);
  assert.match(desk, /const haltFile = join\(out, "HALT"\)/);
  assert.match(desk, /writeHalt\(haltFile/);
  const sup = readFileSync(script, "utf8");
  const start = readFileSync(join(here, "..", "docs", "live-coordination", "start-x01-signals.sh"), "utf8");
  const outDir = /^OUT=(.+)$/m.exec(start)?.[1];
  assert.ok(outDir);
  assert.ok(sup.includes(`HALT_FILE="\${CTS_SUPERVISE_HALT:-${outDir}/HALT}"`));
});
