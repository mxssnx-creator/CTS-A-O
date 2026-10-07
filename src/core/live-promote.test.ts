// Promotion from the demo twin: a range reaches the real-money desk only after the reference proved it on its
// exchange, and leaves again when it fails there; signals and ladders are never managed by it.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PROMOTE_RANGES, promoteDecide, promoteLive, promoteRangeOf } from "./live-promote.ts";
import { liveLaneFilter } from "./server/live.server.ts";

const SH = "sweep|trend-adx@m15c|tp6|sl4.5|tr0|h64|sh";
const LG = "sweep|trend-adx@m15c|tp6|sl4.5|tr2|h64|lg";
const WIDE = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
const SIG = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32";
const AXIS = "pivot|cci-40-200@x4|tp5|sl5|tr0|h24|axis";
const closes = (cfg: string, rs: number[], t0 = 0) => rs.map((r, i) => ({ cfg, r, exitT: t0 + i * 60_000 }));
const O = { lastN: 10, minN: 6, onPf: 1.2, offPf: 1.0 };

describe("promotion from the reference desk", () => {
  it("ranges of configs: a range tag, the untagged grid as wide; signals and ladders are not ranges", () => {
    assert.equal(promoteRangeOf(SH), "sh");
    assert.equal(promoteRangeOf(LG), "lg");
    assert.equal(promoteRangeOf(WIDE), "wide");
    assert.equal(promoteRangeOf(SIG), null);
    assert.equal(promoteRangeOf(AXIS), null);
  });

  it("every range starts off; on once its last closes clear onPf, off again under offPf, held in between", () => {
    const fresh = promoteDecide({}, [], O);
    assert.ok(PROMOTE_RANGES.every((k) => fresh.on[k] === false));
    assert.equal(fresh.changed, false);
    // Short: 8 winners, 2 losers → on; Long: losing → stays off; too few Wide closes → undecided (off)
    const a = promoteDecide(
      {},
      [...closes(SH, [0.01, 0.01, -0.005, 0.01, 0.01, 0.01, -0.005, 0.01, 0.01, 0.01]), ...closes(LG, [-0.01, -0.01, 0.005, -0.01, -0.01, -0.01]), ...closes(WIDE, [0.01, 0.01])],
      O,
    );
    assert.equal(a.on.sh, true);
    assert.equal(a.on.lg, false);
    assert.equal(a.on.wide, false);
    assert.equal(a.changed, true);
    // Short at PF 1.1 (between off and on): held on; later losing → off
    const held = promoteDecide(a.on, closes(SH, [0.011, -0.01, 0.011, -0.01, 0.011, -0.01, 0.011, -0.01, 0.011, -0.01]), O);
    assert.equal(held.on.sh, true);
    assert.equal(held.changed, false);
    const off = promoteDecide(held.on, closes(SH, [-0.01, -0.01, 0.005, -0.01, -0.01, -0.01, 0.005, -0.01, -0.01, -0.01]), O);
    assert.equal(off.on.sh, false);
    assert.equal(off.changed, true);
    // only the last lastN closes count: old losers rolled out of the window no longer hold a range off
    const recovered = promoteDecide(off.on, [...closes(SH, Array(20).fill(-0.01)), ...closes(SH, Array(10).fill(0.01), 100 * 60_000)], O);
    assert.equal(recovered.on.sh, true);
  });

  it("the target's live settings: proven ranges sent, the rest left out, signals kept, ladders out", () => {
    const live = promoteLive({ source: "signals", excludeRanges: ["wide"], ratio: 3 }, { mc: false, mn: false, mp: false, sh: true, gn: false, lg: false, wide: false });
    assert.equal(live.source, "all");
    assert.deepEqual(live.kinds, ["normal", "trailing"]);
    assert.deepEqual(live.excludeRanges, ["mc", "mn", "mp", "gn", "lg", "wide"]);
    assert.equal(live.ratio, 3);
    const { sendable } = liveLaneFilter(live as never, null, null);
    assert.equal(sendable({ cfg: SIG, vol: 1 }), true, "signals still reach the exchange");
    assert.equal(sendable({ cfg: SH, vol: 1 }), true, "the proven range does");
    assert.equal(sendable({ cfg: LG, vol: 1 }), false);
    assert.equal(sendable({ cfg: WIDE, vol: 1 }), false);
    assert.equal(sendable({ cfg: AXIS, vol: 1 }), false, "ladders are not ranges: left out");
    // nothing proven: exactly the signals-only desk
    const none = promoteLive({ source: "signals" }, promoteDecide({}, [], O).on);
    const f = liveLaneFilter(none as never, null, null).sendable;
    assert.deepEqual([SIG, SH, LG, WIDE, AXIS].map((cfg) => f({ cfg, vol: 1 })), [true, false, false, false, false]);
  });
});
