import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

test("actual study preparation preserves provider metadata, labels unknown input and retains context hold/range options", () => {
  const root = resolve(import.meta.dirname, ".."),
    dir = mkdtempSync(join(tmpdir(), "cts-study-provider-"));
  try {
    const fixture = JSON.parse(
      gunzipSync(
        readFileSync(join(root, "docs/micro-24-sim-2026-10-21/reproduction-feed.json.gz")),
      ),
    );
    const focus = join(dir, "focus.json");
    writeFileSync(focus, JSON.stringify(["micro-5-break-close-fast"]));
    for (const [i, source, expected] of [
      [0, { provider: "BingX public swap klines" }, "BingX public swap klines"],
      [
        1,
        { source: "Binance USD-M public historical daily klines" },
        "Binance USD-M public historical daily klines",
      ],
      [2, {}, "Unspecified cached input provider (unverified)"],
    ]) {
      const feed = join(dir, `feed-${i}.json`),
        out = join(dir, `arm-${i}`),
        bytes = JSON.stringify({ ...fixture, source });
      writeFileSync(feed, bytes);
      const run = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "--no-warnings",
          ".github/audits/micro-24-trade-sim.mjs",
          "prepare",
          "--feed",
          feed,
          "--out",
          out,
          "--focus-file",
          focus,
          "--micro-hold",
          "15",
          "--long-range",
          "true",
        ],
        { cwd: root, encoding: "utf8", timeout: 30000 },
      );
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const p = JSON.parse(readFileSync(join(out, "protocol.json")));
      assert.ok(p.id);
      assert.equal(p.feed.provider, expected);
      assert.match(p.feed.providerVerification, /metadata label/i);
      assert.equal(p.feed.parentSha256, createHash("sha256").update(bytes).digest("hex"));
      assert.equal(p.actualSettings.grid.micro.maxHoldMin, 15);
      assert.equal(p.scope.hold, "micro-15m");
      assert.equal(p.scope.includeLong, true);
      assert.ok(p.actualSettings.grid.long);
      assert.equal(p.symbols.length, 24);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
