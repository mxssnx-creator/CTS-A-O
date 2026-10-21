// Exercise the actual launcher against the cached loss window, with later candles still in the input archive.
import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
test("older post-Base replay windows cannot report settlements from later input candles", { timeout: 120000 }, () => {
  const out = mkdtempSync(join(tmpdir(), "cts-postbase-window-")), endT = 1791925200000;
  try {
    execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings",
      "scripts/audit-postbase-continuity.mjs", "--feed", "docs/sims/independent-exit-12sym-20261018-feed.json.gz",
      "--scope", "bounded", "--end", String(endT), "--out", out,
    ], { cwd: new URL("../", import.meta.url), encoding: "utf8", maxBuffer: 4e6,
      env: { ...process.env, MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" } });
    const result = JSON.parse(readFileSync(join(out, "result.json")));
    const trades = JSON.parse(gunzipSync(readFileSync(join(out, "executions.json.gz"))));
    assert.ok(result.baseQualified > 0 && result.tapes > 0);
    assert.ok(trades.length > 0, "the cached fixture exercises actual settled post-Base orders");
    assert.ok(trades.every((x) => x.exitT <= endT));
    assert.ok(result.hourly.every((x) => x.t >= result.startT && x.t < endT));
    assert.equal(result.hourlyAudit.hourly.length, 6);
    assert.equal(result.hourlyAudit.summary.n, trades.length);
    assert.equal(result.allEntriesCurrentlyQualified, true);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
