import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./core-live-coord.mjs", import.meta.url));
const evidence = { kind: "forward-paper", source: "ref.paper", pfBasis: "net-returns", actualExecution: false };

function fixture(t, initialPatch) {
  const dir = mkdtempSync(join(tmpdir(), "cts-paper-coord-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ref = join(dir, "status.json");
  const patch = join(dir, "patch.json");
  if (initialPatch) writeFileSync(patch, JSON.stringify(initialPatch));
  return {
    contents: () => readFileSync(patch, "utf8"),
    run(status, ...args) {
      if (status !== undefined) writeFileSync(ref, JSON.stringify(status));
      const result = spawnSync(
        process.execPath,
        ["--experimental-strip-types", "--no-warnings", script, "--ref", ref, "--patch", patch, ...args],
        { encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 },
      );
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      return { stdout: result.stdout, patch: JSON.parse(readFileSync(patch, "utf8")) };
    },
  };
}

test("coordinator labels profitable paper return evidence even when exchange and cash PF conflict", (t) => {
  const f = fixture(t);
  const { stdout, patch } = f.run(
    {
      paper: { Micro: { n: 15, gp: 1.36, gl: 1, pf: 0.2, cashPf: 0.2 } },
      exchange: { Micro: { n: 15, gp: 0.2, gl: 1, pf: 0.2 } },
      live: { Micro: { n: 15, gp: 0.2, gl: 1, pf: 0.2 } },
    },
    "--ranges", "micro", "--gate",
  );
  assert.equal(patch.on.micro, true);
  assert.equal(patch.paused, false);
  assert.equal(patch.settings.live.openPaused, false);
  assert.ok(patch.settings.grid.micro.tp.length > 0);
  assert.match(stdout, /15 forward-paper closes on the reference, return PF 1\.36 → on/);
  assert.match(patch.reason, /reference forward-paper return PF 1\.36 over 15 closes/);
  assert.doesNotMatch(stdout + patch.why + patch.reason, /live closes|live PF|proves.*live/);
  assert.deepEqual(patch.coordinatorEvidence, evidence);
});

test("profitable exchange fields do not replace losing or absent reference paper evidence", (t) => {
  const f = fixture(t);
  const exchange = { Micro: { n: 100, gp: 10, gl: 1 }, Short: { n: 100, gp: 10, gl: 1 } };
  const losing = f.run(
    { paper: { Micro: { n: 20, gp: 0.2, gl: 1 }, Short: { n: 20, gp: 0.2, gl: 1 } }, exchange },
    "--ranges", "micro,short", "--gate",
  );
  assert.deepEqual(losing.patch.on, { micro: false, short: false });
  assert.deepEqual(losing.patch.settings.grid, { micro: false, short: false });
  assert.equal(losing.patch.paused, true);
  assert.match(losing.stdout, /return PF 0\.20 → off/);
  assert.match(losing.patch.reason, /0 of 15 forward-paper closes/);

  const empty = fixture(t).run({ exchange, live: exchange }, "--ranges", "micro", "--gate");
  assert.equal(empty.patch.on.micro, false);
  assert.equal(empty.patch.paused, true);
  assert.match(empty.stdout, /0 forward-paper closes/);
  assert.deepEqual(empty.patch.coordinatorEvidence, evidence);
});

test("missing reference preserves opt-in and opt-out range starts and the closed opening gate", (t) => {
  const { patch, stdout } = fixture(t).run(undefined, "--ranges", "micro,minimal,short,general,long", "--gate");
  assert.deepEqual(patch.on, { micro: false, minimal: false, short: true, general: true, long: true });
  assert.equal(patch.settings.grid.micro, false);
  assert.equal(patch.settings.grid.minimal, false);
  for (const name of ["short", "general", "long"]) assert.ok(patch.settings.grid[name].tp.length > 0);
  assert.equal(patch.paused, true);
  assert.match(stdout, /reference has 0 of 15 forward-paper closes → paused/);
});

test("default minimum counts and PF hysteresis preserve range and opening decisions", (t) => {
  const f = fixture(t);
  const run = (n, gp, gl) => f.run({ paper: { Micro: { n, gp, gl } } }, "--ranges", "micro", "--gate");
  let r = run(9, 2, 1);
  assert.equal(r.patch.on.micro, false, "opt-in range waits for ten paper closes");
  assert.equal(r.patch.paused, true);
  r = run(10, 1.1, 1);
  assert.equal(r.patch.on.micro, true, "range opens at the on-PF threshold");
  assert.equal(r.patch.paused, true, "opening gate waits for fifteen closes");
  r = run(15, 1.1, 1);
  assert.equal(r.patch.paused, false, "gate opens at its count and on-PF thresholds");
  const before = f.contents();
  r = run(16, 1, 1);
  assert.equal(r.patch.on.micro, true);
  assert.equal(r.patch.paused, false, "PF at the off threshold keeps the current decisions");
  assert.match(r.stdout, /^unchanged/);
  assert.equal(f.contents(), before, "counts and evidence labels alone must not trigger a settings update");
  r = run(17, 0.99, 1);
  assert.equal(r.patch.on.micro, false);
  assert.equal(r.patch.paused, true);
  r = run(20, 1.05, 1);
  assert.equal(r.patch.on.micro, false, "PF between thresholds keeps an off range off");
  assert.equal(r.patch.paused, true);
});

test("opening gate includes unmanaged ranges and excludes disabled managed ranges", (t) => {
  const { patch } = fixture(t).run(
    { paper: { Micro: { n: 10, gp: 3, gl: 1 }, Minimal: { n: 10, gp: 0, gl: 100 }, Short: { n: 5, gp: 0, gl: 5 } } },
    "--ranges", "micro,minimal", "--gate",
  );
  assert.deepEqual(patch.on, { micro: true, minimal: false });
  assert.equal(patch.paused, true, "unmanaged Short losses keep the gate closed");
  assert.match(patch.reason, /return PF 0\.50 over 15 closes/, "disabled Minimal losses are excluded");
});

test("custom gate thresholds still apply and patches preserve unrelated settings", (t) => {
  const f = fixture(t, {
    operatorNote: "keep",
    on: { micro: false },
    paused: true,
    settings: { caps: { position: 3 }, grid: { wideMinTf: 15 }, live: { account: "selected" } },
  });
  const args = ["--ranges", "micro", "--gate", "--min-n", "2", "--gate-n", "3", "--on-pf", "2", "--off-pf", "0.5"];
  let r = f.run({ paper: { Micro: { n: 3, gp: 2, gl: 1 } } }, ...args);
  assert.equal(r.patch.on.micro, true);
  assert.equal(r.patch.paused, false);
  assert.equal(r.patch.operatorNote, "keep");
  assert.deepEqual(r.patch.settings.caps, { position: 3 });
  assert.equal(r.patch.settings.grid.wideMinTf, 15);
  assert.equal(r.patch.settings.live.account, "selected");
  assert.deepEqual(r.patch.coordinatorEvidence, evidence);
  r = f.run({ paper: { Micro: { n: 3, gp: 0.49, gl: 1 } } }, ...args);
  assert.equal(r.patch.on.micro, false);
  assert.equal(r.patch.paused, true);
  assert.equal(r.patch.settings.grid.micro, false);
  assert.match(r.patch.settings.live.openPaused, /forward-paper/);
});
