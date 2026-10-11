// Signal seats are keyed per direction: a signal unit (pair × symbol × direction, `sigActiveKey`) seats its symbol only
// for its own side. A unit active on the long side only must not make the short side of the same symbol a seat.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeSignals, sigActiveKey, signalSeatSymbols } from "../signals.ts";
import { signalSettings } from "../signal-config.ts";

const IND = "sig-swing-m@m15";
const tp = { bot: "follow", ind: IND, syms: ["AAA-USDT", "BBB-USDT", "CCC-USDT"] };

describe("signal seats are keyed by side", () => {
  it("a unit active on the long side only seats its symbol for the long side, never the short side", () => {
    const sig = { ...signalSettings(undefined), count: 0, minTrades: 1, rank: "drawdown" as const, minBlockShare: 0, validate: false };
    const st = (net: number) => ({ n: 5, net, pf: net > 0 ? 2 : 0.5 });
    // BBB: long wins, short loses → only the long unit is active
    const active = activeSignals(
      [{ bot: "follow", ind: IND, bySym: { "BBB-USDT": { ...st(1), sides: { "1": st(3), "-1": st(-2) } } } }],
      sig,
    );
    assert.deepEqual([...active], [sigActiveKey("follow", IND, "BBB-USDT", 1)], "precondition: only the long unit is active");
    assert.deepEqual([...signalSeatSymbols(tp, active, 1)], [1], "the long unit seats BBB on the long side");
    assert.equal(signalSeatSymbols(tp, active, -1).size, 0, "the short side of BBB is not seated by the long unit");
  });

  it("a short-only unit seats only the short side of its symbol", () => {
    const active = new Set([sigActiveKey("follow", IND, "CCC-USDT", -1)]);
    assert.deepEqual([...signalSeatSymbols(tp, active, -1)], [2]);
    assert.equal(signalSeatSymbols(tp, active, 1).size, 0);
  });

  it("a symbol with both sides active is seated on each side", () => {
    const active = new Set([sigActiveKey("follow", IND, "AAA-USDT", 1), sigActiveKey("follow", IND, "AAA-USDT", -1)]);
    assert.deepEqual([...signalSeatSymbols(tp, active, 1)], [0]);
    assert.deepEqual([...signalSeatSymbols(tp, active, -1)], [0]);
  });

  it("a unit on none of the tape's symbols seats nothing on either side", () => {
    const active = new Set([sigActiveKey("follow", IND, "ZZZ-USDT", 1)]);
    assert.equal(signalSeatSymbols(tp, active, 1).size, 0);
    assert.equal(signalSeatSymbols(tp, active, -1).size, 0);
  });
});
