#!/usr/bin/env node
// Partition the complete ordinary core inventory onto isolated runners, without omitting a file.
import assert from "node:assert/strict";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? walk(`${dir}/${x.name}`) : [`${dir}/${x.name}`],
  );
const files = walk("src/core")
  .filter((x) => x.endsWith(".test.ts"))
  .sort();
const heavy = new Set([
  "src/core/book-coverage.test.ts",
  "src/core/signals-e2e.test.ts",
  "src/core/server/trading-e2e.test.ts",
  "src/core/processing.test.ts",
  "src/core/sim/block-matrix.test.ts",
  "src/core/server/base-count.test.ts",
  "src/core/server/cycle-incremental.test.ts",
]);
for (const f of heavy) assert.ok(files.includes(f), `Heavy file disappeared: ${f}`);
const regular = files.filter((f) => !heavy.has(f) && f !== "src/core/server/runtime.test.ts");
const groups = {
  ...Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`functional-${i}`, regular.filter((_, j) => j % 4 === i)])),
  "functional-heavy": files.filter((f) => heavy.has(f)),
  "functional-runtime": files.filter((f) => f === "src/core/server/runtime.test.ts"),
};
const all = Object.values(groups).flat();
assert.deepEqual([...all].sort(), files, "Ordinary core inventory omitted or duplicated");
assert.equal(new Set(all).size, files.length);
const part = process.argv[2];
const selected = part === "functional" ? regular : groups[part];
assert.ok(selected?.length, "Unknown/empty test partition");
const out = `runs/micro-ci-${part}`;
mkdirSync(out, { recursive: true });
writeFileSync(
  `${out}/inventory.json`,
  JSON.stringify({ total: files.length, partition: part, groups }, null, 2) + "\n",
);
console.log(`Complete ordinary core inventory: ${files.length}; ${part}: ${selected.length}`);
const r = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--no-warnings",
    "scripts/test-all.mjs",
    "--files",
    selected.join(","),
    "--no-coverage",
    "--min-free",
    "4500",
    "--out",
    out,
    "--logs",
    `${out}/logs`,
  ],
  { env: process.env, stdio: "inherit" },
);
if (r.status !== 0) throw Error(`${part}: ${r.error ?? r.signal ?? r.status}`);
