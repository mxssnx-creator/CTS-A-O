// Per-range seat and entry options (wf.rangeOpts): a range takes rangeOpts[tag][k] in place of the global validLastN,
// seatQuietH, gates.stableBlocks, lastN and mode; "wide" is the untagged engine configs, signals never. The ranges
// trade independently, so a range's options change only that range's seats and trades. Unset = the global values on
// the same code path.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  configEval,
  defaultWalkForward,
  execDecision,
  makeTape,
  modeGroups,
  rangeOptsOf,
  selectAt,
  selectDurable,
  selectFixed,
  selectGroupsGen,
  walkForward,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, RangeTag, Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const IND = "rsi-mom-14-20@m15";
const P: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const idOf = (k: number, tag?: RangeTag) => `follow|${IND}|tp${k}|sl1|tr0|h32${tag ? `|${tag}` : ""}`;

/**
 * 100 hourly closes from NOW − 120 h (the last `late` of them losers, the rest winners: PF 19 at 5) and one winning
 * entry in the simulated window, at NOW − 2 h + 10 min.
 */
function tape(k: number, tag: RangeTag | undefined, late: number) {
  const cfg = idOf(k, tag);
  const mk = (r: number, entryT: number) =>
    ({ cfg, sym: "AAA-USDT", side: 1, entryT, exitT: entryT + 30 * 60_000, entry: 100, exit: 100 * (1 + r), r, reason: r > 0 ? "tp" : "sl", bars: 2, mfe: 0, mae: 0, kind: "normal" }) as Trade;
  const xs: Trade[] = [];
  for (let i = 0; i < 100; i++) xs.push(mk(i >= 100 - late ? -0.01 : 0.01, NOW - 120 * H + i * H));
  xs.push(mk(0.01, NOW - 2 * H + 10 * 60_000));
  return makeTape(cfg, "follow", IND, tag ? { ...P, tag } : P, "normal", ["AAA-USDT"], xs, [], []);
}

const d = defaultWalkForward(DEFAULT_SETTINGS);
const base: WalkForwardOptions = {
  ...d,
  toggles: { ...d.toggles, normal: true, trailing: true, block: false, blockActive: false },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  engineSideAccept: undefined,
  // This fixture deliberately tests a 336 h validation history with closes 20–120 h old.
  longH: 336,
  simH: 6,
  validLastN: 0,
  lastN: 0,
  preGate: false,
};
const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;
const t = NOW - 2 * H;

// every range twice: a clean tape and one whose last 5 closes lost
const RANGES: Array<RangeTag | undefined> = [undefined, "mn", "sh"];
const tapes = RANGES.flatMap((tag, j) => [tape(10 * j + 1, tag, 0), tape(10 * j + 2, tag, 5)]);
const late = (tag: RangeTag | undefined) => tapes.find((x) => x.protect.tag === tag && x.id.includes(`|tp${10 * RANGES.indexOf(tag) + 2}|`))!;
const traded = (o: WalkForwardOptions) => walkForward(u, tapes, o).trades.map((x) => x.cfg).sort();
const notMn = (o: WalkForwardOptions) => walkForward(u, tapes, o).trades.filter((x) => !x.cfg.endsWith("|mn"));
const all = tapes.map((x) => x.id).sort();
const without = (...ids: string[]) => all.filter((x) => !ids.includes(x));

