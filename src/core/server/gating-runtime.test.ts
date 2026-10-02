// Mainnet floors and preset resets: a preset starts from the default validation (a relaxed earlier preset does not
// carry over), and on x01 the live last-N, the seat validation and the readiness requirement never go below their
// floors, whatever a preset or a settings patch says.
import { it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, MAINNET_LAST_N, MAINNET_SIGNAL_VALID_LAST_N, MAINNET_VALID_LAST_N } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_SNAPSHOT = "";

it("a preset starts from the default validation and gates; mainnet keeps its floors", () => {
  const demo = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic", conn: "bingx-vst-02" });
  demo.stop();
  demo.applyPreset("desk-high-orders");
  assert.deepEqual([demo.wf.lastN, demo.wf.validLastN, demo.settings.gates.minPf], [0, 0, 1.05]);
  demo.applyPreset("desk-default");
  assert.deepEqual(
    [demo.wf.lastN, demo.wf.validLastN, demo.settings.gates.minPf],
    [25, 50, 1.1],
    "the relaxed preset does not carry over",
  );
  demo.shutdown("test");

  const main = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic", conn: "bingx-x01" });
  main.stop();
  main.applyPreset("desk-high-orders");
  assert.equal(main.wf.lastN, MAINNET_LAST_N);
  assert.equal(main.wf.validLastN, MAINNET_VALID_LAST_N);
  main.updateSettings(
    { live: { ...main.settings.live, requireReady: false } },
    { lastN: 0, validLastN: 0, signalValidLastN: 0 } as never,
  );
  assert.equal(main.settings.live.requireReady, true, "mainnet always waits for a ready simulated run");
  assert.equal(main.wf.lastN, MAINNET_LAST_N);
  assert.equal(main.wf.validLastN, MAINNET_VALID_LAST_N);
  assert.equal(main.wf.signalValidLastN, MAINNET_SIGNAL_VALID_LAST_N, "signals keep their real-money floor");
  main.shutdown("test");
});
