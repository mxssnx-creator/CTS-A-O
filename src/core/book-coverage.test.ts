// Processing reaches the book: one synthetic runtime with every strategy type and range on (Micro, Minimal, Short,
// General, Long, the Wide grid; Normal, Trailing, Block, DCA, Axis; signals) computes once. Checked: every range
// that has tapes trades in the Real stage, every type trades on both sides, the stages are reported in order, the
// audit is clean, and the paper step accounts for every tape position it was offered (opened, or counted under a
// reason in status.paperSkips — none is dropped silently). The signal funnel counts the candidates of inactive units.
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { isSignalInd } from "./indications/registry.ts";
import { MICRO_RANGE, rangeOfId } from "./minimal-coord.ts";
import { kindOfId } from "./pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { H } from "./test-support.ts";

// the paper step adopts positions entered at the current hour: the synthetic market ends now
process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / H) * H);

const until = async (cond: () => boolean, ms = 1_700_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

describe(
  "every type and range reaches the Real stage and the paper book",
  { timeout: 1_800_000 },
  () => {
    let rt: CoreRuntime;
    before(async () => {
      rt = new CoreRuntime(
        new CoreDb(":memory:"),
        {
          // every range on (Micro's 17 stop ratios included) is the heaviest compute: three symbols
          symbols: 3,
          historyDays: 18,
          tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
          cycleMs: 60_000,
          focus: [],
          mainTop: 12,
          toggles: {
            normal: true,
            trailing: true,
            block: true,
            blockActive: false,
            dca: true,
            dcaActive: false,
            axis: true,
          },
          // every range on: Micro added to the default Minimal / Short / General / Long and the Wide grid
          grid: { ...DEFAULT_SETTINGS.grid, micro: MICRO_RANGE },
          tactics: {
            session: false,
            volRegime: false,
            trendStrength: false,
            cooldown: false,
            cooldownBars: 4,
          },
          gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
        } as never,
        { market: "synthetic" },
      );
      rt.updateSettings({}, { validLastN: 0, lastN: 0 });
      rt.start();
      await until(
        () => rt.status.computes >= 1 && rt.status.state === "running" && rt.audit !== null,
      );
      rt.stop();
    });

    it("the audit is clean and the stages are reported in order", () => {
      const bad = rt.audit!.checks.filter((c) => !c.ok);
      assert.deepEqual(bad, [], JSON.stringify(bad));
      const st = rt.status;
      assert.ok(
        (st.baseEvaluated ?? 0) > 0 && (st.basePassed ?? 0) > 0,
        "Base evaluated and passed pairs",
      );
      assert.ok((st.basePassed ?? 0) <= (st.baseEvaluated ?? 0));
      assert.ok(rt.tapes.length > 0, "Main built tapes");
      assert.ok(rt.sim!.trades.length > 0, "Real executed trades");
    });

    it("every range with tapes trades in the Real stage", () => {
      const tapeRanges = new Set<string>(
        rt.tapes.filter((t) => !isSignalInd(t.ind)).map((t) => t.protect.tag ?? "wide"),
      );
      const traded = new Map<string, number>();
      for (const x of rt.sim!.trades) {
        if (isSignalInd(x.cfg.split("|")[1] ?? "")) continue;
        const r = rangeOfId(x.cfg) || "wide";
        traded.set(r, (traded.get(r) ?? 0) + 1);
      }
      const missing = [...tapeRanges].filter((r) => !traded.has(r));
      assert.deepEqual(
        missing,
        [],
        `ranges with tapes but no Real trade (traded: ${JSON.stringify([...traded])})`,
      );
      for (const r of ["sh", "gn", "lg"]) assert.ok(tapeRanges.has(r), `range ${r} has tapes`);
    });

    it("every strategy type trades on both sides; Block raises some trades", () => {
      const sides = new Map<string, Set<number>>();
      for (const x of rt.sim!.trades) {
        const k = isSignalInd(x.cfg.split("|")[1] ?? "") ? "signal" : kindOfId(x.cfg);
        (sides.get(k) ?? sides.set(k, new Set()).get(k)!).add(x.side);
      }
      for (const k of ["normal", "trailing", "dca", "axis"]) {
        assert.ok(sides.has(k), `type ${k} trades (seen: ${[...sides.keys()]})`);
      }
      const oneSided = [...sides].filter(([, s]) => s.size < 2).map(([k]) => k);
      assert.deepEqual(oneSided, [], "types trading only one direction");
      assert.ok(
        rt.sim!.trades.some((x) => (x.mult ?? 1) > 1),
        "Block raised the volume of some trades",
      );
    });

    it("the paper step accounts for every tape position it considered", () => {
      const pt = (rt as unknown as { paperTimings?: { n: number; stale: number } }).paperTimings;
      assert.ok(pt, "the paper step ran");
      const skips = rt.status.paperSkips ?? {};
      // every candidate (a selected or held tape's open position, fresh) is opened or skipped under a reason
      const afterCands = Object.entries(skips)
        .filter(
          ([k]) =>
            !k.startsWith("pending:") &&
            k !== "notSelected" &&
            k !== "stale" &&
            k !== "sig:notSelected" &&
            k !== "sig:stale",
        )
        .reduce((a, [, v]) => a + v, 0);
      assert.equal(
        rt.paper.positions.length + afterCands,
        pt!.n,
        `positions ${rt.paper.positions.length} + skipped ${afterCands} vs candidates ${pt!.n}: ${JSON.stringify(skips)}`,
      );
      const stale = (skips.stale ?? 0) + (skips["sig:stale"] ?? 0);
      assert.equal(stale, pt!.stale, "stale entries are counted");
    });

    it("the signal funnel counts every candidate of an inactive unit by side", () => {
      const f = rt.sim!.signalFunnel;
      if (!rt.tapes.some((t) => isSignalInd(t.ind))) return;
      assert.ok(f, "signal tapes → a funnel");
      assert.ok(f!.candidates >= f!.inactive);
      assert.equal(f!.inactiveBySide["1"] + f!.inactiveBySide["-1"], f!.inactive);
      const sigTrades = rt.sim!.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? "")).length;
      assert.ok(f!.candidates >= sigTrades, "every signal trade was a candidate");
    });
  },
);
