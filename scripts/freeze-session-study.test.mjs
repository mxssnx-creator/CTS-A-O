import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildReplayStudyProfile } from "./replay-study-profiles.mjs";
import { readSessionStudy } from "./lib/session-study.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const H = 3_600_000;
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), "cts-freezer-timing-"));
  try {
    const seed = buildReplayStudyProfile("entry25");
    writeFileSync(join(dir, "seed.json"), JSON.stringify(seed));
    // Only hashed by the stopped-runtime freezer: this is not market data.
    writeFileSync(join(dir, "feed.json"), "{}\n");
    const run = (preH, runH) => {
      const evaluationFromT = Date.UTC(2026, 8, 1),
        out = join(dir, `frozen-${preH}-${runH}`);
      const child = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "--no-warnings",
          join(ROOT, "scripts/freeze-session-study.mjs"),
          "--root",
          ROOT,
          "--settings",
          join(dir, "seed.json"),
          "--feed",
          join(dir, "feed.json"),
          "--symbols",
          "AAA-USDT,BBB-USDT",
          "--pre",
          String(preH),
          "--run",
          String(runH),
          "--evaluation-from",
          new Date(evaluationFromT).toISOString(),
          "--end-at",
          new Date(evaluationFromT + (preH + runH) * H).toISOString(),
          "--id",
          "synthetic-timing-regression",
          "--out",
          out,
        ],
        {
          cwd: ROOT,
          encoding: "utf8",
          timeout: 30_000,
          env: {
            ...process.env,
            CTS_CORE_STATE: "off",
            CTS_CORE_AUTOSTART: "0",
            CTS_CORE_LIVE: "0",
            CTS_CORE_COMPARE: "0",
            CTS_CORE_WORKERS: "1",
          },
        },
      );
      return { child, out };
    };
    return fn({ seed, run });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("frozen session CLI timing", () => {
  it("normalizes an unchanged six-hour public seed to the explicitly requested window", () =>
    fixture(({ seed, run }) => {
      assert.deepEqual([seed.wf.preH, seed.wf.simH, seed.wf.longH], [6, 6, 6]);
      for (const [preH, runH] of [
        [6, 24],
        [8, 6],
      ]) {
        const { child, out } = run(preH, runH);
        assert.equal(
          child.status,
          0,
          [child.error?.message, child.stderr].filter(Boolean).join("\n"),
        );
        const { protocol } = readSessionStudy(join(out, "protocol.json"), ROOT);
        const desk = JSON.parse(readFileSync(join(out, "desk.json"), "utf8"));
        assert.deepEqual([protocol.window.preH, protocol.window.runH], [preH, runH]);
        assert.deepEqual(
          [protocol.actualWf.preH, protocol.actualWf.simH, protocol.actualWf.longH],
          [preH, runH, preH],
        );
        assert.equal(protocol.actualWf.causalBase, true);
        assert.equal(protocol.actualWf.lastN, 25);
        assert.deepEqual(desk.wf, protocol.actualWf);
        assert.equal(protocol.actualSettings.cost, 0.0015);
        assert.equal(protocol.actualSettings.live.enabled, false);
        assert.equal(protocol.actualSettings.live.maxPositionX, 0.75);
        assert.equal(protocol.actualSettings.live.maxExposureX, 7);
      }
    }));

  it("refuses a normalized window mismatch before writing any launchable output", () =>
    fixture(({ run }) => {
      const { child, out } = run(6, 241);
      assert.notEqual(child.status, 0);
      assert.match(child.stderr, /timing differs/);
      assert.equal(existsSync(join(out, "protocol.json")), false);
      assert.equal(existsSync(join(out, "desk.json")), false);
    }));
});
