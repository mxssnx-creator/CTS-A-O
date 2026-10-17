import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const evidenceHash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Publish one immutable evidence snapshot, then atomically point at its verified bytes. */
export async function publishReplayEvidence(root, report, { now = new Date() } = {}) {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const version = report.schema.replace(/[^a-zA-Z0-9_-]/g, "_");
  const name = `${version}-${stamp}`;
  const dir = resolve(root, name);
  await mkdir(root, { recursive: true });
  await mkdir(dir); // Refuse replacement of an earlier snapshot, including a same-timestamp retry.
  const bytes = JSON.stringify(report, null, 2) + "\n";
  await writeFile(resolve(dir, "report.json"), bytes, { flag: "wx" });
  const pointer = {
    schema: "cts-replay-evidence-pointer-v1",
    report: `${name}/report.json`,
    sha256: evidenceHash(bytes),
    reportSchema: report.schema,
    cacheSha256: report.market.cacheSha256,
    sourceFingerprint: report.sourceFingerprint,
  };
  const tmp = resolve(root, `latest-${process.pid}.tmp`);
  await writeFile(tmp, JSON.stringify(pointer, null, 2) + "\n");
  await rename(tmp, resolve(root, "latest.json"));
  return { dir, pointer };
}

/** A stale legacy report.json must never silently replace the latest exact-source evidence. */
export async function readReplayEvidence(root, sourceRoot) {
  const pointer = JSON.parse(await readFile(resolve(root, "latest.json"), "utf8"));
  const path = resolve(root, pointer.report);
  const rel = relative(resolve(root), path);
  if (pointer.schema !== "cts-replay-evidence-pointer-v1" || isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`))
    throw new Error("Invalid replay evidence pointer");
  const bytes = await readFile(path);
  if (evidenceHash(bytes) !== pointer.sha256) throw new Error("Replay report bytes changed");
  const report = JSON.parse(bytes);
  if (report.schema !== pointer.reportSchema || report.market.cacheSha256 !== pointer.cacheSha256 ||
      JSON.stringify(report.sourceFingerprint) !== JSON.stringify(pointer.sourceFingerprint))
    throw new Error("Replay evidence metadata differs");
  if (sourceRoot) {
    for (const [file, hash] of report.sourceFingerprint.files) {
      if (evidenceHash(await readFile(resolve(sourceRoot, file))) !== hash)
        throw new Error(`Replay source changed: ${file}`);
    }
  }
  return { report, pointer, path };
}
