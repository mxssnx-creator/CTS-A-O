#!/usr/bin/env node
// Verify a CI-collected public source locally and write only compact provenance evidence.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyVerifiedPublicFeed } from "./lib/verified-public-feed.mjs";

export function publicReplayFeedOptions(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i], value = args[++i];
    if (!["--dir", "--out"].includes(flag) || !value || value.startsWith("--") || out[flag.slice(2)] !== undefined)
      throw new Error("Supply --dir DIR --out FILE exactly once");
    out[flag.slice(2)] = value;
  }
  if (!out.dir || !out.out) throw new Error("Supply --dir DIR --out FILE");
  return out;
}

export async function verifyPublicReplayFeedDirectory(dir) {
  dir = resolve(dir);
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  const file = join(dir, "feed.json"), info = await stat(file), hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return verifyVerifiedPublicFeed({ manifest, feedSha256: hash.digest("hex"), feedBytes: info.size,
    readArchive: async (name) => {
      const file = join(dir, "archives", name);
      const [archiveBytes, checksumBytes] = await Promise.all([readFile(file), readFile(`${file}.CHECKSUM`)]);
      return { archiveBytes, checksumBytes };
    } });
}

async function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log("node scripts/verify-public-replay-feed.mjs --dir DIR --out FILE\nVerifies the complete official Sep24-Oct17 public archive source and writes compact evidence; never collects network data.");
    return;
  }
  const options = publicReplayFeedOptions(args), target = resolve(options.out);
  const evidence = await verifyPublicReplayFeedDirectory(options.dir);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(evidence));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
