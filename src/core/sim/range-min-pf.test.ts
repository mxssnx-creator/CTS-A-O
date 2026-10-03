// Per-range stage minimum PF (Gates.rangeMinPf): every config is judged against its own range's minimum, on its own
// results only — a General and a Long config with the same record can pass and fail apart.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { configEval, defaultWalkForward, makeTape, selectAt, selectFixed, lastNOk, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { minPfOf } from "../minimal-coord.ts";
import { checkSettings } from "../settings-check.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const IND = "rsi-mom-14-20@m15";

/** 100 hourly closes of +1 % with `lose` losers of −1 % spread evenly, and one entry in the simulated window. */
function trades(cfg: string, lose: number): Trade[] {
  const mk = (r: number, entryT: number): Trade =>
    ({
      cfg,
      sym: "AAA-USDT",
      side: 1,
      entryT,
      exitT: entryT + 30 * 60_000,
      entry: 100,
      exit: 100 * (1 + r),
      r,
      reason: r > 0 ? "tp" : "sl",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind: "normal",
    }) as Trade;
  const out: Trade[] = [];
  const every = lose > 0 ? 100 / lose : Infinity;
  let next = every;
  for (let i = 0; i < 100; i++) {
    const loser = i + 1 >= next;
    if (loser) next += every;
    out.push(mk(loser ? -0.01 : 0.01, NOW - 120 * H + i * H));
  }
  out.push(mk(0.01, NOW - 2 * H + 10 * 60_000));
  return out;
}
const tape = (tag: "gn" | "lg" | "mn" | null, lose: number, tp = 1) => {
  const id = `follow|${IND}|tp${tp}|sl1|tr0|h32${tag ? `|${tag}` : ""}`;
  const p = { tp: 0.01 * tp, sl: 0.01, trail: 0, hold: 32, ...(tag ? { tag } : {}) };
  return makeTape(id, "follow", IND, p, "normal", ["AAA-USDT"], trades(id, lose), [], []);
};

const opts = (rangeMinPf?: WalkForwardOptions["gates"]["rangeMinPf"]): WalkForwardOptions => {
  const o = defaultWalkForward(DEFAULT_SETTINGS);
  return {
    ...o,
    gates: { ...o.gates, minPf: 1.05, minGreen: 0, rangeMinPf },
    toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: true, dcaActive: false, axis: true },
    symGate: undefined,
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
    simH: 6,
    validLastN: 0,
    lastN: 0,
    robustFrac: 0,
    seatPer: "config",
  };
};
const t = NOW - 3 * H;
const ids = (r: { picks: Array<{ id: string }> }) => r.picks.map((p) => p.id).sort();

describe("per-range stage min PF", () => {
  it("minPfOf: a range's own value, else the stage minimum; untagged keeps the stage minimum", () => {
    const g = { minPf: 1.05, rangeMinPf: { micro: 1.05, minimal: 1.08, general: 1.12, long: 1.18 } };
    assert.equal(minPfOf(g, "gn"), 1.12);
    assert.equal(minPfOf(g, "lg"), 1.18);
    assert.equal(minPfOf(g, "mn"), 1.08);
    assert.equal(minPfOf(g, "mp"), 1.08);
    assert.equal(minPfOf(g, "mc"), 1.05);
    assert.equal(minPfOf(g, "sh"), 1.05);
    assert.equal(minPfOf(g, undefined), 1.05);
    assert.equal(minPfOf({ minPf: 1.1 }, "lg"), 1.1);
    // never below the Base floor
    assert.equal(minPfOf({ minPf: 1.05, rangeMinPf: { long: 0.9 } }, "lg"), 1.05);
  });

  for (const [name, select] of Object.entries({ fixed: selectFixed, hourly: selectAt })) {
    it(`${name}: the same record passes General and fails Long at a stricter Long minimum`, () => {
      // 46 losers of 100: PF about 1.17–1.2 in any window
      const gn = tape("gn", 46, 4);
      const lg = tape("lg", 46, 6);
      const both = [gn, lg];
      assert.deepEqual(ids(select(both, t, opts())), [gn.id, lg.id].sort());
      assert.deepEqual(ids(select(both, t, opts({ general: 1.1, long: 1.5 }))), [gn.id]);
    });

    it(`${name}: each config is judged alone — adding a failing sibling never changes a passing one`, () => {
      const gn = tape("gn", 46, 4);
      const weak = tape("gn", 49, 5); // PF 51 / 49 = 1.04
      const g = { general: 1.12 };
      assert.deepEqual(ids(select([gn], t, opts(g))), [gn.id]);
      assert.deepEqual(ids(select([gn, weak], t, opts(g))), [gn.id]);
    });
  }

  it("configEval: the selection's own gates, with the first gate a config misses", () => {
    const lg = tape("lg", 46, 6);
    const o = opts();
    const ok = configEval(lg, t, o);
    assert.equal(ok.ok, true);
    assert.deepEqual(ids(selectFixed([lg], t, o)), [lg.id]);
    const strict = opts({ long: 1.5 });
    const no = configEval(lg, t, strict);
    assert.equal(no.ok, false);
    assert.equal(!no.ok && no.fail, "pf");
    assert.deepEqual(ids(selectFixed([lg], t, strict)), []);
    // a last-N longer than the record fails at the last-N gate
    const ln = configEval(lg, t, { ...o, validLastN: 500 });
    assert.equal(!ln.ok && ln.fail, "lastN");
  });

  it("the validation last-N uses the range minimum", () => {
    const lg = tape("lg", 46, 6);
    assert.equal(lastNOk(lg, NOW, 20, minPfOf({ minPf: 1.05 }, "lg")), true);
    assert.equal(lastNOk(lg, NOW, 100, minPfOf({ minPf: 1.05, rangeMinPf: { long: 1.5 } }, "lg")), false);
  });

  it("settings check: values 1.05–3 per known range", () => {
    assert.doesNotThrow(() => checkSettings({ gates: { ...DEFAULT_SETTINGS.gates, rangeMinPf: { long: 1.18 } } }));
    assert.throws(() => checkSettings({ gates: { ...DEFAULT_SETTINGS.gates, rangeMinPf: { long: 0.9 } } }));
    assert.throws(() => checkSettings({ gates: { ...DEFAULT_SETTINGS.gates, rangeMinPf: { wide: 1.2 } as never } }));
  });
});
