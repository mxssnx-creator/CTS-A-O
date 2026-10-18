#!/usr/bin/env node
// Core fixtures never need exchange connectivity. Install the portable guard before every test import.
import { spawn } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function coreTestFiles(root = ROOT) {
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".test.ts")) files.push(relative(root, path));
    }
  };
  visit(join(root, "src/core"));
  return files.sort();
}

export function coreTestInvocation(argv = [], sourceEnv = process.env, root = ROOT) {
  const files = [];
  const filters = [];
  let slow = false;
  for (const arg of argv) {
    if (arg === "--slow") slow = true;
    else if (arg.startsWith("--test-name-pattern=")) filters.push(arg);
    else if (arg.startsWith("-")) throw new Error(`Unsupported core-test option: ${arg}`);
    else files.push(arg);
  }
  if (slow && files.length) throw new Error("Use --slow without explicit test files");
  const concurrency = Number(sourceEnv.CTS_CORE_TEST_CONCURRENCY ?? 1);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)
    throw new Error("CTS_CORE_TEST_CONCURRENCY must be an integer from 1 to 8");
  const selected = files.length
    ? files
    : slow
      ? ["src/core/server/runtime.test.ts"]
      : coreTestFiles(root);
  if (!selected.length) throw new Error("No core test files found");
  const guard = resolve(root, "scripts/lib/core-test-offline-guard.cjs");
  const env = { ...sourceEnv };
  // A nested Node test process must create its own runner/reporting channel.
  delete env.NODE_TEST_CONTEXT;
  for (const key of Object.keys(env)) if (/^(BINGX|BINANCE|BYBIT|OKX)/i.test(key)) delete env[key];
  Object.assign(env, {
    MALLOC_ARENA_MAX: "2",
    MALLOC_MMAP_THRESHOLD_: "1048576",
    CTS_CORE_WORKERS: "1",
    CTS_CORE_COMPARE: "0",
    CTS_CORE_LIVE: "0",
    CTS_CORE_SLOW: slow ? "1" : "0",
    NODE_OPTIONS: `--require ${JSON.stringify(guard)}${sourceEnv.NODE_OPTIONS ? ` ${sourceEnv.NODE_OPTIONS}` : ""}`,
  });
  return {
    command: process.execPath,
    cwd: root,
    env,
    files: selected,
    concurrency,
    args: [
      "--require",
      guard,
      "--expose-gc",
      "--max-old-space-size=4096",
      "--heap-growing-percent=50",
      "--experimental-strip-types",
      "--no-warnings",
      ...(sourceEnv.CTS_CORE_TRACE_GC === "1" ? ["--trace-gc"] : []),
      "--test",
      `--test-concurrency=${concurrency}`,
      ...(slow ? ["--test-name-pattern=stress: a storm|backtests a preset over"] : []),
      ...filters,
      ...selected,
    ],
  };
}

async function main() {
  const invocation = coreTestInvocation(process.argv.slice(2));
  try {
    writeFileSync("/proc/self/oom_score_adj", "1000");
  } catch {
    /* best effort outside Linux/procfs */
  }
  console.log(
    `[core-tests] offline Node transport guard; ${invocation.files.length} files; concurrency ${invocation.concurrency}`,
  );
  const child = spawn(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    env: invocation.env,
    stdio: "inherit",
  });
  const handlers = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [signal, () => child.kill(signal)]),
  );
  for (const [signal, handler] of handlers) process.on(signal, handler);
  try {
    process.exitCode = await new Promise((resolveExit, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolveExit(code ?? (signal === "SIGINT" ? 130 : 143)));
    });
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
