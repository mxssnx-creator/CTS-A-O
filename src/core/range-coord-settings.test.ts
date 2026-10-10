// A range's own coordination (RangeGrid.coord) is checked where settings are checked: every lever bounded, the bot and
// indication-family lists named and non-empty, and an unknown lever refused (a setting that does nothing is refused).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type CoreSettings, DEFAULT_SETTINGS } from "./config.ts";
import { checkSettings } from "./settings-check.ts";

const withCoord = (name: "micro" | "minimal" | "short" | "general" | "long", coord: unknown) =>
  ({
    ...DEFAULT_SETTINGS,
    grid: { ...DEFAULT_SETTINGS.grid, [name]: { ...(DEFAULT_SETTINGS.grid as unknown as Record<string, object>)[name], coord } },
  }) as unknown as CoreSettings;

describe("a range's coordination is checked", () => {
  it("accepts every lever and both allow-lists, on every range", () => {
    const coord = { validLastN: 10, lastN: 25, symGate: "off", engineSide: false, bots: ["follow"], indFamilies: ["trend", "reversion"] };
    for (const name of ["micro", "minimal", "short", "general", "long"] as const)
      assert.doesNotThrow(() => checkSettings(withCoord(name, coord)), name);
  });

  it("refuses a bot that does not exist, a family that does not, and an empty or repeated list", () => {
    for (const bad of [
      { bots: ["nope"] },
      { bots: [] },
      { bots: ["follow", "follow"] },
      { indFamilies: ["volume"] },
      { indFamilies: [] },
      { indFamilies: ["trend", "trend"] },
    ])
      assert.throws(() => checkSettings(withCoord("general", bad)), /coord/, JSON.stringify(bad));
  });

  it("refuses a lever it does not know, and out-of-range bounds", () => {
    assert.throws(() => checkSettings(withCoord("general", { validLast: 10 })), /unknown lever validLast/);
    assert.throws(() => checkSettings(withCoord("general", { validLastN: 500 })), /validLastN/);
    assert.throws(() => checkSettings(withCoord("general", "validLastN")), /coord/);
  });
});
