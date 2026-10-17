import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import type { RangeTag, StratKind, Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";
import { defaultWalkForward, makeTape, type WalkForwardResult } from "../sim/walkforward.ts";
import { CoreRuntime } from "./runtime.server.ts";

const NOW = Date.UTC(2026, 9, 17, 12);
const SYM = "AAA-USDT";
const ENGINE = "rsi-mom-14-25@m15";
const SIGNAL = "sig-ema-cross-s@m15";

/** Only promotion's dependencies are injected: no runtime constructor, database, workers or market history. */
function fixture(kind: StratKind = "normal", tag?: RangeTag, ind = ENGINE) {
  const pair = `follow|${ind}`;
  const cfg = `${pair}|tp2.6|sl3.9|tr0|h32${tag ? `|${tag}` : ""}${kind === "normal" ? "" : `|${kind}`}`;
  const trades: Trade[] = [.02, -.01, .02].map((r, i): Trade => ({
    cfg, sym: SYM, side: 1, entryT: NOW - 100_000 + i * 1000, exitT: NOW - 10_000 + i * 1000,
    entry: 100, exit: 100 * (1 + r), r, mult: 1, vol: 1, kind, reason: "time", bars: 1, mfe: 0, mae: 0,
  }));
  const tape = makeTape(cfg, "follow", ind, { ...DEFAULT_PROTECT, ...(tag ? { tag } : {}) }, kind, [SYM], trades, [], []);
  const rows = trades.map((t) => ({ cfg, sym: SYM, side: 1, exit_t: t.exitT, unit_r: t.r, owned_notional_usd: 20 }));
  const settings = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minTrades: 3 },
    live: { ...DEFAULT_SETTINGS.live, liveLastN: 3, engineProofN: 0 } };
  const rt: CoreRuntime = Object.assign(Object.create(CoreRuntime.prototype), {
    settings,
    wf: { ...defaultWalkForward(settings), basePassed: new Set([pair]), basePassedRanges: { [pair]: [tag ?? ""] },
      baseWideLadderPairs: new Set<string>() },
    tapes: [tape], sim: { trades } as WalkForwardResult, paper: { selected: [cfg] },
    db: { version: () => 1, all: () => rows },
  });
  const lane = { cfg, sym: SYM, side: 1 };
  return { rt, tape, pair, cfg, lane, gate: () => rt.livePromotionGate(lane, NOW) };
}

describe("native promotion retains current Base qualification", () => {
  it("rejects a stale selected engine config when its pair no longer passes Base", () => {
    const f = fixture();
    assert.equal(f.gate().ok, true);
    f.rt.wf.basePassed = new Set();
    const gate = f.gate();
    assert.deepEqual(f.rt.paper.selected, [f.cfg], "selection and both winning records remain available");
    assert.equal(gate.model?.pf, 4);
    assert.equal(gate.execution?.pf, 4);
    assert.equal(gate.state, "ineligible");
    assert.equal(gate.ok, false);
  });

  it("admits its own qualified range and never borrows a winning sibling range", () => {
    const f = fixture("normal", "sh");
    assert.equal(f.gate().ok, true);
    f.rt.wf.basePassedRanges = { [f.pair]: ["mn"] };
    assert.equal(f.gate().state, "ineligible");
    f.rt.wf.basePassedRanges = {};
    assert.equal(f.gate().state, "ineligible", "a supplied empty cohort fails closed");
    f.rt.wf.basePassedRanges = { [f.pair]: ["sh"] };
    assert.equal(f.gate().ok, true, "changing qualification is read despite cached proof and selection");
  });

  for (const kind of ["dca", "dca-active", "axis"] as const) {
    it(`${kind}: requires explicit independent untagged ladder permission and a qualified pair`, () => {
      const f = fixture(kind);
      f.rt.wf.basePassedRanges = { [f.pair]: ["mn"] };
      assert.equal(f.gate().state, "ineligible");
      f.rt.wf.baseWideLadderPairs = new Set([f.pair]);
      assert.equal(f.gate().ok, true);
      f.rt.wf.basePassed = new Set();
      assert.equal(f.gate().state, "ineligible", "ladder permission cannot resurrect a failed pair");
    });
  }

  it("ladder permission never admits a plain Wide cell or a failed tagged range", () => {
    for (const [kind, tag] of [["normal", undefined], ["trailing", undefined], ["axis", "sh"]] as const) {
      const f = fixture(kind, tag);
      f.rt.wf.basePassedRanges = { [f.pair]: ["mn"] };
      f.rt.wf.baseWideLadderPairs = new Set([f.pair]);
      assert.equal(f.gate().state, "ineligible", `${kind}/${tag ?? "Wide"}`);
    }
  });

  it("retains held-only tapes for their exits without allowing new native promotion", () => {
    const f = fixture();
    f.tape.heldOnly = true;
    assert.equal(f.gate().state, "ineligible");
  });

  it("keeps Signal qualification on its separate exact config, symbol, direction and type", () => {
    const f = fixture("normal", undefined, SIGNAL);
    f.rt.wf.basePassed = new Set();
    f.rt.wf.basePassedRanges = {};
    f.rt.wf.signalBasePassed = new Set([f.pair]);
    const active = (cfg: string, sym = SYM, side = 1, kind = "normal") =>
      new Set([sigActiveKey("follow", SIGNAL, sym, side, kind, cfg)]);
    f.rt.wf.signalActive = active(f.cfg);
    assert.equal(f.gate().ok, true, "engine qualification does not replace Signal qualification");
    for (const sibling of [active(`${f.cfg}|sh`), active(f.cfg, "BBB-USDT"), active(f.cfg, SYM, -1), active(f.cfg, SYM, 1, "trailing"),
      new Set([sigActiveKey("follow", SIGNAL, SYM, 1, "normal")])]) {
      f.rt.wf.signalActive = sibling;
      assert.equal(f.gate().state, "ineligible", "sibling or broad discovery evidence cannot qualify this Signal");
    }
    f.rt.wf.signalActive = active(f.cfg);
    f.rt.wf.signalBasePassed = new Set();
    assert.equal(f.gate().state, "ineligible");
  });
});
