// The x01 supervisor: alive → no launch; down → relaunch with the loss percentage and symbols; a HALT file → no launch.
// An omitted / "auto" loss limit and symbol count come from the ACTIVE run: the running desk's command line, else the last
// launch (launch.json), else the old defaults; a number wins.
// Runs the real script with a stub process pattern and a stub launcher; never starts the desk.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "docs", "live-coordination", "x01-supervise.sh");
const dir = mkdtempSync(join(tmpdir(), "x01-supervise-"));
const launcher = join(dir, "stub-launcher.sh");
writeFileSync(launcher, '#!/usr/bin/env bash\necho "LAUNCHED $1 $2"\n');
chmodSync(launcher, 0o755);
after(() => rmSync(dir, { recursive: true, force: true }));

// An unanchored token also matches pgrep's own argv on PID-namespace runners.
// Constrain hooks to Node processes, and isolate simultaneous test executions.
const token = (kind) => `supervise-${kind}-${randomUUID()}`;
const processPattern = (value) => `^([^[:space:]]*/)?node[[:space:]].*[[:space:]]${value}$`;
const absentPattern = () => processPattern(token("absent"));

const run = (env = {}, args = []) =>
  spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, CTS_SUPERVISE_LAUNCHER: launcher, CTS_SUPERVISE_HALT: join(dir, "no-halt"), CTS_SUPERVISE_OUT: dir, CTS_X01_HEAP_MB: "", ...env },
  });
// a dry run in a folder of its own (launch.json, defaults, the running desk's command line): the stdout line
const runDry = (args, outDir, env = {}) => {
  const r = spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, CTS_SUPERVISE_DRY_RUN: "1", CTS_SUPERVISE_OUT: outDir, CTS_SUPERVISE_PATTERN: "[n]o-such-desk-process-xyz", CTS_X01_HEAP_MB: "", ...env },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};
const withDir = (fn) => {
  const d = mkdtempSync(join(tmpdir(), "x01-sup-"));
  try {
    fn(d);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
};

test("a live desk is reported alive and never relaunched", async () => {
  const value = token("alive");
  const stub = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)", value]);
  try {
    await once(stub, "spawn");
    const out = run({ CTS_SUPERVISE_PATTERN: processPattern(value) });
    assert.equal(out.status, 0);
    assert.match(out.stdout, /alive \(pid \d+;/);
    assert.doesNotMatch(out.stdout, /LAUNCHED|relaunching/);
  } finally {
    stub.kill();
    await once(stub, "close");
  }
});

test("a down desk is relaunched with the loss percentage and the symbols", () => {
  const out = run({ CTS_SUPERVISE_PATTERN: absentPattern() }, ["80", "60"]);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /down — relaunching \(loss limit 80% \[argument\], 60 symbols \[argument\]/);
  assert.match(out.stdout, /LAUNCHED 80 60/);
});

test("a dry run reports the decision and launches nothing", () => {
  const out = run({ CTS_SUPERVISE_PATTERN: absentPattern(), CTS_SUPERVISE_DRY_RUN: "1" }, ["80", "60"]);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /would relaunch/);
  assert.doesNotMatch(out.stdout, /LAUNCHED/);
});

test("the default matcher recognizes the launcher's Node flags and desk arguments", async () => {
  const deskStub = join(dir, "core-live-test.mjs");
  writeFileSync(deskStub, "setTimeout(() => {}, 20000);\n");
  const stub = spawn(process.execPath, ["--max-old-space-size=128", "--expose-gc", "--experimental-strip-types", "--no-warnings", deskStub, "--name", "x01-signals", "--conn", "bingx-x01"]);
  try {
    await once(stub, "spawn");
    const out = run({ CTS_SUPERVISE_PATTERN: "" });
    assert.equal(out.status, 0);
    assert.match(out.stdout, /alive \(pid \d+;/);
    assert.doesNotMatch(out.stdout, /LAUNCHED|relaunching/);
  } finally {
    stub.kill();
    await once(stub, "close");
  }
});

test("the default matcher ignores a helper that only mentions the desk command", async () => {
  const stub = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)", "core-live-test.mjs --name x01-signals "]);
  try {
    await once(stub, "spawn");
    const out = run({ CTS_SUPERVISE_PATTERN: "", CTS_SUPERVISE_DRY_RUN: "1" });
    assert.equal(out.status, 0);
    assert.match(out.stdout, /would relaunch/);
    assert.doesNotMatch(out.stdout, /alive|LAUNCHED/);
  } finally {
    stub.kill();
    await once(stub, "close");
  }
});

