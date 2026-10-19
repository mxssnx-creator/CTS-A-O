import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { evidenceHash, publishReplayEvidence, readReplayEvidence } from "./replay-evidence.mjs";

test("immutable latest replay refuses superseded, changed and source-stale evidence", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "cts-evidence-"));
  try {
    const out = resolve(dir, "runs");
    await mkdir(out);
    await writeFile(resolve(dir, "source.ts"), "current source");
    await writeFile(resolve(out, "report.json"), JSON.stringify({ schema: "obsolete-v2", pf: 1.39 }));
    const report = { schema: "current-v5", market: { cacheSha256: "frozen" }, sourceFingerprint: { files: [["source.ts", evidenceHash("current source")]] } };
    const opts = { now: new Date("2026-10-17T20:00:00Z") };
    const saved = await publishReplayEvidence(out, report, opts);
    assert.deepEqual((await readReplayEvidence(out, dir)).report, report);
    await assert.rejects(publishReplayEvidence(out, report, opts), /EEXIST/);
    await writeFile(resolve(dir, "source.ts"), "new source");
    await assert.rejects(readReplayEvidence(out, dir), /Replay source changed/);
    const path = resolve(saved.dir, "report.json");
    await writeFile(path, (await readFile(path, "utf8")).replace("current-v5", "altered-v5"));
    await assert.rejects(readReplayEvidence(out), /bytes changed/);
    const pointer = JSON.parse(await readFile(resolve(out, "latest.json"), "utf8"));
    pointer.report = "../source.ts";
    await writeFile(resolve(out, "latest.json"), JSON.stringify(pointer));
    await assert.rejects(readReplayEvidence(out), /Invalid replay evidence pointer/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
