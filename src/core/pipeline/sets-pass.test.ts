// The Base pass the config sets see (setsPassTags): a Micro indication that passes at the default cell but fails its own
// Micro cell has no sets, so it must not count as a pass in the funnel either (13 Oct: mc-trsi2-10 was "passed" with no set).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { baseSetsGates, setsPassTags } from "./pipeline.ts";
import { baseRangeRules } from "../server/runtime.server.ts";

const ALL = ["mc", "mn", "mp", "sh", "gn", "lg"] as const;
const gates = baseSetsGates(DEFAULT_SETTINGS.gates);
const applies = baseRangeRules(DEFAULT_SETTINGS).applies;
const good = { n: 200, pf: 1.5, net: 5, mdd: 1 };
const bad = { n: 200, pf: 0.8, net: -1, mdd: 1 };

describe("setsPassTags: the Base pass the sets see", () => {
  it("a Micro indication passing at the default cell and failing its own Micro cell builds Minimal sets only (never Micro)", () => {
    // Minimal runs the Micro indications (grid.minimal.microInds): the default-cell pass is a Minimal pass, not a Micro one
    const r = { bot: "follow", ind: "mc-trsi2-10@m5", full: good, ranges: { mc: bad } } as never;
    assert.deepEqual(setsPassTags(r, gates, applies, ALL), ["mn"]);
  });

  it("a Micro indication whose only passing cell is its own Micro cell has the Micro sets", () => {
    const r = { bot: "follow", ind: "mc-trsi2-10@m5", full: bad, ranges: { mc: good } } as never;
    assert.ok(setsPassTags(r, gates, applies, ALL).includes("mc"));
  });

  it("an ordinary indication with the same stats keeps the default-cell pass (the wide cell)", () => {
    const r = { bot: "follow", ind: "ema-21-55@m15", full: good, ranges: { mc: bad } } as never;
    assert.ok(setsPassTags(r, gates, applies, ALL).includes(""));
  });

  it("a pair failing every cell has no sets at all", () => {
    const r = { bot: "follow", ind: "mc-trsi2-10@m5", full: bad, ranges: { mc: bad, mn: bad } } as never;
    assert.deepEqual(setsPassTags(r, gates, applies, ALL), []);
  });
});