test("a failed process query refuses to launch a possible duplicate desk", () => {
  const out = run({ CTS_SUPERVISE_PATTERN: "[" });
  assert.notEqual(out.status, 0);
  assert.match(out.stderr, /process check failed/);
  assert.doesNotMatch(out.stdout, /LAUNCHED|relaunching/);
});

test("a HALT file stops every relaunch until a person removes it", () => {
  const halt = join(dir, "HALT");
  writeFileSync(halt, "unowned position on TIA-USDT");
  const out = run({ CTS_SUPERVISE_PATTERN: absentPattern(), CTS_SUPERVISE_HALT: halt }, ["80", "60"]);
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
  const out = run({ CTS_SUPERVISE_PATTERN: absentPattern(), CTS_SUPERVISE_HALT: halt, CTS_SUPERVISE_DRY_RUN: "1" }, ["80", "60"]);
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
  assert.ok(sup.includes(`OUT="\${CTS_SUPERVISE_OUT:-${outDir}}"`));
  assert.ok(sup.includes('HALT_FILE="${CTS_SUPERVISE_HALT:-$OUT/HALT}"'));
});

test("no launch.json and no argument: the old defaults 80 % / 60 symbols", () =>
  withDir((dir) => {
    const out = runDry([], dir);
    assert.match(out, /would relaunch \(loss limit 80% \[default\], 60 symbols \[default\]/);
  }));

test("launch.json: the active run's loss limit, symbols and heap are used", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 0, "symbols": 70, "heapMb": 6144, "at": "x"}\n');
    const out = runDry(["auto", "auto"], dir);
    assert.match(out, /loss limit 0% \[launch\.json\], 70 symbols \[launch\.json\], heap 6144 MB/);
  }));

test("an explicit number wins over launch.json, auto fills the other", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 0, "symbols": 70, "heapMb": 6144, "at": "x"}\n');
    const out = runDry(["80", "auto"], dir);
    assert.match(out, /loss limit 80% \[argument\], 70 symbols \[launch\.json\]/);
  }));

test("the heap from the environment is not overridden by launch.json", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 0, "symbols": 70, "heapMb": 6144, "at": "x"}\n');
    assert.match(runDry([], dir, { CTS_X01_HEAP_MB: "3000" }), /heap 3000 MB/);
  }));

test("a HALT file stops the relaunch whatever the parameters", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "HALT"), "operator: off\n");
    assert.match(runDry([], dir), /halted .* not relaunching: operator: off/);
  }));

test("a running desk: its own command line is read for the status line", async () => {
  const dir = mkdtempSync(join(tmpdir(), "x01-sup-"));
  // a stand-in process whose command line carries the desk's flags
  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 15000)", "fake-desk.mjs", "--name", "x01-signals", "--symbols", "70", "--max-loss-pct", "0"], { stdio: "ignore" });
  try {
    await new Promise((r) => setTimeout(r, 300));
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 80, "symbols": 50, "heapMb": 4096, "at": "x"}\n');
    const out = runDry([], dir, { CTS_SUPERVISE_PATTERN: "[f]ake-desk.mjs --name x01-signals " });
    assert.match(out, /alive \(pid \d+; loss limit 0% \[running desk\], 70 symbols \[running desk\]\)/);
  } finally {
    child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
