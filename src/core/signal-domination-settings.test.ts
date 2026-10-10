// The direction domination setting (8 Oct): "pooled" is the default (today's behaviour), an unknown value falls back to it in
// signalSettings(), and checkSettings rejects an unknown value with a message that names the setting.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { checkSettings } from "./settings-check.ts";

describe("signal direction domination setting", () => {
  it("defaults to pooled, the direction acceptance as before", () => {
    assert.equal(DEFAULT_SIGNALS.domination, "pooled");
    assert.equal(signalSettings({}).domination, "pooled");
  });

  it("keeps unit and off, and falls back to pooled for anything else", () => {
    assert.equal(signalSettings({ domination: "unit" }).domination, "unit");
    assert.equal(signalSettings({ domination: "off" }).domination, "off");
    assert.equal(signalSettings({ domination: "bogus" as never }).domination, "pooled");
    assert.equal(signalSettings({ domination: undefined as never }).domination, "pooled");
  });

  it("validation rejects an unknown mode and names the setting", () => {
    const bad = { ...DEFAULT_SIGNALS, domination: "bogus" as never };
    assert.throws(() => checkSettings({ signals: bad } as never), /signal direction domination/);
    assert.doesNotThrow(() => checkSettings({ signals: { ...DEFAULT_SIGNALS, domination: "unit" } } as never));
  });
});
