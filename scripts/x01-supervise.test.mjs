// x01-supervise.sh takes an omitted / "auto" loss limit and symbol count from the ACTIVE run: the running desk's command line,
// else the last launch (launch.json), else the old defaults; a number wins. Dry run only: nothing is launched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = "docs/live-coordination/x01-supervise.sh";
function run(args, dir, env = {}) {
  const r = spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, CTS_SUPERVISE_DRY_RUN: "1", CTS_SUPERVISE_OUT: dir, CTS_SUPERVISE_PATTERN: "[n]o-such-desk-process-xyz", CTS_X01_HEAP_MB: "", ...env },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "x01-sup-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("no launch.json and no argument: the old defaults 80 % / 60 symbols", () =>
  withDir((dir) => {
    const out = run([], dir);
    assert.match(out, /would relaunch \(loss limit 80% \[default\], 60 symbols \[default\]/);
  }));

test("launch.json: the active run's loss limit, symbols and heap are used", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 0, "symbols": 70, "heapMb": 6144, "at": "x"}\n');
    const out = run(["auto", "auto"], dir);
    assert.match(out, /loss limit 0% \[launch\.json\], 70 symbols \[launch\.json\], heap 6144 MB/);
  }));

test("an explicit number wins over launch.json, auto fills the other", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 0, "symbols": 70, "heapMb": 6144, "at": "x"}\n');
    const out = run(["80", "auto"], dir);
    assert.match(out, /loss limit 80% \[argument\], 70 symbols \[launch\.json\]/);
  }));

test("the heap from the environment is not overridden by launch.json", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 0, "symbols": 70, "heapMb": 6144, "at": "x"}\n');
    assert.match(run([], dir, { CTS_X01_HEAP_MB: "3000" }), /heap 3000 MB/);
  }));

test("a HALT file stops the relaunch whatever the parameters", () =>
  withDir((dir) => {
    writeFileSync(join(dir, "HALT"), "operator: off\n");
    assert.match(run([], dir), /halted .* not relaunching: operator: off/);
  }));

test("a running desk: its own command line is read for the status line", async () => {
  const { spawn } = await import("node:child_process");
  const dir = mkdtempSync(join(tmpdir(), "x01-sup-"));
  // a stand-in process whose command line carries the desk's flags
  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 15000)", "fake-desk.mjs", "--name", "x01-signals", "--symbols", "70", "--max-loss-pct", "0"], { stdio: "ignore" });
  try {
    await new Promise((r) => setTimeout(r, 300));
    writeFileSync(join(dir, "launch.json"), '{"lossPct": 80, "symbols": 50, "heapMb": 4096, "at": "x"}\n');
    const out = run([], dir, { CTS_SUPERVISE_PATTERN: "[f]ake-desk.mjs --name x01-signals " });
    assert.match(out, /alive \(pid \d+; loss limit 0% \[running desk\], 70 symbols \[running desk\]\)/);
  } finally {
    child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
