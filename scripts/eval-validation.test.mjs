import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { writeSessionDump } from "./lib/session-dump.mjs";

const script = new URL("./eval-validation.mjs", import.meta.url).pathname;
const execute = (dir) => spawnSync(process.execPath, [script, dir], { encoding: "utf8", timeout: 10_000 });
function sample() {
  const micro = "follow|ema@m1|mc", short = "follow|rsi@m1|sh";
  return {
    validation: [
      { t: 1, real: [micro], checks: [[micro, 1, 30, 1.5, 0.03, 0.02], [short, 0, 30, 0.9, 0.009, 0.01]] },
      { t: 2, real: [micro], checks: [[micro, 1, 30, 2, 0.04, 0.02]] },
    ],
    trades: [{ cfg: micro, r: 0.02 }, { cfg: short, r: -0.01 }],
    tapeTrades: [{ id: micro, trades: [["TEST-USDT", 1, 0, 1, 0.02]] }],
    engine: { baseByRange: [] },
  };
}
test("validation CLI retains identical hourly checks and executed cohorts for legacy and chunked dumps", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cts-validation-readers-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const legacy = join(dir, "legacy"), chunked = join(dir, "chunked");
  mkdirSync(legacy); mkdirSync(chunked);
  writeFileSync(join(legacy, "val-2026-10-14.json"), JSON.stringify(sample()));
  await writeSessionDump(join(chunked, "val-2026-10-14.json"), sample(), { maxChunkBytes: 256, arrayFields: ["trades"] });
  const a = execute(legacy), b = execute(chunked);
  assert.equal(a.status, 0, a.stderr);
  assert.equal(b.status, 0, b.stderr);
  assert.equal(b.stdout, a.stdout);
  assert.match(b.stdout, /1 windows, 2 hourly steps/);
  assert.match(b.stdout, /Micro\s+1\.0\s+1\.0\s+100%\s+1\.75\s+1\.75\s+0\.5/);
  assert.match(b.stdout, /Short\s+0\.5\s+0\.0/);
});
test("validation CLI rejects corrupt validation chunks instead of reporting zero steps", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cts-validation-corrupt-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "val-2026-10-14.json");
  await writeSessionDump(file, sample(), { maxChunkBytes: 256, arrayFields: ["trades"] });
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const chunk = join(dir, raw.validationSidecar.chunks[0].path);
  writeFileSync(chunk, readFileSync(chunk, "utf8") + "\n");
  const result = execute(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /sidecar|chunk|byte|sha/i);
});
