#!/usr/bin/env node
// The repository test suite uses local servers and fixture fetches only. Keep every stage and child process offline.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
if (argv.length && (argv.length !== 1 || argv[0] !== "--without-core"))
  throw new Error("Supported test option: --without-core (CI runs the complete core inventory separately)");
const withoutCore = argv[0] === "--without-core";
const guard = resolve(root, "scripts/lib/core-test-offline-guard.cjs");
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^(BINGX|BINANCE|BYBIT|OKX)/i.test(key) || /^(?:https?|all|no)_proxy$/i.test(key))
    delete env[key];
}
delete env.NODE_USE_ENV_PROXY;
// Do not inherit arbitrary preloads into a verification process. The offline guard itself is the only preload.
env.NODE_OPTIONS = `--require ${JSON.stringify(guard)}`;
env.CTS_CORE_LIVE = "0";
env.MALLOC_ARENA_MAX ??= "2";

async function run(label, args) {
  console.log(`[npm test] ${label} (offline fixtures only)`);
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit" });
  const handlers = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [signal, () => child.kill(signal)]),
  );
  for (const [signal, handler] of handlers) process.on(signal, handler);
  try {
    return await new Promise((resolveExit, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolveExit(code ?? (signal === "SIGINT" ? 130 : 143)));
    });
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}

const stages = [
  // CLI fixtures spawn their own compiler/server children. Host CPU count alone grossly oversubscribes memory.
  ["scripts", ["--test", "--test-concurrency=2", "scripts/**/*.test.mjs"]],
  [
    "app and component tests",
    [
      "--experimental-strip-types",
      "--test",
      "--test-concurrency=2",
      "src/lib/app-data/app-data.test.ts",
      "src/lib/app-data/readiness-schedule.test.ts",
      "src/lib/auth/gate-identity.test.ts",
      "src/lib/auth/sign-in-gate.test.ts",
      "src/components/v2/accounting.test.ts",
      "src/components/v2/signal-units.test.ts",
      "src/components/v2/indication-ui.test.ts",
      "src/components/v2/base-counts.test.ts",
      "src/components/v2/progression.test.ts",
    ],
  ],
  ...(!withoutCore ? [["core tests", ["scripts/test-core.mjs"]]] : []),
];

for (const [label, args] of stages) {
  const code = await run(label, args);
  if (code !== 0) {
    process.exitCode = code;
    break;
  }
}