describe("per-range seat and entry options (wf.rangeOpts)", () => {
  it("the range of a tape: its tag, wide for an untagged engine config, none for a signal or without rangeOpts", () => {
    const ro = { wide: { lastN: 1 }, mn: { lastN: 2 } };
    assert.deepEqual(rangeOptsOf({ rangeOpts: ro }, tape(1, undefined, 0)), { lastN: 1 });
    assert.deepEqual(rangeOptsOf({ rangeOpts: ro }, tape(1, "mn", 0)), { lastN: 2 });
    assert.equal(rangeOptsOf({ rangeOpts: ro }, tape(1, "sh", 0)), undefined);
    assert.equal(rangeOptsOf({ rangeOpts: ro }, { protect: P, ind: "sig-ema-cross-s@m15" }), undefined);
    assert.equal(rangeOptsOf({}, tape(1, "mn", 0)), undefined);
  });

  it("unset, or every range on the global values: the same trades; one selection over the whole list", () => {
    const ref = walkForward(u, tapes, base);
    assert.deepEqual(traded(base), all, "every tape trades without the per-range gates");
    assert.deepEqual(walkForward(u, tapes, { ...base, rangeOpts: undefined }).trades, ref.trades);
    const same = { wide: { validLastN: 0, lastN: 0, mode: "fixed" as const }, mn: { stableBlocks: 0, seatQuietH: 0 } };
    assert.deepEqual(walkForward(u, tapes, { ...base, rangeOpts: same }).trades, ref.trades);
    assert.equal(modeGroups(tapes, base), null);
    assert.equal(modeGroups(tapes, { ...base, rangeOpts: same }), null, "a mode equal to the global one splits nothing");
  });

  it("validLastN: Minimal's own window refuses its late losers' seat; the other ranges trade bit for bit as before", () => {
    // the global window refuses every late-losing tape
    assert.deepEqual(traded({ ...base, validLastN: 5 }), without(late(undefined).id, late("mn").id, late("sh").id));
    const o = { ...base, rangeOpts: { mn: { validLastN: 5 } } };
    assert.deepEqual(traded(o), without(late("mn").id));
    assert.deepEqual(notMn(o), notMn(base), "wide and Short trades bit-identical");
    // the report's evaluation (configEval) and the seat selection (configPassAt) agree; the same tape list re-selects
    // with other options (the selection's per-tape cache follows rangeOpts)
    assert.equal((configEval(late("mn"), t, o) as { fail?: string }).fail, "lastN");
    assert.equal(configEval(late("sh"), t, o).ok, true);
    assert.ok(selectFixed(tapes, t, base).picks.some((p) => p.id === late("mn").id));
    assert.ok(!selectFixed(tapes, t, o).picks.some((p) => p.id === late("mn").id));
    assert.ok(selectFixed(tapes, t, base).picks.some((p) => p.id === late("mn").id));
    // a range's 0 overrides a global window
    assert.deepEqual(traded({ ...base, validLastN: 5, rangeOpts: { mn: { validLastN: 0 } } }), without(late(undefined).id, late("sh").id));
  });

  it("lastN and seatQuietH at the entry, per range ('wide' = the untagged configs)", () => {
    const o = { ...base, rangeOpts: { wide: { lastN: 5 } } };
    assert.deepEqual(traded(o), without(late(undefined).id));
    assert.equal((execDecision(late(undefined), NOW - 2 * H + 10 * 60_000, o, { sym: "AAA-USDT", side: 1 }) as { why?: string }).why, "lastN");
    assert.equal(execDecision(late("sh"), NOW - 2 * H + 10 * 60_000, o, { sym: "AAA-USDT", side: 1 }).ok, true);
    // every tape's last close is ~18.7 h before its entry: a 24 h cool-off on Short alone holds both Short tapes
    const q = { ...base, rangeOpts: { sh: { seatQuietH: 24 } } };
    assert.deepEqual(traded(q), without(...tapes.filter((x) => x.protect.tag === "sh").map((x) => x.id)));
    assert.deepEqual(traded({ ...base, rangeOpts: { sh: { seatQuietH: 12 } } }), all, "12 h: free");
    // a global cool-off a range switches off
    assert.deepEqual(traded({ ...base, seatQuietH: 24, rangeOpts: { mn: { seatQuietH: 0 } } }), tapes.filter((x) => x.protect.tag === "mn").map((x) => x.id).sort());
  });

  it("stableBlocks per range", () => {
    // 12 blocks of 28 h over 336 h: the last block holds the 5 losses
    assert.deepEqual(traded({ ...base, rangeOpts: { mn: { stableBlocks: 12 } } }), without(late("mn").id));
    assert.equal((configEval(late("mn"), t, { ...base, rangeOpts: { mn: { stableBlocks: 12 } } }) as { fail?: string }).fail, "stable");
  });

  it("mode per range: Minimal selects durable, the rest fixed; the other ranges' trades bit for bit", () => {
    // durable: positive in ≥ 75 % of 4 sub-windows of 336 h — these tapes have closes in 2 of them only
    assert.deepEqual(traded({ ...base, mode: "durable" }), []);
    const o: WalkForwardOptions = { ...base, rangeOpts: { mn: { mode: "durable" } } };
    const g = modeGroups(tapes, o)!;
    assert.deepEqual(g.map((x) => [x.mode, x.tapes.length]), [["fixed", 4], ["durable", 2]]);
    assert.equal(modeGroups(tapes, o), g, "one array per group and tape list");
    assert.deepEqual(traded(o), tapes.filter((x) => x.protect.tag !== "mn").map((x) => x.id).sort());
    assert.deepEqual(notMn(o), notMn(base));
    // global durable, Short fixed
    assert.deepEqual(traded({ ...base, mode: "durable", rangeOpts: { sh: { mode: "fixed" } } }), tapes.filter((x) => x.protect.tag === "sh").map((x) => x.id).sort());
  });

  it("mode groups only while every config (or every range) has its own seats: the groups never share a seat", () => {
    const ro = { mn: { mode: "durable" as const } };
    assert.equal(modeGroups(tapes, { ...base, seatPer: "pair", rangeOpts: ro }), null, "pair seats: one selection");
    assert.equal(modeGroups(tapes, { ...base, seatPer: undefined, rangeOpts: ro }), null);
    assert.deepEqual(
      modeGroups(tapes, { ...base, seatPer: "pair", rangeSeats: true, rangeOpts: ro })!.map((x) => x.mode),
      ["fixed", "durable"],
      "range seats: each range's seats are its own",
    );
  });

  it("a durable group seats a held config that still pays (sticky), and only that one", () => {
    const o: WalkForwardOptions = { ...base, rangeOpts: { mn: { mode: "durable" } } };
    const g = modeGroups(tapes, o)!;
    const drain = (held: ReadonlySet<string>) => {
      const it = selectGroupsGen(g, t, o, held);
      let r = it.next();
      while (!r.done) r = it.next();
      return r.value.picks.map((p) => p.id);
    };
    const mnIds = tapes.filter((x) => x.protect.tag === "mn").map((x) => x.id);
    assert.ok(!drain(new Set()).some((id) => mnIds.includes(id)), "no Minimal seat without one held");
    const clean = mnIds.find((id) => id !== late("mn").id)!;
    const picks = drain(new Set([clean]));
    assert.ok(picks.includes(clean), "the held Minimal config stays seated");
    assert.ok(!picks.includes(late("mn").id));
    // the fixed group is unchanged by the durable group's held seat
    assert.deepEqual(
      picks.filter((id) => !mnIds.includes(id)).sort(),
      drain(new Set()).sort(),
    );
  });

  it("validOk reads the range's validLastN in the hourly and durable selections", () => {
    const ro = { mn: { validLastN: 5 } };
    for (const mode of ["hourly", "durable"] as const) {
      // durable: half of the 4 sub-windows positive is enough here (these tapes close in 2 of them)
      const m: WalkForwardOptions = { ...base, mode, durableFrac: 0.5 };
      const ids = (o: WalkForwardOptions) =>
        (mode === "durable" ? selectDurable(tapes, t, o, new Set()) : selectAt(tapes, t, o)).picks.map((p) => p.id).sort();
      assert.ok(ids(m).includes(late("mn").id), `${mode}: the late Minimal tape is seated without a window`);
      const o = { ...m, rangeOpts: ro };
      assert.deepEqual(ids(o), ids(m).filter((id) => id !== late("mn").id), `${mode}: only Minimal's late tape is refused`);
      assert.deepEqual(traded(o), without(late("mn").id), `${mode}: the walk-forward too`);
    }
  });
});

