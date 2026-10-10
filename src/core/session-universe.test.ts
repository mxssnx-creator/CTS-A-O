// The session's universe check (session-universe.ts): a run is comparable only when it loads the count it asked for.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { universeCheck } from "./session-universe.ts";

describe("session universe check", () => {
  it("a run that loads the count asked for passes", () => {
    const r = universeCheck(3, ["A-USDT", "B-USDT", "C-USDT"]);
    assert.equal(r.ok, true);
    assert.equal(r.loaded, 3);
  });

  it("a run that loads fewer symbols than asked fails, and the name says why", () => {
    const r = universeCheck(30, Array.from({ length: 29 }, (_, i) => `S${i}-USDT`));
    assert.equal(r.ok, false);
    assert.match(r.name, /29 symbols loaded of 30 asked/);
    assert.match(r.name, /not comparable/);
  });

  it("a symbol listed twice counts once", () => {
    assert.equal(universeCheck(2, ["A-USDT", "A-USDT", "B-USDT"]).ok, true);
  });

  it("no request, or an empty universe, never passes", () => {
    assert.equal(universeCheck(0, []).ok, false);
    assert.equal(universeCheck(Number.NaN, ["A-USDT"]).ok, false);
  });
});

describe("session universe check: the pinned symbols that did not load are named (10 Oct, W1)", () => {
  it("a pinned symbol that did not load is named and fails the check", () => {
    const r = universeCheck(3, ["A-USDT", "B-USDT"], ["A-USDT", "B-USDT", "QNT-USDT"]);
    assert.equal(r.ok, false);
    assert.deepEqual(r.missing, ["QNT-USDT"]);
    assert.match(r.name, /missing: QNT-USDT/);
  });

  it("every pinned symbol loaded: nothing is missing and the check passes", () => {
    const r = universeCheck(2, ["A-USDT", "B-USDT"], ["B-USDT", "A-USDT"]);
    assert.equal(r.ok, true);
    assert.deepEqual(r.missing, []);
  });

  it("without a pinned list the missing names are empty", () => {
    assert.deepEqual(universeCheck(2, ["A-USDT", "B-USDT"]).missing, []);
  });
});
