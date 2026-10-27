// Control completeness: every paper symbol × side is listed with its lanes at each filter, and a key without an exchange
// target says why (the filter that held its lanes back, the budget fill, or the target planner's own reason).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keyFunnel, type KeyFunnel } from "./live.server.ts";

const f = (key: string, x: Partial<KeyFunnel>): [string, KeyFunnel] => [
  key,
  {
    key,
    paper: 0,
    suppressed: 0,
    chased: 0,
    notSent: 0,
    notSelected: 0,
    sent: 0,
    budget: 0,
    target: false,
    ...x,
  },
];

describe("control completeness (keyFunnel)", () => {
  it("names the reason every key without a target lacks one; targets first by paper lanes", () => {
    const funnel = new Map([
      f("A|1", { paper: 5, sent: 5 }),
      f("B|1", { paper: 4, notSent: 4 }),
      f("C|-1", { paper: 3, chased: 2, notSent: 1 }),
      f("D|1", { paper: 2, notSelected: 2 }),
      f("E|1", { paper: 6, sent: 6, budget: 6 }),
      f("F|-1", { paper: 1, sent: 1 }),
      f("G|1", { paper: 1, sent: 1, why: "foreign position or order" }),
    ]);
    const keys = keyFunnel(
      funnel,
      [{ key: "A|1" }],
      [{ sym: "F", why: "max exchange positions (symbol × direction)" }],
    );
    const why = Object.fromEntries(keys.map((k) => [k.key, k.target ? "target" : k.why]));
    assert.deepEqual(why, {
      "A|1": "target",
      "B|1": "not sent (live kinds / ranges)",
      "C|-1": "chased (live.maxChase)",
      "D|1": "not selected / signal unit inactive",
      "E|1": "budget (live.top fill)",
      "F|-1": "max exchange positions (symbol × direction)",
      "G|1": "foreign position or order",
    });
    // keys without a target first, the most paper lanes first
    assert.equal(keys[0].key, "E|1");
    assert.equal(keys.at(-1)!.key, "A|1");
  });

  it("reports why the one admissible parent has no target before the sibling reservation", () => {
    const funnel = new Map([
      f("A|1", { paper: 1000, sent: 1, notSent: 999, why: "aggregate position reserved for another parent" }),
      f("B|1", { paper: 2, sent: 0, notSent: 2, why: "aggregate position has held or pending ownership of another or unknown parent" }),
      f("C|1", { paper: 2, sent: 1, notSent: 1, why: "aggregate position reserved for another parent" }),
      f("D|1", { paper: 2, sent: 1, notSent: 1, why: "aggregate position reserved for another parent" }),
      f("D|-1", { paper: 2, sent: 1, notSent: 1, why: "aggregate position reserved for another parent" }),
    ]);
    const rows = keyFunnel(funnel, [{ key: "C|1" }], [
      { sym: "A", why: "max exchange positions (symbol × direction)" },
      { sym: "B", why: "max exchange positions (symbol × direction)" },
      { sym: "D", why: "max exchange positions (symbol × direction)" },
    ]);
    const byKey = Object.fromEntries(rows.map((x) => [x.key, x]));
    assert.equal(byKey["A|1"].why, "max exchange positions (symbol × direction)");
    assert.equal(byKey["A|1"].notSent, 999, "the sibling reservation count is retained");
    assert.match(byKey["B|1"].why ?? "", /held or pending ownership/, "an actually blocked held side stays explicit");
    assert.equal(byKey["C|1"].target, true, "a surviving parent can still produce a target");
    assert.match(byKey["C|1"].why ?? "", /reserved for another parent/, "a targeted key still reports blocked siblings");
    for (const side of [1, -1]) assert.match(byKey[`D|${side}`].why ?? "", /reserved for another parent/,
      "a symbol-only planner reason cannot identify which hedge side was blocked");
  });

  it("lanes held back by the signal proof are named when they are most of the lanes not sent", () => {
    const funnel = new Map([
      f("P|1", { paper: 3, notSent: 3, unproven: 3 }),
      f("Q|-1", { paper: 4, notSent: 4, unproven: 2 }),
      f("R|1", { paper: 3, notSent: 3, unproven: 1 }),
      f("S|1", { paper: 3, notSelected: 2, notSent: 1, unproven: 1 }),
    ]);
    const why = Object.fromEntries(keyFunnel(funnel, [], []).map((k) => [k.key, k.why]));
    assert.deepEqual(why, {
      "P|1": "not proven (live.signalProofN)",
      "Q|-1": "not proven (live.signalProofN)",
      "R|1": "not sent (live kinds / ranges)",
      "S|1": "not selected / signal unit inactive",
    });
  });

  it("positionSize min: a key whose sent lanes Block raised says Block does nothing on the exchange", () => {
    const funnel = new Map([f("A|1", { paper: 3, sent: 3, raised: 2 }), f("B|1", { paper: 1, sent: 1 })]);
    const min = keyFunnel(funnel, [{ key: "A|1" }, { key: "B|1" }], [], { sizeMin: true });
    assert.match(min.find((k) => k.key === "A|1")!.blockNote ?? "", /Block raised 2 position\(s\); live\.positionSize "min"/);
    assert.equal(min.find((k) => k.key === "B|1")!.blockNote, undefined, "nothing raised: no note");
    assert.equal(keyFunnel(funnel, [{ key: "A|1" }], []).find((k) => k.key === "A|1")!.blockNote, undefined, "lane sizing: none");
  });
});
