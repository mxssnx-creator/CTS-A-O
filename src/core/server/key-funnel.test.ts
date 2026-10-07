// Control completeness: every paper symbol × side is listed with its lanes at each filter, and a key without an exchange
// target says why (the filter that held its lanes back, the budget fill, or the target planner's own reason).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keyFunnel, type KeyFunnel } from "./live.server.ts";

const f = (key: string, x: Partial<KeyFunnel>): [string, KeyFunnel] => [
  key,
  { key, paper: 0, suppressed: 0, chased: 0, notSent: 0, notSelected: 0, sent: 0, budget: 0, target: false, ...x },
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
    const keys = keyFunnel(funnel, [{ key: "A|1" }], [{ sym: "F", why: "max control positions (symbol × side)" }]);
    const why = Object.fromEntries(keys.map((k) => [k.key, k.target ? "target" : k.why]));
    assert.deepEqual(why, {
      "A|1": "target",
      "B|1": "not sent (live kinds / ranges)",
      "C|-1": "chased (live.maxChase)",
      "D|1": "not selected / signal unit inactive",
      "E|1": "budget (live.top fill)",
      "F|-1": "max control positions (symbol × side)",
      "G|1": "foreign position or order",
    });
    // keys without a target first, the most paper lanes first
    assert.equal(keys[0].key, "E|1");
    assert.equal(keys.at(-1)!.key, "A|1");
  });
});
