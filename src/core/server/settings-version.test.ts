// Saved settings and their version marker: a versioned partial blob keeps its values; a blob without wfCapsV is a
// legacy one and the legacy migrations run on it ("Signals on by default" among them) — found on 23 Nov, when a
// hand-written desk file with signals.enabled false came back with Signals on.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime as BaseRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { trackRuntimes } from "../test-support.ts";

const tracked = trackRuntimes();
class CoreRuntime extends BaseRuntime {
  constructor(...a: ConstructorParameters<typeof BaseRuntime>) {
    super(...a);
    tracked.track(this);
  }
}
afterEach(() => tracked.disposeAll());

const build = (version: number | null) => {
  const db = new CoreDb(":memory:");
  if (version !== null) db.kvSet("wfCapsV", version);
  db.kvSet("settings", { symbols: 7, signals: { enabled: false }, exitStrategy: { enabled: false } });
  return new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
};

describe("saved settings version", () => {
  it("a partial blob with the current wfCapsV keeps signals.enabled false", () => {
    const s = build(35).settings;
    assert.equal(s.signals.enabled, false);
    assert.equal(s.symbols, 7);
  });

  it("a blob without wfCapsV runs the legacy migrations: Signals come back on, the other values stay", () => {
    const s = build(null).settings;
    assert.equal(s.signals.enabled, true);
    assert.equal(s.symbols, 7);
    assert.equal(s.exitStrategy.enabled, false);
  });
});
