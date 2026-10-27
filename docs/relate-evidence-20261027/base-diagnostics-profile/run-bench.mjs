import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [before, after, output] = process.argv.slice(2);
if (!before || !after || !output) throw new Error("usage: run-bench.mjs BEFORE_ROOT AFTER_ROOT OUTPUT.json");
const here = dirname(fileURLToPath(import.meta.url));
const startedAt = new Date().toISOString(), results = [];
for (let repeat = 0; repeat < 3; repeat++) {
  for (const [mode, root] of [["before", before], ["after", after]]) {
    const env = { ...process.env, CTS_CORE_LIVE: "0", CTS_CORE_STALL_PROBE: "0",
      NODE_OPTIONS: `--require ${join(root, "scripts/lib/core-test-offline-guard.cjs")}` };
    const child = spawn("nice", ["-n", "19", process.execPath, "--experimental-strip-types", "--no-warnings",
      join(here, "bench.mjs"), root, mode], { env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "", reason = null, peak = 0;
    child.stdout.on("data", (x) => { out += x; });
    child.stderr.on("data", (x) => { err += x; });
    const timer = setInterval(() => {
      try {
        const bytes = Number(readFileSync("/sys/fs/cgroup/memory.current", "utf8").trim());
        if (!Number.isFinite(bytes)) throw new Error("invalid memory reading");
        peak = Math.max(peak, bytes);
        if (bytes > 5_750_000_000 && !reason) { reason = "demo memory headroom"; child.kill("SIGTERM"); }
      } catch { if (!reason) { reason = "memory monitoring unavailable"; child.kill("SIGTERM"); } }
    }, 250);
    const status = await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
    clearInterval(timer);
    const rows = out.trim().split("\n"), last = rows.at(-1);
    let measurements = null;
    if (status.code === 0 && !reason) measurements = JSON.parse(last);
    results.push({ repeat: repeat + 1, mode, ...status, reason, peakCgroupBytes: peak, measurements, stderr: err });
    if (!measurements) {
      writeFileSync(output, JSON.stringify({ startedAt, endedAt: new Date().toISOString(), status: "incomplete", results }, null, 2));
      process.exit(1);
    }
  }
}
const digests = new Set(results.map((x) => x.measurements.digest));
const status = digests.size === 1 ? "complete" : "mismatch";
writeFileSync(output, JSON.stringify({ startedAt, endedAt: new Date().toISOString(), status,
  beforeCommit: "38c9c7d87235db57a5d11376e639c28ea6f511a3",
  afterCommit: "02ad0ae", note: "Synthetic diagnostic microbenchmark; not an end-to-end or live-cycle measurement.", results }, null, 2));
if (status !== "complete") process.exitCode = 1;
