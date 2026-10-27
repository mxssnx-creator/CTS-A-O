import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(root, "docs/relate-evidence-20261027/stability-diagnostic/post-fix");
const files = ["protocol.json", "receipt.json", "summary.json", "portable-manifest.json", "unlimited.json.gz"];
const read = (dir, name) => JSON.parse(readFileSync(join(dir, name)));
const write = (dir, name, data) => writeFileSync(join(dir, name), JSON.stringify(data));
function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), "cts-stability-audit-"));
  try {
    for (const name of files) copyFileSync(join(source, name), join(dir, name));
    return run(dir);
  } finally {
    for (const name of files) unlinkSync(join(dir, name));
    rmdirSync(dir);
  }
}
function audit(dir) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings",
    "scripts/audit-stability-study.mjs", dir], { cwd: root, encoding: "utf8" });
}

test("a changed summary or incomplete run cannot become successful evidence", () => fixture((dir) => {
  const summary = read(dir, "summary.json");
  summary.results[0].settled.pf += 1;
  write(dir, "summary.json", summary);
  let result = audit(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /settled pf/);
  copyFileSync(join(source, "summary.json"), join(dir, "summary.json"));
  const receipt = read(dir, "receipt.json");
  receipt.status = "incomplete";
  write(dir, "receipt.json", receipt);
  result = audit(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /incomplete study/);
}));

test("missing memory provenance remains unverified even if the altered file is rehashed", () => fixture((dir) => {
  const path = join(dir, "unlimited.json.gz"), raw = JSON.parse(gunzipSync(readFileSync(path)));
  delete raw.engine.mem.fallback;
  const bytes = gzipSync(Buffer.from(JSON.stringify(raw)));
  writeFileSync(path, bytes);
  const manifest = read(dir, "portable-manifest.json");
  manifest[0].bytes = bytes.length;
  manifest[0].sha256 = createHash("sha256").update(bytes).digest("hex");
  write(dir, "portable-manifest.json", manifest);
  const result = audit(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /memory coverage/);
}));
