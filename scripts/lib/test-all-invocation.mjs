// Keep the all-file runner on the standard core runner's portable transport guard and clean child environment.
import { coreTestInvocation } from "../test-core.mjs";
import { resolve } from "node:path";

export function testAllInvocation(file, sourceEnv = process.env, root = process.cwd(), coverageDir = null) {
  const core = coreTestInvocation([file], { ...sourceEnv, CTS_CORE_TEST_CONCURRENCY: "1" }, root);
  const testFlag = core.args.indexOf("--test");
  if (testFlag < 0) throw new Error("The shared core runner did not provide the expected Node test invocation");
  // test-all keeps its historical explicit CTS_CORE_SLOW=1 opt-in. Ordinary runs never inherit a truthy other value.
  core.env.CTS_CORE_SLOW = sourceEnv.CTS_CORE_SLOW === "1" ? "1" : "0";
  if (coverageDir) core.env.NODE_V8_COVERAGE = coverageDir;
  return {
    command: core.command,
    cwd: core.cwd,
    env: core.env,
    args: [
      ...core.args.slice(0, testFlag),
      // The portable CommonJS guard is unconditional and precedes this legacy pinned-END/fetch/WS preload.
      // CTS_TEST_NETWORK only controls that legacy layer; it never disables the portable transport guard.
      "--import", resolve(root, "scripts/test-preload.mjs"),
      "--test-reporter=tap", file,
    ],
  };
}
