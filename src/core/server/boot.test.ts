// Unattended host setup: CTS_CORE_SYMBOLS / CTS_CORE_LIVE_CONN / CTS_CORE_LIVE_AUTO are applied once per set of
// values, never re-applied over a later UI change, invalid values ignored.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { applyHostSettings } from "./boot.server.ts";

// a settings change schedules a compute: never let one run here (stopped right after construction)
const mk = () => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic" });
  rt.stop();
  return rt;
};

describe("host settings from the environment", () => {
  it("applies symbols, live connection and live on once; a later UI change is kept", () => {
    const rt = mk();
    const env = {
      CTS_CORE_SYMBOLS: "30",
      CTS_CORE_LIVE_CONN: "bingx-x01",
      CTS_CORE_LIVE_AUTO: "1",
    };
    assert.match(applyHostSettings(rt, env), /symbols 30.*bingx-x01.*live on/);
    assert.equal(rt.settings.symbols, 30);
    assert.equal(rt.settings.live.connId, "bingx-x01");
    assert.equal(rt.settings.live.enabled, true);
    // the operator switches Live off in the UI: a restart with the same env keeps it off
    rt.updateSettings({ live: { ...rt.settings.live, enabled: false } });
    assert.equal(applyHostSettings(rt, env), "");
    assert.equal(rt.settings.live.enabled, false);
    // changed env values apply again
    assert.match(applyHostSettings(rt, { ...env, CTS_CORE_SYMBOLS: "20" }), /symbols 20/);
    assert.equal(rt.settings.symbols, 20);
    assert.equal(rt.settings.live.enabled, true);
    rt.stop();
  });

  it("ignores invalid values and does nothing without the variables", () => {
    const rt = mk();
    const before = rt.settings.symbols;
    assert.equal(applyHostSettings(rt, {}), "");
    applyHostSettings(rt, { CTS_CORE_SYMBOLS: "999", CTS_CORE_LIVE_CONN: "binance" });
    assert.equal(rt.settings.symbols, before);
    assert.notEqual(rt.settings.live.connId, "binance");
    assert.equal(rt.settings.live.enabled, false);
    rt.stop();
  });
});
