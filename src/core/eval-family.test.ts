// The evaluation family rule: an engine family is one bot and one range; a signal family is one source and one range.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evalFamilyMatch, parseEvalFamily } from "./eval-family.ts";

describe("evaluation families", () => {
  it("parses the families the statistics name, and refuses anything else", () => {
    assert.deepEqual(parseEvalFamily("eng follow mn"), { label: "eng follow mn", kind: "eng", bot: "follow", tag: "mn" });
    assert.deepEqual(parseEvalFamily("eng revert wide"), { label: "eng revert wide", kind: "eng", bot: "revert", tag: "" });
    assert.equal(parseEvalFamily("sig follow sar medium")?.kind, "sig");
    assert.equal(parseEvalFamily(undefined), null);
    assert.equal(parseEvalFamily("  "), null);
    assert.throws(() => parseEvalFamily("follow mn"), /is not a family/);
    assert.throws(() => parseEvalFamily("eng follow"), /is not a family/);
  });

  it("an engine family admits its bot's pairs that passed its range, and nothing else", () => {
    const fam = parseEvalFamily("eng follow mn")!;
    assert.equal(evalFamilyMatch(fam, "follow", "break-atr-2", ["mn", "gn"]), true);
    assert.equal(evalFamilyMatch(fam, "follow", "break-atr-2", ["gn"]), false, "the range must have passed");
    assert.equal(evalFamilyMatch(fam, "revert", "break-atr-2", ["mn"]), false, "another bot");
    assert.equal(evalFamilyMatch(fam, "follow", "sig-sar-m", ["mn"]), false, "a signal pair is never an engine pair");
    const wide = parseEvalFamily("eng revert wide")!;
    assert.equal(evalFamilyMatch(wide, "revert", "ema-9-21", [""]), true, "wide is the untagged grid");
    assert.equal(evalFamilyMatch(wide, "revert", "ema-9-21", ["mn"]), false);
  });

  it("a signal family admits the pairs of its source and range only", () => {
    const fam = parseEvalFamily("sig follow sar medium")!;
    assert.equal(evalFamilyMatch(fam, "follow", "sig-sar-m", []), true);
    assert.equal(evalFamilyMatch(fam, "follow", "sig-sar-s", []), false, "the short range is another family");
    assert.equal(evalFamilyMatch(fam, "follow", "sig-rsi-14-30-m", []), false, "another source");
    assert.equal(evalFamilyMatch(fam, "follow", "break-atr-2", ["mn"]), false, "an engine pair is never a signal pair");
  });
});

describe("several families at once", () => {
  it("parses a ';' list and keeps each label's own tags for a pair", async () => {
    const { parseEvalFamilies, familyTags } = await import("./eval-family.ts");
    const fams = parseEvalFamilies("eng follow mn; eng follow wide ; sig follow sar medium")!;
    assert.equal(fams.length, 3);
    assert.equal(parseEvalFamilies(""), null);
    // an engine pair keeps the tags its bot's families cover, and only those
    assert.deepEqual(familyTags(fams, "follow", "break-atr-2", ["mn", "gn", ""]), ["mn", ""]);
    assert.deepEqual(familyTags(fams, "revert", "break-atr-2", ["mn", ""]), [], "no family of that bot");
    // a signal pair has no engine tags
    assert.deepEqual(familyTags(fams, "follow", "sig-sar-m", ["mn"]), []);
  });

  it("a list with a signal family runs Base unnarrowed; the labels name the configs' families", async () => {
    const { parseEvalFamilies, familiesNarrowBase } = await import("./eval-family.ts");
    const { botFamilyOf } = await import("./bot-stats.ts");
    // the engine's candidates confirm signals: a signal family keeps every engine pair in Base
    assert.equal(familiesNarrowBase(parseEvalFamilies("sig follow ema-cross medium")!), false);
    assert.equal(familiesNarrowBase(parseEvalFamilies("eng follow mn; sig follow sar medium")!), false);
    assert.equal(familiesNarrowBase(parseEvalFamilies("eng follow mn; eng revert wide")!), true, "engine only: as before");
    // the labels are what the executor matches (WalkForwardOptions.family against botFamilyOf): a label typed with two
    // spaces names the same family
    const labels = parseEvalFamilies("sig follow  ema-cross medium; eng follow mn")!.map((f) => f.label);
    assert.deepEqual(labels, ["sig follow ema-cross medium", "eng follow mn"]);
    assert.equal(botFamilyOf("follow|sig-ema-cross-m@m15|tp1|sl1|tr0|h32"), labels[0]);
    assert.equal(botFamilyOf("follow|ema-21-55@m15|tp0.9|sl1.8|tr0|h16|mn"), labels[1]);
  });
});

describe("families that can trade", () => {
  it("an engine family needs a cell of its range in the run's grid; a signal family never reads it", async () => {
    const { evalFamilyHasCells } = await import("./eval-family.ts");
    const fam = (l: string) => parseEvalFamily(l)!;
    // a grid of one Minimal and one Short cell, none untagged: Wide and Micro build nothing
    const grid = [{ tag: "mn" }, { tag: "sh" }];
    assert.equal(evalFamilyHasCells(fam("eng follow mn"), grid), true);
    assert.equal(evalFamilyHasCells(fam("eng revert sh"), grid), true);
    assert.equal(evalFamilyHasCells(fam("eng follow mc"), grid), false);
    assert.equal(evalFamilyHasCells(fam("eng follow wide"), grid), false);
    // an untagged cell is Wide's
    assert.equal(evalFamilyHasCells(fam("eng revert wide"), [...grid, {}]), true);
    assert.equal(evalFamilyHasCells(fam("sig follow sar medium"), []), true);
  });

  it("the protect grid: Wide only with grid.tp, Micro only with grid.micro, Minimal plus only on with cells", async () => {
    const { evalFamilyHasCells } = await import("./eval-family.ts");
    const { protectGrid } = await import("./sim/walkforward.ts");
    const { MICRO_RANGE, MINIMAL_PLUS_RANGE } = await import("./minimal-coord.ts");
    const { DEFAULT_SETTINGS } = await import("./config.ts");
    const fam = (l: string) => parseEvalFamily(l)!;
    const plus = { ...MINIMAL_PLUS_RANGE, enabled: false };
    const g = { ...DEFAULT_SETTINGS.grid, tp: [], micro: undefined, minimalPlus: plus };
    const off = protectGrid(60, g, 0.002);
    for (const l of ["eng follow wide", "eng follow mc", "eng follow mp"]) assert.equal(evalFamilyHasCells(fam(l), off), false, l);
    for (const l of ["eng follow mn", "eng follow sh", "eng follow gn", "eng follow lg"])
      assert.equal(evalFamilyHasCells(fam(l), off), true, l);
    const cells = [{ tp: 0.012, sl: 0.012, trail: 0 }];
    const on = protectGrid(60, { ...g, tp: [0.03], micro: MICRO_RANGE, minimalPlus: { ...plus, enabled: true, cells } }, 0.002);
    for (const l of ["eng follow wide", "eng follow mc", "eng follow mp"]) assert.equal(evalFamilyHasCells(fam(l), on), true, l);
  });
});