describe("rangeOpts settings: sanitised, carried into the compute key, mainnet floors per range", () => {
  it("unknown ranges and keys dropped, numbers clamped, nothing left = unset", async () => {
    const { sanitizeWf, sanitizeRangeOpts, mainnetRangeFloors, computeKey } = await import("../server/runtime.server.ts");
    assert.deepEqual(
      sanitizeRangeOpts({
        mn: { validLastN: 300, seatQuietH: 60, stableBlocks: 1, lastN: 4.6, mode: "hourly", x: 1 },
        sh: { stableBlocks: 20, mode: "durable", lastN: "7", seatQuietH: "x" },
        wide: { validLastN: -3 },
        sig: { lastN: 5 },
        lg: {},
      }),
      { wide: { validLastN: 0 }, mn: { validLastN: 200, seatQuietH: 48, stableBlocks: 0, lastN: 5 }, sh: { stableBlocks: 12, lastN: 7, mode: "durable" } },
    );
    assert.equal(sanitizeRangeOpts({ sig: { lastN: 5 } }), undefined);
    assert.equal(sanitizeRangeOpts(null), undefined);
    assert.deepEqual(sanitizeWf({ rangeOpts: { mn: { lastN: 5 } } } as never).rangeOpts, { mn: { lastN: 5 } });
    assert.ok("rangeOpts" in sanitizeWf({ rangeOpts: {} } as never), "an empty patch clears it");
    assert.equal(sanitizeWf({ rangeOpts: {} } as never).rangeOpts, undefined);
    assert.equal("rangeOpts" in sanitizeWf({ lastN: 5 }), false, "absent stays absent");
    // the compute key reads it (a change recomputes)
    assert.notEqual(computeKey(DEFAULT_SETTINGS, { rangeOpts: { mn: { lastN: 5 } } }), computeKey(DEFAULT_SETTINGS, {}));
    // floors: max(floor, value) on a range's own last-N; the other options and unset values stay
    assert.deepEqual(mainnetRangeFloors({ mn: { lastN: 0, validLastN: 80, seatQuietH: 2 }, sh: { mode: "durable" } }), {
      mn: { lastN: 25, validLastN: 80, seatQuietH: 2 },
      sh: { mode: "durable" },
    });
  });

  it("a preset starts without per-range options (an earlier patch's rangeOpts does not carry over)", async () => {
    process.env.CTS_CORE_STATE = "off";
    process.env.CTS_CORE_SNAPSHOT = "";
    const { CoreRuntime } = await import("../server/runtime.server.ts");
    const { CoreDb } = await import("../server/db.server.ts");
    const demo = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic", conn: "bingx-vst-02" });
    demo.stop();
    try {
      demo.updateSettings({}, { rangeOpts: { mn: { lastN: 5, mode: "durable" } } } as never);
      assert.deepEqual(demo.wf.rangeOpts, { mn: { lastN: 5, mode: "durable" } });
      demo.applyPreset("desk-default");
      assert.equal(demo.wf.rangeOpts, undefined);
    } finally {
      demo.shutdown("test");
    }
  });

  it("a preset backtest skips Base only on a fixed focus set no range selects another way", async () => {
    const { presetSkipsBase } = await import("../server/runtime.server.ts");
    assert.equal(presetSkipsBase({ mode: "fixed" }, ["follow|x"]), true);
    assert.equal(presetSkipsBase({ mode: "fixed" }, []), false);
    assert.equal(presetSkipsBase({ mode: "durable" }, ["follow|x"]), false);
    assert.equal(presetSkipsBase({ mode: "fixed", rangeOpts: { mn: { lastN: 5, mode: "fixed" } } }, ["follow|x"]), true);
    assert.equal(presetSkipsBase({ mode: "fixed", rangeOpts: { mn: { mode: "durable" } } }, ["follow|x"]), false);
  });

  it("on the mainnet connection a range's own last-N keeps the floors unless the host waives them", async () => {
    process.env.CTS_CORE_STATE = "off";
    process.env.CTS_CORE_SNAPSHOT = "";
    const { CoreRuntime, MAINNET_LAST_N, MAINNET_VALID_LAST_N } = await import("../server/runtime.server.ts");
    const { CoreDb } = await import("../server/db.server.ts");
    const patch = { rangeOpts: { mn: { lastN: 0, validLastN: 0, seatQuietH: 2 } } } as never;
    const main = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic", conn: "bingx-x01" });
    main.stop();
    try {
      main.updateSettings({}, patch);
      assert.deepEqual(main.wf.rangeOpts, { mn: { lastN: MAINNET_LAST_N, validLastN: MAINNET_VALID_LAST_N, seatQuietH: 2 } });
      process.env.CTS_CORE_MAINNET_WAIVE_FLOORS = "1";
      try {
        main.updateSettings({}, patch);
        assert.deepEqual(main.wf.rangeOpts, { mn: { lastN: 0, validLastN: 0, seatQuietH: 2 } });
      } finally {
        delete process.env.CTS_CORE_MAINNET_WAIVE_FLOORS;
      }
    } finally {
      main.shutdown("test");
    }
    const demo = new CoreRuntime(new CoreDb(":memory:"), { symbols: 3 }, { market: "synthetic", conn: "bingx-vst-02" });
    demo.stop();
    try {
      demo.updateSettings({}, patch);
      assert.deepEqual(demo.wf.rangeOpts, { mn: { lastN: 0, validLastN: 0, seatQuietH: 2 } }, "no floors off mainnet");
    } finally {
      demo.shutdown("test");
    }
  });
});
